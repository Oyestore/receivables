import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributionService } from '../services/distribution.service';
import { DistributionRule, DistributionAssignment, DistributionRuleType, DistributionChannel, DistributionStatus } from '../entities/distribution-entities';
import { CreateDistributionRuleDto, CreateDistributionAssignmentDto } from '../dto/distribution.dto';

describe('DistributionService - Complete Tests', () => {
  let service: DistributionService;
  let ruleRepository: Repository<DistributionRule>;
  let assignmentRepository: Repository<DistributionAssignment>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [DistributionRule, DistributionAssignment],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([DistributionRule, DistributionAssignment]),
      ],
      providers: [DistributionService],
    }).compile();

    service = module.get<DistributionService>(DistributionService);
    ruleRepository = module.get<Repository<DistributionRule>>(Repository<DistributionRule>);
    assignmentRepository = module.get<Repository<DistributionAssignment>>(Repository<DistributionAssignment>);
  });

  describe('Distribution Rules CRUD', () => {
    it('should create a distribution rule', async () => {
      const createRuleDto: CreateDistributionRuleDto = {
        tenantId: 'tenant-123',
        ruleName: 'Test Rule',
        description: 'Test description',
        ruleType: DistributionRuleType.AMOUNT_BASED,
        conditions: {
          minAmount: 1000,
          maxAmount: 50000,
        },
        targetChannel: DistributionChannel.EMAIL,
        priority: 90,
        createdBy: 'user-123',
      };

      const rule = await service.createDistributionRule(createRuleDto);

      expect(rule).toBeDefined();
      expect(rule.id).toBeDefined();
      expect(rule.ruleName).toBe(createRuleDto.ruleName);
      expect(rule.ruleType).toBe(createRuleDto.ruleType);
      expect(rule.targetChannel).toBe(createRuleDto.targetChannel);
      expect(rule.priority).toBe(createRuleDto.priority);
      expect(rule.isActive).toBe(true);
    });

    it('should get distribution rules with pagination', async () => {
      // Create test rules
      const tenantId = 'tenant-123';
      for (let i = 0; i < 5; i++) {
        await ruleRepository.save({
          tenantId,
          ruleName: `Rule ${i}`,
          ruleType: DistributionRuleType.CUSTOMER_BASED,
          conditions: { customerSegments: ['premium'] },
          targetChannel: DistributionChannel.EMAIL,
          priority: 100 - i,
          isActive: true,
          createdBy: 'user-123',
        });
      }

      const result = await service.getDistributionRules(tenantId, { page: 1, limit: 3 });

      expect(result.rules).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.rules[0].priority).toBeGreaterThan(result.rules[1].priority);
    });

    it('should update a distribution rule', async () => {
      const rule = await ruleRepository.save({
        tenantId: 'tenant-123',
        ruleName: 'Original Rule',
        ruleType: DistributionRuleType.AMOUNT_BASED,
        conditions: { minAmount: 1000 },
        targetChannel: DistributionChannel.EMAIL,
        priority: 50,
        isActive: true,
        createdBy: 'user-123',
      });

      const updateData = {
        ruleName: 'Updated Rule',
        priority: 75,
      };

      const updatedRule = await service.updateDistributionRule(rule.id, 'tenant-123', updateData);

      expect(updatedRule.ruleName).toBe(updateData.ruleName);
      expect(updatedRule.priority).toBe(updateData.priority);
    });

    it('should delete a distribution rule (soft delete)', async () => {
      const rule = await ruleRepository.save({
        tenantId: 'tenant-123',
        ruleName: 'Rule to Delete',
        ruleType: DistributionRuleType.AMOUNT_BASED,
        conditions: { minAmount: 1000 },
        targetChannel: DistributionChannel.EMAIL,
        priority: 50,
        isActive: true,
        createdBy: 'user-123',
      });

      await service.deleteDistributionRule(rule.id, 'tenant-123');

      const deletedRule = await ruleRepository.findOne({ where: { id: rule.id } });
      expect(deletedRule.isActive).toBe(false);
    });
  });

  describe('Rule Evaluation Engine', () => {
    it('should evaluate amount-based rules correctly', async () => {
      const rule = await ruleRepository.save({
        tenantId: 'tenant-123',
        ruleName: 'Amount Rule',
        ruleType: DistributionRuleType.AMOUNT_BASED,
        conditions: { minAmount: 1000, maxAmount: 50000 },
        targetChannel: DistributionChannel.EMAIL,
        priority: 90,
        isActive: true,
        createdBy: 'user-123',
      });

      const invoiceData = {
        invoiceId: 'invoice-123',
        customerId: 'customer-123',
        amount: 25000,
        dueDate: new Date(),
        customerData: { segment: 'premium' },
      };

      const assignments = await service.evaluateAndCreateAssignments('tenant-123', invoiceData);

      expect(assignments).toHaveLength(1);
      expect(assignments[0].assignedChannel).toBe(DistributionChannel.EMAIL);
      expect(assignments[0].ruleId).toBe(rule.id);
      expect(assignments[0].assignmentReason).toContain('within range');
    });

    it('should evaluate customer-based rules correctly', async () => {
      const rule = await ruleRepository.save({
        tenantId: 'tenant-123',
        ruleName: 'Customer Rule',
        ruleType: DistributionRuleType.CUSTOMER_BASED,
        conditions: { customerSegments: ['premium'], customerTypes: ['recurring'] },
        targetChannel: DistributionChannel.SMS,
        priority: 80,
        isActive: true,
        createdBy: 'user-123',
      });

      const invoiceData = {
        invoiceId: 'invoice-123',
        customerId: 'customer-123',
        amount: 25000,
        dueDate: new Date(),
        customerData: { segment: 'premium', type: 'recurring' },
      };

      const assignments = await service.evaluateAndCreateAssignments('tenant-123', invoiceData);

      expect(assignments).toHaveLength(1);
      expect(assignments[0].assignedChannel).toBe(DistributionChannel.SMS);
      expect(assignments[0].ruleId).toBe(rule.id);
    });

    it('should evaluate geographic rules correctly', async () => {
      const rule = await ruleRepository.save({
        tenantId: 'tenant-123',
        ruleName: 'Geographic Rule',
        ruleType: DistributionRuleType.GEOGRAPHIC,
        conditions: { countries: ['US', 'CA'], states: ['CA', 'NY'] },
        targetChannel: DistributionChannel.EMAIL,
        priority: 70,
        isActive: true,
        createdBy: 'user-123',
      });

      const invoiceData = {
        invoiceId: 'invoice-123',
        customerId: 'customer-123',
        amount: 25000,
        dueDate: new Date(),
        customerData: { location: { country: 'US', state: 'CA' } },
      };

      const assignments = await service.evaluateAndCreateAssignments('tenant-123', invoiceData);

      expect(assignments).toHaveLength(1);
      expect(assignments[0].assignedChannel).toBe(DistributionChannel.EMAIL);
      expect(assignments[0].ruleId).toBe(rule.id);
    });

    it('should select highest priority rule when multiple match', async () => {
      const lowPriorityRule = await ruleRepository.save({
        tenantId: 'tenant-123',
        ruleName: 'Low Priority Rule',
        ruleType: DistributionRuleType.AMOUNT_BASED,
        conditions: { minAmount: 1000 },
        targetChannel: DistributionChannel.SMS,
        priority: 30,
        isActive: true,
        createdBy: 'user-123',
      });

      const highPriorityRule = await ruleRepository.save({
        tenantId: 'tenant-123',
        ruleName: 'High Priority Rule',
        ruleType: DistributionRuleType.AMOUNT_BASED,
        conditions: { minAmount: 1000 },
        targetChannel: DistributionChannel.EMAIL,
        priority: 90,
        isActive: true,
        createdBy: 'user-123',
      });

      const invoiceData = {
        invoiceId: 'invoice-123',
        customerId: 'customer-123',
        amount: 25000,
        dueDate: new Date(),
        customerData: { segment: 'premium' },
      };

      const assignments = await service.evaluateAndCreateAssignments('tenant-123', invoiceData);

      expect(assignments).toHaveLength(1);
      expect(assignments[0].ruleId).toBe(highPriorityRule.id);
      expect(assignments[0].assignedChannel).toBe(DistributionChannel.EMAIL);
    });

    it('should return no assignments when no rules match', async () => {
      const rule = await ruleRepository.save({
        tenantId: 'tenant-123',
        ruleName: 'Restrictive Rule',
        ruleType: DistributionRuleType.AMOUNT_BASED,
        conditions: { minAmount: 100000 },
        targetChannel: DistributionChannel.EMAIL,
        priority: 90,
        isActive: true,
        createdBy: 'user-123',
      });

      const invoiceData = {
        invoiceId: 'invoice-123',
        customerId: 'customer-123',
        amount: 5000, // Below minimum
        dueDate: new Date(),
        customerData: { segment: 'premium' },
      };

      const assignments = await service.evaluateAndCreateAssignments('tenant-123', invoiceData);

      expect(assignments).toHaveLength(0);
    });
  });

  describe('Distribution Assignments CRUD', () => {
    it('should create a distribution assignment', async () => {
      const createAssignmentDto: CreateDistributionAssignmentDto = {
        tenantId: 'tenant-123',
        invoiceId: 'invoice-123',
        customerId: 'customer-123',
        assignedChannel: DistributionChannel.EMAIL,
        ruleId: 'rule-123',
        assignmentReason: 'Test assignment',
        metadata: { test: true },
      };

      const assignment = await service.createDistributionAssignment(createAssignmentDto);

      expect(assignment).toBeDefined();
      expect(assignment.id).toBeDefined();
      expect(assignment.distributionStatus).toBe(DistributionStatus.PENDING);
      expect(assignment.assignedChannel).toBe(createAssignmentDto.assignedChannel);
    });

    it('should update assignment status', async () => {
      const assignment = await assignmentRepository.save({
        tenantId: 'tenant-123',
        invoiceId: 'invoice-123',
        customerId: 'customer-123',
        assignedChannel: DistributionChannel.EMAIL,
        assignmentReason: 'Test assignment',
        distributionStatus: DistributionStatus.PENDING,
      });

      const updatedAssignment = await service.updateAssignmentStatus(
        assignment.id,
        'tenant-123',
        { status: DistributionStatus.SENT }
      );

      expect(updatedAssignment.distributionStatus).toBe(DistributionStatus.SENT);
      expect(updatedAssignment.sentAt).toBeDefined();
    });

    it('should update assignment status to delivered with timestamp', async () => {
      const assignment = await assignmentRepository.save({
        tenantId: 'tenant-123',
        invoiceId: 'invoice-123',
        customerId: 'customer-123',
        assignedChannel: DistributionChannel.EMAIL,
        assignmentReason: 'Test assignment',
        distributionStatus: DistributionStatus.SENT,
        sentAt: new Date(Date.now() - 3600000), // 1 hour ago
      });

      const updatedAssignment = await service.updateAssignmentStatus(
        assignment.id,
        'tenant-123',
        { status: DistributionStatus.DELIVERED }
      );

      expect(updatedAssignment.distributionStatus).toBe(DistributionStatus.DELIVERED);
      expect(updatedAssignment.deliveredAt).toBeDefined();
      expect(updatedAssignment.deliveredAt.getTime()).toBeGreaterThan(updatedAssignment.sentAt.getTime());
    });

    it('should get assignments by invoice', async () => {
      const invoiceId = 'invoice-123';
      const customerId = 'customer-123';
      const tenantId = 'tenant-123';

      // Create multiple assignments for the same invoice
      for (let i = 0; i < 3; i++) {
        await assignmentRepository.save({
          tenantId,
          invoiceId,
          customerId,
          assignedChannel: DistributionChannel.EMAIL,
          assignmentReason: `Assignment ${i}`,
          distributionStatus: DistributionStatus.PENDING,
        });
      }

      const assignments = await service.getAssignmentsByInvoice(tenantId, invoiceId);

      expect(assignments).toHaveLength(3);
      expect(assignments[0].invoiceId).toBe(invoiceId);
      expect(assignments[0].customerId).toBe(customerId);
    });
  });

  describe('Analytics', () => {
    it('should generate distribution analytics', async () => {
      const tenantId = 'tenant-123';
      const now = new Date();

      // Create test assignments with different statuses
      const assignments = [
        { tenantId, distributionStatus: DistributionStatus.DELIVERED, assignedChannel: DistributionChannel.EMAIL, createdAt: now },
        { tenantId, distributionStatus: DistributionStatus.SENT, assignedChannel: DistributionChannel.SMS, createdAt: now },
        { tenantId, distributionStatus: DistributionStatus.FAILED, assignedChannel: DistributionChannel.EMAIL, createdAt: now },
        { tenantId, distributionStatus: DistributionStatus.DELIVERED, assignedChannel: DistributionChannel.WHATSAPP, createdAt: now },
      ];

      for (const assignment of assignments) {
        await assignmentRepository.save(assignment);
      }

      const analytics = await service.getDistributionAnalytics(tenantId);

      expect(analytics.totalAssignments).toBe(4);
      expect(analytics.statusBreakdown.delivered).toBe(2);
      expect(analytics.statusBreakdown.sent).toBe(1);
      expect(analytics.statusBreakdown.failed).toBe(1);
      expect(analytics.channelBreakdown.email).toBe(2);
      expect(analytics.channelBreakdown.sms).toBe(1);
      expect(analytics.channelBreakdown.whatsapp).toBe(1);
      expect(analytics.successRate).toBe(75); // 3 out of 4 successful
    });

    it('should generate analytics with date range filtering', async () => {
      const tenantId = 'tenant-123';
      const oldDate = new Date('2024-01-01');
      const recentDate = new Date();

      await assignmentRepository.save({
        tenantId,
        distributionStatus: DistributionStatus.DELIVERED,
        assignedChannel: DistributionChannel.EMAIL,
        createdAt: oldDate,
      });

      await assignmentRepository.save({
        tenantId,
        distributionStatus: DistributionStatus.SENT,
        assignedChannel: DistributionChannel.SMS,
        createdAt: recentDate,
      });

      const startDate = new Date('2024-01-15');
      const analytics = await service.getDistributionAnalytics(tenantId, startDate);

      expect(analytics.totalAssignments).toBe(1); // Only the recent one
      expect(analytics.channelBreakdown.sms).toBe(1);
    });
  });

  describe('Batch Operations', () => {
    it('should create batch assignments', async () => {
      const tenantId = 'tenant-123';
      const assignments: CreateDistributionAssignmentDto[] = [
        {
          tenantId,
          invoiceId: 'invoice-1',
          customerId: 'customer-1',
          assignedChannel: DistributionChannel.EMAIL,
          assignmentReason: 'Batch 1',
        },
        {
          tenantId,
          invoiceId: 'invoice-2',
          customerId: 'customer-2',
          assignedChannel: DistributionChannel.SMS,
          assignmentReason: 'Batch 2',
        },
      ];

      const results = await service.createBatchAssignments(tenantId, assignments);

      expect(results).toHaveLength(2);
      expect(results[0].invoiceId).toBe('invoice-1');
      expect(results[1].invoiceId).toBe('invoice-2');
    });

    it('should update batch assignment statuses', async () => {
      const tenantId = 'tenant-123';
      const assignments = [];

      // Create assignments
      for (let i = 0; i < 3; i++) {
        const assignment = await assignmentRepository.save({
          tenantId,
          invoiceId: `invoice-${i}`,
          customerId: `customer-${i}`,
          assignedChannel: DistributionChannel.EMAIL,
          assignmentReason: `Assignment ${i}`,
          distributionStatus: DistributionStatus.PENDING,
        });
        assignments.push(assignment);
      }

      // Update batch statuses
      const updates = assignments.map((assignment, index) => ({
        id: assignment.id,
        status: index % 2 === 0 ? DistributionStatus.SENT : DistributionStatus.FAILED as DistributionStatus,
      }));

      const results = await service.updateBatchAssignmentStatus(tenantId, updates);

      expect(results).toHaveLength(3);
      expect(results[0].distributionStatus).toBe(DistributionStatus.SENT);
      expect(results[1].distributionStatus).toBe(DistributionStatus.FAILED);
      expect(results[2].distributionStatus).toBe(DistributionStatus.SENT);
    });
  });

  describe('Validation', () => {
    it('should validate amount-based rule conditions', async () => {
      const invalidRule = {
        tenantId: 'tenant-123',
        ruleName: 'Invalid Rule',
        ruleType: DistributionRuleType.AMOUNT_BASED,
        conditions: {}, // No minAmount or maxAmount
        targetChannel: DistributionChannel.EMAIL,
        priority: 50,
        createdBy: 'user-123',
      };

      await expect(service.createDistributionRule(invalidRule as any)).rejects.toThrow(
        'Amount-based rules must specify minAmount, maxAmount, or both'
      );
    });

    it('should validate customer-based rule conditions', async () => {
      const invalidRule = {
        tenantId: 'tenant-123',
        ruleName: 'Invalid Rule',
        ruleType: DistributionRuleType.CUSTOMER_BASED,
        conditions: {}, // No customerSegments or customerTypes
        targetChannel: DistributionChannel.EMAIL,
        priority: 50,
        createdBy: 'user-123',
      };

      await expect(service.createDistributionRule(invalidRule as any)).rejects.toThrow(
        'Customer-based rules must specify customerSegments or customerTypes'
      );
    });

    it('should validate geographic rule conditions', async () => {
      const invalidRule = {
        tenantId: 'tenant-123',
        ruleName: 'Invalid Rule',
        ruleType: DistributionRuleType.GEOGRAPHIC,
        conditions: {}, // No countries, states, or cities
        targetChannel: DistributionChannel.EMAIL,
        priority: 50,
        createdBy: 'user-123',
      };

      await expect(service.createDistributionRule(invalidRule as any)).rejects.toThrow(
        'Geographic rules must specify countries, states, or cities'
      );
    });

    it('should validate custom rule conditions', async () => {
      const invalidRule = {
        tenantId: 'tenant-123',
        ruleName: 'Invalid Rule',
        ruleType: DistributionRuleType.CUSTOM,
        conditions: {}, // No customConditions
        targetChannel: DistributionChannel.EMAIL,
        priority: 50,
        createdBy: 'user-123',
      };

      await expect(service.createDistributionRule(invalidRule as any)).rejects.toThrow(
        'Custom rules must specify customConditions'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle rule not found error', async () => {
      await expect(
        service.getDistributionRuleById('non-existent-id', 'tenant-123')
      ).rejects.toThrow('Distribution rule not found: non-existent-id');
    });

    it('should handle assignment not found error', async () => {
      await expect(
        service.getAssignmentById('non-existent-id', 'tenant-123')
      ).rejects.toThrow('Distribution assignment not found: non-existent-id');
    });

    it('should handle delete non-existent rule', async () => {
      await expect(
        service.deleteDistributionRule('non-existent-id', 'tenant-123')
      ).rejects.toThrow('Distribution rule not found or access denied');
    });
  });
});
