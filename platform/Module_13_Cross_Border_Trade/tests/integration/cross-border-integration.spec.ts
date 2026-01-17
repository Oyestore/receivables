import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrossBorderTradeModule } from '../../src/cross-border-trade.module';
import { ForexService } from '../../src/services/forex.service';
import { EscrowService } from '../../src/services/escrow.service';
import { ShippingService } from '../../src/services/shipping.service';
import { TradeFinanceService } from '../../src/services/trade-finance.service';
import { ComplianceService } from '../../src/services/compliance.service';
import { TestFixtures } from '../fixtures';

describe('Cross-Border Trade Integration Tests', () => {
    let app: INestApplication;
    let forexService: ForexService;
    let escrowService: EscrowService;
    let shippingService: ShippingService;
    let tradeFinanceService: TradeFinanceService;
    let complianceService: ComplianceService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [__dirname + '/../../src/entities/*.entity{.ts,.js}'],
                    synchronize: true,
                }),
                CrossBorderTradeModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        forexService = moduleFixture.get<ForexService>(ForexService);
        escrowService = moduleFixture.get<EscrowService>(EscrowService);
        shippingService = moduleFixture.get<ShippingService>(ShippingService);
        tradeFinanceService = moduleFixture.get<TradeFinanceService>(TradeFinanceService);
        complianceService = moduleFixture.get<ComplianceService>(ComplianceService);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Forex and Payment Integration', () => {
        it('should coordinate forex rate locking with payment processing', async () => {
            const rate = TestFixtures.createMockCurrencyRate({
                fromCurrency: 'EUR',
                toCurrency: 'USD',
                rate: 1.18,
            });

            const lockedRate = await forexService.lockRate(
                rate.fromCurrency,
                rate.toCurrency,
                10000,
                24
            );

            expect(lockedRate.id).toBeDefined();
            expect(lockedRate.isLocked).toBe(true);
            expect(lockedRate.expiresAt).toBeInstanceOf(Date);

            // Verify locked rate remains constant
            const retrievedRate = await forexService.getRate(
                rate.fromCurrency,
                rate.toCurrency
            );
            expect(retrievedRate.rate).toBe(lockedRate.rate);
        });

        it('should handle multiple currency conversions in sequence', async () => {
            const amount = 1000;
            const eurToUsd = await forexService.convert(amount, 'EUR', 'USD');
            const usdToGbp = await forexService.convert(eurToUsd, 'USD', 'GBP');
            const gbpToEur = await forexService.convert(usdToGbp, 'GBP', 'EUR');

            // Should approximately return to original amount (accounting for fees)
            expect(gbpToEur).toBeGreaterThan(amount * 0.95);
            expect(gbpToEur).toBeLessThan(amount * 1.05);
        });
    });

    describe('Escrow and Compliance Integration', () => {
        it('should create escrow with UAE VAT compliance', async () => {
            const escrowData = TestFixtures.createMockEscrow({
                amount: 10000,
                currency: 'AED',
                buyerId: 'buyer-ae-001',
                sellerId: 'seller-ae-001',
            });

            const escrow = await escrowService.createEscrow(escrowData);

            // Verify compliance checks were performed
            const complianceResult = await complianceService.checkCompliance(
                'UAE',
                'IMPORT',
                escrow.amount
            );

            expect(complianceResult.isCompliant).toBe(true);
            expect(complianceResult.vatRate).toBe(5); // UAE VAT rate
            expect(complianceResult.taxAmount).toBe(escrow.amount * 0.05);
        });

        it('should prevent non-compliant transactions', async () => {
            const nonCompliantEscrow = TestFixtures.createMockEscrow({
                amount: 1000000, // Exceeds regulatory limit
                currency: 'AED',
            });

            await expect(
                escrowService.createEscrow(nonCompliantEscrow)
            ).rejects.toThrow('Compliance violation');
        });
    });

    describe('Multi-Service Workflow Integration', () => {
        it('should complete full import transaction workflow', async () => {
            const transaction = {
                type: 'IMPORT',
                amount: 50000,
                currency: 'USD',
                destination: 'UAE',
                origin: 'USA',
            };

            // Step 1: Check compliance
            const compliance = await complianceService.checkCompliance(
                transaction.destination,
                transaction.type,
                transaction.amount
            );
            expect(compliance.isCompliant).toBe(true);

            // Step 2: Lock forex rate
            const forexRate = await forexService.lockRate(
                transaction.currency,
                'AED',
                transaction.amount,
                24
            );
            expect(forexRate.isLocked).toBe(true);

            // Step 3: Create escrow
            const escrow = await escrowService.createEscrow({
                amount: transaction.amount,
                currency: transaction.currency,
                forexRateId: forexRate.id,
            } as any);
            expect(escrow.status).toBe('pending');

            // Step 4: Arrange shipping
            const shipping = await shippingService.createShipment({
                origin: transaction.origin,
                destination: transaction.destination,
                value: transaction.amount,
            } as any);
            expect(shipping.trackingNumber).toBeDefined();

            // Step 5: Release escrow
            const released = await escrowService.releaseEscrow(
                escrow.id,
                'seller-001'
            );
            expect(released.status).toBe('released');
        });

        it('should handle Letter of Credit workflow', async () => {
            const lcRequest = {
                applicant: 'buyer-001',
                beneficiary: 'seller-001',
                amount: 100000,
                currency: 'USD',
                expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            };

            // Step 1: Create LC
            const lc = await tradeFinanceService.createLetterOfCredit(lcRequest as any);
            expect(lc.status).toBe('issued');
            expect(lc.lcNumber).toBeDefined();

            // Step 2: Document submission
            const docsSubmitted = await tradeFinanceService.submitDocuments(
                lc.id,
                ['invoice.pdf', 'bill-of-lading.pdf']
            );
            expect(docsSubmitted).toBe(true);

            // Step 3: Document verification
            const verified = await tradeFinanceService.verifyDocuments(lc.id);
            expect(verified).toBe(true);

            // Step 4: Payment
            const paid = await tradeFinanceService.processPayment(lc.id);
            expect(paid.status).toBe('completed');
        });
    });

    describe('Shipping and Tracking Integration', () => {
        it('should track shipment across multiple carriers', async () => {
            const shipment = await shippingService.createShipment({
                origin: 'USA',
                destination: 'UAE',
                carrier: 'DHL',
                value: 5000,
            } as any);

            const tracking = await shippingService.trackShipment(
                shipment.trackingNumber
            );

            expect(tracking.status).toBeDefined();
            expect(tracking.events).toBeDefined();
            expect(tracking.estimatedDelivery).toBeInstanceOf(Date);
        });

        it('should calculate accurate shipping costs', async () => {
            const quote = await shippingService.getShippingQuote({
                origin: 'USA',
                destination: 'UAE',
                weight: 50,
                dimensions: { length: 100, width: 50, height: 30 },
            });

            expect(quote.cost).toBeGreaterThan(0);
            expect(quote.estimatedDays).toBeGreaterThan(0);
            expect(quote.currency).toBe('USD');
        });
    });

    describe('Error Handling and Rollback', () => {
        it('should rollback transaction on escrow failure', async () => {
            const forexRate = await forexService.lockRate('USD', 'EUR', 10000, 24);

            try {
                await escrowService.createEscrow({
                    amount: 10000,
                    currency: 'USD',
                    forexRateId: forexRate.id,
                    // Invalid data to trigger error
                    buyerId: null as any,
                } as any);
            } catch (error) {
                // Verify forex lock was released
                const rate = await forexService.getRate('USD', 'EUR');
                expect(rate.isLocked).toBe(false);
            }
        });

        it('should handle concurrent rate locking', async () => {
            const promises = Array(5).fill(null).map(() =>
                forexService.lockRate('USD', 'EUR', 10000, 24)
            );

            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled');

            expect(successful.length).toBeGreaterThan(0);
            expect(successful.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Performance and Caching', () => {
        it('should cache forex rates for performance', async () => {
            const start1 = Date.now();
            await forexService.getRate('USD', 'EUR');
            const time1 = Date.now() - start1;

            const start2 = Date.now();
            await forexService.getRate('USD', 'EUR');
            const time2 = Date.now() - start2;

            // Second call should be significantly faster (cached)
            expect(time2).toBeLessThan(time1 * 0.5);
        });

        it('should handle bulk operations efficiently', async () => {
            const currencies = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
            const start = Date.now();

            const rates = await Promise.all(
                currencies.map(curr => forexService.getRate('USD', curr))
            );

            const duration = Date.now() - start;

            expect(rates).toHaveLength(5);
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });
    });
});
