import { Test, TestingModule } from '@nestjs/testing';
import { DocumentController } from '../document.controller';
import { DocumentGeneratorService } from '../../services/document-generator.service';
import { DocumentTemplateService } from '../../services/document-template.service';

describe('DocumentController', () => {
    let controller: DocumentController;
    let generatorService: DocumentGeneratorService;
    let templateService: DocumentTemplateService;

    const mockGeneratorService = {
        generateLegalNotice: jest.fn(),
        generateDemandLetter: jest.fn(),
        generateSettlementAgreement: jest.fn(),
        generatePaymentReceipt: jest.fn(),
        batchGenerate: jest.fn(),
    };

    const mockTemplateService = {
        getTemplate: jest.fn(),
        listTemplates: jest.fn(),
        createTemplate: jest.fn(),
        updateTemplate: jest.fn(),
        validateTemplate: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DocumentController],
            providers: [
                {
                    provide: DocumentGeneratorService,
                    useValue: mockGeneratorService,
                },
                {
                    provide: DocumentTemplateService,
                    useValue: mockTemplateService,
                },
            ],
        }).compile();

        controller = module.get<DocumentController>(DocumentController);
        generatorService = module.get<DocumentGeneratorService>(DocumentGeneratorService);
        templateService = module.get<DocumentTemplateService>(DocumentTemplateService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /documents/legal-notice', () => {
        it('should generate legal notice document', async () => {
            const caseData = {
                caseNumber: 'CASE-001',
                defendant: 'ABC Company',
                amount: 100000,
                dueDate: '2025-01-15',
            };

            const mockDocument = {
                documentType: 'LEGAL_NOTICE',
                pdf: Buffer.from('PDF content'),
                generatedAt: new Date(),
            };

            mockGeneratorService.generateLegalNotice.mockResolvedValue(mockDocument);

            const result = await controller.generateLegalNotice(caseData);

            expect(result).toEqual(mockDocument);
            expect(generatorService.generateLegalNotice).toHaveBeenCalledWith(caseData);
        });
    });

    describe('POST /documents/demand-letter', () => {
        it('should generate demand letter', async () => {
            const demandData = {
                invoiceNumber: 'INV-001',
                amount: 50000,
                customerName: 'John Doe',
                daysOverdue: 45,
            };

            const mockDocument = {
                documentType: 'DEMAND_LETTER',
                pdf: Buffer.from('PDF'),
            };

            mockGeneratorService.generateDemandLetter.mockResolvedValue(mockDocument);

            const result = await controller.generateDemandLetter(demandData);

            expect(result.documentType).toBe('DEMAND_LETTER');
        });
    });

    describe('POST /documents/settlement-agreement', () => {
        it('should generate settlement agreement', async () => {
            const settlementData = {
                originalAmount: 100000,
                settledAmount: 75000,
                partyA: 'Creditor Inc',
                partyB: 'Debtor LLC',
            };

            mockGeneratorService.generateSettlementAgreement.mockResolvedValue({
                documentType: 'SETTLEMENT_AGREEMENT',
                pdf: Buffer.from('PDF'),
                digitalSignature: 'signature-hash',
            });

            const result = await controller.generateSettlementAgreement(settlementData);

            expect(result).toHaveProperty('digitalSignature');
        });
    });

    describe('POST /documents/payment-receipt', () => {
        it('should generate payment receipt', async () => {
            const paymentData = {
                transactionId: 'TXN-123',
                amount: 10000,
                paymentMethod: 'UPI',
                payer: 'Customer',
            };

            mockGeneratorService.generatePaymentReceipt.mockResolvedValue({
                documentType: 'PAYMENT_RECEIPT',
                pdf: Buffer.from('PDF'),
            });

            const result = await controller.generatePaymentReceipt(paymentData);

            expect(result.documentType).toBe('PAYMENT_RECEIPT');
        });
    });

    describe('POST /documents/batch-generate', () => {
        it('should generate multiple documents in batch', async () => {
            const batchRequest = {
                documents: [
                    { type: 'LEGAL_NOTICE', data: { caseNumber: 'CASE-001' } },
                    { type: 'DEMAND_LETTER', data: { invoiceNumber: 'INV-001' } },
                ],
            };

            mockGeneratorService.batchGenerate.mockResolvedValue([
                { documentType: 'LEGAL_NOTICE', pdf: Buffer.from('PDF1') },
                { documentType: 'DEMAND_LETTER', pdf: Buffer.from('PDF2') },
            ]);

            const result = await controller.batchGenerate(batchRequest);

            expect(result).toHaveLength(2);
            expect(generatorService.batchGenerate).toHaveBeenCalled();
        });
    });

    describe('GET /documents/templates', () => {
        it('should list all available templates', async () => {
            const mockTemplates = [
                { id: '1', name: 'Legal Notice', type: 'LEGAL_NOTICE' },
                { id: '2', name: 'Demand Letter', type: 'DEMAND_LETTER' },
            ];

            mockTemplateService.listTemplates.mockResolvedValue(mockTemplates);

            const result = await controller.listTemplates();

            expect(result).toHaveLength(2);
            expect(templateService.listTemplates).toHaveBeenCalled();
        });
    });

    describe('GET /documents/templates/:type', () => {
        it('should get specific template by type', async () => {
            const mockTemplate = {
                id: '1',
                name: 'Legal Notice',
                type: 'LEGAL_NOTICE',
                content: '<p>Template content</p>',
            };

            mockTemplateService.getTemplate.mockResolvedValue(mockTemplate);

            const result = await controller.getTemplate('LEGAL_NOTICE');

            expect(result).toEqual(mockTemplate);
        });
    });

    describe('POST /documents/templates', () => {
        it('should create new template', async () => {
            const newTemplate = {
                name: 'Custom Template',
                type: 'CUSTOM',
                content: '<p>New template</p>',
            };

            mockTemplateService.createTemplate.mockResolvedValue({
                ...newTemplate,
                id: '3',
            });

            const result = await controller.createTemplate(newTemplate);

            expect(result.id).toBe('3');
        });
    });

    describe('PUT /documents/templates/:id', () => {
        it('should update existing template', async () => {
            const updates = { content: '<p>Updated content</p>' };

            mockTemplateService.updateTemplate.mockResolvedValue({
                id: '1',
                ...updates,
            });

            const result = await controller.updateTemplate('1', updates);

            expect(result.content).toBe(updates.content);
        });
    });

    describe('POST /documents/templates/validate', () => {
        it('should validate template syntax', async () => {
            const template = { content: '{{name}} - {{date}}' };

            mockTemplateService.validateTemplate.mockResolvedValue({
                valid: true,
                errors: [],
            });

            const result = await controller.validateTemplate(template);

            expect(result.valid).toBe(true);
        });
    });
});
