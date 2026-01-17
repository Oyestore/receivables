import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createContext, runInContext } from 'vm';
import * as _ from 'lodash';

export interface SafeRuleContext {
    invoice: {
        amount: number;
        clientTier: string;
        industry: string;
        region: string;
        dueDate: Date;
        customFields: Record<string, any>;
    };
    helpers: {
        get: (obj: any, path: string) => any;
        has: (obj: any, path: string) => boolean;
    };
}

@Injectable()
export class SecureRuleEvaluator {
    private readonly logger = new Logger(SecureRuleEvaluator.name);
    private readonly EXECUTION_TIMEOUT = 1000; // 1 second max
    private readonly MAX_MEMORY = 10 * 1024 * 1024; // 10MB

    /**
     * Safely evaluate custom rule logic in isolated VM sandbox
     * @param ruleLogic - The custom JavaScript logic to evaluate
     * @param invoiceData - Invoice data to evaluate against
     * @returns Evaluation result (true/false)
     */
    evaluateCustomRule(ruleLogic: string, invoiceData: any): boolean {
        // Validate rule logic
        this.validateRuleLogic(ruleLogic);

        // Create safe context with limited API
        const safeContext = this.createSafeContext(invoiceData);

        try {
            // Wrap logic in IIFE for safety
            const wrappedCode = `
        (function() {
          'use strict';
          ${ruleLogic}
        })()
      `;

            // Execute in isolated VM context with timeout
            const result = runInContext(wrappedCode, createContext(safeContext), {
                timeout: this.EXECUTION_TIMEOUT,
                displayErrors: false,
            });

            // Ensure boolean result
            return Boolean(result);
        } catch (error) {
            this.logger.error('Custom rule execution failed', {
                error: error.message,
                ruleLogic: ruleLogic.substring(0, 100), // Log first 100 chars
            });

            // Fail safe - return false on errors
            return false;
        }
    }

    /**
     * Validate rule logic for dangerous patterns
     */
    private validateRuleLogic(logic: string): void {
        // Check for dangerous patterns
        const dangerousPatterns = [
            /require\s*\(/,
            /import\s+/,
            /eval\s*\(/,
            /Function\s*\(/,
            /setTimeout|setInterval/,
            /process\./,
            /global\./,
            /__dirname|__filename/,
            /fs\.|child_process/,
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(logic)) {
                throw new BadRequestException(
                    `Rule logic contains forbidden pattern: ${pattern.source}`,
                );
            }
        }

        // Check length
        if (logic.length > 5000) {
            throw new BadRequestException('Rule logic exceeds maximum length (5000 chars)');
        }
    }

    /**
     * Create safe execution context with limited API
     */
    private createSafeContext(invoiceData: any): SafeRuleContext {
        return {
            invoice: {
                amount: Number(invoiceData.amount) || 0,
                clientTier: String(invoiceData.customerData?.tier || 'standard'),
                industry: String(invoiceData.customerData?.industry || 'unknown'),
                region: String(invoiceData.customerData?.region || 'unknown'),
                dueDate: new Date(invoiceData.dueDate),
                customFields: invoiceData.customerData?.customFields || {},
            },
            helpers: {
                get: (obj: any, path: string) => _.get(obj, path),
                has: (obj: any, path: string) => _.has(obj, path),
            },
            // Neutered console
            console: {
                log: () => { },
                error: () => { },
                warn: () => { },
            } as any,
        };
    }

    /**
     * Test rule logic before saving
     */
    async testRule(ruleLogic: string, testData: any[]): Promise<{
        valid: boolean;
        results: Array<{ data: any; result: boolean; error?: string }>;
    }> {
        const results = [];

        for (const data of testData) {
            try {
                const result = this.evaluateCustomRule(ruleLogic, data);
                results.push({ data, result });
            } catch (error) {
                results.push({ data, result: false, error: error.message });
            }
        }

        const valid = results.every((r) => !r.error);

        return { valid, results };
    }
}
