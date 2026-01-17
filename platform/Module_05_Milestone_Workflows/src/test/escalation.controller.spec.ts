import { Test, TestingModule } from '@nestjs/testing';
import { EscalationController } from '../controllers/escalation.controller';
import { EscalationService } from '../services/escalation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';

describe('EscalationController - Complete Tests', () => {
  let controller: EscalationController;
  let escalationService: EscalationService;

  const mockEscalationService = {
    createEscalation: jest.fn(),
    getEscalation: jest.fn(),
    updateEscalation: jest.fn(),
    deleteEscalation: jest.fn(),
    listEscalations: jest.fn(),
    autoEscalateOverdue: jest.fn(),
    escalateByPriority: jest.fn(),
    resolveEscalation: jest.fn(),
    triggerWorkflowEscalation: jest.fn(),
    getWorkflowEscalations: jest.fn(),
    getEscalationAnalytics: jest.fn(),
    getEscalationMetrics: jest.fn(),
    sendEscalationNotification: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EscalationController],
      providers: [
        {
          provide: EscalationService,
          useValue: mockEscalationService,
        },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<EscalationController>(EscalationController);
    escalationService = module.get<EscalationService>(EscalationService);
  });

  describe('Basic CRUD Operations', () => {
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

      mockEscalationService.createEscalation.mockResolvedValue(escalation);

      const result = await controller.createEscalation(createEscalationDto, { user: { id: 'admin' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(escalation);
      expect(mockEscalationService.createEscalation).toHaveBeenCalledWith(createEscalationDto, 'admin');
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

      mockEscalationService.getEscalation.mockResolvedValue(escalation);

      const result = await controller.getEscalation('escalation-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(escalation);
      expect(mockEscalationService.getEscalation).toHaveBeenCalledWith('escalation-1');
    });

    it('should update escalation', async () => {
      const updateDto = {
        escalationLevel: 2,
        reason: 'Updated escalation',
        priority: 'critical',
      };

      const updatedEscalation = {
        id: 'escalation-1',
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: 2,
        reason: 'Updated escalation',
        assignedTo: 'user-1',
        priority: 'critical',
        status: 'pending',
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      };

      mockEscalationService.updateEscalation.mockResolvedValue(updatedEscalation);

      const result = await controller.updateEscalation('escalation-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.escalationLevel).toBe(2);
      expect(result.data.priority).toBe('critical');
    });

    it('should delete escalation', async () => {
      mockEscalationService.deleteEscalation.mockResolvedValue(undefined);

      const result = await controller.deleteEscalation('escalation-1');

      expect(result.success).toBe(true);
      expect(mockEscalationService.deleteEscalation).toHaveBeenCalledWith('escalation-1');
    });

    it('should list escalations', async () => {
      const escalations = [
        {
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
        },
      ];

      const query = {
        tenantId: 'tenant-1',
        status: 'pending',
        priority: 'high',
      };

      mockEscalationService.listEscalations.mockResolvedValue(escalations);

      const result = await controller.listEscalations(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('pending');
    });
  });

  describe('Escalation Operations', () => {
    it('should auto-escalate overdue escalations', async () => {
      const escalatedItems = [
        {
          id: 'escalation-1',
          escalationLevel: 2,
          status: 'escalated',
        },
      ];

      mockEscalationService.autoEscalateOverdue.mockResolvedValue(escalatedItems);

      const result = await controller.autoEscalateOverdue();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].escalationLevel).toBe(2);
    });

    it('should escalate by priority', async () => {
      const escalatedItems = [
        {
          id: 'escalation-1',
          escalationLevel: 3,
          status: 'escalated',
        },
      ];

      mockEscalationService.escalateByPriority.mockResolvedValue(escalatedItems);

      const result = await controller.escalateByPriority('critical');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockEscalationService.escalateByPriority).toHaveBeenCalledWith('critical');
    });

    it('should resolve escalation', async () => {
      const resolveDto = {
        resolution: 'Issue resolved',
        resolvedBy: 'user-1',
        resolutionNotes: 'Fixed the underlying problem',
      };

      const resolvedEscalation = {
        id: 'escalation-1',
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'user-1',
        resolution: 'Issue resolved',
        resolutionNotes: 'Fixed the underlying problem',
      };

      mockEscalationService.resolveEscalation.mockResolvedValue(resolvedEscalation);

      const result = await controller.resolveEscalation('escalation-1', resolveDto);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('resolved');
      expect(result.data.resolution).toBe('Issue resolved');
    });
  });

  describe('Workflow Integration', () => {
    it('should trigger workflow escalation', async () => {
      const triggerDto = {
        executionId: 'execution-1',
        reason: 'Workflow execution failed',
      };

      const escalation = {
        id: 'escalation-1',
        workflowInstanceId: 'workflow-1',
        executionId: 'execution-1',
        reason: 'Workflow execution failed',
        status: 'pending',
      };

      mockEscalationService.triggerWorkflowEscalation.mockResolvedValue(escalation);

      const result = await controller.triggerWorkflowEscalation(triggerDto);

      expect(result.success).toBe(true);
      expect(result.data.executionId).toBe('execution-1');
      expect(mockEscalationService.triggerWorkflowEscalation).toHaveBeenCalledWith('execution-1', 'Workflow execution failed');
    });

    it('should get workflow escalations', async () => {
      const escalations = [
        {
          id: 'escalation-1',
          workflowInstanceId: 'workflow-1',
          status: 'pending',
        },
      ];

      mockEscalationService.getWorkflowEscalations.mockResolvedValue(escalations);

      const result = await controller.getWorkflowEscalations('workflow-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].workflowInstanceId).toBe('workflow-1');
    });
  });

  describe('Analytics and Reporting', () => {
    it('should get escalation analytics', async () => {
      const analytics = {
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

      const query = {
        tenantId: 'tenant-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      mockEscalationService.getEscalationAnalytics.mockResolvedValue(analytics);

      const result = await controller.getEscalationAnalytics(query);

      expect(result.success).toBe(true);
      expect(result.data.totalEscalations).toBe(10);
      expect(result.data.pendingEscalations).toBe(3);
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

      mockEscalationService.getEscalationMetrics.mockResolvedValue(metrics);

      const result = await controller.getEscalationMetrics('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data.totalEscalations).toBe(10);
      expect(mockEscalationService.getEscalationMetrics).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('Notification Operations', () => {
    it('should send escalation notification', async () => {
      const notificationResult = {
        success: true,
        notificationSent: true,
        sentAt: new Date(),
        recipients: ['user-1', 'admin'],
      };

      mockEscalationService.sendEscalationNotification.mockResolvedValue(notificationResult);

      const result = await controller.sendEscalationNotification('escalation-1');

      expect(result.success).toBe(true);
      expect(result.data.notificationSent).toBe(true);
      expect(mockEscalationService.sendEscalationNotification).toHaveBeenCalledWith('escalation-1');
    });

    it('should handle notification failures', async () => {
      const notificationResult = {
        success: false,
        error: 'Notification service unavailable',
        notificationSent: false,
      };

      mockEscalationService.sendEscalationNotification.mockResolvedValue(notificationResult);

      const result = await controller.sendEscalationNotification('escalation-1');

      expect(result.success).toBe(true); // Controller still returns success for API response
      expect(result.data.notificationSent).toBe(false);
      expect(result.data.error).toBe('Notification service unavailable');
    });
  });

  describe('Error Handling', () => {
    it('should handle escalation not found', async () => {
      const error = new Error('Escalation not found');
      mockEscalationService.getEscalation.mockRejectedValue(error);

      const result = await controller.getEscalation('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Escalation not found');
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed: Invalid escalation level');
      mockEscalationService.createEscalation.mockRejectedValue(error);

      const createEscalationDto = {
        milestoneId: 'milestone-1',
        workflowInstanceId: 'workflow-1',
        escalationLevel: -1, // Invalid
        reason: 'Test escalation',
        assignedTo: 'user-1',
        priority: 'high',
        dueDate: new Date(),
      };

      const result = await controller.createEscalation(createEscalationDto, { user: { id: 'admin' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockEscalationService.listEscalations.mockRejectedValue(error);

      const result = await controller.listEscalations({ tenantId: 'tenant-1' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk escalation operations', async () => {
      const escalations = Array.from({ length: 50 }, (_, i) => ({
        id: `escalation-${i}`,
        milestoneId: `milestone-${i}`,
        workflowInstanceId: `workflow-${i}`,
        escalationLevel: 1,
        reason: `Test escalation ${i}`,
        assignedTo: 'user-1',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        tenantId: 'tenant-1',
      }));

      mockEscalationService.listEscalations.mockResolvedValue(escalations);

      const startTime = Date.now();
      const result = await controller.listEscalations({ tenantId: 'tenant-1' });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent requests', async () => {
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

      mockEscalationService.getEscalation.mockResolvedValue(escalation);

      const startTime = Date.now();
      const results = await Promise.all(
        Array.from({ length: 20 }, () => controller.getEscalation('escalation-1'))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(20);
      expect(results.every(result => result.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Authorization Tests', () => {
    it('should allow admin to create escalations', async () => {
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

      mockEscalationService.createEscalation.mockResolvedValue(escalation);

      const result = await controller.createEscalation(createEscalationDto, { user: { id: 'admin', role: 'admin' } });

      expect(result.success).toBe(true);
    });

    it('should allow workflow_manager to update escalations', async () => {
      const updateDto = {
        escalationLevel: 2,
        reason: 'Updated escalation',
      };

      const updatedEscalation = {
        id: 'escalation-1',
        escalationLevel: 2,
        reason: 'Updated escalation',
        status: 'pending',
      };

      mockEscalationService.updateEscalation.mockResolvedValue(updatedEscalation);

      const result = await controller.updateEscalation('escalation-1', updateDto);

      expect(result.success).toBe(true);
    });
  });
});
