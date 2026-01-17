import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { CrossBorderTradeModule } from '../../src/cross-border-trade.module';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('Module 13 E2E Tests - Complete User Workflows', () => {
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
        app.useGlobalPipes(new ValidationPipe());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('E2E: Complete Import Trade Flow', () => {
        it('should execute full import journey: compliance → forex → escrow → shipping → release', async () => {
            // Step 1: Initiate trade
            const tradeResponse = await request(app.getHttpServer())
                .post('/cross-border/trade/initiate')
                .send({
                    type: 'IMPORT',
                    buyer: 'AE-BUYER-001',
                    seller: 'US-SELLER-001',
                    amount: 50000,
                    currency: 'USD',
                    destination: 'UAE',
                    origin: 'USA',
                })
                .expect(201);

            const tradeId = tradeResponse.body.tradeId;
            expect(tradeId).toBeDefined();

            // Step 2: Compliance screening
            const complianceResponse = await request(app.getHttpServer())
                .post(`/cross-border/compliance/screen/${tradeId}`)
                .send({
                    entities: ['buyer', 'seller'],
                })
                .expect(201);

            expect(complianceResponse.body.status).toBe('APPROVED');

            // Step 3: Lock forex rate
            const forexResponse = await request(app.getHttpServer())
                .post(`/cross-border/forex/lock`)
                .send({
                    tradeId,
                    fromCurrency: 'USD',
                    toCurrency: 'AED',
                    amount: 50000,
                    lockDuration: 24,
                })
                .expect(201);

            expect(forexResponse.body.lockedRate).toBeDefined();

            // Step 4: Create escrow
            const escrowResponse = await request(app.getHttpServer())
                .post(`/cross-border/escrow/create`)
                .send({
                    tradeId,
                    amount: 50000,
                    currency: 'USD',
                    forexRateId: forexResponse.body.rateId,
                })
                .expect(201);

            expect(escrowResponse.body.status).toBe('PENDING');

            // Step 5: Arrange shipping
            const shippingResponse = await request(app.getHttpServer())
                .post(`/cross-border/shipping/create`)
                .send({
                    tradeId,
                    origin: 'New York, USA',
                    destination: 'Dubai, UAE',
                    carrier: 'DHL',
                })
                .expect(201);

            expect(shippingResponse.body.trackingNumber).toBeDefined();

            // Step 6: Fund escrow
            await request(app.getHttpServer())
                .post(`/cross-border/escrow/${escrowResponse.body.escrowId}/fund`)
                .send({ paymentReference: 'PAY-001' })
                .expect(200);

            // Step 7: Mark shipped
            await request(app.getHttpServer())
                .post(`/cross-border/shipping/${shippingResponse.body.shipmentId}/shipped`)
                .expect(200);

            // Step 8: Customs clearance
            await request(app.getHttpServer())
                .post(`/cross-border/compliance/customs-clear/${tradeId}`)
                .send({
                    declarationNumber: 'CUS-2024-001',
                })
                .expect(200);

            // Step 9: Delivery confirmation
            await request(app.getHttpServer())
                .post(`/cross-border/shipping/${shippingResponse.body.shipmentId}/delivered`)
                .expect(200);

            // Step 10: Release escrow to seller
            const releaseResponse = await request(app.getHttpServer())
                .post(`/cross-border/escrow/${escrowResponse.body.escrowId}/release`)
                .send({ releaseNotes: 'Goods received in good condition' })
                .expect(200);

            expect(releaseResponse.body.status).toBe('RELEASED');
        });

        it('should handle export trade flow with L/C', async () => {
            // Initiate export
            const tradeResponse = await request(app.getHttpServer())
                .post('/cross-border/trade/initiate')
                .send({
                    type: 'EXPORT',
                    buyer: 'US-BUYER-002',
                    seller: 'AE-SELLER-002',
                    amount: 100000,
                    currency: 'USD',
                    includeLetterOfCredit: true,
                })
                .expect(201);

            const tradeId = tradeResponse.body.tradeId;

            // Issue Letter of Credit
            const lcResponse = await request(app.getHttpServer())
                .post(`/cross-border/trade-finance/lc/issue`)
                .send({
                    tradeId,
                    applicant: tradeResponse.body.buyer,
                    beneficiary: tradeResponse.body.seller,
                    amount: 100000,
                    expiryDays: 90,
                    documentsRequired: ['Invoice', 'Bill of Lading', 'Certificate of Origin'],
                })
                .expect(201);

            expect(lcResponse.body.lcNumber).toBeDefined();

            // Submit shipping documents
            await request(app.getHttpServer())
                .post(`/cross-border/trade-finance/lc/${lcResponse.body.lcId}/submit-documents`)
                .send({
                    documents: [
                        { type: 'Invoice', reference: 'INV-001' },
                        { type: 'Bill of Lading', reference: 'BOL-001' },
                    ],
                })
                .expect(200);

            // Verify documents
            await request(app.getHttpServer())
                .post(`/cross-border/trade-finance/lc/${lcResponse.body.lcId}/verify-documents`)
                .expect(200);

            // Process payment
            const paymentResponse = await request(app.getHttpServer())
                .post(`/cross-border/trade-finance/lc/${lcResponse.body.lcId}/process-payment`)
                .expect(200);

            expect(paymentResponse.body.status).toBe('COMPLETED');
        });

        it('should handle multi-leg shipment with transshipment', async () => {
            const tradeResponse = await request(app.getHttpServer())
                .post('/cross-border/trade/initiate')
                .send({
                    type: 'IMPORT',
                    amount: 75000,
                    currency: 'EUR',
                    origin: 'Germany',
                    destination: 'UAE',
                    requiresTransshipment: true,
                })
                .expect(201);

            const shippingResponse = await request(app.getHttpServer())
                .post('/cross-border/shipping/create')
                .send({
                    tradeId: tradeResponse.body.tradeId,
                    legs: [
                        { from: 'Hamburg', to: 'Singapore', carrier: 'MAERSK' },
                        { from: 'Singapore', to: 'Dubai', carrier: 'DHL' },
                    ],
                })
                .expect(201);

            expect(shippingResponse.body.legs).toHaveLength(2);
        });
    });

    describe('E2E: Compliance Workflows', () => {
        it('should execute sanctions screening workflow', async () => {
            const screeningResponse = await request(app.getHttpServer())
                .post('/cross-border/compliance/sanctions/screen')
                .send({
                    entityName: 'Test Company LLC',
                    country: 'AE',
                    type: 'BUYER',
                })
                .expect(201);

            expect(screeningResponse.body.cleared).toBe(true);
            expect(screeningResponse.body.listsChecked).toContain('OFAC');
        });

        it('should handle KYC verification workflow', async () => {
            const kycResponse = await request(app.getHttpServer())
                .post('/cross-border/compliance/kyc/verify')
                .send({
                    entityId: 'ENTITY-001',
                    documents: [
                        { type: 'PASSPORT', number: 'P1234567' },
                        { type: 'BUSINESS_LICENSE', number: 'BL789012' },
                    ],
                })
                .expect(201);

            expect(kycResponse.body.status).toBe('VERIFIED');
            expect(kycResponse.body.riskScore).toBeLessThan(50);
        });

        it('should process export license application', async () => {
            const licenseResponse = await request(app.getHttpServer())
                .post('/cross-border/compliance/export-license/apply')
                .send({
                    productCategory: 'Electronics',
                    destinationCountry: 'IN',
                    value: 25000,
                    hsCode: '8471.30',
                })
                .expect(201);

            expect(licenseResponse.body.applicationId).toBeDefined();
            expect(licenseResponse.body.status).toBe('SUBMITTED');
        });

        it('should execute UAE VAT compliance check', async () => {
            const vatResponse = await request(app.getHttpServer())
                .post('/cross-border/compliance/uae-vat/verify')
                .send({
                    vatNumber: '123456789012345',
                    tradeValue: 50000,
                })
                .expect(201);

            expect(vatResponse.body.isValid).toBe(true);
            expect(vatResponse.body.vatAmount).toBe(2500); // 5% of 50000
        });

        it('should handle customs declaration workflow', async () => {
            const declarationResponse = await request(app.getHttpServer())
                .post('/cross-border/compliance/customs/declare')
                .send({
                    country: 'AE',
                    importer: 'IMP-001',
                    goods: [
                        { description: 'Laptops', quantity: 100, value: 50000 },
                    ],
                    hsCode: '8471.30',
                })
                .expect(201);

            expect(declarationResponse.body.declarationNumber).toBeDefined();
        });

        it('should execute AML transaction monitoring', async () => {
            const amlResponse = await request(app.getHttpServer())
                .post('/cross-border/compliance/aml/monitor')
                .send({
                    transactionId: 'TXN-001',
                    amount: 500000,
                    sender: 'SENDER-001',
                    beneficiary: 'BENE-001',
                })
                .expect(201);

            expect(amlResponse.body.flags).toBeDefined();
            expect(amlResponse.body.requiresReview).toBe(true); // High value
        });

        it('should handle tax compliance verification', async () => {
            const taxResponse = await request(app.getHttpServer())
                .post('/cross-border/compliance/tax/verify')
                .send({
                    entity: 'COMPANY-001',
                    taxId: 'TAX123456',
                    country: 'AE',
                })
                .expect(201);

            expect(taxResponse.body.compliant).toBe(true);
        });
    });

    describe('E2E: Financial Workflows', () => {
        it('should execute multi-currency conversion with hedging', async () => {
            // Lock rate for hedging
            const hedgeResponse = await request(app.getHttpServer())
                .post('/cross-border/forex/hedge')
                .send({
                    fromCurrency: 'EUR',
                    toCurrency: 'USD',
                    amount: 100000,
                    duration: 30, // days
                })
                .expect(201);

            // Execute conversion at locked rate
            const conversionResponse = await request(app.getHttpServer())
                .post('/cross-border/forex/convert')
                .send({
                    hedgeId: hedgeResponse.body.hedgeId,
                    amount: 100000,
                })
                .expect(200);

            expect(conversionResponse.body.convertedAmount).toBeDefined();
        });

        it('should handle escrow with milestone payments', async () => {
            const escrowResponse = await request(app.getHttpServer())
                .post('/cross-border/escrow/create')
                .send({
                    type: 'MILESTONE',
                    totalAmount: 100000,
                    milestones: [
                        { description: 'Design Phase', percentage: 30 },
                        { description: 'Development', percentage: 50 },
                        { description: 'Delivery', percentage: 20 },
                    ],
                })
                .expect(201);

            // Release first milestone
            await request(app.getHttpServer())
                .post(`/cross-border/escrow/${escrowResponse.body.escrowId}/release-milestone`)
                .send({ milestoneIndex: 0 })
                .expect(200);
        });

        it('should execute payment with forex arbitrage', async () => {
            const arbitrageResponse = await request(app.getHttpServer())
                .post('/cross-border/forex/arbitrage')
                .send({
                    startCurrency: 'USD',
                    endCurrency: 'USD',
                    path: ['USD', 'EUR', 'GBP', 'USD'],
                    amount: 10000,
                })
                .expect(200);

            expect(arbitrageResponse.body.profit).toBeGreaterThanOrEqual(0);
        });

        it('should handle bulk payment processing', async () => {
            const bulkResponse = await request(app.getHttpServer())
                .post('/cross-border/payments/bulk')
                .send({
                    payments: Array(10).fill(null).map((_, i) => ({
                        beneficiary: `BENE-${i}`,
                        amount: 1000,
                        currency: 'USD',
                    })),
                })
                .expect(201);

            expect(bulkResponse.body.batchId).toBeDefined();
            expect(bulkResponse.body.totalPayments).toBe(10);
        });

        it('should execute SWIFT international transfer', async () => {
            const swiftResponse = await request(app.getHttpServer())
                .post('/cross-border/trade-finance/swift/transfer')
                .send({
                    amount: 50000,
                    currency: 'USD',
                    beneficiaryBank: 'HSBCHKHH',
                    beneficiaryAccount: 'ACC123456',
                    purpose: 'Trade Payment',
                })
                .expect(201);

            expect(swiftResponse.body.swiftReference).toBeDefined();
        });

        it('should handle currency forward contract', async () => {
            const forwardResponse = await request(app.getHttpServer())
                .post('/cross-border/forex/forward-contract')
                .send({
                    fromCurrency: 'EUR',
                    toCurrency: 'USD',
                    amount: 100000,
                    futureDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                })
                .expect(201);

            expect(forwardResponse.body.contractId).toBeDefined();
            expect(forwardResponse.body.agreedRate).toBeDefined();
        });
    });

    describe('E2E: Specialized Workflows', () => {
        it('should execute L/C amendment workflow', async () => {
            // Create L/C
            const lcResponse = await request(app.getHttpServer())
                .post('/cross-border/trade-finance/lc/issue')
                .send({
                    amount: 50000,
                    expiryDays: 90,
                })
                .expect(201);

            // Amend L/C
            const amendResponse = await request(app.getHttpServer())
                .post(`/cross-border/trade-finance/lc/${lcResponse.body.lcId}/amend`)
                .send({
                    newAmount: 60000,
                    reason: 'Additional goods added',
                })
                .expect(200);

            expect(amendResponse.body.status).toBe('AMENDED');
        });

        it('should handle escrow dispute resolution', async () => {
            // Create escrow
            const escrowResponse = await request(app.getHttpServer())
                .post('/cross-border/escrow/create')
                .send({ amount: 25000 })
                .expect(201);

            // Raise dispute
            const disputeResponse = await request(app.getHttpServer())
                .post(`/cross-border/escrow/${escrowResponse.body.escrowId}/dispute`)
                .send({
                    reason: 'Goods not as described',
                    evidence: ['photo1.jpg', 'email_correspondence.pdf'],
                })
                .expect(201);

            expect(disputeResponse.body.disputeId).toBeDefined();

            // Resolve dispute
            await request(app.getHttpServer())
                .post(`/cross-border/escrow/dispute/${disputeResponse.body.disputeId}/resolve`)
                .send({
                    resolution: 'REFUND_BUYER',
                    percentage: 50,
                })
                .expect(200);
        });

        it('should execute emergency escrow hold', async () => {
            const escrowResponse = await request(app.getHttpServer())
                .post('/cross-border/escrow/create')
                .send({ amount: 30000 })
                .expect(201);

            // Emergency hold
            const holdResponse = await request(app.getHttpServer())
                .post(`/cross-border/escrow/${escrowResponse.body.escrowId}/emergency-hold`)
                .send({
                    reason: 'Suspected fraud',
                    authority: 'COMPLIANCE_TEAM',
                })
                .expect(200);

            expect(holdResponse.body.status).toBe('HELD');
        });

        it('should handle refund workflow', async () => {
            // Create and fund escrow
            const escrowResponse = await request(app.getHttpServer())
                .post('/cross-border/escrow/create')
                .send({ amount: 15000 })
                .expect(201);

            await request(app.getHttpServer())
                .post(`/cross-border/escrow/${escrowResponse.body.escrowId}/fund`)
                .expect(200);

            // Request refund
            const refundResponse = await request(app.getHttpServer())
                .post(`/cross-border/escrow/${escrowResponse.body.escrowId}/refund`)
                .send({
                    reason: 'Order cancelled',
                    refundPercentage: 100,
                })
                .expect(200);

            expect(refundResponse.body.status).toBe('REFUNDED');
        });

        it('should execute partial shipment workflow', async () => {
            const tradeResponse = await request(app.getHttpServer())
                .post('/cross-border/trade/initiate')
                .send({
                    amount: 100000,
                    allowPartialShipment: true,
                })
                .expect(201);

            // First partial shipment
            await request(app.getHttpServer())
                .post('/cross-border/shipping/create')
                .send({
                    tradeId: tradeResponse.body.tradeId,
                    isPartial: true,
                    percentage: 50,
                })
                .expect(201);

            // Second partial shipment
            await request(app.getHttpServer())
                .post('/cross-border/shipping/create')
                .send({
                    tradeId: tradeResponse.body.tradeId,
                    isPartial: true,
                    percentage: 50,
                })
                .expect(201);
        });

        it('should handle trade cancellation with rollback', async () => {
            const tradeResponse = await request(app.getHttpServer())
                .post('/cross-border/trade/initiate')
                .send({ amount: 40000 })
                .expect(201);

            // Cancel trade
            const cancelResponse = await request(app.getHttpServer())
                .post(`/cross-border/trade/${tradeResponse.body.tradeId}/cancel`)
                .send({ reason: 'Buyer request' })
                .expect(200);

            expect(cancelResponse.body.status).toBe('CANCELLED');
            expect(cancelResponse.body.refundsProcessed).toBe(true);
        });

        it('should execute insurance claim workflow', async () => {
            const shipmentResponse = await request(app.getHttpServer())
                .post('/cross-border/shipping/create')
                .send({
                    insuranceRequired: true,
                    insuranceValue: 50000,
                })
                .expect(201);

            // File insurance claim
            const claimResponse = await request(app.getHttpServer())
                .post('/cross-border/insurance/claim')
                .send({
                    shipmentId: shipmentResponse.body.shipmentId,
                    reason: 'Package damaged in transit',
                    claimAmount: 50000,
                })
                .expect(201);

            expect(claimResponse.body.claimId).toBeDefined();
        });

        it('should handle expedited customs clearance', async () => {
            const clearanceResponse = await request(app.getHttpServer())
                .post('/cross-border/compliance/customs/expedite')
                .send({
                    declarationNumber: 'CUS-2024-002',
                    priority: 'URGENT',
                    additionalFee: 500,
                })
                .expect(200);

            expect(clearanceResponse.body.estimatedClearanceHours).toBeLessThan(24);
        });

        it('should execute trade with pre-shipment inspection', async () => {
            const tradeResponse = await request(app.getHttpServer())
                .post('/cross-border/trade/initiate')
                .send({
                    amount: 80000,
                    requiresPreShipmentInspection: true,
                })
                .expect(201);

            // Schedule inspection
            const inspectionResponse = await request(app.getHttpServer())
                .post('/cross-border/inspection/schedule')
                .send({
                    tradeId: tradeResponse.body.tradeId,
                    inspectionType: 'QUALITY_CHECK',
                })
                .expect(201);

            expect(inspectionResponse.body.inspectionId).toBeDefined();
        });

        it('should handle consolidated shipment for multiple trades', async () => {
            // Create multiple trades
            const trades = await Promise.all([
                request(app.getHttpServer()).post('/cross-border/trade/initiate').send({ amount: 10000 }),
                request(app.getHttpServer()).post('/cross-border/trade/initiate').send({ amount: 15000 }),
                request(app.getHttpServer()).post('/cross-border/trade/initiate').send({ amount: 20000 }),
            ]);

            // Consolidate shipment
            const consolidatedResponse = await request(app.getHttpServer())
                .post('/cross-border/shipping/consolidate')
                .send({
                    tradeIds: trades.map(t => t.body.tradeId),
                    destination: 'Dubai, UAE',
                })
                .expect(201);

            expect(consolidatedResponse.body.consolidatedShipmentId).toBeDefined();
            expect(consolidatedResponse.body.totalWeight).toBeGreaterThan(0);
        });
    });

    describe('E2E: Error Scenarios & Edge Cases', () => {
        it('should handle failed compliance check', async () => {
            await request(app.getHttpServer())
                .post('/cross-border/compliance/sanctions/screen')
                .send({
                    entityName: 'Sanctioned Entity',
                    country: 'SANCTIONED',
                })
                .expect(403);
        });

        it('should handle expired forex rate', async () => {
            const rateResponse = await request(app.getHttpServer())
                .post('/cross-border/forex/lock')
                .send({
                    fromCurrency: 'USD',
                    toCurrency: 'EUR',
                    lockDuration: 0.001, // Expires immediately
                })
                .expect(201);

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 100));

            // Try to use expired rate
            await request(app.getHttpServer())
                .post('/cross-border/forex/convert')
                .send({ rateId: rateResponse.body.rateId })
                .expect(410); // Gone
        });

        it('should handle duplicate trade creation', async () => {
            const tradeData = {
                referenceId: 'UNIQUE-REF-001',
                amount: 25000,
            };

            await request(app.getHttpServer())
                .post('/cross-border/trade/initiate')
                .send(tradeData)
                .expect(201);

            // Attempt duplicate
            await request(app.getHttpServer())
                .post('/cross-border/trade/initiate')
                .send(tradeData)
                .expect(409); // Conflict
        });
    });
});
