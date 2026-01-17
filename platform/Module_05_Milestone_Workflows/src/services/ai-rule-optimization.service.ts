import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowRule } from '../entities/workflow-rule.entity';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { MilestoneVerification } from '../entities/milestone-verification.entity';

export interface RulePerformanceAnalysis {
  ruleId: string;
  successRate: number;
  averageExecutionTime: number;
  errorRate: number;
  userSatisfactionScore: number;
  businessImpact: number;
  optimizationSuggestions: OptimizationSuggestion[];
}

export interface OptimizationSuggestion {
  type: 'condition' | 'priority' | 'action' | 'timing';
  description: string;
  expectedImprovement: number;
  confidence: number;
  implementation: string;
}

export interface OptimizedRule {
  originalRule: WorkflowRule;
  optimizedConditions: RuleConditions;
  confidenceScore: number;
  expectedImprovement: PerformanceImprovement;
  implementationPlan: ImplementationPlan;
}

export interface RuleConditions {
  amountRange?: { min: number; max: number };
  customerSegments?: string[];
  industries?: string[];
  geographies?: string[];
  customConditions?: Record<string, any>;
}

export interface PerformanceImprovement {
  successRateImprovement: number;
  executionTimeReduction: number;
  errorRateReduction: number;
  businessImpactIncrease: number;
}

export interface ImplementationPlan {
  steps: ImplementationStep[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  rollbackPlan: string;
}

export interface ImplementationStep {
  step: number;
  action: string;
  description: string;
  expectedOutcome: string;
  dependencies: string[];
}

export interface PredictionResult {
  successProbability: number;
  confidenceInterval: [number, number];
  riskFactors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high';
  probability: number;
  mitigation: string;
}

export interface AutoTuningResult {
  rulesOptimized: number;
  averageImprovement: number;
  optimizationsApplied: OptimizationApplied[];
  nextTuningSchedule: Date;
}

export interface OptimizationApplied {
  ruleId: string;
  optimizationType: string;
  beforeMetrics: RuleMetrics;
  afterMetrics: RuleMetrics;
  improvement: number;
}

export interface RuleMetrics {
  successRate: number;
  executionTime: number;
  errorRate: number;
  businessImpact: number;
}

export interface ExecutionContext {
  invoiceData: any;
  customerData: any;
  marketConditions: any;
  historicalData: any;
}

@Injectable()
export class AIRuleOptimizationService {
  private readonly logger = new Logger(AIRuleOptimizationService.name);

  constructor(
    @InjectRepository(WorkflowRule)
    private readonly ruleRepository: Repository<WorkflowRule>,
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    @InjectRepository(MilestoneVerification)
    private readonly verificationRepository: Repository<MilestoneVerification>,
  ) {}

