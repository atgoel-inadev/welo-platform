import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, Workflow } from '@app/common/entities';

@Injectable()
export class WorkflowConfigService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
  ) {}

  async configureWorkflow(projectId: string, config: any) {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Validate workflow configuration
    this.validateWorkflowConfig(config);

    // Update workflow configuration
    project.configuration.workflowConfiguration = {
      annotatorsPerTask: config.annotatorsPerTask || 1,
      reviewLevels: config.reviewLevels || [],
      approvalCriteria: config.approvalCriteria || {
        requireAllAnnotatorConsensus: false,
      },
      assignmentRules: config.assignmentRules || {
        allowSelfAssignment: true,
        preventDuplicateAssignments: true,
      },
    };

    await this.projectRepository.save(project);

    // Create or update XState workflow for this configuration
    await this.createReviewWorkflow(projectId, project.configuration.workflowConfiguration);

    return {
      success: true,
      data: {
        workflowConfiguration: project.configuration.workflowConfiguration,
      },
    };
  }

  async getWorkflowConfiguration(projectId: string) {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return {
      success: true,
      data: {
        workflowConfiguration: project.configuration.workflowConfiguration || {},
      },
    };
  }

  async updateAnnotatorsPerTask(projectId: string, count: number) {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (count < 1) {
      throw new BadRequestException('Annotators per task must be at least 1');
    }

    if (!project.configuration.workflowConfiguration) {
      project.configuration.workflowConfiguration = {
        annotatorsPerTask: count,
        reviewLevels: [],
        approvalCriteria: { requireAllAnnotatorConsensus: false },
        assignmentRules: {
          allowSelfAssignment: true,
          preventDuplicateAssignments: true,
        },
      };
    } else {
      project.configuration.workflowConfiguration.annotatorsPerTask = count;
    }

    await this.projectRepository.save(project);

    return {
      success: true,
      data: {
        annotatorsPerTask: count,
      },
    };
  }

  async addReviewLevel(projectId: string, reviewLevel: any) {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Validate review level
    if (!reviewLevel.level || !reviewLevel.name || !reviewLevel.reviewersCount) {
      throw new BadRequestException('Review level must have level, name, and reviewersCount');
    }

    if (!project.configuration.workflowConfiguration) {
      project.configuration.workflowConfiguration = {
        annotatorsPerTask: 1,
        reviewLevels: [],
        approvalCriteria: { requireAllAnnotatorConsensus: false },
        assignmentRules: {
          allowSelfAssignment: true,
          preventDuplicateAssignments: true,
        },
      };
    }

    const existingLevel = project.configuration.workflowConfiguration.reviewLevels.find(
      (rl) => rl.level === reviewLevel.level,
    );

    if (existingLevel) {
      throw new BadRequestException(`Review level ${reviewLevel.level} already exists`);
    }

    project.configuration.workflowConfiguration.reviewLevels.push({
      level: reviewLevel.level,
      name: reviewLevel.name,
      reviewersCount: reviewLevel.reviewersCount,
      requireAllApprovals: reviewLevel.requireAllApprovals !== false,
      approvalThreshold: reviewLevel.approvalThreshold || 100,
      autoAssign: reviewLevel.autoAssign !== false,
      allowedReviewers: reviewLevel.allowedReviewers || [],
    });

    // Sort review levels by level number
    project.configuration.workflowConfiguration.reviewLevels.sort((a, b) => a.level - b.level);

    await this.projectRepository.save(project);

    // Update XState workflow
    await this.createReviewWorkflow(projectId, project.configuration.workflowConfiguration);

    return {
      success: true,
      data: {
        reviewLevels: project.configuration.workflowConfiguration.reviewLevels,
      },
    };
  }

  async removeReviewLevel(projectId: string, level: number) {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (!project.configuration.workflowConfiguration) {
      throw new NotFoundException('No workflow configuration found');
    }

    const levelIndex = project.configuration.workflowConfiguration.reviewLevels.findIndex(
      (rl) => rl.level === level,
    );

    if (levelIndex === -1) {
      throw new NotFoundException(`Review level ${level} not found`);
    }

    project.configuration.workflowConfiguration.reviewLevels.splice(levelIndex, 1);

    await this.projectRepository.save(project);

    // Update XState workflow
    await this.createReviewWorkflow(projectId, project.configuration.workflowConfiguration);

    return {
      success: true,
      message: `Review level ${level} removed successfully`,
    };
  }

  private validateWorkflowConfig(config: any) {
    if (config.annotatorsPerTask && config.annotatorsPerTask < 1) {
      throw new BadRequestException('annotatorsPerTask must be at least 1');
    }

    if (config.reviewLevels) {
      for (const level of config.reviewLevels) {
        if (!level.level || !level.name || !level.reviewersCount) {
          throw new BadRequestException(
            'Each review level must have level, name, and reviewersCount',
          );
        }

        if (level.reviewersCount < 1) {
          throw new BadRequestException('reviewersCount must be at least 1');
        }

        if (
          !level.requireAllApprovals &&
          (!level.approvalThreshold || level.approvalThreshold < 0 || level.approvalThreshold > 100)
        ) {
          throw new BadRequestException('approvalThreshold must be between 0 and 100');
        }
      }
    }

    return true;
  }

  private async createReviewWorkflow(projectId: string, config: any) {
    // Create XState machine definition for the review workflow
    const states: any = {
      queued: {
        on: {
          ASSIGN: 'annotation',
        },
      },
      annotation: {
        on: {
          SUBMIT: 'checkConsensus',
        },
      },
      checkConsensus: {
        always: [
          {
            target: 'review_level_1',
            guard: 'hasReviewLevels',
          },
          {
            target: 'completed',
            guard: 'consensusReached',
          },
          {
            target: 'needsMoreAnnotations',
          },
        ],
      },
      needsMoreAnnotations: {
        on: {
          ASSIGN: 'annotation',
        },
      },
    };

    // Add review levels dynamically
    config.reviewLevels.forEach((reviewLevel: any, index: number) => {
      const stateName = `review_level_${reviewLevel.level}`;
      const nextLevel = config.reviewLevels[index + 1];
      const nextStateName = nextLevel ? `review_level_${nextLevel.level}` : 'completed';

      states[stateName] = {
        on: {
          APPROVE: {
            target: nextStateName,
            guard: 'allReviewersApproved',
          },
          REJECT: 'annotation',
          REQUEST_CHANGES: 'annotation',
        },
      };
    });

    states.completed = {
      type: 'final',
    };

    const workflowDefinition = {
      id: `reviewWorkflow_${projectId}`,
      initial: 'queued',
      context: {
        projectId,
        annotatorsPerTask: config.annotatorsPerTask,
        completedAnnotations: 0,
        currentReviewLevel: 0,
        maxReviewLevel: config.reviewLevels.length,
        approvals: {},
      },
      states,
    };

    // Check if workflow already exists
    let workflow = await this.workflowRepository.findOne({
      where: {
        projectId,
        name: 'Review Workflow',
      },
    });

    if (workflow) {
      // Update existing workflow
      workflow.xstateDefinition = workflowDefinition as any;
      workflow.version += 1;
    } else {
      // Create new workflow
      workflow = this.workflowRepository.create();
      workflow.projectId = projectId;
      workflow.name = 'Review Workflow';
      workflow.description = 'Auto-generated workflow for multi-level review process';
      workflow.xstateDefinition = workflowDefinition as any;
      workflow.version = 1;
      workflow.status = 'ACTIVE' as any;
      workflow.isTemplate = false;
      workflow.createdBy = projectId;
      workflow.stateSchema = {
        states: Object.keys(states).reduce((acc, key) => {
          acc[key] = { description: `${key} state` };
          return acc;
        }, {} as any),
        context: {},
      };
      workflow.eventSchema = [
        { eventType: 'ASSIGN', payloadSchema: {}, description: 'Assign task to annotator' },
        { eventType: 'SUBMIT', payloadSchema: {}, description: 'Submit annotation' },
        { eventType: 'APPROVE', payloadSchema: {}, description: 'Approve at review level' },
        { eventType: 'REJECT', payloadSchema: {}, description: 'Reject and send back' },
        { eventType: 'REQUEST_CHANGES', payloadSchema: {}, description: 'Request changes from annotator' },
      ];
    }

    await this.workflowRepository.save(workflow);

    // Update project's default workflow
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (project) {
      project.defaultWorkflowId = workflow.id;
      await this.projectRepository.save(project);
    }

    return workflow;
  }
}
