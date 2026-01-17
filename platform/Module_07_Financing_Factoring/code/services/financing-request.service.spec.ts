import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancingRequestService } from '../services/financing-request.service';
import { FinancingApplication, FinancingApplicationStatus, FinancingPriority } from '../entities/financing-application.entity';
import { FinancingOffer } from '../entities/financing-offer.entity';
import { FinancingProvider } from '../entities/financing-offer.entity';
import { FinancingProduct } from '../entities/financing-offer.entity';
import { FinancingRiskAssessment } from '../entities/financing-risk-assessment.entity';
import { PartnerIntegrationService } from '../services/partner-integration.service';

describe('FinancingRequestService', () => {
    let service: FinancingRequestService;
    let applicationRepository: Repository<FinancingApplication>;
    let offerRepository: Repository<FinancingOffer>;
    let providerRepository: Repository<FinancingProvider>;
    let productRepository: Repository<FinancingProduct>;
    let riskAssessmentRepository: Repository<FinancingRiskAssessment>;
    let partnerIntegrationService: PartnerIntegrationService;

    const mockApplicationRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        createQueryBuilder: jest.fn(),
        count: jest.fn(),
    };

    const mockOfferRepository = {
        find: jest.fn(),
    };

    const mockProviderRepository = {
        find: jest.fn(),
    };

    const mockProductRepository = {
        find: jest.fn(),
    };

    const mockRiskAssessmentRepository = {
        save: jest.fn(),
    };

    const mockPartnerIntegrationService = {
        submitApplication: jest.fn(),
        getActivePartners: jest.fn(),
    };

    const mockApplication: FinancingApplication = {
        id: 'app-123',
        applicationNumber: 'FA2024010001',
        tenantId: 'tenant-123',
        userId: 'user-123',
        partnerId: 'partner-123',
        financingType: 'invoice_discounting',
        requestedAmount: 1000000,
        approvedAmount: 800000,
        disbursedAmount: 0,
        interestRate: 12,
        processingFee: 2,
        tenureMonths: 12,
        status: FinancingApplicationStatus.DRAFT,
        priority: FinancingPriority.MEDIUM,
        externalApplicationId: null,
        externalStatus: null,
        businessDetails: {
            businessName: 'Test Business',
            businessPan: 'ABCDE1234F',
            businessGstin: '27ABCDE1234F1ZV',
            businessType: 'PRIVATE_LIMITED',
            industry: 'manufacturing',
            yearsInBusiness: 5,
            annualRevenue: 50000000,
            employeeCount: 50,
            registeredAddress: 'Test Address',
            businessEmail: 'test@example.com',
            businessPhone: '+919876543210',
        },
        invoiceDetails: {
            invoiceIds: ['inv-1', 'inv-2'],
            totalInvoiceAmount: 1500000,
            averageInvoiceAge: 45,
            customerConcentration: 0.7,
            paymentHistory: 'good',
        },
        riskAssessment: {
            creditScore: 750,
            riskCategory: 'good',
            riskFactors: [],
            recommendedAmount: 800000,
            recommendedTerms: 'standard',
        },
        terms: {
            repaymentSchedule: [],
            emiAmount: 71147,
            totalInterest: 53764,
            totalAmount: 853764,
            prepaymentTerms: 'allowed',
            latePaymentPenalty: 2,
        },
        rejectionReason: null,
        submittedAt: null,
        approvedAt: null,
        disbursedAt: null,
        completedAt: null,
        nextAction: 'complete_documentation',
        nextActionDue: new Date(),
        metadata: {
            source: 'web',
            campaign: 'summer2024',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
        updatedBy: null,
        partner: null,
        transactions: [],
        documents: [],
        offers: [],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FinancingRequestService,
                {
                    provide: getRepositoryToken(FinancingApplication),
                    useValue: mockApplicationRepository,
                },
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
                {
                    provide: getRepositoryToken(FinancingRiskAssessment),
                    useValue: mockRiskAssessmentRepository,
                },
                {
                    provide: PartnerIntegrationService,
                    useValue: mockPartnerIntegrationService,
                },
            ],
        }).compile();

        service = module.get<FinancingRequestService>(FinancingRequestService);
        applicationRepository = module.get<Repository<FinancingApplication>>(
            getRepositoryToken(FinancingApplication),
        );
        offerRepository = module.get<Repository<FinancingOffer>>(
            getRepositoryToken(FinancingOffer),
        );
        providerRepository = module.get<Repository<FinancingProvider>>(
            getRepositoryToken(FinancingProvider),
        );
        productRepository = module.get<Repository<FinancingProduct>>(
            getRepositoryToken(FinancingProduct),
        );
        riskAssessmentRepository = module.get<Repository<FinancingRiskAssessment>>(
            getRepositoryToken(FinancingRiskAssessment),
        );
        partnerIntegrationService = module.get<PartnerIntegrationService>(
            PartnerIntegrationService,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createApplication', () => {
        it('should create a new financing application', async () => {
            const createDto = {
                tenantId: 'tenant-123',
                userId: 'user-123',
                partnerId: 'partner-123',
                financingType: 'invoice_discounting',
                requestedAmount: 1000000,
                businessDetails: {
                    businessName: 'Test Business',
                    businessPan: 'ABCDE1234F',
                    yearsInBusiness: 5,
                    annualRevenue: 50000000,
                },
                invoiceDetails: {
                    invoiceIds: ['inv-1'],
                    totalInvoiceAmount: 1500000,
                },
            };

            mockApplicationRepository.count.mockResolvedValue(0);
            mockApplicationRepository.create.mockReturnValue(mockApplication);
            mockApplicationRepository.save.mockResolvedValue(mockApplication);

            const result = await service.createApplication(createDto);

            expect(result).toEqual(mockApplication);
            expect(mockApplicationRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: createDto.tenantId,
                    userId: createDto.userId,
                    partnerId: createDto.partnerId,
                    financingType: createDto.financingType,
                    requestedAmount: createDto.requestedAmount,
                    businessDetails: createDto.businessDetails,
                    invoiceDetails: createDto.invoiceDetails,
                    status: FinancingApplicationStatus.DRAFT,
                    nextAction: 'complete_documentation',
                })
            );
        });
    });

    describe('submitApplication', () => {
        it('should submit application to partner', async () => {
            const applicationId = 'app-123';
            const userId = 'user-123';

            const applicationWithPartner = {
                ...mockApplication,
                partner: { id: 'partner-123', name: 'Test Partner' },
            };

            mockApplicationRepository.findOne.mockResolvedValue(applicationWithPartner);
            mockPartnerIntegrationService.submitApplication.mockResolvedValue({
                externalApplicationId: 'ext-123',
                status: 'submitted',
            });
            mockApplicationRepository.save.mockResolvedValue({
                ...mockApplication,
                status: FinancingApplicationStatus.SUBMITTED,
                externalApplicationId: 'ext-123',
                externalStatus: 'submitted',
                submittedAt: expect.any(Date),
            });

            const result = await service.submitApplication(applicationId, userId);

            expect(result.status).toBe(FinancingApplicationStatus.SUBMITTED);
            expect(result.externalApplicationId).toBe('ext-123');
            expect(mockPartnerIntegrationService.submitApplication).toHaveBeenCalledWith(
                'partner-123',
                expect.objectContaining({
                    applicationId,
                    applicationNumber: mockApplication.applicationNumber,
                })
            );
        });

        it('should throw error if application not found', async () => {
            mockApplicationRepository.findOne.mockResolvedValue(null);

            await expect(
                service.submitApplication('non-existent', 'user-123')
            ).rejects.toThrow('Application not found');
        });

        it('should throw error if application not in draft status', async () => {
            const submittedApp = { ...mockApplication, status: FinancingApplicationStatus.SUBMITTED };
            mockApplicationRepository.findOne.mockResolvedValue(submittedApp);

            await expect(
                service.submitApplication('app-123', 'user-123')
            ).rejects.toThrow('Application can only be submitted from draft status');
        });
    });

    describe('getApplicationById', () => {
        it('should return application by ID', async () => {
            const applicationWithRelations = {
                ...mockApplication,
                partner: { id: 'partner-123', name: 'Test Partner' },
                offers: [],
                transactions: [],
                documents: [],
            };

            mockApplicationRepository.findOne.mockResolvedValue(applicationWithRelations);

            const result = await service.getApplicationById('app-123');

            expect(result).toEqual(applicationWithRelations);
            expect(mockApplicationRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'app-123' },
                relations: ['partner', 'offers', 'transactions', 'documents'],
            });
        });
    });

    describe('getApplications', () => {
        it('should return applications with filters', async () => {
            const query = {
                status: FinancingApplicationStatus.SUBMITTED,
                priority: FinancingPriority.HIGH,
                page: 1,
                limit: 10,
            };

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(1),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockApplication]),
            };

            mockApplicationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getApplications(query);

            expect(result.applications).toEqual([mockApplication]);
            expect(result.total).toBe(1);
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'application.status = :status',
                { status: FinancingApplicationStatus.SUBMITTED }
            );
        });
    });

    describe('updateApplicationStatus', () => {
        it('should update application status', async () => {
            const applicationId = 'app-123';
            const status = FinancingApplicationStatus.APPROVED;
            const userId = 'user-123';

            mockApplicationRepository.findOne.mockResolvedValue(mockApplication);
            mockApplicationRepository.save.mockResolvedValue({
                ...mockApplication,
                status,
                approvedAt: expect.any(Date),
                nextAction: 'accept_offer',
                updatedBy: userId,
            });

            const result = await service.updateApplicationStatus(applicationId, status, userId);

            expect(result.status).toBe(status);
            expect(result.approvedAt).toBeInstanceOf(Date);
            expect(result.nextAction).toBe('accept_offer');
        });

        it('should throw error if application not found', async () => {
            mockApplicationRepository.findOne.mockResolvedValue(null);

            await expect(
                service.updateApplicationStatus('non-existent', FinancingApplicationStatus.APPROVED, 'user-123')
            ).rejects.toThrow('Application not found');
        });
    });

    describe('getUserApplications', () => {
        it('should return applications for user', async () => {
            const userId = 'user-123';
            const tenantId = 'tenant-123';

            mockApplicationRepository.find.mockResolvedValue([mockApplication]);

            const result = await service.getUserApplications(userId, tenantId);

            expect(result).toEqual([mockApplication]);
            expect(mockApplicationRepository.find).toHaveBeenCalledWith({
                where: { userId, tenantId },
                relations: ['partner', 'offers'],
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('getApplicationStatistics', () => {
        it('should return application statistics', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(10),
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([
                    { status: 'draft', count: 2 },
                    { status: 'submitted', count: 5 },
                    { status: 'approved', count: 3 },
                ]),
                getRawOne: jest.fn()
                    .mockResolvedValueOnce({ total: 10000000 })
                    .mockResolvedValueOnce({ total: 8000000 }),
            };

            mockApplicationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getApplicationStatistics();

            expect(result.totalApplications).toBe(10);
            expect(result.statusBreakdown).toHaveLength(3);
            expect(result.totalRequestedAmount).toBe(10000000);
            expect(result.totalApprovedAmount).toBe(8000000);
        });
    });

    describe('getPendingActions', () => {
        it('should return pending actions', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockApplication]),
            };

            mockApplicationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getPendingActions();

            expect(result).toEqual([mockApplication]);
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'application.nextActionDue <= :now',
                { now: expect.any(Date) }
            );
        });
    });

    describe('bulkUpdateStatus', () => {
        it('should bulk update application statuses', async () => {
            const applicationIds = ['app-1', 'app-2'];
            const status = FinancingApplicationStatus.APPROVED;
            const userId = 'user-123';

            const mockQueryBuilder = {
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 2 }),
            };

            mockApplicationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            await service.bulkUpdateStatus(applicationIds, status, userId);

            expect(mockQueryBuilder.set).toHaveBeenCalledWith({
                status,
                updatedBy: userId,
                updatedAt: expect.any(Date),
            });
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('id IN (:...ids)', { ids: applicationIds });
        });
    });

    describe('Private methods', () => {
        it('should calculate priority correctly', () => {
            const businessDetails = {
                yearsInBusiness: 6,
                annualRevenue: 60000000,
            };

            // Test high priority (high amount)
            let priority = (service as any).calculatePriority(15000000, businessDetails);
            expect(priority).toBe(FinancingPriority.HIGH);

            // Test medium priority (established business)
            priority = (service as any).calculatePriority(5000000, businessDetails);
            expect(priority).toBe(FinancingPriority.MEDIUM);

            // Test low priority (new business, low revenue)
            priority = (service as any).calculatePriority(2000000, {
                yearsInBusiness: 2,
                annualRevenue: 10000000,
            });
            expect(priority).toBe(FinancingPriority.LOW);
        });
    });
});
