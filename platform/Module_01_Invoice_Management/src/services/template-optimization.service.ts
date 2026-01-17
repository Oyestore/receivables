import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceTemplate } from '../entities/invoice-template.entity';
import { InvoiceTemplateVersion } from '../entities/invoice-template-version.entity';
import { DeepSeekR1Service } from './deepseek-r1.service';
import { MetricsService } from './metrics.service';

export interface TemplateOptimizationMetrics {
  templateId: string;
  performanceScore: number;
  paymentSpeed: number;
  errorRate: number;
  customerSatisfaction: number;
  usageCount: number;
}

export interface OptimizationSuggestion {
  type: 'design' | 'content' | 'structure' | 'payment';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImpact: string;
  implementation: string;
}

export interface OptimizedTemplate {
  templateId: string;
  version: number;
  optimizations: OptimizationSuggestion[];
  expectedImprovement: {
    paymentSpeed: number;
    errorReduction: number;
    customerSatisfaction: number;
  };
}

@Injectable()
export class TemplateOptimizationService {
  private readonly logger = new Logger(TemplateOptimizationService.name);

  constructor(
    @InjectRepository(InvoiceTemplate)
    private readonly templateRepository: Repository<InvoiceTemplate>,
    @InjectRepository(InvoiceTemplateVersion)
    private readonly templateVersionRepository: Repository<InvoiceTemplateVersion>,
    private readonly deepSeekService: DeepSeekR1Service,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Analyze template performance and generate optimization suggestions
   */
  async analyzeTemplatePerformance(templateId: string): Promise<TemplateOptimizationMetrics> {
    this.logger.log(`Analyzing performance for template ${templateId}`);

    // Get template usage metrics
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
      relations: ['versions'],
    });

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Calculate performance metrics
    const metrics = await this.calculatePerformanceMetrics(templateId);

    this.metricsService.recordTemplateAnalysis(templateId, metrics.performanceScore);

