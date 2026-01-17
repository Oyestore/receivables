import { Test, TestingModule } from '@nestjs/testing';
import { PaymentIntegrationService } from '../payment-integration.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatSession } from '../../entities/chat-session.entity';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaymentIntegrationService', () => {
    let service: PaymentIntegrationService;
    let sessionRepo: Partial<Repository<ChatSession>>;

    const mockPaymentSuccess = {
        id: 'pay_123',
        order_id: 'order_456',
        amount: 100000, // 1000 rupees in paise
        currency: 'INR',
        status: 'captured',
        method: 'upi',
        captured: true,
        email: 'customer@example.com',
        contact: '+919876543210',
        created_at: 1640000000,
    };

    const mockWebh ookEvent = {
        entity: 'event',
        account_id: 'acc_123',
        event: 'payment.captured',
        contains: ['payment'],
        payload: {
            payment: {
                entity: mockPaymentSuccess,
            },
        },
    };

    beforeEach(async () => {
        // Set webhook secret
        process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';

        sessionRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
            })) as any,
        };

        mockedAxios.post.mockResolvedValue({ data: {} });
        mockedAxios.patch.mockResolvedValue({ data: {} });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentIntegrationService,
                {
                    provide: getRepositoryToken(ChatSession),
                    useValue: sessionRepo,
                },
            ],
        }).compile();

        service = module.get<PaymentIntegrationService>(PaymentIntegrationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handlePaymentWebhook', () => {
        it('should process valid payment.captured webhook', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            await service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature);

            expect(sessionRepo.save).toHaveBeenCalled();
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/orchestration/events',
                expect.objectContaining({
                    type: 'payment_success',
                })
            );
        });

        it('should reject webhook with invalid signature', async () => {
            const rawBody = JSON.stringify(mockWebhookEvent);
            const invalidSignature = 'invalid_signature_123';

            await expect(
                service.handlePaymentWebhook(mockWebhookEvent, rawBody, invalidSignature)
            ).rejects.toThrow('Invalid webhook signature');
        });

        it('should throw error if webhook secret not configured', async () => {
            delete process.env.RAZORPAY_WEBHOOK_SECRET;

            const rawBody = JSON.stringify(mockWebhookEvent);
            const signature = 'any_signature';

            await expect(
                service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature)
            ).rejects.toThrow('Webhook secret missing');

            // Restore for other tests
            process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
        });

        it('should handle payment.failed event', async () => {
            const failedEvent = {
                ...mockWebhookEvent,
                event: 'payment.failed',
                payload: {
                    payment: {
                        entity: {
                            ...mockPaymentSuccess,
                            status: 'failed',
                            error_description: 'Insufficient funds',
                        },
                    },
                },
            };

            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const rawBody = JSON.stringify(failedEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            await service.handlePaymentWebhook(failedEvent, rawBody, signature);

            expect(sessionRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        paymentStatus: 'failed',
                        failureReason: 'Insufficient funds',
                    }),
                })
            );
        });

        it('should handle payment.refunded event', async () => {
            const refundedEvent = {
                ...mockWebhookEvent,
                event: 'payment.refunded',
            };

            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const rawBody = JSON.stringify(refundedEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            await service.handlePaymentWebhook(refundedEvent, rawBody, signature);

            expect(sessionRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        paymentStatus: 'refunded',
                    }),
                })
            );
        });
    });

    describe('payment success handling', () => {
        it('should update session with payment details', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            await service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature);

            expect(sessionRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        paymentId: 'pay_123',
                        paymentStatus: 'captured',
                        paidAmount: 1000,
                        paymentMethod: 'upi',
                    }),
                })
            );
        });

        it('should trigger orchestration event', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            await service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/orchestration/events',
                expect.objectContaining({
                    type: 'payment_success',
                    source: 'module_16_concierge',
                    data: expect.objectContaining({
                        paymentId: 'pay_123',
                        amount: 1000,
                    }),
                })
            );
        });

        it('should send payment confirmation notifications', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            await service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature);

            // WhatsApp notification
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    to: '+919876543210',
                    template: 'payment_success',
                })
            );

            // Email notification
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/email',
                expect.objectContaining({
                    to: 'customer@example.com',
                    subject: 'Payment Successful - Receipt Attached',
                })
            );
        });

        it('should update payment record in Module 03', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            await service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature);

            expect(mockedAxios.patch).toHaveBeenCalledWith(
                '/api/payments/pay_123',
                expect.objectContaining({
                    status: 'captured',
                    method: 'upi',
                })
            );
        });

        it('should handle idempotent payment processing', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: {
                    razorpayOrderId: 'order_456',
                    paymentId: 'pay_123',
                    paymentStatus: 'captured',
                },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            await service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature);

            // Should not save again for duplicate
            expect(sessionRepo.save).not.toHaveBeenCalled();
        });
    });

    describe('session lookup', () => {
        it('should find session by order ID', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            await service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature);

            expect(mockQueryBuilder.where).toHaveBeenCalledWith(
                "session.metadata->>'razorpayOrderId' = :orderId",
                { orderId: 'order_456' }
            );
        });

        it('should handle session not found gracefully', async () => {
            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            });

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            // Should not throw error
            await expect(
                service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature)
            ).resolves.not.toThrow();
        });
    });

    describe('error handling', () => {
        it('should handle orchestration event failure gracefully', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            mockedAxios.post.mockRejectedValueOnce(new Error('Orchestration unavailable'));

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            // Should not throw error - payment still processed
            await expect(
                service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature)
            ).resolves.not.toThrow();
        });

        it('should handle notification failure gracefully', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            // Mock notification failure
            mockedAxios.post.mockImplementation((url) => {
                if (url.includes('notifications')) {
                    return Promise.reject(new Error('Notification service down'));
                }
                return Promise.resolve({ data: {} });
            });

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            // Should not throw error
            await expect(
                service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature)
            ).resolves.not.toThrow();
        });

        it('should handle Module 03 update failure gracefully', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            mockedAxios.patch.mockRejectedValueOnce(new Error('Module 03 unavailable'));

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            // Should not throw error
            await expect(
                service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature)
            ).resolves.not.toThrow();
        });
    });

    describe('payment failure handling', () => {
        it('should send SMS notification on payment failure', async () => {
            const failedEvent = {
                ...mockWebhookEvent,
                event: 'payment.failed',
                payload: {
                    payment: {
                        entity: {
                            ...mockPaymentSuccess,
                            status: 'failed',
                            error_description: 'Card declined',
                        },
                    },
                },
            };

            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const rawBody = JSON.stringify(failedEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            await service.handlePaymentWebhook(failedEvent, rawBody, signature);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/sms',
                expect.objectContaining({
                    to: '+919876543210',
                })
            );
        });
    });

    describe('amount conversion', () => {
        it('should convert paise to rupees correctly', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { razorpayOrderId: 'order_456' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const rawBody = JSON.stringify(mockWebhookEvent);
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', 'test_webhook_secret')
                .update(rawBody)
                .digest('hex');

            await service.handlePaymentWebhook(mockWebhookEvent, rawBody, signature);

            expect(sessionRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        paidAmount: 1000, // 100000 paise = 1000 rupees
                    }),
                })
            );
        });
    });
});
