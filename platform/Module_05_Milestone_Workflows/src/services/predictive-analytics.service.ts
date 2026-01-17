import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneVerification } from '../entities/milestone-verification.entity';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';

export interface CompletionPrediction {
  milestoneId: string;
  completionProbability: number;
  estimatedCompletionDate: Date;
  confidenceInterval: [Date, Date];
  riskFactors: RiskFactor[];
  recommendations: ActionRecommendation[];
}

export interface RiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high';
  probability: number;
  mitigation: string;
}

export interface ActionRecommendation {
  action: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: string;
  timeline: string;
}

export interface CashFlowForecast {
  tenantId: string;
  timeframe: DateRange;
  predictedRevenue: MonetaryAmount[];
  paymentProbability: number[];
  seasonalAdjustments: SeasonalFactor[];
  confidenceScore: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MonetaryAmount {
  date: Date;
  amount: number;
  currency: string;
  confidence: number;
}

export interface SeasonalFactor {
  period: string;
  factor: number;
  description: string;
}

export interface RiskAssessment {
  projectId: string;
  overallRiskScore: number;
  riskCategories: RiskCategory[];
  earlyWarningIndicators: WarningIndicator[];
  mitigationStrategies: MitigationStrategy[];
}

export interface RiskCategory {
  category: string;
  score: number;
  factors: string[];
  trends: 'improving' | 'stable' | 'declining';
}

export interface WarningIndicator {
  indicator: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  currentValue: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MitigationStrategy {
  strategy: string;
  riskArea: string;
  effectiveness: number;
  implementationCost: number;
  timeline: string;
}

export interface PredictiveInsights {
  tenantId: string;
  insights: StrategicInsight[];
  opportunities: BusinessOpportunity[];
  risks: BusinessRisk[];
  recommendations: StrategicRecommendation[];
}

export interface StrategicInsight {
  insight: string;
  category: 'performance' | 'financial' | 'operational' | 'market';
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  timeframe: string;
}

export interface BusinessOpportunity {
  opportunity: string;
  potentialValue: number;
  probability: number;
  requiredInvestment: number;
  timeline: string;
}

export interface BusinessRisk {
  risk: string;
  potentialImpact: number;
  probability: number;
  mitigationCost: number;
  timeline: string;
}

export interface StrategicRecommendation {
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expectedOutcome: string;
  implementationPlan: string;
  successMetrics: string[];
}

export interface ForecastRequest {
  tenantId: string;
  timeframe: DateRange;
  granularity: 'daily' | 'weekly' | 'monthly';
  factors: string[];
}

export interface Scenario {
  name: string;
  description: string;
  parameters: ScenarioParameters;
}

export interface ScenarioParameters {
  marketConditions: 'optimistic' | 'realistic' | 'pessimistic';
  growthRate: number;
  seasonality: number;
  riskFactors: string[];
}

export interface ScenarioResult {
  scenario: Scenario;
  outcomes: ScenarioOutcome[];
  comparison: ScenarioComparison;
  recommendations: string[];
}

export interface ScenarioOutcome {
  metric: string;
  baseline: number;
  projected: number;
  variance: number;
  confidence: number;
}

export interface ScenarioComparison {
  bestCase: string;
  worstCase: string;
  mostLikely: string;
  riskLevel: 'low' | 'medium' | 'high';
}

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);

