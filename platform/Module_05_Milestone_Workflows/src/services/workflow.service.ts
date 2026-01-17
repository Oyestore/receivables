import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, IsNull } from 'typeorm';
import { WorkflowDefinition, WorkflowDefinitionStatus, WorkflowDefinitionType } from '../entities/workflow-definition.entity';
import { WorkflowInstance, WorkflowInstanceStatus, WorkflowInstancePriority } from '../entities/workflow-instance.entity';
import { WorkflowState, WorkflowStateStatus, WorkflowStateType } from '../entities/workflow-state.entity';
import { Milestone } from '../entities/milestone.entity';
import { CreateWorkflowDefinitionDto } from '../dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from '../dto/update-workflow-definition.dto';
import { CreateWorkflowInstanceDto } from '../dto/create-workflow-instance.dto';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(WorkflowDefinition)
    private workflowDefinitionRepository: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance)
    private workflowInstanceRepository: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowState)
    private workflowStateRepository: Repository<WorkflowState>,
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,
    private dataSource: DataSource,
  ) {}

  // Workflow Definition Methods
  async createWorkflowDefinition(createDto: CreateWorkflowDefinitionDto, createdBy: string): Promise<WorkflowDefinition> {
    this.logger.log(`Creating workflow definition: ${createDto.name}`);

    // Validate workflow structure
    this.validateWorkflowStructure(createDto.workflowStructure);

    const workflowDefinition = this.workflowDefinitionRepository.create({
      ...createDto,
      createdBy,
      updatedBy: createdBy,
      status: WorkflowDefinitionStatus.DRAFT,
      version: 1,
      usageCount: 0,
    });

    const savedDefinition = await this.workflowDefinitionRepository.save(workflowDefinition);
    this.logger.log(`Workflow definition created: ${savedDefinition.id}`);
    return savedDefinition;
  }

  async updateWorkflowDefinition(id: string, updateDto: UpdateWorkflowDefinitionDto, updatedBy: string): Promise<WorkflowDefinition> {
    this.logger.log(`Updating workflow definition: ${id}`);

    const existingDefinition = await this.findWorkflowDefinition(id);

    // Validate workflow structure if provided
    if (updateDto.workflowStructure) {
      this.validateWorkflowStructure(updateDto.workflowStructure);
    }

    const updatedDefinition = this.workflowDefinitionRepository.merge(existingDefinition, {
      ...updateDto,
      updatedBy,
      version: existingDefinition.version + 1,
    });

    const savedDefinition = await this.workflowDefinitionRepository.save(updatedDefinition);
    this.logger.log(`Workflow definition updated: ${savedDefinition.id}`);
    return savedDefinition;
  }

  async findWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
    const definition = await this.workflowDefinitionRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!definition) {
      throw new NotFoundException(`Workflow definition with ID ${id} not found`);
    }

    return definition;
  }

  async findAllWorkflowDefinitions(tenantId: string, filters?: {
    status?: WorkflowDefinitionStatus;
    type?: WorkflowDefinitionType;
    category?: string;
    isTemplate?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ definitions: WorkflowDefinition[]; total: number }> {
    const {
      status,
      type,
      category,
      isTemplate,
      search,
      page = 1,
      limit = 50,
    } = filters || {};

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (status) where.status = status;
    if (type) where.workflowType = type;
    if (category) where.category = category;
    if (isTemplate !== undefined) where.isTemplate = isTemplate;
    if (search) {
      where.name = Not(IsNull());
    }

    const queryBuilder = this.workflowDefinitionRepository
      .createQueryBuilder('definition')
      .where(where);

    if (search) {
      queryBuilder.andWhere(
        '(definition.name ILIKE :search OR description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [definitions, total] = await queryBuilder
      .orderBy('definition.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { definitions, total };
  }

  async deleteWorkflowDefinition(id: string): Promise<void> {
    this.logger.log(`Deleting workflow definition: ${id}`);

    const definition = await this.findWorkflowDefinition(id);

    // Check if there are active instances
    const activeInstances = await this.workflowInstanceRepository.count({
      where: {
        workflowDefinitionId: id,
        status: Not(WorkflowInstanceStatus.COMPLETED),
        isDeleted: false,
      },
    });

    if (activeInstances > 0) {
      throw new BadRequestException(`Cannot delete workflow definition with ${activeInstances} active instances`);
    }

    await this.workflowDefinitionRepository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    this.logger.log(`Workflow definition deleted: ${id}`);
  }

  // Workflow Instance Methods
  async createWorkflowInstance(createDto: CreateWorkflowInstanceDto, initiatedBy: string): Promise<WorkflowInstance> {
    this.logger.log(`Creating workflow instance: ${createDto.name}`);

    // Validate workflow definition exists and is active
    const workflowDefinition = await this.findWorkflowDefinition(createDto.workflowDefinitionId);
    if (workflowDefinition.status !== WorkflowDefinitionStatus.ACTIVE) {
      throw new BadRequestException('Workflow definition must be active to create instances');
    }

    // Create workflow instance
    const workflowInstance = this.workflowInstanceRepository.create({
      ...createDto,
      initiatedBy,
      status: WorkflowInstanceStatus.INITIATED,
      progressPercentage: 0,
      totalNodes: this.countWorkflowNodes(workflowDefinition.workflowStructure),
      completedNodesCount: 0,
      failedNodesCount: 0,
      retryCount: 0,
      maxRetries: 3,
      executionHistory: [],
      currentNodeStates: {},
      completedNodes: [],
      failedNodes: [],
      errorLog: [],
      notifications: [],
      escalations: [],
      metadata: {},
      isTemplate: false,
      isActive: true,
      isDeleted: false,
    });

    const savedInstance = await this.workflowInstanceRepository.save(workflowInstance);

    // Initialize workflow states
    await this.initializeWorkflowStates(savedInstance.id, workflowDefinition.workflowStructure);

    // Update usage count
    await this.workflowDefinitionRepository.increment(
      { id: workflowDefinition.id },
      'usageCount',
      1,
    );

    this.logger.log(`Workflow instance created: ${savedInstance.id}`);
    return savedInstance;
  }

  async executeWorkflow(instanceId: string): Promise<WorkflowInstance> {
    this.logger.log(`Executing workflow instance: ${instanceId}`);

    const instance = await this.findWorkflowInstance(instanceId);

    if (instance.status !== WorkflowInstanceStatus.INITIATED) {
      throw new BadRequestException(`Workflow instance must be in INITIATED status to execute`);
    }

    // Update instance status
    await this.workflowInstanceRepository.update(instanceId, {
      status: WorkflowInstanceStatus.RUNNING,
      startDate: new Date(),
      lastActivityDate: new Date(),
      updatedAt: new Date(),
    });

    // Start workflow execution
    await this.processWorkflowExecution(instanceId);

    const updatedInstance = await this.findWorkflowInstance(instanceId);
    this.logger.log(`Workflow execution started: ${instanceId}`);
    return updatedInstance;
  }

  async pauseWorkflow(instanceId: string): Promise<WorkflowInstance> {
    this.logger.log(`Pausing workflow instance: ${instanceId}`);

    const instance = await this.findWorkflowInstance(instanceId);

    if (instance.status !== WorkflowInstanceStatus.RUNNING) {
      throw new BadRequestException(`Workflow instance must be RUNNING to pause`);
    }

    await this.workflowInstanceRepository.update(instanceId, {
      status: WorkflowInstanceStatus.PAUSED,
      updatedAt: new Date(),
    });

    const updatedInstance = await this.findWorkflowInstance(instanceId);
    this.logger.log(`Workflow paused: ${instanceId}`);
    return updatedInstance;
  }

  async resumeWorkflow(instanceId: string): Promise<WorkflowInstance> {
    this.logger.log(`Resuming workflow instance: ${instanceId}`);

    const instance = await this.findWorkflowInstance(instanceId);

    if (instance.status !== WorkflowInstanceStatus.PAUSED) {
      throw new BadRequestException(`Workflow instance must be PAUSED to resume`);
    }

    await this.workflowInstanceRepository.update(instanceId, {
      status: WorkflowInstanceStatus.RUNNING,
      lastActivityDate: new Date(),
      updatedAt: new Date(),
    });

    // Continue workflow execution
    await this.processWorkflowExecution(instanceId);

    const updatedInstance = await this.findWorkflowInstance(instanceId);
    this.logger.log(`Workflow resumed: ${instanceId}`);
    return updatedInstance;
  }

  async cancelWorkflow(instanceId: string, reason?: string): Promise<WorkflowInstance> {
    this.logger.log(`Canceling workflow instance: ${instanceId}`);

    const instance = await this.findWorkflowInstance(instanceId);

    if ([WorkflowInstanceStatus.COMPLETED, WorkflowInstanceStatus.CANCELLED].includes(instance.status)) {
      throw new BadRequestException(`Workflow instance cannot be cancelled in current status`);
    }

    await this.workflowInstanceRepository.update(instanceId, {
      status: WorkflowInstanceStatus.CANCELLED,
      endDate: new Date(),
      failureReason: reason || 'Cancelled by user',
      updatedAt: new Date(),
    });

    // Cancel all active states
    await this.workflowStateRepository.update(
      { workflowInstanceId: instanceId, status: WorkflowStateStatus.ACTIVE },
      { status: WorkflowStateStatus.CANCELLED, endDate: new Date() }
    );

    const updatedInstance = await this.findWorkflowInstance(instanceId);
    this.logger.log(`Workflow cancelled: ${instanceId}`);
    return updatedInstance;
  }

  async findWorkflowInstance(id: string): Promise<WorkflowInstance> {
    const instance = await this.workflowInstanceRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['workflowDefinition', 'states'],
    });

    if (!instance) {
      throw new NotFoundException(`Workflow instance with ID ${id} not found`);
    }

    return instance;
  }

  async findAllWorkflowInstances(tenantId: string, filters?: {
    workflowDefinitionId?: string;
    status?: WorkflowInstanceStatus;
    priority?: WorkflowInstancePriority;
    initiatedBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ instances: WorkflowInstance[]; total: number }> {
    const {
      workflowDefinitionId,
      status,
      priority,
      initiatedBy,
      page = 1,
      limit = 50,
    } = filters || {};

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (workflowDefinitionId) where.workflowDefinitionId = workflowDefinitionId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (initiatedBy) where.initiatedBy = initiatedBy;

    const [instances, total] = await this.workflowInstanceRepository.findAndCount({
      where,
      relations: ['workflowDefinition'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { instances, total };
  }

  // Workflow State Methods
  async getWorkflowStates(instanceId: string): Promise<WorkflowState[]> {
    return this.workflowStateRepository.find({
      where: { workflowInstanceId: instanceId, isDeleted: false },
      order: { createdAt: 'ASC' },
    });
  }

  async updateWorkflowState(stateId: string, updates: Partial<WorkflowState>): Promise<WorkflowState> {
    const state = await this.workflowStateRepository.findOne({
      where: { id: stateId, isDeleted: false },
    });

    if (!state) {
      throw new NotFoundException(`Workflow state with ID ${stateId} not found`);
    }

    const updatedState = this.workflowStateRepository.merge(state, updates);
    return this.workflowStateRepository.save(updatedState);
  }

  // Workflow Analytics
  async getWorkflowAnalytics(tenantId: string, timeRange?: string): Promise<{
    totalDefinitions: number;
    activeDefinitions: number;
    totalInstances: number;
    runningInstances: number;
    completedInstances: number;
    failedInstances: number;
    averageCompletionTime: number;
    successRate: number;
  }> {
    const [totalDefinitions, activeDefinitions] = await Promise.all([
      this.workflowDefinitionRepository.count({
        where: { tenantId, isDeleted: false },
      }),
      this.workflowDefinitionRepository.count({
        where: { tenantId, status: WorkflowDefinitionStatus.ACTIVE, isDeleted: false },
      }),
    ]);

    const [totalInstances, runningInstances, completedInstances, failedInstances] = await Promise.all([
      this.workflowInstanceRepository.count({
        where: { tenantId, isDeleted: false },
      }),
      this.workflowInstanceRepository.count({
        where: { tenantId, status: WorkflowInstanceStatus.RUNNING, isDeleted: false },
      }),
      this.workflowInstanceRepository.count({
        where: { tenantId, status: WorkflowInstanceStatus.COMPLETED, isDeleted: false },
      }),
      this.workflowInstanceRepository.count({
        where: { tenantId, status: WorkflowInstanceStatus.FAILED, isDeleted: false },
      }),
    ]);

    const successRate = totalInstances > 0 ? (completedInstances / totalInstances) * 100 : 0;

    // Calculate average completion time
    const avgCompletionTimeResult = await this.workflowInstanceRepository
      .createQueryBuilder('instance')
      .select('AVG(instance.durationMinutes)', 'avgTime')
      .where({
        tenantId,
        status: WorkflowInstanceStatus.COMPLETED,
        isDeleted: false,
        durationMinutes: Not(IsNull()),
      })
      .getRawOne();

    const averageCompletionTime = parseFloat(avgCompletionTimeResult?.avgTime) || 0;

    return {
      totalDefinitions,
      activeDefinitions,
      totalInstances,
      runningInstances,
      completedInstances,
      failedInstances,
      averageCompletionTime,
      successRate,
    };
  }

  // Private Helper Methods
  private validateWorkflowStructure(structure: any): void {
    if (!structure || !structure.nodes || !Array.isArray(structure.nodes)) {
      throw new BadRequestException('Workflow structure must contain nodes array');
    }

    if (!structure.edges || !Array.isArray(structure.edges)) {
      throw new BadRequestException('Workflow structure must contain edges array');
    }

    // Validate nodes
    const nodeIds = new Set();
    for (const node of structure.nodes) {
      if (!node.id || !node.type) {
        throw new BadRequestException('Each node must have id and type');
      }
      if (nodeIds.has(node.id)) {
        throw new BadRequestException(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    // Validate edges
    for (const edge of structure.edges) {
      if (!edge.from || !edge.to) {
        throw new BadRequestException('Each edge must have from and to');
      }
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        throw new BadRequestException(`Edge references non-existent node: ${edge.from} -> ${edge.to}`);
      }
    }

    // Check for at least one start and one end node
    const hasStart = structure.nodes.some(node => node.type === 'start');
    const hasEnd = structure.nodes.some(node => node.type === 'end');

    if (!hasStart || !hasEnd) {
      throw new BadRequestException('Workflow must have at least one start and one end node');
    }
  }

  private countWorkflowNodes(structure: any): number {
    return structure.nodes ? structure.nodes.length : 0;
  }

  private async initializeWorkflowStates(instanceId: string, workflowStructure: any): Promise<void> {
    if (!workflowStructure.nodes) return;

    const states = workflowStructure.nodes.map(node => ({
      workflowInstanceId: instanceId,
      nodeId: node.id,
      nodeName: node.name || node.id,
      status: node.type === 'start' ? WorkflowStateStatus.ACTIVE : WorkflowStateStatus.PENDING,
      stateType: node.type || WorkflowStateType.TASK,
      stateData: node.data || {},
      inputParameters: node.inputParameters || {},
      outputParameters: {},
      executionLog: [],
      startDate: node.type === 'start' ? new Date() : null,
      endDate: null,
      durationSeconds: null,
      attemptCount: 0,
      errorMessage: null,
      errorDetails: null,
      conditions: node.conditions || {},
      transitions: node.transitions || {},
      metadata: node.metadata || {},
      isActive: true,
      isDeleted: false,
    }));

    await this.workflowStateRepository.save(states);
  }

  private async processWorkflowExecution(instanceId: string): Promise<void> {
    const instance = await this.findWorkflowInstance(instanceId);
    const activeStates = await this.workflowStateRepository.find({
      where: {
        workflowInstanceId: instanceId,
        status: WorkflowStateStatus.ACTIVE,
        isDeleted: false,
      },
    });

    for (const state of activeStates) {
      await this.executeWorkflowState(state.id);
    }

    // Check if workflow is complete
    await this.checkWorkflowCompletion(instanceId);
  }

  private async executeWorkflowState(stateId: string): Promise<void> {
    const state = await this.workflowStateRepository.findOne({
      where: { id: stateId, isDeleted: false },
    });

    if (!state || state.status !== WorkflowStateStatus.ACTIVE) {
      return;
    }

    try {
      // Simulate state execution
      const executionResult = await this.simulateStateExecution(state);

      // Update state based on execution result
      if (executionResult.success) {
        await this.workflowStateRepository.update(stateId, {
          status: WorkflowStateStatus.COMPLETED,
          endDate: new Date(),
          durationSeconds: executionResult.duration,
          outputParameters: executionResult.output,
          executionLog: [...(state.executionLog || []), executionResult.log],
        });

        // Trigger next states
        await this.triggerNextStates(state.workflowInstanceId, state.nodeId);
      } else {
        await this.workflowStateRepository.update(stateId, {
          status: WorkflowStateStatus.FAILED,
          endDate: new Date(),
          errorMessage: executionResult.error,
          errorDetails: executionResult.errorDetails,
          attemptCount: state.attemptCount + 1,
          executionLog: [...(state.executionLog || []), executionResult.log],
        });

        // Handle retry logic
        if (state.attemptCount < 3) {
          await this.workflowStateRepository.update(stateId, {
            status: WorkflowStateStatus.ACTIVE,
            startDate: new Date(),
          });
        } else {
          // Mark workflow as failed
          await this.markWorkflowAsFailed(state.workflowInstanceId, `State ${state.nodeId} failed after 3 attempts`);
        }
      }
    } catch (error) {
      this.logger.error(`Error executing workflow state ${stateId}:`, error);
      await this.workflowStateRepository.update(stateId, {
        status: WorkflowStateStatus.FAILED,
        endDate: new Date(),
        errorMessage: error.message,
        errorDetails: error,
      });
    }
  }

  private async simulateStateExecution(state: WorkflowState): Promise<{
    success: boolean;
    duration: number;
    output: any;
    log: any;
    error?: string;
    errorDetails?: any;
  }> {
    // Simulate different execution times based on state type
    const baseDuration = {
      [WorkflowStateType.START]: 1000,
      [WorkflowStateType.TASK]: 5000,
      [WorkflowStateType.DECISION]: 2000,
      [WorkflowStateType.PARALLEL]: 8000,
      [WorkflowStateType.MERGE]: 3000,
      [WorkflowStateType.END]: 500,
      [WorkflowStateType.ERROR]: 1000,
      [WorkflowStateType.CUSTOM]: 4000,
    }[state.stateType] || 3000;

    const duration = baseDuration + Math.random() * 2000; // Add random variation

    // Simulate success/failure (90% success rate)
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        duration: Math.round(duration / 1000),
        output: { processed: true, timestamp: new Date() },
        log: {
          timestamp: new Date(),
          message: `State ${state.nodeId} executed successfully`,
          duration: Math.round(duration / 1000),
        },
      };
    } else {
      return {
        success: false,
        duration: Math.round(duration / 1000),
        output: null,
        log: {
          timestamp: new Date(),
          message: `State ${state.nodeId} execution failed`,
          duration: Math.round(duration / 1000),
        },
        error: 'Simulated execution failure',
        errorDetails: {
          errorCode: 'EXECUTION_FAILED',
          retryable: true,
        },
      };
    }
  }

  private async triggerNextStates(workflowInstanceId: string, completedNodeId: string): Promise<void> {
    const instance = await this.findWorkflowInstance(workflowInstanceId);
    const workflowDefinition = await this.findWorkflowDefinition(instance.workflowDefinitionId);

    // Find edges from completed node
    const outgoingEdges = workflowDefinition.workflowStructure.edges.filter(
      edge => edge.from === completedNodeId
    );

    for (const edge of outgoingEdges) {
      const targetState = await this.workflowStateRepository.findOne({
        where: {
          workflowInstanceId,
          nodeId: edge.to,
          isDeleted: false,
        },
      });

      if (targetState && targetState.status === WorkflowStateStatus.PENDING) {
        // Check if all incoming edges are completed
        const incomingEdges = workflowDefinition.workflowStructure.edges.filter(
          e => e.to === edge.to
        );

        const allIncomingCompleted = await Promise.all(
          incomingEdges.map(async (incomingEdge) => {
            const sourceState = await this.workflowStateRepository.findOne({
              where: {
                workflowInstanceId,
                nodeId: incomingEdge.from,
                isDeleted: false,
              },
            });
            return sourceState?.status === WorkflowStateStatus.COMPLETED;
          })
        );

        if (allIncomingCompleted.every(Boolean)) {
          await this.workflowStateRepository.update(targetState.id, {
            status: WorkflowStateStatus.ACTIVE,
            startDate: new Date(),
          });
        }
      }
    }
  }

  private async checkWorkflowCompletion(instanceId: string): Promise<void> {
    const instance = await this.findWorkflowInstance(instanceId);
    const workflowDefinition = await this.findWorkflowDefinition(instance.workflowDefinitionId);

    const endNode = workflowDefinition.workflowStructure.nodes.find(node => node.type === 'end');
    if (!endNode) return;

    const endState = await this.workflowStateRepository.findOne({
      where: {
        workflowInstanceId: instanceId,
        nodeId: endNode.id,
        isDeleted: false,
      },
    });

    if (endState?.status === WorkflowStateStatus.COMPLETED) {
      await this.workflowInstanceRepository.update(instanceId, {
        status: WorkflowInstanceStatus.COMPLETED,
        endDate: new Date(),
        progressPercentage: 100,
        updatedAt: new Date(),
      });

      this.logger.log(`Workflow completed: ${instanceId}`);
    }
  }

  private async markWorkflowAsFailed(instanceId: string, reason: string): Promise<void> {
    await this.workflowInstanceRepository.update(instanceId, {
      status: WorkflowInstanceStatus.FAILED,
      endDate: new Date(),
      failureReason: reason,
      updatedAt: new Date(),
    });

    // Cancel all active states
    await this.workflowStateRepository.update(
      { workflowInstanceId: instanceId, status: WorkflowStateStatus.ACTIVE },
      { status: WorkflowStateStatus.FAILED, endDate: new Date() }
    );

    this.logger.log(`Workflow failed: ${instanceId} - ${reason}`);
  }
}
