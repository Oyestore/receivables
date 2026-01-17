import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerHealthService } from '../customer-health.service';
import { CustomerHealth } from '../../entities/customer-health.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';

describe('CustomerHealthService', () => {
    let service: CustomerHealthService;
    let repository: Repository<CustomerHealth>;
    let eventEmitter: EventEmitter2;

    const mockCustomerHealth = {
        id: 'health-123',
        customerId: 'customer-123',
        tenantId: 'tenant-123',
        healthScore: 75,
        engagementScore: 70,
        usageScore: 80,
        paymentScore: 75,
        supportScore: 70,
        riskLevel: 'medium',
        lastActivity: new Date('2026-01-10'),
        updatedAt: new Date(),
        createdAt: new Date(),
    };

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerHealthService,
                {
                    provide: getRepositoryToken(CustomerHealth),
                    useValue: mockRepository,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<CustomerHealthService>(CustomerHealthService);
        repository = module.get<Repository<CustomerHealth>>(
            getRepositoryToken(CustomerHealth),
        );
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

    describe('calculateHealthScore', () => {
        it('should calculate health score from all components', async () => {
            const metrics = {
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                engagement: 80,
                usage: 75,
                payment: 90,
                support: 70,
            };

            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockReturnValue({
                ...mockCustomerHealth,
                engagementScore: 80,
                usageScore: 75,
                paymentScore: 90,
                supportScore: 70,
            });
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.calculateHealthScore(metrics);

            expect(result.healthScore).toBeDefined();
            expect(result.healthScore).toBeGreaterThan(0);
            expect(result.healthScore).toBeLessThanOrEqual(100);
            expect(repository.save).toHaveBeenCalled();
        });

        it('should weight engagement heavily in calculation', async () => {
            const highEngagement = {
                customerId: 'cust-1',
                tenantId: 'tenant-123',
                engagement: 100,
                usage: 50,
                payment: 50,
                support: 50,
            };

            const lowEngagement = {
                customerId: 'cust-2',
                tenantId: 'tenant-123',
                engagement: 0,
                usage: 50,
                payment: 50,
                support: 50,
            };

            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockImplementation(data => data);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const highResult = await service.calculateHealthScore(highEngagement);
            const lowResult = await service.calculateHealthScore(lowEngagement);

            expect(highResult.healthScore).toBeGreaterThan(lowResult.healthScore);
        });

        it('should update existing health record', async () => {
            const metrics = {
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                engagement: 85,
                usage: 80,
                payment: 95,
                support: 75,
            };

            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.calculateHealthScore(metrics);

            expect(repository.findOne).toHaveBeenCalled();
            expect(repository.save).toHaveBeenCalled();
            expect(result.id).toBe('health-123');
        });

        it('should emit health score changed event', async () => {
            const metrics = {
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                engagement: 90,
                usage: 85,
                payment: 95,
                support: 80,
            };

            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockReturnValue(mockCustomerHealth);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            await service.calculateHealthScore(metrics);

            expect(eventEmitter.emit).toHaveBeenCalledWith('customer.health.changed', {
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                healthScore: expect.any(Number),
                riskLevel: expect.any(String),
            });
        });

        it('should categorize risk level correctly', async () => {
            const testCases = [
                { scores: [90, 85, 95, 80], expectedRisk: 'low' },
                { scores: [70, 65, 75, 60], expectedRisk: 'medium' },
                { scores: [40, 35, 45, 30], expectedRisk: 'high' },
                { scores: [15, 10, 20, 15], expectedRisk: 'critical' },
            ];

            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockImplementation(data => data);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            for (const testCase of testCases) {
                const metrics = {
                    customerId: 'customer-123',
                    tenantId: 'tenant-123',
                    engagement: testCase.scores[0],
                    usage: testCase.scores[1],
                    payment: testCase.scores[2],
                    support: testCase.scores[3],
                };

                const result = await service.calculateHealthScore(metrics);
                expect(result.riskLevel).toBe(testCase.expectedRisk);
            }
        });
    });

    describe('getHealthScore', () => {
        it('should return health score for customer', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);

            const result = await service.getHealthScore('customer-123', 'tenant-123');

            expect(result).toEqual(mockCustomerHealth);
            expect(repository.findOne).toHaveBeenCalledWith({
                where: { customerId: 'customer-123', tenantId: 'tenant-123' },
            });
        });

        it('should throw NotFoundException when health data not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.getHealthScore('non-existent', 'tenant-123'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should enforce tenant isolation', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.getHealthScore('customer-123', 'wrong-tenant'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getAllHealthScores', () => {
        const healthScores = [
            mockCustomerHealth,
            { ...mockCustomerHealth, id: 'health-456', customerId: 'customer-456' },
        ];

        it('should return all health scores for tenant', async () => {
            mockRepository.find.mockResolvedValue(healthScores);

            const result = await service.getAllHealthScores('tenant-123');

            expect(result).toEqual(healthScores);
            expect(repository.find).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-123' },
                order: { healthScore: 'DESC' },
            });
        });

        it('should filter by risk level', async () => {
            const highRiskScores = [
                { ...mockCustomerHealth, riskLevel: 'high' },
                { ...mockCustomerHealth, id: 'health-789', riskLevel: 'critical' },
            ];

            mockRepository.find.mockResolvedValue(highRiskScores);

            const result = await service.getAllHealthScores('tenant-123', { riskLevel: 'high' });

            expect(repository.find).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-123', riskLevel: 'high' },
                order: { healthScore: 'DESC' },
            });
        });

        it('should sort by health score descending', async () => {
            const unsortedScores = [
                { ...mockCustomerHealth, healthScore: 50 },
                { ...mockCustomerHealth, healthScore: 90 },
                { ...mockCustomerHealth, healthScore: 70 },
            ];

            mockRepository.find.mockResolvedValue(unsortedScores);

            await service.getAllHealthScores('tenant-123');

            expect(repository.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    order: { healthScore: 'DESC' },
                }),
            );
        });
    });

    describe('getAtRiskCustomers', () => {
        it('should return customers with high/critical risk', async () => {
            const atRiskCustomers = [
                { ...mockCustomerHealth, riskLevel: 'high', healthScore: 35 },
                { ...mockCustomerHealth, id: 'health-456', riskLevel: 'critical', healthScore: 15 },
            ];

            mockRepository.find.mockResolvedValue(atRiskCustomers);

            const result = await service.getAtRiskCustomers('tenant-123');

            expect(result.length).toBeGreaterThan(0);
            expect(result.every(r => ['high', 'critical'].includes(r.riskLevel))).toBe(true);
        });

        it('should support custom threshold', async () => {
            const customers = [
                { ...mockCustomerHealth, healthScore: 65 },
                { ...mockCustomerHealth, healthScore: 35 },
                { ...mockCustomerHealth, healthScore: 15 },
            ];

            mockRepository.find.mockResolvedValue(customers);

            const result = await service.getAtRiskCustomers('tenant-123', 50);

            expect(result.every(r => r.healthScore < 50)).toBe(true);
        });

        it('should order by health score ascending (worst first)', async () => {
            const customers = [
                { ...mockCustomerHealth, healthScore: 40 },
                { ...mockCustomerHealth, healthScore: 20 },
                { ...mockCustomerHealth, healthScore: 35 },
            ];

            mockRepository.find.mockResolvedValue(customers);

            await service.getAtRiskCustomers('tenant-123');

            expect(repository.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    order: { healthScore: 'ASC' },
                }),
            );
        });
    });

    describe('updateEngagementScore', () => {
        it('should update engagement and recalculate health', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.updateEngagementScore(
                'customer-123',
                'tenant-123',
                85,
            );

            expect(result.engagementScore).toBe(85);
            expect(repository.save).toHaveBeenCalled();
        });

        it('should validate score is between 0-100', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);

            await expect(
                service.updateEngagementScore('customer-123', 'tenant-123', 150),
            ).rejects.toThrow();

            await expect(
                service.updateEngagementScore('customer-123', 'tenant-123', -10),
            ).rejects.toThrow();
        });

        it('should emit engagement changed event', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            await service.updateEngagementScore('customer-123', 'tenant-123', 90);

            expect(eventEmitter.emit).toHaveBeenCalledWith('customer.engagement.changed', {
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                oldScore: mockCustomerHealth.engagementScore,
                newScore: 90,
            });
        });
    });

    describe('updateUsageScore', () => {
        it('should update usage and recalculate health', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.updateUsageScore('customer-123', 'tenant-123', 95);

            expect(result.usageScore).toBe(95);
            expect(repository.save).toHaveBeenCalled();
        });

        it('should update lastActivity timestamp', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const beforeUpdate = new Date();
            const result = await service.updateUsageScore('customer-123', 'tenant-123', 85);

            expect(result.lastActivity).toBeDefined();
            expect(new Date(result.lastActivity).getTime()).toBeGreaterThanOrEqual(
                beforeUpdate.getTime(),
            );
        });
    });

    describe('recordActivity', () => {
        it('should update lastActivity timestamp', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.recordActivity('customer-123', 'tenant-123');

            expect(result.lastActivity).toBeDefined();
            expect(repository.save).toHaveBeenCalled();
        });

        it('should increment activity counter if exists', async () => {
            const customerWithActivity = {
                ...mockCustomerHealth,
                activityCount: 10,
            };

            mockRepository.findOne.mockResolvedValue(customerWithActivity);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.recordActivity('customer-123', 'tenant-123');

            expect(result.activityCount).toBe(11);
        });
    });

    describe('getHealthTrend', () => {
        it('should return health trend over time', async () => {
            const historicalData = [
                { ...mockCustomerHealth, healthScore: 60, updatedAt: new Date('2025-10-01') },
                { ...mockCustomerHealth, healthScore: 70, updatedAt: new Date('2025-11-01') },
                { ...mockCustomerHealth, healthScore: 75, updatedAt: new Date('2025-12-01') },
            ];

            mockRepository.find.mockResolvedValue(historicalData);

            const result = await service.getHealthTrend('customer-123', 'tenant-123', 90);

            expect(result).toHaveProperty('trend');
            expect(result).toHaveProperty('direction');
            expect(result.dataPoints.length).toBe(3);
        });

        it('should calculate trend direction', async () => {
            const improvingData = [
                { ...mockCustomerHealth, healthScore: 50, updatedAt: new Date('2025-10-01') },
                { ...mockCustomerHealth, healthScore: 75, updatedAt: new Date('2026-01-01') },
            ];

            mockRepository.find.mockResolvedValue(improvingData);

            const result = await service.getHealthTrend('customer-123', 'tenant-123', 90);

            expect(result.direction).toBe('improving');
        });

        it('should handle declining trend', async () => {
            const decliningData = [
                { ...mockCustomerHealth, healthScore: 85, updatedAt: new Date('2025-10-01') },
                { ...mockCustomerHealth, healthScore: 45, updatedAt: new Date('2026-01-01') },
            ];

            mockRepository.find.mockResolvedValue(decliningData);

            const result = await service.getHealthTrend('customer-123', 'tenant-123', 90);

            expect(result.direction).toBe('declining');
        });
    });

    describe('Edge Cases & Error Handling', () => {
        it('should handle null score values', async () => {
            const metrics = {
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                engagement: null,
                usage: 50,
                payment: 75,
                support: undefined,
            };

            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockImplementation(data => data);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const result = await service.calculateHealthScore(metrics as any);

            expect(result).toBeDefined();
            expect(result.healthScore).toBeGreaterThanOrEqual(0);
        });

        it('should handle database errors gracefully', async () => {
            mockRepository.findOne.mockRejectedValue(new Error('Database error'));

            await expect(
                service.getHealthScore('customer-123', 'tenant-123'),
            ).rejects.toThrow('Database error');
        });

        it('should handle concurrent score updates', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const promises = [
                service.updateEngagementScore('customer-123', 'tenant-123', 80),
                service.updateUsageScore('customer-123', 'tenant-123', 75),
                service.updateEngagementScore('customer-123', 'tenant-123', 85),
            ];

            const results = await Promise.all(promises);

            expect(results.length).toBe(3);
            expect(results.every(r => r.id === 'health-123')).toBe(true);
        });
    });

    describe('Performance', () => {
        it('should handle large batch health score calculations efficiently', async () => {
            const customers = Array.from({ length: 1000 }, (_, i) => ({
                customerId: `customer-${i}`,
                tenantId: 'tenant-123',
                engagement: Math.random() * 100,
                usage: Math.random() * 100,
                payment: Math.random() * 100,
                support: Math.random() * 100,
            }));

            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockImplementation(data => data);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const startTime = Date.now();
            await Promise.all(customers.map(c => service.calculateHealthScore(c)));
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(10000); // < 10 seconds for 1000 customers
        });

        it('should complete health score calculation within acceptable time', async () => {
            const metrics = {
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                engagement: 75,
                usage: 80,
                payment: 85,
                support: 70,
            };

            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockReturnValue(mockCustomerHealth);
            mockRepository.save.mockImplementation(data => Promise.resolve(data));

            const startTime = Date.now();
            await service.calculateHealthScore(metrics);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(500); // < 500ms
        });
    });
});
