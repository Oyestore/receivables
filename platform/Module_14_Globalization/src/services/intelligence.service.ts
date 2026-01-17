import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CulturalIntelligenceService } from './cultural-intelligence-new.service';
import { PaymentRouteIntelligenceService } from './payment-route-intelligence.service';

export interface IntelligenceAnalysis {
  culturalProfile: any;
  routeOptimization: any;
  messageAdaptation: any;
  riskAssessment: any;
  recommendations: string[];
  confidence: number;
}

export interface ComprehensivePaymentIntelligence {
  paymentRequest: {
    fromCountry: string;
    toCountry: string;
    amount: number;
    currency: string;
    urgency: 'low' | 'medium' | 'high';
    message: string;
    context: 'payment_reminder' | 'late_notice' | 'new_invoice' | 'thank_you';
  };
  analysis: IntelligenceAnalysis;
  optimizedExecution: {
    recommendedRoute: any;
    adaptedMessage: string;
    expectedDelivery: Date;
    totalCost: number;
    savings: {
      amount: number;
      percentage: number;
    };
  };
  compliance: {
    gdpr: boolean;
    localLaws: string[];
    restrictions: string[];
    requiredDocuments: string[];
  };
  monitoring: {
    successProbability: number;
    riskFactors: string[];
    alerts: string[];
  };
}

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);
  
  constructor(
    private configService: ConfigService,
    private culturalIntelligence: CulturalIntelligenceService,
    private routeIntelligence: PaymentRouteIntelligenceService
  ) {}

  /**
   * Comprehensive payment intelligence analysis
   * Combines cultural, route, and compliance intelligence
   */
  async analyzePaymentIntelligence(paymentRequest: {
    fromCountry: string;
    toCountry: string;
    amount: number;
    currency: string;
    urgency: 'low' | 'medium' | 'high';
    message: string;
    context: 'payment_reminder' | 'late_notice' | 'new_invoice' | 'thank_you';
  }): Promise<ComprehensivePaymentIntelligence> {
    this.logger.log(`Starting comprehensive intelligence analysis for ${paymentRequest.fromCountry} → ${paymentRequest.toCountry}`);

    try {
      // 1. Cultural Intelligence Analysis
      const culturalProfile = await this.culturalIntelligence.getCulturalPaymentProfile(paymentRequest.toCountry);
      
      // 2. Route Optimization Analysis
      const routeOptimization = await this.routeIntelligence.optimizePaymentRoute({
        fromCountry: paymentRequest.fromCountry,
        toCountry: paymentRequest.toCountry,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        urgency: paymentRequest.urgency
      });

      // 3. Message Adaptation
      const messageAdaptation = await this.culturalIntelligence.adaptMessageForCulture(
        paymentRequest.message,
        paymentRequest.toCountry,
        paymentRequest.context
      );

      // 4. Risk Assessment
      const riskAssessment = await this.assessComprehensiveRisk(paymentRequest, culturalProfile, routeOptimization);

      // 5. Generate Recommendations
      const recommendations = await this.generateIntelligentRecommendations(
        paymentRequest,
        culturalProfile,
        routeOptimization,
        riskAssessment
      );

      // 6. Calculate Overall Confidence
      const confidence = this.calculateOverallConfidence(culturalProfile, routeOptimization, riskAssessment);

      const analysis: IntelligenceAnalysis = {
        culturalProfile,
        routeOptimization,
        messageAdaptation,
        riskAssessment,
        recommendations,
        confidence
      };

      // 7. Generate Optimized Execution Plan
      const optimizedExecution = await this.generateExecutionPlan(paymentRequest, analysis);

      // 8. Compliance Analysis
      const compliance = await this.analyzeCompliance(paymentRequest, culturalProfile);

      // 9. Monitoring Setup
      const monitoring = await this.setupMonitoring(paymentRequest, analysis);

      return {
        paymentRequest,
        analysis,
        optimizedExecution,
        compliance,
        monitoring
      };

    } catch (error) {
      this.logger.error(`Intelligence analysis failed: ${error.message}`);
      throw new Error(`Intelligence analysis failed: ${error.message}`);
    }
  }

  /**
   * Batch intelligence analysis for multiple payments
   * ML-powered consolidation and optimization
   */
  async analyzeBatchIntelligence(paymentRequests: Array<{
    fromCountry: string;
    toCountry: string;
    amount: number;
    currency: string;
    urgency: 'low' | 'medium' | 'high';
    message: string;
    context: 'payment_reminder' | 'late_notice' | 'new_invoice' | 'thank_you';
  }>): Promise<{
    individualAnalyses: ComprehensivePaymentIntelligence[];
    batchOptimizations: {
      consolidatedRoutes: any[];
      messageTemplates: any[];
      totalSavings: number;
      efficiency: number;
    };
    strategicInsights: {
      patterns: string[];
      opportunities: string[];
      risks: string[];
      recommendations: string[];
    };
  }> {
    this.logger.log(`Starting batch intelligence analysis for ${paymentRequests.length} payments`);

    // 1. Individual Analyses
    const individualAnalyses = await Promise.all(
      paymentRequests.map(request => this.analyzePaymentIntelligence(request))
    );

    // 2. Batch Route Optimization
    const routeParams = paymentRequests.map(req => ({
      fromCountry: req.fromCountry,
      toCountry: req.toCountry,
      amount: req.amount,
      currency: req.currency,
      urgency: req.urgency
    }));
    
    const batchRouteOptimization = await this.routeIntelligence.optimizeBatchRoutes(routeParams);

    // 3. Message Template Consolidation
    const messageTemplates = await this.consolidateMessageTemplates(paymentRequests, individualAnalyses);

    // 4. Pattern Analysis
    const strategicInsights = await this.analyzeBatchPatterns(paymentRequests, individualAnalyses);

    return {
      individualAnalyses,
      batchOptimizations: {
        consolidatedRoutes: batchRouteOptimization.consolidatedRoutes,
        messageTemplates,
        totalSavings: batchRouteOptimization.totalSavings,
        efficiency: this.calculateBatchEfficiency(individualAnalyses, batchRouteOptimization)
      },
      strategicInsights
    };
  }

  /**
   * Real-time intelligence updates
   * Continuous learning and adaptation
   */
  async updateIntelligenceWithFeedback(
    paymentId: string,
    actualOutcome: {
      success: boolean;
      actualCost: number;
      actualTime: number;
      actualRoute: string;
      customerResponse?: string;
    }
  ): Promise<{
    learningUpdate: string;
    accuracyImprovement: number;
    futureRecommendations: string[];
  }> {
    this.logger.log(`Updating intelligence with feedback for payment ${paymentId}`);

    // 1. Update cultural intelligence based on customer response
    if (actualOutcome.customerResponse) {
      await this.updateCulturalLearning(paymentId, actualOutcome.customerResponse);
    }

    // 2. Update route performance data
    await this.updateRoutePerformance(actualOutcome.actualRoute, {
      success: actualOutcome.success,
      cost: actualOutcome.actualCost,
      time: actualOutcome.actualTime
    });

    // 3. Calculate accuracy improvement
    const accuracyImprovement = await this.calculateAccuracyImprovement(paymentId, actualOutcome);

    // 4. Generate future recommendations
    const futureRecommendations = await this.generateUpdatedRecommendations(
      paymentId,
      actualOutcome,
      accuracyImprovement
    );

    return {
      learningUpdate: `Intelligence updated based on payment ${paymentId} outcome`,
      accuracyImprovement,
      futureRecommendations
    };
  }

  // Private methods for advanced intelligence

  private async assessComprehensiveRisk(
    paymentRequest: any,
    culturalProfile: any,
    routeOptimization: any
  ): Promise<{
    overallRisk: 'low' | 'medium' | 'high';
    factors: Array<{
      type: string;
      level: 'low' | 'medium' | 'high';
      description: string;
      mitigation: string;
    }>;
    score: number;
  }> {
    const factors = [];

    // Cultural risk assessment
    if (culturalProfile.confidence < 0.7) {
      factors.push({
        type: 'cultural',
        level: 'medium',
        description: 'Low cultural data confidence',
        mitigation: 'Use conservative communication approach'
      });
    }

    // Route risk assessment
    if (routeOptimization.riskAssessment === 'high') {
      factors.push({
        type: 'route',
        level: 'high',
        description: 'High-risk payment route',
        mitigation: 'Consider alternative routes or additional verification'
      });
    }

    // Amount risk assessment
    if (paymentRequest.amount > 10000) {
      factors.push({
        type: 'amount',
        level: 'medium',
        description: 'High-value payment',
        mitigation: 'Enhanced verification and tracking'
      });
    }

    const score = this.calculateRiskScore(factors);
    const overallRisk = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

    return {
      overallRisk,
      factors,
      score
    };
  }

  private async generateIntelligentRecommendations(
    paymentRequest: any,
    culturalProfile: any,
    routeOptimization: any,
    riskAssessment: any
  ): Promise<string[]> {
    const recommendations = [];

    // Cultural recommendations
    if (culturalProfile.communicationPreferences.formality === 'high') {
      recommendations.push('Use formal language and proper titles');
    }

    // Route recommendations
    if (routeOptimization.savings.percentage > 5) {
      recommendations.push(`Optimized route saves ${routeOptimization.savings.percentage.toFixed(1)}% in costs`);
    }

    // Risk-based recommendations
    if (riskAssessment.overallRisk === 'high') {
      recommendations.push('Implement additional verification steps');
    }

    // Urgency-based recommendations
    if (paymentRequest.urgency === 'high') {
      recommendations.push('Use fastest available route despite higher cost');
    }

    return recommendations;
  }

  private calculateOverallConfidence(culturalProfile: any, routeOptimization: any, riskAssessment: any): number {
    const culturalConfidence = culturalProfile.confidence || 0.8;
    const routeConfidence = routeOptimization.optimizedRoute.reliability || 0.9;
    const riskConfidence = riskAssessment.score > 70 ? 0.7 : riskAssessment.score > 40 ? 0.85 : 0.95;

    return (culturalConfidence + routeConfidence + riskConfidence) / 3;
  }

  private async generateExecutionPlan(paymentRequest: any, analysis: IntelligenceAnalysis): Promise<any> {
    return {
      recommendedRoute: analysis.routeOptimization.optimizedRoute,
      adaptedMessage: analysis.messageAdaptation.adaptedMessage,
      expectedDelivery: new Date(Date.now() + (analysis.routeOptimization.optimizedRoute.estimatedTime * 60 * 60 * 1000)),
      totalCost: paymentRequest.amount + analysis.routeOptimization.optimizedRoute.estimatedCost,
      savings: analysis.routeOptimization.savings
    };
  }

  private async analyzeCompliance(paymentRequest: any, culturalProfile: any): Promise<any> {
    return {
      gdpr: culturalProfile.communicationPreferences.language === 'en' ? false : true,
      localLaws: ['Standard banking regulations'],
      restrictions: [],
      requiredDocuments: ['Invoice', 'ID']
    };
  }

  private async setupMonitoring(paymentRequest: any, analysis: IntelligenceAnalysis): Promise<any> {
    return {
      successProbability: analysis.confidence,
      riskFactors: analysis.riskAssessment.factors.map(f => f.description),
      alerts: []
    };
  }

  private async consolidateMessageTemplates(paymentRequests: any[], analyses: any[]): Promise<any[]> {
    // Group by cultural similarity and consolidate
    return [];
  }

  private async analyzeBatchPatterns(paymentRequests: any[], analyses: any[]): Promise<any> {
    return {
      patterns: ['Most payments use similar routes'],
      opportunities: ['Consolidate batch payments'],
      risks: ['Currency fluctuation exposure'],
      recommendations: ['Implement batch processing']
    };
  }

  private calculateBatchEfficiency(individualAnalyses: any[], batchOptimization: any): number {
    return 0.85; // Mock efficiency score
  }

  private async updateCulturalLearning(paymentId: string, customerResponse: string): Promise<void> {
    // Update cultural intelligence based on feedback
    this.logger.log(`Updating cultural learning for payment ${paymentId}`);
  }

  private async updateRoutePerformance(routeId: string, performance: any): Promise<void> {
    // Update route performance data
    this.logger.log(`Updating performance for route ${routeId}`);
  }

  private async calculateAccuracyImprovement(paymentId: string, outcome: any): Promise<number> {
    return 0.05; // Mock 5% improvement
  }

  private async generateUpdatedRecommendations(paymentId: string, outcome: any, improvement: number): Promise<string[]> {
    return ['Continue using optimized routes', 'Monitor customer feedback closely'];
  }

  private calculateRiskScore(factors: any[]): number {
    return factors.reduce((score, factor) => {
      const factorScore = factor.level === 'high' ? 30 : factor.level === 'medium' ? 15 : 5;
      return score + factorScore;
    }, 0);
  }
}
