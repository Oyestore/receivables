import { Injectable, Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MLBasedRuleOptimizationService } from '../services/ml-rule-optimization.service';
import { ABTestingFrameworkService } from '../services/ab-testing-framework.service';
import { AdvancedAnalyticsService } from '../services/advanced-analytics.service';
import { WebhookManagementService } from '../services/webhook-management.service';

// DTOs for ML-Based Rule Optimization
export class CreateOptimizationRequestDto {
  ruleId: string;
  optimizationType: 'performance' | 'cost' | 'engagement' | 'comprehensive';
  targetMetrics?: string[];
  constraints?: Record<string, any>;
}

export class OptimizationResultDto {
  originalRule: any;
  optimizedRule: any;
  improvementMetrics: {
    successRateImprovement: number;
    responseTimeImprovement: number;
    costReduction: number;
    overallScore: number;
  };
  confidence: number;
  recommendations: string[];
  appliedAt: Date;
}

// DTOs for A/B Testing
export class CreateABTestDto {
  name: string;
  description: string;
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
  confidence: number;
}

export class ABTestDto {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  trafficSplit: any;
  configurations: any;
  metrics: any;
  startDate?: Date;
  endDate?: Date;
  winner?: string;
  confidence: number;
  statisticalSignificance: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for Advanced Analytics
export class PredictiveAnalyticsDto {
  customerId: string;
  deliverySuccessRate: number;
  optimalSendTime: Date;
  customerEngagementScore: number;
  churnRisk: number;
  lifetimeValue: number;
  nextPurchaseProbability: number;
  preferredChannel: string;
  responseTimePrediction: number;
}

export class CustomerBehaviorAnalyticsDto {
  customerId: string;
  communicationPreferences: any;
  engagementPatterns: any;
  conversionMetrics: any;
  riskIndicators: any;
}

export class ChannelPerformanceAnalyticsDto {
  channel: string;
  metrics: any;
  trends: any;
  recommendations: string[];
}

// DTOs for Webhook Management
export class CreateWebhookDto {
  name: string;
  description: string;
  url: string;
  events: {
    type: string;
    filters?: Record<string, any>;
  }[];
  headers?: Record<string, string>;
  secret?: string;
  isActive?: boolean;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
    maxRetryDelay: number;
  };
}

export class WebhookDto {
  id: string;
  name: string;
  description: string;
  tenantId: string;
  url: string;
  events: any[];
  headers?: Record<string, string>;
  isActive: boolean;
  retryPolicy: any;
  createdAt: Date;
  updatedAt: Date;
}

@ApiTags('Advanced Features')
@Controller('advanced-features')
export class AdvancedFeaturesController {
  constructor(
    private readonly mlOptimizationService: MLBasedRuleOptimizationService,
    private readonly abTestingService: ABTestingFrameworkService,
    private readonly analyticsService: AdvancedAnalyticsService,
    private readonly webhookService: WebhookManagementService,
  ) {}

  // ML-Based Rule Optimization Endpoints
  @Post('ml-optimization/optimize')
  @ApiOperation({ summary: 'Optimize a distribution rule using ML' })
  @ApiResponse({ status: 200, description: 'Rule optimization completed', type: OptimizationResultDto })
  async optimizeRule(@Body() request: CreateOptimizationRequestDto): Promise<OptimizationResultDto> {
    const result = await this.mlOptimizationService.optimizeRule(request.ruleId);
    return {
      originalRule: result.originalRule,
      optimizedRule: result.optimizedRule,
      improvementMetrics: result.improvementMetrics,
      confidence: result.confidence,
      recommendations: result.recommendations,
      appliedAt: new Date(),
    };
  }

  @Get('ml-optimization/rules/:ruleId/history')
  @ApiOperation({ summary: 'Get optimization history for a rule' })
  @ApiParam({ name: 'ruleId', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'Optimization history retrieved' })
  async getOptimizationHistory(@Param('ruleId') ruleId: string) {
    return await this.mlOptimizationService.getOptimizationHistory(ruleId);
  }

