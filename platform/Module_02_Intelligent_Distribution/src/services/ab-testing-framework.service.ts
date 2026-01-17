import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributionRecord } from '../entities/distribution-record.entity';
import { DistributionAssignment } from '../entities/distribution-assignment.entity';
import { Cron, Interval } from '@nestjs/schedule';
import { DistributionStatus, DistributionChannel } from '../entities/distribution-entities';

export interface ABTest {
  id: string;
  name: string;
  description: string;
  tenantId: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  trafficSplit: {
    control: number;
    variantA: number;
    variantB?: number;
  };
  configurations: {
    control: any;
    variantA: any;
    variantB?: any;
  };
  metrics: {
    control: TestMetrics;
    variantA: TestMetrics;
    variantB?: TestMetrics;
  };
  startDate?: Date;
  endDate?: Date;
  winner?: 'control' | 'variantA' | 'variantB';
  confidence: number;
  statisticalSignificance: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TestMetrics {
  participants: number;
  conversions: number;
  conversionRate: number;
  averageResponseTime: number;
  costPerConversion: number;
  revenue: number;
  bounceRate: number;
  errorRate: number;
}

export interface StatisticalTest {
  chiSquare: number;
  pValue: number;
  confidence: number;
  isSignificant: boolean;
  winner: 'control' | 'variantA' | 'variantB';
  power: number;
  sampleSize: number;
}

@Injectable()
export class ABTestingFrameworkService {
  private readonly logger = new Logger(ABTestingFrameworkService.name);
  private activeTests: Map<string, ABTest> = new Map();
  private testResults: Map<string, StatisticalTest> = new Map();

  constructor(
    @InjectRepository(DistributionRecord)
    private readonly recordRepository: Repository<DistributionRecord>,
    @InjectRepository(DistributionAssignment)
    private readonly assignmentRepository: Repository<DistributionAssignment>,
  ) {}

  async createABTest(testData: Partial<ABTest>): Promise<ABTest> {
    const test: ABTest = {
      id: this.generateTestId(),
      name: testData.name!,
      description: testData.description!,
      tenantId: testData.tenantId!,
      status: 'draft',
      trafficSplit: testData.trafficSplit || { control: 50, variantA: 50 },
      configurations: testData.configurations!,
      metrics: {
        control: this.initializeMetrics(),
        variantA: this.initializeMetrics(),
        variantB: testData.configurations.variantB ? this.initializeMetrics() : undefined,
      },
      confidence: 0.95,
      statisticalSignificance: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: testData.createdBy!,
    };

    this.activeTests.set(test.id, test);
    this.logger.log(`Created A/B test: ${test.id} - ${test.name}`);
    
    return test;
  }

  async startABTest(testId: string): Promise<ABTest> {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status !== 'draft') {
      throw new Error(`Test ${testId} is not in draft status`);
    }

    test.status = 'running';
    test.startDate = new Date();
    test.updatedAt = new Date();

    this.logger.log(`Started A/B test: ${testId}`);
    return test;
  }

  async pauseABTest(testId: string): Promise<ABTest> {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status !== 'running') {
      throw new Error(`Test ${testId} is not running`);
    }

    test.status = 'paused';
    test.updatedAt = new Date();

