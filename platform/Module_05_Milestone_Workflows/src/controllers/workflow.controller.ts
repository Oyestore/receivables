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
import { WorkflowService } from '../services/workflow.service';
import { CreateWorkflowDefinitionDto } from '../dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from '../dto/update-workflow-definition.dto';
import { CreateWorkflowInstanceDto } from '../dto/create-workflow-instance.dto';
import { WorkflowDefinition } from '../entities/workflow-definition.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { WorkflowDefinitionStatus, WorkflowDefinitionType } from '../entities/workflow-definition.entity';
import { WorkflowInstanceStatus, WorkflowInstancePriority } from '../entities/workflow-instance.entity';

@ApiTags('workflows')
@Controller('api/v1/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  // Workflow Definition endpoints
  @Post('definitions')
  @ApiOperation({ summary: 'Create a new workflow definition' })
  @ApiResponse({ status: 201, description: 'Workflow definition created successfully', type: WorkflowDefinition })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createWorkflowDefinition(@Body() createDto: CreateWorkflowDefinitionDto, @Request() req) {
    return this.workflowService.createWorkflowDefinition(createDto, req.user?.id || 'system');
  }

  @Get('definitions')
  @ApiOperation({ summary: 'Get all workflow definitions with filtering' })
  @ApiResponse({ status: 200, description: 'Workflow definitions retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, enum: WorkflowDefinitionStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, enum: WorkflowDefinitionType, description: 'Filter by type' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'isTemplate', required: false, description: 'Filter by template status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in name and description' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAllWorkflowDefinitions(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: WorkflowDefinitionStatus,
    @Query('type') type?: WorkflowDefinitionType,
    @Query('category') category?: string,
    @Query('isTemplate') isTemplate?: boolean,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.workflowService.findAllWorkflowDefinitions(tenantId, {
      status,
      type,
      category,
      isTemplate,
      search,
      page,
      limit,
    });
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get a specific workflow definition' })
  @ApiResponse({ status: 200, description: 'Workflow definition retrieved successfully', type: WorkflowDefinition })
  @ApiResponse({ status: 404, description: 'Workflow definition not found' })
  @ApiParam({ name: 'id', description: 'Workflow definition ID' })
  async findWorkflowDefinition(@Param('id') id: string) {
    return this.workflowService.findWorkflowDefinition(id);
  }

  @Patch('definitions/:id')
  @ApiOperation({ summary: 'Update a workflow definition' })
  @ApiResponse({ status: 200, description: 'Workflow definition updated successfully', type: WorkflowDefinition })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Workflow definition not found' })
  @ApiParam({ name: 'id', description: 'Workflow definition ID' })
  async updateWorkflowDefinition(
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkflowDefinitionDto,
    @Request() req,
  ) {
    return this.workflowService.updateWorkflowDefinition(id, updateDto, req.user?.id || 'system');
  }

  @Delete('definitions/:id')
  @ApiOperation({ summary: 'Delete a workflow definition' })
  @ApiResponse({ status: 204, description: 'Workflow definition deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete workflow definition with active instances' })
  @ApiResponse({ status: 404, description: 'Workflow definition not found' })
  @ApiParam({ name: 'id', description: 'Workflow definition ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkflowDefinition(@Param('id') id: string) {
    await this.workflowService.deleteWorkflowDefinition(id);
  }

  // Workflow Instance endpoints
  @Post('instances')
  @ApiOperation({ summary: 'Create a new workflow instance' })
  @ApiResponse({ status: 201, description: 'Workflow instance created successfully', type: WorkflowInstance })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createWorkflowInstance(@Body() createDto: CreateWorkflowInstanceDto, @Request() req) {
    return this.workflowService.createWorkflowInstance(createDto, req.user?.id || 'system');
  }

  @Get('instances')
  @ApiOperation({ summary: 'Get all workflow instances with filtering' })
  @ApiResponse({ status: 200, description: 'Workflow instances retrieved successfully' })
  @ApiQuery({ name: 'workflowDefinitionId', required: false, description: 'Filter by workflow definition ID' })
  @ApiQuery({ name: 'status', required: false, enum: WorkflowInstanceStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'priority', required: false, enum: WorkflowInstancePriority, description: 'Filter by priority' })
  @ApiQuery({ name: 'initiatedBy', required: false, description: 'Filter by initiator' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAllWorkflowInstances(
    @Query('tenantId') tenantId: string,
    @Query('workflowDefinitionId') workflowDefinitionId?: string,
    @Query('status') status?: WorkflowInstanceStatus,
    @Query('priority') priority?: WorkflowInstancePriority,
    @Query('initiatedBy') initiatedBy?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.workflowService.findAllWorkflowInstances(tenantId, {
      workflowDefinitionId,
      status,
      priority,
      initiatedBy,
      page,
      limit,
    });
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get a specific workflow instance' })
  @ApiResponse({ status: 200, description: 'Workflow instance retrieved successfully', type: WorkflowInstance })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiParam({ name: 'id', description: 'Workflow instance ID' })
  async findWorkflowInstance(@Param('id') id: string) {
    return this.workflowService.findWorkflowInstance(id);
  }

  @Post('instances/:id/execute')
  @ApiOperation({ summary: 'Execute a workflow instance' })
  @ApiResponse({ status: 200, description: 'Workflow instance execution started', type: WorkflowInstance })
  @ApiResponse({ status: 400, description: 'Cannot execute workflow instance' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiParam({ name: 'id', description: 'Workflow instance ID' })
  async executeWorkflow(@Param('id') id: string) {
    return this.workflowService.executeWorkflow(id);
  }

  @Patch('instances/:id/pause')
  @ApiOperation({ summary: 'Pause a workflow instance' })
  @ApiResponse({ status: 200, description: 'Workflow instance paused', type: WorkflowInstance })
  @ApiResponse({ status: 400, description: 'Cannot pause workflow instance' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiParam({ name: 'id', description: 'Workflow instance ID' })
  async pauseWorkflow(@Param('id') id: string) {
    return this.workflowService.pauseWorkflow(id);
  }

  @Patch('instances/:id/resume')
  @ApiOperation({ summary: 'Resume a workflow instance' })
  @ApiResponse({ status: 200, description: 'Workflow instance resumed', type: WorkflowInstance })
  @ApiResponse({ status: 400, description: 'Cannot resume workflow instance' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiParam({ name: 'id', description: 'Workflow instance ID' })
  async resumeWorkflow(@Param('id') id: string) {
    return this.workflowService.resumeWorkflow(id);
  }

  @Patch('instances/:id/cancel')
  @ApiOperation({ summary: 'Cancel a workflow instance' })
  @ApiResponse({ status: 200, description: 'Workflow instance cancelled', type: WorkflowInstance })
  @ApiResponse({ status: 400, description: 'Cannot cancel workflow instance' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiParam({ name: 'id', description: 'Workflow instance ID' })
  async cancelWorkflow(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.workflowService.cancelWorkflow(id, reason);
  }

  // Workflow State endpoints
  @Get('instances/:id/states')
  @ApiOperation({ summary: 'Get all states for a workflow instance' })
  @ApiResponse({ status: 200, description: 'Workflow states retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiParam({ name: 'id', description: 'Workflow instance ID' })
  async getWorkflowStates(@Param('id') id: string) {
    return this.workflowService.getWorkflowStates(id);
  }

  @Patch('states/:stateId')
  @ApiOperation({ summary: 'Update a workflow state' })
  @ApiResponse({ status: 200, description: 'Workflow state updated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow state not found' })
  @ApiParam({ name: 'stateId', description: 'Workflow state ID' })
  async updateWorkflowState(
    @Param('stateId') stateId: string,
    @Body() updates: any,
  ) {
    return this.workflowService.updateWorkflowState(stateId, updates);
  }

  // Analytics endpoints
  @Get('analytics')
  @ApiOperation({ summary: 'Get workflow analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for analytics' })
  async getWorkflowAnalytics(
    @Query('tenantId') tenantId: string,
    @Query('timeRange') timeRange?: string,
  ) {
    return this.workflowService.getWorkflowAnalytics(tenantId, timeRange);
  }

  // Template endpoints
  @Post('definitions/:id/clone')
  @ApiOperation({ summary: 'Clone a workflow definition as a template' })
  @ApiResponse({ status: 201, description: 'Workflow definition cloned successfully', type: WorkflowDefinition })
  @ApiResponse({ status: 404, description: 'Workflow definition not found' })
  @ApiParam({ name: 'id', description: 'Workflow definition ID to clone' })
  async cloneWorkflowDefinition(
    @Param('id') id: string,
    @Body('newName') newName: string,
    @Request() req,
  ) {
    const originalDefinition = await this.workflowService.findWorkflowDefinition(id);
    const clonedDto = {
      name: newName,
      tenantId: originalDefinition.tenantId,
      description: `Cloned from: ${originalDefinition.name}`,
      workflowType: originalDefinition.workflowType,
      category: originalDefinition.category,
      workflowStructure: originalDefinition.workflowStructure,
      conditions: originalDefinition.conditions,
      actions: originalDefinition.actions,
      metadata: originalDefinition.metadata,
      isTemplate: true,
      templateName: newName,
      templateDescription: `Template cloned from: ${originalDefinition.name}`,
      templateTags: originalDefinition.tags,
    };
    return this.workflowService.createWorkflowDefinition(clonedDto, req.user?.id || 'system');
  }

  @Post('instances/:id/retry')
  @ApiOperation({ summary: 'Retry a failed workflow instance' })
  @ApiResponse({ status: 200, description: 'Workflow instance retry initiated', type: WorkflowInstance })
  @ApiResponse({ status: 400, description: 'Cannot retry workflow instance' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiParam({ name: 'id', description: 'Workflow instance ID' })
  async retryWorkflowInstance(@Param('id') id: string, @Request() req) {
    const instance = await this.workflowService.findWorkflowInstance(id);
    if (instance.status !== WorkflowInstanceStatus.FAILED) {
      throw new Error('Only failed workflow instances can be retried');
    }
    
    // Reset instance status and retry
    await this.workflowService.updateWorkflowState(id, {
      status: 'INITIATED',
      retryCount: (instance.retryCount || 0) + 1,
      failureReason: null,
      errorLog: [],
    });
    
    return this.workflowService.executeWorkflow(id);
  }

  @Get('instances/:id/history')
  @ApiOperation({ summary: 'Get workflow instance execution history' })
  @ApiResponse({ status: 200, description: 'Execution history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiParam({ name: 'id', description: 'Workflow instance ID' })
  async getWorkflowHistory(@Param('id') id: string) {
    const instance = await this.workflowService.findWorkflowInstance(id);
    return instance.executionHistory || [];
  }

  @Post('instances/:id/validate')
  @ApiOperation({ summary: 'Validate workflow instance configuration' })
  @ApiResponse({ status: 200, description: 'Validation completed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  @ApiParam({ name: 'id', description: 'Workflow instance ID' })
  async validateWorkflowInstance(@Param('id') id: string) {
    const instance = await this.workflowService.findWorkflowInstance(id);
    const definition = await this.workflowService.findWorkflowDefinition(instance.workflowDefinitionId);
    
    // Perform validation checks
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    };

    // Validate workflow structure
    if (!definition.workflowStructure || !definition.workflowStructure.nodes) {
      validationResults.isValid = false;
      validationResults.errors.push('Workflow structure is missing or invalid');
    }

    // Validate instance context
    if (!instance.context) {
      validationResults.warnings.push('Instance context is empty');
    }

    // Check for potential issues
    if (instance.retryCount > 2) {
      validationResults.warnings.push('Instance has been retried multiple times');
      validationResults.recommendations.push('Consider reviewing the workflow configuration');
    }

    return validationResults;
  }
}
