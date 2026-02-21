import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTeamMember, Project, User } from '@app/common/entities';
import { AssignUserToProjectDto, UpdateProjectTeamMemberDto } from '../dto/project-team.dto';

@Injectable()
export class ProjectTeamService {
  constructor(
    @InjectRepository(ProjectTeamMember)
    private readonly teamMemberRepository: Repository<ProjectTeamMember>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get all team members for a project
   */
  async getProjectTeam(projectId: string) {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const teamMembers = await this.teamMemberRepository.find({
      where: { projectId, isActive: true },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
    });

    return {
      success: true,
      data: teamMembers.map((member) => ({
        id: member.id,
        userId: member.userId,
        projectId: member.projectId,
        role: member.role,
        quota: member.quota,
        assignedTasks: member.assignedTasksCount,
        completedTasks: member.completedTasksCount,
        joinedAt: member.joinedAt,
        user: member.user ? {
          id: member.user.id,
          email: member.user.email,
          username: member.user.username,
          name: `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || member.user.username || member.user.email,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          role: member.user.role,
          status: member.user.status,
        } : null,
      })),
    };
  }

  /**
   * Assign a user to a project
   */
  async assignUserToProject(dto: AssignUserToProjectDto) {
    // Validate project exists
    const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Check if user is already in the project
    const existingMember = await this.teamMemberRepository.findOne({
      where: {
        projectId: dto.projectId,
        userId: dto.userId,
      },
    });

    if (existingMember) {
      if (existingMember.isActive) {
        throw new ConflictException(`User is already a member of this project`);
      } else {
        // Reactivate the member
        existingMember.isActive = true;
        existingMember.role = dto.role;
        existingMember.quota = dto.quota;
        await this.teamMemberRepository.save(existingMember);

        return {
          success: true,
          data: existingMember,
          message: 'User reactivated in project',
        };
      }
    }

    // Create new team member
    const teamMember = this.teamMemberRepository.create({
      projectId: dto.projectId,
      userId: dto.userId,
      role: dto.role,
      quota: dto.quota || null,
      assignedTasksCount: 0,
      completedTasksCount: 0,
      isActive: true,
    });

    await this.teamMemberRepository.save(teamMember);

    return {
      success: true,
      data: teamMember,
      message: 'User assigned to project successfully',
    };
  }

  /**
   * Update a team member (quota, status, etc.)
   */
  async updateTeamMember(
    projectId: string,
    userId: string,
    dto: UpdateProjectTeamMemberDto,
  ) {
    const teamMember = await this.teamMemberRepository.findOne({
      where: { projectId, userId },
    });

    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }

    if (dto.quota !== undefined) {
      teamMember.quota = dto.quota;
    }

    if (dto.isActive !== undefined) {
      teamMember.isActive = dto.isActive;
    }

    await this.teamMemberRepository.save(teamMember);

    return {
      success: true,
      data: teamMember,
      message: 'Team member updated successfully',
    };
  }

  /**
   * Remove a user from a project (soft delete - set isActive to false)
   */
  async removeUserFromProject(projectId: string, userId: string) {
    const teamMember = await this.teamMemberRepository.findOne({
      where: { projectId, userId },
    });

    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }

    teamMember.isActive = false;
    await this.teamMemberRepository.save(teamMember);

    return {
      success: true,
      message: 'User removed from project successfully',
    };
  }

  /**
   * Increment assigned tasks count for a team member
   */
  async incrementAssignedTasks(projectId: string, userId: string) {
    const teamMember = await this.teamMemberRepository.findOne({
      where: { projectId, userId },
    });

    if (teamMember) {
      teamMember.assignedTasksCount += 1;
      await this.teamMemberRepository.save(teamMember);
    }
  }

  /**
   * Increment completed tasks count for a team member
   */
  async incrementCompletedTasks(projectId: string, userId: string) {
    const teamMember = await this.teamMemberRepository.findOne({
      where: { projectId, userId },
    });

    if (teamMember) {
      teamMember.completedTasksCount += 1;
      await this.teamMemberRepository.save(teamMember);
    }
  }
}
