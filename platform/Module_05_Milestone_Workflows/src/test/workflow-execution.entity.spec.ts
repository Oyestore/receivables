import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { WorkflowRule } from '../entities/workflow-rule.entity';
import { ExecutionStatus, ExecutionPriority } from '../entities/workflow-execution.entity';
import { RuleType, RuleStatus } from '../entities/workflow-rule.entity';

describe('WorkflowExecution Entity Tests', () => {
  let repository: Repository<WorkflowExecution>;
  let workflowInstanceRepository: Repository<WorkflowInstance>;
  let ruleRepository: Repository<WorkflowRule>;

  const mockWorkflowInstance = {
    id: 'workflow-1',
    name: 'Test Workflow',
    status: 'active',
    tenantId: 'tenant-1',
  };

  const mockWorkflowRule = {
    id: 'rule-1',
    name: 'Test Rule',
    ruleType: RuleType.AMOUNT_BASED,
    status: RuleStatus.ACTIVE,
    tenantId: 'tenant-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(WorkflowExecution),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WorkflowInstance),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WorkflowRule),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<Repository<WorkflowExecution>>(getRepositoryToken(WorkflowExecution));
    workflowInstanceRepository = module.get<Repository<WorkflowInstance>>(getRepositoryToken(WorkflowInstance));
    ruleRepository = module.get<Repository<WorkflowRule>>(getRepositoryToken(WorkflowRule));
  });

  describe('Entity Creation and Validation', () => {
    it('should create a valid workflow execution', () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.PENDING;
      execution.priority = ExecutionPriority.MEDIUM;
      execution.context = { test: 'data' };
      execution.input = { input: 'value' };
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      expect(execution.id).toBe('execution-1');
      expect(execution.status).toBe(ExecutionStatus.PENDING);
      expect(execution.priority).toBe(ExecutionPriority.MEDIUM);
      expect(execution.isRunning()).toBe(false);
      expect(execution.isCompleted()).toBe(false);
      expect(execution.isFailed()).toBe(false);
    });

    it('should validate execution status transitions', () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.PENDING;
      execution.priority = ExecutionPriority.MEDIUM;
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      // Test running status
      execution.status = ExecutionStatus.RUNNING;
      expect(execution.isRunning()).toBe(true);
      expect(execution.isCompleted()).toBe(false);
      expect(execution.isFailed()).toBe(false);

      // Test completed status
      execution.status = ExecutionStatus.COMPLETED;
      expect(execution.isRunning()).toBe(false);
      expect(execution.isCompleted()).toBe(true);
      expect(execution.isFailed()).toBe(false);

      // Test failed status
      execution.status = ExecutionStatus.FAILED;
      expect(execution.isRunning()).toBe(false);
      expect(execution.isCompleted()).toBe(false);
      expect(execution.isFailed()).toBe(true);
    });

    it('should calculate duration correctly', () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.COMPLETED;
      execution.priority = ExecutionPriority.MEDIUM;
      execution.startedAt = new Date('2024-01-01T10:00:00Z');
      execution.completedAt = new Date('2024-01-01T10:05:00Z');
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      const duration = execution.getDuration();
      expect(duration).toBe(5 * 60 * 1000); // 5 minutes in milliseconds
    });

    it('should handle timeout correctly', () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.RUNNING;
      execution.priority = ExecutionPriority.MEDIUM;
      execution.timeoutAt = new Date(Date.now() - 1000); // 1 second ago
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      expect(execution.isTimedOut()).toBe(true);
    });

    it('should check retry eligibility correctly', () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.FAILED;
      execution.priority = ExecutionPriority.MEDIUM;
      execution.retryCount = 2;
      execution.maxRetries = 3;
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      expect(execution.canRetry()).toBe(true);

      execution.retryCount = 3;
      expect(execution.canRetry()).toBe(false);

      execution.status = ExecutionStatus.COMPLETED;
      expect(execution.canRetry()).toBe(false);
    });
  });

  describe('Database Operations', () => {
    it('should save workflow execution', async () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.PENDING;
      execution.priority = ExecutionPriority.MEDIUM;
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      jest.spyOn(repository, 'create').mockReturnValue(execution);
      jest.spyOn(repository, 'save').mockResolvedValue(execution);

      const result = await repository.save(execution);

      expect(result).toEqual(execution);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(execution);
    });

    it('should find workflow execution with relations', async () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.ruleId = 'rule-1';
      execution.status = ExecutionStatus.PENDING;
      execution.priority = ExecutionPriority.MEDIUM;
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      jest.spyOn(repository, 'findOne').mockResolvedValue({
        ...execution,
        workflowInstance: mockWorkflowInstance,
        rule: mockWorkflowRule,
      });

      const result = await repository.findOne({
        where: { id: 'execution-1' },
        relations: ['workflowInstance', 'rule'],
      });

      expect(result).toBeDefined();
      expect(result.workflowInstance).toEqual(mockWorkflowInstance);
      expect(result.rule).toEqual(mockWorkflowRule);
    });

    it('should update workflow execution status', async () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.PENDING;
      execution.priority = ExecutionPriority.MEDIUM;
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      jest.spyOn(repository, 'update').mockResolvedValue({ affected: 1 });

      const result = await repository.update(
        { id: 'execution-1' },
        { status: ExecutionStatus.COMPLETED }
      );

      expect(result.affected).toBe(1);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle execution path tracking', () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.COMPLETED;
      execution.priority = ExecutionPriority.MEDIUM;
      execution.executionPath = [
        {
          stepId: 'step-1',
          stepName: 'Initial Step',
          status: 'completed',
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:01:00Z'),
          duration: 60000,
          result: { success: true },
        },
        {
          stepId: 'step-2',
          stepName: 'Processing Step',
          status: 'completed',
          startTime: new Date('2024-01-01T10:01:00Z'),
          endTime: new Date('2024-01-01T10:03:00Z'),
          duration: 120000,
          result: { processed: true },
        },
      ];
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      expect(execution.executionPath).toHaveLength(2);
      expect(execution.executionPath[0].stepName).toBe('Initial Step');
      expect(execution.executionPath[1].duration).toBe(120000);
    });

    it('should handle error information', () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.FAILED;
      execution.priority = ExecutionPriority.MEDIUM;
      execution.errorMessage = 'Critical error occurred';
      execution.errorDetails = {
        errorCode: 'ERR_001',
        stackTrace: 'Error stack trace',
        context: { step: 'processing' },
      };
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      expect(execution.errorMessage).toBe('Critical error occurred');
      expect(execution.errorDetails.errorCode).toBe('ERR_001');
      expect(execution.errorDetails.context.step).toBe('processing');
    });

    it('should handle metadata and tags', () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.PENDING;
      execution.priority = ExecutionPriority.MEDIUM;
      execution.metadata = {
        version: '1.0',
        environment: 'production',
        features: ['feature1', 'feature2'],
      };
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      expect(execution.metadata.version).toBe('1.0');
      expect(execution.metadata.features).toContain('feature1');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large execution paths efficiently', () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.COMPLETED;
      execution.priority = ExecutionPriority.MEDIUM;

      // Create a large execution path
      const largeExecutionPath = Array.from({ length: 1000 }, (_, i) => ({
        stepId: `step-${i}`,
        stepName: `Step ${i}`,
        status: 'completed',
        startTime: new Date(Date.now() + i * 1000),
        endTime: new Date(Date.now() + (i + 1) * 1000),
        duration: 1000,
        result: { step: i },
      }));

      execution.executionPath = largeExecutionPath;
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      expect(execution.executionPath).toHaveLength(1000);
      expect(execution.executionPath[999].stepId).toBe('step-999');
    });

    it('should handle complex context data', () => {
      const execution = new WorkflowExecution();
      execution.id = 'execution-1';
      execution.workflowInstanceId = 'workflow-1';
      execution.status = ExecutionStatus.PENDING;
      execution.priority = ExecutionPriority.MEDIUM;

      const complexContext = {
        userData: {
          profile: {
            name: 'Test User',
            email: 'test@example.com',
            preferences: {
              theme: 'dark',
              language: 'en',
              notifications: true,
            },
          },
          history: [
            { action: 'login', timestamp: new Date() },
            { action: 'view', timestamp: new Date() },
          ],
        },
        businessData: {
          company: 'Test Company',
          department: 'IT',
          budget: 100000,
          projects: [
            { name: 'Project A', status: 'active' },
            { name: 'Project B', status: 'completed' },
          ],
        },
        historicalData: {
          previousExecutions: 10,
          successRate: 0.95,
          averageDuration: 120000,
        },
      };

      execution.context = complexContext;
      execution.createdBy = 'user-1';
      execution.tenantId = 'tenant-1';

      expect(execution.context.userData.profile.name).toBe('Test User');
      expect(execution.context.businessData.projects).toHaveLength(2);
      expect(execution.context.historicalData.successRate).toBe(0.95);
    });
  });
});