  @Get('ml-optimization/metrics')
  @ApiOperation({ summary: 'Get ML optimization metrics' })
  @ApiResponse({ status: 200, description: 'Optimization metrics retrieved' })
  async getOptimizationMetrics() {
    return await this.mlOptimizationService.getOptimizationMetrics();
  }

  @Post('ml-optimization/train')
  @ApiOperation({ summary: 'Train ML model with new data' })
  @ApiResponse({ status: 200, description: 'ML model training initiated' })
  async trainMLModel(@Body() trainingData: any[]) {
    await this.mlOptimizationService.trainMLModel(trainingData);
    return { message: 'ML model training initiated' };
  }

  // A/B Testing Framework Endpoints
  @Post('ab-testing/create')
  @ApiOperation({ summary: 'Create a new A/B test' })
  @ApiResponse({ status: 201, description: 'A/B test created', type: ABTestDto })
  async createABTest(@Body() testData: CreateABTestDto): Promise<ABTestDto> {
    const test = await this.abTestingService.createABTest({
      ...testData,
      tenantId: 'default', // Would get from authenticated user
      createdBy: 'system', // Would get from authenticated user
    });
    
    return {
      id: test.id,
      name: test.name,
      description: test.description,
      status: test.status,
      trafficSplit: test.trafficSplit,
      configurations: test.configurations,
      metrics: test.metrics,
      startDate: test.startDate,
      endDate: test.endDate,
      winner: test.winner,
      confidence: test.confidence,
      statisticalSignificance: test.statisticalSignificance,
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    };
  }

  @Post('ab-testing/:testId/start')
  @ApiOperation({ summary: 'Start an A/B test' })
  @ApiParam({ name: 'testId', description: 'Test ID' })
  @ApiResponse({ status: 200, description: 'A/B test started' })
  async startABTest(@Param('testId') testId: string) {
    return await this.abTestingService.startABTest(testId);
  }

  @Post('ab-testing/:testId/pause')
  @ApiOperation({ summary: 'Pause an A/B test' })
  @ApiParam({ name: 'testId', description: 'Test ID' })
  @ApiResponse({ status: 200, description: 'A/B test paused' })
  async pauseABTest(@Param('testId') testId: string) {
    return await this.abTestingService.pauseABTest(testId);
  }

  @Post('ab-testing/:testId/complete')
  @ApiOperation({ summary: 'Complete an A/B test' })
  @ApiParam({ name: 'testId', description: 'Test ID' })
  @ApiResponse({ status: 200, description: 'A/B test completed' })
  async completeABTest(@Param('testId') testId: string) {
    return await this.abTestingService.completeABTest(testId);
  }

  @Get('ab-testing/active')
  @ApiOperation({ summary: 'Get all active A/B tests' })
  @ApiResponse({ status: 200, description: 'Active A/B tests retrieved' })
  async getActiveABTests() {
    return await this.abTestingService.getActiveTests();
  }

  @Get('ab-testing/history')
  @ApiOperation({ summary: 'Get A/B test history' })
  @ApiResponse({ status: 200, description: 'A/B test history retrieved' })
  async getABTestHistory() {
    return await this.abTestingService.getTestHistory();
  }

  @Get('ab-testing/:testId/results')
  @ApiOperation({ summary: 'Get A/B test results' })
  @ApiParam({ name: 'testId', description: 'Test ID' })
  @ApiResponse({ status: 200, description: 'A/B test results retrieved' })
  async getABTestResults(@Param('testId') testId: string) {
    return await this.abTestingService.getTestResults(testId);
  }

  @Get('ab-testing/analytics')
  @ApiOperation({ summary: 'Get A/B testing analytics' })
  @ApiResponse({ status: 200, description: 'A/B testing analytics retrieved' })
  async getABTestingAnalytics() {
    return await this.abTestingService.getTestAnalytics('default'); // Would get from authenticated user
  }

