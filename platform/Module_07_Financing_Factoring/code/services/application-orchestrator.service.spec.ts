import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ApplicationOrchestratorService } from './application-orchestrator.service';
import {
    FinancingApplication,
    FinancingApplicationStatus,
    FinancingPriority,
} from '../entities/financing-application.entity';
import {
    CreateApplicationDto,
    SubmitApplicationDto,
} from '../dto/application.dto';

describe('ApplicationOrchestratorService', () => {
    let service: ApplicationOrchestratorService;
    let repository: jest.Mocked<Repository<FinancingApplication>>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const mockUser = {
        userId: 'user-123',
        tenantId: 'tenant-456',
    };

    const mockApplication: Partial<FinancingApplication> = {
        id: 'app-123',
        applicationNumber: 'FIN1234567890',
        tenantId: 'tenant-456',
        userId: 'user-123',
        financingType: 'invoice_financing',
        requestedAmount: 500000,
        status: FinancingApplicationStatus.DRAFT,
        priority: FinancingPriority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const mockRepository = {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
        };

        const mockEventEmitter = {
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApplicationOrchestratorService,
                {
                    provide: getRepositoryToken(FinancingApplication),
                    useValue: mockRepository,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<ApplicationOrchestratorService>(ApplicationOrchestratorService);
        repository = module.get(getRepositoryToken(FinancingApplication));
        eventEmitter = module.get(EventEmitter2);
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
                yearsInBusiness: 3,
                industry: 'Technology',
            },
            invoiceIds: ['inv-1', 'inv-2'],
            preferences: {
                prioritize: 'lowest_rate',
            },
        };

        it('should create application successfully', async () => {
            repository.create.mockReturnValue(mockApplication as FinancingApplication);
            repository.save.mockResolvedValue(mockApplication as FinancingApplication);

            const result = await service.createApplication(
                mockUser.tenantId,
                mockUser.userId,
                createDto,
            );

            expect(result).toEqual(mockApplication);
            expect(repository.create).toHaveBeenCalled();
            expect(repository.save).toHaveBeenCalled();
        });

        it('should emit application created event', async () => {
            repository.create.mockReturnValue(mockApplication as FinancingApplication);
            repository.save.mockResolvedValue(mockApplication as FinancingApplication);

            await service.createApplication(
                mockUser.tenantId,
                mockUser.userId,
                createDto,
            );

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'financing.application.created',
                expect.objectContaining({
                    applicationId: mockApplication.id,
                    tenantId: mockUser.tenantId,
                }),
            );
        });

        it('should generate unique application number', async () => {
            repository.create.mockReturnValue(mockApplication as FinancingApplication);
            repository.save.mockResolvedValue(mockApplication as FinancingApplication);

            const result = await service.createApplication(
                mockUser.tenantId,
                mockUser.userId,
                createDto,
            );

            const createCall = repository.create.mock.calls[0][0];
            expect(createCall.applicationNumber).toMatch(/^FIN\d+/);
        });

        it('should calculate priority correctly for urgent high-value applications', async () => {
            const urgentDto = {
                ...createDto,
                requestedAmount: 15000000,
                urgency: 'same_day',
            };

            repository.create.mockReturnValue(mockApplication as FinancingApplication);
            repository.save.mockResolvedValue(mockApplication as FinancingApplication);

            await service.createApplication(mockUser.tenantId, mockUser.userId, urgentDto);

            const createCall = repository.create.mock.calls[0][0];
            expect(createCall.priority).toBe(FinancingPriority.URGENT);
        });

        it('should calculate priority correctly for high-value applications', async () => {
            const highValueDto = {
                ...createDto,
                requestedAmount: 7000000,
                urgency: 'flexible',
            };

            repository.create.mockReturnValue(mockApplication as FinancingApplication);
            repository.save.mockResolvedValue(mockApplication as FinancingApplication);

            await service.createApplication(mockUser.tenantId, mockUser.userId, highValueDto);

            const createCall = repository.create.mock.calls[0][0];
            expect(createCall.priority).toBe(FinancingPriority.HIGH);
        });

        it('should calculate priority correctly for urgent low-value applications', async () => {
            const urgentLowValueDto = {
                ...createDto,
                requestedAmount: 300000,
                urgency: 'same_day',
            };

            repository.create.mockReturnValue(mockApplication as FinancingApplication);
            repository.save.mockResolvedValue(mockApplication as FinancingApplication);

            await service.createApplication(mockUser.tenantId, mockUser.userId, urgentLowValueDto);

            const createCall = repository.create.mock.calls[0][0];
            expect(createCall.priority).toBe(FinancingPriority.HIGH);
        });

        it('should set LOW priority for small flexible applications', async () => {
            const lowPriorityDto = {
                ...createDto,
                requestedAmount: 500000,
                urgency: 'flexible',
            };

            repository.create.mockReturnValue(mockApplication as FinancingApplication);
            repository.save.mockResolvedValue(mockApplication as FinancingApplication);

            await service.createApplication(mockUser.tenantId, mockUser.userId, lowPriorityDto);

            const createCall = repository.create.mock.calls[0][0];
            expect(createCall.priority).toBe(FinancingPriority.LOW);
        });

        it('should handle applications without invoice IDs', async () => {
            const noInvoicesDto = { ...createDto, invoiceIds: undefined };

            repository.create.mockReturnValue(mockApplication as FinancingApplication);
            repository.save.mockResolvedValue(mockApplication as FinancingApplication);

            const result = await service.createApplication(
                mockUser.tenantId,
                mockUser.userId,
                noInvoicesDto,
            );

            expect(result).toBeDefined();
        });

        it('should handle repository errors', async () => {
            repository.create.mockReturnValue(mockApplication as FinancingApplication);
            repository.save.mockRejectedValue(new Error('Database error'));

            await expect(
                service.createApplication(mockUser.tenantId, mockUser.userId, createDto),
            ).rejects.toThrow('Database error');
        });
    });

    describe('submitToPartners', () => {
        const submitDto: SubmitApplicationDto = {
            partnerIds: ['lendingkart'],
            mode: 'single',
        };

        beforeEach(() => {
            repository.findOne.mockResolvedValue({
                ...mockApplication,
                status: FinancingApplicationStatus.DRAFT,
            } as FinancingApplication);
            repository.save.mockResolvedValue(mockApplication as FinancingApplication);
        });

        it('should submit to single partner successfully', async () => {
            const result = await service.submitToPartners(
                'app-123',
                mockUser.userId,
                submitDto,
            );

            expect(result).toBeDefined();
            expect(repository.findOne).toHaveBeenCalledWith({
                where: { id: 'app-123' },
            });
        });

        it('should update application status to SUBMITTED', async () => {
            await service.submitToPartners('app-123', mockUser.userId, submitDto);

            const saveCall = repository.save.mock.calls[0][0];
            expect(saveCall.status).toBe(FinancingApplicationStatus.SUBMITTED);
            expect(saveCall.submittedAt).toBeDefined();
        });

        it('should emit application submitted event', async () => {
            await service.submitToPartners('app-123', mockUser.userId, submitDto);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'financing.application.submitted',
                expect.objectContaining({
                    applicationId: 'app-123',
                    partnerIds: submitDto.partnerIds,
                }),
            );
        });

        it('should throw error if application not found', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(
                service.submitToPartners('invalid-id', mockUser.userId, submitDto),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw error if user not authorized', async () => {
            repository.findOne.mockResolvedValue({
                ...mockApplication,
                userId: 'different-user',
            } as FinancingApplication);

            await expect(
                service.submitToPartners('app-123', mockUser.userId, submitDto),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw error if application already submitted', async () => {
            repository.findOne.mockResolvedValue({
                ...mockApplication,
                status: FinancingApplicationStatus.SUBMITTED,
            } as FinancingApplication);

            await expect(
                service.submitToPartners('app-123', mockUser.userId, submitDto),
            ).rejects.toThrow(BadRequestException);
        });

        it('should handle multi-partner auction mode', async () => {
            const auctionDto: SubmitApplicationDto = {
                partnerIds: ['lendingkart', 'capital_float'],
                mode: 'auction',
            };

            const result = await service.submitToPartners(
                'app-123',
                mockUser.userId,
                auctionDto,
            );

            expect(result.mode).toBe('auction');
            expect(result.partnerIds).toHaveLength(2);
        });

        it('should route to auction if multiple partners provided', async () => {
            const multiPartnerDto: SubmitApplicationDto = {
                partnerIds: ['lendingkart', 'capital_float'],
                mode: 'single', // Will be overridden
            };

            const result = await service.submitToPartners(
                'app-123',
                mockUser.userId,
                multiPartnerDto,
            );

            expect(result.mode).toBe('auction');
        });
    });

    describe('getApplicationById', () => {
        it('should return application by ID', async () => {
            repository.findOne.mockResolvedValue(mockApplication as FinancingApplication);

            const result = await service.getApplicationById('app-123');

            expect(result).toEqual(mockApplication);
            expect(repository.findOne).toHaveBeenCalledWith({
                where: { id: 'app-123' },
            });
        });

        it('should throw NotFoundException for invalid ID', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(service.getApplicationById('invalid-id')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('listApplications', () => {
        const mockQueryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getCount: jest.fn().mockResolvedValue(5),
            getMany: jest.fn().mockResolvedValue([mockApplication]),
        };

        beforeEach(() => {
            repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        });

        it('should list applications for tenant and user', async () => {
            const result = await service.listApplications(
                mockUser.tenantId,
                mockUser.userId,
                {},
            );

            expect(result.applications).toHaveLength(1);
            expect(result.total).toBe(5);
        });

        it('should filter by status', async () => {
            await service.listApplications(mockUser.tenantId, mockUser.userId, {
                status: 'approved',
            });

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'app.status = :status',
                { status: 'approved' },
            );
        });

        it('should filter by financing type', async () => {
            await service.listApplications(mockUser.tenantId, mockUser.userId, {
                financingType: 'working_capital',
            });

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'app.financingType = :financingType',
                { financingType: 'working_capital' },
            );
        });

        it('should filter by date range', async () => {
            const dateFrom = new Date('2026-01-01');
            const dateTo = new Date('2026-01-31');

            await service.listApplications(mockUser.tenantId, mockUser.userId, {
                dateFrom,
                dateTo,
            });

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'app.createdAt >= :dateFrom',
                { dateFrom },
            );
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'app.createdAt <= :dateTo',
                { dateTo },
            );
        });

        it('should support pagination', async () => {
            await service.listApplications(mockUser.tenantId, mockUser.userId, {
                page: 2,
                limit: 10,
            });

            expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
        });

        it('should use default pagination values', async () => {
            await service.listApplications(mockUser.tenantId, mockUser.userId, {});

            expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
        });

        it('should order by created date descending', async () => {
            await service.listApplications(mockUser.tenantId, mockUser.userId, {});

            expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
                'app.createdAt',
                'DESC',
            );
        });
    });

    describe('runAuction', () => {
        it('should return auction placeholder', async () => {
            repository.findOne.mockResolvedValue(mockApplication as FinancingApplication);

            const result = await service.runAuction('app-123');

            expect(result.status).toBe('pending_implementation');
            expect(result.message).toContain('Phase 4');
        });

        it('should throw error if application not found', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(service.runAuction('invalid-id')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle concurrent application creations', async () => {
            repository.create.mockReturnValue(mockApplication as FinancingApplication);
            repository.save.mockResolvedValue(mockApplication as FinancingApplication);

            const createDto: Create ApplicationDto = {
                financingType: 'working_capital',
                requestedAmount: 1000000,
                urgency: 'flexible',
                businessDetails: {
                    businessName: 'Test',
                    businessPan: 'ABCDE1234F',
                    annualRevenue: 10000000,
                    yearsInBusiness: 3,
                    industry: 'Tech',
                },
                preferences: {},
            };

            const promises = Array(5)
                .fill(null)
                .map(() =>
                    service.createApplication(mockUser.tenantId, mockUser.userId, createDto),
                );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(5);
            expect(repository.save).toHaveBeenCalledTimes(5);
        });

        it('should handle large requested amounts', async () => {
            const largeAmountDto: CreateApplicationDto = {
                financingType: 'invoice_financing',
                requestedAmount: 100000000, // 10 Cr
                urgency: 'flexible',
                businessDetails: {
                    businessName: 'Large Corp',
                    businessPan: 'ABCDE1234F',
                    annualRevenue: 500000000,
                    yearsInBusiness: 10,
                    industry: 'Manufacturing',
                },
                preferences: {},
            };

            repository.create.mockReturnValue(mockApplication as FinancingApplication);
            repository.save.mockResolvedValue(mockApplication as FinancingApplication);

            const result = await service.createApplication(
                mockUser.tenantId,
                mockUser.userId,
                largeAmountDto,
            );

            expect(result).toBeDefined();
        });
    });
});
