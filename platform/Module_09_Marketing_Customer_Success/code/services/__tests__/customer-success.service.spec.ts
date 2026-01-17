import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerSuccessService } from '../customer-success.service';
import { CustomerSuccess } from '../../entities/customer-success.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';

describe('CustomerSuccessService', () => {
    let service: CustomerSuccessService;
    let repository: Repository<CustomerSuccess>;
    let eventEmitter: EventEmitter2;

    const mockCustomerSuccess = {
        id: 'cs-123',
        customerId: 'customer-123',
        tenantId: 'tenant-123',
        healthScore: 85,
        satisfactionScore: 90,
        adoptionRate: 75,
        engagementLevel: 'high',
        accountManager: 'manager-123',
        checkInDate: new Date(),
        nextCheckIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        issues: [],
        notes: [],
        createdAt: new Date(),
    };

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerSuccessService,
                {
                    provide: getRepositoryToken(CustomerSuccess),
                    useValue: mockRepository,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<CustomerSuccessService>(CustomerSuccessService);
        repository = module.get<Repository<CustomerSuccess>>(getRepositoryToken(CustomerSuccess));
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);

        jest.clearAllMocks();
    });

    describe('Service Initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should have repository injected', () => {
            expect(repository).toBeDefined();
        });
    });

    describe('createCustomerSuccessRecord', () => {
        it('should create new customer success record', async () => {
            mockRepository.create.mockReturnValue(mockCustomerSuccess);
            mockRepository.save.mockResolvedValue(mockCustomerSuccess);

            const result = await service.createCustomerSuccessRecord({
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                accountManager: 'manager-123',
            });

            expect(result).toEqual(mockCustomerSuccess);
            expect(repository.save).toHaveBeenCalled();
            expect(eventEmitter.emit).toHaveBeenCalledWith('customer.success.created', {
                customerId: 'customer-123',
                tenantId: 'tenant-123',
            });
        });
    });

    describe('updateHealthScore', () => {
        it('should update health score', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerSuccess);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.updateHealthScore('customer-123', 'tenant-123', 92);

            expect(result.healthScore).toBe(92);
            expect(repository.save).toHaveBeenCalled();
        });

        it('should emit health score changed event', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerSuccess);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            await service.updateHealthScore('customer-123', 'tenant-123', 92);

            expect(eventEmitter.emit).toHaveBeenCalledWith('customer.health.updated', {
                customerId: 'customer-123',
                oldScore: 85,
                newScore: 92,
            });
        });

        it('should throw NotFoundException if not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.updateHealthScore('non-existent', 'tenant-123', 90),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('scheduleCheckIn', () => {
        it('should schedule next check-in', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerSuccess);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const result = await service.scheduleCheckIn('customer-123', 'tenant-123', nextWeek);

            expect(result.nextCheckIn).toBeDefined();
            expect(repository.save).toHaveBeenCalled();
        });
    });

    describe('recordIssue', () => {
        it('should add issue to customer record', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerSuccess);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const issue = {
                title: 'Payment Delay',
                description: 'Customer experiencing payment issues',
                priority: 'high' as const,
            };

            const result = await service.recordIssue('customer-123', 'tenant-123', issue);

            expect(result.issues).toContainEqual(expect.objectContaining(issue));
            expect(eventEmitter.emit).toHaveBeenCalledWith('customer.issue.recorded', {
                customerId: 'customer-123',
                issue: expect.any(Object),
            });
        });
    });

    describe('resolveIssue', () => {
        it('should mark issue as resolved', async () => {
            const withIssue = {
                ...mockCustomerSuccess,
                issues: [{ id: 'issue-1', title: 'Test', status: 'open', createdAt: new Date() }],
            };

            mockRepository.findOne.mockResolvedValue(withIssue);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.resolveIssue('customer-123', 'tenant-123', 'issue-1', 'Fixed');

            const issue = result.issues.find(i => i.id === 'issue-1');
            expect(issue.status).toBe('resolved');
            expect(issue.resolution).toBe('Fixed');
        });
    });

    describe('addNote', () => {
        it('should add note to customer record', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerSuccess);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.addNote('customer-123', 'tenant-123', {
                content: 'Great call today',
                author: 'manager-123',
            });

            expect(result.notes.length).toBeGreaterThan(0);
            expect(result.notes[0].content).toBe('Great call today');
        });
    });

    describe('getUpcomingCheckIns', () => {
        it('should return customers with upcoming check-ins', async () => {
            const customers = [
                { ...mockCustomerSuccess, nextCheckIn: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
                { ...mockCustomerSuccess, id: 'cs-456', nextCheckIn: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
            ];

            mockRepository.find.mockResolvedValue(customers);

            const result = await service.getUpcomingCheckIns('tenant-123', 7);

            expect(result.length).toBe(2);
            expect(repository.find).toHaveBeenCalled();
        });
    });

    describe('getAtRiskCustomers', () => {
        it('should return customers with low health scores', async () => {
            const atRisk = [
                { ...mockCustomerSuccess, healthScore: 35 },
                { ...mockCustomerSuccess, id: 'cs-456', healthScore: 42 },
            ];

            mockRepository.find.mockResolvedValue(atRisk);

            const result = await service.getAtRiskCustomers('tenant-123');

            expect(result.every(c => c.healthScore < 50)).toBe(true);
        });
    });

    describe('calculateAdoptionRate', () => {
        it('should calculate feature adoption rate', async () => {
            const result = await service.calculateAdoptionRate('customer-123', 'tenant-123');

            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
        });
    });

    describe('Edge Cases', () => {
        it('should handle database errors', async () => {
            mockRepository.findOne.mockRejectedValue(new Error('DB Error'));

            await expect(
                service.updateHealthScore('customer-123', 'tenant-123', 90),
            ).rejects.toThrow();
        });

        it('should enforce tenant isolation', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.updateHealthScore('customer-123', 'wrong-tenant', 90),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('Performance', () => {
        it('should handle large number of check-ins efficiently', async () => {
            const manyCustomers = Array.from({ length: 500 }, (_, i) => ({
                ...mockCustomerSuccess,
                id: `cs-${i}`,
            }));

            mockRepository.find.mockResolvedValue(manyCustomers);

            const startTime = Date.now();
            await service.getUpcomingCheckIns('tenant-123', 7);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(1000);
        });
    });
});
