import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { BasePartnerAdapter } from './base-partner.adapter';
import { IFinancingPartnerPlugin, PartnerType, FinancingProduct } from '../interfaces/financing-partner-plugin.interface';

// Create a concrete implementation for testing
class TestPartnerAdapter extends BasePartnerAdapter implements IFinancingPartnerPlugin {
    readonly partnerId = 'test_partner';
    readonly partnerName = 'Test Partner';
    readonly partnerType = PartnerType.NBFC;
    readonly supportedProducts = [FinancingProduct.INVOICE_FINANCING];

    async checkEligibility() {
        return { eligible: true };
    }

    async submitApplication() {
        return { success: true, externalApplicationId: 'test-123' };
    }

    async getOffers() {
        return [];
    }

    async trackStatus() {
        return { externalApplicationId: 'test-123', status: 'pending' };
    }

    async handleWebhook() {
        return { processed: true };
    }
}

describe('BasePartnerAdapter', () => {
    let adapter: TestPartnerAdapter;
    let httpService: jest.Mocked<HttpService>;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const mockHttpService = {
            request: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn((key: string) => {
                const config: Record<string, any> = {
                    TEST_PARTNER_API_URL: 'https://api.testpartner.com',
                    TEST_PARTNER_WEBHOOK_SECRET: 'test-secret-key',
                };
                return config[key];
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TestPartnerAdapter,
                { provide: HttpService, useValue: mockHttpService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        adapter = module.get<TestPartnerAdapter>(TestPartnerAdapter);
        httpService = module.get(HttpService);
        configService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('HTTP Request Utilities', () => {
        describe('makeAuthenticatedRequest', () => {
            it('should make successful HTTP request', async () => {
                const mockResponse: Partial<AxiosResponse> = {
                    data: { success: true },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {} as any,
                };

                httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

                const result = await adapter['makeAuthenticatedRequest']({
                    method: 'POST',
                    url: '/test',
                    data: { test: 'data' },
                });

                expect(result.data).toEqual({ success: true });
            });

            it('should retry on failure', async () => {
                httpService.request
                    .mockReturnValueOnce(throwError(() => new Error('Network error')))
                    .mockReturnValueOnce(throwError(() => new Error('Network error')))
                    .mockReturnValueOnce(
                        of({ data: { success: true }, status: 200 } as AxiosResponse),
                    );

                const result = await adapter['makeRequestWithRetry'](
                    () => adapter['makeAuthenticatedRequest']({ method: 'GET', url: '/test' }),
                    3,
                );

                expect(result.data).toEqual({ success: true });
                expect(httpService.request).toHaveBeenCalledTimes(3);
            });

            it('should throw after max retries', async () => {
                httpService.request.mockReturnValue(
                    throwError(() => new Error('Persistent error')),
                );

                await expect(
                    adapter['makeRequestWithRetry'](
                        () => adapter['makeAuthenticatedRequest']({ method: 'GET', url: '/test' }),
                        3,
                    ),
                ).rejects.toThrow('Persistent error');

                expect(httpService.request).toHaveBeenCalledTimes(3);
            });

            it('should handle timeout errors', async () => {
                httpService.request.mockReturnValue(
                    throwError(() => ({ code: 'ETIMEDOUT' })),
                );

                await expect(
                    adapter['makeAuthenticatedRequest']({ method: 'GET', url: '/test' }),
                ).rejects.toThrow();
            });
        });
    });

    describe('Webhook Validation', () => {
        it('should validate correct webhook signature', () => {
            const payload = { event: 'test', data: 'value' };
            const secret = 'test-secret-key';

            // Create valid signature
            const crypto = require('crypto');
            const validSignature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            const result = adapter['validateWebhookSignature'](payload, validSignature, secret);

            expect(result).toBe(true);
        });

        it('should reject invalid webhook signature', () => {
            const payload = { event: 'test', data: 'value' };
            const invalidSignature = 'invalid-signature';
            const secret = 'test-secret-key';

            const result = adapter['validateWebhookSignature'](payload, invalidSignature, secret);

            expect(result).toBe(false);
        });

        it('should reject tampered payload', () => {
            const payload = { event: 'test', data: 'value' };
            const secret = 'test-secret-key';

            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            // Tamper with payload
            const tamperedPayload = { ...payload, data: 'tampered' };

            const result = adapter['validateWebhookSignature'](tamperedPayload, signature, secret);

            expect(result).toBe(false);
        });
    });

    describe('Financial Calculations', () => {
        describe('calculateEffectiveAPR', () => {
            it('should calculate effective APR with processing fee', () => {
                const principal = 500000;
                const nominalRate = 16; // 16%
                const processingFee = 10000; // ₹10k (2%)
                const tenure = 12;

                const effectiveAPR = adapter['calculateEffectiveAPR'](
                    principal,
                    nominalRate,
                    processingFee,
                    tenure,
                );

                // Effective APR should be higher than nominal due to fees
                expect(effectiveAPR).toBeGreaterThan(nominalRate);
                expect(effectiveAPR).toBeLessThan(25); // Reasonable upper bound
            });

            it('should equal nominal APR when no processing fee', () => {
                const principal = 500000;
                const nominalRate = 16;
                const processingFee = 0;
                const tenure = 12;

                const effectiveAPR = adapter['calculateEffectiveAPR'](
                    principal,
                    nominalRate,
                    processingFee,
                    tenure,
                );

                // Should be very close to nominal when no fees
                expect(Math.abs(effectiveAPR - nominalRate)).toBeLessThan(0.5);
            });

            it('should handle high processing fees', () => {
                const principal = 500000;
                const nominalRate = 16;
                const processingFee = 50000; // 10% fee
                const tenure = 12;

                const effectiveAPR = adapter['calculateEffectiveAPR'](
                    principal,
                    nominalRate,
                    processingFee,
                    tenure,
                );

                expect(effectiveAPR).toBeGreaterThan(nominalRate + 5);
            });
        });

        describe('calculateEMI', () => {
            it('should calculate correct EMI', () => {
                const principal = 500000;
                const annualRate = 16; // 16% per annum
                const tenure = 12; // 12 months

                const emi = adapter['calculateEMI'](principal, annualRate, tenure);

                // Rough calculation: ~45k per month
                expect(emi).toBeGreaterThan(40000);
                expect(emi).toBeLessThan(50000);

                // Total repayment should be principal + interest
                const totalRepayment = emi * tenure;
                expect(totalRepayment).toBeGreaterThan(principal);
            });

            it('should handle zero interest rate', () => {
                const principal = 500000;
                const annualRate = 0;
                const tenure = 12;

                const emi = adapter['calculateEMI'](principal, annualRate, tenure);

                // With 0% interest, EMI = principal/tenure
                expect(emi).toBeCloseTo(principal / tenure, 0);
            });

            it('should handle short tenure', () => {
                const principal = 500000;
                const annualRate = 16;
                const tenure = 1;

                const emi = adapter['calculateEMI'](principal, annualRate, tenure);

                // For 1 month, EMI ~= principal + 1 month interest
                expect(emi).toBeGreaterThan(principal);
            });

            it('should handle long tenure', () => {
                const principal = 500000;
                const annualRate = 16;
                const tenure = 60; // 5 years

                const emi = adapter['calculateEMI'](principal, annualRate, tenure);

                // Longer tenure = lower EMI
                const emi12Months = adapter['calculateEMI'](principal, annualRate, 12);
                expect(emi).toBeLessThan(emi12Months);
            });
        });

        describe('generateRepaymentSchedule', () => {
            it('should generate complete repayment schedule', () => {
                const principal = 500000;
                const annualRate = 16;
                const tenure = 12;
                const emi = adapter['calculateEMI'](principal, annualRate, tenure);

                const schedule = adapter['generateRepaymentSchedule'](
                    principal,
                    annualRate,
                    tenure,
                    emi,
                );

                expect(schedule).toHaveLength(tenure);

                // First payment
                expect(schedule[0].month).toBe(1);
                expect(schedule[0].emi).toBe(emi);
                expect(schedule[0].principal).toBeGreaterThan(0);
                expect(schedule[0].interest).toBeGreaterThan(0);
                expect(schedule[0].balance).toBeLessThan(principal);

                // Last payment
                expect(schedule[tenure - 1].month).toBe(tenure);
                expect(schedule[tenure - 1].balance).toBeCloseTo(0, 0);

                // Total principal paid should equal original principal
                const totalPrincipal = schedule.reduce((sum, payment) => sum + payment.principal, 0);
                expect(totalPrincipal).toBeCloseTo(principal, 0);
            });

            it('should have decreasing interest over time', () => {
                const principal = 500000;
                const annualRate = 16;
                const tenure = 12;
                const emi = adapter['calculateEMI'](principal, annualRate, tenure);

                const schedule = adapter['generateRepaymentSchedule'](
                    principal,
                    annualRate,
                    tenure,
                    emi,
                );

                // Interest should decrease month over month
                for (let i = 1; i < schedule.length; i++) {
                    expect(schedule[i].interest).toBeLessThan(schedule[i - 1].interest);
                }
            });

            it('should have increasing principal over time', () => {
                const principal = 500000;
                const annualRate = 16;
                const tenure = 12;
                const emi = adapter['calculateEMI'](principal, annualRate, tenure);

                const schedule = adapter['generateRepaymentSchedule'](
                    principal,
                    annualRate,
                    tenure,
                    emi,
                );

                // Principal component should increase month over month
                for (let i = 1; i < schedule.length; i++) {
                    expect(schedule[i].principal).toBeGreaterThan(schedule[i - 1].principal);
                }
            });
        });
    });

    describe('Error Transformation', () => {
        it('should transform HTTP errors to standard format', () => {
            const httpError = {
                response: {
                    status: 400,
                    data: { error: 'Bad Request' },
                },
            };

            const transformed = adapter['transformError'](httpError);

            expect(transformed.message).toContain('Bad Request');
        });

        it('should handle network errors', () => {
            const networkError = {
                code: 'ECONNREFUSED',
                message: 'Connection refused',
            };

            const transformed = adapter['transformError'](networkError);

            expect(transformed.message).toContain('Network error');
        });

        it('should handle timeout errors', () => {
            const timeoutError = {
                code: 'ETIMEDOUT',
                message: 'Timeout',
            };

            const transformed = adapter['transformError'](timeoutError);

            expect(transformed.message).toContain('Timeout');
        });
    });

    describe('Utility Methods', () => {
        it('should sleep for specified duration', async () => {
            const start = Date.now();
            await adapter['sleep'](100);
            const duration = Date.now() - start;

            expect(duration).toBeGreaterThanOrEqual(90); // Allow small variance
            expect(duration).toBeLessThan(150);
        });

        it('should get config value with default', () => {
            const value = adapter['getConfigValue']('NONEXISTENT_KEY', 'default-value');

            expect(value).toBe('default-value');
        });
    });
});
