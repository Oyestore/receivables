import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowDefinition } from '../entities/workflow-definition.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { WorkflowState } from '../entities/workflow-state.entity';
import { Milestone } from '../entities/milestone.entity';
import { WorkflowDefinitionStatus, WorkflowDefinitionType } from '../entities/workflow-definition.entity';
import { WorkflowInstanceStatus, WorkflowInstancePriority } from '../entities/workflow-instance.entity';
import { WorkflowStateStatus, WorkflowStateType } from '../entities/workflow-state.entity';
import { CreateWorkflowDefinitionDto } from '../dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from '../dto/update-workflow-definition.dto';
import { CreateWorkflowInstanceDto } from '../dto/create-workflow-instance.dto';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let workflowDefinitionRepository: Repository<WorkflowDefinition>;
  let workflowInstanceRepository: Repository<WorkflowInstance>;
  let workflowStateRepository: Repository<WorkflowState>;
  let milestoneRepository: Repository<Milestone>;
  let dataSource: DataSource;

  const mockWorkflowDefinitionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    count: jest.fn(),
  };

  const mockWorkflowInstanceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };

  const mockWorkflowStateRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockMilestoneRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
  };

  const mockDataSource = {
    createQuery: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: getRepositoryToken(WorkflowDefinition),
          useValue: mockWorkflowDefinitionRepository,
        },
        {
          provide: getRepositoryToken(WorkflowInstance),
          useValue: mockWorkflowInstanceRepository,
        },
        {
          provide: getRepositoryToken(WorkflowState),
          useValue: mockWorkflowStateRepository,
        },
        {
          provide: getRepositoryToken(Milestone),
          useValue: mockMilestoneRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    workflowDefinitionRepository = module.get<Repository<WorkflowDefinition>>(
      getRepositoryToken(WorkflowDefinition),
    );
    workflowInstanceRepository = module.get<Repository<WorkflowInstance>>(
      getRepositoryToken(WorkflowInstance),
    );
    workflowStateRepository = module.get<Repository<WorkflowState>>(
      getRepositoryToken(WorkflowState),
    );
    milestoneRepository = module.get<Repository<Milestone>>(getRepositoryToken(Milestone));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkflowDefinition', () => {
    it('should create a workflow definition successfully', async () => {
      const createDto: CreateWorkflowDefinitionDto = {
        name: 'Test Workflow',
        tenantId: 'tenant-1',
        workflowStructure: {
          nodes: [
            { id: 'start', type: 'start', name: 'Start' },
            { id: 'task1', type: 'task', name: 'Task 1' },
            { id: 'end', type: 'end', name: 'End' },
          ],
          edges: [
            { from: 'start', to: 'task1' },
            { from: 'task1', to: 'end' },
          ],
        },
      };

      const expectedDefinition = {
        id: 'def-1',
        ...createDto,
        status: WorkflowDefinitionStatus.DRAFT,
        version: 1,
        usageCount: 0,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMilestoneRepository.findOne.mockResolvedValue(null);
      mockWorkflowDefinitionRepository.create.mockReturnValue(expectedDefinition);
      mockWorkflowDefinitionRepository.save.mockResolvedValue(expectedDefinition);

      const result = await service.createWorkflowDefinition(createDto, 'user-1');

      expect(mockWorkflowDefinitionRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        status: WorkflowDefinitionStatus.DRAFT,
        version: 1,
        usageCount: 0,
      });
      expect(mockWorkflowDefinitionRepository.save).toHaveBeenCalledWith(expectedDefinition);
      expect(result).toEqual(expectedDefinition);
    });

    it('should throw error for invalid workflow structure', async () => {
      const createDto: CreateWorkflowDefinitionDto = {
        name: 'Invalid Workflow',
        tenantId: 'tenant-1',
        workflowStructure: {
          nodes: [],
          edges: [],
        },
      };

      await expect(service.createWorkflowDefinition(createDto, 'user-1'))
        .rejects.toThrow('Workflow structure must contain nodes array');
    });

    it('should throw error for missing start node', async () => {
      const createDto: CreateWorkflowDefinitionDto = {
        name: 'Invalid Workflow',
        tenantId: 'tenant-1',
        workflowStructure: {
          nodes: [
            { id: 'task1', type: 'task', name: 'Task 1' },
            { id: 'end', type: 'end', name: 'End' },
          ],
          edges: [
            { from: 'task1', to: 'end' },
          ],
        },
      };

      await expect(service.createWorkflowDefinition(createDto, 'user-1'))
        .rejects.toThrow('Workflow must have at least one start and one end node');
    });
  });

  describe('updateWorkflowDefinition', () => {
    it('should update a workflow definition successfully', async () => {
      const existingDefinition = {
        id: 'def-1',
        name: 'Old Name',
        version: 1,
      };

      const updateDto: UpdateWorkflowDefinitionDto = {
        name: 'New Name',
        status: WorkflowDefinitionStatus.ACTIVE,
      };

      const expectedDefinition = {
        ...existingDefinition,
        ...updateDto,
        version: 2,
        updatedBy: 'user-1',
      };

      mockWorkflowDefinitionRepository.findOne.mockResolvedValue(existingDefinition);
      mockWorkflowDefinitionRepository.save.mockResolvedValue(expectedDefinition);

      const result = await service.updateWorkflowDefinition('def-1', updateDto, 'user-1');

      expect(mockWorkflowDefinitionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'def-1', isDeleted: false },
      });
      expect(mockWorkflowDefinitionRepository.save).toHaveBeenCalledWith(expectedDefinition);
      expect(result).toEqual(expectedDefinition);
    });

    it('should throw error if workflow definition not found', async () => {
      mockWorkflowDefinitionRepository.findOne.mockResolvedValue(null);

      await expect(service.updateWorkflowDefinition('def-1', {}, 'user-1'))
        .rejects.toThrow('Workflow definition with ID def-1 not found');
    });
  });

  describe('createWorkflowInstance', () => {
    it('should create a workflow instance successfully', async () => {
      const createDto: CreateWorkflowInstanceDto = {
        name: 'Test Instance',
        tenantId: 'tenant-1',
        workflowDefinitionId: 'def-1',
      };

      const workflowDefinition = {
        id: 'def-1',
        status: WorkflowDefinitionStatus.ACTIVE,
        workflowStructure: {
          nodes: [
            { id: 'start', type: 'start' },
            { id: 'task1', type: 'task' },
            { id: 'end', type: 'end' },
          ],
          edges: [],
        },
      };

      const expectedInstance = {
        id: 'inst-1',
        ...createDto,
        status: WorkflowInstanceStatus.INITIATED,
        progressPercentage: 0,
        totalNodes: 3,
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
        initiatedBy: 'user-1',
      };

      mockWorkflowDefinitionRepository.findOne.mockResolvedValue(workflowDefinition);
      mockWorkflowInstanceRepository.create.mockReturnValue(expectedInstance);
      mockWorkflowInstanceRepository.save.mockResolvedValue(expectedInstance);
      mockWorkflowStateRepository.save.mockResolvedValue({});
      mockWorkflowDefinitionRepository.increment.mockResolvedValue({});

      const result = await service.createWorkflowInstance(createDto, 'user-1');

      expect(mockWorkflowInstanceRepository.create).toHaveBeenCalledWith({
        ...createDto,
        initiatedBy: 'user-1',
        status: WorkflowInstanceStatus.INITIATED,
        progressPercentage: 0,
        totalNodes: 3,
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
      expect(result).toEqual(expectedInstance);
    });

    it('should throw error if workflow definition not found', async () => {
      const createDto: CreateWorkflowInstanceDto = {
        name: 'Test Instance',
        tenantId: 'tenant-1',
        workflowDefinitionId: 'def-1',
      };

      mockWorkflowDefinitionRepository.findOne.mockResolvedValue(null);

      await expect(service.createWorkflowInstance(createDto, 'user-1'))
        .rejects.toThrow('Milestone with ID def-1 not found');
    });

    it('should throw error if workflow definition is not active', async () => {
      const createDto: CreateWorkflowInstanceDto = {
        name: 'Test Instance',
        tenantId: 'tenant-1',
        workflowDefinitionId: 'def-1',
      };

      const workflowDefinition = {
        id: 'def-1',
        status: WorkflowDefinitionStatus.DRAFT,
      };

      mockWorkflowDefinitionRepository.findOne.mockResolvedValue(workflowDefinition);

      await expect(service.createWorkflowInstance(createDto, 'user-1'))
        .rejects.toThrow('Workflow definition must be active to create instances');
    });
  });

  describe('executeWorkflow', () => {
    it('should execute a workflow instance successfully', async () => {
      const instance = {
        id: 'inst-1',
        status: WorkflowInstanceStatus.INITIATED,
        workflowDefinitionId: 'def-1',
      };

      const updatedInstance = {
        ...instance,
        status: WorkflowInstanceStatus.RUNNING,
        startDate: new Date(),
        lastActivityDate: new Date(),
      };

      mockWorkflowInstanceRepository.findOne.mockResolvedValue(instance);
      mockWorkflowInstanceRepository.update.mockResolvedValue({});
      mockWorkflowStateRepository.find.mockResolvedValue([]);
      mockWorkflowInstanceRepository.findOne.mockResolvedValue(updatedInstance);

      const result = await service.executeWorkflow('inst-1');

      expect(mockWorkflowInstanceRepository.update).toHaveBeenCalledWith('inst-1', {
        status: WorkflowInstanceStatus.RUNNING,
        startDate: expect.any(Date),
        lastActivityDate: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result.status).toBe(WorkflowInstanceStatus.RUNNING);
    });

    it('should throw error if instance is not in INITIATED status', async () => {
      const instance = {
        id: 'inst-1',
        status: WorkflowInstanceStatus.RUNNING,
      };

      mockWorkflowInstanceRepository.findOne.mockResolvedValue(instance);

      await expect(service.executeWorkflow('inst-1'))
        .rejects.toThrow('Workflow instance must be in INITIATED status to execute');
    });
  });

  describe('pauseWorkflow', () => {
    it('should pause a workflow instance successfully', async () => {
      const instance = {
        id: 'inst-1',
        status: WorkflowInstanceStatus.RUNNING,
      };

      const updatedInstance = {
        ...instance,
        status: WorkflowInstanceStatus.PAUSED,
      };

      mockWorkflowInstanceRepository.findOne.mockResolvedValue(instance);
      mockWorkflowInstanceRepository.update.mockResolvedValue({});
      mockWorkflowInstanceRepository.findOne.mockResolvedValue(updatedInstance);

      const result = await service.pauseWorkflow('inst-1');

      expect(mockWorkflowInstanceRepository.update).toHaveBeenCalledWith('inst-1', {
        status: WorkflowInstanceStatus.PAUSED,
        updatedAt: expect.any(Date),
      });
      expect(result.status).toBe(WorkflowInstanceStatus.PAUSED);
    });

    it('should throw error if instance is not RUNNING', async () => {
      const instance = {
        id: 'inst-1',
        status: WorkflowInstanceStatus.PAUSED,
      };

      mockWorkflowInstanceRepository.findOne.mockResolvedValue(instance);

      await expect(service.pauseWorkflow('inst-1'))
        .rejects.toThrow('Workflow instance must be RUNNING to pause');
    });
  });

  describe('resumeWorkflow', () => {
    it('should resume a workflow instance successfully', async () => {
      const instance = {
        id: 'inst-1',
        status: WorkflowInstanceStatus.PAUSED,
      };

      const updatedInstance = {
        ...instance,
        status: WorkflowInstanceStatus.RUNNING,
      };

      mockWorkflowInstanceRepository.findOne.mockResolvedValue(instance);
      mockWorkflowInstanceRepository.update.mockResolvedValue({});
      mockWorkflowStateRepository.find.mockResolvedValue([]);
      mockWorkflowInstanceRepository.findOne.mockResolvedValue(updatedInstance);

      const result = await service.resumeWorkflow('inst-1');

      expect(mockWorkflowInstanceRepository.update).toHaveBeenCalledWith('inst-1', {
        status: WorkflowInstanceStatus.RUNNING,
        lastActivityDate: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result.status).toBe(WorkflowInstanceStatus.RUNNING);
    });

    it('should throw error if instance is not PAUSED', async () => {
      const instance = {
        id: 'inst-1',
        status: WorkflowInstanceStatus.RUNNING,
      };

      mockWorkflowInstanceRepository.findOne.mockResolvedValue(instance);

      await expect(service.resumeWorkflow('inst-1'))
        .rejects.toThrow('Workflow instance must be PAUSED to resume');
    });
  });

  describe('cancelWorkflow', () => {
    it('should cancel a workflow instance successfully', async () => {
      const instance = {
        id: 'inst-1',
        status: WorkflowInstanceStatus.RUNNING,
      };

      const updatedInstance = {
        ...instance,
        status: WorkflowInstanceStatus.CANCELLED,
        endDate: new Date(),
        failureReason: 'User cancelled',
      };

      mockWorkflowInstanceRepository.findOne.mockResolvedValue(instance);
      mockWorkflowInstanceRepository.update.mockResolvedValue({});
      mockWorkflowStateRepository.update.mockResolvedValue({});
      mockWorkflowInstanceRepository.findOne.mockResolvedValue(updatedInstance);

      const result = await service.cancelWorkflow('inst-1', 'User cancelled');

      expect(mockWorkflowInstanceRepository.update).toHaveBeenCalledWith('inst-1', {
        status: WorkflowInstanceStatus.CANCELLED,
        endDate: expect.any(Date),
        failureReason: 'User cancelled',
        updatedAt: expect.any(Date),
      });
      expect(result.status).toBe(WorkflowInstanceStatus.CANCELLED);
    });

    it('should throw error if instance is already completed', async () => {
      const instance = {
        id: 'inst-1',
        status: WorkflowInstanceStatus.COMPLETED,
      };

      mockWorkflowInstanceRepository.findOne.mockResolvedValue(instance);

      await expect(service.cancelWorkflow('inst-1'))
        .rejects.toThrow('Workflow instance cannot be cancelled in current status');
    });
  });

  describe('getWorkflowAnalytics', () => {
    it('should return workflow analytics successfully', async () => {
      const mockAnalytics = {
        totalDefinitions: 10,
        activeDefinitions: 5,
        totalInstances: 25,
        runningInstances: 3,
        completedInstances: 20,
        failedInstances: 2,
        averageCompletionTime: 120,
        successRate: 80,
      };

      mockWorkflowDefinitionRepository.count
        .mockResolvedValueOnce(10) // totalDefinitions
        .mockResolvedValueOnce(5);  // activeDefinitions

      mockWorkflowInstanceRepository.count
        .mockResolvedValueOnce(25) // totalInstances
        .mockResolvedValueOnce(3)  // runningInstances
        .mockResolvedValueOnce(20) // completedInstances
        .mockResolvedValueOnce(2);  // failedInstances

      mockDataSource.createQuery.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgTime: '120' }),
      });

      const result = await service.getWorkflowAnalytics('tenant-1');

      expect(result).toEqual(mockAnalytics);
      expect(result.successRate).toBe(80); // (20/25) * 100
    });
  });

  describe('validateWorkflowStructure', () => {
    it('should validate correct workflow structure', () => {
      const validStructure = {
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'task1', type: 'task' },
          { id: 'end', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'task1' },
          { from: 'task1', to: 'end' },
        ],
      };

      expect(() => service['validateWorkflowStructure'](validStructure)).not.toThrow();
    });

    it('should throw error for missing nodes', () => {
      const invalidStructure = {
        nodes: [],
        edges: [],
      };

      expect(() => service['validateWorkflowStructure'](invalidStructure))
        .toThrow('Workflow structure must contain nodes array');
    });

    it('should throw error for missing edges', () => {
      const invalidStructure = {
        nodes: [{ id: 'start', type: 'start' }],
        edges: [],
      };

      expect(() => service['validateWorkflowStructure'](invalidStructure))
        .toThrow('Workflow structure must contain edges array');
    });

    it('should throw error for duplicate node IDs', () => {
      const invalidStructure = {
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'start', type: 'task' }, // duplicate ID
        ],
        edges: [],
      };

      expect(() => service['validateWorkflowStructure'](invalidStructure))
        .toThrow('Duplicate node ID: start');
    });

    it('should throw error for invalid edge reference', () => {
      const invalidStructure = {
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'end', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'nonexistent' }, // invalid reference
        ],
      };

      expect(() => service['validateWorkflowStructure'](invalidStructure))
        .toThrow('Edge references non-existent node: nonexistent');
    });

    it('should throw error for missing start node', () => {
      const invalidStructure = {
        nodes: [
          { id: 'task1', type: 'task' },
          { id: 'end', type: 'end' },
        ],
        edges: [
          { from: 'task1', to: 'end' },
        ],
      };

      expect(() => service['validateWorkflowStructure'](invalidStructure))
        .toThrow('Workflow must have at least one start and one end node');
    });

    it('should throw error for missing end node', () => {
      const invalidStructure = {
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'task1', type: 'task' },
        ],
        edges: [
          { from: 'start', to: 'task1' },
        ],
      };

      expect(() => service['validateWorkflowStructure'](invalidStructure))
        .toThrow('Workflow must have at least one start and one end node');
    });
  });
});
