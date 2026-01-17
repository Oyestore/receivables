/**
 * Template Testing Service
 * 
 * Allows testing templates before activation with:
 * - Preview rendering
 * - Test send functionality
 * - Variable validation
 * - A/B test simulation
 */

import { Logger } from '../logging/logger';
import { TemplateManagementService } from './template-management.service';
import { notificationService } from '../notifications/notification.service';
import { TemplateType } from '../entities/notification-template.entity';

const logger = new Logger('TemplateTestingService');

export interface ITemplateTestOptions {
    templateId: string;
    variables: Record<string, any>;
    testRecipient: string;
    testRecipientId?: string;
}

export interface ITemplatePreviewResult {
    subject?: string;
    html?: string;
    text?: string;
    message?: string;
    variables: Record<string, any>;
    missingVariables: string[];
    warnings: string[];
}

export class TemplateTestingService {
    constructor(private templateManagementService: TemplateManagementService) {
        logger.info('TemplateTestingService initialized');
    }

    /**
     * Preview template rendering
     */
    async previewTemplate(
        templateId: string,
        variables: Record<string, any>
    ): Promise<ITemplatePreviewResult> {
        logger.info('Previewing template', { templateId });

        const template = await this.templateManagementService.getTemplate(templateId);

        if (!template) {
            throw new Error('Template not found');
        }

        const result: ITemplatePreviewResult = {
            variables,
            missingVariables: [],
            warnings: [],
        };

        // Check for missing variables
        result.missingVariables = template.variables.filter(v => !(v in variables));

        // Render template
        try {
            const rendered = await this.templateManagementService.renderTemplate(
                template.name,
                { variables }
            );

            result.subject = rendered.subject;
            result.html = rendered.html;
            result.text = rendered.text;
            result.message = rendered.message;
        } catch (error) {
            result.warnings.push((error as Error).message);
        }

        // Validate HTML (basic checks)
        if (result.html) {
            if (!result.html.includes('</body>')) {
                result.warnings.push('HTML body tag not closed');
            }
            if (result.html.includes('{{')) {
                result.warnings.push('Unreplaced placeholders found in HTML');
            }
        }

        // Validate subject
        if (result.subject && result.subject.includes('{{')) {
            result.warnings.push('Unreplaced placeholders found in subject');
        }

        // Validate message
        if (result.message && result.message.includes('{{')) {
            result.warnings.push('Unreplaced placeholders found in message');
        }

        logger.info('Template preview generated', {
            templateId,
            missingVariables: result.missingVariables.length,
            warnings: result.warnings.length,
        });

        return result;
    }

