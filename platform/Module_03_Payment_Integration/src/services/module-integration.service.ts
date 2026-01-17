import { Injectable } from '@nestjs/common';
import { MilestoneService } from './milestone.service';
import { MilestonePaymentService } from './milestone-payment.service';
import { MilestoneEvidenceService } from './milestone-evidence.service';
import { MilestoneVerificationService } from './milestone-verification.service';

interface ModuleIntegrationConfig {
  tenantId: string;
  moduleType: 'invoice_generation' | 'invoice_distribution' | 'payment_integration' | 'analytics_reporting';
  enabled: boolean;
  configuration: Record<string, any>;
  webhookUrl?: string;
  apiCredentials?: {
    apiKey?: string;
    secretKey?: string;
    endpoint?: string;
  };
}

interface InvoiceGenerationRequest {
  milestoneId: string;
  tenantId: string;
  templateId?: string;
  customFields?: Record<string, any>;
  includeEvidence?: boolean;
  paymentTerms?: {
    dueDate: Date;
    paymentMethod: string[];
    lateFeePercent?: number;
    discountPercent?: number;
    discountDays?: number;
  };
}

interface InvoiceDistributionRequest {
  invoiceId: string;
  milestoneId: string;
  tenantId: string;
  distributionChannels: string[];
  recipients: {
    email?: string[];
    whatsapp?: string[];
    sms?: string[];
  };
  scheduledDate?: Date;
  priority: 'low' | 'medium' | 'high';
}

interface PaymentProcessingRequest {
  invoiceId: string;
  milestoneId: string;
  tenantId: string;
  paymentAmount: number;
  paymentMethod: string;
  paymentReference?: string;
  verificationRequired?: boolean;
}

interface AnalyticsIntegrationRequest {
  tenantId: string;
  milestoneIds?: string[];
  projectId?: string;
  reportType: 'performance' | 'financial' | 'operational';
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

@Injectable()
export class ModuleIntegrationService {
  constructor(
    private milestoneService: MilestoneService,
    private milestonePaymentService: MilestonePaymentService,
    private milestoneEvidenceService: MilestoneEvidenceService,
    private milestoneVerificationService: MilestoneVerificationService,
  ) {}

  /**
   * Configure integration with other modules
   */
  async configureModuleIntegration(config: ModuleIntegrationConfig): Promise<any> {
    // Validate configuration
    this.validateIntegrationConfig(config);

    // Store configuration (in real implementation, this would be stored in database)
    const integrationConfig = {
      id: `integration_${Date.now()}`,
      ...config,
      createdAt: new Date(),
      lastUpdated: new Date(),
      status: 'active',
    };

    // Test connection if API credentials are provided
    if (config.apiCredentials) {
      const connectionTest = await this.testModuleConnection(config);
      integrationConfig['connectionStatus'] = connectionTest.success ? 'connected' : 'failed';
      integrationConfig['lastConnectionTest'] = new Date();
    }

    return integrationConfig;
  }