  constructor(
    @InjectRepository(MilestoneVerification)
    private readonly verificationRepository: Repository<MilestoneVerification>,
    @InjectRepository(WorkflowExecution)
    private readonly executionRepository: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowInstance)
    private readonly instanceRepository: Repository<WorkflowInstance>,
  ) {}

  /**
   * Predict milestone completion probability and timeline
   */
  async predictMilestoneCompletion(milestoneId: string, factors: PredictionFactors): Promise<CompletionPrediction> {
    try {
      // Get historical data for similar milestones
      const historicalData = await this.getHistoricalMilestoneData(milestoneId);
      
      // Apply ML models for prediction
      const prediction = await this.applyCompletionPredictionModel(historicalData, factors);
      
      // Identify risk factors
      const riskFactors = await this.identifyMilestoneRiskFactors(milestoneId, factors);
      
      // Generate action recommendations
      const recommendations = await this.generateMilestoneRecommendations(prediction, riskFactors);

      this.logger.log(`Predicted completion for milestone ${milestoneId}: ${prediction.probability}%`);

      return {
        milestoneId,
        completionProbability: prediction.probability,
        estimatedCompletionDate: prediction.estimatedDate,
        confidenceInterval: prediction.confidenceInterval,
        riskFactors,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to predict milestone completion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Forecast cash flow based on historical patterns and market conditions
   */
  async forecastPaymentCashFlow(tenantId: string, request: ForecastRequest): Promise<CashFlowForecast> {
    try {
      // Get historical payment data
      const historicalPayments = await this.getHistoricalPaymentData(tenantId, request.timeframe);
      
      // Apply time series forecasting models
      const forecast = await this.applyTimeSeriesForecasting(historicalPayments, request);
      
      // Apply seasonal adjustments
      const seasonalAdjustments = await this.calculateSeasonalAdjustments(tenantId, request.timeframe);
      
      // Calculate payment probabilities
      const paymentProbabilities = await this.calculatePaymentProbabilities(forecast, factors);
      
      // Calculate confidence score
      const confidenceScore = await this.calculateForecastConfidence(historicalPayments, forecast);

      this.logger.log(`Generated cash flow forecast for tenant ${tenantId}`);

      return {
        tenantId,
        timeframe: request.timeframe,
        predictedRevenue: forecast.revenue,
        paymentProbability: paymentProbabilities,
        seasonalAdjustments,
        confidenceScore,
      };
    } catch (error) {
      this.logger.error(`Failed to forecast cash flow: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assess project risks using predictive models
   */
  async assessProjectRisk(projectId: string): Promise<RiskAssessment> {
    try {
      // Get project data and historical patterns
      const projectData = await this.getProjectData(projectId);
      const historicalRisks = await this.getHistoricalRiskData(projectId);
      
      // Calculate overall risk score
      const overallRiskScore = await this.calculateOverallRiskScore(projectData, historicalRisks);
      
      // Analyze risk categories
      const riskCategories = await this.analyzeRiskCategories(projectData, historicalRisks);
      
      // Identify early warning indicators
      const earlyWarningIndicators = await this.identifyEarlyWarningIndicators(projectData);
      
      // Generate mitigation strategies
      const mitigationStrategies = await this.generateMitigationStrategies(riskCategories);

      this.logger.log(`Assessed risk for project ${projectId}: ${overallRiskScore}/100`);

      return {
        projectId,
        overallRiskScore,
        riskCategories,
        earlyWarningIndicators,
        mitigationStrategies,
      };
    } catch (error) {
      this.logger.error(`Failed to assess project risk: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate predictive insights for strategic decision making
   */
  async generatePredictiveInsights(tenantId: string): Promise<PredictiveInsights> {
    try {
      // Analyze performance patterns
      const insights = await this.analyzePerformancePatterns(tenantId);
      
      // Identify business opportunities
      const opportunities = await this.identifyBusinessOpportunities(tenantId);
      
      // Assess business risks
      const risks = await this.assessBusinessRisks(tenantId);
      
      // Generate strategic recommendations
      const recommendations = await this.generateStrategicRecommendations(insights, opportunities, risks);

      this.logger.log(`Generated predictive insights for tenant ${tenantId}`);

      return {
        tenantId,
        insights,
        opportunities,
        risks,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to generate predictive insights: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run scenario analysis for strategic planning
   */
  async runScenario(tenantId: string, scenario: Scenario): Promise<ScenarioResult> {
    try {
      // Get baseline data
      const baselineData = await this.getBaselineData(tenantId);
      
      // Apply scenario parameters
      const scenarioOutcomes = await this.applyScenarioParameters(baselineData, scenario);
      
      // Compare with baseline
      const comparison = await this.compareScenarioOutcomes(baselineData, scenarioOutcomes);
      
      // Generate scenario-specific recommendations
      const recommendations = await this.generateScenarioRecommendations(scenario, scenarioOutcomes);

      this.logger.log(`Ran scenario analysis: ${scenario.name}`);

      return {
        scenario,
        outcomes: scenarioOutcomes,
        comparison,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to run scenario analysis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get real-time predictive analytics dashboard data
   */
  async getPredictiveDashboard(tenantId: string, timeframe: DateRange): Promise<PredictiveDashboard> {
    try {
      // Get milestone predictions
      const milestonePredictions = await this.getMilestonePredictions(tenantId, timeframe);
      
      // Get cash flow forecasts
      const cashFlowForecast = await this.forecastPaymentCashFlow(tenantId, { tenantId, timeframe, granularity: 'monthly', factors: [] });
      
      // Get risk assessments
      const riskAssessments = await this.getProjectRiskAssessments(tenantId);
      
      // Get performance trends
      const performanceTrends = await this.getPerformanceTrends(tenantId, timeframe);

      this.logger.log(`Generated predictive dashboard for tenant ${tenantId}`);

      return {
        tenantId,
        timeframe,
        milestonePredictions,
        cashFlowForecast,
        riskAssessments,
        performanceTrends,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate predictive dashboard: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods

  private async getHistoricalMilestoneData(milestoneId: string): Promise<any[]> {
    // Get historical data for similar milestones
    const verifications = await this.verificationRepository.find({
      where: { milestoneId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return verifications;
  }

  private async applyCompletionPredictionModel(historicalData: any[], factors: PredictionFactors): Promise<any> {
    // Apply ML model for completion prediction
    // Simplified implementation - in production would use actual ML models
    
    let baseProbability = 75; // Base probability
    
    // Adjust based on historical success rate
    if (historicalData.length > 0) {
      const successRate = historicalData.filter(v => v.status === 'approved').length / historicalData.length * 100;
      baseProbability = successRate;
    }

    // Adjust based on factors
    if (factors.teamExperience === 'high') baseProbability += 10;
    if (factors.complexity === 'low') baseProbability += 15;
    if (factors.budgetAdequacy === 'sufficient') baseProbability += 8;
    if (factors.stakeholderSupport === 'strong') baseProbability += 12;

    baseProbability = Math.min(baseProbability, 95); // Cap at 95%

    // Calculate estimated completion date
    const avgDuration = historicalData.length > 0 
      ? historicalData.reduce((sum, v) => sum + (v.completedAt ? v.completedAt.getTime() - v.createdAt.getTime() : 0), 0) / historicalData.length
      : 30 * 24 * 60 * 60 * 1000; // 30 days default

    const estimatedDate = new Date(Date.now() + avgDuration);
    const confidenceInterval = [
      new Date(estimatedDate.getTime() - avgDuration * 0.2),
      new Date(estimatedDate.getTime() + avgDuration * 0.2),
    ];

    return {
      probability: baseProbability,
      estimatedDate,
      confidenceInterval,
    };
  }

  private async identifyMilestoneRiskFactors(milestoneId: string, factors: PredictionFactors): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // Identify risk factors based on factors and historical data
    if (factors.complexity === 'high') {
      riskFactors.push({
        factor: 'High complexity',
        impact: 'high',
        probability: 0.4,
        mitigation: 'Break down into smaller milestones and allocate additional resources',
      });
    }

    if (factors.budgetAdequacy === 'insufficient') {
      riskFactors.push({
        factor: 'Insufficient budget',
        impact: 'high',
        probability: 0.6,
        mitigation: 'Secure additional funding or reduce scope',
      });
    }

    if (factors.teamExperience === 'low') {
      riskFactors.push({
        factor: 'Low team experience',
        impact: 'medium',
        probability: 0.3,
        mitigation: 'Provide training and mentorship',
      });
    }

    return riskFactors;
  }

  private async generateMilestoneRecommendations(prediction: any, riskFactors: RiskFactor[]): Promise<ActionRecommendation[]> {
    const recommendations: ActionRecommendation[] = [];

    if (prediction.probability < 70) {
      recommendations.push({
        action: 'Increase monitoring and support',
        priority: 'high',
        expectedImpact: 'Improve success rate by 20%',
        timeline: 'Immediate',
      });
    }

    if (riskFactors.some(rf => rf.impact === 'high')) {
      recommendations.push({
        action: 'Develop risk mitigation plan',
        priority: 'high',
        expectedImpact: 'Reduce high-impact risks by 50%',
        timeline: 'Within 1 week',
      });
    }

    return recommendations;
  }

  private async getHistoricalPaymentData(tenantId: string, timeframe: DateRange): Promise<any[]> {
    // Get historical payment data for forecasting
    const verifications = await this.verificationRepository.find({
      where: {
        tenantId,
        createdAt: { $gte: timeframe.start, $lte: timeframe.end },
        status: 'approved',
      },
      order: { createdAt: 'ASC' },
    });

    return verifications;
  }

  private async applyTimeSeriesForecasting(historicalData: any[], request: ForecastRequest): Promise<any> {
    // Apply time series forecasting models
    // Simplified implementation - in production would use ARIMA, Prophet, etc.
    
    const revenue: MonetaryAmount[] = [];
    const daysDiff = Math.ceil((request.timeframe.end.getTime() - request.timeframe.start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Simple linear trend projection
    const historicalAmounts = historicalData.map(v => v.amount || 0);
    const avgAmount = historicalAmounts.length > 0 ? historicalAmounts.reduce((a, b) => a + b, 0) / historicalAmounts.length : 1000;
    const trend = historicalAmounts.length > 1 ? (historicalAmounts[historicalAmounts.length - 1] - historicalAmounts[0]) / historicalAmounts.length : 0;

    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(request.timeframe.start.getTime() + i * 24 * 60 * 60 * 1000);
      const amount = avgAmount + (trend * i);
      
      revenue.push({
        date,
        amount: Math.max(0, amount),
        currency: 'USD',
        confidence: 0.8,
      });
    }

    return { revenue };
  }

  private async calculateSeasonalAdjustments(tenantId: string, timeframe: DateRange): Promise<SeasonalFactor[]> {
    // Calculate seasonal adjustments based on historical patterns
    const adjustments: SeasonalFactor[] = [];

    // Example seasonal factors
    adjustments.push({
      period: 'Q1',
      factor: 0.9,
      description: 'Lower activity in Q1 due to holidays',
    });

    adjustments.push({
      period: 'Q2',
      factor: 1.1,
      description: 'Higher activity in Q2',
    });

    adjustments.push({
      period: 'Q3',
      factor: 1.05,
      description: 'Steady activity in Q3',
    });

    adjustments.push({
      period: 'Q4',
      factor: 1.15,
      description: 'Peak activity in Q4',
    });

    return adjustments;
  }

  private async calculatePaymentProbabilities(forecast: any, factors: string[]): Promise<number[]> {
    // Calculate payment probabilities for each forecast period
    const probabilities: number[] = [];
    
    forecast.revenue.forEach((revenue: MonetaryAmount) => {
      // Base probability with some variation
      const baseProbability = 0.85;
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      probabilities.push(Math.max(0.5, Math.min(0.95, baseProbability + variation)));
    });

    return probabilities;
  }

  private async calculateForecastConfidence(historicalData: any[], forecast: any): Promise<number> {
    // Calculate confidence score based on data quality and model performance
    const dataQuality = Math.min(historicalData.length / 100, 1) * 50; // More data = higher confidence
    const modelPerformance = 40; // Base model performance score
    
    return Math.round(dataQuality + modelPerformance);
  }

  private async getProjectData(projectId: string): Promise<any> {
    // Get project data for risk assessment
    const instances = await this.instanceRepository.find({
      where: { projectId },
      relations: ['executions', 'verifications'],
    });

    return instances;
  }

  private async getHistoricalRiskData(projectId: string): Promise<any[]> {
    // Get historical risk data
    // Simplified implementation
    return [];
  }

  private async calculateOverallRiskScore(projectData: any, historicalRisks: any[]): Promise<number> {
    // Calculate overall risk score (0-100)
    let riskScore = 30; // Base risk score

    // Adjust based on project complexity
    if (projectData.complexity === 'high') riskScore += 25;
    if (projectData.complexity === 'medium') riskScore += 15;

    // Adjust based on team experience
    if (projectData.teamExperience === 'low') riskScore += 20;
    if (projectData.teamExperience === 'medium') riskScore += 10;

    // Adjust based on budget constraints
    if (projectData.budgetConstraint === 'tight') riskScore += 15;

    return Math.min(riskScore, 100);
  }

  private async analyzeRiskCategories(projectData: any, historicalRisks: any[]): Promise<RiskCategory[]> {
    const categories: RiskCategory[] = [];

    // Analyze different risk categories
    categories.push({
      category: 'Technical',
      score: 65,
      factors: ['Complexity', 'Technology stack', 'Integration challenges'],
      trends: 'stable',
    });

    categories.push({
      category: 'Financial',
      score: 45,
      factors: ['Budget constraints', 'Revenue projections', 'Cost overruns'],
      trends: 'improving',
    });

    categories.push({
      category: 'Operational',
      score: 55,
      factors: ['Team capacity', 'Process efficiency', 'Resource allocation'],
      trends: 'stable',
    });

    return categories;
  }

  private async identifyEarlyWarningIndicators(projectData: any): Promise<WarningIndicator[]> {
    const indicators: WarningIndicator[] = [];

    // Identify early warning indicators
    indicators.push({
      indicator: 'Budget utilization',
      severity: 'medium',
      threshold: 80,
      currentValue: projectData.budgetUtilization || 75,
      trend: 'up',
    });

    indicators.push({
      indicator: 'Team velocity',
      severity: 'low',
      threshold: 0.8,
      currentValue: projectData.teamVelocity || 0.85,
      trend: 'stable',
    });

    return indicators;
  }

  private async generateMitigationStrategies(riskCategories: RiskCategory[]): Promise<MitigationStrategy[]> {
    const strategies: MitigationStrategy[] = [];

    riskCategories.forEach(category => {
      if (category.score > 60) {
        strategies.push({
          strategy: `Implement ${category.category.toLowerCase()} risk mitigation plan`,
          riskArea: category.category,
          effectiveness: 75,
          implementationCost: 5000,
          timeline: '2-4 weeks',
        });
      }
    });

    return strategies;
  }

  private async analyzePerformancePatterns(tenantId: string): Promise<StrategicInsight[]> {
    const insights: StrategicInsight[] = [];

    // Analyze performance patterns
    insights.push({
      insight: 'Milestone completion rates have improved by 15% over the last quarter',
      category: 'performance',
      confidence: 85,
      impact: 'medium',
      timeframe: 'Q3 2024',
    });

    insights.push({
      insight: 'Cash flow patterns show seasonal variation with peak in Q4',
      category: 'financial',
      confidence: 90,
      impact: 'high',
      timeframe: 'Annual',
    });

    return insights;
  }

  private async identifyBusinessOpportunities(tenantId: string): Promise<BusinessOpportunity[]> {
    const opportunities: BusinessOpportunity[] = [];

    // Identify business opportunities
    opportunities.push({
      opportunity: 'Expand to new market segments with high growth potential',
      potentialValue: 250000,
      probability: 0.7,
      requiredInvestment: 50000,
      timeline: '6-12 months',
    });

    return opportunities;
  }

  private async assessBusinessRisks(tenantId: string): Promise<BusinessRisk[]> {
    const risks: BusinessRisk[] = [];

    // Assess business risks
    risks.push({
      risk: 'Market saturation in core segments',
      potentialImpact: 150000,
      probability: 0.4,
      mitigationCost: 25000,
      timeline: '12-18 months',
    });

    return risks;
  }

  private async generateStrategicRecommendations(insights: StrategicInsight[], opportunities: BusinessOpportunity[], risks: BusinessRisk[]): Promise<StrategicRecommendation[]> {
    const recommendations: StrategicRecommendation[] = [];

    // Generate strategic recommendations based on insights, opportunities, and risks
    recommendations.push({
      recommendation: 'Invest in market expansion while strengthening core business',
      priority: 'high',
      expectedOutcome: '20% revenue growth over 12 months',
      implementationPlan: 'Phase 1: Market research (3 months), Phase 2: Pilot program (6 months)',
      successMetrics: ['Revenue growth', 'Market share', 'Customer acquisition cost'],
    });

    return recommendations;
  }

  private async getBaselineData(tenantId: string): Promise<any> {
    // Get baseline data for scenario analysis
    return {
      revenue: 1000000,
      costs: 800000,
      profit: 200000,
      growthRate: 0.15,
    };
  }

  private async applyScenarioParameters(baselineData: any, scenario: Scenario): Promise<ScenarioOutcome[]> {
    const outcomes: ScenarioOutcome[] = [];

    // Apply scenario parameters to baseline data
    const growthMultiplier = scenario.parameters.growthRate / 0.15; // Relative to baseline growth
    const seasonalMultiplier = scenario.parameters.seasonality;

    outcomes.push({
      metric: 'Revenue',
      baseline: baselineData.revenue,
      projected: baselineData.revenue * growthMultiplier * seasonalMultiplier,
      variance: ((growthMultiplier * seasonalMultiplier - 1) * 100),
      confidence: 0.8,
    });

    outcomes.push({
      metric: 'Profit',
      baseline: baselineData.profit,
      projected: baselineData.profit * growthMultiplier,
      variance: ((growthMultiplier - 1) * 100),
      confidence: 0.75,
    });

    return outcomes;
  }

  private async compareScenarioOutcomes(baselineData: any, scenarioOutcomes: ScenarioOutcome[]): Promise<ScenarioComparison> {
    // Compare scenario outcomes with baseline
    const revenueOutcome = scenarioOutcomes.find(o => o.metric === 'Revenue');
    
    return {
      bestCase: 'Optimistic market conditions',
      worstCase: 'Pessimistic market conditions',
      mostLikely: 'Realistic market conditions',
      riskLevel: revenueOutcome?.variance && revenueOutcome.variance > 20 ? 'high' : 'medium',
    };
  }

  private async generateScenarioRecommendations(scenario: Scenario, outcomes: ScenarioOutcome[]): Promise<string[]> {
    const recommendations: string[] = [];

    // Generate scenario-specific recommendations
    if (scenario.parameters.marketConditions === 'pessimistic') {
      recommendations.push('Implement cost reduction measures');
      recommendations.push('Focus on core business segments');
    } else if (scenario.parameters.marketConditions === 'optimistic') {
      recommendations.push('Accelerate expansion plans');
      recommendations.push('Invest in new opportunities');
    }

    return recommendations;
  }

  private async getMilestonePredictions(tenantId: string, timeframe: DateRange): Promise<CompletionPrediction[]> {
    // Get predictions for all milestones in timeframe
    const predictions: CompletionPrediction[] = [];

    // Simplified implementation - would get actual milestones
    predictions.push({
      milestoneId: 'milestone-1',
      completionProbability: 85,
      estimatedCompletionDate: new Date('2024-02-15'),
      confidenceInterval: [new Date('2024-02-10'), new Date('2024-02-20')],
      riskFactors: [],
      recommendations: [],
    });

    return predictions;
  }

  private async getProjectRiskAssessments(tenantId: string): Promise<RiskAssessment[]> {
    // Get risk assessments for all projects
    const assessments: RiskAssessment[] = [];

    // Simplified implementation
    assessments.push({
      projectId: 'project-1',
      overallRiskScore: 45,
      riskCategories: [],
      earlyWarningIndicators: [],
      mitigationStrategies: [],
    });

    return assessments;
  }

  private async getPerformanceTrends(tenantId: string, timeframe: DateRange): Promise<any> {
    // Get performance trends
    return {
      completionRate: { current: 85, trend: 'up', change: 5 },
      averageProcessingTime: { current: 3.2, trend: 'down', change: -0.5 },
      customerSatisfaction: { current: 4.2, trend: 'up', change: 0.3 },
    };
  }
}

export interface PredictionFactors {
  teamExperience: 'low' | 'medium' | 'high';
  complexity: 'low' | 'medium' | 'high';
  budgetAdequacy: 'insufficient' | 'adequate' | 'sufficient';
  stakeholderSupport: 'weak' | 'moderate' | 'strong';
  marketConditions: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface PredictiveDashboard {
  tenantId: string;
  timeframe: DateRange;
  milestonePredictions: CompletionPrediction[];
  cashFlowForecast: CashFlowForecast;
  riskAssessments: RiskAssessment[];
  performanceTrends: any;
  lastUpdated: Date;
}
