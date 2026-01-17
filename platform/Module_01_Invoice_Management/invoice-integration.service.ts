import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUpEngineService } from './follow-up-engine.service';
import { InvoiceTemplateMaster } from '../../templates/entities/invoice-template-master.entity';
import { InvoiceTemplateVersion } from '../../templates/entities/invoice-template-version.entity';

/**
 * Service to integrate with Phase 1 invoice data and trigger follow-ups
 */
@Injectable()
export class InvoiceIntegrationService {
  constructor(
    @InjectRepository(InvoiceTemplateMaster)
    private invoiceTemplateMasterRepository: Repository<InvoiceTemplateMaster>,
    @InjectRepository(InvoiceTemplateVersion)
    private invoiceTemplateVersionRepository: Repository<InvoiceTemplateVersion>,
    private followUpEngineService: FollowUpEngineService,
  ) {}

  /**
   * Process new invoices for follow-up scheduling
   * This would be called when new invoices are generated in Phase 1
   */
  async processNewInvoices(invoiceIds: string[]): Promise<void> {
    // In a real implementation, we would fetch the invoice data from the database
    // For now, we'll simulate this with mock data
    const invoices = await this.fetchInvoiceData(invoiceIds);
    
    // Process follow-ups for these invoices
    await this.followUpEngineService.processFollowUps(invoices);
  }

  /**
   * Process invoice status updates for follow-up management
   * This would be called when invoice statuses change (e.g., payment received)
   */
  async processInvoiceStatusUpdates(invoiceIds: string[], newStatus: string): Promise<void> {
    // In a real implementation, we would update the invoice status in the database
    // and then process any follow-ups that need to be triggered or canceled
    const invoices = await this.fetchInvoiceData(invoiceIds);
    
    // Update the status in our mock data
    const updatedInvoices = invoices.map(invoice => ({
      ...invoice,
      status: newStatus,
    }));
    
    // Process follow-ups for these invoices with updated status
    await this.followUpEngineService.processFollowUps(updatedInvoices);
  }

  /**
   * Apply a follow-up sequence to invoices
   */
  async applySequenceToInvoices(sequenceId: string, invoiceIds: string[]): Promise<void> {
    const invoices = await this.fetchInvoiceData(invoiceIds);
    
    for (const invoice of invoices) {
      await this.followUpEngineService.applySequenceToInvoice(
        sequenceId,
        invoice.id,
        invoice.recipientId,
        invoice.organizationId,
      );
    }
  }

  /**
   * Mock function to fetch invoice data
   * In a real implementation, this would query the database
   */
  private async fetchInvoiceData(invoiceIds: string[]): Promise<any[]> {
    // This is a mock implementation
    return invoiceIds.map(id => ({
      id,
      recipientId: `recipient-${Math.floor(Math.random() * 1000)}`,
      organizationId: 'org-123',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      amount: Math.floor(Math.random() * 10000) / 100,
      status: 'PENDING',
      createdAt: new Date(),
    }));
  }

  /**
   * Get invoice templates from Phase 1
   */
  async getInvoiceTemplates(organizationId: string): Promise<any[]> {
    const templates = await this.invoiceTemplateMasterRepository.find({
      where: { organizationId },
      relations: ['latestVersion'],
    });
    
    return templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      latestVersionId: template.latestVersion?.id,
    }));
  }

  /**
   * Get invoice template versions from Phase 1
   */
  async getInvoiceTemplateVersions(templateId: string, organizationId: string): Promise<any[]> {
    const versions = await this.invoiceTemplateVersionRepository.find({
      where: { templateMasterId: templateId },
      order: { versionNumber: 'DESC' },
    });
    
    return versions.map(version => ({
      id: version.id,
      versionNumber: version.versionNumber,
      createdAt: version.createdAt,
      htmlContent: version.htmlContent,
    }));
  }
}
