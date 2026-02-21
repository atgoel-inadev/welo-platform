import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Task,
  Assignment,
  Annotation,
  AnnotationResponse,
  ReviewApproval,
  Project,
} from '@app/common';
import { AssignmentStatus, TaskStatus, WorkflowStage, AssignmentMethod } from '@app/common/enums';

@Injectable()
export class TaskRenderingService {
  private readonly logger = new Logger(TaskRenderingService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(Annotation)
    private annotationRepository: Repository<Annotation>,
    @InjectRepository(AnnotationResponse)
    private responseRepository: Repository<AnnotationResponse>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  /**
   * Get complete render configuration for a task.
   * Returns data shaped to match the frontend TaskRenderConfig interface.
   */
  async getTaskRenderConfig(taskId: string, userId: string): Promise<any> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['batch'],
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const project = await this.projectRepository.findOne({
      where: { id: task.projectId },
    });

    // Determine the user's assignment (annotator = ASSIGNED, reviewer = any other stage)
    const annotatorAssignment = await this.assignmentRepository.findOne({
      where: { taskId, userId, status: AssignmentStatus.ASSIGNED },
    });

    // Also look for any historical assignment (for draft-resume after page reload)
    const anyUserAssignment =
      annotatorAssignment ||
      (await this.assignmentRepository.findOne({
        where: { taskId, userId },
        order: { assignedAt: 'DESC' },
      }));

    const viewType = annotatorAssignment ? 'annotator' : 'reviewer';

    // ── Existing responses for this user (draft resume) ─────────────────────
    let existingResponses: AnnotationResponse[] = [];
    if (anyUserAssignment) {
      existingResponses = await this.responseRepository.find({
        where: { taskId, assignmentId: anyUserAssignment.id },
      });
    }

    // ── Previous annotations (needed by reviewer to compare answers) ─────────
    // Returned whenever the task has been submitted / is in review / approved / rejected
    const reviewableStatuses: string[] = [
      'SUBMITTED', 'REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED',
    ];
    let previousAnnotations: any[] | null = null;

    if (reviewableStatuses.includes(String(task.status))) {
      const annotations = await this.annotationRepository.find({
        where: { taskId },
        order: { createdAt: 'ASC' },
      });

      if (annotations.length > 0) {
        const allResponses = await this.responseRepository.find({
          where: { taskId },
          order: { questionId: 'ASC' },
        });

        previousAnnotations = annotations.map((a) => ({
          id: a.id,
          userId: a.userId,
          isGold: false,
          annotationData: a.annotationData,
          responses: allResponses
            .filter((r) => r.annotationId === a.id)
            .map((r) => ({
              questionId: r.questionId,
              response: r.response,
              timeSpent: r.timeSpent,
            })),
          createdAt: a.createdAt,
        }));
      }
    }

    // ── Build response matching frontend TaskRenderConfig interface ───────────
    return {
      taskId: task.id,
      projectId: task.projectId,
      viewType,

      // taskData shape expected by UnifiedTaskRenderer / ReviewSplitScreen
      taskData: {
        id: task.id,
        name:
          (task.fileMetadata as any)?.fileName ||
          task.externalId ||
          `Task ${task.id.substring(0, 8)}`,
        description: (task.dataPayload as any)?.context?.description || '',
        fileUrls: task.fileUrl ? [task.fileUrl] : [],
        metadata: task.fileMetadata || {},
        currentReviewLevel: task.currentReviewLevel || 0,
        status: task.status,
      },

      // UI Builder configuration (widgets, layout, theme)
      uiConfiguration: project?.configuration?.uiConfiguration || null,

      // Flat question list from project config (fallback when uiConfiguration absent)
      annotationQuestions: project?.configuration?.annotationQuestions || [],

      // Previous annotations (for reviewer split-screen comparison)
      previousAnnotations,

      // Saved responses for this user's current assignment (draft resume)
      annotationResponses: existingResponses.map((r) => ({
        questionId: r.questionId,
        response: r.response,
        timeSpent: r.timeSpent,
      })),

      extraWidgetData: {},
      reviewData: [],
    };
  }

  /**
   * Save annotation responses for a task and transition it to SUBMITTED.
   *
   * Handles the case where no active assignment exists (direct URL access /
   * demo scenarios) by auto-creating one.
   */
  async saveAnnotationResponse(
    taskId: string,
    userId: string,
    responses: Array<{
      questionId: string;
      response: any;
      timeSpent?: number;
      confidenceScore?: number;
    }>,
    extraWidgetData?: any,
    timeSpent?: number,
  ): Promise<any> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // ── Find or create an assignment ─────────────────────────────────────────
    let assignment = await this.assignmentRepository.findOne({
      where: { taskId, userId, status: AssignmentStatus.ASSIGNED },
    });

