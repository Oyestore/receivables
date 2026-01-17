import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { ConciergeController } from '../concierge.controller';
import { ConciergeService } from '../../services/concierge.service';
import { PaymentIntegrationService } from '../../services/payment-integration.service';
import { DisputeIntegrationService } from '../../services/dispute-integration.service';
import { ReferralIntegrationService } from '../../services/referral-integration.service';
import { OrchestrationService } from '../../services/orchestration.service';
import { NotificationService } from '../../services/notification.service';
import { ChatPersona } from '../../entities/chat-session.entity';

describe('ConciergeController (E2E)', () => {
    let app: INestApplication;
    let conciergeService: Partial<ConciergeService>;
    let disputeService: Partial<DisputeIntegrationService>;
    let invoiceService: any;
    let paymentService: any;

    const mockSession = {
        id: 'session-123',
        tenantId: 'tenant-1',
        persona: ChatPersona.PAYER,
        externalReferenceId: 'invoice-456',
        metadata: {},
    };

    const mockInvoice = {
        id: 'invoice-456',
        invoiceNumber: 'INV-001',
        status: 'sent',
        grandTotal: 5000,
        subTotal: 4500,
        totalTaxAmount: 500,
        currency: 'INR',
        dueDate: new Date(),
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        lineItems: [],
        termsAndConditions: 'Net 30',
    };

    beforeEach(async () => {
        conciergeService = {
            startSession: jest.fn().mockResolvedValue(mockSession),
            getSession: jest.fn().mockResolvedValue(mockSession),
            processMessage: jest.fn().mockResolvedValue({
                response: 'AI response',
                suggestedActions: ['Pay Now', 'Download PDF'],
            }),
        };

        disputeService = {
            createDisputeTicket: jest.fn().mockResolvedValue({
                id: 'ticket-789',
                invoiceId: 'invoice-456',
                type: 'incorrect_amount',
                status: 'open',
            }),
        };

        invoiceService = {
            findOne: jest.fn().mockResolvedValue(mockInvoice),
            updateStatus: jest.fn().mockResolvedValue(mockInvoice),
            getInvoicePDF: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
        };

        paymentService = {
            initiatePayment: jest.fn().mockResolvedValue({
                gatewayOrderId: 'order_123',
                amount: 5000,
                currency: 'INR',
            }),
            findAll: jest.fn().mockResolvedValue({
                transactions: [
                    {
                        id: 'txn-1',
                        invoice: { invoiceNumber: 'INV-001' },
                        amount: 5000,
                        completedAt: new Date(),
                        gatewayType: 'razorpay',
                        status: 'completed',
                        createdAt: new Date(),
                    },
                ],
                total: 1,
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ConciergeController],
            providers: [
                { provide: ConciergeService, useValue: conciergeService },
                { provide: PaymentIntegrationService, useValue: {} },
                { provide: DisputeIntegrationService, useValue: disputeService },
                { provide: ReferralIntegrationService, useValue: {} },
                { provide: OrchestrationService, useValue: {} },
                { provide: NotificationService, useValue: {} },
                { provide: 'InvoiceService', useValue: invoiceService },
                { provide: 'PaymentService', useValue: paymentService },
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('POST /concierge/session', () => {
        it('should create new session', async () => {
            const response = await request(app.getHttpServer())
                .post('/concierge/session')
                .send({
                    tenantId: 'tenant-1',
                    persona: 'PAYER',
                    referenceId: 'invoice-456',
                })
                .expect(HttpStatus.CREATED);

            expect(response.body).toEqual(mockSession);
            expect(conciergeService.startSession).toHaveBeenCalledWith(
                'tenant-1',
                'PAYER',
                'invoice-456'
            );
        });
    });

    describe('GET /concierge/session/:sessionId', () => {
        it('should retrieve session', async () => {
            const response = await request(app.getHttpServer())
                .get('/concierge/session/session-123')
                .expect(HttpStatus.OK);

            expect(response.body).toEqual(mockSession);
        });
    });

    describe('POST /concierge/start/cfo', () => {
        it('should start CFO session', async () => {
            const response = await request(app.getHttpServer())
                .post('/concierge/start/cfo')
                .send({ tenantId: 'tenant-1' })
                .expect(HttpStatus.CREATED);

            expect(conciergeService.startSession).toHaveBeenCalledWith(
                'tenant-1',
                ChatPersona.CFO,
                undefined
            );
        });
    });

    describe('POST /concierge/start/payer', () => {
        it('should start payer session', async () => {
            const response = await request(app.getHttpServer())
                .post('/concierge/start/payer')
                .send({
                    tenantId: 'tenant-1',
                    invoiceId: 'invoice-456',
                })
                .expect(HttpStatus.CREATED);

            expect(conciergeService.startSession).toHaveBeenCalledWith(
                'tenant-1',
                ChatPersona.CONCIERGE,
                'invoice-456'
            );
        });
    });

    describe('POST /concierge/:sessionId/message', () => {
        it('should process chat message', async () => {
            const response = await request(app.getHttpServer())
                .post('/concierge/session-123/message')
                .send({
                    message: 'Can I get an extension?',
                    language: 'en',
                })
                .expect(HttpStatus.CREATED);

            expect(response.body.response).toBe('AI response');
            expect(response.body.suggestedActions).toContain('Pay Now');
        });
    });

    describe('GET /concierge/:sessionId/invoice', () => {
        it('should return invoice details', async () => {
            const response = await request(app.getHttpServer())
                .get('/concierge/session-123/invoice')
                .expect(HttpStatus.OK);

            expect(response.body.number).toBe('INV-001');
            expect(response.body.amount).toBe(5000);
            expect(response.body.customer.name).toBe('John Doe');
        });

        it('should return 404 if session has no invoice', async () => {
            (conciergeService.getSession as jest.Mock).mockResolvedValueOnce({
                ...mockSession,
                externalReferenceId: null,
            });

            await request(app.getHttpServer())
                .get('/concierge/session-123/invoice')
                .expect(HttpStatus.NOT_FOUND);
        });
    });

    describe('POST /concierge/:sessionId/initiate-payment', () => {
        it('should initiate Razorpay payment', async () => {
            const response = await request(app.getHttpServer())
                .post('/concierge/session-123/initiate-payment')
                .expect(HttpStatus.CREATED);

            expect(response.body.orderId).toBe('order_123');
            expect(response.body.amount).toBe(500000); // Paise conversion
            expect(response.body.currency).toBe('INR');
        });
    });

    describe('POST /concierge/:sessionId/verify-payment', () => {
        it('should verify payment signature', async () => {
            const response = await request(app.getHttpServer())
                .post('/concierge/session-123/verify-payment')
                .send({
                    razorpay_order_id: 'order_123',
                    razorpay_payment_id: 'pay_456',
                    razorpay_signature: 'sig_789',
                })
                .expect(HttpStatus.CREATED);

            expect(response.body.success).toBe(true);
            expect(response.body.paymentId).toBe('pay_456');
        });
    });

    describe('POST /concierge/:sessionId/approve-draft', () => {
        it('should approve draft invoice', async () => {
            const response = await request(app.getHttpServer())
                .post('/concierge/session-123/approve-draft')
                .expect(HttpStatus.CREATED);

            expect(response.body.success).toBe(true);
            expect(response.body.invoiceId).toBe('invoice-456');
            expect(invoiceService.updateStatus).toHaveBeenCalled();
        });
    });

    describe('POST /concierge/:sessionId/raise-dispute', () => {
        it('should create dispute ticket', async () => {
            const response = await request(app.getHttpServer())
                .post('/concierge/session-123/raise-dispute')
                .send({
                    type: 'incorrect_amount',
                    description: 'Amount is wrong',
                    evidence: ['receipt.pdf'],
                })
                .expect(HttpStatus.CREATED);

            expect(response.body.success).toBe(true);
            expect(response.body.ticketId).toBe('ticket-789');
            expect(disputeService.createDisputeTicket).toHaveBeenCalledWith(
                'session-123',
                expect.objectContaining({
                    type: 'incorrect_amount',
                    description: 'Amount is wrong',
                })
            );
        });
    });

    describe('GET /concierge/:sessionId/download-pdf', () => {
        it('should download invoice PDF', async () => {
            const response = await request(app.getHttpServer())
                .get('/concierge/session-123/download-pdf')
                .expect(HttpStatus.OK)
                .expect('Content-Type', 'application/pdf');

            expect(response.headers['content-disposition']).toContain('invoice-invoice-456.pdf');
        });
    });

    describe('GET /concierge/:sessionId/payment-history', () => {
        it('should return payment history', async () => {
            const response = await request(app.getHttpServer())
                .get('/concierge/session-123/payment-history')
                .expect(HttpStatus.OK);

            expect(response.body.payments).toHaveLength(1);
            expect(response.body.payments[0].invoiceNumber).toBe('INV-001');
            expect(response.body.totalPaid).toBe(5000);
        });
    });

    describe('POST /concierge/:sessionId/share-referral', () => {
        it('should track referral share', async () => {
            const response = await request(app.getHttpServer())
                .post('/concierge/session-123/share-referral')
                .send({
                    channel: 'whatsapp',
                    recipientType: 'supplier',
                })
                .expect(HttpStatus.CREATED);

            expect(response.body.success).toBe(true);
            expect(response.body.referralCode).toBeDefined();
            expect(response.body.shareUrl).toContain('ref=');
        });
    });
});
