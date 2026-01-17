import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    Put,
    Delete,
    Query,
    UsePipes,
    ValidationPipe,
    ParseUUIDPipe,
    UploadedFile,
    UseInterceptors,
    Logger,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvoiceService } from '../services/invoice.service';
import { TemplateManagementService } from '../services/template-management.service';
import { RecurringInvoiceService } from '../services/recurring-invoice-profile.service';
import {
    DistributionIntegrationService,
    PaymentIntegrationService,
    NotificationIntegrationService,
    GLPostingIntegrationService,
} from '../integration/cross-module.integration';
import { CreateInvoiceDto, UpdateInvoiceDto } from '../dto/invoice.dto';
import { Invoice } from '../entities/invoice.entity';
import { Express } from 'express';
import * as Papa from 'papaparse';

// PHASE 3: Missing API Endpoints

@Controller('api/v1/invoices')
export class InvoiceControllerExtended {
    private readonly logger = new Logger(InvoiceControllerExtended.name);

    constructor(
        private readonly invoiceService: InvoiceService,
        private readonly templateService: TemplateManagementService,
        private readonly recurringService: RecurringInvoiceService,
        private readonly distributionService: DistributionIntegrationService,
        private readonly paymentService: PaymentIntegrationService,
        private readonly notificationService: NotificationIntegrationService,
        private readonly glService: GLPostingIntegrationService,
    ) { }

    // ============================================================================
    // MISSING ENDPOINT 1: Duplicate Invoice
    // ============================================================================

