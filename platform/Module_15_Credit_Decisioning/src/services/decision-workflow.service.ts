import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DecisionWorkflow } from '../entities/decision-workflow.entity';
import { WorkflowStatus, StepType, StepStatus } from '../entities/decision-workflow.entity';

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  decisionType: string;
  entityTypes: string[];
  steps: Array<{
    id: string;
    name: string;
    type: StepType;
    order: number;
    assigneeType: 'role' | 'user' | 'system';
    assigneeValue: string;
    conditions: Record<string, any>;
    actions: Array<{
      type: string;
      parameters: Record<string, any>;
    }>;
    timeoutMinutes: number;
    isRequired: boolean;
    parallelAllowed: boolean;
  }>;
  transitions?: Array<{
    fromStep: string;
    toStep: string;
    condition: string;
    action: string;
  }>;
  isDefault?: boolean;
  autoExecute?: boolean;
  timeoutMinutes?: number;
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  status?: WorkflowStatus;
  steps?: Array<{
    id: string;
    name: string;
    type: StepType;
    order: number;
    assigneeType: 'role' | 'user' | 'system';
    assigneeValue: string;
    conditions: Record<string, any>;
    actions: Array<{
      type: string;
      parameters: Record<string, any>;
    }>;
    timeoutMinutes: number;
    isRequired: boolean;
    parallelAllowed: boolean;
  }>;
  transitions?: Array<{
    fromStep: string;
    toStep: string;
    condition: string;
    action: string;
  }>;
}

@Injectable()
export class DecisionWorkflowService {
  private readonly logger = new Logger(DecisionWorkflowService.name);

  constructor(
    @InjectRepository(DecisionWorkflow)
    private decisionWorkflowRepo: Repository<DecisionWorkflow>,
  ) {}

  /**
   * Create a new workflow
   */
  async createWorkflow(createWorkflowDto: CreateWorkflowDto, createdBy: string): Promise<DecisionWorkflow> {
    this.logger.log(`Creating workflow: ${createWorkflowDto.name}`);

    try {
      const workflow = this.decisionWorkflowRepo.create({
        ...createWorkflowDto,
        status: WorkflowStatus.DRAFT,
        version: '1.0',
        createdBy,
      });

      return await this.decisionWorkflowRepo.save(workflow);
    } catch (error) {
      this.logger.error(`Error creating workflow: ${error.message}`);
      throw new BadRequestException(`Failed to create workflow: ${error.message}`);
    }
  }

