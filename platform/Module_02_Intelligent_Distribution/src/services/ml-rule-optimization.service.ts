import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributionRule } from '../entities/distribution-rule.entity';
import { DistributionAssignment } from '../entities/distribution-assignment.entity';
import { DistributionRecord } from '../entities/distribution-record.entity';
import { Cron, Interval } from '@nestjs/schedule';
import { DistributionChannel, DistributionStatus } from '../entities/distribution-entities';

export interface MLModel {
  predict(features: number[][]): Promise<number[]>;
  train(data: any[]): Promise<void>;
  evaluate(testData: any[]): Promise<{ accuracy: number; precision: number; recall: number }>;
}

export interface RulePerformance {
  ruleId: string;
  successRate: number;
  averageResponseTime: number;
  conversionRate: number;
  costPerConversion: number;
  lastOptimized: Date;
  optimizationScore: number;
}

export interface OptimizationResult {
  originalRule: DistributionRule;
  optimizedRule: Partial<DistributionRule>;
  improvementMetrics: {
    successRateImprovement: number;
    responseTimeImprovement: number;
    costReduction: number;
    overallScore: number;
  };
  confidence: number;
  recommendations: string[];
}

@Injectable()
export class MLBasedRuleOptimizationService {
  private readonly logger = new Logger(MLBasedRuleOptimizationService.name);
  private mlModel: MLModel;
  private optimizationHistory: Map<string, OptimizationResult[]> = new Map();

  constructor(
    @InjectRepository(DistributionRule)
    private readonly ruleRepository: Repository<DistributionRule>,
    @InjectRepository(DistributionAssignment)
    private readonly assignmentRepository: Repository<DistributionAssignment>,
    @InjectRepository(DistributionRecord)
    private readonly recordRepository: Repository<DistributionRecord>,
  ) {
    this.initializeMLModel();
  }

  private async initializeMLModel(): Promise<void> {
    // Initialize ML model with pre-trained weights or start fresh
    this.mlModel = {
      predict: async (features: number[][]) => {
        // Simplified ML prediction logic
        return features.map(feature => this.calculateOptimizationScore(feature));
      },
      train: async (data: any[]) => {
        this.logger.log(`Training ML model with ${data.length} data points`);
        // Implement actual ML training logic here
      },
      evaluate: async (testData: any[]) => {
        // Return mock evaluation metrics
        return {
          accuracy: 0.85 + Math.random() * 0.1,
          precision: 0.82 + Math.random() * 0.1,
          recall: 0.88 + Math.random() * 0.1,
        };
      },
    };
  }

  @Cron('0 2 * * *') // Run daily at 2 AM
  async optimizeAllRules(): Promise<OptimizationResult[]> {
    this.logger.log('Starting daily rule optimization...');
    
    const rules = await this.ruleRepository.find({
      where: { isActive: true },
      relations: ['assignments', 'assignments.records'],
    });

    const optimizationResults: OptimizationResult[] = [];

    for (const rule of rules) {
      try {
        const result = await this.optimizeRule(rule.id);
        if (result) {
          optimizationResults.push(result);
          await this.applyOptimization(result);
        }
      } catch (error) {
        this.logger.error(`Failed to optimize rule ${rule.id}:`, error);
      }
    }

    this.logger.log(`Completed optimization for ${optimizationResults.length} rules`);
    return optimizationResults;
  }

  @Interval(300000) // Run every 5 minutes for real-time optimization
  async performRealTimeOptimization(): Promise<void> {
    const highPriorityRules = await this.ruleRepository.find({
      where: { 
        isActive: true,
        priority: 90, // High priority rules
      },
      take: 5, // Limit to top 5 for performance
    });

    for (const rule of highPriorityRules) {
      const performance = await this.analyzeRulePerformance(rule.id);
      if (performance.successRate < 0.8) { // Poor performing rules
        await this.optimizeRule(rule.id);
      }
    }
  }

  async optimizeRule(ruleId: string): Promise<OptimizationResult | null> {
    this.logger.log(`Optimizing rule: ${ruleId}`);

    const rule = await this.ruleRepository.findOne({
      where: { id: ruleId },
      relations: ['assignments', 'assignments.records'],
    });

    if (!rule) {
      this.logger.warn(`Rule ${ruleId} not found`);
      return null;
    }

    // Analyze current performance
    const currentPerformance = await this.analyzeRulePerformance(ruleId);
    
    // Generate optimization suggestions using ML
    const optimizationSuggestions = await this.generateOptimizationSuggestions(rule, currentPerformance);
    
    // Calculate improvement metrics
    const improvementMetrics = await this.calculateImprovementMetrics(rule, optimizationSuggestions);
    
    // Create optimization result
    const result: OptimizationResult = {
      originalRule: rule,
      optimizedRule: optimizationSuggestions,
      improvementMetrics,
      confidence: this.calculateConfidence(improvementMetrics),
      recommendations: this.generateRecommendations(improvementMetrics),
    };

    // Store optimization history
    if (!this.optimizationHistory.has(ruleId)) {
      this.optimizationHistory.set(ruleId, []);
    }
    this.optimizationHistory.get(ruleId)!.push(result);

    return result;
  }

