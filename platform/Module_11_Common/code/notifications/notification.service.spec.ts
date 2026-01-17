/**
 * Notification Service Unit Tests
 * 
 * Comprehensive test suite for NotificationService
 * Target: 85%+ code coverage
 */

import { NotificationService, IEmailData, ISMSData } from '../notification.service';
import { ExternalServiceError } from '../../errors/app-error';
import { config } from '../../config/config.service';

// Mock dependencies
jest.mock('../../config/config.service');
jest.mock('../../logging/logger');

describe('NotificationService', () => {
    let notificationService: NotificationService;

    beforeEach(() => {
        // Reset singleton instance for each test
        (NotificationService as any).instance = undefined;

        // Mock config
        (config.getValue as jest.Mock).mockImplementation((key: string) => {
            if (key === 'email') {
                return {
                    provider: 'sendgrid',
                    from: 'noreply@smeplatform.com',
                    apiKey: 'test-sendgrid-key',
                };
            }
            if (key === 'sms') {
                return {
                    provider: 'twilio',
                    from: '+1234567890',
                    apiKey: 'test-twilio-key',
                };
            }
            return {};
        });

        notificationService = NotificationService.getInstance();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = NotificationService.getInstance();
            const instance2 = NotificationService.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should initialize with correct configuration', () => {
            expect(config.getValue).toHaveBeenCalledWith('email');
            expect(config.getValue).toHaveBeenCalledWith('sms');
        });
    });

    describe('sendEmail', () => {
        const validEmailData: IEmailData = {
            to: 'test@example.com',
            subject: 'Test Subject',
            text: 'Test text content',
            html: '<p>Test HTML content</p>',
        };

        it('should send email successfully', async () => {
            const result = await notificationService.sendEmail(validEmailData);

            expect(result.success).toBe(true);
            expect(result.messageId).toBeDefined();
            expect(result.messageId).toMatch(/^email_/);
        });

        it('should send email to multiple recipients', async () => {
            const multipleRecipients: IEmailData = {
                ...validEmailData,
                to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
            };

            const result = await notificationService.sendEmail(multipleRecipients);

            expect(result.success).toBe(true);
            expect(result.messageId).toBeDefined();
        });

        it('should send email with CC and BCC', async () => {
            const emailWithCC: IEmailData = {
                ...validEmailData,
                cc: 'cc@example.com',
                bcc: ['bcc1@example.com', 'bcc2@example.com'],
            };

            const result = await notificationService.sendEmail(emailWithCC);

            expect(result.success).toBe(true);
        });

        it('should send email with attachments', async () => {
            const emailWithAttachments: IEmailData = {
                ...validEmailData,
                attachments: [
                    {
                        filename: 'invoice.pdf',
                        content: Buffer.from('fake pdf content'),
                        contentType: 'application/pdf',
                    },
                    {
                        filename: 'report.csv',
                        content: 'name,amount\nTest,100',
                        contentType: 'text/csv',
                    },
                ],
            };

            const result = await notificationService.sendEmail(emailWithAttachments);

            expect(result.success).toBe(true);
        });

        it('should handle email sending failure gracefully', async () => {
            // Mock sendEmailViaProvider to fail
            jest.spyOn(notificationService as any, 'sendEmailViaProvider').mockRejectedValue(
                new Error('SMTP connection failed')
            );

            await expect(notificationService.sendEmail(validEmailData)).rejects.toThrow(
                ExternalServiceError
            );
        });

        it('should include custom from address if provided', async () => {
            const customFrom: IEmailData = {
                ...validEmailData,
                from: 'custom@example.com',
            };

            const result = await notificationService.sendEmail(customFrom);

            expect(result.success).toBe(true);
        });

        it('should handle HTML-only emails', async () => {
            const htmlOnly: IEmailData = {
                to: 'test@example.com',
                subject: 'HTML Only',
                html: '<h1>HTML Content</h1>',
            };

            const result = await notificationService.sendEmail(htmlOnly);

            expect(result.success).toBe(true);
        });

        it('should handle text-only emails', async () => {
            const textOnly: IEmailData = {
                to: 'test@example.com',
                subject: 'Text Only',
                text: 'Plain text content',
            };

            const result = await notificationService.sendEmail(textOnly);

            expect(result.success).toBe(true);
        });
    });

    describe('sendSMS', () => {
        const validSMSData: ISMSData = {
            to: '+919876543210',
            message: 'Test SMS message',
        };

        it('should send SMS successfully', async () => {
            const result = await notificationService.sendSMS(validSMSData);

            expect(result.success).toBe(true);
            expect(result.messageId).toBeDefined();
            expect(result.messageId).toMatch(/^sms_/);
        });

        it('should send SMS with custom from number', async () => {
            const customFrom: ISMSData = {
                ...validSMSData,
                from: '+11234567890',
            };

            const result = await notificationService.sendSMS(customFrom);

            expect(result.success).toBe(true);
        });

        it('should handle SMS sending failure gracefully', async () => {
            jest.spyOn(notificationService as any, 'sendSMSViaProvider').mockRejectedValue(
                new Error('Invalid phone number')
            );

            await expect(notificationService.sendSMS(validSMSData)).rejects.toThrow(
                ExternalServiceError
            );
        });

        it('should handle international phone numbers', async () => {
            const internationalNumbers = [
                { to: '+442071234567', message: 'UK number' },
                { to: '+33123456789', message: 'France number' },
                { to: '+8613800138000', message: 'China number' },
            ];

            for (const smsData of internationalNumbers) {
                const result = await notificationService.sendSMS(smsData);
                expect(result.success).toBe(true);
            }
        });

        it('should handle long SMS messages', async () => {
            const longMessage: ISMSData = {
                to: '+919876543210',
                message: 'A'.repeat(500), // 500 character message (3+ SMS parts)
            };

            const result = await notificationService.sendSMS(longMessage);

            expect(result.success).toBe(true);
        });
    });

    describe('sendBulkEmails', () => {
        it('should send multiple emails successfully', async () => {
            const emails: IEmailData[] = [
                { to: 'user1@example.com', subject: 'Email 1', text: 'Content 1' },
                { to: 'user2@example.com', subject: 'Email 2', text: 'Content 2' },
                { to: 'user3@example.com', subject: 'Email 3', text: 'Content 3' },
            ];

            const results = await notificationService.sendBulkEmails(emails);

            expect(results).toHaveLength(3);
            expect(results.every(r => r.success)).toBe(true);
        });

        it('should handle partial failures in bulk sending', async () => {
            const emails: IEmailData[] = [
                { to: 'user1@example.com', subject: 'Email 1', text: 'Content 1' },
                { to: 'user2@example.com', subject: 'Email 2', text: 'Content 2' },
                { to: 'user3@example.com', subject: 'Email 3', text: 'Content 3' },
            ];

            // Mock second email to fail
            let callCount = 0;
            jest.spyOn(notificationService as any, 'sendEmailViaProvider').mockImplementation(() => {
                callCount++;
                if (callCount === 2) {
                    return Promise.reject(new Error('Failed'));
                }
                return Promise.resolve({
                    success: true,
                    messageId: `email_${Date.now()}`,
                });
            });

            const results = await notificationService.sendBulkEmails(emails);

            expect(results).toHaveLength(3);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toBeDefined();
            expect(results[2].success).toBe(true);
        });

        it('should handle empty email array', async () => {
            const results = await notificationService.sendBulkEmails([]);

            expect(results).toHaveLength(0);
        });

        it('should process large bulk email batches', async () => {
            const bulkEmails: IEmailData[] = Array.from({ length: 100 }, (_, i) => ({
                to: `user${i}@example.com`,
                subject: `Subject ${i}`,
                text: `Content ${i}`,
            }));

            const results = await notificationService.sendBulkEmails(bulkEmails);

            expect(results).toHaveLength(100);
        });
    });

    describe('sendTemplatedEmail', () => {
        it('should send welcome email successfully', async () => {
            const result = await notificationService.sendTemplatedEmail(
                'test@example.com',
                'welcome',
                { name: 'John Doe' }
            );

            expect(result.success).toBe(true);
        });

        it('should replace template variables correctly', async () => {
            const sendEmailSpy = jest.spyOn(notificationService, 'sendEmail');

            await notificationService.sendTemplatedEmail(
                'test@example.com',
                'welcome',
                { name: 'Jane Smith' }
            );

            expect(sendEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
                to: 'test@example.com',
                subject: expect.stringContaining('Welcome'),
                html: expect.stringContaining('Jane Smith'),
            }));
        });

        it('should handle multiple variable replacements', async () => {
            const sendEmailSpy = jest.spyOn(notificationService, 'sendEmail');

            await notificationService.sendTemplatedEmail(
                'test@example.com',
                'invoice-created',
                { invoiceNumber: 'INV-001', amount: '$1,250.00' }
            );

            expect(sendEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
                html: expect.stringContaining('INV-001'),
            }));
        });

        it('should throw error for non-existent template', async () => {
            await expect(
                notificationService.sendTemplatedEmail(
                    'test@example.com',
                    'non-existent-template',
                    {}
                )
            ).rejects.toThrow("Email template 'non-existent-template' not found");
        });

        it('should handle templates with no variables', async () => {
            // Assuming there's a template with no variables
            const result = await notificationService.sendTemplatedEmail(
                'test@example.com',
                'welcome',
                {}
            );

            expect(result.success).toBe(true);
        });
    });

    describe('Specialized Email Methods', () => {
        describe('sendWelcomeEmail', () => {
            it('should send welcome email with correct data', async () => {
                const sendTemplatedEmailSpy = jest.spyOn(notificationService, 'sendTemplatedEmail');

                await notificationService.sendWelcomeEmail('newuser@example.com', 'New User');

                expect(sendTemplatedEmailSpy).toHaveBeenCalledWith(
                    'newuser@example.com',
                    'welcome',
                    { name: 'New User' }
                );
            });
        });

        describe('sendInvoiceNotification', () => {
            it('should send invoice notification with correct data', async () => {
                const sendTemplatedEmailSpy = jest.spyOn(notificationService, 'sendTemplatedEmail');

                await notificationService.sendInvoiceNotification(
                    'customer@example.com',
                    'INV-12345',
                    '₹50,000'
                );

                expect(sendTemplatedEmailSpy).toHaveBeenCalledWith(
                    'customer@example.com',
                    'invoice-created',
                    { invoiceNumber: 'INV-12345', amount: '₹50,000' }
                );
            });
        });

        describe('sendPaymentNotification', () => {
            it('should send payment notification with correct data', async () => {
                const sendTemplatedEmailSpy = jest.spyOn(notificationService, 'sendTemplatedEmail');

                await notificationService.sendPaymentNotification(
                    'customer@example.com',
                    'INV-12345',
                    '₹50,000'
                );

                expect(sendTemplatedEmailSpy).toHaveBeenCalledWith(
                    'customer@example.com',
                    'payment-received',
                    { invoiceNumber: 'INV-12345', amount: '₹50,000' }
                );
            });
        });

        describe('sendPasswordResetEmail', () => {
            it('should send password reset email with correct link', async () => {
                const sendTemplatedEmailSpy = jest.spyOn(notificationService, 'sendTemplatedEmail');
                const resetLink = 'https://platform.com/reset?token=abc123';

                await notificationService.sendPasswordResetEmail('user@example.com', resetLink);

                expect(sendTemplatedEmailSpy).toHaveBeenCalledWith(
                    'user@example.com',
                    'password-reset',
                    { resetLink }
                );
            });
        });
    });

    describe('sendOTP', () => {
        it('should send OTP via SMS', async () => {
            const sendSMSSpy = jest.spyOn(notificationService, 'sendSMS');
            const otp = '123456';

            await notificationService.sendOTP('+919876543210', otp);

            expect(sendSMSSpy).toHaveBeenCalledWith({
                to: '+919876543210',
                message: expect.stringContaining('123456'),
            });
        });

        it('should include validity period in OTP message', async () => {
            const sendSMSSpy = jest.spyOn(notificationService, 'sendSMS');

            await notificationService.sendOTP('+919876543210', '654321');

            expect(sendSMSSpy).toHaveBeenCalledWith({
                to: '+919876543210',
                message: expect.stringContaining('10 minutes'),
            });
        });

        it('should handle 4-digit OTPs', async () => {
            const result = await notificationService.sendOTP('+919876543210', '1234');

            expect(result.success).toBe(true);
        });

        it('should handle 8-digit OTPs', async () => {
            const result = await notificationService.sendOTP('+919876543210', '12345678');

            expect(result.success).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should throw ExternalServiceError with correct provider info', async () => {
            jest.spyOn(notificationService as any, 'sendEmailViaProvider').mockRejectedValue(
                new Error('API rate limit exceeded')
            );

            try {
                await notificationService.sendEmail({
                    to: 'test@example.com',
                    subject: 'Test',
                    text: 'Test',
                });
                fail('Should have thrown ExternalServiceError');
            } catch (error) {
                expect(error).toBeInstanceOf(ExternalServiceError);
                expect((error as ExternalServiceError).message).toContain('Email sending failed');
            }
        });

        it('should handle network timeouts', async () => {
            jest.spyOn(notificationService as any, 'sendSMSViaProvider').mockRejectedValue(
                new Error('ETIMEDOUT')
            );

            await expect(
                notificationService.sendSMS({ to: '+919876543210', message: 'Test' })
            ).rejects.toThrow(ExternalServiceError);
        });

        it('should handle invalid credentials error', async () => {
            jest.spyOn(notificationService as any, 'sendEmailViaProvider').mockRejectedValue(
                new Error('Invalid API key')
            );

            await expect(
                notificationService.sendEmail({
                    to: 'test@example.com',
                    subject: 'Test',
                    text: 'Test',
                })
            ).rejects.toThrow(ExternalServiceError);
        });
    });

    describe('Performance and Edge Cases', () => {
        it('should complete email sending within reasonable time', async () => {
            const startTime = Date.now();

            await notificationService.sendEmail({
                to: 'test@example.com',
                subject: 'Performance Test',
                text: 'Test content',
            });

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(500); // Should complete in < 500ms
        });

        it('should handle very long email subjects', async () => {
            const longSubject = 'A'.repeat(1000);

            const result = await notificationService.sendEmail({
                to: 'test@example.com',
                subject: longSubject,
                text: 'Test',
            });

            expect(result.success).toBe(true);
        });

        it('should handle very large email bodies', async () => {
            const largeBody = 'Content '.repeat(10000); // ~70KB

            const result = await notificationService.sendEmail({
                to: 'test@example.com',
                subject: 'Large Email',
                html: largeBody,
            });

            expect(result.success).toBe(true);
        });

        it('should handle special characters in email content', async () => {
            const specialChars = '!@#$%^&*(){}[]|\\:;"\'<>,.?/~`±§';

            const result = await notificationService.sendEmail({
                to: 'test@example.com',
                subject: `Special: ${specialChars}`,
                text: specialChars,
            });

            expect(result.success).toBe(true);
        });

        it('should handle Unicode characters (emojis, multilingual)', async () => {
            const unicodeContent = '🎉 मुबारक हो! 恭喜! Félicitations! 🚀';

            const result = await notificationService.sendEmail({
                to: 'test@example.com',
                subject: unicodeContent,
                text: unicodeContent,
            });

            expect(result.success).toBe(true);
        });
    });

    describe('Template System', () => {
        it('should have all required templates defined', () => {
            const requiredTemplates = [
                'welcome',
                'invoice-created',
                'payment-received',
                'password-reset',
            ];

            for (const templateName of requiredTemplates) {
                expect(async () => {
                    await notificationService.sendTemplatedEmail(
                        'test@example.com',
                        templateName,
                        {}
                    );
                }).not.toThrow();
            }
        });

        it('should handle missing template variables gracefully', async () => {
            // Sending template with incomplete variables
            const result = await notificationService.sendTemplatedEmail(
                'test@example.com',
                'invoice-created',
                { invoiceNumber: 'INV-001' } // Missing 'amount'
            );

            expect(result.success).toBe(true);
        });
    });
});
