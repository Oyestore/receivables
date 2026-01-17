import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WorkflowDefinition } from '../entities/workflow-definition.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { WorkflowState } from '../entities/workflow-state.entity';
import { Milestone } from '../entities/milestone.entity';
import { WorkflowInstanceStatus, WorkflowStateStatus } from '../entities/workflow-instance.entity';
import { NotificationService } from './notification.service';
import { VerificationService } from './verification.service';
import { EvidenceService } from './evidence.service';
import { EscalationService } from './escalation.service';

export interface ExecutionContext {
  instanceId: string;
  nodeId: string;
  nodeType: string;
  input: any;
  metadata: any;
  startTime: Date;
  timeout?: number;
  retryCount?: number;
  maxRetries?: number;
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
  nextNodes?: string[];
  completedNodes?: string[];
  failedNodes?: string[];
  metadata?: any;
}

export interface WorkflowExecutionPlan {
  instanceId: string;
  executionSteps: Array<{
    nodeId: string;
    nodeType: string;
    dependencies: string[];
    parallelGroup?: string;
    estimatedDuration: number;
    retryPolicy: {
      maxRetries: number;
      backoffStrategy: 'linear' | 'exponential';
      retryDelay: number;
    };
  }>;
  criticalPath: string[];
  totalEstimatedDuration: number;
}

@Injectable()
export class WorkflowExecutionEngine implements OnModuleInit {
  private readonly logger = new Logger(WorkflowExecutionEngine.name);
  private executionQueue: Map<string, ExecutionContext> = new Map();
  private activeExecutions: Map<string, ExecutionContext> = new Map();
  private executionHistory: Map<string, ExecutionResult[]> = new Map();
  private nodeExecutors: Map<string, (context: ExecutionContext) => Promise<ExecutionResult>> = new Map();