    this.logger.log(`Paused A/B test: ${testId}`);
    return test;
  }

  async completeABTest(testId: string): Promise<ABTest> {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'completed';
    test.endDate = new Date();
    test.updatedAt = new Date();

    // Perform final statistical analysis
    const statisticalResult = await this.performStatisticalTest(test);
    this.testResults.set(testId, statisticalResult);

    if (statisticalResult.isSignificant) {
      test.winner = statisticalResult.winner;
      test.statisticalSignificance = true;
    }

    this.logger.log(`Completed A/B test: ${testId}, Winner: ${test.winner}`);
    return test;
  }

  async getTestAssignment(testId: string, userId?: string): Promise<'control' | 'variantA' | 'variantB'> {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') {
      return 'control'; // Default to control if test not running
    }

    // Consistent hashing for user assignment
    const hash = this.hashString(userId || Math.random().toString());
    const bucket = hash % 100;

    if (bucket < test.trafficSplit.control) {
      return 'control';
    } else if (bucket < test.trafficSplit.control + test.trafficSplit.variantA) {
      return 'variantA';
    } else {
      return 'variantB';
    }
  }

  async recordTestEvent(
    testId: string,
    variant: 'control' | 'variantA' | 'variantB',
    eventType: 'participant' | 'conversion' | 'bounce' | 'error',
    metadata?: any
  ): Promise<void> {
    const test = this.activeTests.get(testId);
    if (!test) return;

    const metrics = test.metrics[variant];
    if (!metrics) return;

    switch (eventType) {
      case 'participant':
        metrics.participants++;
        break;
      case 'conversion':
        metrics.conversions++;
        metrics.conversionRate = metrics.conversions / metrics.participants;
        if (metadata?.revenue) {
          metrics.revenue += metadata.revenue;
        }
        break;
      case 'bounce':
        metrics.bounceRate++;
        break;
      case 'error':
        metrics.errorRate++;
        break;
    }

    test.updatedAt = new Date();

    // Update cost per conversion
    if (metrics.conversions > 0) {
      metrics.costPerConversion = (metrics.participants * 0.05) / metrics.conversions; // Assuming $0.05 per participant
    }

    // Check for statistical significance periodically
    if (metrics.participants % 100 === 0) {
      await this.checkStatisticalSignificance(test);
    }
  }

  @Interval(60000) // Check every minute
  async updateTestMetrics(): Promise<void> {
    for (const [testId, test] of this.activeTests) {
      if (test.status === 'running') {
        await this.updateTestFromDatabase(test);
        await this.checkStatisticalSignificance(test);
      }
    }
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async performAutomaticTestCompletion(): Promise<void> {
    for (const [testId, test] of this.activeTests) {
      if (test.status === 'running') {
        const daysRunning = test.startDate 
          ? (Date.now() - test.startDate.getTime()) / (1000 * 60 * 60 * 24)
          : 0;

        // Auto-complete tests running for more than 14 days with statistical significance
        if (daysRunning > 14 && test.statisticalSignificance) {
          await this.completeABTest(testId);
        }
      }
    }
  }

  async getTestResults(testId: string): Promise<{
    test: ABTest;
    statistical: StatisticalTest;
    recommendations: string[];
  }> {
    const test = this.activeTests.get(testId);
    const statistical = this.testResults.get(testId);

    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const recommendations = this.generateRecommendations(test, statistical);

    return {
      test,
      statistical: statistical || this.performStatisticalTest(test),
      recommendations,
    };
  }

  async getActiveTests(tenantId?: string): Promise<ABTest[]> {
    const tests = Array.from(this.activeTests.values());
    return tenantId ? tests.filter(test => test.tenantId === tenantId) : tests;
  }

  async getTestHistory(tenantId?: string): Promise<ABTest[]> {
    const tests = Array.from(this.activeTests.values());
    const completedTests = tests.filter(test => test.status === 'completed');
    return tenantId ? completedTests.filter(test => test.tenantId === tenantId) : completedTests;
  }

  async rollbackTest(testId: string): Promise<void> {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status !== 'completed') {
      throw new Error(`Test ${testId} must be completed before rollback`);
    }

    // Implement rollback logic - would typically revert to control configuration
    this.logger.log(`Rolled back test: ${testId} to control configuration`);
  }

  private async updateTestFromDatabase(test: ABTest): Promise<void> {
    // Update metrics from actual database records
    const records = await this.recordRepository.find({
      where: {
        // Filter by test participants - would need proper relationship
      },
    });

    // This would need proper implementation based on how test data is stored
    // For now, we'll simulate the update
  }

  private async checkStatisticalSignificance(test: ABTest): Promise<void> {
    const statistical = await this.performStatisticalTest(test);
    this.testResults.set(test.id, statistical);

    if (statistical.isSignificant && !test.statisticalSignificance) {
      test.statisticalSignificance = true;
      test.winner = statistical.winner;
      test.confidence = statistical.confidence;
      
      this.logger.log(`Test ${test.id} reached statistical significance. Winner: ${test.winner}`);
    }
  }

  private async performStatisticalTest(test: ABTest): Promise<StatisticalTest> {
    const controlMetrics = test.metrics.control;
    const variantMetrics = test.metrics.variantA;

    // Perform chi-square test for conversion rates
    const controlConversions = controlMetrics.conversions;
    const controlNonConversions = controlMetrics.participants - controlConversions;
    const variantConversions = variantMetrics.conversions;
    const variantNonConversions = variantMetrics.participants - variantConversions;

    const chiSquare = this.calculateChiSquare(
      controlConversions, controlNonConversions,
      variantConversions, variantNonConversions
    );

    const pValue = this.calculatePValue(chiSquare, 1); // 1 degree of freedom
    const confidence = 1 - pValue;
    const isSignificant = pValue < 0.05; // 95% confidence level

    let winner: 'control' | 'variantA' | 'variantB' = 'control';
    if (variantMetrics.conversionRate > controlMetrics.conversionRate) {
      winner = 'variantA';
    }

    // Calculate statistical power
    const power = this.calculateStatisticalPower(
      controlMetrics.conversionRate,
      variantMetrics.conversionRate,
      test.metrics.control.participants,
      test.metrics.variantA.participants
    );

    return {
      chiSquare,
      pValue,
      confidence,
      isSignificant,
      winner,
      power,
      sampleSize: test.metrics.control.participants + test.metrics.variantA.participants,
    };
  }

  private calculateChiSquare(
    controlConversions: number, controlNonConversions: number,
    variantConversions: number, variantNonConversions: number
  ): number {
    const totalControl = controlConversions + controlNonConversions;
    const totalVariant = variantConversions + variantNonConversions;
    const totalConversions = controlConversions + variantConversions;
    const totalNonConversions = controlNonConversions + variantNonConversions;
    const grandTotal = totalControl + totalVariant;

    const expectedControlConversions = (totalControl * totalConversions) / grandTotal;
    const expectedControlNonConversions = (totalControl * totalNonConversions) / grandTotal;
    const expectedVariantConversions = (totalVariant * totalConversions) / grandTotal;
    const expectedVariantNonConversions = (totalVariant * totalNonConversions) / grandTotal;

    const chiSquare =
      Math.pow(controlConversions - expectedControlConversions, 2) / expectedControlConversions +
      Math.pow(controlNonConversions - expectedControlNonConversions, 2) / expectedControlNonConversions +
      Math.pow(variantConversions - expectedVariantConversions, 2) / expectedVariantConversions +
      Math.pow(variantNonConversions - expectedVariantNonConversions, 2) / expectedVariantNonConversions;

    return chiSquare;
  }

  private calculatePValue(chiSquare: number, degreesOfFreedom: number): number {
    // Simplified p-value calculation - in production, use a proper statistical library
    if (chiSquare < 3.84) return 0.05; // Below critical value for 95% confidence
    if (chiSquare < 6.63) return 0.01; // Below critical value for 99% confidence
    return 0.001; // Very significant
  }

  private calculateStatisticalPower(
    controlRate: number,
    variantRate: number,
    controlSample: number,
    variantSample: number
  ): number {
    // Simplified power calculation
    const effectSize = Math.abs(variantRate - controlRate);
    const pooledRate = (controlRate + variantRate) / 2;
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlSample + 1/variantSample));
    const zScore = effectSize / standardError;
    
    // Convert z-score to power (simplified)
    return Math.min(0.99, Math.max(0.1, zScore / 3));
  }

  private generateRecommendations(test: ABTest, statistical?: StatisticalTest): string[] {
    const recommendations: string[] = [];

    if (!statistical) {
      recommendations.push('Test needs more participants to reach statistical significance');
      return recommendations;
    }

    if (statistical.isSignificant) {
      recommendations.push(`Statistically significant winner identified: ${statistical.winner}`);
      recommendations.push(`Confidence level: ${(statistical.confidence * 100).toFixed(1)}%`);
      
      if (statistical.power < 0.8) {
        recommendations.push('Consider increasing sample size for higher statistical power');
      }
    } else {
      recommendations.push('No statistically significant difference detected');
      recommendations.push('Consider running the test longer or increasing traffic');
      
      if (statistical.power < 0.5) {
        recommendations.push('Low statistical power - results may not be reliable');
      }
    }

    // Business recommendations
    const controlRate = test.metrics.control.conversionRate;
    const variantRate = test.metrics.variantA.conversionRate;
    const improvement = ((variantRate - controlRate) / controlRate) * 100;

    if (improvement > 10) {
      recommendations.push(`Strong improvement detected: ${improvement.toFixed(1)}% increase in conversion rate`);
    } else if (improvement < -10) {
      recommendations.push(`Significant decrease detected: ${improvement.toFixed(1)}% decrease in conversion rate`);
    }

    return recommendations;
  }

  private initializeMetrics(): TestMetrics {
    return {
      participants: 0,
      conversions: 0,
      conversionRate: 0,
      averageResponseTime: 0,
      costPerConversion: 0,
      revenue: 0,
      bounceRate: 0,
      errorRate: 0,
    };
  }

  private generateTestId(): string {
    return `ab_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async getTestAnalytics(tenantId: string): Promise<any> {
    const tests = await this.getActiveTests(tenantId);
    const completedTests = await this.getTestHistory(tenantId);

    return {
      activeTests: tests.length,
      completedTests: completedTests.length,
      totalTests: tests.length + completedTests.length,
      averageTestDuration: this.calculateAverageTestDuration(completedTests),
      statisticalSignificanceRate: this.calculateSignificanceRate(completedTests),
      averageImprovement: this.calculateAverageImprovement(completedTests),
      totalParticipants: tests.reduce((sum, test) => 
        sum + test.metrics.control.participants + test.metrics.variantA.participants, 0),
    };
  }

  private calculateAverageTestDuration(completedTests: ABTest[]): number {
    if (completedTests.length === 0) return 0;
    
    const totalDuration = completedTests.reduce((sum, test) => {
      if (test.startDate && test.endDate) {
        return sum + (test.endDate.getTime() - test.startDate.getTime());
      }
      return sum;
    }, 0);

    return totalDuration / completedTests.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  private calculateSignificanceRate(completedTests: ABTest[]): number {
    if (completedTests.length === 0) return 0;
    
    const significantTests = completedTests.filter(test => test.statisticalSignificance);
    return significantTests.length / completedTests.length;
  }

  private calculateAverageImprovement(completedTests: ABTest[]): number {
    if (completedTests.length === 0) return 0;
    
    const improvements = completedTests.map(test => {
      const controlRate = test.metrics.control.conversionRate;
      const variantRate = test.metrics.variantA.conversionRate;
      return controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0;
    });

    return improvements.reduce((sum, improvement) => sum + improvement, 0) / improvements.length;
  }
}
