import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, User } from '@app/common/entities';
import { CommentEntityType } from '@app/common/enums';

export class AddCommentDto {
  userId: string;
  content: string;
  parentCommentId?: string;
}

export class ResolveCommentDto {
  resolvedBy: string;
}

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getTaskComments(taskId: string): Promise<Comment[]> {
    const comments = await this.commentRepository.find({
      where: {
        entityType: CommentEntityType.TASK,
        entityId: taskId,
        parentCommentId: null,
      },
      relations: ['user', 'replies', 'replies.user'],
      order: { createdAt: 'DESC' },
    });
    return comments;
  }

  async addTaskComment(taskId: string, dto: AddCommentDto): Promise<Comment> {
    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    const comment = this.commentRepository.create({
      entityType: CommentEntityType.TASK,
      entityId: taskId,
      userId: dto.userId,
      content: dto.content,
      parentCommentId: dto.parentCommentId ?? null,
    });

    const saved = await this.commentRepository.save(comment);

    // Reload with relations so the caller gets the user object back
    return this.commentRepository.findOne({
      where: { id: saved.id },
      relations: ['user', 'replies', 'replies.user'],
    });
  }

  async resolveComment(commentId: string, dto: ResolveCommentDto): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });
    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    comment.isResolved = true;
    comment.resolvedAt = new Date();
    comment.resolvedBy = dto.resolvedBy;

    return this.commentRepository.save(comment);
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }
    // Only the author can delete their comment
    if (comment.userId !== userId) {
      throw new NotFoundException('Comment not found or not authorized');
    }
    await this.commentRepository.remove(comment);
  }
}
