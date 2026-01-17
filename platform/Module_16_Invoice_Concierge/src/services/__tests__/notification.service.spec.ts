import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../notification.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NotificationService', () => {
    let service: NotificationService;

    beforeEach(async () => {
        // Disable mock mode by default
        delete process.env.MOCK_NOTIFICATIONS;

        mockedAxios.post.mockResolvedValue({ data: {} });

        const module: TestingModule = await Test.createTestingModule({
            providers: [NotificationService],
        }).compile();

        service = module.get<NotificationService>(NotificationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('sendWhatsApp', () => {
        it('should send WhatsApp message via Module 11', async () => {
            await service.sendWhatsApp({
                to: '+919876543210',
                template: 'invoice_magic_link',
                variables: {
                    vendor: 'Acme Corp',
                    amount: '₹1,000',
                },
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    to: '+919876543210',
                    template: 'invoice_magic_link',
                })
            );
        });

        it('should retry on failure with exponential backoff', async () => {
            mockedAxios.post
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ data: {} });

            await service.sendWhatsApp({
                to: '+919876543210',
                template: 'test',
                variables: {},
            });

            expect(mockedAxios.post).toHaveBeenCalledTimes(3);
        });

        it('should throw error after max retries', async () => {
            mockedAxios.post.mockRejectedValue(new Error('Persistent failure'));

            await expect(
                service.sendWhatsApp({
                    to: '+919876543210',
                    template: 'test',
                    variables: {},
                })
            ).rejects.toThrow('Persistent failure');

            expect(mockedAxios.post).toHaveBeenCalledTimes(3);
        });

        it('should use mock mode when MOCK_NOTIFICATIONS enabled', async () => {
            process.env.MOCK_NOTIFICATIONS = 'true';

            await service.sendWhatsApp({
                to: '+919876543210',
                template: 'test',
                variables: {},
            });

            expect(mockedAxios.post).not.toHaveBeenCalled();
        });
    });

    describe('sendSMS', () => {
        it('should send SMS via Module 11', async () => {
            await service.sendSMS({
                to: '+919876543210',
                message: 'Payment reminder for invoice INV-123',
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/sms',
                expect.objectContaining({
                    to: '+919876543210',
                    message: 'Payment reminder for invoice INV-123',
                })
            );
        });

        it('should throw error on API failure', async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error('SMS service down'));

            await expect(
                service.sendSMS({
                    to: '+919876543210',
                    message: 'Test',
                })
            ).rejects.toThrow('SMS service down');
        });

        it('should use mock mode when MOCK_NOTIFICATIONS enabled', async () => {
            process.env.MOCK_NOTIFICATIONS = 'true';

            await service.sendSMS({
                to: '+919876543210',
                message: 'Test message',
            });

            expect(mockedAxios.post).not.toHaveBeenCalled();
        });
    });

    describe('sendEmail', () => {
        it('should send email via Module 11', async () => {
            await service.sendEmail({
                to: 'customer@example.com',
                subject: 'Payment Confirmation',
                template: 'payment_receipt',
                variables: {
                    amount: 1000,
                    paymentId: 'pay_123',
                },
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/email',
                expect.objectContaining({
                    to: 'customer@example.com',
                    subject: 'Payment Confirmation',
                    template: 'payment_receipt',
                })
            );
        });

        it('should include attachments when provided', async () => {
            await service.sendEmail({
                to: 'customer@example.com',
                subject: 'Invoice',
                template: 'invoice_email',
                variables: {},
                attachments: [
                    {
                        filename: 'invoice.pdf',
                        path: '/invoices/123.pdf',
                    },
                ],
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/email',
                expect.objectContaining({
                    attachments: [
                        {
                            filename: 'invoice.pdf',
                            path: '/invoices/123.pdf',
                        },
                    ],
                })
            );
        });

        it('should throw error on API failure', async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error('Email service down'));

            await expect(
                service.sendEmail({
                    to: 'test@example.com',
                    subject: 'Test',
                    template: 'test',
                    variables: {},
                })
            ).rejects.toThrow('Email service down');
        });
    });

    describe('sendMagicLink', () => {
        it('should send magic link via WhatsApp and Email', async () => {
            await service.sendMagicLink(
                '+919876543210',
                'customer@example.com',
                'https://portal.example.com/magic/abc123',
                'INV-001',
                'Acme Corp',
                5000
            );

            // WhatsApp call
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    template: 'invoice_magic_link',
                    variables: expect.objectContaining({
                        vendor: 'Acme Corp',
                        invoiceNumber: 'INV-001',
                        amount: '₹5,000',
                    }),
                })
            );

            // Email call
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/email',
                expect.objectContaining({
                    subject: 'Invoice INV-001 from Acme Corp',
                    template: 'invoice_email_link',
                })
            );
        });
    });

    describe('sendPaymentReminder', () => {
        it('should send gentle reminder for overdue \u003c 7 days', async () => {
            await service.sendPaymentReminder(
                '+919876543210',
                'customer@example.com',
                'INV-001',
                5000,
                3
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    template: 'payment_reminder_gentle',
                })
            );
        });

        it('should send standard reminder for 7-14 days overdue', async () => {
            await service.sendPaymentReminder(
                '+919876543210',
                'customer@example.com',
                'INV-001',
                5000,
                10
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    template: 'payment_reminder_reminder',
                })
            );
        });

        it('should send urgent reminder for \u003e 14 days overdue', async () => {
            await service.sendPaymentReminder(
                '+919876543210',
                'customer@example.com',
                'INV-001',
                5000,
                20
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    template: 'payment_reminder_urgent',
                })
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/email',
                expect.objectContaining({
                    subject: 'URGENT: Invoice INV-001 Overdue by 20 Days',
                })
            );
        });
    });

    describe('sendPaymentConfirmation', () => {
        it('should send payment confirmation with receipt', async () => {
            await service.sendPaymentConfirmation(
                '+919876543210',
                'customer@example.com',
                'pay_123',
                5000,
                'upi'
            );

            // WhatsApp
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    template: 'payment_success',
                    variables: expect.objectContaining({
                        amount: '₹5,000',
                        paymentId: 'pay_123',
                        method: 'UPI',
                    }),
                })
            );

            // Email with attachment
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/email',
                expect.objectContaining({
                    subject: 'Payment Successful - Receipt Attached',
                    attachments: expect.arrayContaining([
                        expect.objectContaining({
                            filename: 'receipt-pay_123.pdf',
                        }),
                    ]),
                })
            );
        });
    });

    describe('sendDisputeConfirmation', () => {
        it('should send dispute ticket confirmation', async () => {
            await service.sendDisputeConfirmation(
                '+919876543210',
                'customer@example.com',
                'ticket-456',
                'incorrect_amount'
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    template: 'dispute_ticket_created',
                    variables: expect.objectContaining({
                        ticketId: 'ticket-456',
                        disputeType: 'incorrect_amount',
                    }),
                })
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/email',
                expect.objectContaining({
                    subject: 'Dispute Ticket Created - ticket-456',
                })
            );
        });
    });

    describe('sendReferralReward', () => {
        it('should send referral reward notification', async () => {
            await service.sendReferralReward(
                '+919876543210',
                'customer@example.com',
                500,
                'John Doe'
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    template: 'referral_reward',
                    variables: expect.objectContaining({
                        rewardAmount: '₹500',
                        refereeName: 'John Doe',
                    }),
                })
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/email',
                expect.objectContaining({
                    subject: '🎉 You Earned ₹500 Referral Reward!',
                })
            );
        });
    });

    describe('sendCollectionSuccess', () => {
        it('should send collection success to tenant', async () => {
            await service.sendCollectionSuccess(
                'vendor@example.com',
                'Acme Corp',
                10000,
                'INV-001'
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/email',
                expect.objectContaining({
                    to: 'vendor@example.com',
                    subject: 'Payment Received: Acme Corp - ₹10,000',
                    template: 'collection_success',
                })
            );
        });
    });

    describe('error handling', () => {
        it('should extract error message from Error objects', async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error('Test error'));

            await expect(
                service.sendSMS({ to: '+919876543210', message: 'Test' })
            ).rejects.toThrow('Test error');
        });

        it('should handle string errors', async () => {
            mockedAxios.post.mockRejectedValueOnce('String error');

            await expect(
                service.sendSMS({ to: '+919876543210', message: 'Test' })
            ).rejects.toBe('String error');
        });
    });
});
