import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IndiaMarketService } from '../india-market.service';
import { Repository } from 'typeorm';

describe('IndiaMarketService', () => {
    let service: IndiaMarketService;

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IndiaMarketService,
                {
                    provide: getRepositoryToken('UPITransaction'),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<IndiaMarketService>(IndiaMarketService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('UPI Payment Processing', () => {
        it('should process UPI payment successfully', async () => {
            const paymentDto = {
                amount: 10000,
                vpa: 'user@paytm',
                provider: 'PAYTM',
                invoiceId: 'inv-123',
            };

            mockRepository.create.mockReturnValue(paymentDto);
            mockRepository.save.mockResolvedValue({
                ...paymentDto,
                id: '1',
                status: 'SUCCESS',
                transactionId: 'txn-123',
            });

            const result = await service.processUPIPayment(paymentDto as any);

            expect(result.status).toBe('SUCCESS');
            expect(result.transactionId).toBeDefined();
        });

        it('should support multiple UPI providers', async () => {
            const providers = ['PHONEPE', 'PAYTM', 'GPAY', 'BHIM'];

            for (const provider of providers) {
                const isSupported = await service.isSupportedUPIProvider(provider);
                expect(isSupported).toBe(true);
            }
        });

        it('should handle UPI payment failures', async () => {
            mockRepository.save.mockRejectedValue(new Error('Payment failed'));

            await expect(
                service.processUPIPayment({ amount: 1000 } as any),
            ).rejects.toThrow('Payment failed');
        });
    });

    describe('GST Compliance Automation', () => {
        it('should calculate GST correctly for intra-state transaction', async () => {
            const amount = 10000;
            const gstRate = 18;

            const result = await service.calculateGST(amount, gstRate, 'INTRA_STATE');

            expect(result.cgst).toBe(900); // 9% of 10000
            expect(result.sgst).toBe(900); // 9% of 10000
            expect(result.igst).toBe(0);
            expect(result.totalGST).toBe(1800);
        });

        it('should calculate GST correctly for inter-state transaction', async () => {
            const amount = 10000;
            const gstRate = 18;

            const result = await service.calculateGST(amount, gstRate, 'INTER_STATE');

            expect(result.igst).toBe(1800); // 18% of 10000
            expect(result.cgst).toBe(0);
            expect(result.sgst).toBe(0);
            expect(result.totalGST).toBe(1800);
        });

        it('should generate GSTR-1 JSON', async () => {
            const invoices = [
                { invoiceNumber: 'INV-001', amount: 10000, gst: 1800 },
            ];

            const gstrJson = await service.generateGSTR1(invoices as any);

            expect(gstrJson).toBeDefined();
            expect(gstrJson.version).toBeDefined();
            expect(gstrJson.b2b).toBeDefined();
        });
    });

    describe('Account Aggregator Integration', () => {
        it('should fetch bank statements via AA', async () => {
            const consentId = 'consent-123';

            mockRepository.find.mockResolvedValue([
                {
                    accountNumber: 'XXXX1234',
                    balance: 50000,
                    transactions: [],
                },
            ]);

            const result = await service.fetchBankData(consentId);

            expect(result).toBeDefined();
            expect(result.accounts).toHaveLength(1);
        });

        it('should validate consent before fetching data', async () => {
            const invalidConsent = 'invalid-consent';

            await expect(
                service.fetchBankData(invalidConsent),
            ).rejects.toThrow('Invalid consent');
        });
    });

    describe('Multi-Language Localization', () => {
        it('should support 12 Indian languages', async () => {
            const languages = [
                'hi', 'bn', 'te', 'mr', 'ta',
                'gu', 'kn', 'ml', 'pa', 'or', 'as',
            ];

            for (const lang of languages) {
                const isSupported = await service.isSupportedLanguage(lang);
                expect(isSupported).toBe(true);
            }
        });

        it('should translate content to Hindi', async () => {
            const englishText = 'Payment received';

            const result = await service.translate(englishText, 'hi');

            expect(result).toBeDefined();
            expect(result.translatedText).not.toBe(englishText);
        });
    });

    describe('Credit Bureau Integration', () => {
        it('should fetch credit score from CIBIL', async () => {
            const pan = 'ABCDE1234F';

            const result = await service.fetchCreditScore(pan, 'CIBIL');

            expect(result).toBeDefined();
            expect(result.score).toBeGreaterThanOrEqual(300);
            expect(result.score).toBeLessThanOrEqual(900);
        });

        it('should support multiple credit bureaus', async () => {
            const bureaus = ['CIBIL', 'EXPERIAN', 'EQUIFAX', 'CRIF'];

            for (const bureau of bureaus) {
                const isSupported = await service.isSupportedBureau(bureau);
                expect(isSupported).toBe(true);
            }
        });
    });
});
