import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../invoice.entity';
import { InvoiceLineItem } from '../invoice-line-item.entity';
import { DeepSeekR1Service } from './deepseek-r1.service';
import { MetricsService } from './metrics.service';

export interface AIRecommendation {
  recommendationId: string;
  type: 'payment_optimization' | 'customer_retention' | 'cash_flow' | 'pricing' | 'operational' | 'strategic';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
  expectedImpact: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    improvement: number;
    timeframe: string;
  };
  actionItems: ActionItem[];
  implementation: {
    difficulty: 'easy' | 'moderate' | 'complex';
    estimatedCost?: number;
    estimatedTime: string;
    resources: string[];
  };
  confidence: number;
  data: any;
  createdAt: Date;
  expiresAt: Date;
}

export interface ActionItem {
  itemId: string;
  description: string;
  assignee?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
  dependencies: string[];
}

export interface RecommendationEngine {
  engineId: string;
  name: string;
  type: 'rule_based' | 'ml_based' | 'hybrid';
  version: string;
  accuracy: number;
  lastUpdated: Date;
  features: string[];
}

export interface RecommendationContext {
  tenantId: string;
  businessType: string;
  industry: string;
  size: 'small' | 'medium' | 'large';
  region: string;
  seasonality: boolean;
  currentMetrics: BusinessMetrics;
  historicalData: any;
}

export interface BusinessMetrics {
  totalRevenue: number;
  averageInvoiceValue: number;
  paymentRate: number;
  averagePaymentDays: number;
  customerCount: number;
  churnRate: number;
  cashFlowHealth: 'excellent' | 'good' | 'fair' | 'poor';
  growthRate: number;
}

export interface RecommendationFeedback {
  recommendationId: string;
  userId: string;
  rating: number; // 1-5
  implemented: boolean;
  actualImpact?: number;
  comments: string;
  timestamp: Date;
}

export interface RecommendationInsight {
  insightId: string;
  category: 'pattern' | 'anomaly' | 'opportunity' | 'risk';
  title: string;
  description: string;
  dataPoints: any[];
  confidence: number;
  actionable: boolean;
}