    if (!assignment) {
      // Fall back to any existing assignment for this user
      assignment = await this.assignmentRepository.findOne({
        where: { taskId, userId },
        order: { assignedAt: 'DESC' },
      });
    }

    if (!assignment) {
      // Auto-create an assignment (allows direct-URL annotation without pulling from queue)
      const assignmentCount = await this.assignmentRepository.count({ where: { taskId } });
      assignment = this.assignmentRepository.create({
        taskId,
        userId,
        workflowStage: WorkflowStage.ANNOTATION,
        status: AssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
        expiresAt: new Date(Date.now() + 28_800_000), // 8 hours
        assignmentMethod: AssignmentMethod.CLAIMED,
        assignmentOrder: assignmentCount + 1,
        isPrimary: assignmentCount === 0,
        requiresConsensus: task.requiresConsensus || false,
        consensusGroupId: task.id,
      } as Partial<Assignment>);
      assignment = await this.assignmentRepository.save(assignment);

      // Ensure task is at least ASSIGNED before submitting
      if (task.status === TaskStatus.QUEUED) {
        task.status = TaskStatus.ASSIGNED;
        await this.taskRepository.save(task);
      }
    }

    // ── Create or update annotation record ───────────────────────────────────
    let annotation = await this.annotationRepository.findOne({
      where: { taskId, assignmentId: assignment.id, userId },
    });

    if (!annotation) {
      annotation = this.annotationRepository.create({
        taskId,
        assignmentId: assignment.id,
        userId,
        annotationData: extraWidgetData || {},
        timeSpent,
        version: 1,
      } as Partial<Annotation>);
    } else {
      (annotation as any).annotationData = {
        ...(annotation as any).annotationData,
        ...extraWidgetData,
      };
      (annotation as any).version += 1;
      // Accumulate time if re-submitting a draft
      if (timeSpent) {
        (annotation as any).timeSpent = ((annotation as any).timeSpent || 0) + timeSpent;
      }
    }

    const savedAnnotation = await this.annotationRepository.save(annotation);

    // ── Upsert individual question responses ─────────────────────────────────
    for (const resp of responses) {
      let existing = await this.responseRepository.findOne({
        where: { taskId, annotationId: savedAnnotation.id, questionId: resp.questionId },
      });

      if (existing) {
        existing.response = resp.response;
        existing.timeSpent = resp.timeSpent ?? existing.timeSpent;
        (existing as any).confidenceScore = resp.confidenceScore;
        await this.responseRepository.save(existing);
      } else {
        const nr = this.responseRepository.create({
          taskId,
          annotationId: savedAnnotation.id,
          assignmentId: assignment.id,
          questionId: resp.questionId,
          response: resp.response,
          timeSpent: resp.timeSpent,
          confidenceScore: resp.confidenceScore,
        } as Partial<AnnotationResponse>);
        await this.responseRepository.save(nr);
      }
    }

    // ── CRITICAL: Transition task to SUBMITTED ────────────────────────────────
    task.status = TaskStatus.SUBMITTED;
    (task as any).submittedAt = new Date();
    task.completedAssignments = (task.completedAssignments || 0) + 1;
    await this.taskRepository.save(task);

    // ── CRITICAL: Mark assignment as COMPLETED ────────────────────────────────
    assignment.status = AssignmentStatus.COMPLETED;
    (assignment as any).completedAt = new Date();
    await this.assignmentRepository.save(assignment);

    this.logger.log(
      `Annotation submitted for task ${taskId} by user ${userId} — status → SUBMITTED`,
    );

