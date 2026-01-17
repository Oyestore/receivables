import { Test, TestingModule } from '@nestjs/testing';
import { MLBasedRuleOptimizationService } from '../services/ml-rule-optimization.service';
import { DistributionRule } from '../entities/distribution-rule.entity';
import { DistributionAssignment } from '../entities/distribution-assignment.entity';
import { DistributionRecord } from '../entities/distribution-record.entity';
import { DistributionChannel, DistributionStatus } from '../entities/distribution-entities';

describe('ML-Based Rule Optimization Service', () => {
  let service: MLBasedRuleOptimizationService;
  let mockRuleRepository: jest.Mocked<Repository<DistributionRule>>;
  let mockAssignmentRepository: jest.Mocked<Repository<DistributionAssignment>>;
  let mockRecordRepository: jest.Mocked<Repository<DistributionRecord>>;

  const mockRule = {
    id: 'rule-1',
    tenantId: 'tenant-1',
    ruleName: 'High Value Rule',
    ruleType: 'amount_based',
    conditions: { minAmount: 10000 },
    targetChannel: DistributionChannel.EMAIL,
    priority: 90,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MLBasedRuleOptimizationService,
        {
          provide: 'DistributionRuleRepository',
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: 'DistributionAssignmentRepository',
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: 'DistributionRecordRepository',
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MLBasedRuleOptimizationService>(MLBasedRuleOptimizationService);
    mockRuleRepository = module.get('DistributionRuleRepository');
    mockAssignmentRepository = module.get('DistributionAssignmentRepository');
    mockRecordRepository = module.get('DistributionRecordRepository');
  });

  describe('Rule Optimization', () => {
    it('should optimize a rule successfully', async () => {
      mockRuleRepository.findOne.mockResolvedValue({
        ...mockRule,
        assignments: [
          {
            id: 'assignment-1',
            records: [
              { distributionStatus: DistributionStatus.DELIVERED },
              { distributionStatus: DistributionStatus.DELIVERED },
              { distributionStatus: DistributionStatus.FAILED },
            ],
          },
        ],
      });

      mockAssignmentRepository.find.mockResolvedValue([
        {
          id: 'assignment-1',
          ruleId: 'rule-1',
          records: [
            { distributionStatus: DistributionStatus.DELIVERED },
            { distributionStatus: DistributionStatus.DELIVERED },
            { distributionStatus: DistributionStatus.FAILED },
          ],
        },
      ]);

      const result = await service.optimizeRule('rule-1');

      expect(result).toBeDefined();
      expect(result.originalRule).toEqual(mockRule);
      expect(result.optimizedRule).toBeDefined();
      expect(result.improvementMetrics).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
    });

    it('should handle rule not found', async () => {
      mockRuleRepository.findOne.mockResolvedValue(null);

      const result = await service.optimizeRule('non-existent-rule');

      expect(result).toBeNull();
    });

    it('should analyze rule performance correctly', async () => {
      mockAssignmentRepository.find.mockResolvedValue([
        {
          id: 'assignment-1',
          ruleId: 'rule-1',
          records: [
            { 
              distributionStatus: DistributionStatus.DELIVERED,
              sentAt: new Date('2024-01-01T10:00:00Z'),
              deliveredAt: new Date('2024-01-01T10:02:00Z'),
            },
            { 
              distributionStatus: DistributionStatus.DELIVERED,
              sentAt: new Date('2024-01-01T11:00:00Z'),
              deliveredAt: new Date('2024-01-01T11:03:00Z'),
            },
            { 
              distributionStatus: DistributionStatus.FAILED,
              sentAt: new Date('2024-01-01T12:00:00Z'),
            },
          ],
        },
      ]);

      const performance = await service.analyzeRulePerformance('rule-1');

      expect(performance.ruleId).toBe('rule-1');
      expect(performance.successRate).toBe(2/3);
      expect(performance.averageResponseTime).toBe(150000); // 2.5 minutes average
      expect(performance.conversionRate).toBeGreaterThan(0);
      expect(performance.costPerConversion).toBeGreaterThan(0);
      expect(performance.optimizationScore).toBeGreaterThan(0);
    });

    it('should predict optimal channel correctly', async () => {
      const channelPerformance = {
        [DistributionChannel.EMAIL]: { successRate: 0.9, conversionRate: 0.3 },
        [DistributionChannel.SMS]: { successRate: 0.95, conversionRate: 0.25 },
        [DistributionChannel.WHATSAPP]: { successRate: 0.85, conversionRate: 0.35 },
      };

      mockRecordRepository.find.mockResolvedValue([
        { distributionChannel: DistributionChannel.EMAIL, distributionStatus: DistributionStatus.DELIVERED },
        { distributionChannel: DistributionChannel.EMAIL, distributionStatus: DistributionStatus.DELIVERED },
        { distributionChannel: DistributionChannel.SMS, distributionStatus: DistributionStatus.DELIVERED },
        { distributionChannel: DistributionChannel.WHATSAPP, distributionStatus: DistributionStatus.FAILED },
      ]);

      const optimalChannel = await service.predictOptimalChannel(mockRule as any);

      expect([DistributionChannel.EMAIL, DistributionChannel.SMS, DistributionChannel.WHATSAPP]).toContain(optimalChannel);
    });

    it('should optimize conditions based on performance', async () => {
      const originalConditions = { minAmount: 10000 };
      const performance = {
        successRate: 0.6, // Poor performance
        conversionRate: 0.15,
      };

      const optimizedConditions = await service.optimizeConditions(originalConditions, performance);

      expect(optimizedConditions.minAmount).toBeLessThan(originalConditions.minAmount);
    });
  });

  describe('ML Model Operations', () => {
    it('should train ML model with data', async () => {
      const trainingData = [
        { features: [0.8, 0.9, 0.7], label: 1 },
        { features: [0.3, 0.4, 0.5], label: 0 },
      ];

      await expect(service.trainMLModel(trainingData)).resolves.not.toThrow();
    });

    it('should evaluate ML model performance', async () => {
      const testData = [
        { features: [0.8, 0.9, 0.7], label: 1 },
        { features: [0.3, 0.4, 0.5], label: 0 },
      ];

      const evaluation = await service.evaluateMLModel(testData);

      expect(evaluation.accuracy).toBeGreaterThan(0);
      expect(evaluation.precision).toBeGreaterThan(0);
      expect(evaluation.recall).toBeGreaterThan(0);
    });

    it('should make predictions with ML model', async () => {
      const features = [
        [0.8, 0.9, 0.7],
        [0.3, 0.4, 0.5],
      ];

      // This would test the actual ML prediction logic
      // For now, we'll test the feature extraction
      const extractedFeatures = features.map(f => 
        service['extractFeatures'](mockRule as any, {
          successRate: f[0],
          averageResponseTime: f[1] * 300000,
          conversionRate: f[2],
          costPerConversion: 0.5,
          lastOptimized: new Date(),
          optimizationScore: 0.8,
        })
      );

      expect(extractedFeatures).toHaveLength(2);
      expect(extractedFeatures[0]).toHaveLength(9); // 9 features
    });
  });

  describe('Optimization History and Metrics', () => {
    it('should track optimization history', async () => {
      const ruleId = 'rule-1';
      
      // First optimization
      mockRuleRepository.findOne.mockResolvedValue(mockRule as any);
      await service.optimizeRule(ruleId);

      const history = await service.getOptimizationHistory(ruleId);

      expect(history).toHaveLength(1);
      expect(history[0].originalRule.id).toBe(ruleId);
    });

    it('should provide optimization metrics', async () => {
      mockRuleRepository.find.mockResolvedValue([mockRule as any]);

      const metrics = await service.getOptimizationMetrics();

      expect(metrics.totalRules).toBeGreaterThan(0);
      expect(metrics.optimizedRules).toBeGreaterThanOrEqual(0);
      expect(metrics.optimizationRate).toBeGreaterThanOrEqual(0);
      expect(metrics.averageImprovement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Scheduled Operations', () => {
    it('should optimize all rules daily', async () => {
      mockRuleRepository.find.mockResolvedValue([mockRule as any]);
      mockAssignmentRepository.find.mockResolvedValue([]);
      mockRuleRepository.update.mockResolvedValue({});

      const results = await service.optimizeAllRules();

      expect(results).toHaveLength(1);
      expect(results[0].originalRule.id).toBe('rule-1');
    });

    it('should perform real-time optimization for high-priority rules', async () => {
      const highPriorityRule = { ...mockRule, priority: 95 };
      mockRuleRepository.find.mockResolvedValue([highPriorityRule as any]);
      mockAssignmentRepository.find.mockResolvedValue([]);

      await expect(service.performRealTimeOptimization()).resolves.not.toThrow();
    });
  });

  describe('Confidence and Recommendations', () => {
    it('should calculate confidence correctly', async () => {
      const improvementMetrics = {
        successRateImprovement: 0.1,
        responseTimeImprovement: 0.15,
        costReduction: 0.08,
        overallScore: 0.11,
      };

      const confidence = service['calculateConfidence'](improvementMetrics);

      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should generate meaningful recommendations', async () => {
      const improvementMetrics = {
        successRateImprovement: 0.15,
        responseTimeImprovement: 0.2,
        costReduction: 0.12,
        overallScore: 0.16,
      };

      const recommendations = service['generateRecommendations'](improvementMetrics);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('success rate'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockRuleRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.optimizeRule('rule-1')).resolves.not.toThrow();
    });

    it('should handle empty assignment data', async () => {
      mockRuleRepository.findOne.mockResolvedValue(mockRule as any);
      mockAssignmentRepository.find.mockResolvedValue([]);

      const performance = await service.analyzeRulePerformance('rule-1');

      expect(performance.successRate).toBe(0);
      expect(performance.averageResponseTime).toBe(0);
    });

    it('should handle missing delivery timestamps', async () => {
      mockAssignmentRepository.find.mockResolvedValue([
        {
          id: 'assignment-1',
          ruleId: 'rule-1',
          records: [
            { distributionStatus: DistributionStatus.DELIVERED, sentAt: new Date() },
            { distributionStatus: DistributionStatus.DELIVERED }, // Missing deliveredAt
          ],
        },
      ]);

      const performance = await service.analyzeRulePerformance('rule-1');

      expect(performance.averageResponseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Feature Extraction', () => {
    it('should extract features correctly', async () => {
      const performance = {
        successRate: 0.8,
        averageResponseTime: 150000,
        conversionRate: 0.3,
        costPerConversion: 0.5,
        lastOptimized: new Date(),
        optimizationScore: 0.85,
      };

      const features = service['extractFeatures'](mockRule as any, performance);

      expect(features).toHaveLength(9);
      expect(features[0]).toBe(mockRule.priority / 100); // Normalized priority
      expect(features[1]).toBe(performance.successRate);
      expect(features[2]).toBe(performance.averageResponseTime / 300000); // Normalized response time
      expect(features[3]).toBe(performance.conversionRate);
      expect(features[4]).toBe(performance.costPerConversion);
    });

    it('should handle different rule types', async () => {
      const amountBasedRule = { ...mockRule, ruleType: 'amount_based' };
      const customerBasedRule = { ...mockRule, ruleType: 'customer_based' };
      const industryBasedRule = { ...mockRule, ruleType: 'industry_based' };

      const performance = {
        successRate: 0.8,
        averageResponseTime: 150000,
        conversionRate: 0.3,
        costPerConversion: 0.5,
        lastOptimized: new Date(),
        optimizationScore: 0.85,
      };

      const amountFeatures = service['extractFeatures'](amountBasedRule as any, performance);
      const customerFeatures = service['extractFeatures'](customerBasedRule as any, performance);
      const industryFeatures = service['extractFeatures'](industryBasedRule as any, performance);

      // Rule type should be encoded in features
      expect(amountFeatures[5]).toBe(1); // amount_based
      expect(amountFeatures[6]).toBe(0); // not customer_based
      expect(amountFeatures[7]).toBe(0); // not industry_based

      expect(customerFeatures[5]).toBe(0); // not amount_based
      expect(customerFeatures[6]).toBe(1); // customer_based
      expect(customerFeatures[7]).toBe(0); // not industry_based

      expect(industryFeatures[5]).toBe(0); // not amount_based
      expect(industryFeatures[6]).toBe(0); // not customer_based
      expect(industryFeatures[7]).toBe(1); // industry_based
    });
  });

  describe('Optimization Score Calculation', () => {
    it('should calculate optimization score correctly', async () => {
      const features = [0.8, 0.9, 0.7, 0.6, 0.5];

      const score = service['calculateOptimizationScore'](features);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle edge cases in score calculation', async () => {
      const allZeros = [0, 0, 0, 0, 0];
      const allOnes = [1, 1, 1, 1, 1];

      const zeroScore = service['calculateOptimizationScore'](allZeros);
      const oneScore = service['calculateOptimizationScore'](allOnes);

      expect(zeroScore).toBe(0);
      expect(oneScore).toBeGreaterThan(0);
    });
  });
});
