import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Module13CrossBorderTradeModule } from '../src/module-13-cross-border-trade.module';

describe('Module 13 - E2E Integration Tests', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [Module13CrossBorderTradeModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Complete Import Transaction Flow', () => {
        it('should execute full import transaction (E2E)', async () => {
            // 1. Convert currency
            const conversionResponse = await request(app.getHttpServer())
                .post('/forex/convert')
                .send({
                    fromCurrency: 'USD',
                    toCurrency: 'AED',
                    amount: 100000,
                    lockRate: true,
                })
                .expect(201);

            expect(conversionResponse.body.convertedAmount).toBeDefined();

            // 2. Create escrow
            const escrowResponse = await request(app.getHttpServer())
                .post('/escrow')
                .send({
                    transactionId: 'TXN-E2E-001',
                    escrowType: 'trade',
                    amount: 100000,
                    currency: 'USD',
                    buyerId: 'buyer-e2e',
                    sellerId: 'seller-e2e',
                })
                .expect(201);

            const escrowId = escrowResponse.body.id;

            // 3. Perform compliance check
            const complianceResponse = await request(app.getHttpServer())
                .post('/compliance/check')
                .send({
                    transactionId: 'TXN-E2E-001',
                    buyerCountry: 'AE',
                    sellerCountry: 'US',
                    goodsDescription: 'Electronics',
                    hsCode: '123456',
                })
                .expect(201);

            // 4. Create shipping order
            const shippingResponse = await request(app.getHttpServer())
                .post('/shipping')
                .send({
                    carrier: 'DHL',
                    origin: 'New York, USA',
                    destination: 'Dubai, UAE',
                    packageDetails: { weight: 50, dimensions: '50x50x50' },
                })
                .expect(201);

            expect(shippingResponse.body.trackingNumber).toBeDefined();

            // Verify all components created successfully
            expect(escrowId).toBeDefined();
            expect(complianceResponse.body.checkStatus).toBe('pending');
        });
    });

    describe('Forex Rate Locking Flow', () => {
        it('should lock rate and convert at locked rate', async () => {
            // Lock rate
            const lockResponse = await request(app.getHttpServer())
                .post('/forex/lock-rate')
                .send({
                    fromCurrency: 'USD',
                    toCurrency: 'AED',
                    durationMinutes: 30,
                })
                .expect(201);

            expect(lockResponse.body.lockedRate).toBeDefined();

            // Convert using locked rate
            const convertResponse = await request(app.getHttpServer())
                .post('/forex/convert')
                .send({
                    fromCurrency: 'USD',
                    toCurrency: 'AED',
                    amount: 50000,
                })
                .expect(201);

            expect(convertResponse.body.lockedRate).toBeDefined();
        });
    });

    describe('Letter of Credit Lifecycle', () => {
        it('should create, issue, and utilize LC', async () => {
            // Create LC
            const createResponse = await request(app.getHttpServer())
                .post('/trade-finance/letter-of-credit')
                .send({
                    applicantId: 'app-1',
                    beneficiaryId: 'ben-1',
                    amount: 200000,
                    currency: 'USD',
                    issuingBank: 'Test Bank',
                    advisingBank: 'Advising Bank',
                    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    terms: {},
                })
                .expect(201);

            const lcId = createResponse.body.id;

            // Issue LC
            const issueResponse = await request(app.getHttpServer())
                .post(`/trade-finance/letter-of-credit/${lcId}/issue`)
                .expect(200);

            expect(issueResponse.body.status).toBe('issued');

            // Utilize LC
            const utilizeResponse = await request(app.getHttpServer())
                .post(`/trade-finance/letter-of-credit/${lcId}/utilize`)
                .send({
                    amount: 50000,
                    documents: [],
                })
                .expect(200);

            expect(utilizeResponse.body.utilizedAmount).toBe(50000);
            expect(utilizeResponse.body.availableAmount).toBe(150000);
        });
    });
});