    return {
      annotationId: savedAnnotation.id,
      responsesCount: responses.length,
      version: (savedAnnotation as any).version,
      taskStatus: TaskStatus.SUBMITTED,
    };
  }

  /**
   * Save review decision for a task.
   *
   * Handles lowercase decisions from the frontend ('approved', 'rejected',
   * 'needs_revision') and auto-creates a reviewer assignment if none exists.
   */
  async saveReviewDecision(
    taskId: string,
    userId: string,
    decision: string, // Accept any case — normalised below
    comments?: string,
    qualityScore?: number,
    extraWidgetData?: any,
    timeSpent?: number,
  ): Promise<any> {
    // ── Normalise decision to uppercase ──────────────────────────────────────
    const upperDecision = (decision || '').toUpperCase() as
      | 'APPROVED'
      | 'REJECTED'
      | 'NEEDS_REVISION';

    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // ── Find or create a reviewer assignment ─────────────────────────────────
    let assignment = await this.assignmentRepository.findOne({
      where: { taskId, userId, status: AssignmentStatus.ASSIGNED },
    });

    if (!assignment) {
      assignment = await this.assignmentRepository.findOne({
        where: { taskId, userId },
        order: { assignedAt: 'DESC' },
      });
    }

    if (!assignment) {
      const assignmentCount = await this.assignmentRepository.count({ where: { taskId } });
      assignment = this.assignmentRepository.create({
        taskId,
        userId,
        workflowStage: WorkflowStage.REVIEW,
        status: AssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
        expiresAt: new Date(Date.now() + 28_800_000),
        assignmentMethod: AssignmentMethod.CLAIMED,
        assignmentOrder: assignmentCount + 1,
        isPrimary: false,
        requiresConsensus: false,
        consensusGroupId: task.id,
      } as Partial<Assignment>);
      assignment = await this.assignmentRepository.save(assignment);
    }

    // Mark assignment complete
    assignment.status = AssignmentStatus.COMPLETED;
    (assignment as any).completedAt = new Date();
    await this.assignmentRepository.save(assignment);

    // ── Update task status based on (normalised) decision ────────────────────
    if (upperDecision === 'APPROVED') {
      task.currentReviewLevel = (task.currentReviewLevel || 0) + 1;

      const maxLevel = task.maxReviewLevel || 1;
      if (task.currentReviewLevel >= maxLevel) {
        task.status = TaskStatus.APPROVED;
        (task as any).allReviewsApproved = true;
      }
      // else: stays SUBMITTED for the next review level
    } else if (upperDecision === 'REJECTED') {
      task.status = TaskStatus.REJECTED;
    } else if (upperDecision === 'NEEDS_REVISION') {
      // Return to annotation queue
      task.status = TaskStatus.QUEUED;
      task.completedAssignments = 0;
    }

    // Store review metadata for audit trail
    task.dataPayload = {
      ...(task.dataPayload || {}),
      context: {
        ...((task.dataPayload as any)?.context || {}),
        lastReview: {
          reviewerId: userId,
          decision: upperDecision,
          comments,
          qualityScore,
          timeSpent,
          reviewedAt: new Date().toISOString(),
          extraWidgetData,
        },
      },
    } as typeof task.dataPayload;

    await this.taskRepository.save(task);

    this.logger.log(
      `Review '${upperDecision}' saved for task ${taskId} by reviewer ${userId} — task status → ${task.status}`,
    );

    return {
      taskId,
      decision: upperDecision,
      currentReviewLevel: task.currentReviewLevel,
      maxReviewLevel: task.maxReviewLevel,
      taskStatus: task.status,
    };
  }

  /**
   * Get complete annotation history for a task (for audit/tracking).
   */
  async getTaskAnnotationHistory(taskId: string): Promise<any> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const annotations = await this.annotationRepository.find({
      where: { taskId },
      order: { createdAt: 'ASC' },
    });

    const responses = await this.responseRepository.find({
      where: { taskId },
      order: { createdAt: 'ASC' },
    });

    const assignments = await this.assignmentRepository.find({
      where: { taskId },
      order: { assignedAt: 'ASC' },
    });

    const annotationDetails = annotations.map((annotation) => ({
      id: annotation.id,
      userId: annotation.userId,
      version: (annotation as any).version,
      confidenceScore: (annotation as any).confidenceScore,
      timeSpent: (annotation as any).timeSpent,
      createdAt: annotation.createdAt,
      responses: responses
        .filter((r) => r.annotationId === annotation.id)
        .map((r) => ({
          questionId: r.questionId,
          response: r.response,
          timeSpent: r.timeSpent,
          confidenceScore: (r as any).confidenceScore,
        })),
    }));

    const reviewHistory = (task.dataPayload as any)?.context?.lastReview
      ? [(task.dataPayload as any).context.lastReview]
      : [];

    return {
      taskId,
      totalAnnotations: annotations.length,
      annotations: annotationDetails,
      assignments: assignments.map((a) => ({
        id: a.id,
        userId: a.userId,
        workflowStage: a.workflowStage,
        status: a.status,
        assignedAt: a.assignedAt,
        completedAt: (a as any).completedAt,
      })),
      reviews: reviewHistory,
      consensusScore: task.consensusScore,
      consensusReached: task.consensusReached,
    };
  }
}