  /**
   * Enhanced integration with Invoice Generation Module
   */
  async generateMilestoneInvoice(request: InvoiceGenerationRequest): Promise<any> {
    const { milestoneId, tenantId, templateId, customFields, includeEvidence, paymentTerms } = request;

    // Get milestone details
    const milestone = await this.milestoneService.findOne(milestoneId, tenantId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Verify milestone is ready for invoicing
    if (milestone.status !== 'completed' && milestone.status !== 'verified') {
      throw new Error('Milestone must be completed or verified before invoicing');
    }

    // Get milestone evidence if requested
    let evidence = null;
    if (includeEvidence) {
      evidence = await this.milestoneEvidenceService.findByMilestone(milestoneId, tenantId);
    }

    // Get milestone verification details
    const verification = await this.milestoneVerificationService.findByMilestone(milestoneId, tenantId);

    // Prepare invoice data
    const invoiceData = {
      milestoneId,
      tenantId,
      milestoneTitle: milestone.title,
      milestoneDescription: milestone.description,
      milestoneValue: milestone.value,
      completionDate: milestone.completedDate,
      verificationDate: verification?.[0]?.verifiedAt,
      evidence: evidence || [],
      customFields: customFields || {},
      paymentTerms: paymentTerms || this.getDefaultPaymentTerms(milestone),
      templateId: templateId || this.getDefaultInvoiceTemplate(milestone),
    };

    // Call Invoice Generation Module API
    const invoiceResult = await this.callInvoiceGenerationAPI(invoiceData);

    // Update milestone with invoice reference
    await this.milestoneService.update(milestoneId, tenantId, {
      invoiceId: invoiceResult.invoiceId,
      invoiceGeneratedAt: new Date(),
      status: 'invoiced',
    });

    // Create payment record
    await this.milestonePaymentService.create({
      milestoneId,
      tenantId,
      invoiceId: invoiceResult.invoiceId,
      amount: milestone.value,
      status: 'pending',
      dueDate: paymentTerms?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return {
      success: true,
      invoiceId: invoiceResult.invoiceId,
      invoiceNumber: invoiceResult.invoiceNumber,
      invoiceUrl: invoiceResult.invoiceUrl,
      milestoneId,
      generatedAt: new Date(),
    };
  }

  /**
   * Enhanced integration with Invoice Distribution Module
   */
  async distributeMilestoneInvoice(request: InvoiceDistributionRequest): Promise<any> {
    const { invoiceId, milestoneId, tenantId, distributionChannels, recipients, scheduledDate, priority } = request;

    // Get milestone and invoice details
    const milestone = await this.milestoneService.findOne(milestoneId, tenantId);
    if (!milestone || milestone.invoiceId !== invoiceId) {
      throw new Error('Invalid milestone or invoice reference');
    }

    // Prepare distribution data
    const distributionData = {
      invoiceId,
      milestoneId,
      tenantId,
      milestoneContext: {
        title: milestone.title,
        description: milestone.description,
        completionDate: milestone.completedDate,
        value: milestone.value,
      },
      distributionChannels,
      recipients,
      scheduledDate: scheduledDate || new Date(),
      priority: priority || 'medium',
      customMessage: this.generateMilestoneInvoiceMessage(milestone),
    };

    // Call Invoice Distribution Module API
    const distributionResult = await this.callInvoiceDistributionAPI(distributionData);

    // Update milestone with distribution status
    await this.milestoneService.update(milestoneId, tenantId, {
      invoiceDistributedAt: new Date(),
      distributionStatus: 'sent',
      distributionChannels,
    });

    return {
      success: true,
      distributionId: distributionResult.distributionId,
      scheduledDate: distributionResult.scheduledDate,
      channels: distributionResult.channels,
      recipients: distributionResult.recipients,
      trackingUrls: distributionResult.trackingUrls,
    };
  }

  /**
   * Enhanced integration with Payment Integration Module
   */
  async processMilestonePayment(request: PaymentProcessingRequest): Promise<any> {
    const { invoiceId, milestoneId, tenantId, paymentAmount, paymentMethod, paymentReference, verificationRequired } = request;

    // Get milestone and payment details
    const milestone = await this.milestoneService.findOne(milestoneId, tenantId);
    const payment = await this.milestonePaymentService.findByMilestone(milestoneId, tenantId);

    if (!milestone || !payment || milestone.invoiceId !== invoiceId) {
      throw new Error('Invalid milestone, payment, or invoice reference');
    }

    // Prepare payment processing data
    const paymentData = {
      invoiceId,
      milestoneId,
      tenantId,
      paymentAmount,
      paymentMethod,
      paymentReference,
      milestoneContext: {
        title: milestone.title,
        value: milestone.value,
        projectId: milestone.projectId,
        completionDate: milestone.completedDate,
      },
      verificationRequired: verificationRequired || milestone.requiresPaymentVerification,
      blockchainVerification: milestone.enableBlockchainVerification,
    };

    // Call Payment Integration Module API
    const paymentResult = await this.callPaymentIntegrationAPI(paymentData);

    // Update payment record
    await this.milestonePaymentService.update(payment[0].id, tenantId, {
      status: paymentResult.success ? 'completed' : 'failed',
      paidAmount: paymentResult.success ? paymentAmount : 0,
      paidDate: paymentResult.success ? new Date() : null,
      paymentReference: paymentResult.transactionId,
      paymentMethod,
      verificationStatus: paymentResult.verificationStatus,
    });

    // Update milestone status
    if (paymentResult.success) {
      await this.milestoneService.update(milestoneId, tenantId, {
        status: 'paid',
        paidDate: new Date(),
        paymentReference: paymentResult.transactionId,
      });
    }

    return {
      success: paymentResult.success,
      transactionId: paymentResult.transactionId,
      paymentStatus: paymentResult.status,
      verificationStatus: paymentResult.verificationStatus,
      blockchainHash: paymentResult.blockchainHash,
      processedAt: new Date(),
    };
  }

  /**
   * Enhanced integration with Analytics and Reporting Module
   */
  async integrateWithAnalytics(request: AnalyticsIntegrationRequest): Promise<any> {
    const { tenantId, milestoneIds, projectId, reportType, dateRange } = request;

    // Get milestone data for analytics
    let milestones = [];
    if (milestoneIds) {
      milestones = await Promise.all(
        milestoneIds.map(id => this.milestoneService.findOne(id, tenantId))
      );
    } else if (projectId) {
      const allMilestones = await this.milestoneService.findAll(tenantId);
      milestones = allMilestones.filter(m => m.projectId === projectId);
    } else {
      milestones = await this.milestoneService.findAll(tenantId);
    }

    // Filter by date range
    milestones = milestones.filter(m => {
      const milestoneDate = new Date(m.createdAt);
      return milestoneDate >= dateRange.startDate && milestoneDate <= dateRange.endDate;
    });

    // Get related payment data
    const paymentData = await Promise.all(
      milestones.map(m => this.milestonePaymentService.findByMilestone(m.id, tenantId))
    ).then(payments => payments.flat());

    // Prepare analytics data
    const analyticsData = {
      tenantId,
      reportType,
      dateRange,
      milestoneData: milestones.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        value: m.value,
        createdAt: m.createdAt,
        completedDate: m.completedDate,
        dueDate: m.dueDate,
        projectId: m.projectId,
        ownerId: m.ownerId,
      })),
      paymentData: paymentData.map(p => ({
        milestoneId: p.milestoneId,
        amount: p.amount,
        status: p.status,
        paidDate: p.paidDate,
        paymentMethod: p.paymentMethod,
      })),
      aggregatedMetrics: this.calculateAggregatedMetrics(milestones, paymentData),
    };

    // Call Analytics and Reporting Module API
    const analyticsResult = await this.callAnalyticsAPI(analyticsData);

    return {
      success: true,
      reportId: analyticsResult.reportId,
      reportUrl: analyticsResult.reportUrl,
      metrics: analyticsResult.metrics,
      insights: analyticsResult.insights,
      generatedAt: new Date(),
    };
  }