  constructor(
    @InjectRepository(WorkflowDefinition)
    private workflowDefinitionRepository: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance)
    private workflowInstanceRepository: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowState)
    private workflowStateRepository: Repository<WorkflowState>,
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,
    private notificationService: NotificationService,
    private verificationService: VerificationService,
    private evidenceService: EvidenceService,
    private escalationService: EscalationService,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Workflow Execution Engine...');
    await this.initializeNodeExecutors();
    await this.startExecutionProcessor();
    await this.startMonitoringService();
  }

  async executeWorkflow(instanceId: string): Promise<WorkflowInstance> {
    this.logger.log(`Starting workflow execution for instance: ${instanceId}`);

    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
      relations: ['definition'],
    });

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    if (instance.status !== WorkflowInstanceStatus.INITIATED) {
      throw new Error(`Workflow instance must be in INITIATED status. Current: ${instance.status}`);
    }

    // Generate execution plan
    const executionPlan = await this.generateExecutionPlan(instanceId);
    
    // Update instance status
    await this.workflowInstanceRepository.update(instanceId, {
      status: WorkflowInstanceStatus.RUNNING,
      startDate: new Date(),
      lastActivityDate: new Date(),
      executionPlan,
      updatedAt: new Date(),
    });

    // Start execution
    await this.startExecution(instanceId, executionPlan);

    this.logger.log(`Workflow execution started for instance: ${instanceId}`);
    return instance;
  }

  async pauseWorkflow(instanceId: string, reason?: string): Promise<WorkflowInstance> {
    this.logger.log(`Pausing workflow execution for instance: ${instanceId}`);

    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
    });

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    if (instance.status !== WorkflowInstanceStatus.RUNNING) {
      throw new Error(`Workflow instance must be RUNNING to pause. Current: ${instance.status}`);
    }

    // Pause active executions
    this.pauseActiveExecutions(instanceId);

    // Update instance status
    await this.workflowInstanceRepository.update(instanceId, {
      status: WorkflowInstanceStatus.PAUSED,
      pauseReason: reason,
      pausedDate: new Date(),
      updatedAt: new Date(),
    });

    // Send notification
    await this.notificationService.sendInAppNotification({
      userId: instance.initiatedBy,
      title: 'Workflow Paused',
      message: `Workflow ${instance.name} has been paused${reason ? ': ' + reason : ''}`,
      type: 'WORKFLOW_PAUSED',
      data: { instanceId },
    });

    this.logger.log(`Workflow execution paused for instance: ${instanceId}`);
    return instance;
  }

  async resumeWorkflow(instanceId: string): Promise<WorkflowInstance> {
    this.logger.log(`Resuming workflow execution for instance: ${instanceId}`);

    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
    });

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    if (instance.status !== WorkflowInstanceStatus.PAUSED) {
      throw new Error(`Workflow instance must be PAUSED to resume. Current: ${instance.status}`);
    }

    // Resume executions
    await this.resumePausedExecutions(instanceId);

    // Update instance status
    await this.workflowInstanceRepository.update(instanceId, {
      status: WorkflowInstanceStatus.RUNNING,
      resumedDate: new Date(),
      lastActivityDate: new Date(),
      updatedAt: new Date(),
    });

    // Send notification
    await this.notificationService.sendInAppNotification({
      userId: instance.initiatedBy,
      title: 'Workflow Resumed',
      message: `Workflow ${instance.name} has been resumed`,
      type: 'WORKFLOW_RESUMED',
      data: { instanceId },
    });

    this.logger.log(`Workflow execution resumed for instance: ${instanceId}`);
    return instance;
  }

  async cancelWorkflow(instanceId: string, reason: string): Promise<WorkflowInstance> {
    this.logger.log(`Cancelling workflow execution for instance: ${instanceId}`);

    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
    });

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    if (instance.status === WorkflowInstanceStatus.COMPLETED || instance.status === WorkflowInstanceStatus.CANCELLED) {
      throw new Error(`Workflow instance cannot be cancelled in current status: ${instance.status}`);
    }

    // Cancel all active executions
    this.cancelActiveExecutions(instanceId);

    // Update instance status
    await this.workflowInstanceRepository.update(instanceId, {
      status: WorkflowInstanceStatus.CANCELLED,
      endDate: new Date(),
      failureReason: reason,
      cancelledDate: new Date(),
      updatedAt: new Date(),
    });

    // Update states
    await this.workflowStateRepository.update(
      { instanceId, status: WorkflowStateStatus.RUNNING },
      { status: WorkflowStateStatus.CANCELLED, endDate: new Date() }
    );

    // Send notification
    await this.notificationService.sendInAppNotification({
      userId: instance.initiatedBy,
      title: 'Workflow Cancelled',
      message: `Workflow ${instance.name} has been cancelled: ${reason}`,
      type: 'WORKFLOW_CANCELLED',
      data: { instanceId, reason },
    });

    this.logger.log(`Workflow execution cancelled for instance: ${instanceId}`);
    return instance;
  }

  async retryWorkflow(instanceId: string, nodeId?: string): Promise<WorkflowInstance> {
    this.logger.log(`Retrying workflow execution for instance: ${instanceId}`);

    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
    });

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    if (instance.status !== WorkflowInstanceStatus.FAILED) {
      throw new Error(`Workflow instance must be FAILED to retry. Current: ${instance.status}`);
    }

    // Reset retry count and status
    await this.workflowInstanceRepository.update(instanceId, {
      status: WorkflowInstanceStatus.RUNNING,
      retryCount: instance.retryCount + 1,
      lastActivityDate: new Date(),
      updatedAt: new Date(),
    });

    // Reset failed states
    if (nodeId) {
      await this.workflowStateRepository.update(
        { instanceId, nodeId },
        { status: WorkflowStateStatus.PENDING, startDate: null, endDate: null }
      );
    } else {
      await this.workflowStateRepository.update(
        { instanceId, status: WorkflowStateStatus.FAILED },
        { status: WorkflowStateStatus.PENDING, startDate: null, endDate: null }
      );
    }

    // Restart execution
    const executionPlan = instance.executionPlan as WorkflowExecutionPlan;
    await this.startExecution(instanceId, executionPlan);

    this.logger.log(`Workflow execution retry started for instance: ${instanceId}`);
    return instance;
  }

  async getExecutionStatus(instanceId: string): Promise<{
    status: string;
    progress: number;
    activeNodes: string[];
    completedNodes: string[];
    failedNodes: string[];
    estimatedCompletion?: Date;
    currentStep?: string;
    executionHistory: ExecutionResult[];
  }> {
    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
    });

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    const states = await this.workflowStateRepository.find({
      where: { instanceId },
      order: { createdAt: 'ASC' },
    });

    const completedNodes = states.filter(s => s.status === WorkflowStateStatus.COMPLETED).map(s => s.nodeId);
    const failedNodes = states.filter(s => s.status === WorkflowStateStatus.FAILED).map(s => s.nodeId);
    const activeNodes = states.filter(s => s.status === WorkflowStateStatus.RUNNING).map(s => s.nodeId);

    const progress = (completedNodes.length / states.length) * 100;
    const executionHistory = this.executionHistory.get(instanceId) || [];

    // Estimate completion time
    let estimatedCompletion: Date | undefined;
    if (instance.status === WorkflowInstanceStatus.RUNNING && progress > 0) {
      const elapsed = Date.now() - instance.startDate.getTime();
      const totalEstimated = (elapsed / progress) * 100;
      estimatedCompletion = new Date(instance.startDate.getTime() + totalEstimated);
    }

    return {
      status: instance.status,
      progress,
      activeNodes,
      completedNodes,
      failedNodes,
      estimatedCompletion,
      currentStep: activeNodes[0],
      executionHistory,
    };
  }

  async generateExecutionPlan(instanceId: string): Promise<WorkflowExecutionPlan> {
    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
      relations: ['definition'],
    });

    if (!instance || !instance.definition) {
      throw new Error(`Workflow instance or definition not found for instance: ${instanceId}`);
    }

    const workflowStructure = instance.definition.workflowStructure;
    const nodes = workflowStructure.nodes;
    const edges = workflowStructure.edges;

    // Build dependency graph
    const dependencies = new Map<string, string[]>();
    const nodeMap = new Map<string, any>();

    nodes.forEach(node => {
      nodeMap.set(node.id, node);
      dependencies.set(node.id, []);
    });

    edges.forEach(edge => {
      const deps = dependencies.get(edge.to) || [];
      deps.push(edge.from);
      dependencies.set(edge.to, deps);
    });

    // Calculate execution steps
    const executionSteps = [];
    const parallelGroups = new Map<string, string[]>();

    // Identify parallel groups
    nodes.forEach(node => {
      if (node.type === 'parallel') {
        const groupId = `parallel_${node.id}`;
        const outgoingEdges = edges.filter(e => e.from === node.id);
        outgoingEdges.forEach(edge => {
          parallelGroups.set(edge.to, groupId);
        });
      }
    });

    // Create execution steps
    nodes.forEach(node => {
      const step = {
        nodeId: node.id,
        nodeType: node.type,
        dependencies: dependencies.get(node.id) || [],
        parallelGroup: parallelGroups.get(node.id),
        estimatedDuration: this.estimateNodeDuration(node),
        retryPolicy: {
          maxRetries: node.maxRetries || 3,
          backoffStrategy: node.backoffStrategy || 'exponential',
          retryDelay: node.retryDelay || 5000,
        },
      };
      executionSteps.push(step);
    });

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(nodes, edges, dependencies);

    // Calculate total estimated duration
    const totalEstimatedDuration = executionSteps.reduce((sum, step) => sum + step.estimatedDuration, 0);

    return {
      instanceId,
      executionSteps,
      criticalPath,
      totalEstimatedDuration,
    };
  }

  private async initializeNodeExecutors(): Promise<void> {
    // Start node executor
    this.nodeExecutors.set('start', this.executeStartNode.bind(this));
    
    // Task node executor
    this.nodeExecutors.set('task', this.executeTaskNode.bind(this));
    
    // Decision node executor
    this.nodeExecutors.set('decision', this.executeDecisionNode.bind(this));
    
    // Parallel node executor
    this.nodeExecutors.set('parallel', this.executeParallelNode.bind(this));
    
    // Merge node executor
    this.nodeExecutors.set('merge', this.executeMergeNode.bind(this));
    
    // End node executor
    this.nodeExecutors.set('end', this.executeEndNode.bind(this));

    this.logger.log(`Initialized ${this.nodeExecutors.size} node executors`);
  }

  private async startExecutionProcessor(): Promise<void> {
    setInterval(async () => {
      await this.processExecutionQueue();
    }, 1000); // Process every second
  }

  private async startMonitoringService(): Promise<void> {
    setInterval(async () => {
      await this.monitorActiveExecutions();
      await this.checkTimeouts();
      await this.updateProgress();
    }, 5000); // Monitor every 5 seconds
  }

  private async startExecution(instanceId: string, executionPlan: WorkflowExecutionPlan): Promise<void> {
    // Find start nodes
    const startNodes = executionPlan.executionSteps.filter(step => step.dependencies.length === 0);
    
    for (const startNode of startNodes) {
      const context: ExecutionContext = {
        instanceId,
        nodeId: startNode.nodeId,
        nodeType: startNode.nodeType,
        input: {},
        metadata: {},
        startTime: new Date(),
        retryCount: 0,
        maxRetries: startNode.retryPolicy.maxRetries,
      };
      
      this.executionQueue.set(`${instanceId}_${startNode.nodeId}`, context);
    }
  }

  private async processExecutionQueue(): Promise<void> {
    const queueArray = Array.from(this.executionQueue.entries());
    
    for (const [key, context] of queueArray) {
      if (this.activeExecutions.has(key)) {
        continue; // Already executing
      }

      // Check if dependencies are satisfied
      const dependenciesSatisfied = await this.checkDependencies(context);
      if (!dependenciesSatisfied) {
        continue;
      }

      // Start execution
      this.activeExecutions.set(key, context);
      this.executionQueue.delete(key);

      // Execute node
      this.executeNode(context).catch(error => {
        this.logger.error(`Error executing node ${context.nodeId}:`, error);
        this.handleExecutionError(context, error);
      });
    }
  }

  private async executeNode(context: ExecutionContext): Promise<void> {
    const startTime = Date.now();
    let result: ExecutionResult;

    try {
      // Create workflow state
      await this.createWorkflowState(context);

      // Get node executor
      const executor = this.nodeExecutors.get(context.nodeType);
      if (!executor) {
        throw new Error(`No executor found for node type: ${context.nodeType}`);
      }

      // Execute node
      result = await executor(context);
      
      // Update workflow state
      await this.updateWorkflowState(context, result);

      // Queue next nodes
      if (result.success && result.nextNodes) {
        for (const nextNodeId of result.nextNodes) {
          const nextContext: ExecutionContext = {
            ...context,
            nodeId: nextNodeId,
            input: result.output,
            startTime: new Date(),
            retryCount: 0,
          };
          
          this.executionQueue.set(`${context.instanceId}_${nextNodeId}`, nextContext);
        }
      }

      // Check if workflow is complete
      await this.checkWorkflowCompletion(context.instanceId);

    } catch (error) {
      result = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
      
      await this.handleExecutionError(context, error);
    }

    // Record execution history
    const history = this.executionHistory.get(context.instanceId) || [];
    history.push(result);
    this.executionHistory.set(context.instanceId, history);

    // Remove from active executions
    this.activeExecutions.delete(`${context.instanceId}_${context.nodeId}`);
  }

  private async executeStartNode(context: ExecutionContext): Promise<ExecutionResult> {
    this.logger.log(`Executing start node: ${context.nodeId}`);
    
    // Start nodes simply pass through and trigger next nodes
    const nextNodes = await this.getNextNodes(context.instanceId, context.nodeId);
    
    return {
      success: true,
      output: { started: true, timestamp: new Date() },
      duration: 0,
      nextNodes,
      completedNodes: [context.nodeId],
    };
  }

  private async executeTaskNode(context: ExecutionContext): Promise<ExecutionResult> {
    this.logger.log(`Executing task node: ${context.nodeId}`);
    
    const startTime = Date.now();
    
    // Get task configuration
    const taskConfig = await this.getNodeConfiguration(context.instanceId, context.nodeId);
    
    // Execute task based on configuration
    let output: any;
    
    switch (taskConfig.taskType) {
      case 'verification':
        output = await this.executeVerificationTask(context, taskConfig);
        break;
      case 'evidence_collection':
        output = await this.executeEvidenceCollectionTask(context, taskConfig);
        break;
      case 'escalation':
        output = await this.executeEscalationTask(context, taskConfig);
        break;
      case 'notification':
        output = await this.executeNotificationTask(context, taskConfig);
        break;
      case 'approval':
        output = await this.executeApprovalTask(context, taskConfig);
        break;
      default:
        output = await this.executeGenericTask(context, taskConfig);
    }
    
    const nextNodes = await this.getNextNodes(context.instanceId, context.nodeId);
    
    return {
      success: true,
      output,
      duration: Date.now() - startTime,
      nextNodes,
      completedNodes: [context.nodeId],
    };
  }

  private async executeDecisionNode(context: ExecutionContext): Promise<ExecutionResult> {
    this.logger.log(`Executing decision node: ${context.nodeId}`);
    
    const startTime = Date.now();
    const decisionConfig = await this.getNodeConfiguration(context.instanceId, context.nodeId);
    
    // Evaluate decision conditions
    const condition = decisionConfig.condition;
    const result = this.evaluateCondition(condition, context.input);
    
    // Get next nodes based on decision
    const nextNodes = await this.getNextNodesByCondition(context.instanceId, context.nodeId, result);
    
    return {
      success: true,
      output: { decision: result, condition },
      duration: Date.now() - startTime,
      nextNodes,
      completedNodes: [context.nodeId],
    };
  }

  private async executeParallelNode(context: ExecutionContext): Promise<ExecutionResult> {
    this.logger.log(`Executing parallel node: ${context.nodeId}`);
    
    const startTime = Date.now();
    
    // Parallel nodes trigger multiple branches simultaneously
    const nextNodes = await this.getNextNodes(context.instanceId, context.nodeId);
    
    return {
      success: true,
      output: { parallel: true, branches: nextNodes.length },
      duration: Date.now() - startTime,
      nextNodes,
      completedNodes: [context.nodeId],
    };
  }

  private async executeMergeNode(context: ExecutionContext): Promise<ExecutionResult> {
    this.logger.log(`Executing merge node: ${context.nodeId}`);
    
    const startTime = Date.now();
    
    // Merge nodes wait for all incoming branches to complete
    const incomingNodes = await this.getIncomingNodes(context.instanceId, context.nodeId);
    const completedIncoming = await this.checkIncomingNodesCompleted(context.instanceId, incomingNodes);
    
    if (!completedIncoming) {
      // Not all incoming nodes completed, wait
      this.executionQueue.set(`${context.instanceId}_${context.nodeId}`, context);
      return {
        success: true,
        output: { waiting: true },
        duration: Date.now() - startTime,
      };
    }
    
    const nextNodes = await this.getNextNodes(context.instanceId, context.nodeId);
    
    return {
      success: true,
      output: { merged: true },
      duration: Date.now() - startTime,
      nextNodes,
      completedNodes: [context.nodeId],
    };
  }

  private async executeEndNode(context: ExecutionContext): Promise<ExecutionResult> {
    this.logger.log(`Executing end node: ${context.nodeId}`);
    
    const startTime = Date.now();
    
    // Mark workflow as completed
    await this.workflowInstanceRepository.update(context.instanceId, {
      status: WorkflowInstanceStatus.COMPLETED,
      endDate: new Date(),
      completionPercentage: 100,
      updatedAt: new Date(),
    });
    
    // Send completion notification
    await this.notificationService.sendInAppNotification({
      userId: 'system',
      title: 'Workflow Completed',
      message: `Workflow instance ${context.instanceId} has been completed successfully`,
      type: 'WORKFLOW_COMPLETED',
      data: { instanceId: context.instanceId },
    });
    
    return {
      success: true,
      output: { completed: true, timestamp: new Date() },
      duration: Date.now() - startTime,
      completedNodes: [context.nodeId],
    };
  }

  private async executeVerificationTask(context: ExecutionContext, config: any): Promise<any> {
    // Create verification
    const verification = await this.verificationService.createVerification({
      milestoneId: config.milestoneId,
      verificationType: config.verificationType,
      requiredEvidence: config.requiredEvidence,
      dueDate: config.dueDate,
    }, 'workflow-system');

    return {
      verificationId: verification.id,
      status: verification.status,
      message: 'Verification task completed',
    };
  }

  private async executeEvidenceCollectionTask(context: ExecutionContext, config: any): Promise<any> {
    // Collect evidence
    const evidence = await this.evidenceService.createEvidence({
      milestoneId: config.milestoneId,
      title: config.title,
      description: config.description,
      evidenceType: config.evidenceType,
    }, 'workflow-system');

    return {
      evidenceId: evidence.id,
      status: evidence.status,
      message: 'Evidence collection task completed',
    };
  }

  private async executeEscalationTask(context: ExecutionContext, config: any): Promise<any> {
    // Create escalation
    const escalation = await this.escalationService.createEscalation({
      milestoneId: config.milestoneId,
      title: config.title,
      description: config.description,
      escalationType: config.escalationType,
      severity: config.severity,
    }, 'workflow-system');

    return {
      escalationId: escalation.id,
      status: escalation.status,
      message: 'Escalation task completed',
    };
  }

  private async executeNotificationTask(context: ExecutionContext, config: any): Promise<any> {
    // Send notification
    await this.notificationService.sendEmail({
      to: config.recipients,
      subject: config.subject,
      template: config.template,
      data: config.data,
    });

    return {
      message: 'Notification task completed',
      recipients: config.recipients,
    };
  }

  private async executeApprovalTask(context: ExecutionContext, config: any): Promise<any> {
    // Create approval workflow
    const approval = await this.verificationService.createVerification({
      milestoneId: config.milestoneId,
      verificationType: 'APPROVAL',
      requiredEvidence: config.requiredEvidence,
      dueDate: config.dueDate,
    }, 'workflow-system');

    return {
      approvalId: approval.id,
      status: approval.status,
      message: 'Approval task completed',
    };
  }

  private async executeGenericTask(context: ExecutionContext, config: any): Promise<any> {
    // Execute generic task based on configuration
    this.logger.log(`Executing generic task: ${config.name}`);
    
    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      message: 'Generic task completed',
      taskName: config.name,
    };
  }

  private evaluateCondition(condition: string, input: any): boolean {
    // Simple condition evaluation (in production, use a proper expression parser)
    try {
      // Replace variables in condition with actual values
      let evaluatedCondition = condition;
      Object.keys(input).forEach(key => {
        evaluatedCondition = evaluatedCondition.replace(new RegExp(`\\b${key}\\b`, 'g'), input[key]);
      });
      
      // Evaluate the condition (simplified)
      return eval(evaluatedCondition);
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${condition}`, error);
      return false;
    }
  }

  private async createWorkflowState(context: ExecutionContext): Promise<void> {
    const state = this.workflowStateRepository.create({
      instanceId: context.instanceId,
      nodeId: context.nodeId,
      nodeType: context.nodeType,
      status: WorkflowStateStatus.RUNNING,
      startDate: context.startTime,
      input: context.input,
      metadata: context.metadata,
      isActive: true,
      isDeleted: false,
    });

    await this.workflowStateRepository.save(state);
  }

  private async updateWorkflowState(context: ExecutionContext, result: ExecutionResult): Promise<void> {
    const status = result.success ? WorkflowStateStatus.COMPLETED : WorkflowStateStatus.FAILED;
    
    await this.workflowStateRepository.update(
      { instanceId: context.instanceId, nodeId: context.nodeId },
      {
        status,
        endDate: new Date(),
        output: result.output,
        error: result.error,
        duration: result.duration,
        updatedAt: new Date(),
      }
    );
  }

  private async handleExecutionError(context: ExecutionContext, error: Error): Promise<void> {
    this.logger.error(`Execution error for node ${context.nodeId}:`, error);
    
    // Update state to failed
    await this.workflowStateRepository.update(
      { instanceId: context.instanceId, nodeId: context.nodeId },
      {
        status: WorkflowStateStatus.FAILED,
        endDate: new Date(),
        error: error.message,
        updatedAt: new Date(),
      }
    );

    // Check if should retry
    if (context.retryCount < context.maxRetries) {
      context.retryCount++;
      context.startTime = new Date();
      
      // Add back to queue with delay
      setTimeout(() => {
        this.executionQueue.set(`${context.instanceId}_${context.nodeId}`, context);
      }, 5000 * context.retryCount); // Exponential backoff
      
      this.logger.log(`Retrying node ${context.nodeId} (attempt ${context.retryCount})`);
    } else {
      // Mark workflow as failed
      await this.workflowInstanceRepository.update(context.instanceId, {
        status: WorkflowInstanceStatus.FAILED,
        endDate: new Date(),
        failureReason: `Node ${context.nodeId} failed after ${context.maxRetries} retries: ${error.message}`,
        updatedAt: new Date(),
      });
      
      // Send failure notification
      await this.notificationService.sendInAppNotification({
        userId: 'system',
        title: 'Workflow Failed',
        message: `Workflow instance ${context.instanceId} has failed: ${error.message}`,
        type: 'WORKFLOW_FAILED',
        data: { instanceId: context.instanceId, error: error.message },
      });
    }
  }

  private async checkDependencies(context: ExecutionContext): Promise<boolean> {
    const executionPlan = await this.getExecutionPlan(context.instanceId);
    const step = executionPlan.executionSteps.find(s => s.nodeId === context.nodeId);
    
    if (!step || step.dependencies.length === 0) {
      return true;
    }

    // Check if all dependencies are completed
    for (const depNodeId of step.dependencies) {
      const state = await this.workflowStateRepository.findOne({
        where: { instanceId: context.instanceId, nodeId: depNodeId },
      });
      
      if (!state || state.status !== WorkflowStateStatus.COMPLETED) {
        return false;
      }
    }

    return true;
  }

  private async getNextNodes(instanceId: string, nodeId: string): Promise<string[]> {
    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
      relations: ['definition'],
    });

    if (!instance || !instance.definition) {
      return [];
    }

    const workflowStructure = instance.definition.workflowStructure;
    const edges = workflowStructure.edges;
    
    return edges
      .filter(edge => edge.from === nodeId)
      .map(edge => edge.to);
  }

  private async getNextNodesByCondition(instanceId: string, nodeId: string, conditionResult: boolean): Promise<string[]> {
    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
      relations: ['definition'],
    });

    if (!instance || !instance.definition) {
      return [];
    }

    const workflowStructure = instance.definition.workflowStructure;
    const edges = workflowStructure.edges;
    
    return edges
      .filter(edge => edge.from === nodeId && edge.condition === conditionResult)
      .map(edge => edge.to);
  }

  private async getIncomingNodes(instanceId: string, nodeId: string): Promise<string[]> {
    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
      relations: ['definition'],
    });

    if (!instance || !instance.definition) {
      return [];
    }

    const workflowStructure = instance.definition.workflowStructure;
    const edges = workflowStructure.edges;
    
    return edges
      .filter(edge => edge.to === nodeId)
      .map(edge => edge.from);
  }

  private async checkIncomingNodesCompleted(instanceId: string, incomingNodes: string[]): Promise<boolean> {
    for (const nodeId of incomingNodes) {
      const state = await this.workflowStateRepository.findOne({
        where: { instanceId, nodeId },
      });
      
      if (!state || state.status !== WorkflowStateStatus.COMPLETED) {
        return false;
      }
    }
    
    return true;
  }

  private async getNodeConfiguration(instanceId: string, nodeId: string): Promise<any> {
    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
      relations: ['definition'],
    });

    if (!instance || !instance.definition) {
      return {};
    }

    const workflowStructure = instance.definition.workflowStructure;
    const node = workflowStructure.nodes.find(n => n.id === nodeId);
    
    return node?.data || {};
  }

  private async getExecutionPlan(instanceId: string): Promise<WorkflowExecutionPlan> {
    const instance = await this.workflowInstanceRepository.findOne({
      where: { id: instanceId, isDeleted: false },
    });

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    return instance.executionPlan as WorkflowExecutionPlan;
  }

  private async checkWorkflowCompletion(instanceId: string): Promise<void> {
    const states = await this.workflowStateRepository.find({
      where: { instanceId },
    });

    const allCompleted = states.every(state => 
      state.status === WorkflowStateStatus.COMPLETED || 
      state.status === WorkflowStateStatus.CANCELLED
    );

    if (allCompleted) {
      const hasFailed = states.some(state => state.status === WorkflowStateStatus.FAILED);
      
      if (hasFailed) {
        await this.workflowInstanceRepository.update(instanceId, {
          status: WorkflowInstanceStatus.FAILED,
          endDate: new Date(),
          updatedAt: new Date(),
        });
      } else {
        await this.workflowInstanceRepository.update(instanceId, {
          status: WorkflowInstanceStatus.COMPLETED,
          endDate: new Date(),
          completionPercentage: 100,
          updatedAt: new Date(),
        });
      }
    }
  }

  private pauseActiveExecutions(instanceId: string): void {
    for (const [key, context] of this.activeExecutions) {
      if (context.instanceId === instanceId) {
        this.activeExecutions.delete(key);
        this.executionQueue.set(key, context);
      }
    }
  }

  private async resumePausedExecutions(instanceId: string): Promise<void> {
    // Resuming is handled by the execution processor
    // Paused executions are already in the queue
  }

  private cancelActiveExecutions(instanceId: string): void {
    for (const [key, context] of this.activeExecutions) {
      if (context.instanceId === instanceId) {
        this.activeExecutions.delete(key);
      }
    }
    
    // Also remove from queue
    for (const [key, context] of this.executionQueue) {
      if (context.instanceId === instanceId) {
        this.executionQueue.delete(key);
      }
    }
  }

  private async monitorActiveExecutions(): Promise<void> {
    // Monitor active executions for performance and health
    for (const [key, context] of this.activeExecutions) {
      const duration = Date.now() - context.startTime.getTime();
      
      if (duration > 300000) { // 5 minutes
        this.logger.warn(`Long running execution detected: ${key} (${duration}ms)`);
      }
    }
  }

  private async checkTimeouts(): Promise<void> {
    // Check for timed out executions
    for (const [key, context] of this.activeExecutions) {
      if (context.timeout) {
        const duration = Date.now() - context.startTime.getTime();
        if (duration > context.timeout) {
          this.logger.warn(`Execution timeout: ${key}`);
          await this.handleExecutionError(context, new Error('Execution timeout'));
        }
      }
    }
  }

  private async updateProgress(): Promise<void> {
    // Update workflow progress percentages
    for (const [key, context] of this.activeExecutions) {
      const states = await this.workflowStateRepository.find({
        where: { instanceId: context.instanceId },
      });

      const completedCount = states.filter(s => s.status === WorkflowStateStatus.COMPLETED).length;
      const totalCount = states.length;
      const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

      await this.workflowInstanceRepository.update(context.instanceId, {
        progressPercentage: progress,
        lastActivityDate: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  private estimateNodeDuration(node: any): number {
    // Estimate duration based on node type and configuration
    const baseDurations = {
      start: 1000,
      task: 5000,
      decision: 2000,
      parallel: 1000,
      merge: 1000,
      end: 1000,
    };

    return baseDurations[node.type] || 3000;
  }

  private calculateCriticalPath(nodes: any[], edges: any[], dependencies: Map<string, string[]>): string[] {
    // Simple critical path calculation (in production, use more sophisticated algorithms)
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): void => {
      if (visited.has(nodeId)) return;
      
      visited.add(nodeId);
      path.push(nodeId);

      const outgoingEdges = edges.filter(e => e.from === nodeId);
      for (const edge of outgoingEdges) {
        dfs(edge.to);
      }
    };

    // Find start nodes
    const startNodes = nodes.filter(node => dependencies.get(node.id)?.length === 0);
    
    if (startNodes.length > 0) {
      dfs(startNodes[0].id);
    }

    return path;
  }
}
