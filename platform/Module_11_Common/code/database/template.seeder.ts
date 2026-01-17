/**
 * Template Seeder
 * 
 * Seeds database with initial notification templates for:
 * - Authentication (OTP, password reset, etc.)
 * - Transactional (invoices, payments, etc.)
 * - Notifications (reminders, alerts, etc.)
 */

import { Repository } from 'typeorm';
import {
    NotificationTemplate,
    TemplateType,
    TemplateStatus,
    TemplateCategory,
} from '../entities/notification-template.entity';
import { Logger } from '../logging/logger';

const logger = new Logger('TemplateSeeder');

export class TemplateSeeder {
    constructor(private templateRepository: Repository<NotificationTemplate>) { }

    async seed(): Promise<void> {
        logger.info('Seeding notification templates...');

        const templates = [
            // Email Templates
            {
                name: 'welcome_email',
                displayName: 'Welcome Email',
                description: 'Sent to new users after registration',
                type: TemplateType.EMAIL,
                category: TemplateCategory.AUTHENTICATION,
                subject: 'Welcome to SME Receivables Platform, {{name}}!',
                htmlBody: `
          <h1>Welcome {{name}}!</h1>
          <p>Thank you for joining the SME Receivables Management Platform.</p>
          <p>We're excited to help you streamline your receivables management and improve cash flow.</p>
          <p>Get started by:</p>
          <ul>
            <li>Setting up your company profile</li>
            <li>Adding your first invoice</li>
            <li>Exploring our automated collection features</li>
          </ul>
          <p>If you have any questions, our support team is here to help.</p>
          <p>Best regards,<br>SME Platform Team</p>
        `,
                textBody: 'Welcome {{name}}! Thank you for joining the SME Receivables Management Platform.',
                variables: ['name'],
                status: TemplateStatus.ACTIVE,
                isActive: true,
            },

            {
                name: 'invoice_created',
                displayName: 'Invoice Created Notification',
                description: 'Sent when a new invoice is created',
                type: TemplateType.EMAIL,
                category: TemplateCategory.TRANSACTIONAL,
                subject: 'New Invoice {{invoiceNumber}} - Amount: {{amount}}',
                htmlBody: `
          <h2>New Invoice Created</h2>
          <p>Dear Customer,</p>
          <p>A new invoice has been generated:</p>
          <table border="1" cellpadding="10">
            <tr><td>Invoice Number:</td><td><strong>{{invoiceNumber}}</strong></td></tr>
            <tr><td>Amount:</td><td><strong>{{amount}}</strong></td></tr>
            <tr><td>Due Date:</td><td>{{dueDate}}</td></tr>
          </table>
          <p><a href="{{invoiceLink}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Invoice</a></p>
          <p>Thank you for your business!</p>
        `,
                textBody: 'New Invoice {{invoiceNumber}} for {{amount}}. Due date: {{dueDate}}. View at: {{invoiceLink}}',
                variables: ['invoiceNumber', 'amount', 'dueDate', 'invoiceLink'],
                status: TemplateStatus.ACTIVE,
                isActive: true,
            },

            {
                name: 'payment_confirmation',
                displayName: 'Payment Confirmation',
                description: 'Sent when payment is received',
                type: TemplateType.EMAIL,
                category: TemplateCategory.TRANSACTIONAL,
                subject: 'Payment Received - Invoice {{invoiceNumber}}',
                htmlBody: `
          <h2>Payment Received</h2>
          <p>Dear Customer,</p>
          <p>We have received your payment:</p>
          <table border="1" cellpadding="10">
            <tr><td>Invoice Number:</td><td>{{invoiceNumber}}</td></tr>
            <tr><td>Amount Paid:</td><td><strong>{{amount}}</strong></td></tr>
            <tr><td>Payment Date:</td><td>{{paymentDate}}</td></tr>
            <tr><td>Payment Method:</td><td>{{paymentMethod}}</td></tr>
          </table>
          <p>Thank you for your prompt payment!</p>
          <p><a href="{{receiptLink}}">Download Receipt</a></p>
        `,
                textBody: 'Payment of {{amount}} received for invoice {{invoiceNumber}} on {{paymentDate}}. Download receipt: {{receiptLink}}',
                variables: ['invoiceNumber', 'amount', 'paymentDate', 'paymentMethod', 'receiptLink'],
                status: TemplateStatus.ACTIVE,
                isActive: true,
            },

            {
                name: 'password_reset',
                displayName: 'Password Reset Email',
                description: 'Sent when user requests password reset',
                type: TemplateType.EMAIL,
                category: TemplateCategory.AUTHENTICATION,
                subject: 'Password Reset Request',
                htmlBody: `
          <h2>Password Reset</h2>
          <p>Hello {{name}},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p><a href="{{resetLink}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Security tip: Never share your password with anyone.</p>
        `,
                textBody: 'Password reset requested for {{name}}. Reset link: {{resetLink}} (expires in 1 hour)',
                variables: ['name', 'resetLink'],
                status: TemplateStatus.ACTIVE,
                isActive: true,
            },

            // SMS Templates
            {
                name: 'otp_sms',
                displayName: 'OTP SMS',
                description: 'One-time password for authentication',
                type: TemplateType.SMS,
                category: TemplateCategory.AUTHENTICATION,
                messageBody: 'Your OTP is: {{otp}}. Valid for {{validMinutes}} minutes. Do not share this code.',
                variables: ['otp', 'validMinutes'],
                status: TemplateStatus.ACTIVE,
                isActive: true,
            },

            {
                name: 'payment_reminder_sms',
                displayName: 'Payment Reminder SMS',
                description: 'Reminder for overdue invoices',
                type: TemplateType.SMS,
                category: TemplateCategory.REMINDER,
                messageBody: 'Reminder: Invoice {{invoiceNumber}} for {{amount}} is {{daysOverdue}} days overdue. Please pay at your earliest convenience.',
                variables: ['invoiceNumber', 'amount', 'daysOverdue'],
                status: TemplateStatus.ACTIVE,
                isActive: true,
            },

            // WhatsApp Templates
            {
                name: 'whatsapp_invoice_notification',
                displayName: 'WhatsApp Invoice Notification',
                description: 'Invoice notification via WhatsApp',
                type: TemplateType.WHATSAPP,
                category: TemplateCategory.TRANSACTIONAL,
                whatsappTemplateName: 'invoice_notification',
                messageBody: 'New invoice {{invoiceNumber}} for {{amount}} created. Due date: {{dueDate}}.',
                variables: ['invoiceNumber', 'amount', 'dueDate'],
                status: TemplateStatus.ACTIVE,
                isActive: true,
                metadata: {
                    tags: ['invoice', 'whatsapp', 'notification'],
                    useCase: 'Notify customers about new invoices via WhatsApp',
                },
            },

            {
                name: 'whatsapp_otp',
                displayName: 'WhatsApp OTP',
                description: 'OTP delivery via WhatsApp',
                type: TemplateType.WHATSAPP,
                category: TemplateCategory.AUTHENTICATION,
                whatsappTemplateName: 'otp_verification',
                messageBody: 'Your verification code is: {{otp}}. Valid for {{validMinutes}} minutes.',
                variables: ['otp', 'validMinutes'],
                status: TemplateStatus.ACTIVE,
                isActive: true,
            },

            {
                name: 'whatsapp_payment_confirmation',
                displayName: 'WhatsApp Payment Confirmation',
                description: 'Payment confirmation via WhatsApp',
                type: TemplateType.WHATSAPP,
                category: TemplateCategory.TRANSACTIONAL,
                whatsappTemplateName: 'payment_confirmation',
                messageBody: 'Payment of {{amount}} received for invoice {{invoiceNumber}} on {{paymentDate}}. Thank you!',
                variables: ['amount', 'invoiceNumber', 'paymentDate'],
                status: TemplateStatus.ACTIVE,
                isActive: true,
            },
        ];

        let created = 0;
        let skipped = 0;

        for (const templateData of templates) {
            const existing = await this.templateRepository.findOne({
                where: { name: templateData.name },
            });

            if (existing) {
                logger.debug(`Template '${templateData.name}' already exists, skipping`);
                skipped++;
                continue;
            }

            const template = this.templateRepository.create({
                ...templateData,
                version: 1,
                usageCount: 0,
                createdBy: 'system',
            });

            await this.templateRepository.save(template);
            logger.debug(`Created template: ${templateData.name}`);
            created++;
        }

        logger.info(`Template seeding complete. Created: ${created}, Skipped: ${skipped}`);
    }
}
