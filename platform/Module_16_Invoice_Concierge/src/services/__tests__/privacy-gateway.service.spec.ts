import { Test, TestingModule } from '@nestjs/testing';
import { PrivacyGatewayService } from '../privacy-gateway.service';

describe('PrivacyGatewayService', () => {
    let service: PrivacyGatewayService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PrivacyGatewayService],
        }).compile();

        service = module.get<PrivacyGatewayService>(PrivacyGatewayService);
    });

    describe('sanitizePrompt - GSTIN redaction', () => {
        it('should redact valid GSTIN numbers', () => {
            const input = 'My GSTIN is 29ABCDE1234F1Z5 and invoice number is INV-001';
            const result = service.sanitizePrompt(input);

            expect(result).toContain('[REDACTED_GSTIN]');
            expect(result).not.toContain('29ABCDE1234F1Z5');
            expect(result).toContain('INV-001'); // Non-GSTIN preserved
        });

        it('should redact multiple GSTINs in same text', () => {
            const input = 'GSTINs: 27AAAAA1234B1Z9 and 22BBBBB5678C1Z2';
            const result = service.sanitizePrompt(input);

            const matches = result.match(/\[REDACTED_GSTIN\]/g);
            expect(matches?.length).toBe(2);
        });

        it('should not redact invalid GSTIN patterns', () => {
            const input = 'Invalid: 123ABCDE1234F1Z5 (starts with 3 digits)';
            const result = service.sanitizePrompt(input);

            expect(result).toBe(input); // Unchanged
        });
    });

    describe('sanitizePrompt - Email redaction', () => {
        it('should redact email addresses', () => {
            const input = 'Contact me at john.doe@example.com for details';
            const result = service.sanitizePrompt(input);

            expect(result).toContain('[REDACTED_EMAIL]');
            expect(result).not.toContain('john.doe@example.com');
        });

        it('should redact multiple emails', () => {
            const input = 'Emails: admin@company.com and support@vendor.in';
            const result = service.sanitizePrompt(input);

            const matches = result.match(/\[REDACTED_EMAIL\]/g);
            expect(matches?.length).toBe(2);
        });

        it('should handle emails with various TLDs', () => {
            const emails = [
                'user@domain.com',
                'admin@company.co.in',
                'support@example.org',
            ];

            emails.forEach(email => {
                const result = service.sanitizePrompt(`Email: ${email}`);
                expect(result).toContain('[REDACTED_EMAIL]');
                expect(result).not.toContain(email);
            });
        });
    });

    describe('sanitizePrompt - Phone redaction', () => {
        it('should redact 10-digit phone numbers', () => {
            const input = 'Call me at 9876543210 today';
            const result = service.sanitizePrompt(input);

            expect(result).toContain('[REDACTED_PHONE]');
            expect(result).not.toContain('9876543210');
        });

        it('should redact multiple phone numbers', () => {
            const input = 'Phones: 9876543210 and 8765432109';
            const result = service.sanitizePrompt(input);

            const matches = result.match(/\[REDACTED_PHONE\]/g);
            expect(matches?.length).toBe(2);
        });

        it('should not redact numbers with more than 10 digits', () => {
            const input = 'Invoice amount: 12345678901';
            const result = service.sanitizePrompt(input);

            expect(result).toBe(input); // 11 digits, not a phone
        });

        it('should not redact numbers with less than 10 digits', () => {
            const input = 'Order ID: 123456789';
            const result = service.sanitizePrompt(input);

            expect(result).toBe(input); // 9 digits, not a phone
        });
    });

    describe('sanitizePrompt - Combined PII', () => {
        it('should redact all PII types in single text', () => {
            const input = `
                GSTIN: 29ABCDE1234F1Z5
                Email: john@example.com
                Phone: 9876543210
                Invoice: INV-001
            `;
            const result = service.sanitizePrompt(input);

            expect(result).toContain('[REDACTED_GSTIN]');
            expect(result).toContain('[REDACTED_EMAIL]');
            expect(result).toContain('[REDACTED_PHONE]');
            expect(result).toContain('INV-001'); // Non-PII preserved
            expect(result).not.toContain('29ABCDE1234F1Z5');
            expect(result).not.toContain('john@example.com');
            expect(result).not.toContain('9876543210');
        });

        it('should preserve non-PII data while redacting PII', () => {
            const input = 'Amount ₹50,000 from john@example.com';
            const result = service.sanitizePrompt(input);

            expect(result).toContain('₹50,000');
            expect(result).toContain('[REDACTED_EMAIL]');
        });
    });

    describe('sanitizePrompt - Edge cases', () => {
        it('should handle empty string', () => {
            const result = service.sanitizePrompt('');
            expect(result).toBe('');
        });

        it('should handle text with no PII', () => {
            const input = 'This is a normal message about invoice processing';
            const result = service.sanitizePrompt(input);
            expect(result).toBe(input);
        });

        it('should handle special characters', () => {
            const input = 'GSTIN: 29ABCDE1234F1Z5!@#$%';
            const result = service.sanitizePrompt(input);
            expect(result).toContain('[REDACTED_GSTIN]');
            expect(result).toContain('!@#$%');
        });

        it('should handle unicode characters', () => {
            const input = 'नमस्ते! Email: user@example.com मित्र';
            const result = service.sanitizePrompt(input);
            expect(result).toContain('नमस्ते');
            expect(result).toContain('[REDACTED_EMAIL]');
            expect(result).toContain('मित्र');
        });
    });

    describe('desanitizeResponse', () => {
        it('should return response unchanged (pass-through)', () => {
            const input = 'AI response with [REDACTED_EMAIL]';
            const result = service.desanitizeResponse(input);
            expect(result).toBe(input);
        });

        it('should handle empty string', () => {
            const result = service.desanitizeResponse('');
            expect(result).toBe('');
        });
    });

    describe('privacy compliance', () => {
        it('should prevent PII leakage to AI systems', () => {
            const sensitivePrompt = `
                Customer GSTIN: 27AAAAA1234B1Z9
                Contact: admin@company.com, 9876543210
                Please analyze this invoice data
            `;

            const sanitized = service.sanitizePrompt(sensitivePrompt);

            // Verify no actual PII present
            expect(sanitized).not.toMatch(/\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/);
            expect(sanitized).not.toMatch(/[\w-\.]+@([\w-]+\.)+[\w-]{2,4}/);
            expect(sanitized).not.toMatch(/\b\d{10}\b/);

            // Verify redaction tokens present
            expect(sanitized).toContain('[REDACTED_GSTIN]');
            expect(sanitized).toContain('[REDACTED_EMAIL]');
            expect(sanitized).toContain('[REDACTED_PHONE]');
        });
    });
});
