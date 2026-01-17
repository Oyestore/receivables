import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancingCalculatorService } from '../services/financing-calculator.service';
import { FinancingOffer } from '../entities/financing-offer.entity';
import { FinancingProvider } from '../entities/financing-offer.entity';
import { FinancingProduct } from '../entities/financing-offer.entity';

describe('FinancingCalculatorService', () => {
    let service: FinancingCalculatorService;
    let offerRepository: Repository<FinancingOffer>;
    let providerRepository: Repository<FinancingProvider>;
    let productRepository: Repository<FinancingProduct>;

    const mockOfferRepository = {
        find: jest.fn(),
    };

    const mockProviderRepository = {
        find: jest.fn(),
    };

    const mockProductRepository = {
        find: jest.fn(),
    };

    const mockOffer1: FinancingOffer = {
        id: 'offer-1',
        offerNumber: 'OFF-001',
        applicationId: 'app-1',
        partnerId: 'partner-1',
        offerType: 'pre_approved',
        offerAmount: 1000000,
        interestRate: 12,
        processingFee: 2,
        tenureMonths: 12,
        emiAmount: 88849,
        totalInterest: 66188,
        totalAmount: 1066188,
        netDisbursementAmount: 980000,
        status: 'pending',
        validUntil: new Date(),
        acceptedAt: null,
        rejectedAt: null,
        expiresAt: new Date(),
        terms: {
            repaymentSchedule: [],
            prepaymentTerms: 'allowed',
            latePaymentPenalty: 2,
            foreclosureCharges: 3,
            otherCharges: {},
            documentation: ['pan', 'gstin'],
            processingTime: 24,
            disbursementMethod: 'bank_transfer',
        },
        eligibility: {
            minCreditScore: 650,
            maxDebtToIncome: 0.5,
            minBusinessAge: 2,
            requiredDocuments: ['pan', 'gstin', 'bank_statement'],
            otherCriteria: {},
        },
        features: {
            flexibleRepayment: true,
            prepaymentAllowed: true,
            partPaymentAllowed: false,
            creditLine: false,
            renewalOption: true,
            otherFeatures: ['quick_disbursement'],
        },
        rejectionReason: null,
        externalOfferId: 'ext-offer-1',
        metadata: {
            source: 'api',
            score: 0.85,
            confidence: 0.9,
            aiGenerated: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        updatedBy: null,
        application: null,
    };

    const mockOffer2: FinancingOffer = {
        ...mockOffer1,
        id: 'offer-2',
        offerNumber: 'OFF-002',
        interestRate: 14,
        processingFee: 1.5,
        emiAmount: 89879,
        totalInterest: 78548,
        totalAmount: 1078548,
        netDisbursementAmount: 985000,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FinancingCalculatorService,
                {
                    provide: getRepositoryToken(FinancingOffer),
                    useValue: mockOfferRepository,
                },
                {
                    provide: getRepositoryToken(FinancingProvider),
                    useValue: mockProviderRepository,
                },
                {
                    provide: getRepositoryToken(FinancingProduct),
                    useValue: mockProductRepository,
                },
            ],
        }).compile();

        service = module.get<FinancingCalculatorService>(FinancingCalculatorService);
        offerRepository = module.get<Repository<FinancingOffer>>(getRepositoryToken(FinancingOffer));
        providerRepository = module.get<Repository<FinancingProvider>>(getRepositoryToken(FinancingProvider));
        productRepository = module.get<Repository<FinancingProduct>>(getRepositoryToken(FinancingProduct));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('calculateFinancingCost', () => {
        it('should calculate financing cost correctly', () => {
            const input = {
                principalAmount: 1000000,
                interestRate: 12,
                tenureMonths: 12,
                processingFee: 2,
                repaymentFrequency: 'monthly' as const,
            };

            const result = service.calculateFinancingCost(input);

            expect(result.emiAmount).toBeCloseTo(88849, 0);
            expect(result.totalInterest).toBeCloseTo(66188, 0);
            expect(result.totalAmount).toBeCloseTo(1066188, 0);
            expect(result.netDisbursementAmount).toBe(980000);
            expect(result.effectiveInterestRate).toBeGreaterThan(12); // Should include processing fee
            expect(result.repaymentSchedule).toHaveLength(12);
            expect(result.costBreakdown.interestAmount).toBeCloseTo(66188, 0);
            expect(result.costBreakdown.processingFeeAmount).toBe(20000);
        });

        it('should calculate for quarterly repayment', () => {
            const input = {
                principalAmount: 1000000,
                interestRate: 12,
                tenureMonths: 12,
                processingFee: 2,
                repaymentFrequency: 'quarterly' as const,
            };

            const result = service.calculateFinancingCost(input);

            expect(result.repaymentSchedule).toHaveLength(4); // 12 months / 3 = 4 quarters
            expect(result.repaymentSchedule[0].totalAmount).toBeGreaterThan(result.emiAmount * 3);
        });

        it('should calculate for biannual repayment', () => {
            const input = {
                principalAmount: 1000000,
                interestRate: 12,
                tenureMonths: 12,
                processingFee: 2,
                repaymentFrequency: 'biannual' as const,
            };

            const result = service.calculateFinancingCost(input);

            expect(result.repaymentSchedule).toHaveLength(2); // 12 months / 6 = 2 periods
        });
    });

    describe('compareOffers', () => {
        it('should compare multiple offers', async () => {
            const offers = [mockOffer1, mockOffer2];

            const result = await service.compareOffers(offers);

            expect(result.offers).toHaveLength(2);
            expect(result.offers[0]).toHaveProperty('calculatedEmi');
            expect(result.offers[0]).toHaveProperty('calculatedTotalCost');
            expect(result.offers[0]).toHaveProperty('effectiveRate');
            expect(result.bestByLowestRate).toEqual(mockOffer1); // 12% < 14%
            expect(result.bestByLowestEmi).toEqual(mockOffer1); // Lower EMI due to lower rate
            expect(result.bestByLowestTotalCost).toEqual(mockOffer1); // Lower total cost
            expect(result.recommendations).toContain('Lowest interest rate available - Good for long-term cost savings.');
        });

        it('should handle single offer', async () => {
            const offers = [mockOffer1];

            const result = await service.compareOffers(offers);

            expect(result.offers).toHaveLength(1);
            expect(result.bestByLowestRate).toEqual(mockOffer1);
            expect(result.bestByLowestEmi).toEqual(mockOffer1);
            expect(result.bestByLowestTotalCost).toEqual(mockOffer1);
            expect(result.recommendations).toContain('Only one offer available. Review terms carefully before accepting.');
        });

        it('should throw error for empty offers', async () => {
            await expect(service.compareOffers([])).rejects.toThrow('No offers to compare');
        });
    });

    describe('calculateEligibility', () => {
        it('should calculate eligibility for business', async () => {
            const businessDetails = {
                businessName: 'Test Business',
                yearsInBusiness: 5,
                annualRevenue: 50000000,
                industry: 'manufacturing',
            };

            const financialDetails = {
                creditScore: 750,
                debtToEquityRatio: 0.8,
                currentRatio: 1.5,
            };

            const mockProducts = [
                {
                    id: 'prod-1',
                    displayName: 'Working Capital Loan',
                    isActive: true,
                    eligibility: {
                        minBusinessAge: 2,
                        maxBusinessAge: 20,
                        minAnnualRevenue: 10000000,
                        maxAnnualRevenue: 100000000,
                        minCreditScore: 650,
                        excludedIndustries: ['gambling'],
                        geographicalRestrictions: [],
                    },
                    terms: {
                        minAmount: 500000,
                        maxAmount: 10000000,
                    },
                    provider: { displayName: 'Test Provider' },
                },
                {
                    id: 'prod-2',
                    displayName: 'High Risk Loan',
                    isActive: true,
                    eligibility: {
                        minBusinessAge: 10,
                        minAnnualRevenue: 100000000,
                        minCreditScore: 800,
                        excludedIndustries: ['manufacturing'],
                    },
                    terms: {
                        minAmount: 5000000,
                        maxAmount: 50000000,
                    },
                    provider: { displayName: 'Test Provider' },
                },
            ];

            mockProductRepository.find.mockResolvedValue(mockProducts);

            const result = await service.calculateEligibility(businessDetails, financialDetails);

            expect(result.eligibleProducts).toHaveLength(1);
            expect(result.ineligibleProducts).toHaveLength(1);
            expect(result.recommendedProducts).toHaveLength(1);
            expect(result.eligibleProducts[0].productId).toBe('prod-1');
            expect(result.ineligibleProducts[0].productId).toBe('prod-2');
        });
    });

    describe('calculateEarlyRepaymentSavings', () => {
        it('should calculate early repayment savings', () => {
            const remainingMonths = 6;

            const result = service.calculateEarlyRepaymentSavings(mockOffer1, remainingMonths);

            expect(result).toHaveProperty('remainingInterest');
            expect(result).toHaveProperty('prepaymentCharges');
            expect(result).toHaveProperty('netSavings');
            expect(result).toHaveProperty('savingsPercentage');
            expect(result.netSavings).toBeGreaterThan(0);
            expect(result.savingsPercentage).toBeGreaterThan(0);
            expect(result.savingsPercentage).toBeLessThan(100);
        });

        it('should handle zero prepayment charges', () => {
            const offerWithNoCharges = {
                ...mockOffer1,
                terms: {
                    ...mockOffer1.terms,
                    prepaymentCharges: 0,
                },
            };

            const result = service.calculateEarlyRepaymentSavings(offerWithNoCharges, 6);

            expect(result.prepaymentCharges).toBe(0);
            expect(result.netSavings).toBe(result.remainingInterest);
            expect(result.savingsPercentage).toBe(100);
        });
    });

    describe('Private methods', () => {
        it('should generate repayment schedule correctly', () => {
            const principal = 1000000;
            const monthlyRate = 0.01; // 12% annual
            const emi = 88849;
            const tenureMonths = 12;
            const frequency = 'monthly';

            const schedule = (service as any).generateRepaymentSchedule(
                principal, monthlyRate, emi, tenureMonths, frequency
            );

            expect(schedule).toHaveLength(12);
            expect(schedule[0]).toHaveProperty('installmentNumber', 1);
            expect(schedule[0]).toHaveProperty('principalAmount');
            expect(schedule[0]).toHaveProperty('interestAmount');
            expect(schedule[0]).toHaveProperty('totalAmount');
            expect(schedule[0]).toHaveProperty('remainingPrincipal');
            expect(schedule[0]).toHaveProperty('dueDate');
            expect(schedule[11].remainingPrincipal).toBeCloseTo(0, 0);
        });

        it('should calculate due dates correctly', () => {
            const installment = 3;
            const frequency = 'quarterly';

            const dueDate = (service as any).calculateDueDate(installment, frequency);

            expect(dueDate).toBeInstanceOf(Date);
            const expectedDate = new Date();
            expectedDate.setMonth(expectedDate.getMonth() + (3 * 3)); // 3 quarters = 9 months
            expect(dueDate.getMonth()).toBe(expectedDate.getMonth());
        });

        it('should generate recommendations correctly', () => {
            const enrichedOffers = [
                {
                    ...mockOffer1,
                    calculatedEmi: 88849,
                    calculatedTotalCost: 86188,
                    effectiveRate: 12.5,
                },
                {
                    ...mockOffer2,
                    calculatedEmi: 89879,
                    calculatedTotalCost: 98548,
                    effectiveRate: 14.2,
                },
            ];

            const recommendations = (service as any).generateRecommendations(enrichedOffers);

            expect(recommendations).toContain('Lowest interest rate available - Good for long-term cost savings.');
        });

        it('should check eligibility criteria correctly', () => {
            const eligibility = {
                minBusinessAge: 3,
                maxBusinessAge: 20,
                minAnnualRevenue: 10000000,
                maxAnnualRevenue: 100000000,
                minCreditScore: 650,
                excludedIndustries: ['gambling'],
            };

            const businessDetails = {
                yearsInBusiness: 5,
                annualRevenue: 50000000,
                industry: 'manufacturing',
            };

            const financialDetails = {
                creditScore: 700,
            };

            const isEligible = (service as any).checkEligibilityCriteria(
                eligibility, businessDetails, financialDetails
            );

            expect(isEligible).toBe(true);

            // Test ineligible cases
            const ineligibleBusiness = { ...businessDetails, yearsInBusiness: 1 };
            expect((service as any).checkEligibilityCriteria(
                eligibility, ineligibleBusiness, financialDetails
            )).toBe(false);

            const excludedIndustry = { ...businessDetails, industry: 'gambling' };
            expect((service as any).checkEligibilityCriteria(
                eligibility, excludedIndustry, financialDetails
            )).toBe(false);
        });

        it('should calculate max amount correctly', () => {
            const product = {
                terms: {
                    maxAmount: 5000000,
                },
            };

            const businessDetails = {
                annualRevenue: 50000000,
            };

            const maxAmount = (service as any).calculateMaxAmount(product, businessDetails, {});

            expect(maxAmount).toBe(10000000); // 20% of revenue
            expect(maxAmount).toBeLessThanOrEqual(product.terms.maxAmount);
        });

        it('should get ineligibility reasons correctly', () => {
            const eligibility = {
                minBusinessAge: 3,
                minAnnualRevenue: 10000000,
                minCreditScore: 650,
                excludedIndustries: ['gambling'],
            };

            const businessDetails = {
                yearsInBusiness: 1,
                annualRevenue: 5000000,
                industry: 'gambling',
            };

            const financialDetails = {
                creditScore: 600,
            };

            const reasons = (service as any).getIneligibilityReasons(
                eligibility, businessDetails, financialDetails
            );

            expect(reasons).toContain('Business age too low (minimum 3 years required)');
            expect(reasons).toContain('Annual revenue too low (minimum ₹10,000,000 required)');
            expect(reasons).toContain('Credit score too low (minimum 650 required)');
            expect(reasons).toContain('Industry not supported by this product');
        });
    });
});
