import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CreditDecisionService } from '../services/credit-decision.service';
import { CreateCreditDecisionDto, UpdateCreditDecisionDto } from '../dto/create-credit-decision.dto';

@Controller('credit-decisions')
export class CreditDecisionController {
  constructor(private readonly creditDecisionService: CreditDecisionService) {}

  @Post('evaluate')
  async evaluateDecision(@Body() createDecisionDto: CreateCreditDecisionDto) {
    return this.creditDecisionService.evaluateDecision(createDecisionDto);
  }

  @Get(':id')
  async getDecision(@Param('id') id: string) {
    return this.creditDecisionService.getDecision(id);
  }

  @Get('entity/:entityId/:entityType')
  async getDecisionsByEntity(
    @Param('entityId') entityId: string,
    @Param('entityType') entityType: string,
  ) {
    return this.creditDecisionService.getDecisionsByEntity(entityId, entityType);
  }

  @Put(':id/status')
  async updateDecisionStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateCreditDecisionDto,
  ) {
    return this.creditDecisionService.updateDecisionStatus(
      id,
      updateDto.status as any,
      updateDto.reviewerId,
      updateDto.reviewNotes,
    );
  }

  @Get('analytics')
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.creditDecisionService.getDecisionAnalytics(start, end);
  }
}
