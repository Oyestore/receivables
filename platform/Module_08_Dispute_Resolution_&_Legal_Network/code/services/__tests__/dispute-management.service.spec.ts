import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DisputeManagementService } from '../dispute-management.service';
import { DisputeCase } from '../../entities/dispute-case.entity';
import { Repository } from 'typeorm';

describe('DisputeManagementService', () => {
    let service: DisputeManagementService;
    let repository: Repository<DisputeCase>;

    const mockDisputeCase = {
        id: '1',
        caseNumber: 'DISP-2025-001',
        customerId: 'cust-123',
        invoiceId: 'inv-456',
        status: 'OPEN',
        category: 'PAYMENT_DISPUTE',
        description: 'Payment not received',
        amount: 50000,
        currency: 'INR',
        priority: 'HIGH',
        assignedTo: 'agent-1',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
            getOne: jest.fn(),
        })),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DisputeManagementService,
                {
                    provide: getRepositoryToken(DisputeCase),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<DisputeManagementService>(DisputeManagementService);
        repository = module.get<Repository<DisputeCase>>(getRepositoryToken(DisputeCase));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createDispute', () => {
        it('should successfully create a new dispute case', async () => {
            const createDisputeDto = {
                customerId: 'cust-123',
                invoiceId: 'inv-456',
                category: 'PAYMENT_DISPUTE',
                description: 'Payment not received',
                amount: 50000,
            };

            mockRepository.create.mockReturnValue(mockDisputeCase);
            mockRepository.save.mockResolvedValue(mockDisputeCase);

            const result = await service.createDispute(createDisputeDto as any);

            expect(result).toEqual(mockDisputeCase);
            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    customerId: createDisputeDto.customerId,
                    invoiceId: createDisputeDto.invoiceId,
                }),
            );
            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should assign case number automatically', async () => {
            const createDisputeDto = {
                customerId: 'cust-123',
                invoiceId: 'inv-456',
                category: 'PAYMENT_DISPUTE',
            };

            mockRepository.create.mockReturnValue(mockDisputeCase);
            mockRepository.save.mockResolvedValue(mockDisputeCase);

            await service.createDispute(createDisputeDto as any);

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    caseNumber: expect.stringContaining('DISP-'),
                }),
            );
        });

        it('should set initial status to OPEN', async () => {
            const createDisputeDto = {
                customerId: 'cust-123',
                invoiceId: 'inv-456',
            };

            mockRepository.create.mockReturnValue(mockDisputeCase);
            mockRepository.save.mockResolvedValue(mockDisputeCase);

            await service.createDispute(createDisputeDto as any);

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'OPEN',
                }),
            );
        });
    });

    describe('findAllDisputes', () => {
        it('should return all disputes for a tenant', async () => {
            const tenantId = 'tenant-1';
            const disputes = [mockDisputeCase];

            mockRepository.find.mockResolvedValue(disputes);

            const result = await service.findAllDisputes(tenantId);

            expect(result).toEqual(disputes);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { tenantId },
                order: { createdAt: 'DESC' },
            });
        });

        it('should filter by status if provided', async () => {
            const tenantId = 'tenant-1';
            const status = 'OPEN';

            mockRepository.find.mockResolvedValue([mockDisputeCase]);

            await service.findAllDisputes(tenantId, { status });

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { tenantId, status },
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('findDisputeById', () => {
        it('should return a dispute by ID', async () => {
            const disputeId = '1';
            const tenantId = 'tenant-1';

            mockRepository.findOne.mockResolvedValue(mockDisputeCase);

            const result = await service.findDisputeById(disputeId, tenantId);

            expect(result).toEqual(mockDisputeCase);
            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { id: disputeId, tenantId },
            });
        });

        it('should return null if dispute not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await service.findDisputeById('999', 'tenant-1');

            expect(result).toBeNull();
        });
    });

    describe('updateDisputeStatus', () => {
        it('should update dispute status successfully', async () => {
            const disputeId = '1';
            const newStatus = 'RESOLVED';
            const tenantId = 'tenant-1';

            mockRepository.findOne.mockResolvedValue(mockDisputeCase);
            mockRepository.save.mockResolvedValue({
                ...mockDisputeCase,
                status: newStatus,
            });

            const result = await service.updateDisputeStatus(
                disputeId,
                newStatus,
                tenantId,
            );

            expect(result.status).toBe(newStatus);
            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should throw error if dispute not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.updateDisputeStatus('999', 'RESOLVED', 'tenant-1'),
            ).rejects.toThrow();
        });
    });

    describe('assignDispute', () => {
        it('should assign dispute to an agent', async () => {
            const disputeId = '1';
            const agentId = 'agent-2';
            const tenantId = 'tenant-1';

            mockRepository.findOne.mockResolvedValue(mockDisputeCase);
            mockRepository.save.mockResolvedValue({
                ...mockDisputeCase,
                assignedTo: agentId,
            });

            const result = await service.assignDispute(disputeId, agentId, tenantId);

            expect(result.assignedTo).toBe(agentId);
        });
    });

    describe('getDisputeStatistics', () => {
        it('should return dispute statistics for a tenant', async () => {
            const tenantId = 'tenant-1';

            const queryBuilder = mockRepository.createQueryBuilder();
            queryBuilder.getMany.mockResolvedValue([mockDisputeCase]);

            const stats = await service.getDisputeStatistics(tenantId);

            expect(stats).toBeDefined();
            expect(stats).toHaveProperty('total');
            expect(stats).toHaveProperty('byStatus');
        });
    });
});
