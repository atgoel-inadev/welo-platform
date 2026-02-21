import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, Task, Assignment } from '@app/common/entities';
import { ProjectStatus } from '@app/common/enums';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async listProjects(filters: {
    customerId?: string;
    status?: string;
    page: number;
    pageSize: number;
  }) {
    const { customerId, status, page, pageSize } = filters;
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.customer', 'customer')
      .leftJoinAndSelect('project.creator', 'creator');

    if (customerId) {
      queryBuilder.andWhere('project.customerId = :customerId', { customerId });
    }

    if (status) {
      queryBuilder.andWhere('project.status = :status', { status });
    }

    const [projects, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy('project.createdAt', 'DESC')
      .getManyAndCount();

    return {
      success: true,
      data: projects,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrevious: page > 1,
      },
    };
  }

  async getProject(id: string) {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['customer', 'creator', 'defaultWorkflow'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Get project statistics
    const statistics = await this.getProjectStatistics(id);

    return {
      success: true,
      data: {
        ...project,
        statistics: statistics.data,
      },
    };
  }

  async createProject(createDto: any) {
    // Build workflow configuration with stage support
    const workflowConfiguration = this.buildWorkflowConfiguration(createDto.workflow_config);

    const project = this.projectRepository.create({
      name: createDto.name,
      customerId: createDto.customerId,
      description: createDto.description,
      projectType: createDto.projectType,
      status: ProjectStatus.DRAFT,
      createdBy: createDto.createdBy,
      startDate: createDto.startDate,
      endDate: createDto.endDate,
      configuration: {
        annotationSchema: createDto.annotationSchema || {},
        qualityThresholds: createDto.qualityThresholds || {},
        workflowRules: createDto.workflowRules || {},
        uiConfiguration: createDto.uiConfiguration || {},
        annotationQuestions: [],
        workflowConfiguration,
        supportedFileTypes: createDto.supportedFileTypes || [],
      },
    });

    const savedProject = await this.projectRepository.save(project);

    return {
      success: true,
      data: savedProject,
    };
  }

  /**
   * Builds workflow configuration with extended stage support
   * Maintains backward compatibility with review_levels structure
   */
  private buildWorkflowConfiguration(workflowConfig?: any) {
    const defaultConfig = {
      annotatorsPerTask: 1,
      reviewLevels: [],
      approvalCriteria: {
        requireAllAnnotatorConsensus: false,
      },
      assignmentRules: {
        allowSelfAssignment: true,
        preventDuplicateAssignments: true,
      },
    };

    if (!workflowConfig) {
      return defaultConfig;
    }

    // Extended configuration with stages
    const extendedConfig = {
      ...defaultConfig,
      
      // Stage-based configuration (new)
      stages: workflowConfig.stages || [],
      
      // Global settings
      global_max_rework_before_reassignment: workflowConfig.global_max_rework_before_reassignment || 3,
      enable_quality_gates: workflowConfig.enable_quality_gates || false,
      minimum_quality_score: workflowConfig.minimum_quality_score || 70,

      // Legacy support
      annotatorsPerTask: workflowConfig.annotatorsPerTask || 
                         workflowConfig.stages?.find(s => s.type === 'annotation')?.annotators_count || 1,
      reviewLevels: workflowConfig.review_levels || workflowConfig.reviewLevels || [],
      approvalCriteria: workflowConfig.approvalCriteria || workflowConfig.approval_criteria || defaultConfig.approvalCriteria,
      assignmentRules: workflowConfig.assignmentRules || workflowConfig.assignment_rules || defaultConfig.assignmentRules,
    };

    return extendedConfig;
  }

  async updateProject(id: string, updateDto: any) {
    const project = await this.projectRepository.findOne({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Update basic fields
    if (updateDto.name) project.name = updateDto.name;
    if (updateDto.description !== undefined) project.description = updateDto.description;
    if (updateDto.status) project.status = updateDto.status;
    if (updateDto.startDate) project.startDate = updateDto.startDate;
    if (updateDto.endDate) project.endDate = updateDto.endDate;

    // Merge configuration if provided
    if (updateDto.configuration) {
      project.configuration = {
        ...project.configuration,
        ...updateDto.configuration,
      };
    }

    // Handle workflow_config update with stage support
    if (updateDto.workflow_config) {
      const updatedWorkflowConfig = this.buildWorkflowConfiguration(updateDto.workflow_config);
      project.configuration = {
        ...project.configuration,
        workflowConfiguration: updatedWorkflowConfig,
      };
    }

    const updatedProject = await this.projectRepository.save(project);

    return {
      success: true,
      data: updatedProject,
    };
  }

  async deleteProject(id: string) {
    const project = await this.projectRepository.findOne({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Soft delete
    await this.projectRepository.softRemove(project);

    return {
      success: true,
      message: `Project ${id} deleted successfully`,
    };
  }

  async getProjectStatistics(id: string) {
    const project = await this.projectRepository.findOne({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Get task statistics
    const totalTasks = await this.taskRepository.count({
      where: { projectId: id },
    });

    const completedTasks = await this.taskRepository.count({
      where: { projectId: id, status: 'COMPLETED' as any },
    });

    const inProgressTasks = await this.taskRepository.count({
      where: { projectId: id, status: 'IN_PROGRESS' as any },
    });

    const queuedTasks = await this.taskRepository.count({
      where: { projectId: id, status: 'QUEUED' as any },
    });

    // Calculate average quality score
    const tasksWithQuality = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.qualityChecks', 'qc')
      .where('task.projectId = :projectId', { projectId: id })
      .andWhere('qc.qualityScore IS NOT NULL')
      .select('AVG(qc.qualityScore)', 'avgQuality')
      .getRawOne();

    return {
      success: true,
      data: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        queuedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        averageQualityScore: tasksWithQuality?.avgQuality || 0,
      },
    };
  }

  async setSupportedFileTypes(id: string, fileTypes: string[]) {
    const project = await this.projectRepository.findOne({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    project.configuration.supportedFileTypes = fileTypes as any;
    await this.projectRepository.save(project);

    return {
      success: true,
      data: {
        supportedFileTypes: fileTypes,
      },
    };
  }

  async getSupportedFileTypes(id: string) {
    const project = await this.projectRepository.findOne({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return {
      success: true,
      data: {
        supportedFileTypes: project.configuration.supportedFileTypes || [],
      },
    };
  }

  /**
   * Clone a project
   */
  async cloneProject(projectId: string, data: { newName: string; copyTasks?: boolean }) {
    const originalProject = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['customer', 'creator'],
    });

    if (!originalProject) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Create cloned project
    const clonedProject = this.projectRepository.create({
      name: data.newName,
      customerId: originalProject.customerId,
      description: originalProject.description,
      projectType: originalProject.projectType,
      status: ProjectStatus.DRAFT,
      configuration: originalProject.configuration,
    });

    const savedProject = await this.projectRepository.save(clonedProject);

    // TODO: Copy tasks if requested
    if (data.copyTasks) {
      // Implementation for copying tasks
    }

    return {
      success: true,
      data: await this.projectRepository.findOne({
        where: { id: savedProject.id },
        relations: ['customer', 'creator'],
      }),
      message: 'Project cloned successfully',
    };
  }
}