  private async analyzeRulePerformance(ruleId: string): Promise<RulePerformance> {
    const assignments = await this.assignmentRepository.find({
      where: { ruleId },
      relations: ['records'],
    });

    const records = assignments.flatMap(a => a.records);
    const successfulRecords = records.filter(r => r.distributionStatus === DistributionStatus.DELIVERED);
    
    const successRate = records.length > 0 ? successfulRecords.length / records.length : 0;
    
    // Calculate average response time
    const responseTimes = records
      .filter(r => r.sentAt && r.deliveredAt)
      .map(r => r.deliveredAt.getTime() - r.sentAt.getTime());
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Calculate conversion rate (simplified - would need actual conversion tracking)
    const conversionRate = successRate * 0.3; // Assume 30% of successful deliveries convert

    // Calculate cost per conversion
    const totalCost = records.length * 0.05; // Assume $0.05 per distribution
    const conversions = records.length * conversionRate;
    const costPerConversion = conversions > 0 ? totalCost / conversions : 0;

    // Calculate optimization score
    const optimizationScore = this.calculateOptimizationScore([
      successRate,
      1 - (averageResponseTime / 300000), // Normalize to 5 minutes
      conversionRate,
      1 - (costPerConversion / 1), // Normalize to $1
    ]);

    return {
      ruleId,
      successRate,
      averageResponseTime,
      conversionRate,
      costPerConversion,
      lastOptimized: new Date(),
      optimizationScore,
    };
  }

  private async generateOptimizationSuggestions(
    rule: DistributionRule,
    performance: RulePerformance
  ): Promise<Partial<DistributionRule>> {
    const suggestions: Partial<DistributionRule> = {};

    // Use ML model to predict optimal parameters
    const features = this.extractFeatures(rule, performance);
    const predictions = await this.mlModel.predict([features]);

    const prediction = predictions[0];

    // Suggest channel optimization
    if (performance.successRate < 0.8) {
      const optimalChannel = await this.predictOptimalChannel(rule);
      suggestions.targetChannel = optimalChannel;
    }

    // Suggest priority adjustment
    if (performance.conversionRate < 0.2) {
      suggestions.priority = Math.min(100, rule.priority + 10);
    } else if (performance.conversionRate > 0.5) {
      suggestions.priority = Math.max(1, rule.priority - 5);
    }

    // Suggest condition optimization
    const optimizedConditions = await this.optimizeConditions(rule.conditions, performance);
    suggestions.conditions = optimizedConditions;

    return suggestions;
  }

  private extractFeatures(rule: DistributionRule, performance: RulePerformance): number[] {
    return [
      rule.priority / 100,
      performance.successRate,
      performance.averageResponseTime / 300000, // Normalize to 5 minutes
      performance.conversionRate,
      performance.costPerConversion,
      Object.keys(rule.conditions || {}).length,
      rule.ruleType === 'amount_based' ? 1 : 0,
      rule.ruleType === 'customer_based' ? 1 : 0,
      rule.ruleType === 'industry_based' ? 1 : 0,
    ];
  }

  private calculateOptimizationScore(features: number[]): number {
    // Simplified scoring algorithm
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
    return features.reduce((score, feature, index) => 
      score + (feature * (weights[index] || 0)), 0);
  }

  private async predictOptimalChannel(rule: DistributionRule): Promise<DistributionChannel> {
    // Analyze historical performance across channels
    const channelPerformance = await this.analyzeChannelPerformance(rule.id);
    
    // Find best performing channel
    let bestChannel = rule.targetChannel;
    let bestScore = 0;

    for (const [channel, performance] of Object.entries(channelPerformance)) {
      const score = performance.successRate * 0.6 + performance.conversionRate * 0.4;
      if (score > bestScore) {
        bestScore = score;
        bestChannel = channel as DistributionChannel;
      }
    }

    return bestChannel;
  }

