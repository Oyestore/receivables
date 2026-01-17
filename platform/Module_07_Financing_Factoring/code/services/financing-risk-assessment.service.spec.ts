import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancingRiskAssessmentService } from '../services/financing-risk-assessment.service';
import { FinancingRiskAssessment, RiskLevel, RiskCategory } from '../entities/financing-risk-assessment.entity';
import { FinancingApplication } from '../entities/financing-application.entity';

describe('FinancingRiskAssessmentService', () => {
    let service: FinancingRiskAssessmentService;
    let riskAssessmentRepository: Repository<FinancingRiskAssessment>;
    let applicationRepository: Repository<FinancingApplication>;

    const mockRiskAssessmentRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
    };

    const mockApplicationRepository = {
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
    };

    const mockRiskAssessment: FinancingRiskAssessment = {
        id: 'risk-123',
        applicationId: 'app-123',
        assessmentVersion: '1.0',
        creditScore: 750,
        riskLevel: RiskLevel.MEDIUM,
        riskCategory: RiskCategory.GOOD,
        confidenceScore: 0.85,
        probabilityOfDefault: 0.02,
        lossGivenDefault: 0.5,
        expectedLoss: 0.01,
        businessRiskFactors: {
            businessAgeRisk: 0.3,
            revenueStability: 0.5,
            industryRisk: 0.2,
            geographicRisk: 0.3,
            customerConcentration: 0.4,
            supplierDependency: 0.3,
        },
        financialRiskFactors: {
            debtToEquityRatio: 1.2,
            currentRatio: 1.5,
            quickRatio: 0.8,
            grossMargin: 0.25,
            netMargin: 0.08,
            operatingCashFlow: 5000000,
            workingCapitalRatio: 1.2,
        },
        creditHistoryFactors: {
            paymentHistory: 'good',
            creditUtilization: 0.3,
            creditInquiries: 2,
            publicRecords: 0,
            collectionAccounts: 0,
        },
        industryBenchmarks: {
            industryAverageScore: 700,
            industryMedianRevenue: 40000000,
            industryGrowthRate: 0.05,
            industryDefaultRate: 0.03,
        },
        recommendations: {
            maxLoanAmount: 10000000,
            recommendedInterestRate: 16,
            recommendedTenure: 18,
            requiredCollateral: ['Personal guarantee'],
            suggestedCovenants: ['Financial reporting'],
            monitoringRequirements: ['Monthly reviews'],
        },
        riskMitigation: {
            insuranceRequirements: ['Business insurance'],
            guarantees: ['Personal guarantee'],
            collateralRequirements: [],
            monitoringFrequency: 'monthly',
            reportingRequirements: ['Financial statements'],
        },
        scenarioAnalysis: {
            baseCase: {
                probabilityOfDefault: 0.02,
                lossGivenDefault: 0.5,
            },
            stressTest: {
                probabilityOfDefault: 0.04,
                description: 'Revenue decline of 20%',
            },
            worstCase: {
                probabilityOfDefault: 0.08,
                description: 'Revenue decline of 40% + payment delays',
            },
            sensitivityFactors: {
                revenueSensitivity: 0.3,
                interestRateSensitivity: 0.2,
                paymentHistorySensitivity: 0.4,
                industrySensitivity: 0.1,
            },
        },
        assessmentDate: new Date(),
        nextReviewDate: new Date(),
        assessorId: 'user-123',
        assessmentModel: 'v2.0',
        modelOutputs: {
            featureImportance: {},
            shapValues: {},
            predictionProbability: 0.85,
            modelVersion: '2.0',
        },
        manualOverrides: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
        updatedBy: null,
        application: null,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FinancingRiskAssessmentService,
                {
                    provide: getRepositoryToken(FinancingRiskAssessment),
                    useValue: mockRiskAssessmentRepository,
                },
                {
                    provide: getRepositoryToken(FinancingApplication),
                    useValue: mockApplicationRepository,
                },
            ],
        }).compile();

        service = module.get<FinancingRiskAssessmentService>(FinancingRiskAssessmentService);
        riskAssessmentRepository = module.get<Repository<FinancingRiskAssessment>>(
            getRepositoryToken(FinancingRiskAssessment),
        );
        applicationRepository = module.get<Repository<FinancingApplication>>(
            getRepositoryToken(FinancingApplication),
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('performRiskAssessment', () => {
        it('should perform comprehensive risk assessment', async () => {
            const applicationId = 'app-123';
            const userId = 'user-123';
            const input = {
                businessDetails: {
                    businessName: 'Test Business',
                    yearsInBusiness: 5,
                    annualRevenue: 50000000,
                    industry: 'manufacturing',
                },
                financialDetails: {
                    debtToEquityRatio: 1.2,
                    currentRatio: 1.5,
                    netMargin: 0.08,
                    creditScore: 750,
                },
                invoiceDetails: {
                    paymentHistory: 'good',
                },
                industryBenchmarks: {
                    industryAverageScore: 700,
                    industryDefaultRate: 0.03,
                },
            };

            const tempApplication = {
                id: 'temp-app',
                applicationNumber: 'TEMP_FA2024010001',
                tenantId: 'tenant-123',
                userId: 'user-123',
                partnerId: 'system',
                financingType: 'invoice_discounting',
                requestedAmount: 10000000,
                businessDetails: input.businessDetails,
                financialDetails: input.financialDetails,
                invoiceDetails: input.invoiceDetails,
                status: 'draft',
            };

            mockApplicationRepository.create.mockReturnValue(tempApplication);
            mockApplicationRepository.save.mockResolvedValue(tempApplication);
            mockRiskAssessmentRepository.create.mockReturnValue(mockRiskAssessment);
            mockRiskAssessmentRepository.save.mockResolvedValue(mockRiskAssessment);
            mockApplicationRepository.remove.mockResolvedValue(tempApplication);

            const result = await service.performRiskAssessment(applicationId, input, userId);

            expect(result).toEqual(mockRiskAssessment);
            expect(result.creditScore).toBeGreaterThan(0);
            expect(result.riskLevel).toBeDefined();
            expect(result.riskCategory).toBeDefined();
            expect(result.probabilityOfDefault).toBeGreaterThanOrEqual(0);
            expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
            expect(result.confidenceScore).toBeLessThanOrEqual(1);
        });

        it('should handle different business profiles', async () => {
            const applicationId = 'app-456';
            const userId = 'user-456';
            const input = {
                businessDetails: {
                    businessName: 'New Business',
                    yearsInBusiness: 1,
                    annualRevenue: 5000000,
                    industry: 'hospitality',
                },
                financialDetails: {
                    debtToEquityRatio: 2.5,
                    currentRatio: 0.8,
                    netMargin: 0.02,
                    creditScore: 600,
                },
                invoiceDetails: {
                    paymentHistory: 'poor',
                },
            };

            const tempApplication = {
                id: 'temp-app-2',
                applicationNumber: 'TEMP_FA2024010002',
                tenantId: 'tenant-456',
                userId: 'user-456',
                partnerId: 'system',
                financingType: 'invoice_discounting',
                requestedAmount: 2000000,
                businessDetails: input.businessDetails,
                financialDetails: input.financialDetails,
                invoiceDetails: input.invoiceDetails,
                status: 'draft',
            };

            mockApplicationRepository.create.mockReturnValue(tempApplication);
            mockApplicationRepository.save.mockResolvedValue(tempApplication);
            mockRiskAssessmentRepository.create.mockReturnValue({
                ...mockRiskAssessment,
                creditScore: 550,
                riskLevel: RiskLevel.HIGH,
                riskCategory: RiskCategory.POOR,
                probabilityOfDefault: 0.08,
            });
            mockRiskAssessmentRepository.save.mockResolvedValue(mockRiskAssessment);
            mockApplicationRepository.remove.mockResolvedValue(tempApplication);

            const result = await service.performRiskAssessment(applicationId, input, userId);

            expect(result.creditScore).toBeLessThan(650);
            expect(result.riskLevel).toBe(RiskLevel.HIGH);
            expect(result.probabilityOfDefault).toBeGreaterThan(0.05);
        });
    });

    describe('getRiskAssessmentByApplication', () => {
        it('should return latest risk assessment for application', async () => {
            const applicationId = 'app-123';

            mockRiskAssessmentRepository.findOne.mockResolvedValue(mockRiskAssessment);

            const result = await service.getRiskAssessmentByApplication(applicationId);

            expect(result).toEqual(mockRiskAssessment);
            expect(mockRiskAssessmentRepository.findOne).toHaveBeenCalledWith({
                where: { applicationId },
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('updateRiskAssessment', () => {
        it('should update risk assessment', async () => {
            const assessmentId = 'risk-123';
            const userId = 'user-123';
            const updates = {
                creditScore: 780,
                riskLevel: RiskLevel.LOW,
            };

            mockRiskAssessmentRepository.update.mockResolvedValue(undefined);
            mockRiskAssessmentRepository.findOne.mockResolvedValue({
                ...mockRiskAssessment,
                ...updates,
                updatedBy: userId,
                updatedAt: expect.any(Date),
            });

            const result = await service.updateRiskAssessment(assessmentId, updates, userId);

            expect(result.creditScore).toBe(780);
            expect(result.riskLevel).toBe(RiskLevel.LOW);
            expect(result.updatedBy).toBe(userId);
            expect(mockRiskAssessmentRepository.update).toHaveBeenCalledWith(
                assessmentId,
                expect.objectContaining({
                    ...updates,
                    updatedBy: userId,
                    updatedAt: expect.any(Date),
                })
            );
        });
    });

    describe('Private methods', () => {
        it('should calculate credit score correctly', () => {
            const input = {
                businessDetails: {
                    yearsInBusiness: 5,
                    annualRevenue: 50000000,
                    industry: 'manufacturing',
                },
                financialDetails: {
                    debtToEquityRatio: 1.2,
                    currentRatio: 1.5,
                    netMargin: 0.08,
                },
                invoiceDetails: {
                    paymentHistory: 'good',
                },
            };

            const creditScore = (service as any).calculateCreditScore(input);

            expect(creditScore).toBeGreaterThanOrEqual(300);
            expect(creditScore).toBeLessThanOrEqual(900);
            expect(creditScore).toBeGreaterThan(700); // Good profile should have high score
        });

        it('should determine risk level correctly', () => {
            expect((service as any).determineRiskLevel(850)).toBe(RiskLevel.LOW);
            expect((service as any).determineRiskLevel(750)).toBe(RiskLevel.MEDIUM);
            expect((service as any).determineRiskLevel(650)).toBe(RiskLevel.HIGH);
            expect((service as any).determineRiskLevel(550)).toBe(RiskLevel.VERY_HIGH);
        });

        it('should determine risk category correctly', () => {
            expect((service as any).determineRiskCategory(880)).toBe(RiskCategory.EXCELLENT);
            expect((service as any).determineRiskCategory(780)).toBe(RiskCategory.GOOD);
            expect((service as any).determineRiskCategory(680)).toBe(RiskCategory.AVERAGE);
            expect((service as any).determineRiskCategory(580)).toBe(RiskCategory.POOR);
            expect((service as any).determineRiskCategory(480)).toBe(RiskCategory.VERY_POOR);
        });

        it('should calculate probability of default correctly', () => {
            const input = {
                businessDetails: { yearsInBusiness: 5 },
                financialDetails: { currentRatio: 1.5 },
                invoiceDetails: { paymentHistory: 'good' },
            };

            const pd1 = (service as any).calculateProbabilityOfDefault(800, input);
            const pd2 = (service as any).calculateProbabilityOfDefault(600, input);

            expect(pd1).toBeLessThan(pd2);
            expect(pd1).toBeGreaterThan(0);
            expect(pd1).toBeLessThan(1);
        });

        it('should calculate confidence score correctly', () => {
            const input1 = {}; // Minimal data
            const input2 = {
                financialDetails: {},
                invoiceDetails: {},
                industryBenchmarks: {},
            }; // Full data

            const confidence1 = (service as any).calculateConfidenceScore(input1);
            const confidence2 = (service as any).calculateConfidenceScore(input2);

            expect(confidence2).toBeGreaterThan(confidence1);
            expect(confidence1).toBeGreaterThanOrEqual(0.8);
            expect(confidence2).toBeLessThanOrEqual(1);
        });

        it('should analyze risk factors correctly', () => {
            const input = {
                businessDetails: {
                    yearsInBusiness: 5,
                    industry: 'manufacturing',
                },
                financialDetails: {
                    debtToEquityRatio: 1.2,
                    currentRatio: 1.5,
                    netMargin: 0.08,
                    creditUtilization: 0.3,
                    creditInquiries: 2,
                },
                invoiceDetails: {
                    paymentHistory: 'good',
                },
            };

            const riskFactors = (service as any).analyzeRiskFactors(input);

            expect(riskFactors).toHaveProperty('business');
            expect(riskFactors).toHaveProperty('financial');
            expect(riskFactors).toHaveProperty('creditHistory');
            expect(riskFactors.business.businessAgeRisk).toBeGreaterThanOrEqual(0);
            expect(riskFactors.business.businessAgeRisk).toBeLessThanOrEqual(1);
        });

        it('should generate recommendations correctly', () => {
            const creditScore = 750;
            const riskLevel = RiskLevel.MEDIUM;
            const input = {
                businessDetails: { annualRevenue: 50000000 },
            };

            const recommendations = (service as any).generateRecommendations(creditScore, riskLevel, input);

            expect(recommendations).toHaveProperty('maxLoanAmount');
            expect(recommendations).toHaveProperty('recommendedInterestRate');
            expect(recommendations).toHaveProperty('recommendedTenure');
            expect(recommendations).toHaveProperty('requiredCollateral');
            expect(recommendations).toHaveProperty('suggestedCovenants');
            expect(recommendations).toHaveProperty('monitoringRequirements');
            expect(recommendations.maxLoanAmount).toBeGreaterThan(0);
            expect(recommendations.recommendedInterestRate).toBeGreaterThan(0);
        });

        it('should generate risk mitigation correctly', () => {
            const riskLevel = RiskLevel.HIGH;

            const mitigation = (service as any).generateRiskMitigation(riskLevel);

            expect(mitigation).toHaveProperty('insuranceRequirements');
            expect(mitigation).toHaveProperty('guarantees');
            expect(mitigation).toHaveProperty('collateralRequirements');
            expect(mitigation).toHaveProperty('monitoringFrequency');
            expect(mitigation).toHaveProperty('reportingRequirements');
            expect(mitigation.collateralRequirements.length).toBeGreaterThan(0);
        });

        it('should perform scenario analysis correctly', () => {
            const creditScore = 750;
            const input = {
                businessDetails: {},
                financialDetails: {},
                invoiceDetails: {},
            };

            const scenarioAnalysis = (service as any).performScenarioAnalysis(creditScore, input);

            expect(scenarioAnalysis).toHaveProperty('baseCase');
            expect(scenarioAnalysis).toHaveProperty('stressTest');
            expect(scenarioAnalysis).toHaveProperty('worstCase');
            expect(scenarioAnalysis).toHaveProperty('sensitivityFactors');
            expect(scenarioAnalysis.stressTest.probabilityOfDefault).toBeGreaterThan(
                scenarioAnalysis.baseCase.probabilityOfDefault
            );
            expect(scenarioAnalysis.worstCase.probabilityOfDefault).toBeGreaterThan(
                scenarioAnalysis.stressTest.probabilityOfDefault
            );
        });

        it('should get industry risk correctly', () => {
            expect((service as any).getIndustryRisk('technology')).toBe(20);
            expect((service as any).getIndustryRisk('manufacturing')).toBe(0);
            expect((service as any).getIndustryRisk('construction')).toBe(-30);
            expect((service as any).getIndustryRisk('unknown')).toBe(0);
        });

        it('should calculate business age risk correctly', () => {
            expect((service as any).calculateBusinessAgeRisk(15)).toBe(0.1);
            expect((service as any).calculateBusinessAgeRisk(7)).toBe(0.3);
            expect((service as any).calculateBusinessAgeRisk(4)).toBe(0.5);
            expect((service as any).calculateBusinessAgeRisk(2)).toBe(0.7);
            expect((service as any).calculateBusinessAgeRisk(0.5)).toBe(0.9);
        });

        it('should calculate max loan amount correctly', () => {
            const creditScore = 750;
            const input = {
                businessDetails: { annualRevenue: 50000000 },
            };

            const maxAmount = (service as any).calculateMaxLoanAmount(creditScore, input);

            expect(maxAmount).toBeGreaterThan(0);
            expect(maxAmount).toBeLessThanOrEqual(input.businessDetails.annualRevenue);
        });

        it('should calculate recommended interest rate correctly', () => {
            expect((service as any).calculateRecommendedInterestRate(RiskLevel.LOW)).toBe(12);
            expect((service as any).calculateRecommendedInterestRate(RiskLevel.MEDIUM)).toBe(16);
            expect((service as any).calculateRecommendedInterestRate(RiskLevel.HIGH)).toBe(22);
            expect((service as any).calculateRecommendedInterestRate(RiskLevel.VERY_HIGH)).toBe(28);
        });

        it('should calculate recommended tenure correctly', () => {
            expect((service as any).calculateRecommendedTenure(RiskLevel.LOW)).toBe(24);
            expect((service as any).calculateRecommendedTenure(RiskLevel.MEDIUM)).toBe(18);
            expect((service as any).calculateRecommendedTenure(RiskLevel.HIGH)).toBe(12);
            expect((service as any).calculateRecommendedTenure(RiskLevel.VERY_HIGH)).toBe(6);
        });

        it('should get required collateral correctly', () => {
            expect((service as any).getRequiredCollateral(RiskLevel.LOW)).toEqual([]);
            expect((service as any).getRequiredCollateral(RiskLevel.MEDIUM)).toEqual(['Personal guarantee']);
            expect((service as any).getRequiredCollateral(RiskLevel.HIGH)).toEqual(['Personal guarantee', 'Business assets']);
            expect((service as any).getRequiredCollateral(RiskLevel.VERY_HIGH)).toEqual(['Personal guarantee', 'Business assets', 'Property collateral']);
        });

        it('should get suggested covenants correctly', () => {
            const lowRiskCovenants = (service as any).getSuggestedCovenants(RiskLevel.LOW);
            const highRiskCovenants = (service as any).getSuggestedCovenants(RiskLevel.HIGH);

            expect(lowRiskCovenants).toContain('Financial reporting');
            expect(lowRiskCovenants).not.toContain('Debt ratio limits');
            expect(highRiskCovenants).toContain('Financial reporting');
            expect(highRiskCovenants).toContain('Debt ratio limits');
        });

        it('should get monitoring requirements correctly', () => {
            expect((service as any).getMonitoringRequirements(RiskLevel.LOW)).toEqual(['Quarterly reviews']);
            expect((service as any).getMonitoringRequirements(RiskLevel.MEDIUM)).toEqual(['Monthly reviews']);
            expect((service as any).getMonitoringRequirements(RiskLevel.HIGH)).toEqual(['Weekly reviews', 'Monthly financials']);
            expect((service as any).getMonitoringRequirements(RiskLevel.VERY_HIGH)).toEqual(['Daily monitoring', 'Weekly financials', 'Site visits']);
        });
    });
});
