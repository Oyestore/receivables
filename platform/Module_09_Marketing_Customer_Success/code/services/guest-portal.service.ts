import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../../Module_01_Smart_Invoice_Generation/src/entities/invoice.entity';

/**
 * @deprecated This service is deprecated as of v2.0.
 * Use Module 16 (Invoice Concierge) StaticPortalService instead.
 * 
 * Module 16 provides:
 * - AI-powered chat interface (ConciergeService)
 * - Static portal view (StaticPortalService) 
 * - Payment integration
 * - Dispute handling
 * - PDF download
 * 
 * This service will be removed in v3.0.
 * 
 * @see Module_16_Invoice_Concierge/code/services/concierge.service.ts
 */
@Injectable()
export class GuestPortalService {
    private readonly logger = new Logger(GuestPortalService.name);
    constructor(
        @InjectRepository(Invoice)
        private invoiceRepository: Repository<Invoice>,
    ) {
        this.logger.warn('GuestPortalService is DEPRECATED. Use Module 16 StaticPortalService instead.');
    }

    async getPublicInvoice(id: string, token: string): Promise<any> {
        // In a real implementation, we would verify the secure token
        // For now, we just fetch by ID
        const invoice = await this.invoiceRepository.findOne({
            where: { id }
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        // Return a sanitized version for public view
        return {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            date: (invoice as any).createdAt ?? new Date(),
            dueDate: invoice.dueDate,
            amount: (invoice as any).grandTotal ?? (invoice as any).balanceDue ?? 0,
            currency: invoice.currency,
            status: invoice.status,
            items: (invoice as any).lineItems ?? [],
            supplierName: 'Acme Corp', // Mock - should come from Tenant/Organization
            customerName: (invoice as any).customerName ?? '',
            actions: {
                canPay: String(invoice.status).toUpperCase() !== 'PAID',
                canDispute: true,
                canDownload: true,
            },
        };
    }

    async trackView(id: string, viewerIp: string): Promise<void> {
        this.logger.log(`Invoice ${id} viewed by ${viewerIp}`);
        // TODO: Log to analytics
    }
}
