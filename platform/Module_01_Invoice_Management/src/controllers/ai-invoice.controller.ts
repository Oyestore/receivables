import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { DeepSeekR1Service } from '../services/deepseek-r1.service';
import { InvoiceQualityAssuranceService } from '../services/invoice-quality-assurance.service';
import { IntelligentTemplateOptimizationService } from '../services/intelligent-template-optimization.service';
import { CulturalIntelligenceService } from '../services/cultural-intelligence.service';

@Controller('ai-invoice')
export class AIInvoiceController {
  constructor(
    private readonly deepSeekService: DeepSeekR1Service,
    private readonly qualityAssuranceService: InvoiceQualityAssuranceService,
    private readonly templateOptimizationService: IntelligentTemplateOptimizationService,
    private readonly culturalIntelligenceService: CulturalIntelligenceService,
  ) {}

  @Post('analyze-quality')
  async analyzeInvoiceQuality(@Body() invoiceData: any) {
    return this.qualityAssuranceService.analyzeInvoiceQuality(invoiceData);
  }

  @Post('auto-fix')
  async autoFixInvoice(@Body() invoiceData: any) {
    return this.qualityAssuranceService.autoFixInvoiceIssues(invoiceData);
  }

  @Post('validate-for-sending')
  async validateForSending(@Body() invoiceData: any) {
    return this.qualityAssuranceService.validateForSending(invoiceData);
  }

  @Get('quality-metrics')
  async getQualityMetrics(@Query() query: { startDate?: string; endDate?: string }) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.qualityAssuranceService.getQualityMetrics(startDate, endDate);
  }

  @Post('template-analyze')
  async analyzeTemplatePerformance(@Body() body: { templateId: string }) {
    return this.templateOptimizationService.analyzeTemplatePerformance(body.templateId);
  }

  @Post('template-optimize')
  async optimizeTemplate(@Body() body: { templateId: string; businessContext: any }) {
    return this.templateOptimizationService.optimizeTemplate(body.templateId, body.businessContext);
  }

  @Post('template-ab-test')
  async createABTest(@Body() body: { templateId: string; optimizationGoals: string[] }) {
    return this.templateOptimizationService.createABTestVariants(body.templateId, body.optimizationGoals);
  }

  @Post('template-personalize')
  async getPersonalization(@Body() body: { customerData: any; industry: string }) {
    return this.templateOptimizationService.getPersonalizationRecommendations(body.customerData, body.industry);
  }

  @Post('template-ab-results')
  async analyzeABTestResults(@Body() body: { testId: string }) {
    return this.templateOptimizationService.analyzeABTestResults(body.testId);
  }

  @Get('template-dashboard')
  async getOptimizationDashboard() {
    return this.templateOptimizationService.getOptimizationDashboard();
  }

  @Post('cultural-insights')
  async getCulturalInsights(@Body() body: { region: string; businessContext: any }) {
    return this.culturalIntelligenceService.getCulturalInsights(body.region, body.businessContext);
  }

  @Post('regional-adaptations')
  async getRegionalAdaptations(@Body() body: { state: string; industry: string }) {
    return this.culturalIntelligenceService.getRegionalAdaptations(body.state, body.industry);
  }

  @Get('festival-calendar')
  async getFestivalCalendar(@Query() query: { year?: number; states?: string[] }) {
    return this.culturalIntelligenceService.getFestivalCalendar(query.year, query.states);
  }

  @Post('communication-recommendations')
  async getCommunicationRecommendations(@Body() body: { customerProfile: any; context: string }) {
    return this.culturalIntelligenceService.getCommunicationRecommendations(body.customerProfile, body.context);
  }

  @Post('payment-behavior')
  async getPaymentBehaviorInsights(@Body() body: { region: string; industry: string }) {
    return this.culturalIntelligenceService.getPaymentBehaviorInsights(body.region, body.industry);
  }

  @Post('optimal-timing')
  async getOptimalTiming(@Body() body: { customerData: any; invoiceType: string }) {
    return this.culturalIntelligenceService.getOptimalTiming(body.customerData, body.invoiceType);
  }

  @Post('ai-generate')
  async generateAIResponse(@Body() body: {
    systemPrompt?: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    return this.deepSeekService.generate(body);
  }

  @Post('ai-suggestions')
  async getTemplateSuggestions(@Body() body: { businessType: string; industry: string }) {
    return this.deepSeekService.generateTemplateSuggestions(body.businessType, body.industry);
  }

  @Post('ai-payment-analysis')
  async analyzePaymentBehavior(@Body() body: { customerData: any; invoiceHistory: any[] }) {
    return this.deepSeekService.analyzePaymentBehavior(body.customerData, body.invoiceHistory);
  }

  @Post('ai-optimization')
  async generateOptimizationSuggestions(@Body() body: { invoiceMetrics: any }) {
    return this.deepSeekService.generateOptimizationSuggestions(body.invoiceMetrics);
  }
}
