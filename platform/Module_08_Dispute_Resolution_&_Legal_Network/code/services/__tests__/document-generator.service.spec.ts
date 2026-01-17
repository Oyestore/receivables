import { Test, TestingModule } from '@nestjs/testing';
import { DocumentGeneratorService } from '../document-generator.service';
import { PdfGenerationService } from '../pdf-generation.service';
import { DocumentTemplateService } from '../document-template.service';

describe('DocumentGeneratorService', () => {
    let service: DocumentGeneratorService;
    let pdfService: PdfGenerationService;
    let templateService: DocumentTemplateService;

    const mockPdfService = {
        generatePdf: jest.fn(),
    };

    const mockTemplateService = {
        getTemplate: jest.fn(),
        renderTemplate: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DocumentGeneratorService,
                {
                    provide: PdfGenerationService,
                    useValue: mockPdfService,
                },
                {
                    provide: DocumentTemplateService,
                    useValue: mockTemplateService,
                },
            ],
        }).compile();

        service = module.get<DocumentGeneratorService>(DocumentGeneratorService);
        pdfService = module.get<PdfGenerationService>(PdfGenerationService);
        templateService = module.get<DocumentTemplateService>(DocumentTemplateService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateLegalNotice', () => {
        it('should generate legal notice document', async () => {
            const caseData = {
                caseNumber: 'CASE-001',
                defendant: 'ABC Company',
                amount: 100000,
                dueDate: new Date(),
            };

            const mockTemplate = {
                id: '1',
                name: 'Legal Notice',
                content: '<p>Legal notice to {{defendant}}</p>',
            };

            mockTemplateService.getTemplate.mockResolvedValue(mockTemplate);
            mockTemplateService.renderTemplate.mockResolvedValue('<p>Rendered content</p>');
            mockPdfService.generatePdf.mockResolvedValue(Buffer.from('PDF content'));

            const result = await service.generateLegalNotice(caseData);

            expect(result).toBeDefined();
            expect(result.documentType).toBe('LEGAL_NOTICE');
            expect(mockTemplateService.getTemplate).toHaveBeenCalledWith('LEGAL_NOTICE');
            expect(mockPdfService.generatePdf).toHaveBeenCalled();
        });

        it('should include all required legal notice fields', async () => {
            const caseData = {
                caseNumber: 'CASE-001',
                defendant: 'ABC Company',
                amount: 100000,
            };

            mockTemplateService.getTemplate.mockResolvedValue({ content: '' });
            mockTemplateService.renderTemplate.mockResolvedValue('content');
            mockPdfService.generatePdf.mockResolvedValue(Buffer.from('PDF'));

            const result = await service.generateLegalNotice(caseData);

            expect(mockTemplateService.renderTemplate).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    caseNumber: caseData.caseNumber,
                    defendant: caseData.defendant,
                    amount: caseData.amount,
                }),
            );
        });
    });

    describe('generateDemandLetter', () => {
        it('should generate demand letter document', async () => {
            const demandData = {
                invoiceNumber: 'INV-001',
                amount: 50000,
                customerName: 'John Doe',
                daysOverdue: 45,
            };

            mockTemplateService.getTemplate.mockResolvedValue({ content: 'template' });
            mockTemplateService.renderTemplate.mockResolvedValue('rendered');
            mockPdfService.generatePdf.mockResolvedValue(Buffer.from('PDF'));

            const result = await service.generateDemandLetter(demandData);

            expect(result.documentType).toBe('DEMAND_LETTER');
            expect(result.pdf).toBeDefined();
        });
    });

    describe('generateSettlementAgreement', () => {
        it('should generate settlement agreement', async () => {
            const settlementData = {
                originalAmount: 100000,
                settledAmount: 75000,
                partyA: 'Creditor Inc',
                partyB: 'Debtor LLC',
            };

            mockTemplateService.getTemplate.mockResolvedValue({ content: 'template' });
            mockTemplateService.renderTemplate.mockResolvedValue('rendered');
            mockPdfService.generatePdf.mockResolvedValue(Buffer.from('PDF'));

            const result = await service.generateSettlementAgreement(settlementData);

            expect(result.documentType).toBe('SETTLEMENT_AGREEMENT');
            expect(result).toHaveProperty('digitalSignature');
        });
    });

    describe('generatePaymentReceipt', () => {
        it('should generate payment receipt', async () => {
            const paymentData = {
                transactionId: 'TXN-123',
                amount: 10000,
                paymentMethod: 'UPI',
                payer: 'Customer',
            };

            mockTemplateService.getTemplate.mockResolvedValue({ content: 'template' });
            mockTemplateService.renderTemplate.mockResolvedValue('rendered');
            mockPdfService.generatePdf.mockResolvedValue(Buffer.from('PDF'));

            const result = await service.generatePaymentReceipt(paymentData);

            expect(result.documentType).toBe('PAYMENT_RECEIPT');
            expect(result.pdf).toBeDefined();
        });
    });

    describe('batchGenerate', () => {
        it('should generate multiple documents in batch', async () => {
            const documents = [
                { type: 'LEGAL_NOTICE', data: { caseNumber: 'CASE-001' } },
                { type: 'DEMAND_LETTER', data: { invoiceNumber: 'INV-001' } },
            ];

            mockTemplateService.getTemplate.mockResolvedValue({ content: 'template' });
            mockTemplateService.renderTemplate.mockResolvedValue('rendered');
            mockPdfService.generatePdf.mockResolvedValue(Buffer.from('PDF'));

            const results = await service.batchGenerate(documents);

            expect(results).toHaveLength(2);
            expect(mockPdfService.generatePdf).toHaveBeenCalledTimes(2);
        });
    });
});