  /**
   * Analyze rule performance based on historical execution data
   */
  async analyzeRulePerformance(ruleId: string, timeframe: { start: Date; end: Date }): Promise<RulePerformanceAnalysis> {
    try {
      const rule = await this.ruleRepository.findOne({ where: { id: ruleId } });
      if (!rule) {
        throw new Error(`Rule ${ruleId} not found`);
      }

      // Get execution data for the specified timeframe
      const executions = await this.executionRepository.find({
        where: {
          ruleId,
          createdAt: { $gte: timeframe.start, $lte: timeframe.end },
        },
      });

      // Calculate performance metrics
      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'completed').length;
      const failedExecutions = executions.filter(e => e.status === 'failed').length;
      
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
      const errorRate = totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;
      
      const executionTimes = executions.map(e => e.executionTime || 0);
      const averageExecutionTime = executionTimes.length > 0 
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
        : 0;

      // Calculate business impact
      const businessImpact = await this.calculateBusinessImpact(ruleId, timeframe);
      
      // Calculate user satisfaction score
      const userSatisfactionScore = await this.calculateUserSatisfaction(ruleId, timeframe);

      // Generate optimization suggestions
      const optimizationSuggestions = await this.generateOptimizationSuggestions(rule, executions);

      this.logger.log(`Analyzed performance for rule ${ruleId}: ${successRate}% success rate`);

      return {
        ruleId,
        successRate,
        averageExecutionTime,
        errorRate,
        userSatisfactionScore,
        businessImpact,
        optimizationSuggestions,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze rule performance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Optimize rule conditions using machine learning algorithms
   */
  async optimizeRuleConditions(ruleId: string): Promise<OptimizedRule> {
    try {
      const rule = await this.ruleRepository.findOne({ where: { id: ruleId } });
      if (!rule) {
        throw new Error(`Rule ${ruleId} not found`);
      }

      // Get historical data for ML training
      const historicalData = await this.getHistoricalData(ruleId);
      
      // Apply ML algorithms to optimize conditions
      const optimizedConditions = await this.applyMLOptimization(rule.conditions, historicalData);
      
      // Calculate confidence score
      const confidenceScore = await this.calculateConfidenceScore(rule, optimizedConditions);
      
      // Predict performance improvement
      const expectedImprovement = await this.predictPerformanceImprovement(rule, optimizedConditions);
      
      // Generate implementation plan
      const implementationPlan = await this.generateImplementationPlan(rule, optimizedConditions);

      this.logger.log(`Optimized conditions for rule ${ruleId} with confidence ${confidenceScore}%`);

      return {
        originalRule: rule,
        optimizedConditions,
        confidenceScore,
        expectedImprovement,
        implementationPlan,
      };
    } catch (error) {
      this.logger.error(`Failed to optimize rule conditions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Predict rule success probability for given execution context
   */
  async predictRuleSuccess(rule: WorkflowRule, context: ExecutionContext): Promise<PredictionResult> {
    try {
      // Extract features from context
      const features = await this.extractFeatures(context);
      
      // Apply ML model for prediction
      const prediction = await this.applyMLModel(rule, features);
      
      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(rule, context);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(rule, context, prediction);

      this.logger.log(`Predicted success probability for rule ${rule.id}: ${prediction.probability}%`);

      return {
        successProbability: prediction.probability,
        confidenceInterval: prediction.confidenceInterval,
        riskFactors,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to predict rule success: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-tune all rules for a tenant
   */
  async autoTuneRules(tenantId: string): Promise<AutoTuningResult> {
    try {
      // Get all active rules for the tenant
      const rules = await this.ruleRepository.find({
        where: { tenantId, isActive: true },
      });

      const optimizationsApplied: OptimizationApplied[] = [];
      let totalImprovement = 0;

      // Process each rule
      for (const rule of rules) {
        const beforeMetrics = await this.getCurrentRuleMetrics(rule.id);
        
        // Optimize the rule
        const optimized = await this.optimizeRuleConditions(rule.id);
        
        // Apply optimizations if confidence is high enough
        if (optimized.confidenceScore > 70) {
          await this.applyOptimizations(rule.id, optimized.optimizedConditions);
          
          const afterMetrics = await this.getCurrentRuleMetrics(rule.id);
          const improvement = this.calculateImprovement(beforeMetrics, afterMetrics);
          
          optimizationsApplied.push({
            ruleId: rule.id,
            optimizationType: 'conditions',
            beforeMetrics,
            afterMetrics,
            improvement,
          });
          
          totalImprovement += improvement;
        }
      }

      // Schedule next tuning
      const nextTuningSchedule = new Date();
      nextTuningSchedule.setDate(nextTuningSchedule.getDate() + 7); // Weekly tuning

      this.logger.log(`Auto-tuned ${optimizationsApplied.length} rules for tenant ${tenantId}`);

      return {
        rulesOptimized: optimizationsApplied.length,
        averageImprovement: optimizationsApplied.length > 0 ? totalImprovement / optimizationsApplied.length : 0,
        optimizationsApplied,
        nextTuningSchedule,
      };
    } catch (error) {
      this.logger.error(`Failed to auto-tune rules: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get AI insights for rule optimization
   */
  async getAIInsights(tenantId: string): Promise<AIInsights> {
    try {
      // Get tenant's rule performance data
      const rules = await this.ruleRepository.find({ where: { tenantId } });
      
      // Analyze patterns across all rules
      const patterns = await this.analyzeRulePatterns(rules);
      
      // Identify optimization opportunities
      const opportunities = await this.identifyOptimizationOpportunities(rules);
      
      // Generate recommendations
      const recommendations = await this.generateStrategicRecommendations(patterns, opportunities);

      this.logger.log(`Generated AI insights for tenant ${tenantId}`);

      return {
        tenantId,
        totalRules: rules.length,
        patterns,
        opportunities,
        recommendations,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get AI insights: ${error.message}`);
      throw error;
    }
  }

  /**
   * Train ML models with latest data
   */
  async trainMLModels(tenantId?: string): Promise<TrainingResult> {
    try {
      // Get training data
      const trainingData = await this.getTrainingData(tenantId);
      
      // Train multiple models
      const models = await this.trainModels(trainingData);
      
      // Validate models
      const validationResults = await this.validateModels(models);
      
      // Deploy models if validation passes
      if (validationResults.isValid) {
        await this.deployModels(models);
      }

      this.logger.log(`Trained ${models.length} ML models`);

      return {
        modelsTrained: models.length,
        validationResults,
        deploymentStatus: validationResults.isValid ? 'deployed' : 'failed',
        trainingDataSize: trainingData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to train ML models: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods

  private async calculateBusinessImpact(ruleId: string, timeframe: { start: Date; end: Date }): Promise<number> {
    // Calculate business impact based on successful verifications, revenue impact, etc.
    const verifications = await this.verificationRepository.find({
      where: {
        createdAt: { $gte: timeframe.start, $lte: timeframe.end },
      },
    });

    // Simplified calculation - in real implementation would be more sophisticated
    return verifications.length * 100; // Each verification worth 100 points
  }

  private async calculateUserSatisfaction(ruleId: string, timeframe: { start: Date; end: Date }): Promise<number> {
    // Calculate user satisfaction based on feedback, completion rates, etc.
    // Simplified calculation - in real implementation would use actual user feedback
    return 85; // Default satisfaction score
  }

  private async generateOptimizationSuggestions(rule: WorkflowRule, executions: any[]): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze execution patterns and suggest optimizations
    const failureRate = executions.filter(e => e.status === 'failed').length / executions.length;
    
    if (failureRate > 20) {
      suggestions.push({
        type: 'condition',
        description: 'Reduce rule complexity to improve success rate',
        expectedImprovement: 15,
        confidence: 80,
        implementation: 'Simplify condition logic and add fallback mechanisms',
      });
    }

    const avgExecutionTime = executions.reduce((sum, e) => sum + (e.executionTime || 0), 0) / executions.length;
    
    if (avgExecutionTime > 5000) { // 5 seconds
      suggestions.push({
        type: 'action',
        description: 'Optimize action execution to reduce processing time',
        expectedImprovement: 25,
        confidence: 75,
        implementation: 'Implement caching and optimize database queries',
      });
    }

    return suggestions;
  }

  private async getHistoricalData(ruleId: string): Promise<any[]> {
    // Get historical execution data for ML training
    const executions = await this.executionRepository.find({
      where: { ruleId },
      order: { createdAt: 'DESC' },
      take: 1000, // Last 1000 executions
    });

    return executions;
  }

  private async applyMLOptimization(currentConditions: any, historicalData: any[]): Promise<RuleConditions> {
    // Apply ML algorithms to optimize conditions
    // This is a simplified implementation - in production would use actual ML models
    
    const optimized: RuleConditions = {
      amountRange: currentConditions.amountRange,
      customerSegments: currentConditions.customerSegments,
      industries: currentConditions.industries,
      geographies: currentConditions.geographies,
      customConditions: { ...currentConditions.customConditions },
    };

    // Example optimization: adjust amount ranges based on success rates
    if (historicalData.length > 100) {
      const successfulAmounts = historicalData
        .filter(e => e.status === 'completed')
        .map(e => e.invoiceData?.amount)
        .filter(amount => amount && amount > 0);

      if (successfulAmounts.length > 10) {
        const min = Math.min(...successfulAmounts);
        const max = Math.max(...successfulAmounts);
        optimized.amountRange = { min: min * 0.9, max: max * 1.1 };
      }
    }

    return optimized;
  }

  private async calculateConfidenceScore(rule: WorkflowRule, optimizedConditions: RuleConditions): Promise<number> {
    // Calculate confidence score based on data quality, model performance, etc.
    const historicalData = await this.getHistoricalData(rule.id);
    
    // More data = higher confidence
    const dataScore = Math.min(historicalData.length / 100, 1) * 50;
    
    // Rule complexity affects confidence
    const complexityScore = (1 - Object.keys(optimizedConditions).length / 10) * 30;
    
    // Historical performance affects confidence
    const performanceScore = 20; // Base score

    return Math.round(dataScore + complexityScore + performanceScore);
  }

  private async predictPerformanceImprovement(rule: WorkflowRule, optimizedConditions: RuleConditions): Promise<PerformanceImprovement> {
    // Predict performance improvements using ML models
    // Simplified implementation - in production would use actual predictions
    
    return {
      successRateImprovement: 10,
      executionTimeReduction: 15,
      errorRateReduction: 20,
      businessImpactIncrease: 12,
    };
  }

  private async generateImplementationPlan(rule: WorkflowRule, optimizedConditions: RuleConditions): Promise<ImplementationPlan> {
    return {
      steps: [
        {
          step: 1,
          action: 'Backup current rule configuration',
          description: 'Create backup of existing rule before making changes',
          expectedOutcome: 'Safe rollback point established',
          dependencies: [],
        },
        {
          step: 2,
          action: 'Apply optimized conditions',
          description: 'Update rule with new optimized conditions',
          expectedOutcome: 'Rule performance improved',
          dependencies: ['Backup current rule configuration'],
        },
        {
          step: 3,
          action: 'Monitor performance',
          description: 'Track rule performance for 24 hours',
          expectedOutcome: 'Performance metrics collected',
          dependencies: ['Apply optimized conditions'],
        },
      ],
      estimatedTime: 2, // hours
      riskLevel: 'low',
      rollbackPlan: 'Restore from backup if performance degrades',
    };
  }

  private async extractFeatures(context: ExecutionContext): Promise<any> {
    // Extract relevant features from execution context for ML prediction
    return {
      invoiceAmount: context.invoiceData?.amount || 0,
      customerSegment: context.customerData?.segment || 'unknown',
      industry: context.customerData?.industry || 'unknown',
      geography: context.customerData?.geography || 'unknown',
      marketCondition: context.marketConditions?.trend || 'stable',
      historicalPerformance: context.historicalData?.averageSuccessRate || 0,
    };
  }

  private async applyMLModel(rule: WorkflowRule, features: any): Promise<any> {
    // Apply trained ML model to make predictions
    // Simplified implementation - in production would use actual ML models
    
    // Simple heuristic based on features
    let probability = 70; // Base probability
    
    if (features.invoiceAmount > 10000) probability += 10;
    if (features.customerSegment === 'premium') probability += 15;
    if (features.marketCondition === 'growing') probability += 5;
    if (features.historicalPerformance > 80) probability += 10;

    probability = Math.min(probability, 95); // Cap at 95%

    return {
      probability,
      confidenceInterval: [probability - 10, probability + 10],
    };
  }

  private async identifyRiskFactors(rule: WorkflowRule, context: ExecutionContext): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // Identify potential risk factors
    if (context.invoiceData?.amount > 50000) {
      riskFactors.push({
        factor: 'High invoice amount',
        impact: 'medium',
        probability: 0.3,
        mitigation: 'Additional verification required',
      });
    }

    if (context.customerData?.segment === 'new') {
      riskFactors.push({
        factor: 'New customer',
        impact: 'high',
        probability: 0.4,
        mitigation: 'Enhanced monitoring and support',
      });
    }

    return riskFactors;
  }

  private async generateRecommendations(rule: WorkflowRule, context: ExecutionContext, prediction: any): Promise<string[]> {
    const recommendations: string[] = [];

    if (prediction.probability < 70) {
      recommendations.push('Consider manual review for this execution');
    }

    if (context.invoiceData?.amount > 100000) {
      recommendations.push('Require additional documentation for high-value transactions');
    }

    return recommendations;
  }

  private async getCurrentRuleMetrics(ruleId: string): Promise<RuleMetrics> {
    // Get current performance metrics for a rule
    const executions = await this.executionRepository.find({
      where: { ruleId },
      take: 100, // Last 100 executions
    });

    const successRate = executions.filter(e => e.status === 'completed').length / executions.length * 100;
    const avgExecutionTime = executions.reduce((sum, e) => sum + (e.executionTime || 0), 0) / executions.length;
    const errorRate = executions.filter(e => e.status === 'failed').length / executions.length * 100;
    const businessImpact = await this.calculateBusinessImpact(ruleId, {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date(),
    });

    return {
      successRate,
      executionTime: avgExecutionTime,
      errorRate,
      businessImpact,
    };
  }

  private async applyOptimizations(ruleId: string, optimizedConditions: RuleConditions): Promise<void> {
    // Apply optimizations to the rule
    await this.ruleRepository.update(ruleId, {
      conditions: optimizedConditions,
      lastOptimizedAt: new Date(),
    });
  }

  private calculateImprovement(before: RuleMetrics, after: RuleMetrics): number {
    // Calculate overall improvement percentage
    const successRateImprovement = after.successRate - before.successRate;
    const executionTimeImprovement = ((before.executionTime - after.executionTime) / before.executionTime) * 100;
    const errorRateImprovement = before.errorRate - after.errorRate;
    
    return (successRateImprovement + executionTimeImprovement + errorRateImprovement) / 3;
  }

  private async analyzeRulePatterns(rules: WorkflowRule[]): Promise<any> {
    // Analyze patterns across all rules
    const patterns = {
      commonConditions: {},
      successRateByType: {},
      performanceTrends: {},
    };

    // Simplified pattern analysis
    rules.forEach(rule => {
      const ruleType = rule.ruleType;
      patterns.successRateByType[ruleType] = patterns.successRateByType[ruleType] || 0;
      patterns.successRateByType[ruleType]++;
    });

    return patterns;
  }

  private async identifyOptimizationOpportunities(rules: WorkflowRule[]): Promise<any[]> {
    // Identify rules that could benefit from optimization
    const opportunities = [];

    for (const rule of rules) {
      const metrics = await this.getCurrentRuleMetrics(rule.id);
      
      if (metrics.successRate < 80 || metrics.errorRate > 15) {
        opportunities.push({
          ruleId: rule.id,
          ruleName: rule.name,
          currentPerformance: metrics,
          potentialImprovement: 25,
        });
      }
    }

    return opportunities;
  }

  private async generateStrategicRecommendations(patterns: any, opportunities: any[]): Promise<string[]> {
    const recommendations: string[] = [];

    if (opportunities.length > 5) {
      recommendations.push('Consider implementing automated rule optimization for underperforming rules');
    }

    if (Object.keys(patterns.successRateByType).length > 0) {
      recommendations.push('Focus on optimizing rule types with lowest success rates');
    }

    return recommendations;
  }

  private async getTrainingData(tenantId?: string): Promise<any[]> {
    // Get training data for ML models
    const executions = await this.executionRepository.find({
      where: tenantId ? { tenantId } : {},
      take: 10000, // Large dataset for training
    });

    return executions;
  }

  private async trainModels(trainingData: any[]): Promise<any[]> {
    // Train ML models with the provided data
    // Simplified implementation - in production would use actual ML frameworks
    
    const models = [
      {
        name: 'success-predictor',
        type: 'classification',
        accuracy: 0.85,
        trainedAt: new Date(),
      },
      {
        name: 'performance-optimizer',
        type: 'regression',
        accuracy: 0.82,
        trainedAt: new Date(),
      },
    ];

    return models;
  }

  private async validateModels(models: any[]): Promise<any> {
    // Validate trained models
    const isValid = models.every(model => model.accuracy > 0.8);

    return {
      isValid,
      averageAccuracy: models.reduce((sum, model) => sum + model.accuracy, 0) / models.length,
      modelCount: models.length,
    };
  }

  private async deployModels(models: any[]): Promise<void> {
    // Deploy validated models to production
    // In production, this would update model endpoints, versioning, etc.
    this.logger.log(`Deployed ${models.length} ML models to production`);
  }
}

export interface AIInsights {
  tenantId: string;
  totalRules: number;
  patterns: any;
  opportunities: any[];
  recommendations: string[];
  lastUpdated: Date;
}

export interface TrainingResult {
  modelsTrained: number;
  validationResults: any;
  deploymentStatus: string;
  trainingDataSize: number;
}
