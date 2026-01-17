import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceItem } from '../entities/invoice-item.entity';
import { MilestoneVerification } from '../entities/milestone-verification.entity';
import { IntegrationService } from './integration.service';
import { NotificationService } from './notification.service';

export interface InvoiceGenerationRequest {
  milestoneId: string;
  clientId: string;
  projectId: string;
  customFields?: any;
  invoiceTemplate?: string;
  paymentTerms?: string;
  dueDate?: Date;
  notes?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  clientInfo: any;
  projectInfo: any;
  milestoneInfo: any;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate: Date;
  paymentTerms: string;
  notes: string;
}

@Injectable()
export class InvoiceGenerationService {
  private readonly logger = new Logger(InvoiceGenerationService.name);

  constructor(
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(MilestoneVerification)
    private verificationRepository: Repository<MilestoneVerification>,
    private integrationService: IntegrationService,
    private notificationService: NotificationService,
    private dataSource: DataSource,
  ) {}

  async generateInvoice(request: InvoiceGenerationRequest, generatedBy: string): Promise<Invoice> {
    this.logger.log(`Generating invoice for milestone: ${request.milestoneId}`);

    // Validate milestone exists and is completed
    const milestone = await this.validateMilestoneForInvoice(request.milestoneId);
    
    // Check if invoice already exists
    const existingInvoice = await this.findExistingInvoice(request.milestoneId);
    if (existingInvoice) {
      throw new Error(`Invoice already exists for milestone ${request.milestoneId}`);
    }

    // Generate invoice data
    const invoiceData = await this.generateInvoiceData(request, milestone);
    
    // Create invoice record
    const invoice = await this.createInvoiceRecord(invoiceData, generatedBy);
    
    // Generate invoice document
    const invoiceDocument = await this.generateInvoiceDocument(invoice);
    
    // Send notifications
    await this.sendInvoiceNotifications(invoice, request);
    
    // Update milestone status
    await this.updateMilestoneInvoiceStatus(request.milestoneId, invoice.id);
    
    this.logger.log(`Invoice generated successfully: ${invoice.id}`);
    return invoice;
  }

