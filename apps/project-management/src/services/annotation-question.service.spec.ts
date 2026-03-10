import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnotationQuestionService } from './annotation-question.service';
import { Project } from '@app/common/entities';

describe('AnnotationQuestionService', () => {
  let service: AnnotationQuestionService;
  let projectRepository: Repository<Project>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    configuration: {
      annotationSchema: {},
      qualityThresholds: {},
      workflowRules: {},
      uiConfiguration: {},
      annotationQuestions: [
        {
          id: 'question-1',
          question: 'What is the main object?',
          questionType: 'SINGLE_SELECT' as const,
          required: true,
          options: [
            { id: 'opt1', label: 'Car', value: 'car' },
            { id: 'opt2', label: 'Person', value: 'person' },
          ],
        },
      ],
    },
  } as Project;

  const mockQuestion = {
    id: 'question-2',
    question: 'Describe the scene',
    questionType: 'TEXT' as const,
    required: false,
    validation: {
      minLength: 10,
      maxLength: 500,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnotationQuestionService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnnotationQuestionService>(AnnotationQuestionService);
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addQuestionsToProject', () => {
    it('should add questions to project configuration', async () => {
      const project = { ...mockProject, configuration: { ...mockProject.configuration, annotationQuestions: [] } };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(project);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(project);

      const questions = [mockQuestion];
      const result = await service.addQuestionsToProject('project-123', questions);

      expect(result.success).toBe(true);
      expect(result.data.questions).toContain(mockQuestion);
      expect(projectRepository.findOne).toHaveBeenCalledWith({ where: { id: 'project-123' } });
      expect(projectRepository.save).toHaveBeenCalledWith(project);
    });

    it('should throw NotFoundException if project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.addQuestionsToProject('invalid-id', [mockQuestion])).rejects.toThrow(
        'Project with ID invalid-id not found',
      );
    });

    it('should validate questions before adding', async () => {
      const project = { ...mockProject, configuration: { ...mockProject.configuration, annotationQuestions: [] } };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(project);

      const invalidQuestion = { question: 'Test' }; // Missing required fields

      await expect(service.addQuestionsToProject('project-123', [invalidQuestion])).rejects.toThrow(
        'Question ID is required',
      );
    });
  });

  describe('getProjectQuestions', () => {
    it('should return project questions', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      const result = await service.getProjectQuestions('project-123');

      expect(result.success).toBe(true);
      expect(result.data.questions).toEqual(mockProject.configuration.annotationQuestions);
      expect(projectRepository.findOne).toHaveBeenCalledWith({ where: { id: 'project-123' } });
    });

    it('should return empty array if no questions configured', async () => {
      const project = { ...mockProject, configuration: { ...mockProject.configuration, annotationQuestions: undefined } };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(project);

      const result = await service.getProjectQuestions('project-123');

      expect(result.success).toBe(true);
      expect(result.data.questions).toEqual([]);
    });

    it('should throw NotFoundException if project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getProjectQuestions('invalid-id')).rejects.toThrow(
        'Project with ID invalid-id not found',
      );
    });
  });

  describe('updateQuestion', () => {
    it('should update a question in project configuration', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(mockProject);

      const updateData = { question: 'Updated question' };
      const result = await service.updateQuestion('project-123', 'question-1', updateData);

      expect(result.success).toBe(true);
      expect(result.data.question.question).toBe('Updated question');
      expect(projectRepository.save).toHaveBeenCalledWith(mockProject);
    });

    it('should throw NotFoundException if project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateQuestion('invalid-id', 'question-1', {})).rejects.toThrow(
        'Project with ID invalid-id not found',
      );
    });

    it('should throw NotFoundException if question not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      await expect(service.updateQuestion('project-123', 'invalid-question', {})).rejects.toThrow(
        'Question with ID invalid-question not found',
      );
    });
  });

  describe('deleteQuestion', () => {
    it('should delete a question from project configuration', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(mockProject);

      const result = await service.deleteQuestion('project-123', 'question-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Question question-1 deleted successfully');
      expect(projectRepository.save).toHaveBeenCalledWith(mockProject);
    });

    it('should throw NotFoundException if project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deleteQuestion('invalid-id', 'question-1')).rejects.toThrow(
        'Project with ID invalid-id not found',
      );
    });

    it('should throw NotFoundException if question not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      await expect(service.deleteQuestion('project-123', 'invalid-question')).rejects.toThrow(
        'Question with ID invalid-question not found',
      );
    });

    it('should throw BadRequestException if question has dependencies', async () => {
      const projectWithDeps = {
        ...mockProject,
        configuration: {
          ...mockProject.configuration,
          annotationQuestions: [
            {
              id: 'question-1',
              question: 'What is the main object?',
              questionType: 'SINGLE_SELECT' as const,
              required: true,
            },
            {
              id: 'question-2',
              question: 'Follow-up question',
              questionType: 'TEXT' as const,
              required: false,
              dependsOn: 'question-1',
            },
          ],
        },
      };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(projectWithDeps);

      await expect(service.deleteQuestion('project-123', 'question-1')).rejects.toThrow(
        'Cannot delete question question-1 because 1 other question(s) depend on it',
      );
    });
  });
});