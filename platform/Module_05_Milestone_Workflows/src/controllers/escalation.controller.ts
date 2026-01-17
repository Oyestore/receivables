import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EscalationService } from '../services/escalation.service';
import { CreateEscalationDto } from '../dto/create-escalation.dto';
import { UpdateEscalationDto } from '../dto/update-escalation.dto';
import { MilestoneEscalation } from '../entities/milestone-escalation.entity';
import { EscalationStatus, EscalationSeverity, EscalationType } from '../entities/milestone-escalation.entity';

@ApiTags('escalations')
@Controller('api/v1/escalations')
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new escalation' })
  @ApiResponse({ status: 201, description: 'Escalation created successfully', type: MilestoneEscalation })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createEscalation(@Body() createDto: CreateEscalationDto, @Request() req) {
    return this.escalationService.createEscalation(createDto, req.user?.id || 'system');
  }

  @Get()
  @ApiOperation({ summary: 'Get all escalations with filtering' })
  @ApiResponse({ status: 200, description: 'Escalations retrieved successfully' })
  @ApiQuery({ name: 'milestoneId', required: false, description: 'Filter by milestone ID' })
  @ApiQuery({ name: 'status', required: false, enum: EscalationStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'severity', required: false, enum: EscalationSeverity, description: 'Filter by severity' })
  @ApiQuery({ name: 'type', required: false, enum: EscalationType, description: 'Filter by type' })
  @ApiQuery({ name: 'escalatedTo', required: false, description: 'Filter by escalation target' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAllEscalations(
    @Query('tenantId') tenantId: string,
    @Query('milestoneId') milestoneId?: string,
    @Query('status') status?: EscalationStatus,
    @Query('severity') severity?: EscalationSeverity,
    @Query('type') type?: EscalationType,
    @Query('escalatedTo') escalatedTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.escalationService.findAllEscalations(tenantId, {
      milestoneId,
      status,
      severity,
      type,
      escalatedTo,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific escalation' })
  @ApiResponse({ status: 200, description: 'Escalation retrieved successfully', type: MilestoneEscalation })
  @ApiResponse({ status: 404, description: 'Escalation not found' })
  @ApiParam({ name: 'id', description: 'Escalation ID' })
  async findEscalation(@Param('id') id: string) {
    return this.escalationService.findEscalation(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an escalation' })
  @ApiResponse({ status: 200, description: 'Escalation updated successfully', type: MilestoneEscalation })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Escalation not found' })
  @ApiParam({ name: 'id', description: 'Escalation ID' })
  async updateEscalation(
    @Param('id') id: string,
    @Body() updateDto: UpdateEscalationDto,
    @Request() req,
  ) {
    return this.escalationService.updateEscalation(id, updateDto, req.user?.id || 'system');
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve an escalation' })
  @ApiResponse({ status: 200, description: 'Escalation resolved successfully', type: MilestoneEscalation })
  @ApiResponse({ status: 400, description: 'Cannot resolve escalation' })
  @ApiResponse({ status: 404, description: 'Escalation not found' })
  @ApiParam({ name: 'id', description: 'Escalation ID' })
  async resolveEscalation(
    @Param('id') id: string,
    @Body() resolutionData: any,
    @Request() req,
  ) {
    return this.escalationService.resolveEscalation(id, resolutionData, req.user?.id || 'system');
  }

  @Post(':id/escalate')
  @ApiOperation({ summary: 'Escalate to next level' })
  @ApiResponse({ status: 200, description: 'Escalation escalated successfully', type: MilestoneEscalation })
  @ApiResponse({ status: 400, description: 'Cannot escalate' })
  @ApiResponse({ status: 404, description: 'Escalation not found' })
  @ApiParam({ name: 'id', description: 'Escalation ID' })
  async escalateToNextLevel(
    @Param('id') id: string,
    @Body() escalationData: any,
    @Request() req,
  ) {
    return this.escalationService.escalateToNextLevel(id, escalationData, req.user?.id || 'system');
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an escalation' })
  @ApiResponse({ status: 200, description: 'Escalation acknowledged successfully', type: MilestoneEscalation })
  @ApiResponse({ status: 400, description: 'Cannot acknowledge escalation' })
  @ApiResponse({ status: 404, description: 'Escalation not found' })
  @ApiParam({ name: 'id', description: 'Escalation ID' })
  async acknowledgeEscalation(@Param('id') id: string, @Request() req) {
    return this.escalationService.acknowledgeEscalation(id, req.user?.id || 'system');
  }

  @Post(':id/actions')
  @ApiOperation({ summary: 'Add action to escalation' })
  @ApiResponse({ status: 200, description: 'Action added successfully', type: MilestoneEscalation })
  @ApiResponse({ status: 404, description: 'Escalation not found' })
  @ApiParam({ name: 'id', description: 'Escalation ID' })
  async addEscalationAction(
    @Param('id') id: string,
    @Body() actionData: any,
    @Request() req,
  ) {
    return this.escalationService.addEscalationAction(id, actionData, req.user?.id || 'system');
  }

  @Post(':id/actions/:actionId/complete')
  @ApiOperation({ summary: 'Complete an escalation action' })
  @ApiResponse({ status: 200, description: 'Action completed successfully', type: MilestoneEscalation })
  @ApiResponse({ status: 404, description: 'Action not found' })
  @ApiParam({ name: 'id', description: 'Escalation ID' })
  @ApiParam({ name: 'actionId', description: 'Action ID' })
  async completeEscalationAction(
    @Param('id') id: string,
    @Param('actionId') actionId: string,
    @Body() completionData: any,
    @Request() req,
  ) {
    return this.escalationService.completeEscalationAction(id, actionId, completionData, req.user?.id || 'system');
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get escalation analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for analytics' })
  async getEscalationAnalytics(
    @Query('tenantId') tenantId: string,
    @Query('timeRange') timeRange?: string,
  ) {
    return this.escalationService.getEscalationAnalytics(tenantId, timeRange);
  }

  @Get('analytics/workload/:escalatorId')
  @ApiOperation({ summary: 'Get escalator workload analytics' })
  @ApiResponse({ status: 200, description: 'Workload analytics retrieved successfully' })
  @ApiParam({ name: 'escalatorId', description: 'Escalator ID' })
  async getEscalatorWorkload(@Param('escalatorId') escalatorId: string) {
    return this.escalationService.getEscalatorWorkload(escalatorId);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone an escalation template' })
  @ApiResponse({ status: 201, description: 'Escalation cloned successfully', type: MilestoneEscalation })
  @ApiResponse({ status: 404, description: 'Escalation not found' })
  @ApiParam({ name: 'id', description: 'Escalation ID to clone' })
  async cloneEscalation(
    @Param('id') id: string,
    @Body('targetMilestoneId') targetMilestoneId: string,
    @Body('newTitle') newTitle?: string,
    @Request() req,
  ) {
    const originalEscalation = await this.escalationService.findEscalation(id);
    const clonedDto = {
      milestoneId: targetMilestoneId,
      tenantId: originalEscalation.tenantId,
      title: newTitle || `Cloned from: ${originalEscalation.title}`,
      description: originalEscalation.description,
      escalationType: originalEscalation.escalationType,
      severity: originalEscalation.severity,
      escalatedTo: originalEscalation.escalatedTo,
      reason: originalEscalation.reason,
      context: originalEscalation.context,
      impact: originalEscalation.impact,
      stakeholders: originalEscalation.stakeholders,
      requiredActions: originalEscalation.requiredActions,
      metadata: originalEscalation.metadata,
      notes: `Cloned from escalation ID: ${id}`,
    };
    return this.escalationService.createEscalation(clonedDto, req.user?.id || 'system');
  }

  @Post('bulk-resolve')
  @ApiOperation({ summary: 'Bulk resolve multiple escalations' })
  @ApiResponse({ status: 200, description: 'Bulk resolution completed successfully' })
  async bulkResolve(
    @Body('escalationIds') escalationIds: string[],
    @Body('resolutionData') resolutionData: any,
    @Request() req,
  ) {
    const results = [];
    for (const id of escalationIds) {
      try {
        const result = await this.escalationService.resolveEscalation(id, resolutionData, req.user?.id || 'system');
        results.push({ id, status: 'resolved', success: true, result });
      } catch (error) {
        results.push({ id, status: 'error', success: false, error: error.message });
      }
    }
    return { results, totalProcessed: escalationIds.length, successCount: results.filter(r => r.success).length };
  }

  @Get('dashboard/:userId')
  @ApiOperation({ summary: 'Get user escalation dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserDashboard(@Param('userId') userId: string) {
    const workload = await this.escalationService.getEscalatorWorkload(userId);
    
    // Get recent escalations for this user
    const recentEscalations = await this.escalationService.findAllEscalations(
      'default-tenant', // This would come from user context
      { escalatedTo: userId, page: 1, limit: 10 }
    );

    return {
      workload,
      recentEscalations: recentEscalations.escalations,
      pendingActions: workload.activeEscalations,
      overdueItems: workload.overdueEscalations,
      highSeverityItems: workload.highSeverityEscalations,
    };
  }

  @Post(':id/schedule-follow-up')
  @ApiOperation({ summary: 'Schedule follow-up for escalation' })
  @ApiResponse({ status: 200, description: 'Follow-up scheduled successfully' })
  @ApiResponse({ status: 404, description: 'Escalation not found' })
  @ApiParam({ name: 'id', description: 'Escalation ID' })
  async scheduleFollowUp(
    @Param('id') id: string,
    @Body('followUpDate') followUpDate: Date,
    @Body('followUpNotes') followUpNotes?: string,
    @Request() req,
  ) {
    const escalation = await this.escalationService.findEscalation(id);
    const updateDto = {
      followUpDate,
      followUpNotes,
      followUpRequired: true,
    };
    return this.escalationService.updateEscalation(id, updateDto, req.user?.id || 'system');
  }

  @Get('trends/:timeRange')
  @ApiOperation({ summary: 'Get escalation trends' })
  @ApiResponse({ status: 200, description: 'Trends retrieved successfully' })
  @ApiParam({ name: 'timeRange', description: 'Time range (7d, 30d, 90d, 1y)' })
  async getEscalationTrends(
    @Query('tenantId') tenantId: string,
    @Param('timeRange') timeRange: string,
  ) {
    const analytics = await this.escalationService.getEscalationAnalytics(tenantId, timeRange);
    return {
      trends: analytics.resolutionTrends,
      summary: {
        totalEscalations: analytics.totalEscalations,
        resolvedEscalations: analytics.resolvedEscalations,
        averageResolutionTime: analytics.averageResolutionTime,
        escalationsBySeverity: analytics.escalationsBySeverity,
        escalationsByType: analytics.escalationsByType,
      },
    };
  }

  @Post('auto-escalate')
  @ApiOperation({ summary: 'Auto-escalate based on criteria' })
  @ApiResponse({ status: 200, description: 'Auto-escalation completed successfully' })
  async autoEscalate(
    @Body('criteria') criteria: {
      severity: EscalationSeverity;
      timeThreshold: number; // hours
      milestoneIds?: string[];
    },
    @Request() req,
  ) {
    // This would implement auto-escalation logic based on criteria
    // For now, return a placeholder response
    return {
      message: 'Auto-escalation process initiated',
      criteria,
      processedBy: req.user?.id || 'system',
      timestamp: new Date(),
    };
  }
}
