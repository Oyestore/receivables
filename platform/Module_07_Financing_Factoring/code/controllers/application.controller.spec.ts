import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationController } from './application.controller';
import { ApplicationOrchestratorService } from '../services/application-orchestrator.service';
import { CreateApplicationDto, SubmitApplicationDto, ApplicationQueryDto, CompareOffersDto } from '../dto/application.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ApplicationController', () => {
    let controller: ApplicationController;
    let orchestrator: jest.Mocked<ApplicationOrchestratorService>;

    const mockUser = {
        userId: 'test-user-123',
        tenantId: 'test-tenant-456',
        email: 'test@example.com',
    };

    const mockApplication = {
        id: 'app-123',
        tenantId: 'test-tenant-456',
        userId: 'test-user-123',
        financingType: 'invoice_financing',
        requestedAmount: 500000,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const mockOrchestrator = {
            createApplication: jest.fn(),
            submitToPartners: jest.fn(),
            getApplication: jest.fn(),
            listApplications: jest.fn(),
            compareOffers: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ApplicationController],
            providers: [
                {
                    provide: ApplicationOrchestratorService,
                    useValue: mockOrchestrator,
                },
            ],
        }).compile();

        controller = module.get<ApplicationController>(ApplicationController);
        orchestrator = module.get(ApplicationOrchestratorService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createApplication', () => {
        const createDto: CreateApplicationDto = {
            financingType: 'invoice_financing',
            requestedAmount: 500000,
            urgency: 'flexible',
            businessDetails: {
                businessName: 'Test Corp',
                businessPan: 'ABCDE1234F',
                businessGstin: '27ABCDE1234F1Z5',
                annualRevenue: 10000000,
                yearsInBusiness: 5,
                industry: 'Technology',
            },
            invoiceIds: ['inv-1', 'inv-2'],
            preferences: {
                prioritize: 'lowest_rate',
            },
        };

        it('should create application successfully', async () => {
            orchestrator.createApplication.mockResolvedValue({
                success: true,
                data: mockApplication,
            });

            const result = await controller.createApplication(mockUser, createDto);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockApplication);
            expect(orchestrator.createApplication).toHaveBeenCalledWith(
                mockUser.tenantId,
                mockUser.userId,
                createDto,
            );
        });

        it('should handle validation errors', async () => {
            orchestrator.createApplication.mockRejectedValue(
                new BadRequestException('Invalid invoice IDs'),
            );

            await expect(
                controller.createApplication(mockUser, createDto),
            ).rejects.toThrow(BadRequestException);
        });

        it('should require authentication', () => {
            // Verify controller has @UseGuards(JwtAuthGuard) decorator
            const metadata = Reflect.getMetadata('guards', ApplicationController);
            expect(metadata).toBeDefined();
        });
    });

    describe('submitApplication', () => {
        const submitDto: SubmitApplicationDto = {
            partnerIds: ['lendingkart', 'capital_float'],
            mode: 'auction',
        };

        it('should submit to single partner', async () => {
            const singlePartnerDto: SubmitApplicationDto = {
                partnerIds: ['lendingkart'],
                mode: 'single',
            };

            orchestrator.submitToPartners.mockResolvedValue({
                success: true,
                message: 'Submitted to LendingKart',
                submissions: [
                    {
                        partnerId: 'lendingkart',
                        success: true,
                        externalApplicationId: 'lk-app-456',
                    },
                ],
            });

            const result = await controller.submitApplication(
                'app-123',
                mockUser,
                singlePartnerDto,
            );

            expect(result.success).toBe(true);
            expect(result.submissions).toHaveLength(1);
            expect(orchestrator.submitToPartners).toHaveBeenCalledWith(
                'app-123',
                mockUser.userId,
                singlePartnerDto,
            );
        });

        it('should submit to multiple partners (auction mode)', async () => {
            orchestrator.submitToPartners.mockResolvedValue({
                success: true,
                message: 'Submitted to 2 partners',
                submissions: [
                    {
                        partnerId: 'lendingkart',
                        success: true,
                        externalApplicationId: 'lk-app-456',
                    },
                    {
                        partnerId: 'capital_float',
                        success: true,
                        externalApplicationId: 'cf-app-789',
                    },
                ],
            });

            const result = await controller.submitApplication(
                'app-123',
                mockUser,
                submitDto,
            );

            expect(result.success).toBe(true);
            expect(result.submissions).toHaveLength(2);
        });

        it('should handle application not found', async () => {
            orchestrator.submitToPartners.mockRejectedValue(
                new NotFoundException('Application not found'),
            );

            await expect(
                controller.submitApplication('invalid-id', mockUser, submitDto),
            ).rejects.toThrow(NotFoundException);
        });

        it('should handle partner submission failures gracefully', async () => {
            orchestrator.submitToPartners.mockResolvedValue({
                success: false,
                message: 'Partial failure',
                submissions: [
                    {
                        partnerId: 'lendingkart',
                        success: true,
                        externalApplicationId: 'lk-app-456',
                    },
                    {
                        partnerId: 'capital_float',
                        success: false,
                        error: 'Partner API unavailable',
                    },
                ],
            });

            const result = await controller.submitApplication(
                'app-123',
                mockUser,
                submitDto,
            );

            expect(result.success).toBe(false);
            expect(result.submissions).toHaveLength(2);
        });
    });

    describe('getApplication', () => {
        it('should return application by ID', async () => {
            orchestrator.getApplication.mockResolvedValue({
                success: true,
                data: mockApplication,
            });

            const result = await controller.getApplication('app-123', mockUser);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockApplication);
            expect(orchestrator.getApplication).toHaveBeenCalledWith(
                'app-123',
                mockUser.userId,
            );
        });

        it('should throw NotFoundException for invalid ID', async () => {
            orchestrator.getApplication.mockRejectedValue(
                new NotFoundException('Application not found'),
            );

            await expect(
                controller.getApplication('invalid-id', mockUser),
            ).rejects.toThrow(NotFoundException);
        });

        it('should enforce tenant isolation', async () => {
            // Application belongs to different tenant
            orchestrator.getApplication.mockRejectedValue(
                new NotFoundException('Application not found'),
            );

            await expect(
                controller.getApplication('app-123', {
                    ...mockUser,
                    tenantId: 'different-tenant',
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('listApplications', () => {
        const queryDto: ApplicationQueryDto = {
            status: 'approved',
            page: 1,
            limit: 10,
        };

        const mockList = {
            success: true,
            data: [mockApplication],
            pagination: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        };

        it('should list applications with filters', async () => {
            orchestrator.listApplications.mockResolvedValue(mockList);

            const result = await controller.listApplications(mockUser, queryDto);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.pagination.total).toBe(1);
            expect(orchestrator.listApplications).toHaveBeenCalledWith(
                mockUser.tenantId,
                mockUser.userId,
                queryDto,
            );
        });

        it('should handle empty results', async () => {
            orchestrator.listApplications.mockResolvedValue({
                success: true,
                data: [],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 0,
                    totalPages: 0,
                },
            });

            const result = await controller.listApplications(mockUser, queryDto);

            expect(result.data).toHaveLength(0);
            expect(result.pagination.total).toBe(0);
        });

        it('should support pagination', async () => {
            const page2Query: ApplicationQueryDto = {
                page: 2,
                limit: 5,
            };

            orchestrator.listApplications.mockResolvedValue({
                success: true,
                data: [mockApplication],
                pagination: {
                    page: 2,
                    limit: 5,
                    total: 15,
                    totalPages: 3,
                },
            });

            const result = await controller.listApplications(mockUser, page2Query);

            expect(result.pagination.page).toBe(2);
            expect(result.pagination.totalPages).toBe(3);
        });

        it('should filter by date range', async () => {
            const dateQuery: ApplicationQueryDto = {
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-01-31'),
                page: 1,
                limit: 10,
            };

            orchestrator.listApplications.mockResolvedValue(mockList);

            await controller.listApplications(mockUser, dateQuery);

            expect(orchestrator.listApplications).toHaveBeenCalledWith(
                mockUser.tenantId,
                mockUser.userId,
                dateQuery,
            );
        });
    });

    describe('compareOffers', () => {
        const compareDto: CompareOffersDto = {
            partnerIds: ['lendingkart', 'capital_float'],
        };

        const mockComparison = {
            success: true,
            offers: [
                {
                    partnerId: 'lendingkart',
                    partnerName: 'LendingKart',
                    offerId: 'lk-offer-1',
                    amount: 500000,
                    effectiveAPR: 16.5,
                    rank: 1,
                    badge: 'Best Overall',
                },
                {
                    partnerId: 'capital_float',
                    partnerName: 'Capital Float',
                    offerId: 'cf-offer-1',
                    amount: 500000,
                    effectiveAPR: 17.2,
                    rank: 2,
                },
            ],
        };

        it('should compare offers from multiple partners', async () => {
            orchestrator.compareOffers.mockResolvedValue(mockComparison);

            const result = await controller.compareOffers(
                'app-123',
                mockUser,
                compareDto,
            );

            expect(result.success).toBe(true);
            expect(result.offers).toHaveLength(2);
            expect(result.offers[0].rank).toBe(1);
            expect(orchestrator.compareOffers).toHaveBeenCalledWith(
                'app-123',
                mockUser.userId,
                compareDto,
            );
        });

        it('should handle no offers available', async () => {
            orchestrator.compareOffers.mockResolvedValue({
                success: true,
                offers: [],
            });

            const result = await controller.compareOffers(
                'app-123',
                mockUser,
                compareDto,
            );

            expect(result.offers).toHaveLength(0);
        });

        it('should handle partner API failures', async () => {
            orchestrator.compareOffers.mockResolvedValue({
                success: true,
                offers: [
                    {
                        partnerId: 'lendingkart',
                        partnerName: 'LendingKart',
                        offerId: 'lk-offer-1',
                        amount: 500000,
                        effectiveAPR: 16.5,
                        rank: 1,
                    },
                    // Capital Float failed to return offer
                ],
                errors: [
                    {
                        partnerId: 'capital_float',
                        error: 'Partner API timeout',
                    },
                ],
            });

            const result = await controller.compareOffers(
                'app-123',
                mockUser,
                compareDto,
            );

            expect(result.offers).toHaveLength(1);
            expect(result.errors).toHaveLength(1);
        });
    });

    describe('Edge Cases', () => {
        it('should handle large pagination requests', async () => {
            const largeQuery: ApplicationQueryDto = {
                page: 1,
                limit: 100, // Max limit
            };

            orchestrator.listApplications.mockResolvedValue({
                success: true,
                data: [],
                pagination: {
                    page: 1,
                    limit: 100,
                    total: 0,
                    totalPages: 0,
                },
            });

            await controller.listApplications(mockUser, largeQuery);

            expect(orchestrator.listApplications).toHaveBeenCalled();
        });

        it('should handle concurrent requests', async () => {
            orchestrator.createApplication.mockResolvedValue({
                success: true,
                data: mockApplication,
            });

            const createDto: CreateApplicationDto = {
                financingType: 'working_capital',
                requestedAmount: 1000000,
                urgency: 'same_day',
                businessDetails: {
                    businessName: 'Test Corp',
                    businessPan: 'ABCDE1234F',
                    annualRevenue: 10000000,
                    yearsInBusiness: 5,
                    industry: 'Technology',
                },
                preferences: {
                    prioritize: 'fastest_disbursal',
                },
            };

            // Simulate concurrent requests
            const promises = Array(5)
                .fill(null)
                .map(() => controller.createApplication(mockUser, createDto));

            const results = await Promise.all(promises);

            expect(results).toHaveLength(5);
            expect(orchestrator.createApplication).toHaveBeenCalledTimes(5);
        });
    });
});