  // Advanced Analytics Endpoints
  @Get('analytics/predictive/:customerId')
  @ApiOperation({ summary: 'Get predictive analytics for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Predictive analytics retrieved', type: PredictiveAnalyticsDto })
  async getPredictiveAnalytics(@Param('customerId') customerId: string): Promise<PredictiveAnalyticsDto> {
    const analytics = await this.analyticsService.getPredictiveAnalytics(customerId);
    
    return {
      customerId,
      deliverySuccessRate: analytics.deliverySuccessRate,
      optimalSendTime: analytics.optimalSendTime,
      customerEngagementScore: analytics.customerEngagementScore,
      churnRisk: analytics.churnRisk,
      lifetimeValue: analytics.lifetimeValue,
      nextPurchaseProbability: analytics.nextPurchaseProbability,
      preferredChannel: analytics.preferredChannel,
      responseTimePrediction: analytics.responseTimePrediction,
    };
  }

  @Get('analytics/behavior/:customerId')
  @ApiOperation({ summary: 'Get customer behavior analytics' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer behavior analytics retrieved', type: CustomerBehaviorAnalyticsDto })
  async getCustomerBehaviorAnalytics(@Param('customerId') customerId: string): Promise<CustomerBehaviorAnalyticsDto> {
    const analytics = await this.analyticsService.getCustomerBehaviorAnalytics(customerId);
    
    return {
      customerId: analytics.customerId,
      communicationPreferences: analytics.communicationPreferences,
      engagementPatterns: analytics.engagementPatterns,
      conversionMetrics: analytics.conversionMetrics,
      riskIndicators: analytics.riskIndicators,
    };
  }

  @Get('analytics/channel/:channel')
  @ApiOperation({ summary: 'Get channel performance analytics' })
  @ApiParam({ name: 'channel', description: 'Channel name' })
  @ApiQuery({ name: 'startDate', description: 'Start date' })
  @ApiQuery({ name: 'endDate', description: 'End date' })
  @ApiResponse({ status: 200, description: 'Channel performance analytics retrieved', type: ChannelPerformanceAnalyticsDto })
  async getChannelPerformanceAnalytics(
    @Param('channel') channel: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<ChannelPerformanceAnalyticsDto> {
    const analytics = await this.analyticsService.getChannelPerformanceAnalytics(
      channel as any,
      new Date(startDate),
      new Date(endDate),
    );
    
    return {
      channel: analytics.channel,
      metrics: analytics.metrics,
      trends: analytics.trends,
      recommendations: analytics.recommendations,
    };
  }

  @Get('analytics/realtime')
  @ApiOperation({ summary: 'Get real-time analytics' })
  @ApiResponse({ status: 200, description: 'Real-time analytics retrieved' })
  async getRealTimeAnalytics() {
    return await this.analyticsService.getRealTimeAnalytics();
  }

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Get analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Analytics dashboard retrieved' })
  async getAnalyticsDashboard() {
    return await this.analyticsService.getAnalyticsDashboard('default'); // Would get from authenticated user
  }

  @Post('analytics/export')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiResponse({ status: 200, description: 'Analytics data exported' })
  async exportAnalyticsData(@Body() exportRequest: {
    exportType: 'customer_behavior' | 'channel_performance' | 'distribution_records';
    format: 'csv' | 'excel' | 'json';
    filters?: any;
  }) {
    return await this.analyticsService.exportAnalyticsData(
      exportRequest.exportType,
      exportRequest.format,
      exportRequest.filters,
    );
  }

  @Post('analytics/reports/create')
  @ApiOperation({ summary: 'Create custom report' })
  @ApiResponse({ status: 201, description: 'Custom report created' })
  async createCustomReport(@Body() reportData: any) {
    return await this.analyticsService.createCustomReport({
      ...reportData,
      tenantId: 'default', // Would get from authenticated user
      createdBy: 'system', // Would get from authenticated user
    });
  }

  @Post('analytics/reports/:reportId/generate')
  @ApiOperation({ summary: 'Generate custom report' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Custom report generated' })
  async generateCustomReport(@Param('reportId') reportId: string) {
    return await this.analyticsService.generateCustomReport(reportId);
  }

  // Webhook Management Endpoints
  @Post('webhooks/create')
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created', type: WebhookDto })
  async createWebhook(@Body() webhookData: CreateWebhookDto): Promise<WebhookDto> {
    const webhook = await this.webhookService.createWebhook({
      ...webhookData,
      tenantId: 'default', // Would get from authenticated user
      createdBy: 'system', // Would get from authenticated user
    });
    
    return {
      id: webhook.id,
      name: webhook.name,
      description: webhook.description,
      tenantId: webhook.tenantId,
      url: webhook.url,
      events: webhook.events,
      headers: webhook.headers,
      isActive: webhook.isActive,
      retryPolicy: webhook.retryPolicy,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'Get all webhooks' })
  @ApiResponse({ status: 200, description: 'Webhooks retrieved' })
  async getWebhooks() {
    return await this.webhookService.getWebhooks('default'); // Would get from authenticated user
  }

  @Get('webhooks/:webhookId')
  @ApiOperation({ summary: 'Get a specific webhook' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook retrieved' })
  async getWebhook(@Param('webhookId') webhookId: string) {
    return await this.webhookService.getWebhook(webhookId);
  }

  @Put('webhooks/:webhookId')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  async updateWebhook(@Param('webhookId') webhookId: string, @Body() updates: Partial<CreateWebhookDto>) {
    return await this.webhookService.updateWebhook(webhookId, updates);
  }

  @Delete('webhooks/:webhookId')
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  async deleteWebhook(@Param('webhookId') webhookId: string) {
    await this.webhookService.deleteWebhook(webhookId);
    return { message: 'Webhook deleted successfully' };
  }

  @Post('webhooks/:webhookId/test')
  @ApiOperation({ summary: 'Test a webhook' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook test completed' })
  async testWebhook(@Param('webhookId') webhookId: string, @Body() testPayload?: any) {
    return await this.webhookService.testWebhook(webhookId, testPayload);
  }

  @Get('webhooks/:webhookId/logs')
  @ApiOperation({ summary: 'Get webhook delivery logs' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiQuery({ name: 'limit', description: 'Number of logs to retrieve' })
  @ApiResponse({ status: 200, description: 'Webhook delivery logs retrieved' })
  async getWebhookDeliveryLogs(@Param('webhookId') webhookId: string, @Query('limit') limit?: number) {
    return await this.webhookService.getWebhookDeliveryLogs(webhookId, limit);
  }

  @Get('webhooks/:webhookId/statistics')
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiParam({ name: 'webhookId', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook statistics retrieved' })
  async getWebhookStatistics(@Param('webhookId') webhookId: string) {
    return await this.webhookService.getWebhookStatistics(webhookId);
  }

  @Get('webhooks/health')
  @ApiOperation({ summary: 'Get webhook system health' })
  @ApiResponse({ status: 200, description: 'Webhook system health retrieved' })
  async getWebhookHealth() {
    return await this.webhookService.getWebhookHealth();
  }

  // Combined Analytics Endpoint
  @Get('overview')
  @ApiOperation({ summary: 'Get comprehensive overview of all advanced features' })
  @ApiResponse({ status: 200, description: 'Advanced features overview retrieved' })
  async getAdvancedFeaturesOverview() {
    const [
      optimizationMetrics,
      abTestingAnalytics,
      realTimeAnalytics,
      webhookHealth,
    ] = await Promise.all([
      this.mlOptimizationService.getOptimizationMetrics(),
      this.abTestingService.getTestAnalytics('default'),
      this.analyticsService.getRealTimeAnalytics(),
      this.webhookService.getWebhookHealth(),
    ]);

    return {
      mlOptimization: optimizationMetrics,
      abTesting: abTestingAnalytics,
      analytics: realTimeAnalytics,
      webhooks: webhookHealth,
      lastUpdated: new Date(),
    };
  }
}
