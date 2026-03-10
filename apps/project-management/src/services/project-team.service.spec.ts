import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectTeamService } from './project-team.service';
import { Project, ProjectTeamMember, User } from '@app/common/entities';

describe('ProjectTeamService', () => {
  let service: ProjectTeamService;
  let projectRepository: Repository<Project>;
  let projectTeamMemberRepository: Repository<ProjectTeamMember>;
  let userRepository: Repository<User>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
  } as Project;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  } as User;

  const mockTeamMember = {
    id: 'member-123',
    projectId: 'project-123',
    userId: 'user-123',
    role: 'ANNOTATOR',
    assignedTasksCount: 5,
    completedTasksCount: 3,
    joinedAt: new Date(),
    user: mockUser,
  } as ProjectTeamMember;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectTeamService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectTeamMember),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            increment: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectTeamService>(ProjectTeamService);
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    projectTeamMemberRepository = module.get<Repository<ProjectTeamMember>>(getRepositoryToken(ProjectTeamMember));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProjectTeam', () => {
    it('should return project team members', async () => {
      const mockTeam = [mockTeamMember];

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectTeamMemberRepository, 'find').mockResolvedValue(mockTeam);

      const result = await service.getProjectTeam('project-123');

      expect(result).toEqual(mockTeam);
      expect(projectTeamMemberRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        relations: ['user'],
        order: { joinedAt: 'ASC' },
      });
    });

    it('should throw error when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getProjectTeam('non-existent')).rejects.toThrow('Project not found');
    });
  });

  describe('assignUserToProject', () => {
    it('should assign user to project successfully', async () => {
      const assignDto = {
        userId: 'user-123',
        role: 'ANNOTATOR',
      };

      const createdMember = { ...mockTeamMember, ...assignDto };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(projectTeamMemberRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(projectTeamMemberRepository, 'create').mockReturnValue(createdMember as any);
      jest.spyOn(projectTeamMemberRepository, 'save').mockResolvedValue(createdMember);

      const result = await service.assignUserToProject(assignDto);

      expect(result).toEqual(createdMember);
      expect(projectTeamMemberRepository.create).toHaveBeenCalledWith({
        projectId: 'project-123',
        userId: 'user-123',
        role: 'ANNOTATOR',
        assignedTasks: 0,
        completedTasks: 0,
        joinedAt: expect.any(Date),
      });
    });

    it('should throw error when project not found', async () => {
      const assignDto = {
        userId: 'user-123',
        role: 'ANNOTATOR',
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.assignUserToProject(assignDto)).rejects.toThrow('Project not found');
    });

    it('should throw error when user not found', async () => {
      const assignDto = {
        userId: 'non-existent',
        role: 'ANNOTATOR',
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.assignUserToProject(assignDto)).rejects.toThrow('User not found');
    });

    it('should throw error when user already assigned to project', async () => {
      const assignDto = {
        userId: 'user-123',
        role: 'ANNOTATOR',
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(projectTeamMemberRepository, 'findOne').mockResolvedValue(mockTeamMember);

      await expect(service.assignUserToProject(assignDto)).rejects.toThrow('User is already assigned to this project');
    });
  });

  describe('updateTeamMember', () => {
    it('should update team member role', async () => {
      const updateData = {
        role: ProjectRole.REVIEWER,
      };

      const updatedMember = { ...mockTeamMember, ...updateData };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectTeamMemberRepository, 'findOne').mockResolvedValue(mockTeamMember);
      jest.spyOn(projectTeamMemberRepository, 'save').mockResolvedValue(updatedMember);

      const result = await service.updateTeamMember('project-123', 'user-123', updateData);

      expect(result).toEqual(updatedMember);
      expect(result.role).toBe('REVIEWER');
    });

    it('should throw error when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateTeamMember('non-existent', 'user-123', {})).rejects.toThrow('Project not found');
    });

    it('should throw error when team member not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectTeamMemberRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateTeamMember('project-123', 'non-existent', {})).rejects.toThrow('Team member not found');
    });
  });

  describe('removeUserFromProject', () => {
    it('should remove user from project', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectTeamMemberRepository, 'findOne').mockResolvedValue(mockTeamMember);
      jest.spyOn(projectTeamMemberRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      await expect(service.removeUserFromProject('project-123', 'user-123')).resolves.toBeUndefined();
      expect(projectTeamMemberRepository.delete).toHaveBeenCalledWith({
        projectId: 'project-123',
        userId: 'user-123',
      });
    });

    it('should throw error when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.removeUserFromProject('non-existent', 'user-123')).rejects.toThrow('Project not found');
    });

    it('should throw error when team member not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectTeamMemberRepository, 'findOne').mockResolvedValue(null);

      await expect(service.removeUserFromProject('project-123', 'non-existent')).rejects.toThrow('Team member not found');
    });
  });

  describe('incrementAssignedTasks', () => {
    it('should increment assigned tasks count', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectTeamMemberRepository, 'findOne').mockResolvedValue(mockTeamMember);
      jest.spyOn(projectTeamMemberRepository, 'increment').mockResolvedValue({} as any);

      await expect(service.incrementAssignedTasks('project-123', 'user-123')).resolves.toBeUndefined();
      expect(projectTeamMemberRepository.increment).toHaveBeenCalledWith(
        { projectId: 'project-123', userId: 'user-123' },
        'assignedTasks',
        1
      );
    });

    it('should throw error when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.incrementAssignedTasks('non-existent', 'user-123')).rejects.toThrow('Project not found');
    });

    it('should throw error when team member not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectTeamMemberRepository, 'findOne').mockResolvedValue(null);

      await expect(service.incrementAssignedTasks('project-123', 'non-existent')).rejects.toThrow('Team member not found');
    });
  });

  describe('incrementCompletedTasks', () => {
    it('should increment completed tasks count', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectTeamMemberRepository, 'findOne').mockResolvedValue(mockTeamMember);
      jest.spyOn(projectTeamMemberRepository, 'increment').mockResolvedValue({} as any);

      await expect(service.incrementCompletedTasks('project-123', 'user-123')).resolves.toBeUndefined();
      expect(projectTeamMemberRepository.increment).toHaveBeenCalledWith(
        { projectId: 'project-123', userId: 'user-123' },
        'completedTasks',
        1
      );
    });

    it('should throw error when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.incrementCompletedTasks('non-existent', 'user-123')).rejects.toThrow('Project not found');
    });

    it('should throw error when team member not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectTeamMemberRepository, 'findOne').mockResolvedValue(null);

      await expect(service.incrementCompletedTasks('project-123', 'non-existent')).rejects.toThrow('Team member not found');
    });
  });
});