  /**
   * Get integration status for all modules
   */
  async getIntegrationStatus(tenantId: string): Promise<any> {
    // In a real implementation, this would fetch from database
    const integrations = [
      {
        moduleType: 'invoice_generation',
        status: 'active',
        lastSync: new Date(),
        health: 'healthy',
      },
      {
        moduleType: 'invoice_distribution',
        status: 'active',
        lastSync: new Date(),
        health: 'healthy',
      },
      {
        moduleType: 'payment_integration',
        status: 'active',
        lastSync: new Date(),
        health: 'healthy',
      },
      {
        moduleType: 'analytics_reporting',
        status: 'active',
        lastSync: new Date(),
        health: 'healthy',
      },
    ];

    return {
      tenantId,
      integrations,
      overallHealth: 'healthy',
      lastUpdated: new Date(),
    };
  }

  /**
   * Sync milestone data with integrated modules
   */
  async syncWithIntegratedModules(milestoneId: string, tenantId: string): Promise<any> {
    const milestone = await this.milestoneService.findOne(milestoneId, tenantId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    const syncResults = [];

    // Sync with Analytics Module
    try {
      const analyticsSync = await this.syncWithAnalytics(milestone, tenantId);
      syncResults.push({
        module: 'analytics',
        success: true,
        syncedAt: new Date(),
        data: analyticsSync,
      });
    } catch (error) {
      syncResults.push({
        module: 'analytics',
        success: false,
        error: error.message,
        syncedAt: new Date(),
      });
    }

    // Sync with other modules if milestone has invoice
    if (milestone.invoiceId) {
      try {
        const invoiceSync = await this.syncWithInvoiceModules(milestone, tenantId);
        syncResults.push({
          module: 'invoice',
          success: true,
          syncedAt: new Date(),
          data: invoiceSync,
        });
      } catch (error) {
        syncResults.push({
          module: 'invoice',
          success: false,
          error: error.message,
          syncedAt: new Date(),
        });
      }
    }

    return {
      milestoneId,
      tenantId,
      syncResults,
      overallSuccess: syncResults.every(r => r.success),
      syncedAt: new Date(),
    };
  }

  // Private helper methods

  private validateIntegrationConfig(config: ModuleIntegrationConfig): void {
    if (!config.tenantId || !config.moduleType) {
      throw new Error('TenantId and moduleType are required');
    }

    const validModuleTypes = ['invoice_generation', 'invoice_distribution', 'payment_integration', 'analytics_reporting'];
    if (!validModuleTypes.includes(config.moduleType)) {
      throw new Error(`Invalid module type: ${config.moduleType}`);
    }
  }

  private async testModuleConnection(config: ModuleIntegrationConfig): Promise<any> {
    // In a real implementation, this would test the actual connection
    return {
      success: true,
      responseTime: 150,
      testedAt: new Date(),
    };
  }

  private getDefaultPaymentTerms(milestone: any): any {
    return {
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paymentMethod: ['bank_transfer', 'upi', 'credit_card'],
      lateFeePercent: 2,
      discountPercent: 2,
      discountDays: 10,
    };
  }

  private getDefaultInvoiceTemplate(milestone: any): string {
    // Return template based on milestone type or project
    return milestone.type === 'delivery' ? 'delivery_template' : 'standard_template';
  }

  private generateMilestoneInvoiceMessage(milestone: any): string {
    return `Invoice for milestone "${milestone.title}" completed on ${milestone.completedDate}. Total amount: ₹${milestone.value}`;
  }

  private calculateAggregatedMetrics(milestones: any[], payments: any[]): any {
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.status === 'completed' || m.status === 'paid').length;
    const totalValue = milestones.reduce((sum, m) => sum + (m.value || 0), 0);
    const paidValue = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

    return {
      totalMilestones,
      completedMilestones,
      completionRate: totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0,
      totalValue,
      paidValue,
      paymentRate: totalValue > 0 ? (paidValue / totalValue) * 100 : 0,
    };
  }

