import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { SubmitReviewDto } from './dto/review.dto';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('tasks/:taskId/reviews')
  @ApiOperation({
    summary: 'Submit reviewer score and decision for a task annotation',
    description:
      'Reviewer submits a score + APPROVE/REJECT/REQUEST_REVISION decision. ' +
      'The state management module automatically drives the XState workflow transition.',
  })
  @ApiResponse({ status: 201, description: 'Review submitted, state transition executed' })
  @ApiResponse({ status: 404, description: 'Task or annotation not found' })
  @ApiQuery({ name: 'reviewerId', required: true, description: 'ID of the reviewing user' })
  async submitReview(
    @Param('taskId') taskId: string,
    @Query('reviewerId') reviewerId: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.reviewService.submitReview(taskId, reviewerId, dto);
  }

  @Get('tasks/:taskId/reviews')
  @ApiOperation({ summary: 'Get all reviews for a task' })
  @ApiResponse({ status: 200, description: 'Reviews returned' })
  async getReviews(@Param('taskId') taskId: string) {
    return this.reviewService.getReviews(taskId);
  }

  @Get('reviews/:reviewId')
  @ApiOperation({ summary: 'Get a specific review' })
  @ApiResponse({ status: 200, description: 'Review returned' })
  async getReview(@Param('reviewId') reviewId: string) {
    return this.reviewService.getReview(reviewId);
  }

  @Get('tasks/:taskId/qa-summary')
  @ApiOperation({
    summary: 'Get full QA summary for a task (auto QC + review + current state)',
  })
  @ApiResponse({ status: 200, description: 'QA summary returned' })
  async getQaSummary(@Param('taskId') taskId: string) {
    return this.reviewService.getQaSummary(taskId);
  }
}
