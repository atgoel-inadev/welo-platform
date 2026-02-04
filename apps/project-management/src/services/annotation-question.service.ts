import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '@app/common/entities';

@Injectable()
export class AnnotationQuestionService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async addQuestionsToProject(projectId: string, questions: any[]) {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Validate questions
    for (const question of questions) {
      this.validateQuestion(question);
    }

    // Add questions to project configuration
    const currentQuestions = project.configuration.annotationQuestions || [];
    project.configuration.annotationQuestions = [...currentQuestions, ...questions];

    await this.projectRepository.save(project);

    return {
      success: true,
      data: {
        questions: project.configuration.annotationQuestions,
      },
    };
  }

  async getProjectQuestions(projectId: string) {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return {
      success: true,
      data: {
        questions: project.configuration.annotationQuestions || [],
      },
    };
  }

  async updateQuestion(projectId: string, questionId: string, updateData: any) {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const questions = project.configuration.annotationQuestions || [];
    const questionIndex = questions.findIndex((q) => q.id === questionId);

    if (questionIndex === -1) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    // Update question
    questions[questionIndex] = {
      ...questions[questionIndex],
      ...updateData,
      id: questionId, // Preserve ID
    };

    // Validate updated question
    this.validateQuestion(questions[questionIndex]);

    project.configuration.annotationQuestions = questions;
    await this.projectRepository.save(project);

    return {
      success: true,
      data: {
        question: questions[questionIndex],
      },
    };
  }

  async deleteQuestion(projectId: string, questionId: string) {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const questions = project.configuration.annotationQuestions || [];
    const questionIndex = questions.findIndex((q) => q.id === questionId);

    if (questionIndex === -1) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    // Check if any other questions depend on this one
    const dependentQuestions = questions.filter((q) => q.dependsOn === questionId);
    if (dependentQuestions.length > 0) {
      throw new BadRequestException(
        `Cannot delete question ${questionId} because ${dependentQuestions.length} other question(s) depend on it`,
      );
    }

    // Remove question
    questions.splice(questionIndex, 1);

    project.configuration.annotationQuestions = questions;
    await this.projectRepository.save(project);

    return {
      success: true,
      message: `Question ${questionId} deleted successfully`,
    };
  }

  private validateQuestion(question: any) {
    if (!question.id) {
      throw new BadRequestException('Question ID is required');
    }

    if (!question.question) {
      throw new BadRequestException('Question text is required');
    }

    if (!question.questionType) {
      throw new BadRequestException('Question type is required');
    }

    const validTypes = ['MULTI_SELECT', 'TEXT', 'SINGLE_SELECT', 'NUMBER', 'DATE'];
    if (!validTypes.includes(question.questionType)) {
      throw new BadRequestException(
        `Invalid question type. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    // Validate that multi-select and single-select have options
    if (
      ['MULTI_SELECT', 'SINGLE_SELECT'].includes(question.questionType) &&
      (!question.options || question.options.length === 0)
    ) {
      throw new BadRequestException(
        `${question.questionType} questions must have at least one option`,
      );
    }

    // Validate options if present
    if (question.options) {
      for (const option of question.options) {
        if (!option.id || !option.label || !option.value) {
          throw new BadRequestException('Each option must have id, label, and value');
        }
      }
    }

    return true;
  }

  async getQuestionResponse(taskId: string, questionId: string) {
    // This would be implemented to fetch annotation responses
    // For now, return placeholder
    return {
      success: true,
      data: {
        questionId,
        responses: [],
      },
    };
  }
}
