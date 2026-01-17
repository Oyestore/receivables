import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrossBorderTradeModule } from '../../src/cross-border-trade.module';

describe('Cross-Border Trade E2E Tests', () => {
    let app: INestApplication;

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
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Complete Import Transaction Flow', () => {
        it('should complete full import transaction from start to finish', async () => {
            // Step 1: Get forex rates
            const ratesResponse = await request(app.getHttpServer())
                .get('/forex/rates')
                .query({ from: 'USD', to: 'AED' })
                .expect(200);

            expect(ratesResponse.body.rate).toBeGreaterThan(0);
            const currentRate = ratesResponse.body.rate;

            // Step 2: Lock forex rate
            const lockResponse = await request(app.getHttpServer())
                .post('/forex/lock-rate')
                .send({
                    fromCurrency: 'USD',
                    toCurrency: 'AED',
                    amount: 50000,
                    durationHours: 24,
                })
                .expect(201);

            expect(lockResponse.body.isLocked).toBe(true);
            const rateId = lockResponse.body.id;

            // Step 3: Check compliance
            const complianceResponse = await request(app.getHttpServer())
                .post('/compliance/check')
                .send({
                    country: 'UAE',
                    transactionType: 'IMPORT',
                    amount: 50000,
                })
                .expect(200);

            expect(complianceResponse.body.isCompliant).toBe(true);

            // Step 4: Create escrow
            const escrowResponse = await request(app.getHttpServer())
                .post('/escrow')
                .send({
                    amount: 50000,
                    currency: 'USD',
                    buyerId: 'buyer-001',
                    sellerId: 'seller-001',
                    forexRateId: rateId,
                    terms: 'Delivery within 30 days',
                })
                .expect(201);

            expect(escrowResponse.body.status).toBe('pending');
            const escrowId = escrowResponse.body.id;

            // Step 5: Create shipment
            const shipmentResponse = await request(app.getHttpServer())
                .post('/shipping/create')
                .send({
                    origin: 'USA',
                    destination: 'UAE',
                    value: 50000,
                    weight: 100,
                    carrier: 'DHL',
                })
                .expect(201);

            expect(shipmentResponse.body.trackingNumber).toBeDefined();

            // Step 6: Release escrow after delivery confirmation
            const releaseResponse = await request(app.getHttpServer())
                .post(`/escrow/${escrowId}/release`)
                .send({
                    recipientId: 'seller-001',
                    deliveryConfirmation: true,
                })
                .expect(200);

            expect(releaseResponse.body.status).toBe('released');
        });

        it('should handle transaction rollback on compliance failure', async () => {
            // Lock rate
            const lockResponse = await request(app.getHttpServer())
                .post('/forex/lock-rate')
                .send({
                    fromCurrency: 'USD',
                    toCurrency: 'AED',
                    amount: 2000000, // Exceeds limit
                    durationHours: 24,
                })
                .expect(201);

            const rateId = lockResponse.body.id;

            // Attempt to create escrow - should fail compliance
            await request(app.getHttpServer())
                .post('/escrow')
                .send({
                    amount: 2000000,
                    currency: 'USD',
                    buyerId: 'buyer-001',
                    sellerId: 'seller-001',
                    forexRateId: rateId,
                })
                .expect(400);

            // Verify rate lock was released
            const rateResponse = await request(app.getHttpServer())
                .get(`/forex/rates/${rateId}`)
                .expect(200);

            expect(rateResponse.body.isLocked).toBe(false);
        });
    });

    describe('Letter of Credit Workflow', () => {
        it('should complete LC issuance and payment cycle', async () => {
            // Step 1: Create Letter of Credit
            const lcResponse = await request(app.getHttpServer())
                .post('/trade-finance/letter-of-credit')
                .send({
                    applicant: 'buyer-001',
                    beneficiary: 'seller-001',
                    amount: 100000,
                    currency: 'USD',
                    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    terms: 'Shipment of goods within 60 days',
                })
                .expect(201);

            expect(lcResponse.body.lcNumber).toBeDefined();
            expect(lcResponse.body.status).toBe('issued');
            const lcId = lcResponse.body.id;

            // Step 2: Submit documents
            const docsResponse = await request(app.getHttpServer())
                .post(`/trade-finance/letter-of-credit/${lcId}/documents`)
                .send({
                    documents: [
                        { type: 'INVOICE', url: 'https://example.com/invoice.pdf' },
                        { type: 'BILL_OF_LADING', url: 'https://example.com/bol.pdf' },
                        { type: 'CERTIFICATE_OF_ORIGIN', url: 'https://example.com/coo.pdf' },
                    ],
                })
                .expect(200);

            expect(docsResponse.body.submitted).toBe(true);

            // Step 3: Verify documents
            const verifyResponse = await request(app.getHttpServer())
                .post(`/trade-finance/letter-of-credit/${lcId}/verify`)
                .expect(200);

            expect(verifyResponse.body.verified).toBe(true);

            // Step 4: Process payment
            const paymentResponse = await request(app.getHttpServer())
                .post(`/trade-finance/letter-of-credit/${lcId}/payment`)
                .expect(200);

            expect(paymentResponse.body.status).toBe('completed');
        });

        it('should reject LC with incomplete documents', async () => {
            const lcResponse = await request(app.getHttpServer())
                .post('/trade-finance/letter-of-credit')
                .send({
                    applicant: 'buyer-002',
                    beneficiary: 'seller-002',
                    amount: 50000,
                    currency: 'USD',
                })
                .expect(201);

            const lcId = lcResponse.body.id;

            // Submit incomplete documents
            await request(app.getHttpServer())
                .post(`/trade-finance/letter-of-credit/${lcId}/documents`)
                .send({
                    documents: [
                        { type: 'INVOICE', url: 'https://example.com/invoice.pdf' },
                        // Missing required documents
                    ],
                })
                .expect(200);

            // Verification should fail
            const verifyResponse = await request(app.getHttpServer())
                .post(`/trade-finance/letter-of-credit/${lcId}/verify`)
                .expect(400);

            expect(verifyResponse.body.verified).toBe(false);
            expect(verifyResponse.body.errors).toContain('Missing required documents');
        });
    });

    describe('Shipping and Tracking', () => {
        it('should create and track shipment through delivery', async () => {
            // Create shipment
            const createResponse = await request(app.getHttpServer())
                .post('/shipping/create')
                .send({
                    origin: 'USA',
                    destination: 'UAE',
                    value: 25000,
                    weight: 50,
                    carrier: 'FedEx',
                })
                .expect(201);

            const trackingNumber = createResponse.body.trackingNumber;

            // Track shipment
            const trackResponse = await request(app.getHttpServer())
                .get(`/shipping/track/${trackingNumber}`)
                .expect(200);

            expect(trackResponse.body.status).toBeDefined();
            expect(trackResponse.body.events).toBeInstanceOf(Array);
        });

        it('should get shipping quote for multiple carriers', async () => {
            const quoteResponse = await request(app.getHttpServer())
                .post('/shipping/quote')
                .send({
                    origin: 'USA',
                    destination: 'UAE',
                    weight: 75,
                    dimensions: {
                        length: 120,
                        width: 60,
                        height: 40,
                    },
                })
                .expect(200);

            expect(quoteResponse.body.quotes).toBeInstanceOf(Array);
            expect(quoteResponse.body.quotes.length).toBeGreaterThan(0);
            expect(quoteResponse.body.quotes[0]).toHaveProperty('carrier');
            expect(quoteResponse.body.quotes[0]).toHaveProperty('cost');
            expect(quoteResponse.body.quotes[0]).toHaveProperty('estimatedDays');
        });
    });

    describe('UAE VAT Compliance', () => {
        it('should calculate and apply UAE VAT correctly', async () => {
            const complianceResponse = await request(app.getHttpServer())
                .post('/compliance/check')
                .send({
                    country: 'UAE',
                    transactionType: 'IMPORT',
                    amount: 10000,
                })
                .expect(200);

            expect(complianceResponse.body.isCompliant).toBe(true);
            expect(complianceResponse.body.vatRate).toBe(5);
            expect(complianceResponse.body.taxAmount).toBe(500);
            expect(complianceResponse.body.totalAmount).toBe(10500);
        });

        it('should handle VAT exemptions for specific categories', async () => {
            const exemptResponse = await request(app.getHttpServer())
                .post('/compliance/check')
                .send({
                    country: 'UAE',
                    transactionType: 'IMPORT',
                    amount: 5000,
                    category: 'MEDICAL_SUPPLIES',
                })
                .expect(200);

            expect(exemptResponse.body.isCompliant).toBe(true);
            expect(exemptResponse.body.vatRate).toBe(0);
            expect(exemptResponse.body.isExempt).toBe(true);
        });
    });

    describe('Multi-Currency Operations', () => {
        it('should handle conversion between multiple currencies', async () => {
            const amount = 10000;

            const conversion1 = await request(app.getHttpServer())
                .post('/forex/convert')
                .send({
                    amount,
                    from: 'USD',
                    to: 'EUR',
                })
                .expect(200);

            const intermediateAmount = conversion1.body.convertedAmount;

            const conversion2 = await request(app.getHttpServer())
                .post('/forex/convert')
                .send({
                    amount: intermediateAmount,
                    from: 'EUR',
                    to: 'GBP',
                })
                .expect(200);

            expect(conversion2.body.convertedAmount).toBeGreaterThan(0);
        });

        it('should maintain rate locks during escrow lifecycle', async () => {
            const lockResponse = await request(app.getHttpServer())
                .post('/forex/lock-rate')
                .send({
                    fromCurrency: 'USD',
                    toCurrency: 'AED',
                    amount: 30000,
                    durationHours: 48,
                })
                .expect(201);

            const originalRate = lockResponse.body.rate;
            const rateId = lockResponse.body.id;

            // Create escrow with locked rate
            await request(app.getHttpServer())
                .post('/escrow')
                .send({
                    amount: 30000,
                    currency: 'USD',
                    buyerId: 'buyer-003',
                    sellerId: 'seller-003',
                    forexRateId: rateId,
                })
                .expect(201);

            // Verify rate hasn't changed
            const verifyResponse = await request(app.getHttpServer())
                .get(`/forex/rates/${rateId}`)
                .expect(200);

            expect(verifyResponse.body.rate).toBe(originalRate);
            expect(verifyResponse.body.isLocked).toBe(true);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle invalid currency codes', async () => {
            await request(app.getHttpServer())
                .get('/forex/rates')
                .query({ from: 'XXX', to: 'YYY' })
                .expect(400);
        });

        it('should prevent escrow release without authorization', async () => {
            const escrowResponse = await request(app.getHttpServer())
                .post('/escrow')
                .send({
                    amount: 15000,
                    currency: 'USD',
                    buyerId: 'buyer-004',
                    sellerId: 'seller-004',
                })
                .expect(201);

            const escrowId = escrowResponse.body.id;

            // Attempt unauthorized release
            await request(app.getHttpServer())
                .post(`/escrow/${escrowId}/release`)
                .send({
                    recipientId: 'unauthorized-user',
                })
                .expect(403);
        });

        it('should handle rate lock expiration', async () => {
            const lockResponse = await request(app.getHttpServer())
                .post('/forex/lock-rate')
                .send({
                    fromCurrency: 'USD',
                    toCurrency: 'EUR',
                    amount: 5000,
                    durationHours: 0.001, // Very short duration for testing
                })
                .expect(201);

            const rateId = lockResponse.body.id;

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify rate is no longer locked
            const verifyResponse = await request(app.getHttpServer())
                .get(`/forex/rates/${rateId}`)
                .expect(200);

            expect(verifyResponse.body.isLocked).toBe(false);
        });
    });

    describe('Performance and Analytics', () => {
        it('should retrieve transaction analytics', async () => {
            const analyticsResponse = await request(app.getHttpServer())
                .get('/analytics/transactions')
                .query({
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date().toISOString(),
                })
                .expect(200);

            expect(analyticsResponse.body.totalTransactions).toBeDefined();
            expect(analyticsResponse.body.totalVolume).toBeDefined();
            expect(analyticsResponse.body.byCountry).toBeDefined();
        });

        it('should handle bulk rate queries efficiently', async () => {
            const pairs = ['USD-EUR', 'USD-GBP', 'EUR-GBP', 'USD-JPY', 'EUR-JPY'];

            const start = Date.now();
            const responses = await Promise.all(
                pairs.map(pair => {
                    const [from, to] = pair.split('-');
                    return request(app.getHttpServer())
                        .get('/forex/rates')
                        .query({ from, to });
                })
            );
            const duration = Date.now() - start;

            expect(responses).toHaveLength(5);
            expect(responses.every(r => r.status === 200)).toBe(true);
            expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
        });
    });
});