    @Post(':id/duplicate')
    async duplicateInvoice(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
        @Body() options?: { set_as_draft?: boolean; copy_line_items?: boolean },
    ): Promise<Invoice> {
        this.logger.log(`Duplicating invoice ${id}`);

        try {
            // Get original invoice with all relations
            const original = await this.invoiceService.findOne(id, tenant_id);

            // Generate new invoice number
            const newNumber = await this.generateNextInvoiceNumber(tenant_id);

            // Calculate new dates
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + 30); // Default 30 days

            // Create duplicate data
            const duplicateData: any = {
                // Copy most fields
                tenant_id: original.tenant_id,
                client_id: original.client_id,
                currency: original.currency,
                payment_terms: original.payment_terms,
                notes: original.notes,
                terms_conditions: original.terms_conditions,

                // New values for duplicate
                number: newNumber,
                issue_date: today,
                due_date: dueDate,
                status: options?.set_as_draft !== false ? 'draft' : original.status,

                // Reset financial fields
                amount_paid: 0,
                balance_due: original.grand_total,

                // Copy line items if requested
                line_items: options?.copy_line_items !== false ? original.line_items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate,
                    tax_amount: item.tax_amount,
                    discount_amount: item.discount_amount,
                })) : [],
            };

            const duplicated = await this.invoiceService.create(duplicateData);

            this.logger.log(`Invoice duplicated: ${original.number} → ${duplicated.number}`);
            return duplicated;
        } catch (error) {
            this.logger.error(`Error duplicating invoice ${id}:`, error);
            throw new HttpException(
                'Failed to duplicate invoice',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ============================================================================
    // MISSING ENDPOINT 2: CSV Import
    // ============================================================================

    @Post('import-csv')
    @UseInterceptors(FileInterceptor('file'))
    async importFromCSV(
        @UploadedFile() file: Express.Multer.File,
        @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
    ): Promise<{ imported: number; failed: number; errors: any[] }> {
        this.logger.log(`Importing invoices from CSV for tenant ${tenant_id}`);

        if (!file) {
            throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
        }

        const results = {
            imported: 0,
            failed: 0,
            errors: [] as any[],
        };

        try {
            // Parse CSV
            const csvText = file.buffer.toString('utf-8');
            const parsed = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.trim().toLowerCase().replace(/ /g, '_'),
            });

            this.logger.log(`Parsed ${parsed.data.length} rows from CSV`);

            // Process each row
            for (let i = 0; i < parsed.data.length; i++) {
                const row: any = parsed.data[i];

                try {
                    // Validate required fields
                    if (!row.client_id || !row.amount) {
                        throw new Error('Missing required fields: client_id or amount');
                    }

                    // Create invoice data
                    const invoiceData: any = {
                        tenant_id,
                        client_id: row.client_id,
                        number: row.invoice_number || await this.generateNextInvoiceNumber(tenant_id),
                        issue_date: row.issue_date ? new Date(row.issue_date) : new Date(),
                        due_date: row.due_date ? new Date(row.due_date) : this.calculateDueDate(new Date(), 30),
                        currency: row.currency || 'INR',
                        status: row.status || 'draft',
                        notes: row.notes,
                        payment_terms: row.payment_terms,

                        // Line items (simplified - single line item from CSV)
                        line_items: [{
                            description: row.description || 'Imported item',
                            quantity: parseFloat(row.quantity) || 1,
                            unit_price: parseFloat(row.amount) || 0,
                            tax_rate: parseFloat(row.tax_rate) || 0,
                        }],
                    };

                    await this.invoiceService.create(invoiceData);
                    results.imported++;

                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        row: i + 1,
                        data: row,
                        error: error.message,
                    });
                    this.logger.warn(`Failed to import row ${i + 1}:`, error.message);
                }
            }

            this.logger.log(
                `CSV import complete: ${results.imported} imported, ${results.failed} failed`,
            );
            return results;

        } catch (error) {
            this.logger.error('CSV import failed:', error);
            throw new HttpException(
                'CSV import failed: ' + error.message,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    // ============================================================================
    // MISSING ENDPOINT 3: Bulk Update
    // ============================================================================

    @Put('bulk-update')
    async bulkUpdate(
        @Body() data: { ids: string[]; updates: Partial<UpdateInvoiceDto> },
        @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
    ): Promise<{ updated: number; failed: number; errors: any[] }> {
        this.logger.log(`Bulk updating ${data.ids.length} invoices`);

        const results = {
            updated: 0,
            failed: 0,
            errors: [] as any[],
        };

        for (const id of data.ids) {
            try {
                await this.invoiceService.update(id, data.updates, tenant_id);
                results.updated++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    id,
                    error: error.message,
                });
            }
        }

        this.logger.log(
            `Bulk update complete: ${results.updated} updated, ${results.failed} failed`,
        );
        return results;
    }

    // ============================================================================
    // MISSING ENDPOINT 4: Bulk Delete
    // ============================================================================

    @Delete('bulk-delete')
    async bulkDelete(
        @Body() data: { ids: string[] },
        @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
    ): Promise<{ deleted: number; failed: number; errors: any[] }> {
        this.logger.log(`Bulk deleting ${data.ids.length} invoices`);

        const results = {
            deleted: 0,
            failed: 0,
            errors: [] as any[],
        };

        for (const id of data.ids) {
            try {
                await this.invoiceService.remove(id, tenant_id);
                results.deleted++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    id,
                    error: error.message,
                });
            }
        }

        this.logger.log(
            `Bulk delete complete: ${results.deleted} deleted, ${results.failed} failed`,
        );
        return results;
    }

    // ============================================================================
    // ENHANCED ENDPOINT: Send Invoice (With Integration)
    // ============================================================================

    @Post(':id/send')
    async sendInvoice(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('tenant_id', ParseUUIDPipe) tenant_id: string,
        @Body() options?: {
            channels?: ('email' | 'sms' | 'whatsapp')[];
            create_payment_link?: boolean;
            post_to_gl?: boolean;
        },
    ): Promise<{
        invoice: Invoice;
        distribution: any;
        payment_link?: any;
        gl_posting?: any;
    }> {
        this.logger.log(`Sending invoice ${id} with integrations`);

        // Update invoice status to 'sent'
        const invoice = await this.invoiceService.update(
            id,
            { status: 'sent' } as any,
            tenant_id,
        );

        // Trigger distribution (M02)
        const distribution = await this.distributionService.distributeInvoice(
            invoice,
            options?.channels,
        );

        let payment_link;
        if (options?.create_payment_link) {
            // Create payment link (M03)
            payment_link = await this.paymentService.createPaymentLink(invoice);
        }

        let gl_posting;
        if (options?.post_to_gl) {
            // Post to GL (M17)
            gl_posting = await this.glService.postInvoiceToGL(invoice);
        }

        // Send notification (M11)
        await this.notificationService.sendInvoiceNotification(invoice, 'sent');

        return {
            invoice,
            distribution,
            payment_link,
            gl_posting,
        };
    }

    // ============================================================================
    // PAYMENT CALLBACK ENDPOINT
    // ============================================================================

    @Post(':id/payment-callback')
    async handlePaymentCallback(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() paymentData: any,
    ): Promise<Invoice> {
        this.logger.log(`Payment callback for invoice ${id}`);

        if (paymentData.status === 'success') {
            // Update invoice with payment
            const invoice = await this.invoiceService.findOne(id, paymentData.tenant_id);

            const updatedInvoice = await this.invoiceService.update(
                id,
                {
                    amount_paid: (invoice.amount_paid || 0) + paymentData.amount,
                    balance_due: invoice.balance_due - paymentData.amount,
                    status: invoice.balance_due - paymentData.amount <= 0 ? 'paid' : 'partially_paid',
                } as any,
                paymentData.tenant_id,
            );

            // Post payment to GL
            await this.glService.postPaymentToGL(updatedInvoice, paymentData.amount);

            // Send notification
            await this.notificationService.sendInvoiceNotification(
                updatedInvoice,
                updatedInvoice.status === 'paid' ? 'paid' : 'sent',
            );

            return updatedInvoice;
        }

        throw new HttpException('Payment not successful', HttpStatus.BAD_REQUEST);
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    private async generateNextInvoiceNumber(tenantId: string): Promise<string> {
        const count = await this.invoiceService.countByTenant(tenantId);
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    private calculateDueDate(issueDate: Date, daysUntilDue: number): Date {
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + daysUntilDue);
        return dueDate;
    }
}
