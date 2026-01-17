import { Test, TestingModule } from '@nestjs/testing';
import { CrossBorderTradeService } from '../../src/services/cross-border-trade.service';
import { ForexService } from '../../src/services/forex.service';
import { EscrowService } from '../../src/services/escrow.service';
import { ComplianceService } from '../../src/services/compliance.service';
import { ShippingService } from '../../src/services/shipping.service';
import { TradeFinanceService } from '../../src/services/trade-finance.service';
import axios from 'axios';

// Mock axios for external API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Module 13 Integration Tests - Service Coordination & External APIs', () => {
    let tradeService: CrossBorderTradeService;
    let forexService: ForexService;
    let escrowService: EscrowService;
    let complianceService: ComplianceService;
    let shippingService: ShippingService;
    let tradeFinanceService: TradeFinanceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CrossBorderTradeService,
                ForexService,
                EscrowService,
                ComplianceService,
                ShippingService,
                TradeFinanceService,
                {
                    provide: 'Repository',
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                    },
                },
            ],
        }).compile();

        tradeService = module.get<CrossBorderTradeService>(CrossBorderTradeService);
        forexService = module.get<ForexService>(ForexService);
        escrowService = module.get<EscrowService>(EscrowService);
        complianceService = module.get<ComplianceService>(ComplianceService);
        shippingService = module.get<ShippingService>(ShippingService);
        tradeFinanceService = module.get<TradeFinanceService>(TradeFinanceService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Service Coordination', () => {
        it('should coordinate compliance check before payment processing', async () => {
            const complianceSpy = jest.spyOn(complianceService, 'performSanctionCheck')
                .mockResolvedValue({ passed: true, flags: [] });
            const paymentSpy = jest.spyOn(escrowService, 'fundEscrow')
                .mockResolvedValue({ id: 'esc-1', status: 'funded' } as any);

            await tradeService.initiatePayment('trade-1', 'buyer-1', 10000);

            expect(complianceSpy).toHaveBeenCalledBefore(paymentSpy);
            expect(paymentSpy).toHaveBeenCalled();
        });

        it('should coordinate forex rate locking with escrow creation', async () => {
            const lockRateSpy = jest.spyOn(forexService, 'lockExchangeRate')
                .mockResolvedValue({ rate: 83.45, expiresAt: new Date() } as any);
            const createEscrowSpy = jest.spyOn(escrowService, 'createTransaction')
                .mockResolvedValue({ id: 'esc-1' } as any);

            await tradeService.createCrossBorderPayment({
                fromCurrency: 'USD',
                toCurrency: 'INR',
                amount: 1000,
            } as any);

            expect(lockRateSpy).toHaveBeenCalled();
            expect(createEscrowSpy).toHaveBeenCalled();
        });

        it('should coordinate shipping with customs clearance', async () => {
            const shippingSpy = jest.spyOn(shippingService, 'createInternationalShipment')
                .mockResolvedValue({ id: 'ship-1', trackingNumber: 'TRK123' } as any);
            const customsSpy = jest.spyOn(complianceService, 'submitCustomsDeclaration')
                .mockResolvedValue({ declarationNumber: 'CUS-001' } as any);

            await tradeService.initiateShipping('trade-1', {
                origin: 'US',
                destination: 'AE',
            } as any);

            expect(customsSpy).toHaveBeenCalledBefore(shippingSpy);
        });

        it('should handle L/C issuance with bank coordination', async () => {
            const lcSpy = jest.spyOn(tradeFinanceService, 'issueLetterOfCredit')
                .mockResolvedValue({ lcNumber: 'LC-001', status: 'issued' } as any);
            const bankNotifySpy = jest.spyOn(tradeFinanceService, 'notifyAdvisingBank')
                .mockResolvedValue(true);

            await tradeService.setupTradeFinance('trade-1', {
                type: 'letter_of_credit',
                amount: 100000,
            } as any);

            expect(lcSpy).toHaveBeenCalled();
            expect(bankNotifySpy).toHaveBeenCalledWith(expect.stringContaining('LC-'));
        });

        it('should coordinate escrow release with payment verification', async () => {
            const verifySpy = jest.spyOn(complianceService, 'verifyPaymentReceipt')
                .mockResolvedValue({ verified: true });
            const releaseSpy = jest.spyOn(escrowService, 'releaseToSeller')
                .mockResolvedValue({ status: 'released' } as any);

            await tradeService.completePayment('trade-1', { receiptId: 'RCP-001' } as any);

            expect(verifySpy).toHaveBeenCalledBefore(releaseSpy);
        });

        it('should handle multi-currency escrow settlement', async () => {
            const forex1Spy = jest.spyOn(forexService, 'convert')
                .mockResolvedValue(8345);
            const forex2Spy = jest.spyOn(forexService, 'calculateFees')
                .mockResolvedValue({ fee: 25, total: 8370 });

            await tradeService.settleMultiCurrencyPayment({
                fromCurrency: 'USD',
                toCurrency: 'INR',
                amount: 100,
            } as any);

            expect(forex1Spy).toHaveBeenCalled();
            expect(forex2Spy).toHaveBeenCalled();
        });

        it('should coordinate invoice with trade finance', async () => {
            const invoiceSpy = jest.spyOn(tradeService, 'generateInvoice')
                .mockResolvedValue({ invoiceId: 'INV-001' } as any);
            const financeSpy = jest.spyOn(tradeFinanceService, 'linkInvoiceToLC')
                .mockResolvedValue(true);

            await tradeService.createTradeWithFinancing({
                amount: 50000,
                includeFinancing: true,
            } as any);

            expect(invoiceSpy).toHaveBeenCalled();
            expect(financeSpy).toHaveBeenCalledWith(expect.any(String), 'INV-001');
        });

        it('should handle dispute resolution workflow', async () => {
            const disputeSpy = jest.spyOn(escrowService, 'flagDispute')
                .mockResolvedValue({ disputeId: 'DIS-001' } as any);
            const notifySpy = jest.spyOn(tradeService, 'notifyParties')
                .mockResolvedValue(true);

            await tradeService.raiseDispute('trade-1', {
                reason: 'Product mismatch',
                evidence: ['photo1.jpg'],
            } as any);

            expect(disputeSpy).toHaveBeenCalled();
            expect(notifySpy).toHaveBeenCalled();
        });
    });

    describe('Module Integration', () => {
        it('should integrate with Module 09 (Referral) for trade bonuses', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { bonusId: 'BONUS-001' } });

            await tradeService.applyReferralBonus('trade-1', 'REF-CODE-123');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/referrals/apply'),
                expect.objectContaining({ referralCode: 'REF-CODE-123' })
            );
        });

        it('should integrate with Module 14 (Globalization) for multi-language support', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { translatedText: 'Pago recibido' }
            });

            await tradeService.sendLocalizedNotification('trade-1', 'es', 'payment_received');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/api/globalization/translate')
            );
        });

        it('should integrate with Module 03 (Payment) for payment processing', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { transactionId: 'TXN-001', status: 'success' }
            });

            await tradeService.processInternationalPayment({
                amount: 5000,
                currency: 'USD',
                gateway: 'stripe',
            } as any);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/payments/process'),
                expect.any(Object)
            );
        });

        it('should integrate with Module 10 (Orchestration) for workflow events', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { eventId: 'EVT-001' } });

            await tradeService.publishTradeEvent({
                type: 'trade_completed',
                tradeId: 'trade-1',
                data: {},
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/orchestration/events'),
                expect.objectContaining({ type: 'trade_completed' })
            );
        });

        it('should fetch forex rates from Module 14 intelligence', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { rate: 83.45, trend: 'stable' }
            });

            await forexService.getIntelligentRate('USD', 'INR');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/api/globalization/forex-intelligence')
            );
        });

        it('should notify Module 11 for SMS/Email alerts', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { sent: true } });

            await tradeService.sendTradeStatusUpdate('trade-1', {
                status: 'shipped',
                recipient: 'buyer@example.com',
            } as any);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/notifications/email'),
                expect.any(Object)
            );
        });
    });

    describe('External API Integration', () => {
        it('should integrate with SWIFT network for bank transfers', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { swiftReference: 'SWIFT-123456', status: 'pending' }
            });

            await tradeFinanceService.initiateSWIFTTransfer({
                amount: 50000,
                currency: 'USD',
                beneficiaryBank: 'HSBCHKHH',
            } as any);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/swift/transfer'),
                expect.objectContaining({ beneficiaryBank: 'HSBCHKHH' })
            );
        });

        it('should integrate with Customs API for declaration submission', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { declarationNumber: 'CUST-2024-001', status: 'submitted' }
            });

            await complianceService.submitToCustoms({
                country: 'AE',
                hsCode: '8471.30',
                value: 10000,
            } as any);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/customs/declare'),
                expect.any(Object)
            );
        });

        it('should integrate with Forex provider API for real-time rates', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { rate: 1.18, timestamp: new Date().toISOString() }
            });

            await forexService.fetchLiveRate('EUR', 'USD');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/forex/live-rate'),
                expect.objectContaining({ params: expect.any(Object) })
            );
        });

        it('should integrate with DHL API for shipping quotes', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { quoteId: 'DHL-QUOTE-001', cost: 125.50, estimatedDays: 3 }
            });

            await shippingService.getCarrierQuote({
                carrier: 'DHL',
                origin: 'US',
                destination: 'AE',
                weight: 25,
            } as any);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/dhl/quote'),
                expect.any(Object)
            );
        });

        it('should integrate with Sanctions screening API', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { cleared: true, matchedLists: [], riskScore: 0 }
            });

            await complianceService.screenAgainstSanctions({
                entityName: 'Test Company LLC',
                country: 'US',
            } as any);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/sanctions/screen'),
                expect.objectContaining({ entityName: 'Test Company LLC' })
            );
        });

        it('should integrate with FedEx tracking API', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    trackingNumber: 'FEDEX123',
                    status: 'in_transit',
                    events: [{ timestamp: new Date(), location: 'Dubai Hub' }],
                }
            });

            await shippingService.trackFedExShipment('FEDEX123');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/fedex/track/FEDEX123')
            );
        });

        it('should handle external API failures gracefully', async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error('SWIFT API unavailable'));

            await expect(
                tradeFinanceService.initiateSWIFTTransfer({ amount: 5000 } as any)
            ).rejects.toThrow('SWIFT API unavailable');
        });

        it('should retry failed external API calls', async () => {
            mockedAxios.get
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ data: { rate: 83.45 } });

            const result = await forexService.fetchLiveRateWithRetry('USD', 'INR');

            expect(result.rate).toBe(83.45);
            expect(mockedAxios.get).toHaveBeenCalledTimes(3);
        });
    });

    describe('Error Handling & Edge Cases', () => {
        it('should handle concurrent escrow operations', async () => {
            const promises = Array(5).fill(null).map((_, i) =>
                escrowService.createTransaction({
                    transactionId: `ESC-${i}`,
                    amount: 1000,
                } as any)
            );

            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled');

            expect(successful.length).toBeGreaterThan(0);
        });

        it('should handle forex rate expiration', async () => {
            const expiredRate = {
                rate: 83.45,
                lockedUntil: new Date(Date.now() - 10000), // Expired
            };

            jest.spyOn(forexService, 'getLockedRate').mockResolvedValue(expiredRate as any);

            await expect(
                tradeService.processWithLockedRate('trade-1', 'rate-123')
            ).rejects.toThrow('Forex rate expired');
        });

        it('should rollback on compliance failure', async () => {
            jest.spyOn(complianceService, 'performSanctionCheck')
                .mockResolvedValue({ passed: false, flags: ['OFAC'] });
            const rollbackSpy = jest.spyOn(escrowService, 'cancelTransaction');

            await expect(
                tradeService.initiatePayment('trade-1', 'buyer-1', 10000)
            ).rejects.toThrow('Compliance check failed');

            expect(rollbackSpy).toHaveBeenCalled();
        });
    });
});
