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
import { MilestoneService } from '../services/milestone.service';
import { CreateMilestoneDto } from '../dto/create-milestone.dto';
import { UpdateMilestoneDto } from '../dto/update-milestone.dto';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneStatus, MilestoneType, MilestonePriority } from '../entities/milestone.entity';

@ApiTags('milestones')
@Controller('api/v1/milestones')
export class MilestoneController {
  constructor(private readonly milestoneService: MilestoneService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new milestone' })
  @ApiResponse({ status: 201, description: 'Milestone created successfully', type: Milestone })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async create(@Body() createMilestoneDto: CreateMilestoneDto, @Request() req) {
    return this.milestoneService.create(createMilestoneDto, req.user?.id || 'system');
  }

  @Get()
  @ApiOperation({ summary: 'Get all milestones with filtering' })
  @ApiResponse({ status: 200, description: 'Milestones retrieved successfully' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  @ApiQuery({ name: 'workflowId', required: false, description: 'Filter by workflow ID' })
  @ApiQuery({ name: 'status', required: false, enum: MilestoneStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, enum: MilestoneType, description: 'Filter by type' })
  @ApiQuery({ name: 'priority', required: false, enum: MilestonePriority, description: 'Filter by priority' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAll(
    @Query('tenantId') tenantId: string,
    @Query('projectId') projectId?: string,
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: MilestoneStatus,
    @Query('type') type?: MilestoneType,
    @Query('priority') priority?: MilestonePriority,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.milestoneService.findAll(tenantId, {
      projectId,
      workflowId,
      status,
      type,
      priority,
      search,
      page,
      limit,
    });
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get milestone analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  async getAnalytics(
    @Query('tenantId') tenantId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.milestoneService.getMilestoneAnalytics(tenantId, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific milestone' })
  @ApiResponse({ status: 200, description: 'Milestone retrieved successfully', type: Milestone })
  @ApiResponse({ status: 404, description: 'Milestone not found' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  async findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.milestoneService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a milestone' })
  @ApiResponse({ status: 200, description: 'Milestone updated successfully', type: Milestone })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Milestone not found' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  async update(
    @Param('id') id: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
    @Request() req,
  ) {
    return this.milestoneService.update(id, updateMilestoneDto, req.user?.id || 'system');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a milestone' })
  @ApiResponse({ status: 204, description: 'Milestone deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete milestone in progress' })
  @ApiResponse({ status: 404, description: 'Milestone not found' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    await this.milestoneService.remove(id, tenantId);
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Update milestone progress' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully', type: Milestone })
  @ApiResponse({ status: 400, description: 'Invalid progress percentage' })
  @ApiResponse({ status: 404, description: 'Milestone not found' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  async updateProgress(
    @Param('id') id: string,
    @Body('progressPercentage') progressPercentage: number,
    @Request() req,
  ) {
    return this.milestoneService.updateProgress(id, progressPercentage, req.user?.id || 'system');
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Start a milestone' })
  @ApiResponse({ status: 200, description: 'Milestone started successfully', type: Milestone })
  @ApiResponse({ status: 400, description: 'Cannot start milestone' })
  @ApiResponse({ status: 404, description: 'Milestone not found' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  async startMilestone(@Param('id') id: string, @Request() req) {
    return this.milestoneService.startMilestone(id, req.user?.id || 'system');
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete a milestone' })
  @ApiResponse({ status: 200, description: 'Milestone completed successfully', type: Milestone })
  @ApiResponse({ status: 400, description: 'Cannot complete milestone' })
  @ApiResponse({ status: 404, description: 'Milestone not found' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  async completeMilestone(@Param('id') id: string, @Request() req) {
    return this.milestoneService.completeMilestone(id, req.user?.id || 'system');
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a milestone' })
  @ApiResponse({ status: 201, description: 'Milestone duplicated successfully', type: Milestone })
  @ApiResponse({ status: 404, description: 'Milestone not found' })
  @ApiParam({ name: 'id', description: 'Milestone ID to duplicate' })
  async duplicateMilestone(
    @Param('id') id: string,
    @Body('newTitle') newTitle: string,
    @Request() req,
  ) {
    return this.milestoneService.duplicateMilestone(id, newTitle, req.user?.id || 'system');
  }

  @Patch('bulk/status')
  @ApiOperation({ summary: 'Bulk update milestone status' })
  @ApiResponse({ status: 204, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async bulkUpdateStatus(
    @Body('milestoneIds') milestoneIds: string[],
    @Body('status') status: MilestoneStatus,
    @Request() req,
  ) {
    await this.milestoneService.bulkUpdateStatus(milestoneIds, status, req.user?.id || 'system');
  }
}
