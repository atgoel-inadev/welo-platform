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
        workflowConfiguration: {
          annotatorsPerTask: 1,
          reviewLevels: [],
          approvalCriteria: {
            requireAllAnnotatorConsensus: false,
          },
          assignmentRules: {
            allowSelfAssignment: true,
            preventDuplicateAssignments: true,
          },
        },
        supportedFileTypes: createDto.supportedFileTypes || [],
      },
    });

    const savedProject = await this.projectRepository.save(project);

    return {
      success: true,
      data: savedProject,
    };
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
}