@Injectable()
export class AIRecommendationsService {
  private readonly logger = new Logger(AIRecommendationsService.name);
  private readonly recommendationEngines = new Map<string, RecommendationEngine>();
  private readonly activeRecommendations = new Map<string, AIRecommendation>();
  private readonly feedbackHistory = new Map<string, RecommendationFeedback[]>();

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepository: Repository<InvoiceLineItem>,
    private readonly deepSeekService: DeepSeekR1Service,
    private readonly metricsService: MetricsService,
  ) {
    this.initializeEngines();
  }

  /**
   * Initialize recommendation engines
   */
  private initializeEngines(): void {
    this.logger.log('Initializing AI recommendation engines');

    // Payment Optimization Engine
    this.recommendationEngines.set('payment_optimization', {
      engineId: 'payment_opt_v1',
      name: 'Payment Optimization Engine',
      type: 'hybrid',
      version: '1.0.0',
      accuracy: 0.87,
      lastUpdated: new Date(),
      features: ['payment_history', 'customer_behavior', 'seasonal_patterns', 'industry_benchmarks'],
    });

    // Customer Retention Engine
    this.recommendationEngines.set('customer_retention', {
      engineId: 'customer_ret_v1',
      name: 'Customer Retention Engine',
      type: 'ml_based',
      version: '1.0.0',
      accuracy: 0.82,
      lastUpdated: new Date(),
      features: ['customer_lifecycle', 'payment_patterns', 'communication_history', 'risk_indicators'],
    });

    // Cash Flow Engine
    this.recommendationEngines.set('cash_flow', {
      engineId: 'cash_flow_v1',
      name: 'Cash Flow Optimization Engine',
      type: 'hybrid',
      version: '1.0.0',
      accuracy: 0.79,
      lastUpdated: new Date(),
      features: ['cash_flow_patterns', 'seasonal_trends', 'payment_cycles', 'expense_patterns'],
    });

    // Pricing Engine
    this.recommendationEngines.set('pricing', {
      engineId: 'pricing_v1',
      name: 'Dynamic Pricing Engine',
      type: 'ml_based',
      version: '1.0.0',
      accuracy: 0.75,
      lastUpdated: new Date(),
      features: ['market_data', 'competitor_pricing', 'customer_value', 'demand_patterns'],
    });

    // Operational Engine
    this.recommendationEngines.set('operational', {
      engineId: 'operational_v1',
      name: 'Operational Efficiency Engine',
      type: 'rule_based',
      version: '1.0.0',
      accuracy: 0.85,
      lastUpdated: new Date(),
      features: ['process_metrics', 'time_patterns', 'resource_utilization', 'error_rates'],
    });

    // Strategic Engine
    this.recommendationEngines.set('strategic', {
      engineId: 'strategic_v1',
      name: 'Strategic Planning Engine',
      type: 'hybrid',
      version: '1.0.0',
      accuracy: 0.71,
      lastUpdated: new Date(),
      features: ['market_trends', 'business_goals', 'competitive_landscape', 'growth_opportunities'],
    });
  }

  /**
   * Generate comprehensive AI recommendations
   */
  async generateRecommendations(tenantId: string): Promise<AIRecommendation[]> {
    this.logger.log(`Generating AI recommendations for tenant ${tenantId}`);

    try {
      // Build recommendation context
      const context = await this.buildRecommendationContext(tenantId);
      
      // Generate recommendations from each engine
      const allRecommendations: AIRecommendation[] = [];

      for (const [engineType, engine] of this.recommendationEngines.entries()) {
        try {
          const recommendations = await this.generateEngineRecommendations(engine, context);
          allRecommendations.push(...recommendations);
        } catch (error) {
          this.logger.error(`Failed to generate recommendations from ${engineType} engine:`, error);
        }
      }

      // Rank and filter recommendations
      const rankedRecommendations = this.rankRecommendations(allRecommendations);
      
      // Store active recommendations
      this.storeRecommendations(tenantId, rankedRecommendations);

      // Record metrics
      this.metricsService.recordRecommendationsGenerated(tenantId, rankedRecommendations.length);

      return rankedRecommendations;
    } catch (error) {
      this.logger.error('Failed to generate AI recommendations:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations for a specific customer
   */
  async getCustomerRecommendations(customerId: string, tenantId: string): Promise<AIRecommendation[]> {
    this.logger.log(`Getting customer recommendations for ${customerId}`);

    // Get customer data
    const customerData = await this.getCustomerData(customerId, tenantId);
    
    // Generate customer-specific recommendations
    const recommendations = await this.generateCustomerSpecificRecommendations(customerData, tenantId);

    return recommendations;
  }

  /**
   * Get recommendations for a specific invoice
   */
  async getInvoiceRecommendations(invoiceId: string, tenantId: string): Promise<AIRecommendation[]> {
    this.logger.log(`Getting invoice recommendations for ${invoiceId}`);

    // Get invoice data
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, tenant_id: tenantId },
      relations: ['line_items'],
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Generate invoice-specific recommendations
    const recommendations = await this.generateInvoiceSpecificRecommendations(invoice);

    return recommendations;
  }

  /**
   * Provide feedback on recommendations
   */
  async provideFeedback(feedback: RecommendationFeedback): Promise<void> {
    this.logger.log(`Recording feedback for recommendation ${feedback.recommendationId}`);

    // Store feedback
    if (!this.feedbackHistory.has(feedback.recommendationId)) {
      this.feedbackHistory.set(feedback.recommendationId, []);
    }
    this.feedbackHistory.get(feedback.recommendationId)!.push(feedback);

    // Update recommendation engine accuracy
    await this.updateEngineAccuracy(feedback);

    // Record metrics
    this.metricsService.recordRecommendationFeedback(feedback.recommendationId, feedback.rating);
  }

  /**
   * Get recommendation insights
   */
  async getRecommendationInsights(tenantId: string): Promise<RecommendationInsight[]> {
    this.logger.log(`Getting recommendation insights for tenant ${tenantId}`);

    // Get data for insight generation
    const invoiceData = await this.getInvoiceData(tenantId);
    const customerData = await this.getCustomerDataForTenant(tenantId);

    // Generate insights using AI
    const insights = await this.generateInsights(invoiceData, customerData);

    return insights;
  }

  /**
   * Get recommendation performance metrics
   */
  async getRecommendationPerformance(tenantId: string): Promise<{
    totalRecommendations: number;
    implementedRecommendations: number;
    averageRating: number;
    averageImpact: number;
    enginePerformance: Array<{
      engineType: string;
      accuracy: number;
      recommendations: number;
      implementationRate: number;
    }>;
  }> {
    const recommendations = Array.from(this.activeRecommendations.values())
      .filter(rec => rec.data?.tenantId === tenantId);

    const totalRecommendations = recommendations.length;
    const implementedRecommendations = recommendations.filter(rec => 
      rec.actionItems.some(item => item.status === 'completed')
    ).length;

    // Calculate average rating
    const allFeedback = Array.from(this.feedbackHistory.values())
      .flat()
      .filter(feedback => {
        const recommendation = this.activeRecommendations.get(feedback.recommendationId);
        return recommendation?.data?.tenantId === tenantId;
      });

    const averageRating = allFeedback.length > 0 
      ? allFeedback.reduce((sum, feedback) => sum + feedback.rating, 0) / allFeedback.length 
      : 0;

    const averageImpact = allFeedback
      .filter(feedback => feedback.actualImpact !== undefined)
      .reduce((sum, feedback) => sum + (feedback.actualImpact || 0), 0) / 
      Math.max(1, allFeedback.filter(feedback => feedback.actualImpact !== undefined).length);

    // Engine performance
    const enginePerformance = Array.from(this.recommendationEngines.entries()).map(([engineType, engine]) => {
      const engineRecommendations = recommendations.filter(rec => rec.type === engineType);
      const engineFeedback = allFeedback.filter(feedback => {
        const recommendation = this.activeRecommendations.get(feedback.recommendationId);
        return recommendation?.type === engineType;
      });

      return {
        engineType,
        accuracy: engine.accuracy,
        recommendations: engineRecommendations.length,
        implementationRate: engineRecommendations.length > 0 
          ? (engineRecommendations.filter(rec => 
              rec.actionItems.some(item => item.status === 'completed')
            ).length / engineRecommendations.length) * 100 
          : 0,
      };
    });

    return {
      totalRecommendations,
      implementedRecommendations,
      averageRating,
      averageImpact,
      enginePerformance,
    };
  }

  /**
   * Build recommendation context
   */
  private async buildRecommendationContext(tenantId: string): Promise<RecommendationContext> {
    // Get business metrics
    const currentMetrics = await this.calculateBusinessMetrics(tenantId);
    
    // Get historical data
    const historicalData = await this.getHistoricalData(tenantId);

    return {
      tenantId,
      businessType: 'b2b', // Would get from tenant service
      industry: 'technology', // Would get from tenant service
      size: 'medium', // Would get from tenant service
      region: 'north', // Would get from tenant service
      seasonality: true, // Would analyze from data
      currentMetrics,
      historicalData,
    };
  }

  /**
   * Generate recommendations from a specific engine
   */
  private async generateEngineRecommendations(
    engine: RecommendationEngine,
    context: RecommendationContext,
  ): Promise<AIRecommendation[]> {
    const prompt = `
    Generate recommendations using this engine configuration:
    
    Engine: ${engine.name}
    Type: ${engine.type}
    Features: ${engine.features.join(', ')}
    
    Business Context:
    ${JSON.stringify(context, null, 2)}
    
    Generate 3-5 specific, actionable recommendations in JSON format:
    {
      "recommendations": [
        {
          "type": "${engine.engineId.split('_')[0]}",
          "priority": "critical|high|medium|low",
          "title": "recommendation title",
          "description": "detailed description",
          "rationale": "why this recommendation",
          "expectedImpact": {
            "metric": "metric_name",
            "currentValue": number,
            "projectedValue": number,
            "improvement": number,
            "timeframe": "timeframe"
          },
          "actionItems": [
            {
              "description": "action description",
              "assignee": "role",
              "dueDate": "relative_date",
              "dependencies": []
            }
          ],
          "implementation": {
            "difficulty": "easy|moderate|complex",
            "estimatedCost": number,
            "estimatedTime": "time_estimate",
            "resources": ["resource1", "resource2"]
          },
          "confidence": 0-100,
          "data": {}
        }
      ]
    }
    
    Focus on:
    1. Data-driven insights
    2. Practical implementation
    3. Measurable impact
    4. Business relevance
    `;

    const response = await this.deepSeekService.generate({
      systemPrompt: `You are an expert business advisor specializing in ${engine.name.toLowerCase()}.`,
      prompt,
      temperature: 0.4,
    });

    try {
      const result = JSON.parse(response.text);
      return result.recommendations.map((rec: any) => ({
        ...rec,
        recommendationId: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days
      }));
    } catch (error) {
      this.logger.warn(`Failed to parse AI recommendations for ${engine.name}`, response.text);
      return [];
    }
  }

  /**
   * Generate customer-specific recommendations
   */
  private async generateCustomerSpecificRecommendations(
    customerData: any,
    tenantId: string,
  ): Promise<AIRecommendation[]> {
    const prompt = `
    Generate customer-specific recommendations:
    
    Customer Data:
    ${JSON.stringify(customerData, null, 2)}
    
    Generate 2-3 recommendations in JSON format:
    {
      "recommendations": [
        {
          "type": "customer_retention",
          "priority": "high|medium|low",
          "title": "recommendation title",
          "description": "customer-specific description",
          "rationale": "why this for this customer",
          "expectedImpact": {
            "metric": "customer_satisfaction|retention_rate|payment_speed",
            "currentValue": number,
            "projectedValue": number,
            "improvement": number,
            "timeframe": "timeframe"
          },
          "actionItems": [
            {
              "description": "action description",
              "assignee": "account_manager",
              "dueDate": "relative_date",
              "dependencies": []
            }
          ],
          "implementation": {
            "difficulty": "easy|moderate",
            "estimatedTime": "time_estimate",
            "resources": ["account_manager", "customer_service"]
          },
          "confidence": 0-100,
          "data": { customerId: "${customerData.customerId}" }
        }
      ]
    }
    
    Focus on:
    1. Customer-specific patterns
    2. Personalized approach
    3. Relationship building
    4. Payment optimization
    `;

    const response = await this.deepSeekService.generate({
      systemPrompt: "You are an expert in customer relationship management and retention.",
      prompt,
      temperature: 0.5,
    });

    try {
      const result = JSON.parse(response.text);
      return result.recommendations.map((rec: any) => ({
        ...rec,
        recommendationId: `customer_rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)), // 14 days
      }));
    } catch (error) {
      this.logger.warn('Failed to parse customer recommendations', response.text);
      return [];
    }
  }

  /**
   * Generate invoice-specific recommendations
   */
  private async generateInvoiceSpecificRecommendations(invoice: Invoice): Promise<AIRecommendation[]> {
    const prompt = `
    Generate invoice-specific recommendations:
    
    Invoice Data:
    ${JSON.stringify({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.grand_total,
      status: invoice.status,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      balanceDue: invoice.balance_due,
      lineItems: invoice.line_items?.length || 0,
    }, null, 2)}
    
    Generate 1-2 recommendations in JSON format:
    {
      "recommendations": [
        {
          "type": "payment_optimization",
          "priority": "high|medium|low",
          "title": "recommendation title",
          "description": "invoice-specific description",
          "rationale": "why this for this invoice",
          "expectedImpact": {
            "metric": "payment_speed|collection_rate",
            "currentValue": number,
            "projectedValue": number,
            "improvement": number,
            "timeframe": "timeframe"
          },
          "actionItems": [
            {
              "description": "action description",
              "assignee": "billing_team",
              "dueDate": "relative_date",
              "dependencies": []
            }
          ],
          "implementation": {
            "difficulty": "easy|moderate",
            "estimatedTime": "time_estimate",
            "resources": ["billing_team", "customer_service"]
          },
          "confidence": 0-100,
          "data": { invoiceId: "${invoice.id}" }
        }
      ]
    }
    
    Focus on:
    1. Invoice status optimization
    2. Payment collection
    3. Customer communication
    4. Issue resolution
    `;

    const response = await this.deepSeekService.generate({
      systemPrompt: "You are an expert in invoice management and payment optimization.",
      prompt,
      temperature: 0.3,
    });

    try {
      const result = JSON.parse(response.text);
      return result.recommendations.map((rec: any) => ({
        ...rec,
        recommendationId: `invoice_rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
      }));
    } catch (error) {
      this.logger.warn('Failed to parse invoice recommendations', response.text);
      return [];
    }
  }

  /**
   * Generate insights
   */
  private async generateInsights(invoiceData: any[], customerData: any[]): Promise<RecommendationInsight[]> {
    const prompt = `
    Analyze this business data and generate insights:
    
    Invoice Data Summary:
    ${JSON.stringify({
      totalInvoices: invoiceData.length,
      totalValue: invoiceData.reduce((sum: number, inv: any) => sum + inv.grand_total, 0),
      averageValue: invoiceData.reduce((sum: number, inv: any) => sum + inv.grand_total, 0) / invoiceData.length,
      statusBreakdown: this.getStatusBreakdown(invoiceData),
    }, null, 2)}
    
    Customer Data Summary:
    ${JSON.stringify({
      totalCustomers: customerData.length,
      averageCustomerValue: customerData.reduce((sum: number, c: any) => sum + c.totalValue, 0) / customerData.length,
      paymentPatterns: this.getPaymentPatterns(customerData),
    }, null, 2)}
    
    Generate insights in JSON format:
    {
      "insights": [
        {
          "category": "pattern|anomaly|opportunity|risk",
          "title": "insight title",
          "description": "detailed description",
          "dataPoints": [],
          "confidence": 0-100,
          "actionable": true|false
        }
      ]
    }
    
    Focus on:
    1. Payment patterns
    2. Customer behavior
    3. Business trends
    4. Optimization opportunities
    `;

    const response = await this.deepSeekService.generate({
      systemPrompt: "You are an expert business analyst and data scientist.",
      prompt,
      temperature: 0.6,
    });

    try {
      const result = JSON.parse(response.text);
      return result.insights.map((insight: any) => ({
        ...insight,
        insightId: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }));
    } catch (error) {
      this.logger.warn('Failed to parse insights', response.text);
      return [];
    }
  }

  /**
   * Rank recommendations
   */
  private rankRecommendations(recommendations: AIRecommendation[]): AIRecommendation[] {
    return recommendations.sort((a, b) => {
      // Priority weighting
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriorityScore = priorityWeight[a.priority] * a.confidence;
      const bPriorityScore = priorityWeight[b.priority] * b.confidence;

      // Impact weighting
      const aImpactScore = a.expectedImpact.improvement * a.confidence;
      const bImpactScore = b.expectedImpact.improvement * b.confidence;

      // Combined score
      const aScore = (aPriorityScore * 0.6) + (aImpactScore * 0.4);
      const bScore = (bPriorityScore * 0.6) + (bImpactScore * 0.4);

      return bScore - aScore;
    });
  }

  /**
   * Store recommendations
   */
  private storeRecommendations(tenantId: string, recommendations: AIRecommendation[]): void {
    recommendations.forEach(rec => {
      rec.data = { ...rec.data, tenantId };
      this.activeRecommendations.set(rec.recommendationId, rec);
    });

    // Clean up expired recommendations
    this.cleanupExpiredRecommendations();
  }

  /**
   * Clean up expired recommendations
   */
  private cleanupExpiredRecommendations(): void {
    const now = new Date();
    
    for (const [id, recommendation] of this.activeRecommendations.entries()) {
      if (recommendation.expiresAt < now) {
        this.activeRecommendations.delete(id);
      }
    }
  }

  /**
   * Update engine accuracy based on feedback
   */
  private async updateEngineAccuracy(feedback: RecommendationFeedback): Promise<void> {
    const recommendation = this.activeRecommendations.get(feedback.recommendationId);
    if (!recommendation) return;

    const engine = this.recommendationEngines.get(recommendation.type);
    if (!engine) return;

    // Get all feedback for this engine type
    const engineFeedback = Array.from(this.feedbackHistory.values())
      .flat()
      .filter(f => {
        const rec = this.activeRecommendations.get(f.recommendationId);
        return rec?.type === recommendation.type;
      });

    if (engineFeedback.length > 0) {
      // Calculate new accuracy based on ratings and implementation success
      const averageRating = engineFeedback.reduce((sum, f) => sum + f.rating, 0) / engineFeedback.length;
      const implementationRate = engineFeedback.filter(f => f.implemented).length / engineFeedback.length;
      
      const newAccuracy = (averageRating / 5) * 0.7 + implementationRate * 0.3;
      
      engine.accuracy = Math.min(0.95, Math.max(0.5, newAccuracy));
      engine.lastUpdated = new Date();
    }
  }

  /**
   * Calculate business metrics
   */
  private async calculateBusinessMetrics(tenantId: string): Promise<BusinessMetrics> {
    const invoices = await this.invoiceRepository.find({
      where: { tenant_id: tenantId },
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const averageInvoiceValue = invoices.length > 0 ? totalRevenue / invoices.length : 0;
    
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const paymentRate = invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;
    
    const paymentDays = paidInvoices.map(inv => 
      Math.floor((inv.updated_at.getTime() - inv.issue_date.getTime()) / (1000 * 60 * 60 * 24))
    );
    const averagePaymentDays = paymentDays.length > 0 
      ? paymentDays.reduce((sum, days) => sum + days, 0) / paymentDays.length 
      : 0;

    const customerIds = [...new Set(invoices.map(inv => inv.client_id))];
    const customerCount = customerIds.length;

    // Simplified churn rate calculation
    const churnRate = 5.2; // Would calculate from historical data

    // Cash flow health assessment
    const cashFlowHealth = averagePaymentDays < 30 ? 'excellent' : 
                          averagePaymentDays < 45 ? 'good' : 
                          averagePaymentDays < 60 ? 'fair' : 'poor';

    // Growth rate (simplified)
    const growthRate = 8.5; // Would calculate from historical data

    return {
      totalRevenue,
      averageInvoiceValue,
      paymentRate,
      averagePaymentDays,
      customerCount,
      churnRate,
      cashFlowHealth,
      growthRate,
    };
  }

  /**
   * Get historical data
   */
  private async getHistoricalData(tenantId: string): Promise<any> {
    // Get last 12 months of data
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (365 * 24 * 60 * 60 * 1000));

    const invoices = await this.invoiceRepository.find({
      where: {
        tenant_id: tenantId,
        created_at: { $gte: startDate, $lte: endDate },
      },
    });

    return {
      invoices,
      monthlyData: this.groupInvoicesByMonth(invoices),
    };
  }

  /**
   * Get customer data
   */
  private async getCustomerData(customerId: string, tenantId: string): Promise<any> {
    const invoices = await this.invoiceRepository.find({
      where: { client_id: customerId, tenant_id: tenantId },
      relations: ['line_items'],
    });

    const totalValue = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const paidValue = invoices.filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.grand_total, 0);

    const paymentDays = invoices
      .filter(inv => inv.status === 'paid')
      .map(inv => Math.floor((inv.updated_at.getTime() - inv.issue_date.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      customerId,
      invoiceCount: invoices.length,
      totalValue,
      paidValue,
      paymentRate: invoices.length > 0 ? (paidValue / totalValue) * 100 : 0,
      averagePaymentDays: paymentDays.length > 0 
        ? paymentDays.reduce((sum, days) => sum + days, 0) / paymentDays.length 
        : 0,
      lastInvoiceDate: invoices.length > 0 ? Math.max(...invoices.map(inv => inv.created_at.getTime())) : null,
    };
  }

  /**
   * Get customer data for tenant
   */
  private async getCustomerDataForTenant(tenantId: string): Promise<any[]> {
    const invoices = await this.invoiceRepository.find({
      where: { tenant_id: tenantId },
    });

    const customerMap = new Map<string, any>();

    invoices.forEach(invoice => {
      const customerId = invoice.client_id;
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId,
          invoices: [],
          totalValue: 0,
          paidValue: 0,
        });
      }

      const customer = customerMap.get(customerId)!;
      customer.invoices.push(invoice);
      customer.totalValue += invoice.grand_total;
      
      if (invoice.status === 'paid') {
        customer.paidValue += invoice.grand_total;
      }
    });

    return Array.from(customerMap.values());
  }

  /**
   * Get invoice data
   */
  private async getInvoiceData(tenantId: string): Promise<any[]> {
    return await this.invoiceRepository.find({
      where: { tenant_id: tenantId },
      take: 100,
    });
  }

  /**
   * Group invoices by month
   */
  private groupInvoicesByMonth(invoices: Invoice[]): any[] {
    const monthlyData = new Map<string, any>();

    invoices.forEach(invoice => {
      const month = invoice.created_at.toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthlyData.has(month)) {
        monthlyData.set(month, {
          month,
          totalInvoices: 0,
          totalValue: 0,
          paidInvoices: 0,
        });
      }

      const monthData = monthlyData.get(month)!;
      monthData.totalInvoices++;
      monthData.totalValue += invoice.grand_total;
      
      if (invoice.status === 'paid') {
        monthData.paidInvoices++;
      }
    });

    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get status breakdown
   */
  private getStatusBreakdown(invoices: any[]): any {
    const breakdown = new Map<string, number>();

    invoices.forEach(invoice => {
      const status = invoice.status;
      breakdown.set(status, (breakdown.get(status) || 0) + 1);
    });

    return Object.fromEntries(breakdown);
  }

  /**
   * Get payment patterns
   */
  private getPaymentPatterns(customerData: any[]): any {
    const patterns = {
      fastPayers: 0, // < 15 days
      normalPayers: 0, // 15-45 days
      slowPayers: 0, // > 45 days
    };

    customerData.forEach(customer => {
      if (customer.averagePaymentDays < 15) {
        patterns.fastPayers++;
      } else if (customer.averagePaymentDays <= 45) {
        patterns.normalPayers++;
      } else {
        patterns.slowPayers++;
      }
    });

    return patterns;
  }
}
