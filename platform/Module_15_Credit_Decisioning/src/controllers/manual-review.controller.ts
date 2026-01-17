import { Controller, Post, Get, Put, Body, Param, Query } from '@nestjs/common';
import { ManualReviewService } from '../services/manual-review.service';
import { CreateManualReviewDto, UpdateManualReviewDto } from '../dto/create-manual-review.dto';

@Controller('manual-reviews')
export class ManualReviewController {
  constructor(private readonly manualReviewService: ManualReviewService) {}

  @Post()
  async createManualReview(@Body() createManualReviewDto: CreateManualReviewDto) {
    return this.manualReviewService.createManualReview(createManualReviewDto, 'system');
  }

  @Get(':id')
  async getManualReview(@Param('id') id: string) {
    return this.manualReviewService.getManualReview(id);
  }

  @Get('reviewer/:reviewerId')
  async getReviewsByReviewer(
    @Param('reviewerId') reviewerId: string,
    @Query() filters: any,
  ) {
    return this.manualReviewService.getReviewsByReviewer(reviewerId, filters);
  }

  @Get('decision/:decisionId')
  async getReviewsByDecision(@Param('decisionId') decisionId: string) {
    return this.manualReviewService.getReviewsByDecision(decisionId);
  }

  @Put(':id/status')
  async updateReviewStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateManualReviewDto,
  ) {
    return this.manualReviewService.updateReviewStatus(id, updateDto, 'system');
  }

  @Put(':id/assign')
  async assignReviewer(
    @Param('id') id: string,
    @Body() body: { reviewerId: string; reviewerRole: string; reviewerName: string },
  ) {
    return this.manualReviewService.assignReviewer(
      id,
      body.reviewerId,
      body.reviewerRole,
      body.reviewerName,
      'system',
    );
  }

  @Post(':id/escalate')
  async escalateReview(
    @Param('id') id: string,
    @Body() body: { escalateTo: string; reason: string },
  ) {
    return this.manualReviewService.escalateReview(id, body.escalateTo, body.reason, 'system');
  }

  @Post(':id/communicate')
  async addCommunication(
    @Param('id') id: string,
    @Body() body: {
      message: string;
      senderId: string;
      senderRole: string;
      recipientId: string;
      recipientRole: string;
      type?: 'note' | 'question' | 'response' | 'escalation';
    },
  ) {
    return this.manualReviewService.addCommunication(
      id,
      body.message,
      body.senderId,
      body.senderRole,
      body.recipientId,
      body.recipientRole,
      body.type,
    );
  }

  @Get('overdue')
  async getOverdueReviews() {
    return this.manualReviewService.getOverdueReviews();
  }

  @Get('stats')
  async getReviewStats(@Query() query: { startDate?: string; endDate?: string }) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.manualReviewService.getReviewStats(startDate, endDate);
  }

  @Get('workload/:reviewerId')
  async getReviewerWorkload(@Param('reviewerId') reviewerId: string) {
    return this.manualReviewService.getReviewerWorkload(reviewerId);
  }
}
