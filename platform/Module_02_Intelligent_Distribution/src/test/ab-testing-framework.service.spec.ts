import { Test, TestingModule } from '@nestjs/testing';
import { ABTestingFrameworkService } from '../services/ab-testing-framework.service';
import { DistributionRecord } from '../entities/distribution-record.entity';
import { DistributionAssignment } from '../entities/distribution-assignment.entity';

describe('A/B Testing Framework Service', () => {
  let service: ABTestingFrameworkService;
  let mockRecordRepository: jest.Mocked<Repository<DistributionRecord>>;
  let mockAssignmentRepository: jest.Mocked<Repository<DistributionAssignment>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ABTestingFrameworkService,
        {
          provide: 'DistributionRecordRepository',
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: 'DistributionAssignmentRepository',
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ABTestingFrameworkService>(ABTestingFrameworkService);
    mockRecordRepository = module.get('DistributionRecordRepository');
    mockAssignmentRepository = module.get('DistributionAssignmentRepository');
  });

  describe('Test Creation and Management', () => {
    it('should create a new A/B test', async () => {
      const testData = {
        name: 'Email Subject Line Test',
        description: 'Testing different email subject lines',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: {
          control: { subject: 'Original Subject' },
          variantA: { subject: 'New Subject' },
        },
        confidence: 0.95,
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);

      expect(test.id).toBeDefined();
      expect(test.name).toBe(testData.name);
      expect(test.status).toBe('draft');
      expect(test.trafficSplit).toEqual(testData.trafficSplit);
      expect(test.configurations).toEqual(testData.configurations);
      expect(test.confidence).toBe(testData.confidence);
      expect(test.createdAt).toBeInstanceOf(Date);
    });

    it('should start an A/B test', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      const startedTest = await service.startABTest(test.id);

      expect(startedTest.status).toBe('running');
      expect(startedTest.startDate).toBeInstanceOf(Date);
    });

    it('should pause an A/B test', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);
      const pausedTest = await service.pauseABTest(test.id);

      expect(pausedTest.status).toBe('paused');
    });

    it('should complete an A/B test', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);
      
      // Add some test events
      await service.recordTestEvent(test.id, 'control', 'participant');
      await service.recordTestEvent(test.id, 'variantA', 'participant');
      await service.recordTestEvent(test.id, 'control', 'conversion');
      
      const completedTest = await service.completeABTest(test.id);

      expect(completedTest.status).toBe('completed');
      expect(completedTest.endDate).toBeInstanceOf(Date);
    });

    it('should throw error when starting non-existent test', async () => {
      await expect(service.startABTest('non-existent')).rejects.toThrow('Test non-existent not found');
    });

    it('should throw error when starting already running test', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      await expect(service.startABTest(test.id)).rejects.toThrow('is not in draft status');
    });
  });

  describe('Traffic Assignment', () => {
    it('should assign users to test variants consistently', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      // Test consistent assignment for same user
      const assignment1 = await service.getTestAssignment(test.id, 'user-123');
      const assignment2 = await service.getTestAssignment(test.id, 'user-123');

      expect(assignment1).toBe(assignment2);
      expect(['control', 'variantA']).toContain(assignment1);
    });

    it('should distribute traffic according to split ratios', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 70, variantA: 30 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      // Test with many users to verify distribution
      const assignments = [];
      for (let i = 0; i < 1000; i++) {
        assignments.push(await service.getTestAssignment(test.id, `user-${i}`));
      }

      const controlCount = assignments.filter(a => a === 'control').length;
      const variantACount = assignments.filter(a => a === 'variantA').length;

      // Should be approximately 70/30 split (allowing for some variance)
      expect(controlCount / 1000).toBeGreaterThan(0.65);
      expect(controlCount / 1000).toBeLessThan(0.75);
      expect(variantACount / 1000).toBeGreaterThan(0.25);
      expect(variantACount / 1000).toBeLessThan(0.35);
    });

    it('should handle three-way traffic splits', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 34, variantA: 33, variantB: 33 },
        configurations: { control: {}, variantA: {}, variantB: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      const assignment = await service.getTestAssignment(test.id, 'user-123');

      expect(['control', 'variantA', 'variantB']).toContain(assignment);
    });

    it('should default to control for non-running tests', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      // Don't start the test

      const assignment = await service.getTestAssignment(test.id, 'user-123');

      expect(assignment).toBe('control');
    });
  });

  describe('Event Recording and Metrics', () => {
    it('should record participant events', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      await service.recordTestEvent(test.id, 'control', 'participant');
      await service.recordTestEvent(test.id, 'variantA', 'participant');

      const metrics = test.metrics;

      expect(metrics.control.participants).toBe(1);
      expect(metrics.variantA.participants).toBe(1);
    });

    it('should record conversion events and calculate rates', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      // Add participants
      await service.recordTestEvent(test.id, 'control', 'participant');
      await service.recordTestEvent(test.id, 'control', 'participant');
      await service.recordTestEvent(test.id, 'variantA', 'participant');
      await service.recordTestEvent(test.id, 'variantA', 'participant');

      // Add conversions
      await service.recordTestEvent(test.id, 'control', 'conversion');
      await service.recordTestEvent(test.id, 'variantA', 'conversion');

      const metrics = test.metrics;

      expect(metrics.control.conversions).toBe(1);
      expect(metrics.control.conversionRate).toBe(0.5); // 1/2
      expect(metrics.variantA.conversions).toBe(1);
      expect(metrics.variantA.conversionRate).toBe(0.5); // 1/2
    });

    it('should track revenue from conversions', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      await service.recordTestEvent(test.id, 'control', 'participant');
      await service.recordTestEvent(test.id, 'control', 'conversion', { revenue: 100 });

      const metrics = test.metrics;

      expect(metrics.control.revenue).toBe(100);
    });

    it('should calculate cost per conversion', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      await service.recordTestEvent(test.id, 'control', 'participant');
      await service.recordTestEvent(test.id, 'control', 'conversion');

      const metrics = test.metrics;

      expect(metrics.control.costPerConversion).toBe(0.05); // $0.05 per participant
    });

    it('should handle bounce and error events', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      await service.recordTestEvent(test.id, 'control', 'bounce');
      await service.recordTestEvent(test.id, 'variantA', 'error');

      const metrics = test.metrics;

      expect(metrics.control.bounceRate).toBe(1);
      expect(metrics.variantA.errorRate).toBe(1);
    });
  });

  describe('Statistical Analysis', () => {
    it('should perform chi-square test for statistical significance', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      // Add significant difference in conversions
      for (let i = 0; i < 100; i++) {
        await service.recordTestEvent(test.id, 'control', 'participant');
        await service.recordTestEvent(test.id, 'variantA', 'participant');
      }

      // Control: 10% conversion rate
      for (let i = 0; i < 10; i++) {
        await service.recordTestEvent(test.id, 'control', 'conversion');
      }

      // Variant A: 20% conversion rate
      for (let i = 0; i < 20; i++) {
        await service.recordTestEvent(test.id, 'variantA', 'conversion');
      }

      const statistical = await service['performStatisticalTest'](test);

      expect(statistical.chiSquare).toBeGreaterThan(0);
      expect(statistical.pValue).toBeLessThan(0.05); // Should be significant
      expect(statistical.isSignificant).toBe(true);
      expect(statistical.winner).toBe('variantA');
    });

    it('should calculate statistical power', async () => {
      const power = service['calculateStatisticalPower'](0.1, 0.2, 1000, 1000);

      expect(power).toBeGreaterThan(0);
      expect(power).toBeLessThanOrEqual(1);
    });

    it('should handle edge cases in statistical calculations', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      // No data
      const statistical = await service['performStatisticalTest'](test);

      expect(statistical.chiSquare).toBe(0);
      expect(statistical.pValue).toBe(0.05);
      expect(statistical.isSignificant).toBe(false);
    });
  });

  describe('Test Management and Analytics', () => {
    it('should get active tests', async () => {
      const testData1 = {
        name: 'Test 1',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const testData2 = {
        name: 'Test 2',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test1 = await service.createABTest(testData1);
      const test2 = await service.createABTest(testData2);

      await service.startABTest(test1.id);
      // test2 remains in draft status

      const activeTests = await service.getActiveTests();

      expect(activeTests).toHaveLength(1);
      expect(activeTests[0].id).toBe(test1.id);
      expect(activeTests[0].status).toBe('running');
    });

    it('should get test history', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);
      await service.completeABTest(test.id);

      const history = await service.getTestHistory();

      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('completed');
    });

    it('should generate comprehensive test results', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      // Add test data
      await service.recordTestEvent(test.id, 'control', 'participant');
      await service.recordTestEvent(test.id, 'variantA', 'participant');
      await service.recordTestEvent(test.id, 'variantA', 'conversion');

      const results = await service.getTestResults(test.id);

      expect(results.test).toBeDefined();
      expect(results.statistical).toBeDefined();
      expect(results.recommendations).toBeDefined();
      expect(Array.isArray(results.recommendations)).toBe(true);
    });

    it('should generate meaningful recommendations', async () => {
      const test = {
        metrics: {
          control: { conversionRate: 0.1, participants: 100 },
          variantA: { conversionRate: 0.2, participants: 100 },
        },
      };

      const statistical = {
        isSignificant: true,
        confidence: 0.95,
        power: 0.8,
        winner: 'variantA',
      };

      const recommendations = service['generateRecommendations'](test, statistical);

      expect(recommendations).toContain('Statistically significant winner identified: variantA');
      expect(recommendations).toContain('Confidence level: 95.0%');
    });

    it('should provide test analytics', async () => {
      const testData1 = {
        name: 'Test 1',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test1 = await service.createABTest(testData1);
      await service.startABTest(test1.id);
      await service.completeABTest(test1.id);

      const analytics = await service.getTestAnalytics('tenant-1');

      expect(analytics.activeTests).toBe(0);
      expect(analytics.completedTests).toBe(1);
      expect(analytics.totalTests).toBe(1);
      expect(analytics.statisticalSignificanceRate).toBeGreaterThanOrEqual(0);
      expect(analytics.averageImprovement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Hashing and Assignment Logic', () => {
    it('should generate consistent hashes for same input', async () => {
      const hash1 = service['hashString']('test-user');
      const hash2 = service['hashString']('test-user');

      expect(hash1).toBe(hash2);
      expect(hash1).toBeGreaterThanOrEqual(0);
    });

    it('should generate different hashes for different inputs', async () => {
      const hash1 = service['hashString']('user-1');
      const hash2 = service['hashString']('user-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string input', async () => {
      const hash = service['hashString']('');

      expect(hash).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid test IDs gracefully', async () => {
      await expect(service.getTestAssignment('invalid', 'user')).resolves.toBe('control');
      await expect(service.recordTestEvent('invalid', 'control', 'participant')).resolves.not.toThrow();
    });

    it('should handle recording events for non-existent variants', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      await expect(service.recordTestEvent(test.id, 'non-existent', 'participant')).resolves.not.toThrow();
    });

    it('should handle zero participants in calculations', async () => {
      const test = {
        metrics: {
          control: { participants: 0, conversions: 0 },
          variantA: { participants: 0, conversions: 0 },
        },
      };

      const statistical = await service['performStatisticalTest'](test);

      expect(statistical.chiSquare).toBe(0);
      expect(statistical.isSignificant).toBe(false);
    });
  });

  describe('Scheduled Operations', () => {
    it('should update test metrics periodically', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      // Mock database update
      mockRecordRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      await expect(service.updateTestMetrics()).resolves.not.toThrow();
    });

    it('should automatically complete significant tests', async () => {
      const testData = {
        name: 'Test',
        tenantId: 'tenant-1',
        trafficSplit: { control: 50, variantA: 50 },
        configurations: { control: {}, variantA: {} },
        createdBy: 'user-1',
      };

      const test = await service.createABTest(testData);
      await service.startABTest(test.id);

      // Mock test as 15 days old and significant
      test.startDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      test.statisticalSignificance = true;

      await expect(service.performAutomaticTestCompletion()).resolves.not.toThrow();
    });
  });
});
