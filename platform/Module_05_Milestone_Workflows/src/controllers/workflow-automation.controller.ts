import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WorkflowAutomationService } from '../services/workflow-automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateAutomationConfigurationDto,
  ExecuteWorkflowDto,
  AdaptWorkflowDto,
  OptimizeParametersDto,
  GetAnalyticsDto,
} from '../dto/workflow-automation.dto';

@ApiTags('workflow-automation')
@Controller('workflow-automation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowAutomationController {
  constructor(private readonly workflowAutomationService: WorkflowAutomationService) {}

  @Post('workflows/:workflowId/enable-full-automation')
  @Roles('admin', 'workflow_manager')
  @ApiOperation({ summary: 'Enable full automation for a workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Automation enabled successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async enableFullAutomation(@Param('workflowId') workflowId: string) {
    try {
      const configuration = await this.workflowAutomationService.enableFullAutomation(workflowId);
      return {
        success: true,
        data: configuration,
        message: 'Full automation enabled successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to enable full automation',
      };
    }
  }

  @Post('workflows/:workflowId/execute')
  @Roles('admin', 'workflow_manager', 'user')
  @ApiOperation({ summary: 'Execute automated workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Workflow executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid execution context' })
  async executeAutomatedWorkflow(
    @Param('workflowId') workflowId: string,
    @Body(ValidationPipe) executeDto: ExecuteWorkflowDto,
  ) {
    try {
      const result = await this.workflowAutomationService.executeAutomatedWorkflow(
        workflowId,
        executeDto.context,
      );
      return {
        success: true,
        data: result,
        message: 'Workflow executed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to execute workflow',
      };
    }
  }

  @Post('executions/:executionId/learn')
  @Roles('admin', 'workflow_manager')
  @ApiOperation({ summary: 'Learn from workflow execution' })
  @ApiParam({ name: 'executionId', description: 'Execution ID' })
  @ApiResponse({ status: 200, description: 'Learning completed successfully' })
  async learnFromExecution(@Param('executionId') executionId: string) {
    try {
      const insights = await this.workflowAutomationService.learnFromExecution(executionId);
      return {
        success: true,
        data: insights,
        message: 'Learning completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to learn from execution',
      };
    }
  }

  @Put('workflows/:workflowId/adapt')
  @Roles('admin', 'workflow_manager')
  @ApiOperation({ summary: 'Adapt workflow based on learning insights' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Workflow adapted successfully' })
  async adaptWorkflow(
    @Param('workflowId') workflowId: string,
    @Body(ValidationPipe) adaptDto: AdaptWorkflowDto,
  ) {
    try {
      const adaptedWorkflow = await this.workflowAutomationService.adaptWorkflow(
        workflowId,
        adaptDto.insights,
      );
      return {
        success: true,
        data: adaptedWorkflow,
        message: 'Workflow adapted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to adapt workflow',
      };
    }
  }

  @Get('analytics/:tenantId')
  @Roles('admin', 'workflow_manager', 'analyst')
  @ApiOperation({ summary: 'Get automation analytics' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Timeframe for analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAutomationAnalytics(
    @Param('tenantId') tenantId: string,
    @Query() query: GetAnalyticsDto,
  ) {
    try {
      const analytics = await this.workflowAutomationService.getAutomationAnalytics(tenantId);
      return {
        success: true,
        data: analytics,
        message: 'Analytics retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve analytics',
      };
    }
  }

  @Post('parameters/:tenantId/optimize')
  @Roles('admin', 'workflow_manager')
  @ApiOperation({ summary: 'Optimize automation parameters' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Parameters optimized successfully' })
  async optimizeAutomationParameters(
    @Param('tenantId') tenantId: string,
    @Body(ValidationPipe) optimizeDto: OptimizeParametersDto,
  ) {
    try {
      const result = await this.workflowAutomationService.optimizeAutomationParameters(tenantId);
      return {
        success: true,
        data: result,
        message: 'Parameters optimized successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to optimize parameters',
      };
    }
  }

  @Get('workflows/:workflowId/configuration')
  @Roles('admin', 'workflow_manager', 'user')
  @ApiOperation({ summary: 'Get workflow automation configuration' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  async getAutomationConfiguration(@Param('workflowId') workflowId: string) {
    try {
      const configuration = await this.workflowAutomationService.getAutomationConfiguration(workflowId);
      return {
        success: true,
        data: configuration,
        message: 'Configuration retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve configuration',
      };
    }
  }

  @Get('executions/:executionId')
  @Roles('admin', 'workflow_manager', 'user')
  @ApiOperation({ summary: 'Get workflow execution details' })
  @ApiParam({ name: 'executionId', description: 'Execution ID' })
  @ApiResponse({ status: 200, description: 'Execution details retrieved successfully' })
  async getExecutionDetails(@Param('executionId') executionId: string) {
    try {
      const execution = await this.workflowAutomationService.getExecutionData(executionId);
      return {
        success: true,
        data: execution,
        message: 'Execution details retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve execution details',
      };
    }
  }

  @Get('workflows/:workflowId/executions')
  @Roles('admin', 'workflow_manager', 'user')
  @ApiOperation({ summary: 'Get workflow execution history' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of executions to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  @ApiResponse({ status: 200, description: 'Execution history retrieved successfully' })
  async getExecutionHistory(
    @Param('workflowId') workflowId: string,
    @Query() query: { limit?: number; offset?: number },
  ) {
    try {
      const history = await this.workflowAutomationService.getExecutionHistory(workflowId, query);
      return {
        success: true,
        data: history,
        message: 'Execution history retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve execution history',
      };
    }
  }

  @Get('workflows/:workflowId/performance')
  @Roles('admin', 'workflow_manager', 'analyst')
  @ApiOperation({ summary: 'Get workflow performance metrics' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Timeframe for metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getWorkflowPerformance(
    @Param('workflowId') workflowId: string,
    @Query() query: { timeframe?: string },
  ) {
    try {
      const performance = await this.workflowAutomationService.getWorkflowPerformance(workflowId, query);
      return {
        success: true,
        data: performance,
        message: 'Performance metrics retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve performance metrics',
      };
    }
  }

  @Post('workflows/:workflowId/test-automation')
  @Roles('admin', 'workflow_manager')
  @ApiOperation({ summary: 'Test workflow automation' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Automation test completed successfully' })
  async testAutomation(
    @Param('workflowId') workflowId: string,
    @Body(ValidationPipe) testDto: { testContext: any },
  ) {
    try {
      const testResult = await this.workflowAutomationService.testAutomation(workflowId, testDto.testContext);
      return {
        success: true,
        data: testResult,
        message: 'Automation test completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to test automation',
      };
    }
  }

  @Get('tenants/:tenantId/automation-status')
  @Roles('admin', 'workflow_manager')
  @ApiOperation({ summary: 'Get tenant automation status' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Automation status retrieved successfully' })
  async getTenantAutomationStatus(@Param('tenantId') tenantId: string) {
    try {
      const status = await this.workflowAutomationService.getTenantAutomationStatus(tenantId);
      return {
        success: true,
        data: status,
        message: 'Automation status retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve automation status',
      };
    }
  }

  @Post('workflows/:workflowId/disable-automation')
  @Roles('admin', 'workflow_manager')
  @ApiOperation({ summary: 'Disable workflow automation' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Automation disabled successfully' })
  async disableAutomation(@Param('workflowId') workflowId: string) {
    try {
      const result = await this.workflowAutomationService.disableAutomation(workflowId);
      return {
        success: true,
        data: result,
        message: 'Automation disabled successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to disable automation',
      };
    }
  }
}
