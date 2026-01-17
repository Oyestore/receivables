import { Controller, Post, Get, Put, Body, Param, Query } from '@nestjs/common';
import { DecisionWorkflowService } from '../services/decision-workflow.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from '../services/decision-workflow.service';

@Controller('decision-workflows')
export class DecisionWorkflowController {
  constructor(private readonly decisionWorkflowService: DecisionWorkflowService) {}

  @Post()
  async createWorkflow(@Body() createWorkflowDto: CreateWorkflowDto) {
    return this.decisionWorkflowService.createWorkflow(createWorkflowDto, 'system');
  }

  @Get()
  async getWorkflows(@Query() filters: any) {
    return this.decisionWorkflowService.getWorkflows(filters);
  }

  @Get(':id')
  async getWorkflow(@Param('id') id: string) {
    return this.decisionWorkflowService.getWorkflow(id);
  }

  @Put(':id')
  async updateWorkflow(@Param('id') id: string, @Body() updateWorkflowDto: UpdateWorkflowDto) {
    return this.decisionWorkflowService.updateWorkflow(id, updateWorkflowDto, 'system');
  }

  @Post(':id/activate')
  async activateWorkflow(@Param('id') id: string) {
    return this.decisionWorkflowService.activateWorkflow(id, 'system');
  }

  @Post(':id/deactivate')
  async deactivateWorkflow(@Param('id') id: string) {
    return this.decisionWorkflowService.deactivateWorkflow(id, 'system');
  }

  @Get('default/:decisionType')
  async getDefaultWorkflow(@Param('decisionType') decisionType: string) {
    return this.decisionWorkflowService.getDefaultWorkflow(decisionType);
  }

  @Post(':id/set-default')
  async setAsDefault(@Param('id') id: string) {
    return this.decisionWorkflowService.setAsDefault(id, 'system');
  }

  @Post(':id/clone')
  async cloneWorkflow(@Param('id') id: string, @Body() body: { newName: string }) {
    return this.decisionWorkflowService.cloneWorkflow(id, body.newName, 'system');
  }

  @Get('stats')
  async getWorkflowStats() {
    return this.decisionWorkflowService.getWorkflowStats();
  }
}