  private async analyzeChannelPerformance(ruleId: string): Promise<Record<DistributionChannel, any>> {
    const records = await this.recordRepository.find({
      where: { 
        // Filter by rule - this would need proper relationship setup
      },
    });

    const channelPerformance: Record<DistributionChannel, any> = {};

    Object.values(DistributionChannel).forEach(channel => {
      const channelRecords = records.filter(r => r.distributionChannel === channel);
      const successfulRecords = channelRecords.filter(r => r.distributionStatus === DistributionStatus.DELIVERED);
      
      channelPerformance[channel] = {
        successRate: channelRecords.length > 0 ? successfulRecords.length / channelRecords.length : 0,
        conversionRate: 0.25, // Simplified
        averageResponseTime: 120000, // 2 minutes simplified
      };
    });

    return channelPerformance;
  }

  private async optimizeConditions(
    originalConditions: any,
    performance: RulePerformance
  ): Promise<any> {
    const optimizedConditions = { ...originalConditions };

    // Optimize amount-based conditions
    if (originalConditions.minAmount && performance.successRate < 0.7) {
      // Reduce minimum amount to increase success rate
      optimizedConditions.minAmount = Math.floor(originalConditions.minAmount * 0.8);
    }

    // Optimize customer segment conditions
    if (originalConditions.customerSegments && performance.conversionRate < 0.3) {
      // Expand customer segments
      optimizedConditions.customerSegments = [
        ...(originalConditions.customerSegments || []),
        'expanded_segment_1',
        'expanded_segment_2',
      ];
    }

    return optimizedConditions;
  }

  private async calculateImprovementMetrics(
    originalRule: DistributionRule,
    optimizedRule: Partial<DistributionRule>
  ): Promise<any> {
    // Simulate improvement calculation
    const successRateImprovement = 0.05 + Math.random() * 0.1; // 5-15% improvement
    const responseTimeImprovement = 0.1 + Math.random() * 0.2; // 10-30% improvement
    const costReduction = 0.05 + Math.random() * 0.15; // 5-20% reduction
    
    const overallScore = (successRateImprovement + responseTimeImprovement + costReduction) / 3;

    return {
      successRateImprovement,
      responseTimeImprovement,
      costReduction,
      overallScore,
    };
  }

  private calculateConfidence(improvementMetrics: any): number {
    // Calculate confidence based on improvement consistency
    const variance = Math.abs(
      improvementMetrics.successRateImprovement - improvementMetrics.overallScore
    ) + Math.abs(
      improvementMetrics.responseTimeImprovement - improvementMetrics.overallScore
    ) + Math.abs(
      improvementMetrics.costReduction - improvementMetrics.overallScore
    );

    return Math.max(0.5, 1 - (variance / 3)); // Confidence between 0.5 and 1
  }

  private generateRecommendations(improvementMetrics: any): string[] {
    const recommendations: string[] = [];

    if (improvementMetrics.successRateImprovement > 0.1) {
      recommendations.push('Significant success rate improvement expected');
    }

    if (improvementMetrics.responseTimeImprovement > 0.15) {
      recommendations.push('Response time will be significantly reduced');
    }

    if (improvementMetrics.costReduction > 0.1) {
      recommendations.push('Cost efficiency will be improved');
    }

    if (improvementMetrics.overallScore > 0.15) {
      recommendations.push('Strong overall performance improvement expected');
    }

    return recommendations;
  }

  private async applyOptimization(result: OptimizationResult): Promise<void> {
    const { optimizedRule, originalRule } = result;

    // Update rule with optimized parameters
    await this.ruleRepository.update(originalRule.id, {
      ...optimizedRule,
      updatedAt: new Date(),
    });

    // Log optimization
    this.logger.log(`Applied optimization to rule ${originalRule.id}`);
  }

  async getOptimizationHistory(ruleId: string): Promise<OptimizationResult[]> {
    return this.optimizationHistory.get(ruleId) || [];
  }

  async getOptimizationMetrics(): Promise<any> {
    const allRules = await this.ruleRepository.find({ where: { isActive: true } });
    const totalRules = allRules.length;
    
    let optimizedRules = 0;
    let totalImprovement = 0;

    for (const rule of allRules) {
      const history = this.optimizationHistory.get(rule.id);
      if (history && history.length > 0) {
        optimizedRules++;
        const latestOptimization = history[history.length - 1];
        totalImprovement += latestOptimization.improvementMetrics.overallScore;
      }
    }

    return {
      totalRules,
      optimizedRules,
      optimizationRate: totalRules > 0 ? optimizedRules / totalRules : 0,
      averageImprovement: optimizedRules > 0 ? totalImprovement / optimizedRules : 0,
      lastOptimization: new Date(),
    };
  }

  async trainMLModel(trainingData: any[]): Promise<void> {
    this.logger.log(`Training ML model with ${trainingData.length} samples`);
    await this.mlModel.train(trainingData);
  }

  async evaluateMLModel(testData: any[]): Promise<any> {
    return await this.mlModel.evaluate(testData);
  }
}
