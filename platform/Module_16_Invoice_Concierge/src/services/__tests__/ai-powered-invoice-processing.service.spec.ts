import { Test, TestingModule } from '@nestjs/testing';
import { AIPoweredInvoiceProcessingService } from './ai-powered-invoice-processing.service';
import { ConfigService } from '@nestjs/config';

describe('AIPoweredInvoiceProcessingService', () => {
    let service: AIPoweredInvoiceProcessingService;
    let configService: Partial<ConfigService>;

    beforeEach(async () => {
        configService = {
            get: jest.fn((key: string) => {
                const config = {
                    'ai.apiKey': 'test-api-key',
                    'ai.model': 'gpt-4',
                    'ai.confidenceThreshold': 0.7,
                };
                return config[key];
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AIPoweredInvoiceProcessingService,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get<AIPoweredInvoiceProcessingService>(
            AIPoweredInvoiceProcessingService,
        );
    });

    describe('processInvoice', () => {
        it('should successfully process PDF invoice', async () => {
            const invoiceBuffer = Buffer.from('mock-pdf-content');
            const fileName = 'invoice.pdf';

            const result = await service.processInvoice(invoiceBuffer, fileName);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.confidence).toBeGreaterThanOrEqual(0);
        });

        it('should extract invoice number from document', async () => {
            const mockInvoice = Buffer.from('Invoice #INV-12345');

            const result = await service.processInvoice(mockInvoice, 'test.pdf');

            expect(result.data.invoiceNumber).toBeDefined();
            expect(typeof result.data.invoiceNumber).toBe('string');
        });

        it('should extract invoice amount accurately', async () => {
            const mockInvoice = Buffer.from('Total Amount: $1,250.00');

            const result = await service.processInvoice(mockInvoice, 'invoice.pdf');

            expect(result.data.amount).toBeDefined();
            expect(typeof result.data.amount).toBe('number');
            expect(result.data.currency).toBeDefined();
        });

        it('should handle image-based invoices', async () => {
            const imageBuffer = Buffer.from('mock-image-content');
            const fileName = 'invoice.jpg';

            const result = await service.processInvoice(imageBuffer, fileName);

            expect(result.success).toBe(true);
            expect(result.format).toBe('image');
        });

        it('should return low confidence for poor quality documents', async () => {
            const poorQualityDoc = Buffer.from('unreadable content ###@@@');

            const result = await service.processInvoice(poorQualityDoc, 'bad.pdf');

            expect(result.confidence).toBeLessThan(0.5);
            expect(result.warnings).toContain('low_confidence');
        });

        it('should handle multiple page invoices', async () => {
            const multiPageInvoice = Buffer.from('page1...page2...page3');

            const result = await service.processInvoice(multiPageInvoice, 'multi.pdf');

            expect(result.pageCount).toBeGreaterThan(1);
            expect(result.data.lineItems).toBeDefined();
        });

        it('should reject unsupported file formats', async () => {
            const unsupportedFile = Buffer.from('content');

            await expect(
                service.processInvoice(unsupportedFile, 'invoice.docx')
            ).rejects.toThrow('Unsupported file format');
        });
    });

    describe('extractInvoiceData', () => {
        it('should extract vendor information', async () => {
            const mockText = 'From: Acme Corp\nAddress: 123 Main St';

            const data = await service.extractInvoiceData(mockText);

            expect(data.vendor).toBeDefined();
            expect(data.vendor.name).toBeTruthy();
        });

        it('should extract date fields correctly', async () => {
            const mockText = 'Invoice Date: 2024-01-15\nDue Date: 2024-02-15';

            const data = await service.extractInvoiceData(mockText);

            expect(data.invoiceDate).toBeDefined();
            expect(data.dueDate).toBeDefined();
            expect(new Date(data.dueDate)).toBeInstanceOf(Date);
        });

        it('should parse line items with quantities and prices', async () => {
            const mockText = `
        Item 1: Widget @ $10.00 x 5
        Item 2: Gadget @ $25.00 x 2
      `;

            const data = await service.extractInvoiceData(mockText);

            expect(data.lineItems).toBeDefined();
            expect(data.lineItems.length).toBeGreaterThan(0);
            expect(data.lineItems[0]).toHaveProperty('quantity');
            expect(data.lineItems[0]).toHaveProperty('price');
        });

        it('should identify tax amounts', async () => {
            const mockText = 'Subtotal: $100.00\nTax (10%): $10.00\nTotal: $110.00';

            const data = await service.extractInvoiceData(mockText);

            expect(data.tax).toBeDefined();
            expect(data.taxRate).toBeDefined();
            expect(data.subtotal).toBeDefined();
        });

        it('should handle international currency symbols', async () => {
            const mockText = 'Total: €500.00';

            const data = await service.extractInvoiceData(mockText);

            expect(data.currency).toBe('EUR');
            expect(data.amount).toBe(500);
        });

        it('should extract payment terms if present', async () => {
            const mockText = 'Payment Terms: Net 30';

            const data = await service.extractInvoiceData(mockText);

            expect(data.paymentTerms).toBeDefined();
            expect(data.paymentTerms).toContain('30');
        });
    });

    describe('validateExtractedData', () => {
        it('should validate complete invoice data', async () => {
            const validData = {
                invoiceNumber: 'INV-001',
                amount: 1000,
                currency: 'USD',
                invoiceDate: new Date(),
                vendor: { name: 'Acme Corp' },
            };

            const result = await service.validateExtractedData(validData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should flag missing required fields', async () => {
            const incompleteData = {
                invoiceNumber: 'INV-001',
                // missing amount and vendor
            };

            const result = await service.validateExtractedData(incompleteData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('missing_amount');
            expect(result.errors).toContain('missing_vendor');
        });

        it('should validate amount format', async () => {
            const invalidAmount = {
                invoiceNumber: 'INV-001',
                amount: 'invalid',
                vendor: { name: 'Test' },
            };

            const result = await service.validateExtractedData(invalidAmount);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('invalid_amount_format');
        });

        it('should check date validity', async () => {
            const invalidDate = {
                invoiceNumber: 'INV-001',
                amount: 1000,
                invoiceDate: 'invalid-date',
                vendor: { name: 'Test' },
            };

            const result = await service.validateExtractedData(invalidDate);

            expect(result.errors).toContain('invalid_date_format');
        });

        it('should warn about future invoice dates', async () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);

            const data = {
                invoiceNumber: 'INV-001',
                amount: 1000,
                invoiceDate: futureDate,
                vendor: { name: 'Test' },
            };

            const result = await service.validateExtractedData(data);

            expect(result.warnings).toContain('future_date');
        });
    });

    describe('enrichInvoiceData', () => {
        it('should enrich data with vendor lookup', async () => {
            const basicData = {
                vendor: { name: 'Acme Corp' },
            };

            const enriched = await service.enrichInvoiceData(basicData);

            expect(enriched.vendor.additionalInfo).toBeDefined();
        });

        it('should normalize currency values', async () => {
            const data = {
                amount: 1000,
                currency: 'EUR',
            };

            const enriched = await service.enrichInvoiceData(data);

            expect(enriched.normalizedAmount).toBeDefined();
            expect(enriched.baseCurrency).toBe('USD');
        });

        it('should calculate tax breakdown', async () => {
            const data = {
                amount: 110,
                tax: 10,
            };

            const enriched = await service.enrichInvoiceData(data);

            expect(enriched.taxBreakdown).toBeDefined();
            expect(enriched.subtotal).toBe(100);
        });

        it('should add metadata', async () => {
            const data = {
                invoiceNumber: 'INV-001',
                amount: 500,
            };

            const enriched = await service.enrichInvoiceData(data);

            expect(enriched.metadata).toBeDefined();
            expect(enriched.metadata.processedAt).toBeInstanceOf(Date);
            expect(enriched.metadata.aiModel).toBeTruthy();
        });
    });

    describe('error handling', () => {
        it('should handle empty file buffer', async () => {
            const emptyBuffer = Buffer.from('');

            await expect(
                service.processInvoice(emptyBuffer, 'empty.pdf')
            ).rejects.toThrow('Empty file');
        });

        it('should handle AI service failures gracefully', async () => {
            // Mock AI service failure
            jest.spyOn(service as any, 'callAIService').mockRejectedValue(
                new Error('AI service unavailable')
            );

            const result = await service.processInvoice(
                Buffer.from('test'),
                'test.pdf'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('AI service unavailable');
        });

        it('should retry on transient failures', async () => {
            let callCount = 0;
            jest.spyOn(service as any, 'callAIService').mockImplementation(() => {
                callCount++;
                if (callCount < 3) {
                    throw new Error('Transient error');
                }
                return Promise.resolve({ data: {} });
            });

            const result = await service.processInvoice(
                Buffer.from('test'),
                'test.pdf'
            );

            expect(callCount).toBe(3);
            expect(result.success).toBe(true);
        });
    });
});