    /**
     * Send test message
     */
    async sendTest(options: ITemplateTestOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
        logger.info('Sending test message', {
            templateId: options.templateId,
            recipient: options.testRecipient,
        });

        try {
            const template = await this.templateManagementService.getTemplate(options.templateId);

            if (!template) {
                throw new Error('Template not found');
            }

            const rendered = await this.templateManagementService.renderTemplate(
                template.name,
                { variables: options.variables }
            );

            let result;

            // Send based on template type
            switch (template.type) {
                case TemplateType.EMAIL:
                    result = await notificationService.sendEmail({
                        to: options.testRecipient,
                        subject: `[TEST] ${rendered.subject}`,
                        html: rendered.html,
                        text: rendered.text,
                    });
                    break;

                case TemplateType.SMS:
                    result = await notificationService.sendSMS({
                        to: options.testRecipient,
                        message: `[TEST] ${rendered.message}`,
                    });
                    break;

                case TemplateType.WHATSAPP:
                    result = await notificationService.sendWhatsApp({
                        to: options.testRecipient,
                        type: 'text',
                        text: `[TEST] ${rendered.message}`,
                    });
                    break;

                default:
                    throw new Error(`Unsupported template type: ${template.type}`);
            }

            logger.info('Test message sent', {
                templateId: options.templateId,
                messageId: result.messageId,
            });

            return {
                success: true,
                messageId: result.messageId,
            };
        } catch (error) {
            logger.error('Test message failed', {
                templateId: options.templateId,
                error: (error as Error).message,
            });

            return {
                success: false,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Validate template
     */
    async validateTemplate(templateId: string): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }> {
        const template = await this.templateManagementService.getTemplate(templateId);

        if (!template) {
            return {
                isValid: false,
                errors: ['Template not found'],
                warnings: [],
            };
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Check required fields based on type
        switch (template.type) {
            case TemplateType.EMAIL:
                if (!template.subject || template.subject.trim() === '') {
                    errors.push('Subject is required for email templates');
                }
                if (!template.htmlBody && !template.textBody) {
                    errors.push('Either HTML or text body is required for email templates');
                }
                if (template.htmlBody && !template.textBody) {
                    warnings.push('Text body is recommended as fallback for HTML emails');
                }
                break;

            case TemplateType.SMS:
                if (!template.messageBody || template.messageBody.trim() === '') {
                    errors.push('Message body is required for SMS templates');
                }
                if (template.messageBody && template.messageBody.length > 160) {
                    warnings.push(`SMS message is ${template.messageBody.length} characters (>160, will be split into multiple messages)`);
                }
                break;

            case TemplateType.WHATSAPP:
                if (!template.whatsappTemplateName && !template.messageBody) {
                    errors.push('Either WhatsApp template name or message body is required');
                }
                break;
        }

        // Check variables
        if (template.variables.length === 0) {
            warnings.push('Template has no variables defined');
        }

        // Check for unescaped placeholders
        const content = [template.subject, template.htmlBody, template.textBody, template.messageBody]
            .filter(Boolean)
            .join(' ');

        const placeholderRegex = /{{(\w+)}}/g;
        const matches = content.match(placeholderRegex);

        if (matches) {
            const usedVariables = matches.map(m => m.replace(/[{}]/g, '').trim());
            const undefinedVars = usedVariables.filter(v => !template.variables.includes(v));

            if (undefinedVars.length > 0) {
                errors.push(`Undefined variables used: ${undefinedVars.join(', ')}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Compare template versions
     */
    async compareVersions(templateId1: string, templateId2: string): Promise<{
        differences: Array<{ field: string; version1: any; version2: any }>;
    }> {
        const t1 = await this.templateManagementService.getTemplate(templateId1);
        const t2 = await this.templateManagementService.getTemplate(templateId2);

        if (!t1 || !t2) {
            throw new Error('One or both templates not found');
        }

        const differences: Array<{ field: string; version1: any; version2: any }> = [];

        const fieldsToCompare = [
            'subject',
            'htmlBody',
            'textBody',
            'messageBody',
            'variables',
            'status',
        ];

        for (const field of fieldsToCompare) {
            if ((t1 as any)[field] !== (t2 as any)[field]) {
                differences.push({
                    field,
                    version1: (t1 as any)[field],
                    version2: (t2 as any)[field],
                });
            }
        }

        return { differences };
    }

    /**
     * Generate sample variables for template
     */
    async generateSampleVariables(templateId: string): Promise<Record<string, any>> {
        const template = await this.templateManagementService.getTemplate(templateId);

        if (!template) {
            throw new Error('Template not found');
        }

        const sampleData: Record<string, any> = {};

        for (const variable of template.variables) {
            // Generate sample data based on variable name
            switch (variable.toLowerCase()) {
                case 'name':
                case 'username':
                case 'customername':
                    sampleData[variable] = 'John Doe';
                    break;
                case 'email':
                    sampleData[variable] = 'john.doe@example.com';
                    break;
                case 'invoicenumber':
                case 'invoice_number':
                    sampleData[variable] = 'INV-2024-001';
                    break;
                case 'amount':
                    sampleData[variable] = '₹50,000';
                    break;
                case 'duedate':
                case 'due_date':
                    sampleData[variable] = new Date().toLocaleDateString();
                    break;
                case 'otp':
                case 'code':
                    sampleData[variable] = '123456';
                    break;
                case 'link':
                case 'url':
                    sampleData[variable] = 'https://example.com/action';
                    break;
                default:
                    sampleData[variable] = `[${variable}]`;
            }
        }

        return sampleData;
    }
}
