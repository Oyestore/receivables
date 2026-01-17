
import { Test, TestingModule } from '@nestjs/testing';
import { PrivacyGatewayService } from '../../src/services/privacy-gateway.service';

/**
 * Deterministic Harness for Privacy Gateway (Module 16)
 * 
 * Scenarios:
 * 1. PII Redaction (GSTIN, Email, Phone)
 * 2. Passthrough behavior
 */
describe('Privacy Gateway Harness', () => {
    let service: PrivacyGatewayService;

    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            providers: [PrivacyGatewayService],
        }).compile();

        service = module.get<PrivacyGatewayService>(PrivacyGatewayService);
    });

    afterAll(async () => {
        if (module) {
            await module.close();
        }
    });

    it('should redact GSTINs', () => {
        const input = "Supplier GSTIN is 22AAAAA0000A1Z5 please process.";
        const output = service.sanitizePrompt(input);
        
        expect(output).toContain('[REDACTED_GSTIN]');
        expect(output).not.toContain('22AAAAA0000A1Z5');
    });

    it('should redact Emails', () => {
        const input = "Contact user@example.com for details.";
        const output = service.sanitizePrompt(input);
        
        expect(output).toContain('[REDACTED_EMAIL]');
        expect(output).not.toContain('user@example.com');
    });

    it('should redact Phone Numbers', () => {
        const input = "Call me at 9876543210 immediately.";
        const output = service.sanitizePrompt(input);
        
        expect(output).toContain('[REDACTED_PHONE]');
        expect(output).not.toContain('9876543210');
    });

    it('should handle mixed content', () => {
        const input = "GSTIN 22AAAAA0000A1Z5 and email admin@sme.com";
        const output = service.sanitizePrompt(input);
        
        expect(output).toContain('[REDACTED_GSTIN]');
        expect(output).toContain('[REDACTED_EMAIL]');
    });

    it('should pass through safe text', () => {
        const input = "Invoice amount is 5000 USD";
        const output = service.sanitizePrompt(input);
        
        expect(output).toBe(input);
    });
});
