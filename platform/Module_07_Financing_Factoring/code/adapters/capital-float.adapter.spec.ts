import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CapitalFloatAdapter } from './capital-float.adapter';
import { BusinessProfile, StandardApplication, FinancingRequest, FinancingPurpose } from '../interfaces/financing-partner-plugin.interface';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('CapitalFloatAdapter', () => {
    let adapter: CapitalFloatAdapter;
    let httpService: jest.Mocked<HttpService>;
    let configService: jest.Mocked<ConfigService>;

    const mockBusinessProfile: BusinessProfile = {
        businessName: 'Test Corp',
        pan: 'ABCDE1234F',
        gstin: '27ABCDE1234F1Z5',
        yearsInBusiness: 2,
        annualRevenue: 8000000,
        industry: 'Technology',
        creditScore: 760,
    };

    beforeEach(async () => {
        const mockHttpService = {
            request: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn((key: string, defaultValue?: any) => {
                const config: Record<string, any> = {
                    CAPITAL_FLOAT_API_URL: 'https://api.capitalfloat.com/v2',
                    CAPITAL_FLOAT_API_KEY: 'test-api-key',
                    CAPITAL_FLOAT_CLIENT_ID: 'test-client-id',
                    CAPITAL_FLOAT_WEBHOOK_SECRET: 'test-webhook-secret',
                    APP_URL: 'https://test.example.com',
                };
                return config[key] || defaultValue;
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CapitalFloatAdapter,
                { provide: HttpService, useValue: mockHttpService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        adapter = module.get<CapitalFloatAdapter>(CapitalFloatAdapter);
        httpService = module.get(HttpService);
        configService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Metadata', () => {
        it('should have correct partner metadata', () => {
            expect(adapter.partnerId).toBe('capital_float');
            expect(adapter.partnerName).toBe('Capital Float');
            expect(adapter.partnerType).toBe('nbfc');
            expect(adapter.supportedProducts).toContain('invoice_financing');
            expect(adapter.supportedProducts).toContain('working_capital');
            expect(adapter.supportedProducts).toContain('credit_line'); // Unique to Capital Float
        });

        it('should support credit line product (not in LendingKart)', () => {
            expect(adapter.supportedProducts).toContain('credit_line');
        });
    });

    describe('checkEligibility', () => {
        it('should return eligible for qualifying business', async () => {
            const result = await adapter.checkEligibility(mockBusinessProfile);

            expect(result.eligible).toBe(true);
            expect(result.minimumAmount).toBe(100000);
            expect(result.maximumAmount).toBeGreaterThan(0);
            expect(result.estimatedRate).toBeGreaterThan(0);
        });

        it('should have LOWER minimum years requirement than LendingKart', async () => {
            const profile = { ...mockBusinessProfile, yearsInBusiness: 1.5 };

            const result = await adapter.checkEligibility(profile);

            // Capital Float: 1+ years (vs LendingKart: 2+ years)
            expect(result.eligible).toBe(true);
        });

        it('should return not eligible for very new businesses', async () => {
            const profile = { ...mockBusinessProfile, yearsInBusiness: 0.5 };

            const result = await adapter.checkEligibility(profile);

            expect(result.eligible).toBe(false);
            expect(result.reason).toContain('1+ year');
        });

        it('should have LOWER minimum revenue than LendingKart', async () => {
            const profile = { ...mockBusinessProfile, annualRevenue: 7000000 };

            const result = await adapter.checkEligibility(profile);

            // Capital Float: ₹5L+ (vs LendingKart: ₹10L+)
            expect(result.eligible).toBe(true);
        });

        it('should return not eligible for low revenue', async () => {
            const profile = { ...mockBusinessProfile, annualRevenue: 300000 };

            const result = await adapter.checkEligibility(profile);

            expect(result.eligible).toBe(false);
            expect(result.reason).toContain('5L+');
        });

        it('should calculate HIGHER max amount than LendingKart', async () => {
            const result = await adapter.checkEligibility(mockBusinessProfile);

            // Max should be 30% of annual revenue (vs LendingKart: 25%), capped at ₹10Cr (vs ₹5Cr)
            const expectedMax = Math.min(mockBusinessProfile.annualRevenue * 0.30, 100000000);
            expect(result.maximumAmount).toBe(expectedMax);
        });

        it('should cap max amount at 10 Cr', async () => {
            const highRevenueProfile = {
                ...mockBusinessProfile,
                annualRevenue: 500000000, // ₹50Cr revenue
            };

            const result = await adapter.checkEligibility(highRevenueProfile);

            expect(result.maximumAmount).toBe(100000000); // ₹10Cr cap
        });

        it('should give BETTER rates for high credit scores', async () => {
            const highScore = { ...mockBusinessProfile, creditScore: 780 };
            const lowScore = { ...mockBusinessProfile, creditScore: 650 };

            const highResult = await adapter.checkEligibility(highScore);
            const lowResult = await adapter.checkEligibility(lowScore);

            // Capital Float range: 12-20% (vs LendingKart: 14-22%)
            expect(highResult.estimatedRate).toBeLessThan(lowResult.estimatedRate!);
            expect(highResult.estimatedRate).toBeGreaterThanOrEqual(12);
            expect(highResult.estimatedRate).toBeLessThanOrEqual(20);
        });
    });

    describe('submitApplication', () => {
        const mockApplication: StandardApplication = {
            applicationId: 'app-123',
            tenantId: 'tenant-456',
            userId: 'user-789',
            businessProfile: mockBusinessProfile,
            financingRequest: {
                amount: 500000,
                purpose: FinancingPurpose.CREDIT_LINE, // Testing credit line
                urgency: 'flexible',
                tenure: 12,
            },
            documents: {
                bankStatements: ['doc1.pdf'],
                gstReturns: ['doc2.pdf'],
            },
        };

        it('should submit application successfully', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: {
                    client_application_id: 'cf-app-456',
                    status: 'submitted',
                    credit_line_limit: 500000,
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            const result = await adapter.submitApplication(mockApplication);

            expect(result.success).toBe(true);
            expect(result.externalApplicationId).toBe('cf-app-456');
            expect(result.status).toBe('submitted');
        });

        it('should map standard application to Capital Float format', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { client_application_id: 'cf-123' },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            await adapter.submitApplication(mockApplication);

            const requestCall = httpService.request.mock.calls[0][0];
            expect(requestCall.data.business).toBeDefined();
            expect(requestCall.data.business.pan).toBe(mockBusinessProfile.pan);
            expect(requestCall.data.financing).toBeDefined();
            expect(requestCall.data.financing.amount).toBe(500000);
        });

        it('should handle credit line applications differently', async () => {
            const creditLineApp = {
                ...mockApplication,
                financingRequest: {
                    ...mockApplication.financingRequest,
                    purpose: FinancingPurpose.CREDIT_LINE,
                },
            };

            const mockResponse: Partial<AxiosResponse> = {
                data: {
                    client_application_id: 'cf-456',
                    credit_line_limit: 1000000,
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            await adapter.submitApplication(creditLineApp);

            const requestCall = httpService.request.mock.calls[0][0];
            expect(requestCall.data.financing.product_type).toBe('credit_line');
        });

        it('should handle API errors', async () => {
            httpService.request.mockReturnValue(
                throwError(() => new Error('API Error')),
            );

            const result = await adapter.submitApplication(mockApplication);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Failed');
        });
    });

    describe('getOffers', () => {
        const mockRequest: FinancingRequest = {
            amount: 500000,
            purpose: FinancingPurpose.INVOICE_FINANCING,
            urgency: 'flexible',
            tenure: 12,
            businessProfile: mockBusinessProfile,
        };

        it('should retrieve invoice financing offers', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: {
                    offers: [
                        {
                            offer_id: 'cf-offer-1',
                            loan_amount: 500000,
                            interest_rate: 14.5,
                            processing_fee: 7500,
                            emi: 44000,
                            tenure_months: 12,
                            total_repayment: 528000,
                            disbursal_time: '24 hours',
                        },
                    ],
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            const offers = await adapter.getOffers(mockRequest);

            expect(offers).toHaveLength(1);
            expect(offers[0].offerId).toBe('cf-offer-1');
            expect(offers[0].amount).toBe(500000);
            expect(offers[0].interestRate).toBe(14.5);
        });

        it('should retrieve credit line offers with revolving terms', async () => {
            const creditLineRequest = {
                ...mockRequest,
                purpose: FinancingPurpose.CREDIT_LINE,
            };

            const mockResponse: Partial<AxiosResponse> = {
                data: {
                    offers: [
                        {
                            offer_id: 'cf-cl-1',
                            credit_line_limit: 1000000,
                            interest_rate: 16,
                            processing_fee: 5000,
                            drawdown_fee: 2,
                            renewal_fee: 1000,
                            tenor_days: 365,
                            disbursal_time: '48 hours',
                        },
                    ],
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            const offers = await adapter.getOffers(creditLineRequest);

            expect(offers).toHaveLength(1);
            expect(offers[0].offerId).toBe('cf-cl-1');
            expect(offers[0].amount).toBe(1000000);
        });

        it('should return empty array on API failure', async () => {
            httpService.request.mockReturnValue(
                throwError(() => new Error('API Error')),
            );

            const offers = await adapter.getOffers(mockRequest);

            expect(offers).toHaveLength(0);
        });

        it('should map financing purpose correctly', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { offers: [] },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            await adapter.getOffers(mockRequest);

            const requestCall = httpService.request.mock.calls[0][0];
            expect(requestCall.data.product_type).toBe('invoice_financing');
        });
    });

    describe('trackStatus', () => {
        it('should track application status', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: {
                    client_application_id: 'cf-app-456',
                    status: 'approved',
                    approved_amount: 500000,
                    credit_line_limit: 1000000,
                    interest_rate: 14.5,
                    updated_at: new Date().toISOString(),
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            const status = await adapter.trackStatus('cf-app-456');

            expect(status.externalApplicationId).toBe('cf-app-456');
            expect(status.status).toBe('approved');
            expect(status.approvedAmount).toBe(500000);
        });

        it('should map Capital Float status to standard status', async () => {
            const statuses = [
                { cf: 'submitted', standard: 'pending' },
                { cf: 'under_review', standard: 'under_review' },
                { cf: 'approved', standard: 'approved' },
                { cf: 'rejected', standard: 'rejected' },
                { cf: 'disbursed', standard: 'disbursed' },
                { cf: 'active', standard: 'active' }, // For credit lines
            ];

            for (const { cf, standard } of statuses) {
                const mockResponse: Partial<AxiosResponse> = {
                    data: { client_application_id: 'test', status: cf },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {} as any,
                };

                httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

                const status = await adapter.trackStatus('test');
                expect(status.status).toBe(standard);
            }
        });

        it('should include credit line specific details', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: {
                    client_application_id: 'cf-cl-123',
                    status: 'active',
                    credit_line_limit: 1000000,
                    utilized_amount: 300000,
                    available_amount: 700000,
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            const status = await adapter.trackStatus('cf-cl-123');

            expect(status.status).toBe('active');
            expect(status.metadata?.creditLineLimit).toBe(1000000);
        });
    });

    describe('handleWebhook', () => {
        const mockPayload = {
            event: 'application_approved',
            client_application_id: 'cf-app-456',
            status: 'approved',
        };

        it('should process valid webhook', async () => {
            const signature = 'valid-signature';

            const result = await adapter.handleWebhook(mockPayload, signature);

            expect(result.processed).toBe(true);
            expect(result.applicationId).toBe('cf-app-456');
        });

        it('should reject invalid signature', async () => {
            const signature = 'invalid-signature';

            const result = await adapter.handleWebhook(mockPayload, signature);

            expect(result.processed).toBe(false);
            expect(result.message).toContain('Invalid signature');
        });

        it('should handle credit line drawdown webhooks', async () => {
            const drawdownPayload = {
                event: 'credit_line_drawdown',
                client_application_id: 'cf-cl-123',
                drawdown_amount: 250000,
                remaining_limit: 750000,
            };

            const signature = 'valid-signature';

            const result = await adapter.handleWebhook(drawdownPayload, signature);

            expect(result.processed).toBeDefined();
        });
    });

    describe('Authentication', () => {
        it('should include correct auth headers', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { offers: [] },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            await adapter.getOffers({
                amount: 500000,
                purpose: FinancingPurpose.WORKING_CAPITAL,
                urgency: 'flexible',
            });

            const requestCall = httpService.request.mock.calls[0][0];
            expect(requestCall.headers['Authorization']).toBe('Bearer test-api-key');
            expect(requestCall.headers['X-Client-ID']).toBe('test-client-id');
        });
    });

    describe('Error Handling', () => {
        it('should handle network timeout', async () => {
            httpService.request.mockReturnValue(
                throwError(() => ({ code: 'ETIMEDOUT', message: 'Timeout' })),
            );

            const request: FinancingRequest = {
                amount: 500000,
                purpose: FinancingPurpose.WORKING_CAPITAL,
                urgency: 'flexible',
            };

            const offers = await adapter.getOffers(request);

            expect(offers).toHaveLength(0);
        });

        it('should handle 500 errors', async () => {
            httpService.request.mockReturnValue(
                throwError(() => ({
                    response: { status: 500, data: { error: 'Internal Server Error' } },
                })),
            );

            const application: StandardApplication = {
                applicationId: 'app-123',
                tenantId: 'tenant-456',
                userId: 'user-789',
                businessProfile: mockBusinessProfile,
                financingRequest: {
                    amount: 500000,
                    purpose: FinancingPurpose.WORKING_CAPITAL,
                    urgency: 'flexible',
                },
                documents: {},
            };

            const result = await adapter.submitApplication(application);

            expect(result.success).toBe(false);
        });

        it('should handle rate limit errors', async () => {
            httpService.request.mockReturnValue(
                throwError(() => ({
                    response: { status: 429, data: { error: 'Rate limit exceeded' } },
                })),
            );

            const request: FinancingRequest = {
                amount: 500000,
                purpose: FinancingPurpose.INVOICE_FINANCING,
                urgency: 'flexible',
            };

            const offers = await adapter.getOffers(request);

            expect(offers).toHaveLength(0);
        });
    });

    describe('Capital Float Specific Features', () => {
        it('should support revolving credit lines', async () => {
            const creditLineRequest: FinancingRequest = {
                amount: 1000000,
                purpose: FinancingPurpose.CREDIT_LINE,
                urgency: 'flexible',
                businessProfile: mockBusinessProfile,
            };

            const mockResponse: Partial<AxiosResponse> = {
                data: {
                    offers: [
                        {
                            offer_id: 'cf-cl-1',
                            credit_line_limit: 1000000,
                            interest_rate: 15,
                            revolving: true,
                        },
                    ],
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            const offers = await adapter.getOffers(creditLineRequest);

            expect(offers).toHaveLength(1);
            expect(offers[0].conditions).toContain('Revolving credit line');
        });
    });
});