    return metrics;
  }

  /**
   * Generate AI-powered optimization suggestions
   */
  async generateOptimizationSuggestions(
    templateId: string,
    businessType: string,
    industry: string,
  ): Promise<OptimizationSuggestion[]> {
    this.logger.log(`Generating optimization suggestions for template ${templateId}`);

    const metrics = await this.analyzeTemplatePerformance(templateId);
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    const prompt = `
    Analyze this invoice template and provide optimization suggestions:
    
    Template Data:
    ${JSON.stringify(template, null, 2)}
    
    Performance Metrics:
    ${JSON.stringify(metrics, null, 2)}
    
    Business Type: ${businessType}
    Industry: ${industry}
    
    Provide suggestions in JSON format:
    {
      "suggestions": [
        {
          "type": "design|content|structure|payment",
          "priority": "high|medium|low",
          "description": "what to improve",
          "expectedImpact": "expected business impact",
          "implementation": "how to implement"
        }
      ]
    }
    
    Focus on:
    1. Payment speed improvement
    2. Error reduction
    3. Customer experience
    4. Professional appearance
    5. Mobile optimization
    `;

    const response = await this.deepSeekService.generate({
      systemPrompt: "You are an expert in invoice template optimization and business process improvement.",
      prompt,
      temperature: 0.4,
    });

    try {
      const result = JSON.parse(response.text);
      return result.suggestions;
    } catch (error) {
      this.logger.warn('Failed to parse AI optimization suggestions', response.text);
      return this.getDefaultOptimizations(metrics);
    }
  }

  /**
   * Create optimized version of template
   */
  async createOptimizedVersion(
    templateId: string,
    optimizations: OptimizationSuggestion[],
  ): Promise<OptimizedTemplate> {
    this.logger.log(`Creating optimized version for template ${templateId}`);

    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Create new version with optimizations
    const newVersion = this.templateVersionRepository.create({
      template_id: templateId,
      version: (template.versions?.length || 0) + 1,
      template_data: this.applyOptimizations(template.template_data, optimizations),
      optimization_notes: optimizations.map(opt => opt.description).join('; '),
      is_active: false,
      created_at: new Date(),
    });

    const savedVersion = await this.templateVersionRepository.save(newVersion);

    // Calculate expected improvements
    const expectedImprovement = this.calculateExpectedImprovement(optimizations);

    const optimizedTemplate: OptimizedTemplate = {
      templateId,
      version: savedVersion.version,
      optimizations,
      expectedImprovement,
    };

    this.metricsService.recordTemplateOptimization(templateId, optimizations.length);

    return optimizedTemplate;
  }

  /**
   * Get top performing templates
   */
  async getTopPerformingTemplates(tenantId: string, limit: number = 10): Promise<TemplateOptimizationMetrics[]> {
    this.logger.log(`Getting top ${limit} performing templates for tenant ${tenantId}`);

    const templates = await this.templateRepository.find({
      where: { tenant_id: tenantId },
      relations: ['versions'],
    });

    const metrics: TemplateOptimizationMetrics[] = [];

    for (const template of templates) {
      const templateMetrics = await this.calculatePerformanceMetrics(template.id);
      metrics.push(templateMetrics);
    }

    // Sort by performance score and return top results
    return metrics
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
  }

  /**
   * A/B test template variations
   */
  async createABTest(
    templateId: string,
    variationA: Partial<InvoiceTemplate>,
    variationB: Partial<InvoiceTemplate>,
    sampleSize: number,
  ): Promise<{
    testId: string;
    variations: {
      A: { templateId: string; traffic: number };
      B: { templateId: string; traffic: number };
    };
    duration: number;
  }> {
    this.logger.log(`Creating A/B test for template ${templateId}`);

    // Create test variations
    const testId = `ab_test_${Date.now()}`;
    
    // Implementation would create A/B test infrastructure
    // For now, return test configuration
    
    this.metricsService.recordABTestCreated(templateId);

    return {
      testId,
      variations: {
        A: { templateId: `${templateId}_A`, traffic: 50 },
        B: { templateId: `${templateId}_B`, traffic: 50 },
      },
      duration: 30, // 30 days
    };
  }

  /**
   * Calculate performance metrics for template
   */
  private async calculatePerformanceMetrics(templateId: string): Promise<TemplateOptimizationMetrics> {
    // This would integrate with analytics module
    // For now, return calculated metrics
    
    const baseMetrics = {
      templateId,
      performanceScore: 85,
      paymentSpeed: 15, // days
      errorRate: 2, // percentage
      customerSatisfaction: 4.2, // out of 5
      usageCount: 150,
    };

    return baseMetrics;
  }

  /**
   * Apply optimizations to template data
   */
  private applyOptimizations(
    templateData: any,
    optimizations: OptimizationSuggestion[],
  ): any {
    let optimizedData = { ...templateData };

    optimizations.forEach(optimization => {
      switch (optimization.type) {
        case 'design':
          optimizedData = this.applyDesignOptimizations(optimizedData);
          break;
        case 'content':
          optimizedData = this.applyContentOptimizations(optimizedData);
          break;
        case 'structure':
          optimizedData = this.applyStructureOptimizations(optimizedData);
          break;
        case 'payment':
          optimizedData = this.applyPaymentOptimizations(optimizedData);
          break;
      }
    });

    return optimizedData;
  }

  /**
   * Apply design optimizations
   */
  private applyDesignOptimizations(templateData: any): any {
    return {
      ...templateData,
      design: {
        ...templateData.design,
        mobileOptimized: true,
        colorScheme: 'professional',
        typography: 'readable',
      },
    };
  }

  /**
   * Apply content optimizations
   */
  private applyContentOptimizations(templateData: any): any {
    return {
      ...templateData,
      content: {
        ...templateData.content,
        clearPaymentInstructions: true,
        highlightedDueDate: true,
        contactInformation: 'prominent',
      },
    };
  }

  /**
   * Apply structure optimizations
   */
  private applyStructureOptimizations(templateData: any): any {
    return {
      ...templateData,
      structure: {
        ...templateData.structure,
        logicalFlow: true,
        importantFirst: true,
        summarySection: true,
      },
    };
  }

  /**
   * Apply payment optimizations
   */
  private applyPaymentOptimizations(templateData: any): any {
    return {
      ...templateData,
      payment: {
        ...templateData.payment,
        multiplePaymentMethods: true,
        qrCode: true,
        earlyPaymentDiscount: true,
        paymentLink: true,
      },
    };
  }

  /**
   * Calculate expected improvement from optimizations
   */
  private calculateExpectedImprovement(optimizations: OptimizationSuggestion[]): {
    paymentSpeed: number;
    errorReduction: number;
    customerSatisfaction: number;
  } {
    const highPriorityCount = optimizations.filter(opt => opt.priority === 'high').length;
    const mediumPriorityCount = optimizations.filter(opt => opt.priority === 'medium').length;

    return {
      paymentSpeed: highPriorityCount * 3 + mediumPriorityCount * 1.5, // days improvement
      errorReduction: highPriorityCount * 15 + mediumPriorityCount * 8, // percentage
      customerSatisfaction: highPriorityCount * 0.3 + mediumPriorityCount * 0.15, // points
    };
  }

  /**
   * Get default optimization suggestions
   */
  private getDefaultOptimizations(metrics: TemplateOptimizationMetrics): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (metrics.paymentSpeed > 20) {
      suggestions.push({
        type: 'payment',
        priority: 'high',
        description: 'Add multiple payment methods and QR codes',
        expectedImpact: 'Reduce payment time by 5-7 days',
        implementation: 'Enable UPI, card payments, and payment QR codes',
      });
    }

    if (metrics.errorRate > 5) {
      suggestions.push({
        type: 'content',
        priority: 'high',
        description: 'Improve clarity of payment instructions',
        expectedImpact: 'Reduce errors by 60%',
        implementation: 'Add clear payment steps and contact information',
      });
    }

    if (metrics.customerSatisfaction < 4.0) {
      suggestions.push({
        type: 'design',
        priority: 'medium',
        description: 'Improve template design and mobile optimization',
        expectedImpact: 'Increase customer satisfaction by 0.5 points',
        implementation: 'Use professional design and ensure mobile compatibility',
      });
    }

    return suggestions;
  }
}