  async generateBulkInvoices(milestoneIds: string[], clientId: string, projectId: string, generatedBy: string): Promise<Invoice[]> {
    this.logger.log(`Generating bulk invoices for ${milestoneIds.length} milestones`);

    const results: Invoice[] = [];
    const errors: string[] = [];

    for (const milestoneId of milestoneIds) {
      try {
        const request: InvoiceGenerationRequest = {
          milestoneId,
          clientId,
          projectId,
        };
        
        const invoice = await this.generateInvoice(request, generatedBy);
        results.push(invoice);
      } catch (error) {
        errors.push(`Failed to generate invoice for milestone ${milestoneId}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`Bulk invoice generation completed with ${errors.length} errors: ${errors.join(', ')}`);
    }

    return results;
  }

  async generateScheduledInvoices(): Promise<Invoice[]> {
    this.logger.log('Generating scheduled invoices');

    // Find milestones that are completed and haven't been invoiced
    const completedMilestones = await this.milestoneRepository.find({
      where: {
        status: 'COMPLETED',
        invoiceGenerated: false,
        isDeleted: false,
      },
      relations: ['project', 'client'],
    });

    const invoices: Invoice[] = [];

    for (const milestone of completedMilestones) {
      try {
        const request: InvoiceGenerationRequest = {
          milestoneId: milestone.id,
          clientId: milestone.project?.clientId || 'default-client',
          projectId: milestone.projectId || 'default-project',
        };
        
        const invoice = await this.generateInvoice(request, 'system');
        invoices.push(invoice);
      } catch (error) {
        this.logger.error(`Failed to generate scheduled invoice for milestone ${milestone.id}:`, error);
      }
    }

    return invoices;
  }

  async generatePartialInvoice(milestoneId: string, percentage: number, clientId: string, projectId: string, generatedBy: string): Promise<Invoice> {
    this.logger.log(`Generating partial invoice (${percentage}%) for milestone: ${milestoneId}`);

    const milestone = await this.validateMilestoneForInvoice(milestoneId);
    
    if (percentage <= 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    const request: InvoiceGenerationRequest = {
      milestoneId,
      clientId,
      projectId,
      customFields: { isPartial: true, percentage },
    };

    const invoiceData = await this.generateInvoiceData(request, milestone);
    
    // Adjust amounts for partial invoice
    invoiceData.subtotal = (invoiceData.subtotal * percentage) / 100;
    invoiceData.tax = (invoiceData.tax * percentage) / 100;
    invoiceData.total = (invoiceData.total * percentage) / 100;
    
    // Update item quantities
    invoiceData.items.forEach(item => {
      item.quantity = (item.quantity * percentage) / 100;
      item.amount = item.quantity * item.unitPrice;
    });

    const invoice = await this.createInvoiceRecord(invoiceData, generatedBy);
    
    // Add partial invoice note
    invoice.notes = `Partial invoice - ${percentage}% of total milestone value. ${invoice.notes || ''}`;
    await this.invoiceRepository.save(invoice);

    return invoice;
  }

  async generateRecurringInvoice(milestoneId: string, schedule: string, clientId: string, projectId: string, generatedBy: string): Promise<Invoice> {
    this.logger.log(`Generating recurring invoice for milestone: ${milestoneId} with schedule: ${schedule}`);

    const milestone = await this.validateMilestoneForInvoice(milestoneId);
    
    const request: InvoiceGenerationRequest = {
      milestoneId,
      clientId,
      projectId,
      customFields: { isRecurring: true, schedule },
    };

    const invoiceData = await this.generateInvoiceData(request, milestone);
    
    // Add recurring invoice note
    invoiceData.notes = `Recurring invoice - Schedule: ${schedule}. ${invoiceData.notes || ''}`;

    const invoice = await this.createInvoiceRecord(invoiceData, generatedBy);
    
    // Schedule next invoice
    await this.scheduleNextRecurringInvoice(milestoneId, schedule, clientId, projectId);

    return invoice;
  }

  async cancelInvoice(invoiceId: string, reason: string, cancelledBy: string): Promise<Invoice> {
    this.logger.log(`Cancelling invoice: ${invoiceId}`);

    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, isDeleted: false },
    });

    if (!invoice) {
      throw new Error(`Invoice with ID ${invoiceId} not found`);
    }

    if (invoice.status === 'PAID') {
      throw new Error('Cannot cancel paid invoice');
    }

    const updatedInvoice = await this.invoiceRepository.save({
      ...invoice,
      status: 'CANCELLED',
      cancelledBy,
      cancelledDate: new Date(),
      cancellationReason: reason,
      updatedAt: new Date(),
    });

    // Send cancellation notification
    await this.sendInvoiceCancellationNotification(updatedInvoice);

    // Update milestone status
    if (invoice.milestoneId) {
      await this.milestoneRepository.update(invoice.milestoneId, {
        invoiceGenerated: false,
        invoiceId: null,
        updatedAt: new Date(),
      });
    }

    return updatedInvoice;
  }

  async updateInvoice(invoiceId: string, updates: Partial<Invoice>, updatedBy: string): Promise<Invoice> {
    this.logger.log(`Updating invoice: ${invoiceId}`);

    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, isDeleted: false },
    });

    if (!invoice) {
      throw new Error(`Invoice with ID ${invoiceId} not found`);
    }

    if (invoice.status === 'PAID') {
      throw new Error('Cannot update paid invoice');
    }

    const updatedInvoice = await this.invoiceRepository.save({
      ...invoice,
      ...updates,
      updatedBy,
      updatedAt: new Date(),
    });

    // Send update notification if needed
    if (updates.status) {
      await this.sendInvoiceStatusUpdateNotification(updatedInvoice);
    }

    return updatedInvoice;
  }

  async getInvoicePreview(milestoneId: string, clientId: string, projectId: string): Promise<InvoiceData> {
    this.logger.log(`Generating invoice preview for milestone: ${milestoneId}`);

    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId, isDeleted: false },
      relations: ['project', 'client'],
    });

    if (!milestone) {
      throw new Error(`Milestone with ID ${milestoneId} not found`);
    }

    const request: InvoiceGenerationRequest = {
      milestoneId,
      clientId,
      projectId,
    };

    const invoiceData = await this.generateInvoiceData(request, milestone);
    
    // Add preview watermark
    invoiceData.notes = `PREVIEW - This is a draft invoice. Not yet generated. ${invoiceData.notes || ''}`;
    invoiceData.invoiceNumber = 'PREVIEW-' + invoiceData.invoiceNumber;

    return invoiceData;
  }

  async getInvoiceAnalytics(tenantId: string, timeRange?: string): Promise<{
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    averageInvoiceAmount: number;
    invoicesByStatus: Record<string, number>;
    revenueByMonth: Array<{
      month: string;
      amount: number;
      count: number;
    }>;
  }> {
    const where: any = { tenantId, isDeleted: false };

    if (timeRange) {
      const dateFilter = this.getDateFilter(timeRange);
      where.createdAt = dateFilter;
    }

    const [totalInvoices, totalAmountResult] = await Promise.all([
      this.invoiceRepository.count({ where }),
      this.invoiceRepository
        .createQueryBuilder('invoice')
        .select('SUM(invoice.totalAmount)', 'total')
        .where(where)
        .getRawOne(),
    ]);

    const totalAmount = parseFloat(totalAmountResult?.total) || 0;

    // Get amounts by status
    const statusAmounts = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('invoice.status', 'status')
      .addSelect('SUM(invoice.totalAmount)', 'amount')
      .where(where)
      .groupBy('invoice.status')
      .getRawMany();

    const statusAmountMap = statusAmounts.reduce((acc, item) => {
      acc[item.status] = parseFloat(item.amount) || 0;
      return acc;
    }, {} as Record<string, number>);

    const paidAmount = statusAmountMap['PAID'] || 0;
    const pendingAmount = statusAmountMap['PENDING'] || 0;
    const overdueAmount = statusAmountMap['OVERDUE'] || 0;

    // Get invoices by status count
    const statusCounts = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('invoice.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(where)
      .groupBy('invoice.status')
      .getRawMany();

    const invoicesByStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count) || 0;
      return acc;
    }, {} as Record<string, number>);

    // Get revenue by month
    const revenueByMonth = await this.getRevenueByMonth(tenantId, timeRange);

    return {
      totalInvoices,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      averageInvoiceAmount: totalInvoices > 0 ? totalAmount / totalInvoices : 0,
      invoicesByStatus,
      revenueByMonth,
    };
  }

  private async validateMilestoneForInvoice(milestoneId: string): Promise<Milestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId, isDeleted: false },
      relations: ['project', 'client', 'verifications'],
    });

    if (!milestone) {
      throw new Error(`Milestone with ID ${milestoneId} not found`);
    }

    if (milestone.status !== 'COMPLETED') {
      throw new Error(`Milestone must be completed to generate invoice. Current status: ${milestone.status}`);
    }

    // Check if all verifications are approved
    const pendingVerifications = milestone.verifications?.filter(v => v.status !== 'APPROVED') || [];
    if (pendingVerifications.length > 0) {
      throw new Error(`Cannot generate invoice: ${pendingVerifications.length} verifications are not approved`);
    }

    return milestone;
  }

  private async findExistingInvoice(milestoneId: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { milestoneId, isDeleted: false },
    });
  }

  private async generateInvoiceData(request: InvoiceGenerationRequest, milestone: Milestone): Promise<InvoiceData> {
    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();
    
    // Get client and project information
    const clientInfo = await this.getClientInfo(request.clientId);
    const projectInfo = await this.getProjectInfo(request.projectId);
    
    // Generate invoice items
    const items = await this.generateInvoiceItems(milestone);
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.18; // 18% tax rate (configurable)
    const total = subtotal + tax;
    
    // Set due date
    const dueDate = request.dueDate || this.calculateDueDate(request.paymentTerms);
    
    return {
      invoiceNumber,
      clientInfo,
      projectInfo,
      milestoneInfo: {
        id: milestone.id,
        name: milestone.title || milestone.name,
        description: milestone.description,
        completionDate: milestone.completedDate,
        progressPercentage: milestone.progressPercentage,
      },
      items,
      subtotal,
      tax,
      total,
      dueDate,
      paymentTerms: request.paymentTerms || 'Net 30',
      notes: request.notes || '',
    };
  }

  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // Get count of invoices this month
    const count = await this.invoiceRepository.count({
      where: {
        createdAt: {
          $gte: new Date(year, today.getMonth(), 1),
          $lt: new Date(year, today.getMonth() + 1, 1),
        },
      },
    });
    
    return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  private async getClientInfo(clientId: string): Promise<any> {
    // This would integrate with client management system
    // For now, return mock data
    return {
      id: clientId,
      name: 'Sample Client',
      address: '123 Business St, Suite 100',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400001',
      email: 'client@example.com',
      phone: '+91-9876543210',
      taxId: 'GSTIN1234567890',
    };
  }

  private async getProjectInfo(projectId: string): Promise<any> {
    // This would integrate with project management system
    // For now, return mock data
    return {
      id: projectId,
      name: 'Sample Project',
      description: 'Project description',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      contractValue: 1000000,
      currency: 'INR',
    };
  }

  private async generateInvoiceItems(milestone: Milestone): Promise<InvoiceItem[]> {
    const items: InvoiceItem[] = [];
    
    // Main milestone item
    items.push({
      id: `item-${Date.now()}-1`,
      invoiceId: '', // Will be set after invoice creation
      description: milestone.title || milestone.name,
      quantity: 1,
      unitPrice: milestone.amount || milestone.value || 0,
      amount: milestone.amount || milestone.value || 0,
      itemType: 'MILESTONE',
      taxRate: 18,
      taxAmount: (milestone.amount || milestone.value || 0) * 0.18,
      metadata: {
        milestoneId: milestone.id,
        milestoneType: milestone.type,
      },
    });

    // Add additional items if milestone has components
    if (milestone.components && milestone.components.length > 0) {
      milestone.components.forEach((component, index) => {
        items.push({
          id: `item-${date.now()}-${index + 2}`,
          invoiceId: '',
          description: component.name,
          quantity: component.quantity || 1,
          unitPrice: component.unitPrice || 0,
          amount: (component.quantity || 1) * (component.unitPrice || 0),
          itemType: 'COMPONENT',
          taxRate: 18,
          taxAmount: ((component.quantity || 1) * (component.unitPrice || 0)) * 0.18,
          metadata: {
            componentId: component.id,
            componentType: component.type,
          },
        });
      });
    }

    return items;
  }

  private calculateDueDate(paymentTerms: string): Date {
    const now = new Date();
    const days = this.parsePaymentTerms(paymentTerms);
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private parsePaymentTerms(terms: string): number {
    const match = terms.match(/(\d+)/);
    return match ? parseInt(match[1]) : 30; // Default to 30 days
  }

  private async createInvoiceRecord(invoiceData: InvoiceData, generatedBy: string): Promise<Invoice> {
    const invoice = this.invoiceRepository.create({
      invoiceNumber: invoiceData.invoiceNumber,
      clientId: invoiceData.clientInfo.id,
      projectId: invoiceData.projectInfo.id,
      milestoneId: invoiceData.milestoneInfo.id,
      status: 'PENDING',
      subtotal: invoiceData.subtotal,
      taxAmount: invoiceData.tax,
      totalAmount: invoiceData.total,
      dueDate: invoiceData.dueDate,
      paymentTerms: invoiceData.paymentTerms,
      notes: invoiceData.notes,
      generatedBy,
      generatedDate: new Date(),
      currency: invoiceData.projectInfo.currency || 'INR',
      exchangeRate: 1,
      metadata: {
        clientInfo: invoiceData.clientInfo,
        projectInfo: invoiceData.projectInfo,
        milestoneInfo: invoiceData.milestoneInfo,
      },
      isActive: true,
      isDeleted: false,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Create invoice items
    for (const itemData of invoiceData.items) {
      const invoiceItem = this.invoiceItemRepository.create({
        ...itemData,
        invoiceId: savedInvoice.id,
      });
      await this.invoiceItemRepository.save(invoiceItem);
    }

    return savedInvoice;
  }

  private async generateInvoiceDocument(invoice: Invoice): Promise<string> {
    // Generate PDF invoice document
    // This would integrate with PDF generation service
    const documentContent = `
      Invoice: ${invoice.invoiceNumber}
      Client: ${invoice.clientId}
      Amount: ${invoice.totalAmount}
      Due Date: ${invoice.dueDate}
    `;
    
    return documentContent;
  }

  private async sendInvoiceNotifications(invoice: Invoice, request: InvoiceGenerationRequest): Promise<void> {
    // Send email notification to client
    await this.notificationService.sendEmail({
      to: invoice.clientId,
      subject: `Invoice ${invoice.invoiceNumber} - ${invoice.milestoneId}`,
      template: 'invoice-generated',
      data: {
        invoice,
        milestone: request.milestoneId,
        client: request.clientId,
      },
    });

    // Send internal notification
    await this.notificationService.sendInAppNotification({
      userId: invoice.generatedBy,
      title: 'Invoice Generated',
      message: `Invoice ${invoice.invoiceNumber} has been generated for milestone ${request.milestoneId}`,
      type: 'INVOICE_GENERATED',
      data: { invoiceId: invoice.id },
    });
  }

  private async sendInvoiceCancellationNotification(invoice: Invoice): Promise<void> {
    await this.notificationService.sendEmail({
      to: invoice.clientId,
      subject: `Invoice ${invoice.invoiceNumber} Cancelled`,
      template: 'invoice-cancelled',
      data: { invoice },
    });
  }

  private async sendInvoiceStatusUpdateNotification(invoice: Invoice): Promise<void> {
    await this.notificationService.sendEmail({
      to: invoice.clientId,
      subject: `Invoice ${invoice.invoiceNumber} Status Updated`,
      template: 'invoice-status-updated',
      data: { invoice },
    });
  }

  private async updateMilestoneInvoiceStatus(milestoneId: string, invoiceId: string): Promise<void> {
    await this.milestoneRepository.update(milestoneId, {
      invoiceGenerated: true,
      invoiceId,
      updatedAt: new Date(),
    });
  }

  private async scheduleNextRecurringInvoice(milestoneId: string, schedule: string, clientId: string, projectId: string): Promise<void> {
    // This would integrate with job scheduling system
    // For now, just log the scheduling
    this.logger.log(`Scheduled next recurring invoice for milestone: ${milestoneId} with schedule: ${schedule}`);
  }

  private getDateFilter(timeRange: string): any {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { $gte: startDate };
  }

  private async getRevenueByMonth(tenantId: string, timeRange?: string): Promise<Array<{
    month: string;
    amount: number;
    count: number;
  }>> {
    const months = timeRange === '1y' ? 12 : timeRange === '90d' ? 3 : 1;
    const revenueByMonth = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const result = await this.invoiceRepository
        .createQueryBuilder('invoice')
        .select('SUM(invoice.totalAmount)', 'amount')
        .addSelect('COUNT(*)', 'count')
        .where({
          tenantId,
          status: 'PAID',
          createdAt: {
            $gte: monthStart,
            $lt: monthEnd,
          },
          isDeleted: false,
        })
        .getRawOne();

      revenueByMonth.push({
        month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        amount: parseFloat(result?.amount) || 0,
        count: parseInt(result?.count) || 0,
      });
    }

    return revenueByMonth;
  }
}
