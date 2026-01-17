import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscalationService } from '../services/escalation.service';
import { MilestoneEscalation } from '../entities/milestone-escalation.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { Logger } from '@nestjs/common';

describe('EscalationService - Complete Tests', () => {
  let service: EscalationService;
  let escalationRepository: Repository<MilestoneEscalation>;
  let workflowRepository: Repository<WorkflowInstance>;
  let executionRepository: Repository<WorkflowExecution>;

  const mockEscalationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockWorkflowRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockExecutionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscalationService,
        Logger,
        {
          provide: getRepositoryToken(MilestoneEscalation),
          useValue: mockEscalationRepository,
        },
        {
          provide: getRepositoryToken(WorkflowInstance),
          useValue: mockWorkflowRepository,
        },
        {
          provide: getRepositoryToken(WorkflowExecution),
          useValue: mockExecutionRepository,
        },
      ],
    }).compile();

    service = module.get<EscalationService>(EscalationService);
    escalationRepository = module.get<Repository<MilestoneEscalation>>(getRepositoryToken(MilestoneEscalation));
    workflowRepository = module.get<Repository<WorkflowInstance>>(getRepositoryToken(WorkflowInstance));
    executionRepository = module.get<Repository<WorkflowExecution>>(getRepositoryToken(WorkflowExecution));
  });

  describe('CRUD Operations', () => {
    it('should create an escalation', async () => {
      const createEscalationDto = {
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 1,
        reason: 'Test escalation',
        assignedTo: 'user-1',
        priority: 'high',
        dueDate: new Date(),
      };

      const escalation = {
        id: 'escalation-1',
        ...createEscalationDto,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      };

      mockEscalationRepository.create.mockReturnValue(escalation);
      mockEscalationRepository.save.mockResolvedValue(escalation);

      const result = await service.createEscalation(createEscalationDto, 'admin');

      expect(result).toEqual(escalation);
      expect(mockEscalationRepository.create).toHaveBeenCalledWith(createEscalationDto);
      expect(mockEscalationRepository.save).toHaveBeenCalledWith(escalation);
    });

    it('should get escalation by ID', async () => {
      const escalation = {
        id: 'escalation-1',
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 1,
        reason: 'Test escalation',
        assignedTo: 'user-1',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      };

      mockEscalationRepository.findOne.mockResolvedValue(escalation);

      const result = await service.getEscalation('escalation-1');

      expect(result).toEqual(escalation);
      expect(mockEscalationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'escalation-1' },
      });
    });

    it('should update escalation', async () => {
      const updateDto = {
        escalationLevel: 2,
        reason: 'Updated escalation',
        priority: 'critical',
      };

      const existingEscalation = {
        id: 'escalation-1',
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 1,
        reason: 'Test escalation',
        assignedTo: 'user-1',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      };

      const updatedEscalation = {
        ...existingEscalation,
        ...updateDto,
        updatedAt: new Date(),
      };

      mockEscalationRepository.findOne.mockResolvedValue(existingEscalation);
      mockEscalationRepository.save.mockResolvedValue(updatedEscalation);

      const result = await service.updateEscalation('escalation-1', updateDto);

      expect(result.escalationLevel).toBe(2);
      expect(result.reason).toBe('Updated escalation');
      expect(result.priority).toBe('critical');
    });

    it('should delete escalation', async () => {
      const escalation = {
        id: 'escalation-1',
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 1,
        reason: 'Test escalation',
        assignedTo: 'user-1',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      };

      mockEscalationRepository.findOne.mockResolvedValue(escalation);
      mockEscalationRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteEscalation('escalation-1');

      expect(mockEscalationRepository.delete).toHaveBeenCalledWith({
        id: 'escalation-1',
      });
    });

    it('should list escalations with filters', async () => {
      const escalations = [
        {
          id: 'escalation-1',
          milestoneId: 'milestone-1',
          workflowInstanceId: 'workflow-1',
          escalationLevel: 1,
          reason: 'Test escalation 1',
          assignedTo: 'user-1',
          priority: 'high',
          status: 'pending',
          dueDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'admin',
          tenantId: 'tenant-1',
        },
        {
          id: 'escalation-2',
          milestoneId: 'milestone-2',
          workflowInstanceId: 'workflow-2',
          escalationLevel: 2,
          reason: 'Test escalation 2',
          assignedTo: 'user-2',
          priority: 'medium',
          status: 'resolved',
          dueDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'admin',
          tenantId: 'tenant-1',
        },
      ];

      mockEscalationRepository.find.mockResolvedValue(escalations);

      const result = await service.listEscalations({
        tenantId: 'tenant-1',
        status: 'pending',
        priority: 'high',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('escalation-1');
    });
  });

  describe('Escalation Logic', () => {
    it('should auto-escalate overdue escalations', async () => {
      const overdueEscalation = {
        id: 'escalation-1',
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 1,
        reason: 'Test escalation',
        assignedTo: 'user-1',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      };

      mockEscalationRepository.find.mockResolvedValue([overdueEscalation]);
      mockEscalationRepository.save.mockResolvedValue({
        ...overdueEscalation,
        escalationLevel: 2,
        status: 'escalated',
      });

      const result = await service.autoEscalateOverdue();

      expect(result).toHaveLength(1);
      expect(result[0].escalationLevel).toBe(2);
      expect(result[0].status).toBe('escalated');
    });

    it('should escalate based on priority', async () => {
      const highPriorityEscalation = {
        id: 'escalation-1',
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 1,
        reason: 'Critical issue',
        assignedTo: 'user-1',
        priority: 'critical',
        status: 'pending',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      };

      mockEscalationRepository.find.mockResolvedValue([highPriorityEscalation]);
      mockEscalationRepository.save.mockResolvedValue({
        ...highPriorityEscalation,
        escalationLevel: 3,
        status: 'escalated',
      });

      const result = await service.escalateByPriority('critical');

      expect(result).toHaveLength(1);
      expect(result[0].escalationLevel).toBe(3);
    });

    it('should resolve escalation', async () => {
      const escalation = {
        id: 'escalation-1',
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 1,
        reason: 'Test escalation',
        assignedTo: 'user-1',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      };

      const resolveDto = {
        resolution: 'Issue resolved',
        resolvedBy: 'user-1',
        resolutionNotes: 'Fixed the underlying problem',
      };

      mockEscalationRepository.findOne.mockResolvedValue(escalation);
      mockEscalationRepository.save.mockResolvedValue({
        ...escalation,
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'user-1',
        resolution: 'Issue resolved',
        resolutionNotes: 'Fixed the underlying problem',
      });

      const result = await service.resolveEscalation('escalation-1', resolveDto);

      expect(result.status).toBe('resolved');
      expect(result.resolution).toBe('Issue resolved');
      expect(result.resolvedBy).toBe('user-1');
    });
  });

  describe('Workflow Integration', () => {
    it('should trigger escalation from workflow', async () => {
      const workflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        status: 'active',
        tenantId: 'tenant-1',
      };

      const execution = {
        id: 'execution-1',
        workflowInstanceId: 'workflow-1',
        status: 'failed',
        errorMessage: 'Critical error occurred',
        createdAt: new Date(),
        tenantId: 'tenant-1',
      };

      const escalation = {
        id: 'escalation-1',
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        executionId: 'execution-1',
        escalationLevel: 1,
        reason: 'Workflow execution failed',
        assignedTo: 'admin',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        tenantId: 'tenant-1',
      };

      mockWorkflowRepository.findOne.mockResolvedValue(workflow);
      mockExecutionRepository.findOne.mockResolvedValue(execution);
      mockEscalationRepository.create.mockReturnValue(escalation);
      mockEscalationRepository.save.mockResolvedValue(escalation);

      const result = await service.triggerWorkflowEscalation('execution-1', 'Workflow execution failed');

      expect(result.workflowInstanceId).toBe('workflow-1');
      expect(result.executionId).toBe('execution-1');
      expect(result.reason).toBe('Workflow execution failed');
    });

    it('should get escalations by workflow', async () => {
      const escalations = [
        {
          id: 'escalation-1',
          milestoneId: 'milestone-1',
          workflowInstanceId: 'workflow-1',
          escalationLevel: 1,
          reason: 'Test escalation 1',
          assignedTo: 'user-1',
          priority: 'high',
          status: 'pending',
          dueDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'admin',
          tenantId: 'tenant-1',
        },
      ];

      mockEscalationRepository.find.mockResolvedValue(escalations);

      const result = await service.getWorkflowEscalations('workflow-1');

      expect(result).toHaveLength(1);
      expect(result[0].workflowInstanceId).toBe('workflow-1');
    });
  });

  describe('Analytics and Reporting', () => {
    it('should get escalation analytics', async () => {
      const escalations = [
        {
          id: 'escalation-1',
          status: 'pending',
          priority: 'high',
          escalationLevel: 1,
          createdAt: new Date(),
          resolvedAt: null,
          tenantId: 'tenant-1',
        },
        {
          id: 'escalation-2',
          status: 'resolved',
          priority: 'medium',
          escalationLevel: 2,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          resolvedAt: new Date(),
          tenantId: 'tenant-1',
        },
      ];

      mockEscalationRepository.find.mockResolvedValue(escalations);

      const result = await service.getEscalationAnalytics('tenant-1', {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      expect(result.totalEscalations).toBe(2);
      expect(result.pendingEscalations).toBe(1);
      expect(result.resolvedEscalations).toBe(1);
      expect(result.averageResolutionTime).toBeDefined();
    });

    it('should get escalation metrics', async () => {
      const metrics = {
        totalEscalations: 10,
        pendingEscalations: 3,
        resolvedEscalations: 7,
        averageResolutionTime: 2.5,
        escalationByLevel: {
          1: 5,
          2: 3,
          3: 2,
        },
        escalationByPriority: {
          low: 2,
          medium: 4,
          high: 3,
          critical: 1,
        },
      };

      mockEscalationRepository.count.mockResolvedValue(10);
      mockEscalationRepository.find.mockResolvedValue([]);

      const result = await service.getEscalationMetrics('tenant-1');

      expect(result.totalEscalations).toBe(10);
      expect(result.pendingEscalations).toBeDefined();
      expect(result.resolvedEscalations).toBeDefined();
    });
  });

  describe('Notification Integration', () => {
    it('should send escalation notifications', async () => {
      const escalation = {
        id: 'escalation-1',
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 2,
        reason: 'Critical escalation',
        assignedTo: 'user-1',
        priority: 'critical',
        status: 'escalated',
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      };

      mockEscalationRepository.findOne.mockResolvedValue(escalation);

      const result = await service.sendEscalationNotification('escalation-1');

      expect(result.success).toBe(true);
      expect(result.notificationSent).toBe(true);
    });

    it('should handle notification failures gracefully', async () => {
      const escalation = {
        id: 'escalation-1',
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 1,
        reason: 'Test escalation',
        assignedTo: 'invalid-user',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      };

      mockEscalationRepository.findOne.mockResolvedValue(escalation);

      const result = await service.sendEscalationNotification('escalation-1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle escalation not found', async () => {
      mockEscalationRepository.findOne.mockResolvedValue(null);

      await expect(service.getEscalation('invalid-id')).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      mockEscalationRepository.save.mockRejectedValue(new Error('Database error'));

      const createEscalationDto = {
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 1,
        reason: 'Test escalation',
        assignedTo: 'user-1',
        priority: 'high',
        dueDate: new Date(),
      };

      await expect(service.createEscalation(createEscalationDto, 'admin')).rejects.toThrow();
    });

    it('should validate escalation data', async () => {
      const invalidEscalationDto = {
        milestoneId: '',
        workflowInstanceId: '',
        escalationLevel: -1,
        reason: '',
        assignedTo: '',
        priority: 'invalid',
        dueDate: new Date('invalid-date'),
      };

      await expect(service.createEscalation(invalidEscalationDto, 'admin')).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk escalation creation', async () => {
      const escalations = Array.from({ length: 100 }, (_, i) => ({
        milestoneId: `milestone-${i}`,
        workflowInstanceId: `workflow-${i}`,
        escalationLevel: 1,
        reason: `Test escalation ${i}`,
        assignedTo: 'user-1',
        priority: 'high',
        dueDate: new Date(),
      }));

      const startTime = Date.now();

      mockEscalationRepository.save.mockImplementation((escalation) => 
        Promise.resolve({ ...escalation, id: `escalation-${Math.random()}` })
      );

      const results = await Promise.all(
        escalations.map(escalation => 
          service.createEscalation(escalation, 'admin')
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent escalation queries', async () => {
      const escalation = {
        id: 'escalation-1',
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 1,
        reason: 'Test escalation',
        assignedTo: 'user-1',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      };

      mockEscalationRepository.findOne.mockResolvedValue(escalation);

      const startTime = Date.now();

      const results = await Promise.all(
        Array.from({ length: 50 }, () => 
          service.getEscalation('escalation-1')
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
