import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { LendingKartAdapter } from './lendingkart.adapter';
import { BusinessProfile, StandardApplication, FinancingRequest, FinancingPurpose } from '../interfaces/financing-partner-plugin.interface';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('LendingKartAdapter', () => {
    let adapter: LendingKartAdapter;
    let httpService: jest.Mocked<HttpService>;
    let configService: jest.Mocked<ConfigService>;

    const mockBusinessProfile: BusinessProfile = {
        businessName: 'Test Corp',
        pan: 'ABCDE1234F',
        gstin: '27ABCDE1234F1Z5',
        yearsInBusiness: 3,
        annualRevenue: 10000000,
        industry: 'Technology',
        creditScore: 750,
    };

    beforeEach(async () => {
        const mockHttpService = {
            request: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn((key: string, defaultValue?: any) => {
                const config: Record<string, any> = {
                    LENDINGKART_API_URL: 'https://api.lendingkart.com/v1',
                    LENDINGKART_API_KEY: 'test-api-key',
                    LENDINGKART_PARTNER_ID: 'test-partner-id',
                    LENDINGKART_WEBHOOK_SECRET: 'test-webhook-secret',
                    APP_URL: 'https://test.example.com',
                };
                return config[key] || defaultValue;
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LendingKartAdapter,
                { provide: HttpService, useValue: mockHttpService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        adapter = module.get<LendingKartAdapter>(LendingKartAdapter);
        httpService = module.get(HttpService);
        configService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Metadata', () => {
        it('should have correct partner metadata', () => {
            expect(adapter.partnerId).toBe('lendingkart');
            expect(adapter.partnerName).toBe('LendingKart');
            expect(adapter.partnerType).toBe('nbfc');
            expect(adapter.supportedProducts).toContain('invoice_financing');
            expect(adapter.supportedProducts).toContain('working_capital');
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

        it('should return not eligible for insufficient years in business', async () => {
            const profile = { ...mockBusinessProfile, yearsInBusiness: 1 };

            const result = await adapter.checkEligibility(profile);

            expect(result.eligible).toBe(false);
            expect(result.reason).toContain('2+ years');
        });

        it('should return not eligible for low revenue', async () => {
            const profile = { ...mockBusinessProfile, annualRevenue: 500000 };

            const result = await adapter.checkEligibility(profile);

            expect(result.eligible).toBe(false);
            expect(result.reason).toContain('10L+');
        });

        it('should calculate max amount based on revenue', async () => {
            const result = await adapter.checkEligibility(mockBusinessProfile);

            // Max should be 25% of annual revenue, capped at 5Cr
            const expectedMax = Math.min(mockBusinessProfile.annualRevenue * 0.25, 50000000);
            expect(result.maximumAmount).toBe(expectedMax);
        });

        it('should adjust rate based on credit score', async () => {
            const highScore = { ...mockBusinessProfile, creditScore: 780 };
            const lowScore = { ...mockBusinessProfile, creditScore: 650 };

            const highResult = await adapter.checkEligibility(highScore);
            const lowResult = await adapter.checkEligibility(lowScore);

            expect(highResult.estimatedRate).toBeLessThan(lowResult.estimatedRate!);
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
                purpose: FinancingPurpose.INVOICE_FINANCING,
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
                    application_id: 'lk-app-456',
                    status: 'submitted',
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            const result = await adapter.submitApplication(mockApplication);

            expect(result.success).toBe(true);
            expect(result.externalApplicationId).toBe('lk-app-456');
            expect(result.status).toBe('submitted');
            expect(httpService.request).toHaveBeenCalled();
        });

        it('should map standard application to LendingKart format', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { application_id: 'lk-123' },
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
            expect(requestCall.data.loan.amount).toBe(500000);
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
            purpose: FinancingPurpose.WORKING_CAPITAL,
            urgency: 'flexible',
            tenure: 12,
            businessProfile: mockBusinessProfile,
        };

        it('should retrieve offers successfully', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: {
                    offers: [
                        {
                            offer_id: 'lk-offer-1',
                            loan_amount: 500000,
                            interest_rate: 16,
                            processing_fee: 10000,
                            emi: 45000,
                            tenure_months: 12,
                            total_repayment: 540000,
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
            expect(offers[0].offerId).toBe('lk-offer-1');
            expect(offers[0].amount).toBe(500000);
            expect(offers[0].interestRate).toBe(16);
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
            expect(requestCall.data.purpose).toBe('working_capital');
        });
    });

    describe('trackStatus', () => {
        it('should track application status', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: {
                    application_id: 'lk-app-456',
                    status: 'approved',
                    approved_amount: 500000,
                    interest_rate: 16,
                    updated_at: new Date().toISOString(),
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            httpService.request.mockReturnValue(of(mockResponse as AxiosResponse));

            const status = await adapter.trackStatus('lk-app-456');

            expect(status.externalApplicationId).toBe('lk-app-456');
            expect(status.status).toBe('approved');
            expect(status.approvedAmount).toBe(500000);
        });

        it('should map LendingKart status to standard status', async () => {
            const statuses = [
                { lk: 'submitted', standard: 'pending' },
                { lk: 'under_review', standard: 'under_review' },
                { lk: 'approved', standard: 'approved' },
                { lk: 'rejected', standard: 'rejected' },
                { lk: 'disbursed', standard: 'disbursed' },
            ];

            for (const { lk, standard } of statuses) {
                const mockResponse: Partial<AxiosResponse> = {
                    data: { application_id: 'test', status: lk },
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
    });

    describe('handleWebhook', () => {
        const mockPayload = {
            event: 'application_approved',
            application_id: 'lk-app-456',
            status: 'approved',
        };

        it('should process valid webhook', async () => {
            // Mock signature validation
            const signature = 'valid-signature';

            const result = await adapter.handleWebhook(mockPayload, signature);

            expect(result.processed).toBe(true);
            expect(result.applicationId).toBe('lk-app-456');
        });

        it('should reject invalid signature', async () => {
            const signature = 'invalid-signature';

            const result = await adapter.handleWebhook(mockPayload, signature);

            expect(result.processed).toBe(false);
            expect(result.message).toContain('Invalid signature');
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
            expect(requestCall.headers['X-API-Key']).toBe('test-api-key');
            expect(requestCall.headers['X-Partner-ID']).toBe('test-partner-id');
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
    });
});
