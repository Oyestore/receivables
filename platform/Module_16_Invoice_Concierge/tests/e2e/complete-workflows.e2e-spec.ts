import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Module16InvoiceConciergeModule } from '../../src/module-16-invoice-concierge.module';
import { ChatPersona } from '../../src/entities/chat-session.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatSession } from '../../src/entities/chat-session.entity';

describe('Module 16 E2E Tests - Complete User Workflows', () => {
    let app: INestApplication;
    let sessionRepo: any;
    let sessionId: string;

    beforeAll(async () => {
        // Mock repository
        sessionRepo = {
            create: jest.fn((data) => ({ id: 'session-123', ...data })),
            save: jest.fn((session) => Promise.resolve(session)),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
            })),
        };

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [Module16InvoiceConciergeModule],
        })
            .overrideProvider(getRepositoryToken(ChatSession))
            .useValue(sessionRepo)
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('E2E: Payer Invoice Payment Journey', () => {
        it('should complete full payer workflow: view → chat → pay', async () => {
            // Step 1: Start payer session
            const sessionResponse = await request(app.getHttpServer())
                .post('/concierge/start/payer')
                .send({
                    tenantId: 'tenant-1',
                    invoiceId: 'invoice-123',
                })
                .expect(HttpStatus.CREATED);

            sessionId = sessionResponse.body.id;
            expect(sessionId).toBeDefined();

            // Mock session for subsequent calls
            sessionRepo.findOne.mockResolvedValue({
                id: sessionId,
                tenantId: 'tenant-1',
                externalReferenceId: 'invoice-123',
                persona: ChatPersona.CONCIERGE,
                messages: [],
                metadata: {},
            });

            // Step 2: Get invoice details
            await request(app.getHttpServer())
                .get(`/concierge/${sessionId}/invoice`)
                .expect(HttpStatus.OK);

            // Step 3: Send chat message
            await request(app.getHttpServer())
                .post(`/concierge/${sessionId}/message`)
                .send({
                    message: 'Can I get a payment extension?',
                    language: 'en',
                })
                .expect(HttpStatus.CREATED);

            // Step 4: Initiate payment
            const paymentResponse = await request(app.getHttpServer())
                .post(`/concierge/${sessionId}/initiate-payment`)
                .expect(HttpStatus.CREATED);

            expect(paymentResponse.body.orderId).toBeDefined();
        });

        it('should handle payer dispute workflow', async () => {
            // Session already created from previous test
            sessionRepo.findOne.mockResolvedValue({
                id: 'session-123',
                tenantId: 'tenant-1',
                externalReferenceId: 'invoice-123',
                persona: ChatPersona.CONCIERGE,
            });

            // Raise dispute
            const disputeResponse = await request(app.getHttpServer())
                .post('/concierge/session-123/raise-dispute')
                .send({
                    type: 'incorrect_amount',
                    description: 'The invoice amount is significantly higher than agreed upon amount',
                    contactEmail: 'customer@example.com',
                })
                .expect(HttpStatus.CREATED);

            expect(disputeResponse.body.success).toBe(true);
            expect(disputeResponse.body.ticketId).toBeDefined();
        });
    });

    describe('E2E: CFO Internal Analytics Journey', () => {
        it('should complete CFO workflow: login → analyze → insights', async () => {
            // Step 1: Start CFO session
            const sessionResponse = await request(app.getHttpServer())
                .post('/concierge/start/cfo')
                .send({ tenantId: 'tenant-1' })
                .expect(HttpStatus.CREATED);

            const cfoSessionId = sessionResponse.body.id;

            sessionRepo.findOne.mockResolvedValue({
                id: cfoSessionId,
                tenantId: 'tenant-1',
                persona: ChatPersona.CFO,
                messages: [],
            });

            // Step 2: Ask for cash flow analysis
            const analysisResponse = await request(app.getHttpServer())
                .post(`/concierge/${cfoSessionId}/message`)
                .send({
                    message: 'Analyze our cash flow for this quarter',
                })
                .expect(HttpStatus.CREATED);

            expect(analysisResponse.body.response).toBeDefined();
            expect(analysisResponse.body.suggestedActions).toContain('Analyze Margins');
        });
    });

    describe('E2E: Draft Invoice Approval Workflow', () => {
        it('should complete draft approval workflow', async () => {
            sessionRepo.findOne.mockResolvedValue({
                id: 'session-123',
                tenantId: 'tenant-1',
                externalReferenceId: 'DRAFT-invoice-456',
                persona: ChatPersona.CONCIERGE,
            });

            // Approve draft
            const approvalResponse = await request(app.getHttpServer())
                .post('/concierge/session-123/approve-draft')
                .expect(HttpStatus.CREATED);

            expect(approvalResponse.body.success).toBe(true);
            expect(approvalResponse.body.message).toContain('approved');
        });
    });

    describe('E2E: Referral Viral Growth Workflow', () => {
        it('should complete referral sharing workflow', async () => {
            sessionRepo.findOne.mockResolvedValue({
                id: 'session-123',
                tenantId: 'tenant-1',
            });

            // Share referral
            const referralResponse = await request(app.getHttpServer())
                .post('/concierge/session-123/share-referral')
                .send({
                    channel: 'whatsapp',
                    recipientType: 'supplier',
                })
                .expect(HttpStatus.CREATED);

            expect(referralResponse.body.success).toBe(true);
            expect(referralResponse.body.referralCode).toBeDefined();
            expect(referralResponse.body.shareUrl).toContain('ref=');
        });
    });

    describe('E2E: Payment History Review', () => {
        it('should retrieve payment history', async () => {
            sessionRepo.findOne.mockResolvedValue({
                id: 'session-123',
                tenantId: 'tenant-1',
                externalReferenceId: 'invoice-123',
            });

            const historyResponse = await request(app.getHttpServer())
                .get('/concierge/session-123/payment-history')
                .expect(HttpStatus.OK);

            expect(historyResponse.body.payments).toBeDefined();
        });
    });

    describe('E2E: PDF Download Workflow', () => {
        it('should download invoice PDF', async () => {
            sessionRepo.findOne.mockResolvedValue({
                id: 'session-123',
                tenantId: 'tenant-1',
                externalReferenceId: 'invoice-123',
            });

            await request(app.getHttpServer())
                .get('/concierge/session-123/download-pdf')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /pdf/);
        });
    });

    describe('E2E: Multi-Language Support', () => {
        it('should handle Hindi language chat', async () => {
            sessionRepo.findOne.mockResolvedValue({
                id: 'session-123',
                tenantId: 'tenant-1',
                persona: ChatPersona.CONCIERGE,
                messages: [],
            });

            const response = await request(app.getHttpServer())
                .post('/concierge/session-123/message')
                .send({
                    message: 'नमस्ते',
                    language: 'hi',
                })
                .expect(HttpStatus.CREATED);

            expect(response.body.response).toBeDefined();
        });
    });

    describe('E2E: Error Scenarios', () => {
        it('should handle invalid session gracefully', async () => {
            sessionRepo.findOne.mockResolvedValue(null);

            await request(app.getHttpServer())
                .get('/concierge/invalid-session/invoice')
                .expect(HttpStatus.NOT_FOUND);
        });

        it('should validate required fields', async () => {
            await request(app.getHttpServer())
                .post('/concierge/session')
                .send({
                    // Missing tenantId
                    persona: 'PAYER',
                })
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('should validate dispute description length', async () => {
            sessionRepo.findOne.mockResolvedValue({
                id: 'session-123',
                tenantId: 'tenant-1',
            });

            await request(app.getHttpServer())
                .post('/concierge/session-123/raise-dispute')
                .send({
                    type: 'fraud',
                    description: 'Short', // Too short (min 10 chars)
                })
                .expect(HttpStatus.BAD_REQUEST);
        });
    });

    describe('E2E: Complete Multi-Step Workflow', () => {
        it('should execute complete end-to-end customer journey', async () => {
            // 1. Customer receives magic link → starts session
            const sessionResponse = await request(app.getHttpServer())
                .post('/concierge/start/payer')
                .send({
                    tenantId: 'vendor-1',
                    invoiceId: 'INV-2024-001',
                })
                .expect(HttpStatus.CREATED);

            const testSessionId = sessionResponse.body.id;

            // Mock for all subsequent calls
            sessionRepo.findOne.mockResolvedValue({
                id: testSessionId,
                tenantId: 'vendor-1',
                externalReferenceId: 'INV-2024-001',
                persona: ChatPersona.CONCIERGE,
                messages: [],
                metadata: {},
            });

            // 2. View invoice
            await request(app.getHttpServer())
                .get(`/concierge/${testSessionId}/invoice`)
                .expect(HttpStatus.OK);

            // 3. Ask question via chat
            await request(app.getHttpServer())
                .post(`/concierge/${testSessionId}/message`)
                .send({ message: 'What are the payment terms?' })
                .expect(HttpStatus.CREATED);

            // 4. Download PDF for records
            await request(app.getHttpServer())
                .get(`/concierge/${testSessionId}/download-pdf`)
                .expect(HttpStatus.OK);

            // 5. Initiate payment
            const paymentResponse = await request(app.getHttpServer())
                .post(`/concierge/${testSessionId}/initiate-payment`)
                .expect(HttpStatus.CREATED);

            expect(paymentResponse.body.orderId).toBeDefined();

            // 6. Verify payment (simulated)
            await request(app.getHttpServer())
                .post(`/concierge/${testSessionId}/verify-payment`)
                .send({
                    razorpay_order_id: paymentResponse.body.orderId,
                    razorpay_payment_id: 'pay_test123',
                    razorpay_signature: 'sig_test456',
                })
                .expect(HttpStatus.CREATED);

            // 7. Share referral
            const referralResponse = await request(app.getHttpServer())
                .post(`/concierge/${testSessionId}/share-referral`)
                .send({
                    channel: 'whatsapp',
                    recipientType: 'peer',
                })
                .expect(HttpStatus.CREATED);

            expect(referralResponse.body.referralCode).toBeDefined();
        });
    });
});
