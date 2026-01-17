import { Test, TestingModule } from '@nestjs/testing';
import { CrossBorderTradeService } from '../services/cross-border-trade.service';
import { ForexService } from '../services/forex.service';
import { EscrowService } from '../services/escrow.service';
import { ShippingService } from '../services/shipping.service';
import { TradeFinanceService } from '../services/trade-finance.service';
import { ComplianceService } from '../services/compliance.service';
import { TestFixtures } from '../../test/fixtures';

describe('CrossBorderTradeService', () => {
    let service: CrossBorderTradeService;
    let forexService: Partial<ForexService>;
    let escrowService: Partial<EscrowService>;
    let shippingService: Partial<ShippingService>;
    let tradeFinanceService: Partial<TradeFinanceService>;
    let complianceService: Partial<ComplianceService>;

    beforeEach(async () => {
        // Mock all dependent services
        forexService = {
            convertCurrency: jest.fn(),
        };

        escrowService = {
            createEscrow: jest.fn(),
        };

        shippingService = {
            createShippingOrder: jest.fn(),
        };

        tradeFinanceService = {
            createLetterOfCredit: jest.fn(),
        };

        complianceService = {
            createComplianceCheck: jest.fn(),
            performComplianceCheck: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CrossBorderTradeService,
                { provide: ForexService, useValue: forexService },
                { provide: EscrowService, useValue: escrowService },
                { provide: ShippingService, useValue: shippingService },
                { provide: TradeFinanceService, useValue: tradeFinanceService },
                { provide: ComplianceService, useValue: complianceService },
            ],
        }).compile();

        service = module.get<CrossBorderTradeService>(CrossBorderTradeService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initiateCrossBorderTrade', () => {
        it('should initiate import transaction with escrow successfully', async () => {
            const request = {
                transactionType: 'import' as const,
                buyerId: 'buyer-1',
                sellerId: 'seller-1',
                buyerCountry: 'AE',
                sellerCountry: 'US',
                amount: 100000,
                currency: 'USD',
                goodsDescription: 'Electronics',
                hsCode: '123456',
                incoterms: 'CIF',
                paymentMethod: 'escrow' as const,
                shippingRequired: true,
                priority: 'standard' as const,
            };

            // Mock compliance check - approved
            const mockCompliance = TestFixtures.createMockTradeCompliance({ checkStatus: 'approved' });
            (complianceService.createComplianceCheck as jest.Mock).mockResolvedValue(mockCompliance);
            (complianceService.performComplianceCheck as jest.Mock).mockResolvedValue({
                ...mockCompliance,
                checkStatus: 'approved',
            });

            // Mock forex conversion
            (forexService.convertCurrency as jest.Mock).mockResolvedValue({
                fromCurrency: 'USD',
                toCurrency: 'AED',
                amount: 100000,
                convertedAmount: 367000,
                rate: 3.67,
            });

            // Mock escrow creation
            const mockEscrow = TestFixtures.createMockEscrowTransaction();
            (escrowService.createEscrow as jest.Mock).mockResolvedValue(mockEscrow);

            // Mock shipping creation
            const mockShipping = TestFixtures.createMockShippingOrder();
            (shippingService.createShippingOrder as jest.Mock).mockResolvedValue(mockShipping);

            const result = await service.initiateCrossBorderTrade(request, 'user-1');

            expect(result.transactionId).toBeDefined();
            expect(result.status).toBe('compliance_approved');
            expect(result.compliance.status).toBe('approved');
            expect(result.payment).toBeDefined();
            expect(result.shipping).toBeDefined();
            expect(complianceService.createComplianceCheck).toHaveBeenCalled();
            expect(forexService.convertCurrency).toHaveBeenCalled();
            expect(escrowService.createEscrow).toHaveBeenCalled();
            expect(shippingService.createShippingOrder).toHaveBeenCalled();
        });

        it('should initiate export transaction with letter of credit', async () => {
            const request = {
                transactionType: 'export' as const,
                buyerId: 'buyer-1',
                sellerId: 'seller-1',
                buyerCountry: 'US',
                sellerCountry: 'AE',
                amount: 200000,
                currency: 'USD',
                goodsDescription: 'Machinery',
                hsCode: '789012',
                incoterms: 'FOB',
                paymentMethod: 'letter_of_credit' as const,
                shippingRequired: true,
                priority: 'express' as const,
            };

            const mockCompliance = TestFixtures.createMockTradeCompliance({ checkStatus: 'approved' });
            (complianceService.createComplianceCheck as jest.Mock).mockResolvedValue(mockCompliance);
            (complianceService.performComplianceCheck as jest.Mock).mockResolvedValue({
                ...mockCompliance,
                checkStatus: 'approved',
            });

            (forexService.convertCurrency as jest.Mock).mockResolvedValue({
                convertedAmount: 734000,
                rate: 3.67,
            });

            const mockLC = TestFixtures.createMockLetterOfCredit();
            (tradeFinanceService.createLetterOfCredit as jest.Mock).mockResolvedValue(mockLC);

            const mockShipping = TestFixtures.createMockShippingOrder();
            (shippingService.createShippingOrder as jest.Mock).mockResolvedValue(mockShipping);

            const result = await service.initiateCrossBorderTrade(request, 'user-1');

            expect(result.transactionType).toBe('export');
            expect(result.payment.method).toBe('letter_of_credit');
            expect(tradeFinanceService.createLetterOfCredit).toHaveBeenCalled();
        });

        it('should handle transaction without shipping', async () => {
            const request = {
                transactionType: 'import' as const,
                buyerId: 'buyer-1',
                sellerId: 'seller-1',
                buyerCountry: 'AE',
                sellerCountry: 'US',
                amount: 50000,
                currency: 'USD',
                goodsDescription: 'Digital Services',
                incoterms: 'EXW',
                paymentMethod: 'telegraphic_transfer' as const,
                shippingRequired: false,
                priority: 'standard' as const,
            };

            const mockCompliance = TestFixtures.createMockTradeCompliance({ checkStatus: 'approved' });
            (complianceService.createComplianceCheck as jest.Mock).mockResolvedValue(mockCompliance);
            (complianceService.performComplianceCheck as jest.Mock).mockResolvedValue({
                ...mockCompliance,
                checkStatus: 'approved',
            });

            (forexService.convertCurrency as jest.Mock).mockResolvedValue({
                convertedAmount: 183500,
            });

            const result = await service.initiateCrossBorderTrade(request, 'user-1');

            expect(result.shipping).toBeUndefined();
            expect(shippingService.createShippingOrder).not.toHaveBeenCalled();
        });

        it('should fail transaction if compliance rejected', async () => {
            const request = {
                transactionType: 'import' as const,
                buyerId: 'buyer-1',
                sellerId: 'seller-1',
                buyerCountry: 'XX', // Sanctioned
                sellerCountry: 'US',
                amount: 100000,
                currency: 'USD',
                goodsDescription: 'Goods',
                incoterms: 'CIF',
                paymentMethod: 'escrow' as const,
                shippingRequired: true,
                priority: 'standard' as const,
            };

            const mockCompliance = TestFixtures.createMockTradeCompliance({
                checkStatus: 'rejected',
                rejectionReason: 'Sanctioned country',
            });
            (complianceService.createComplianceCheck as jest.Mock).mockResolvedValue(mockCompliance);
            (complianceService.performComplianceCheck as jest.Mock).mockResolvedValue({
                ...mockCompliance,
                checkStatus: 'rejected',
            });

            const result = await service.initiateCrossBorderTrade(request, 'user-1');

            expect(result.status).toBe('failed');
            expect(result.compliance.status).toBe('rejected');
            expect(escrowService.createEscrow).not.toHaveBeenCalled();
            expect(shippingService.createShippingOrder).not.toHaveBeenCalled();
        });

        it('should handle urgent priority transactions', async () => {
            const request = {
                transactionType: 'import' as const,
                buyerId: 'buyer-1',
                sellerId: 'seller-1',
                buyerCountry: 'AE',
                sellerCountry: 'US',
                amount: 150000,
                currency: 'USD',
                goodsDescription: 'Medical Supplies',
                incoterms: 'DDP',
                paymentMethod: 'escrow' as const,
                shippingRequired: true,
                priority: 'urgent' as const,
            };

            const mockCompliance = TestFixtures.createMockTradeCompliance({ checkStatus: 'approved' });
            (complianceService.createComplianceCheck as jest.Mock).mockResolvedValue(mockCompliance);
            (complianceService.performComplianceCheck as jest.Mock).mockResolvedValue({
                ...mockCompliance,
                checkStatus: 'approved',
            });

            (forexService.convertCurrency as jest.Mock).mockResolvedValue({ convertedAmount: 550500 });
            (escrowService.createEscrow as jest.Mock).mockResolvedValue(TestFixtures.createMockEscrowTransaction());
            (shippingService.createShippingOrder as jest.Mock).mockResolvedValue(
                TestFixtures.createMockShippingOrder()
            );

            const result = await service.initiateCrossBorderTrade(request, 'user-1');

            expect(result.priority).toBe('urgent');
        });
    });

    describe('getTransactionStatus', () => {
        it('should retrieve transaction status', async () => {
            // This is a mock implementation since we don't have persistent storage
            const transactionId = 'TXN-TEST-001';

            await expect(service.getTransactionStatus(transactionId)).resolves.toBeDefined();
        });
    });

    describe('updateTransactionStatus', () => {
        it('should update transaction status', async () => {
            const transactionId = 'TXN-TEST-001';
            const update = { status: 'in_transit' };

            await expect(service.updateTransactionStatus(transactionId, update)).resolves.toBeDefined();
        });
    });

    describe('getTradeAnalytics', () => {
        it('should return trade analytics', async () => {
            const result = await service.getTradeAnalytics();

            expect(result).toBeDefined();
            expect(result).toHaveProperty('totalTransactions');
        });

        it('should filter analytics by date range', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');

            const result = await service.getTradeAnalytics(startDate, endDate);

            expect(result).toBeDefined();
        });
    });

    describe('getTradeMetrics', () => {
        it('should return performance metrics', async () => {
            const result = await service.getTradeMetrics();

            expect(result).toBeDefined();
            expect(result).toHaveProperty('averageProcessingTime');
        });
    });

    describe('helper methods', () => {
        it('should generate unique transaction ID', () => {
            const id = service['generateTransactionId']();

            expect(id).toMatch(/^CBT-\d+/);
        });

        it('should calculate total cost correctly', () => {
            const forexResult = { convertedAmount: 367000 };
            const paymentResult = { fees: 1000 };
            const shippingResult = { cost: 2000 };

            const total = service['calculateTotalCost'](forexResult, paymentResult, shippingResult);

            expect(total).toBe(370000); // 367000 + 1000 + 2000
        });

        it('should determine next action based on compliance', () => {
            const compliance = { status: 'pending' };
            const payment = {};

            const nextAction = service['determineNextAction'](compliance, payment);

            expect(nextAction).toContain('compliance');
        });
    });

    describe('error handling', () => {
        it('should handle forex service errors gracefully', async () => {
            const request = {
                transactionType: 'import' as const,
                buyerId: 'buyer-1',
                sellerId: 'seller-1',
                buyerCountry: 'AE',
                sellerCountry: 'US',
                amount: 100000,
                currency: 'USD',
                goodsDescription: 'Goods',
                incoterms: 'CIF',
                paymentMethod: 'escrow' as const,
                shippingRequired: false,
                priority: 'standard' as const,
            };

            const mockCompliance = TestFixtures.createMockTradeCompliance({ checkStatus: 'approved' });
            (complianceService.createComplianceCheck as jest.Mock).mockResolvedValue(mockCompliance);
            (complianceService.performComplianceCheck as jest.Mock).mockResolvedValue({
                ...mockCompliance,
                checkStatus: 'approved',
            });

            (forexService.convertCurrency as jest.Mock).mockRejectedValue(new Error('Forex service unavailable'));

            await expect(service.initiateCrossBorderTrade(request, 'user-1')).rejects.toThrow();
        });
    });

    describe('multi-currency support', () => {
        it('should handle AED transactions', async () => {
            const request = {
                transactionType: 'import' as const,
                buyerId: 'buyer-1',
                sellerId: 'seller-1',
                buyerCountry: 'AE',
                sellerCountry: 'IN',
                amount: 375000, // Above UAE VAT threshold
                currency: 'AED',
                goodsDescription: 'Construction Materials',
                incoterms: 'CIF',
                paymentMethod: 'telegraphic_transfer' as const,
                shippingRequired: true,
                priority: 'standard' as const,
            };

            const mockCompliance = TestFixtures.createMockTradeCompliance({
                checkStatus: 'approved',
                vatCompliance: { passed: true, requiresVATRegistration: true },
            });
            (complianceService.createComplianceCheck as jest.Mock).mockResolvedValue(mockCompliance);
            (complianceService.performComplianceCheck as jest.Mock).mockResolvedValue(mockCompliance);

            (forexService.convertCurrency as jest.Mock).mockResolvedValue({
                convertedAmount: 375000,
                rate: 1,
            });

            (shippingService.createShippingOrder as jest.Mock).mockResolvedValue(
                TestFixtures.createMockShippingOrder()
            );

            const result = await service.initiateCrossBorderTrade(request, 'user-1');

            expect(result.compliance.vatCompliance?.requiresVATRegistration).toBe(true);
        });
    });
});