  private async callInvoiceGenerationAPI(data: any): Promise<any> {
    // In a real implementation, this would call the actual Invoice Generation Module API
    return {
      invoiceId: `inv_${Date.now()}`,
      invoiceNumber: `INV-${Date.now()}`,
      invoiceUrl: `https://example.com/invoices/inv_${Date.now()}`,
      generatedAt: new Date(),
    };
  }

  private async callInvoiceDistributionAPI(data: any): Promise<any> {
    // In a real implementation, this would call the actual Invoice Distribution Module API
    return {
      distributionId: `dist_${Date.now()}`,
      scheduledDate: data.scheduledDate,
      channels: data.distributionChannels,
      recipients: data.recipients,
      trackingUrls: {
        email: `https://example.com/track/email/${Date.now()}`,
        whatsapp: `https://example.com/track/whatsapp/${Date.now()}`,
      },
    };
  }

  private async callPaymentIntegrationAPI(data: any): Promise<any> {
    // In a real implementation, this would call the actual Payment Integration Module API
    return {
      success: true,
      transactionId: `txn_${Date.now()}`,
      status: 'completed',
      verificationStatus: 'verified',
      blockchainHash: data.blockchainVerification ? `0x${Date.now()}` : null,
    };
  }

  private async callAnalyticsAPI(data: any): Promise<any> {
    // In a real implementation, this would call the actual Analytics Module API
    return {
      reportId: `rpt_${Date.now()}`,
      reportUrl: `https://example.com/reports/rpt_${Date.now()}`,
      metrics: data.aggregatedMetrics,
      insights: [
        'Milestone completion rate is above average',
        'Payment processing is efficient',
      ],
    };
  }

  private async syncWithAnalytics(milestone: any, tenantId: string): Promise<any> {
    // Sync milestone data with analytics module
    return {
      milestoneId: milestone.id,
      syncType: 'analytics',
      syncedFields: ['status', 'value', 'completedDate'],
      syncedAt: new Date(),
    };
  }

  private async syncWithInvoiceModules(milestone: any, tenantId: string): Promise<any> {
    // Sync milestone data with invoice-related modules
    return {
      milestoneId: milestone.id,
      invoiceId: milestone.invoiceId,
      syncType: 'invoice',
      syncedFields: ['invoiceId', 'paidDate', 'paymentReference'],
      syncedAt: new Date(),
    };
  }
}
