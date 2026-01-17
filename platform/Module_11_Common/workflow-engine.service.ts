import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancingWorkflow } from '../shared/entities/financing-workflow.entity';
import { FinancingWorkflowInstance } from '../shared/entities/financing-workflow-instance.entity';

/**
 * Service for managing workflow execution in the Financing Module
 * 
 * This service provides the core workflow engine functionality, including
 * workflow instantiation, step transitions, condition evaluation, and
 * workflow state management.
 */
@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    @InjectRepository(FinancingWorkflow)
    private readonly workflowRepository: Repository<FinancingWorkflow>,
    @InjectRepository(FinancingWorkflowInstance)
    private readonly workflowInstanceRepository: Repository<FinancingWorkflowInstance>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Starts a new workflow instance for a financing request
   * 
   * @param workflowCode The code of the workflow to instantiate
   * @param financingRequestId The ID of the financing request
   * @param tenantId The ID of the tenant
   * @param userId The ID of the user initiating the workflow
   * @param initialData Optional initial data for the workflow
   * @returns The created workflow instance
   */
  async startWorkflow(
    workflowCode: string,
    financingRequestId: string,
    tenantId: string,
    userId: string,
    initialData?: Record<string, any>,
  ): Promise<FinancingWorkflowInstance> {
    this.logger.log(`Starting workflow ${workflowCode} for financing request ${financingRequestId}`);
    
    // Find the workflow definition
    const workflow = await this.workflowRepository.findOne({
      where: { code: workflowCode, isActive: true, tenantId },
    });
    
    if (!workflow) {
      throw new Error(`Workflow with code ${workflowCode} not found or inactive`);
    }
    
    // Determine the initial step
    const initialStep = workflow.steps.find(step => !step.id.includes('_'));
    
    if (!initialStep) {
      throw new Error(`No initial step found for workflow ${workflowCode}`);
    }
    
    // Create the workflow instance
    const workflowInstance = this.workflowInstanceRepository.create({
      workflowId: workflow.id,
      financingRequestId,
      tenantId,
      currentStepId: initialStep.id,
      currentStepName: initialStep.name,
      status: 'INITIATED',
      startDate: new Date(),
      createdBy: userId,
      updatedBy: userId,
      metadata: initialData || {},
    });
    
    // Determine the initial assignee based on assignment rules
    const assignee = await this.determineAssignee(workflow, initialStep, financingRequestId, tenantId);
    
    if (assignee) {
      workflowInstance.currentAssigneeId = assignee.id;
      workflowInstance.currentAssigneeName = assignee.name;
      workflowInstance.currentAssigneeRole = assignee.role;
    }
    
    // Calculate the due date based on SLA
    if (initialStep.timeoutHours) {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + initialStep.timeoutHours);
      workflowInstance.dueDate = dueDate;
    }
    
    // Initialize step history
    workflowInstance.stepHistory = [{
      stepId: initialStep.id,
      stepName: initialStep.name,
      assigneeId: workflowInstance.currentAssigneeId,
      assigneeName: workflowInstance.currentAssigneeName,
      assigneeRole: workflowInstance.currentAssigneeRole,
      startDate: new Date(),
      endDate: null,
      action: 'INITIATED',
      comments: 'Workflow initiated',
      documents: [],
    }];
    
    // Save and return the workflow instance
    return this.workflowInstanceRepository.save(workflowInstance);
  }

  /**
   * Transitions a workflow instance to the next step based on an action
   * 
   * @param workflowInstanceId The ID of the workflow instance
   * @param action The action to perform
   * @param userId The ID of the user performing the action
   * @param actionData Optional data associated with the action
   * @returns The updated workflow instance
   */
  async transitionWorkflow(
    workflowInstanceId: string,
    action: string,
    userId: string,
    actionData?: {
      comments?: string;
      documents?: string[];
      data?: Record<string, any>;
    },
  ): Promise<FinancingWorkflowInstance> {
    this.logger.log(`Transitioning workflow ${workflowInstanceId} with action ${action}`);
    
    // Find the workflow instance
    const workflowInstance = await this.workflowInstanceRepository.findOne({
      where: { id: workflowInstanceId },
    });
    
    if (!workflowInstance) {
      throw new Error(`Workflow instance with ID ${workflowInstanceId} not found`);
    }
    
    // Find the workflow definition
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowInstance.workflowId },
    });
    
    if (!workflow) {
      throw new Error(`Workflow definition for instance ${workflowInstanceId} not found`);
    }
    
    // Find the current step
    const currentStep = workflow.steps.find(step => step.id === workflowInstance.currentStepId);
    
    if (!currentStep) {
      throw new Error(`Current step ${workflowInstance.currentStepId} not found in workflow definition`);
    }
    
    // Validate the action
    if (!currentStep.actions.includes(action)) {
      throw new Error(`Action ${action} not allowed in current step ${currentStep.id}`);
    }
    
    // Update the step history
    const currentStepHistory = workflowInstance.stepHistory.find(
      history => history.stepId === currentStep.id && !history.endDate
    );
    
    if (currentStepHistory) {
      currentStepHistory.endDate = new Date();
      currentStepHistory.action = action;
      currentStepHistory.comments = actionData?.comments || '';
      currentStepHistory.documents = actionData?.documents || [];
    }
    
    // Determine the next step based on the action and conditions
    const nextStepId = this.determineNextStep(currentStep, action, actionData?.data || {});
    
    if (!nextStepId) {
      throw new Error(`No next step found for action ${action} in step ${currentStep.id}`);
    }
    
    // Check if this is a terminal step (end of workflow)
    if (nextStepId === 'END') {
      workflowInstance.status = 'COMPLETED';
      workflowInstance.endDate = new Date();
      workflowInstance.currentStepId = null;
      workflowInstance.currentStepName = null;
      workflowInstance.currentAssigneeId = null;
      workflowInstance.currentAssigneeName = null;
      workflowInstance.currentAssigneeRole = null;
      workflowInstance.decision = action;
      workflowInstance.decisionDate = new Date();
      workflowInstance.decisionBy = userId;
      workflowInstance.decisionReason = actionData?.comments || '';
      workflowInstance.updatedBy = userId;
      
      return this.workflowInstanceRepository.save(workflowInstance);
    }
    
    // Find the next step
    const nextStep = workflow.steps.find(step => step.id === nextStepId);
    
    if (!nextStep) {
      throw new Error(`Next step ${nextStepId} not found in workflow definition`);
    }
    
    // Update the workflow instance with the next step
    workflowInstance.currentStepId = nextStep.id;
    workflowInstance.currentStepName = nextStep.name;
    workflowInstance.updatedBy = userId;
    
    // Determine the next assignee
    const assignee = await this.determineAssignee(
      workflow, 
      nextStep, 
      workflowInstance.financingRequestId, 
      workflowInstance.tenantId
    );
    
    if (assignee) {
      workflowInstance.currentAssigneeId = assignee.id;
      workflowInstance.currentAssigneeName = assignee.name;
      workflowInstance.currentAssigneeRole = assignee.role;
    } else {
      workflowInstance.currentAssigneeId = null;
      workflowInstance.currentAssigneeName = null;
      workflowInstance.currentAssigneeRole = null;
    }
    
    // Calculate the due date based on SLA
    if (nextStep.timeoutHours) {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + nextStep.timeoutHours);
      workflowInstance.dueDate = dueDate;
    } else {
      workflowInstance.dueDate = null;
    }
    
    // Add the new step to history
    workflowInstance.stepHistory.push({
      stepId: nextStep.id,
      stepName: nextStep.name,
      assigneeId: workflowInstance.currentAssigneeId,
      assigneeName: workflowInstance.currentAssigneeName,
      assigneeRole: workflowInstance.currentAssigneeRole,
      startDate: new Date(),
      endDate: null,
      action: 'STARTED',
      comments: '',
      documents: [],
    });
    
    // Update metadata with action data if provided
    if (actionData?.data) {
      workflowInstance.metadata = {
        ...workflowInstance.metadata,
        ...actionData.data,
      };
    }
    
    // Save and return the updated workflow instance
    return this.workflowInstanceRepository.save(workflowInstance);
  }

  /**
   * Determines the next step based on action and conditions
   * 
   * @param currentStep The current workflow step
   * @param action The action performed
   * @param data The data to evaluate conditions against
   * @returns The ID of the next step
   */
  private determineNextStep(
    currentStep: any,
    action: string,
    data: Record<string, any>,
  ): string {
    // If there's a direct next step mapping for the action, use it
    if (currentStep.nextSteps && currentStep.nextSteps[action]) {
      return currentStep.nextSteps[action];
    }
    
    // If there are conditional next steps, evaluate them
    if (currentStep.nextSteps && currentStep.nextSteps[`${action}_conditions`]) {
      const conditions = currentStep.nextSteps[`${action}_conditions`];
      
      for (const condition of conditions) {
        if (this.evaluateCondition(condition.condition, data)) {
          return condition.nextStep;
        }
      }
    }
    
    // Default to END if no next step is found
    return 'END';
  }

  /**
   * Evaluates a condition against data
   * 
   * @param condition The condition to evaluate
   * @param data The data to evaluate against
   * @returns Boolean indicating if the condition is met
   */
  private evaluateCondition(condition: any, data: Record<string, any>): boolean {
    // Simple implementation for demonstration
    // In a real implementation, this would use a rule engine or expression evaluator
    
    try {
      const { field, operator, value } = condition;
      const fieldValue = this.getNestedValue(data, field);
      
      switch (operator) {
        case 'equals':
          return fieldValue === value;
        case 'notEquals':
          return fieldValue !== value;
        case 'greaterThan':
          return fieldValue > value;
        case 'lessThan':
          return fieldValue < value;
        case 'greaterThanOrEquals':
          return fieldValue >= value;
        case 'lessThanOrEquals':
          return fieldValue <= value;
        case 'contains':
          return String(fieldValue).includes(String(value));
        case 'notContains':
          return !String(fieldValue).includes(String(value));
        case 'in':
          return Array.isArray(value) && value.includes(fieldValue);
        case 'notIn':
          return Array.isArray(value) && !value.includes(fieldValue);
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${error.message}`);
      return false;
    }
  }

  /**
   * Gets a nested value from an object using dot notation
   * 
   * @param obj The object to get the value from
   * @param path The path to the value using dot notation
   * @returns The value at the specified path
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : undefined;
    }, obj);
  }

  /**
   * Determines the assignee for a workflow step
   * 
   * @param workflow The workflow definition
   * @param step The workflow step
   * @param financingRequestId The ID of the financing request
   * @param tenantId The ID of the tenant
   * @returns The assignee information
   */
  private async determineAssignee(
    workflow: FinancingWorkflow,
    step: any,
    financingRequestId: string,
    tenantId: string,
  ): Promise<{ id: string; name: string; role: string } | null> {
    // In a real implementation, this would query user/role services
    // and apply assignment rules based on workload, skills, etc.
    
    // For demonstration purposes, return a placeholder assignee
    return {
      id: 'system-assigned',
      name: 'System Assigned',
      role: step.assigneeRoles && step.assigneeRoles.length > 0 ? step.assigneeRoles[0] : 'DEFAULT',
    };
  }

  /**
   * Gets active workflow instances for a financing request
   * 
   * @param financingRequestId The ID of the financing request
   * @returns Array of active workflow instances
   */
  async getActiveWorkflowInstances(financingRequestId: string): Promise<FinancingWorkflowInstance[]> {
    return this.workflowInstanceRepository.find({
      where: {
        financingRequestId,
        status: 'INITIATED',
      },
    });
  }

  /**
   * Gets all workflow instances for a financing request
   * 
   * @param financingRequestId The ID of the financing request
   * @returns Array of all workflow instances
   */
  async getAllWorkflowInstances(financingRequestId: string): Promise<FinancingWorkflowInstance[]> {
    return this.workflowInstanceRepository.find({
      where: {
        financingRequestId,
      },
      order: {
        startDate: 'DESC',
      },
    });
  }

  /**
   * Gets a workflow instance by ID
   * 
   * @param workflowInstanceId The ID of the workflow instance
   * @returns The workflow instance
   */
  async getWorkflowInstance(workflowInstanceId: string): Promise<FinancingWorkflowInstance> {
    return this.workflowInstanceRepository.findOne({
      where: { id: workflowInstanceId },
    });
  }
}
