import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewApproval, ReviewApprovalStatus, Annotation, QualityCheck, QualityCheckStatus, Task } from '@app/common';
import { SubmitReviewDto, ReviewDecision } from './dto/review.dto';
import { StateManagementService } from '../state-management/state-management.service';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectRepository(ReviewApproval)
    private readonly reviewRepo: Repository<ReviewApproval>,
    @InjectRepository(Annotation)
    private readonly annotationRepo: Repository<Annotation>,
    @InjectRepository(QualityCheck)
    private readonly qcRepo: Repository<QualityCheck>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly stateManagement: StateManagementService,
    private readonly kafkaService: KafkaService,
  ) {}

  async submitReview(taskId: string, reviewerId: string, dto: SubmitReviewDto) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    const annotation = await this.annotationRepo.findOne({ where: { id: dto.annotationId } });
    if (!annotation) throw new NotFoundException(`Annotation ${dto.annotationId} not found`);

    // Persist review record
    const statusMap: Record<ReviewDecision, ReviewApprovalStatus> = {
      [ReviewDecision.APPROVE]: ReviewApprovalStatus.APPROVED,
      [ReviewDecision.REJECT]: ReviewApprovalStatus.REJECTED,
      [ReviewDecision.REQUEST_REVISION]: ReviewApprovalStatus.CHANGES_REQUESTED,
    };

    const review = await this.reviewRepo.save(
      this.reviewRepo.create({
        taskId,
        assignmentId: task.assignmentId || annotation.assignmentId,
        reviewerId,
        reviewLevel: (task.currentReviewLevel || 0) + 1,
        status: statusMap[dto.decision],
        comments: dto.feedback,
        feedback: {
          qualityScore: dto.score,
          issues: dto.issues?.map((i) => ({
            questionId: `${i.category}-${Date.now()}`,
            issue: i.description,
            severity: i.severity as any,
          })),
          suggestions: [],
        },
        reviewedAt: new Date(),
      }),
    );

    // Fetch most recent automated QC score
    const latestQc = await this.qcRepo.findOne({
      where: { taskId, annotationId: dto.annotationId },
      order: { createdAt: 'DESC' },
    });
    const autoQcScore = latestQc ? Number(latestQc.qualityScore) : 70;

    // Publish review submitted event
    await this.kafkaService.publishEvent('review.submitted', {
      id: review.id,
      taskId,
      annotationId: dto.annotationId,
      reviewerId,
      score: dto.score,
      decision: dto.decision,
    });

    // Delegate state decision to StateManagementService
    const evalResult = await this.stateManagement.evaluateReviewDecision(
      taskId,
      dto.decision as any,
      dto.score,
      reviewerId,
      autoQcScore,
    );

    return {
      reviewId: review.id,
      taskId,
      annotationId: dto.annotationId,
      decision: dto.decision,
      score: dto.score,
      stateTransition: {
        eventSent: evalResult.stateEventSent,
        previousState: 'pendingReview',
        newState: evalResult.requeued ? 'queued' : evalResult.escalated ? 'escalated' : 'approved',
        requeued: evalResult.requeued,
        escalated: evalResult.escalated,
      },
      overallQualityScore: evalResult.overallQualityScore,
      reason: evalResult.reason,
    };
  }

  async getReviews(taskId: string) {
    return this.reviewRepo.find({
      where: { taskId },
      order: { reviewedAt: 'DESC' },
    });
  }

  async getReview(reviewId: string) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);
    return review;
  }

  async getQaSummary(taskId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    // Get latest final annotation
    const annotation = await this.annotationRepo.findOne({
      where: { taskId, isFinal: true },
      order: { submittedAt: 'DESC' },
    });

    // Get latest QC check
    const latestQc = await this.qcRepo.findOne({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });

    // Get latest review
    const latestReview = await this.reviewRepo.findOne({
      where: { taskId },
      order: { reviewedAt: 'DESC' },
    });

    const autoQcScore = latestQc ? Number(latestQc.qualityScore) : null;
    const reviewScore = latestReview?.feedback?.qualityScore ?? null;

    return this.stateManagement.getTaskQaSummary(
      taskId,
      annotation?.id,
      autoQcScore ?? 0,
      reviewScore ?? 0,
      latestReview?.status,
      latestReview?.comments,
    );
  }
}
