import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvoiceService } from './Module_01_Smart_Invoice_Generation/src/services/invoice.service';
import { PDFService } from './Module_01_Smart_Invoice_Generation/src/services/pdf.service';
import { QualityAssuranceService } from './Module_01_Smart_Invoice_Generation/src/services/quality-assurance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Invoice, InvoiceLineItem } from './Module_01_Smart_Invoice_Generation/src/entities';
import { NotificationService } from './Module_11_Common/src/services/notification.service';
import { AuditService } from './Module_12_Administration/src/services/audit.service';

async function verifyEnhancedInvoice() {
    console.log('🚀 Starting Enhanced Invoice Verification (Mocked DB)...');

    const mockRepo = {
        create: (dto: any) => ({ ...dto, id: 'mock-id' }),
        save: async (entity: any) => ({ ...entity, id: 'saved-id', invoiceNumber: 'INV-MOCK-001' }),
        count: async () => 0,
        findOne: async () => null,
    };

    const mockNotificationService = {
        sendEmail: async () => { },
    };

    const mockAuditService = {
        log: async () => { },
    };

    const mockQualityService = {
        checkQuality: async () => ({ overallQualityScore: 0.95, checks: [], aiAnalysis: [] }),
    };

    try {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
            ],
            providers: [
                InvoiceService,
                PDFService,
                {
                    provide: getRepositoryToken(Invoice),
                    useValue: mockRepo,
                },
                {
                    provide: getRepositoryToken(InvoiceLineItem),
                    useValue: mockRepo,
                },
                {
                    provide: NotificationService,
                    useValue: mockNotificationService,
                },
                {
                    provide: AuditService,
                    useValue: mockAuditService,
                },
                {
                    provide: QualityAssuranceService,
                    useValue: mockQualityService,
                }
            ],
        }).compile();

        const invoiceService = moduleRef.get<InvoiceService>(InvoiceService);
        const pdfService = moduleRef.get<PDFService>(PDFService);

        console.log('✅ Services Resolved');

        // 1. Create Invoice
        const invoiceData: any = {
            tenantId: 'tenant-1',
            invoiceNumber: `INV-${Date.now()}`,
            customerName: 'Verified Customer',
            customerEmail: 'verify@example.com',
            lineItems: [
                { description: 'Premium Widget', quantity: 2, unitPrice: 100 },
                { description: 'Service Fee', quantity: 1, unitPrice: 50 }
            ],
            currency: 'USD',
            issueDate: new Date().toISOString(),
            dueDate: new Date().toISOString()
        };

        const createdInvoice = await invoiceService.create('tenant-1', 'user-1', invoiceData);

        if (createdInvoice && createdInvoice.id) {
            console.log(`✅ Invoice Created: ${createdInvoice.invoiceNumber} (ID: ${createdInvoice.id})`);
            console.log(`   Quality Score: ${createdInvoice.qualityScore}`);
        } else {
            throw new Error('Invoice creation failed - no ID returned');
        }

        // 2. Generate PDF
        // Ensure calculated fields exist for PDF generation
        createdInvoice.subTotal = 250;
        createdInvoice.totalTaxAmount = 0;
        createdInvoice.totalDiscountAmount = 0;
        createdInvoice.grandTotal = 250;
        createdInvoice.balanceDue = 250;
        createdInvoice.amountPaid = 0;
        (createdInvoice as any).lineItems = invoiceData.lineItems.map((i: any) => ({ ...i, lineTotal: i.quantity * i.unitPrice, taxRate: 0, discountAmount: 0 }));

        const pdfBuffer = await pdfService.generateInvoicePDF2(createdInvoice);

        if (pdfBuffer && pdfBuffer.length > 0) {
            console.log(`✅ PDF Generated: ${pdfBuffer.length} bytes`);
        } else {
            throw new Error('PDF Generation failed - empty buffer');
        }

        console.log('✨ Enhanced Verification Complete');
        process.exit(0);

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }
}

verifyEnhancedInvoice();
