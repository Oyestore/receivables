import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PrivacyGatewayService {
    private readonly logger = new Logger(PrivacyGatewayService.name);

    /**
     * LAYER 1: PII Redaction
     * Replaces sensitive patterns with generic tokens before sending to AI.
     */
    sanitizePrompt(rawText: string): string {
        this.logger.debug('Sanitizing prompt for Privacy Compliance...');

        let sanitized = rawText;

        // 1. Redact GSTINs (Regex for Indian GST: 22AAAAA0000A1Z5)
        const gstinRegex = /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/g;
        sanitized = sanitized.replace(gstinRegex, '[REDACTED_GSTIN]');

        // 2. Redact Email Addresses
        const emailRegex = /[\w-\.]+@([\w-]+\.)+[\w-]{2,4}/g;
        sanitized = sanitized.replace(emailRegex, '[REDACTED_EMAIL]');

        // 3. Redact Phone Numbers (Simple 10-digit check)
        const phoneRegex = /\b\d{10}\b/g;
        sanitized = sanitized.replace(phoneRegex, '[REDACTED_PHONE]');

        // 4. Redact High Value Amounts (Optional strategy to hide exact revenue)
        // For now, we keep amounts to allow Math, but could replace with <HIGH_VALUE>

        return sanitized;
    }

    /**
     * LAYER 2: Re-Hydration (Optional)
     * If the AI returns [REDACTED_NAME], we put the real name back.
     * (Simple implementation: Pass-through for now)
     */
    desanitizeResponse(aiResponse: string): string {
        return aiResponse;
    }
}
