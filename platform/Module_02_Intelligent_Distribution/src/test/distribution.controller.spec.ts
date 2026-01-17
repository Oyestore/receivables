import { Test, TestingModule } from '@nestjs/testing';
import { DistributionController } from '../controllers/distribution.controller';
import { DistributionService } from '../services/distribution.service';
import { DistributionOrchestratorService } from '../services/distribution-orchestrator.service';
import { DynamicPricingService } from '../services/dynamic-pricing.service';
import { SMBMetricsService } from '../services/smb-metrics.service';
import { CreateDistributionRuleDto } from '../dto/create-distribution-rule.dto';
import { CreateDistributionAssignmentDto } from '../dto/create-distribution-assignment.dto';
import { UpdateDistributionAssignmentDto } from '../dto/update-distribution-assignment.dto';
import { DistributionRuleType, DistributionChannel, DistributionStatus } from '../entities/distribution-entities';
import { HttpStatus } from '@nestjs/common';

describe('DistributionController - Complete Tests', () => {
  let controller: DistributionController;
  let distributionService: DistributionService;
  let orchestratorService: DistributionOrchestratorService;
  let pricingService: DynamicPricingService;
  let metricsService: SMBMetricsService;

  const mockRule = {
    id: 'rule-1',
    tenantId: 'tenant-1',
    ruleName: 'High Value Rule',
    description: 'Distribute high value invoices',
    ruleType: DistributionRuleType.AMOUNT_BASED,
    conditions: { minAmount: 10000 },
    targetChannel: DistributionChannel.EMAIL,
    priority: 90,
    isActive: true,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAssignment = {
    id: 'assignment-1',
    tenantId: 'tenant-1',
    invoiceId: 'invoice-1',
    customerId: 'customer-1',
    assignedChannel: DistributionChannel.EMAIL,
    ruleId: 'rule-1',
    assignmentReason: 'High value invoice',
    distributionStatus: DistributionStatus.PENDING,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DistributionController],
      providers: [
        {
          provide: DistributionService,
          useValue: {
            createDistributionRule: jest.fn(),
            getDistributionRuleById: jest.fn(),
            updateDistributionRule: jest.fn(),
            deleteDistributionRule: jest.fn(),
            listDistributionRules: jest.fn(),
            createDistributionAssignment: jest.fn(),
            getDistributionAssignmentById: jest.fn(),
            updateDistributionAssignment: jest.fn(),
            deleteDistributionAssignment: jest.fn(),
            listDistributionAssignments: jest.fn(),
            evaluateAndCreateAssignments: jest.fn(),
            getDistributionAnalytics: jest.fn(),
            bulkCreateAssignments: jest.fn(),
            bulkUpdateAssignments: jest.fn(),
          },
        },
        {
          provide: DistributionOrchestratorService,
          useValue: {
            orchestrateDistribution: jest.fn(),
            getOrchestrationStatus: jest.fn(),
            cancelOrchestration: jest.fn(),
          },
        },
        {
          provide: DynamicPricingService,
          useValue: {
            calculateOptimalPricing: jest.fn(),
            getPricingRecommendations: jest.fn(),
            updatePricingStrategy: jest.fn(),
          },
        },
        {
          provide: SMBMetricsService,
          useValue: {
            getDistributionMetrics: jest.fn(),
            getChannelPerformance: jest.fn(),
            getRuleEffectiveness: jest.fn(),
            generateReport: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DistributionController>(DistributionController);
    distributionService = module.get<DistributionService>(DistributionService);
    orchestratorService = module.get<DistributionOrchestratorService>(DistributionOrchestratorService);
    pricingService = module.get<DynamicPricingService>(DynamicPricingService);
    metricsService = module.get<SMBMetricsService>(SMBMetricsService);
  });

  describe('Distribution Rules Management', () => {
    it('should create a new distribution rule', async () => {
      const createRuleDto: CreateDistributionRuleDto = {
        ruleName: 'Test Rule',
        description: 'Test rule description',
        ruleType: DistributionRuleType.AMOUNT_BASED,
        conditions: { minAmount: 5000 },
        targetChannel: DistributionChannel.EMAIL,
        priority: 80,
      };

      jest.spyOn(distributionService, 'createDistributionRule').mockResolvedValue(mockRule);

      const result = await controller.createDistributionRule(createRuleDto, { user: { id: 'user-1', tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRule);
      expect(distributionService.createDistributionRule).toHaveBeenCalledWith(createRuleDto, 'user-1', 'tenant-1');
    });

    it('should get distribution rule by ID', async () => {
      jest.spyOn(distributionService, 'getDistributionRuleById').mockResolvedValue(mockRule);

      const result = await controller.getDistributionRule('rule-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRule);
      expect(distributionService.getDistributionRuleById).toHaveBeenCalledWith('rule-1', 'tenant-1');
    });

    it('should update distribution rule', async () => {
      const updateData = { ruleName: 'Updated Rule', priority: 95 };
      const updatedRule = { ...mockRule, ...updateData };

      jest.spyOn(distributionService, 'updateDistributionRule').mockResolvedValue(updatedRule);

      const result = await controller.updateDistributionRule('rule-1', updateData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.ruleName).toBe('Updated Rule');
      expect(result.data.priority).toBe(95);
    });

    it('should delete distribution rule', async () => {
      jest.spyOn(distributionService, 'deleteDistributionRule').mockResolvedValue(undefined);

      const result = await controller.deleteDistributionRule('rule-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(distributionService.deleteDistributionRule).toHaveBeenCalledWith('rule-1', 'tenant-1');
    });

    it('should list distribution rules with filters', async () => {
      const rules = [mockRule];
      const query = { ruleType: DistributionRuleType.AMOUNT_BASED, isActive: true };

      jest.spyOn(distributionService, 'listDistributionRules').mockResolvedValue(rules);

      const result = await controller.listDistributionRules(query, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(rules);
      expect(distributionService.listDistributionRules).toHaveBeenCalledWith('tenant-1', query);
    });
  });

  describe('Distribution Assignments Management', () => {
    it('should create a new distribution assignment', async () => {
      const createAssignmentDto: CreateDistributionAssignmentDto = {
        invoiceId: 'invoice-1',
        customerId: 'customer-1',
        assignedChannel: DistributionChannel.EMAIL,
        assignmentReason: 'Manual assignment',
      };

      jest.spyOn(distributionService, 'createDistributionAssignment').mockResolvedValue(mockAssignment);

      const result = await controller.createDistributionAssignment(createAssignmentDto, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAssignment);
      expect(distributionService.createDistributionAssignment).toHaveBeenCalledWith(createAssignmentDto, 'tenant-1');
    });

    it('should get distribution assignment by ID', async () => {
      jest.spyOn(distributionService, 'getDistributionAssignmentById').mockResolvedValue(mockAssignment);

      const result = await controller.getDistributionAssignment('assignment-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAssignment);
    });

    it('should update distribution assignment', async () => {
      const updateData: UpdateDistributionAssignmentDto = {
        distributionStatus: DistributionStatus.SENT,
        sentAt: new Date(),
      };

      const updatedAssignment = { ...mockAssignment, ...updateData };

      jest.spyOn(distributionService, 'updateDistributionAssignment').mockResolvedValue(updatedAssignment);

      const result = await controller.updateDistributionAssignment('assignment-1', updateData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.distributionStatus).toBe(DistributionStatus.SENT);
    });

    it('should delete distribution assignment', async () => {
      jest.spyOn(distributionService, 'deleteDistributionAssignment').mockResolvedValue(undefined);

      const result = await controller.deleteDistributionAssignment('assignment-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(distributionService.deleteDistributionAssignment).toHaveBeenCalledWith('assignment-1', 'tenant-1');
    });

    it('should list distribution assignments with filters', async () => {
      const assignments = [mockAssignment];
      const query = { distributionStatus: DistributionStatus.PENDING, assignedChannel: DistributionChannel.EMAIL };

      jest.spyOn(distributionService, 'listDistributionAssignments').mockResolvedValue(assignments);

      const result = await controller.listDistributionAssignments(query, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(assignments);
      expect(distributionService.listDistributionAssignments).toHaveBeenCalledWith('tenant-1', query);
    });
  });

  describe('Intelligent Distribution', () => {
    it('should evaluate and create assignments based on rules', async () => {
      const invoiceData = {
        tenantId: 'tenant-1',
        invoiceId: 'invoice-1',
        customerId: 'customer-1',
        amount: 15000,
        dueDate: new Date(),
        customerData: { segment: 'premium' },
      };

      const assignments = [mockAssignment];

      jest.spyOn(distributionService, 'evaluateAndCreateAssignments').mockResolvedValue(assignments);

      const result = await controller.evaluateAndCreateAssignments(invoiceData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(assignments);
      expect(distributionService.evaluateAndCreateAssignments).toHaveBeenCalledWith('tenant-1', invoiceData);
    });

    it('should orchestrate distribution process', async () => {
      const orchestrationData = {
        assignmentIds: ['assignment-1', 'assignment-2'],
        priority: 'high',
        scheduledAt: new Date(),
      };

      const orchestrationResult = {
        orchestrationId: 'orch-1',
        status: 'initiated',
        totalAssignments: 2,
        estimatedCompletion: new Date(),
      };

      jest.spyOn(orchestratorService, 'orchestrateDistribution').mockResolvedValue(orchestrationResult);

      const result = await controller.orchestrateDistribution(orchestrationData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(orchestrationResult);
      expect(orchestratorService.orchestrateDistribution).toHaveBeenCalledWith(orchestrationData, 'tenant-1');
    });

    it('should get orchestration status', async () => {
      const status = {
        orchestrationId: 'orch-1',
        status: 'completed',
        completedAssignments: 5,
        failedAssignments: 0,
        startedAt: new Date(),
        completedAt: new Date(),
      };

      jest.spyOn(orchestratorService, 'getOrchestrationStatus').mockResolvedValue(status);

      const result = await controller.getOrchestrationStatus('orch-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(status);
    });

    it('should cancel orchestration', async () => {
      jest.spyOn(orchestratorService, 'cancelOrchestration').mockResolvedValue(true);

      const result = await controller.cancelOrchestration('orch-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.cancelled).toBe(true);
    });
  });

  describe('Analytics and Reporting', () => {
    it('should get distribution analytics', async () => {
      const analytics = {
        totalAssignments: 1000,
        successfulDeliveries: 850,
        failedDeliveries: 50,
        pendingDeliveries: 100,
        averageDeliveryTime: 2.5,
        channelBreakdown: {
          [DistributionChannel.EMAIL]: 600,
          [DistributionChannel.SMS]: 250,
          [DistributionChannel.WHATSAPP]: 150,
        },
        statusBreakdown: {
          [DistributionStatus.SENT]: 850,
          [DistributionStatus.FAILED]: 50,
          [DistributionStatus.PENDING]: 100,
        },
      };

      jest.spyOn(distributionService, 'getDistributionAnalytics').mockResolvedValue(analytics);

      const result = await controller.getDistributionAnalytics(
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        { user: { tenantId: 'tenant-1' } }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(analytics);
    });

    it('should get channel performance metrics', async () => {
      const performance = {
        channel: DistributionChannel.EMAIL,
        totalSent: 500,
        delivered: 450,
        failed: 25,
        pending: 25,
        deliveryRate: 0.9,
        averageDeliveryTime: 1.2,
        costPerDelivery: 0.05,
      };

      jest.spyOn(metricsService, 'getChannelPerformance').mockResolvedValue(performance);

      const result = await controller.getChannelPerformance(DistributionChannel.EMAIL, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(performance);
    });

    it('should get rule effectiveness metrics', async () => {
      const effectiveness = {
        ruleId: 'rule-1',
        ruleName: 'High Value Rule',
        totalEvaluations: 200,
        assignmentsCreated: 180,
        successRate: 0.9,
        averageDeliveryTime: 2.1,
        revenueImpact: 50000,
      };

      jest.spyOn(metricsService, 'getRuleEffectiveness').mockResolvedValue(effectiveness);

      const result = await controller.getRuleEffectiveness('rule-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(effectiveness);
    });

    it('should generate comprehensive report', async () => {
      const reportData = {
        reportId: 'report-1',
        period: { startDate: '2024-01-01', endDate: '2024-01-31' },
        generatedAt: new Date(),
        summary: {
          totalDistributions: 1000,
          successRate: 0.85,
          totalRevenue: 1000000,
          costSavings: 50000,
        },
        details: {
          channelMetrics: {},
          ruleMetrics: {},
          trendAnalysis: {},
        },
      };

      jest.spyOn(metricsService, 'generateReport').mockResolvedValue(reportData);

      const result = await controller.generateReport(
        { startDate: '2024-01-01', endDate: '2024-01-31', format: 'pdf' },
        { user: { tenantId: 'tenant-1' } }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(reportData);
    });
  });

  describe('Dynamic Pricing', () => {
    it('should calculate optimal pricing', async () => {
      const pricingRequest = {
        invoiceData: {
          amount: 10000,
          customerSegment: 'premium',
          industry: 'technology',
          region: 'us-west',
        },
        distributionChannels: [DistributionChannel.EMAIL, DistributionChannel.SMS],
      };

      const pricingResult = {
        optimalPricing: {
          basePrice: 0.05,
          adjustedPrice: 0.045,
          discount: 0.005,
          reasoning: 'High-value customer with premium segment',
        },
        alternatives: [
          { channel: DistributionChannel.EMAIL, price: 0.03, confidence: 0.9 },
          { channel: DistributionChannel.SMS, price: 0.08, confidence: 0.8 },
        ],
        expectedROI: 1.5,
      };

      jest.spyOn(pricingService, 'calculateOptimalPricing').mockResolvedValue(pricingResult);

      const result = await controller.calculateOptimalPricing(pricingRequest, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(pricingResult);
    });

    it('should get pricing recommendations', async () => {
      const recommendations = {
        currentPricing: { channel: DistributionChannel.EMAIL, price: 0.05 },
        recommendations: [
          {
            action: 'Reduce price by 20%',
            newPrice: 0.04,
            expectedImpact: 'Increase volume by 30%',
            confidence: 0.85,
          },
          {
            action: 'Add premium tier',
            newPrice: 0.08,
            expectedImpact: 'Capture high-value segment',
            confidence: 0.75,
          },
        ],
        marketAnalysis: {
          competitorPricing: { min: 0.03, max: 0.07, average: 0.05 },
          marketTrend: 'stable',
        },
      };

      jest.spyOn(pricingService, 'getPricingRecommendations').mockResolvedValue(recommendations);

      const result = await controller.getPricingRecommendations(DistributionChannel.EMAIL, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(recommendations);
    });

    it('should update pricing strategy', async () => {
      const strategyUpdate = {
        channelId: DistributionChannel.EMAIL,
        basePrice: 0.04,
        pricingRules: [
          { condition: 'amount > 10000', adjustment: -0.01 },
          { condition: 'customerSegment = premium', adjustment: -0.005 },
        ],
        effectiveDate: new Date(),
      };

      const updatedStrategy = {
        channelId: DistributionChannel.EMAIL,
        basePrice: 0.04,
        pricingRules: strategyUpdate.pricingRules,
        lastUpdated: new Date(),
        status: 'active',
      };

      jest.spyOn(pricingService, 'updatePricingStrategy').mockResolvedValue(updatedStrategy);

      const result = await controller.updatePricingStrategy(strategyUpdate, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedStrategy);
    });
  });

  describe('Batch Operations', () => {
    it('should bulk create assignments', async () => {
      const bulkData = {
        assignments: [
          {
            invoiceId: 'invoice-1',
            customerId: 'customer-1',
            assignedChannel: DistributionChannel.EMAIL,
            assignmentReason: 'Bulk import',
          },
          {
            invoiceId: 'invoice-2',
            customerId: 'customer-2',
            assignedChannel: DistributionChannel.SMS,
            assignmentReason: 'Bulk import',
          },
        ],
      };

      const results = {
        total: 2,
        successful: 2,
        failed: 0,
        assignments: [mockAssignment, { ...mockAssignment, id: 'assignment-2' }],
      };

      jest.spyOn(distributionService, 'bulkCreateAssignments').mockResolvedValue(results);

      const result = await controller.bulkCreateAssignments(bulkData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(results);
    });

    it('should bulk update assignments', async () => {
      const bulkUpdate = {
        assignmentIds: ['assignment-1', 'assignment-2'],
        updateData: { distributionStatus: DistributionStatus.SENT },
      };

      const updateResults = {
        total: 2,
        successful: 2,
        failed: 0,
        updatedAssignments: [mockAssignment, { ...mockAssignment, id: 'assignment-2', distributionStatus: DistributionStatus.SENT }],
      };

      jest.spyOn(distributionService, 'bulkUpdateAssignments').mockResolvedValue(updateResults);

      const result = await controller.bulkUpdateAssignments(bulkUpdate, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updateResults);
    });
  });

  describe('Error Handling', () => {
    it('should handle rule not found error', async () => {
      const error = new Error('Distribution rule not found');
      jest.spyOn(distributionService, 'getDistributionRuleById').mockRejectedValue(error);

      const result = await controller.getDistributionRule('invalid-id', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Distribution rule not found');
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        ruleName: '',
        ruleType: 'invalid-type',
        conditions: null,
      };

      const result = await controller.createDistributionRule(invalidData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should handle service unavailability', async () => {
      const error = new Error('Service temporarily unavailable');
      jest.spyOn(distributionService, 'listDistributionRules').mockRejectedValue(error);

      const result = await controller.listDistributionRules({}, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service temporarily unavailable');
    });
  });

  describe('Authorization Tests', () => {
    it('should allow admin to create rules', async () => {
      const adminUser = { id: 'admin-1', tenantId: 'tenant-1', role: 'admin' };
      const createRuleDto = {
        ruleName: 'Admin Rule',
        ruleType: DistributionRuleType.AMOUNT_BASED,
        conditions: { minAmount: 5000 },
        targetChannel: DistributionChannel.EMAIL,
      };

      jest.spyOn(distributionService, 'createDistributionRule').mockResolvedValue(mockRule);

      const result = await controller.createDistributionRule(createRuleDto, { user: adminUser });

      expect(result.success).toBe(true);
    });

    it('should restrict access based on tenant', async () => {
      const otherTenantUser = { id: 'user-2', tenantId: 'other-tenant' };
      jest.spyOn(distributionService, 'getDistributionRuleById').mockRejectedValue(new Error('Access denied'));

      const result = await controller.getDistributionRule('rule-1', { user: otherTenantUser });

      expect(result.success).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 20 }, () =>
        controller.getDistributionRule('rule-1', { user: { tenantId: 'tenant-1' } })
      );

      jest.spyOn(distributionService, 'getDistributionRuleById').mockResolvedValue(mockRule);

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const endTime = Date.now();

      expect(results).toHaveLength(20);
      expect(results.every(result => result.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large assignment lists efficiently', async () => {
      const largeAssignmentList = Array.from({ length: 100 }, (_, i) => ({
        ...mockAssignment,
        id: `assignment-${i}`,
        invoiceId: `invoice-${i}`,
      }));

      jest.spyOn(distributionService, 'listDistributionAssignments').mockResolvedValue(largeAssignmentList);

      const startTime = Date.now();
      const result = await controller.listDistributionAssignments({ limit: 100 }, { user: { tenantId: 'tenant-1' } });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields in create rule', async () => {
      const invalidRule = {
        ruleName: '',
        ruleType: 'invalid',
        conditions: null,
        targetChannel: '',
      };

      const result = await controller.createDistributionRule(invalidRule, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should validate distribution status transitions', async () => {
      const invalidTransition = {
        distributionStatus: 'invalid-status',
      };

      const result = await controller.updateDistributionAssignment('assignment-1', invalidTransition, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should validate date ranges in analytics requests', async () => {
      const invalidDateRange = {
        startDate: '2024-01-31',
        endDate: '2024-01-01', // End before start
      };

      const result = await controller.getDistributionAnalytics(invalidDateRange, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('Integration Tests', () => {
    it('should integrate all services for complete distribution workflow', async () => {
      // Create rule -> Create assignment -> Orchestrate -> Get analytics
      const createRuleDto = {
        ruleName: 'Integration Test Rule',
        ruleType: DistributionRuleType.AMOUNT_BASED,
        conditions: { minAmount: 10000 },
        targetChannel: DistributionChannel.EMAIL,
      };

      const invoiceData = {
        tenantId: 'tenant-1',
        invoiceId: 'invoice-1',
        customerId: 'customer-1',
        amount: 15000,
        dueDate: new Date(),
        customerData: { segment: 'premium' },
      };

      jest.spyOn(distributionService, 'createDistributionRule').mockResolvedValue(mockRule);
      jest.spyOn(distributionService, 'evaluateAndCreateAssignments').mockResolvedValue([mockAssignment]);
      jest.spyOn(orchestratorService, 'orchestrateDistribution').mockResolvedValue({
        orchestrationId: 'orch-1',
        status: 'completed',
      });

      const createdRule = await controller.createDistributionRule(createRuleDto, { user: { tenantId: 'tenant-1' } });
      const assignments = await controller.evaluateAndCreateAssignments(invoiceData, { user: { tenantId: 'tenant-1' } });
      const orchestration = await controller.orchestrateDistribution(
        { assignmentIds: [mockAssignment.id] },
        { user: { tenantId: 'tenant-1' } }
      );

      expect(createdRule.success).toBe(true);
      expect(assignments.success).toBe(true);
      expect(orchestration.success).toBe(true);
    });
  });
});
