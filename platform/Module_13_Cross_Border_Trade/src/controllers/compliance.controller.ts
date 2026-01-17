import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ComplianceService } from '../services/compliance.service';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('check')
  async createComplianceCheck(@Body() complianceRequest: any) {
    return this.complianceService.createComplianceCheck(complianceRequest);
  }

  @Get(':id')
  async getComplianceCheck(@Param('id') id: string) {
    return this.complianceService.getComplianceCheck(id);
  }

  @Post(':id/perform')
  async performComplianceCheck(@Param('id') id: string, @Body('checkedBy') checkedBy: string) {
    return this.complianceService.performComplianceCheck(id, checkedBy);
  }

  @Put(':id/status')
  async updateComplianceCheck(@Param('id') id: string, @Body() body: {
    status: string;
    notes?: string;
    updatedBy?: string;
  }) {
    return this.complianceService.updateComplianceCheck(id, body.status, body.notes, body.updatedBy);
  }

  @Get('entity/:entityType/:entityId')
  async getComplianceChecksByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('status') status?: string
  ) {
    return this.complianceService.getComplianceChecksByEntity(entityType, entityId, status as any);
  }

  @Get('type/:complianceType')
  async getComplianceChecksByType(@Param('complianceType') complianceType: string, @Query('status') status?: string) {
    return this.complianceService.getComplianceChecksByType(complianceType as any, status as any);
  }

  @Get('pending')
  async getPendingComplianceChecks() {
    return this.complianceService.getPendingComplianceChecks();
  }

  @Get('overdue')
  async getOverdueComplianceChecks() {
    return this.complianceService.getOverdueComplianceChecks();
  }

  @Get('analytics')
  async getComplianceAnalytics(@Query() query: { startDate?: string; endDate?: string }) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.complianceService.getComplianceAnalytics(startDate, endDate);
  }

  @Get('metrics')
  async getComplianceMetrics() {
    return this.complianceService.getComplianceMetrics();
  }
}