  /**
   * Get all workflows
   */
  async getWorkflows(filters?: {
    status?: WorkflowStatus;
    decisionType?: string;
    entityType?: string;
  }): Promise<DecisionWorkflow[]> {
    const query = this.decisionWorkflowRepo.createQueryBuilder('workflow');

    if (filters?.status) {
      query.andWhere('workflow.status = :status', { status: filters.status });
    }
    if (filters?.decisionType) {
      query.andWhere('workflow.decisionType = :decisionType', { decisionType: filters.decisionType });
    }
    if (filters?.entityType) {
      query.andWhere(':entityType = ANY(workflow.entityTypes)', { entityType: filters.entityType });
    }

    return await query
      .orderBy('workflow.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string): Promise<DecisionWorkflow> {
    const workflow = await this.decisionWorkflowRepo.findOne({ where: { id } });
    
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(id: string, updateWorkflowDto: UpdateWorkflowDto, updatedBy: string): Promise<DecisionWorkflow> {
    const workflow = await this.getWorkflow(id);

    try {
      Object.assign(workflow, updateWorkflowDto, { updatedBy });

      return await this.decisionWorkflowRepo.save(workflow);
    } catch (error) {
      this.logger.error(`Error updating workflow: ${error.message}`);
      throw new BadRequestException(`Failed to update workflow: ${error.message}`);
    }
  }

  /**
   * Activate a workflow
   */
  async activateWorkflow(id: string, activatedBy: string): Promise<DecisionWorkflow> {
    const workflow = await this.getWorkflow(id);

    workflow.status = WorkflowStatus.ACTIVE;
    workflow.updatedBy = activatedBy;

    return await this.decisionWorkflowRepo.save(workflow);
  }

  /**
   * Deactivate a workflow
   */
  async deactivateWorkflow(id: string, deactivatedBy: string): Promise<DecisionWorkflow> {
    const workflow = await this.getWorkflow(id);

    workflow.status = WorkflowStatus.INACTIVE;
    workflow.updatedBy = deactivatedBy;

    return await this.decisionWorkflowRepo.save(workflow);
  }

  /**
   * Get default workflow for decision type
   */
  async getDefaultWorkflow(decisionType: string): Promise<DecisionWorkflow | null> {
    return await this.decisionWorkflowRepo.findOne({
      where: {
        decisionType,
        isDefault: true,
        status: WorkflowStatus.ACTIVE,
      },
    });
  }

  /**
   * Set workflow as default
   */
  async setAsDefault(id: string, updatedBy: string): Promise<DecisionWorkflow> {
    const workflow = await this.getWorkflow(id);

    // Remove default flag from other workflows of same type
    await this.decisionWorkflowRepo.update(
      { decisionType: workflow.decisionType, isDefault: true },
      { isDefault: false }
    );

    workflow.isDefault = true;
    workflow.updatedBy = updatedBy;

    return await this.decisionWorkflowRepo.save(workflow);
  }

  /**
   * Validate workflow configuration
   */
  async validateWorkflow(workflow: DecisionWorkflow): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push('Workflow name is required');
    }

    if (!workflow.decisionType || workflow.decisionType.trim().length === 0) {
      errors.push('Decision type is required');
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      errors.push('At least one step is required');
    }

    // Validate steps
    if (workflow.steps) {
      const stepIds = new Set();
      let hasStartStep = false;
      let hasEndStep = false;

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        
        if (!step.id || step.id.trim().length === 0) {
          errors.push(`Step ${i + 1}: ID is required`);
        }

        if (stepIds.has(step.id)) {
          errors.push(`Step ${i + 1}: Duplicate step ID`);
        }
        stepIds.add(step.id);

        if (step.type === StepType.START) hasStartStep = true;
        if (step.type === StepType.END) hasEndStep = true;

        if (!step.name || step.name.trim().length === 0) {
          errors.push(`Step ${i + 1}: Name is required`);
        }

        if (!step.assigneeType) {
          errors.push(`Step ${i + 1}: Assignee type is required`);
        }

        if (!step.assigneeValue) {
          errors.push(`Step ${i + 1}: Assignee value is required`);
        }
      }

      if (!hasStartStep) {
        errors.push('Workflow must have a start step');
      }

      if (!hasEndStep) {
        errors.push('Workflow must have an end step');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clone a workflow
   */
  async cloneWorkflow(id: string, newName: string, clonedBy: string): Promise<DecisionWorkflow> {
    const originalWorkflow = await this.getWorkflow(id);

    const clonedWorkflow = this.decisionWorkflowRepo.create({
      ...originalWorkflow,
      id: undefined,
      name: newName,
      status: WorkflowStatus.DRAFT,
      version: '1.0',
      isDefault: false,
      createdBy: clonedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.decisionWorkflowRepo.save(clonedWorkflow);
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(): Promise<any> {
    const workflows = await this.decisionWorkflowRepo.find();

    const stats = {
      totalWorkflows: workflows.length,
      statusDistribution: {
        draft: workflows.filter(w => w.status === WorkflowStatus.DRAFT).length,
        active: workflows.filter(w => w.status === WorkflowStatus.ACTIVE).length,
        inactive: workflows.filter(w => w.status === WorkflowStatus.INACTIVE).length,
        archived: workflows.filter(w => w.status === WorkflowStatus.ARCHIVED).length,
      },
      decisionTypeDistribution: workflows.reduce((acc, w) => {
        acc[w.decisionType] = (acc[w.decisionType] || 0) + 1;
        return acc;
      }, {}),
      averageStepsPerWorkflow: workflows.length > 0 
        ? workflows.reduce((sum, w) => sum + (w.steps?.length || 0), 0) / workflows.length 
        : 0,
    };

    return stats;
  }
}
