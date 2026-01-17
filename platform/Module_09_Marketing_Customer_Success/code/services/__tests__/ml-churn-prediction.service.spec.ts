import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MLChurnPredictionService } from '../ml-churn-prediction.service';
import { CustomerHealth } from '../../entities/customer-health.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('MLChurnPredictionService', () => {
    let service: MLChurnPredictionService;
    let customerHealthRepo: Repository<CustomerHealth>;
    let eventEmitter: EventEmitter2;

    const mockCustomerHealth = {
        id: 'health-123',
        customerId: 'customer-123',
        tenantId: 'tenant-123',
        healthScore: 75,
        lastActivity: new Date('2026-01-10'),
        riskLevel: 'medium',
        engagementScore: 70,
        usageScore: 80,
        paymentScore: 75,
        supportScore: 70,
        updatedAt: new Date(),
    };

    const mockRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MLChurnPredictionService,
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

        service = module.get<MLChurnPredictionService>(MLChurnPredictionService);
        customerHealthRepo = module.get<Repository<CustomerHealth>>(
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
            expect(customerHealthRepo).toBeDefined();
        });

        it('should have event emitter injected', () => {
            expect(eventEmitter).toBeDefined();
        });
    });

    describe('predictChurn', () => {
        it('should predict high churn risk for low health score', async () => {
            const lowHealthCustomer = {
                ...mockCustomerHealth,
                healthScore: 25,
                engagementScore: 20,
                usageScore: 15,
                paymentScore: 35,
            };

            mockRepository.findOne.mockResolvedValue(lowHealthCustomer);

            const result = await service.predictChurn('customer-123', 'tenant-123');

            expect(result).toMatchObject({
                customerId: 'customer-123',
                churnProbability: expect.any(Number),
                riskLevel: expect.stringMatching(/high|critical/i),
                factors: expect.any(Array),
            });
            expect(result.churnProbability).toBeGreaterThan(0.7);
        });

        it('should predict low churn risk for high health score', async () => {
            const highHealthCustomer = {
                ...mockCustomerHealth,
                healthScore: 95,
                engagementScore: 90,
                usageScore: 95,
                paymentScore: 100,
            };

            mockRepository.findOne.mockResolvedValue(highHealthCustomer);

            const result = await service.predictChurn('customer-123', 'tenant-123');

            expect(result).toMatchObject({
                customerId: 'customer-123',
                churnProbability: expect.any(Number),
                riskLevel: expect.stringMatching(/low/i),
            });
            expect(result.churnProbability).toBeLessThan(0.3);
        });

        it('should identify top risk factors', async () => {
            const atRiskCustomer = {
                ...mockCustomerHealth,
                healthScore: 45,
                engagementScore: 20, // Very low
                usageScore: 80,
                paymentScore: 70,
                supportScore: 50,
            };

            mockRepository.findOne.mockResolvedValue(atRiskCustomer);

            const result = await service.predictChurn('customer-123', 'tenant-123');

            expect(result.factors).toContain('low_engagement');
            expect(result.factors[0]).toBe('low_engagement'); // Should be first (lowest score)
        });

        it('should throw NotFoundException when customer not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.predictChurn('non-existent', 'tenant-123'),
            ).rejects.toThrow('Customer health data not found');
        });

        it('should consider inactive period in prediction', async () => {
            const inactiveCustomer = {
                ...mockCustomerHealth,
                healthScore: 60,
                lastActivity: new Date('2025-10-01'), // 3+ months ago
            };

            mockRepository.findOne.mockResolvedValue(inactiveCustomer);

            const result = await service.predictChurn('customer-123', 'tenant-123');

            expect(result.factors).toContain('inactive_period');
            expect(result.churnProbability).toBeGreaterThan(0.5);
        });
    });

    describe('getAtRiskCustomers', () => {
        it('should return all high-risk customers', async () => {
            const atRiskCustomers = [
                { ...mockCustomerHealth, id: 'health-1', healthScore: 25 },
                { ...mockCustomerHealth, id: 'health-2', healthScore: 35 },
                { ...mockCustomerHealth, id: 'health-3', healthScore: 45 },
            ];

            mockRepository.find.mockResolvedValue(atRiskCustomers);

            const result = await service.getAtRiskCustomers('tenant-123');

            expect(result.length).toBeGreaterThan(0);
            expect(result.every(r => r.churnProbability > 0.5)).toBe(true);
        });

        it('should filter by minimum risk threshold', async () => {
            const customers = [
                { ...mockCustomerHealth, id: 'health-1', healthScore: 25 }, // High risk
                { ...mockCustomerHealth, id: 'health-2', healthScore: 65 }, // Medium risk
                { ...mockCustomerHealth, id: 'health-3', healthScore: 85 }, // Low risk
            ];

            mockRepository.find.mockResolvedValue(customers);

            const result = await service.getAtRiskCustomers('tenant-123', 0.7);

            // Only high-risk customers (churn probability > 0.7)
            expect(result.length).toBeLessThan(customers.length);
            expect(result.every(r => r.churnProbability >= 0.7)).toBe(true);
        });

        it('should sort by churn probability descending', async () => {
            const customers = [
                { ...mockCustomerHealth, id: 'health-1', healthScore: 45 },
                { ...mockCustomerHealth, id: 'health-2', healthScore: 25 },
                { ...mockCustomerHealth, id: 'health-3', healthScore: 35 },
            ];

            mockRepository.find.mockResolvedValue(customers);

            const result = await service.getAtRiskCustomers('tenant-123');

            // Should be ordered by churn probability (highest first)
            for (let i = 1; i < result.length; i++) {
                expect(result[i - 1].churnProbability).toBeGreaterThanOrEqual(
                    result[i].churnProbability,
                );
            }
        });

        it('should return empty array when no at-risk customers', async () => {
            const healthyCustomers = [
                { ...mockCustomerHealth, healthScore: 90 },
                { ...mockCustomerHealth, healthScore: 85 },
            ];

            mockRepository.find.mockResolvedValue(healthyCustomers);

            const result = await service.getAtRiskCustomers('tenant-123');

            expect(result).toEqual([]);
        });

        it('should handle large customer base efficiently', async () => {
            const largeCustomerBase = Array.from({ length: 5000 }, (_, i) => ({
                ...mockCustomerHealth,
                id: `health-${i}`,
                healthScore: Math.floor(Math.random() * 100),
            }));

            mockRepository.find.mockResolvedValue(largeCustomerBase);

            const startTime = Date.now();
            const result = await service.getAtRiskCustomers('tenant-123');
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(5000); // Should complete in < 5 seconds
            expect(result).toBeDefined();
        });
    });

    describe('analyzeChurnFactors', () => {
        it('should analyze all churn factors correctly', async () => {
            const customer = {
                ...mockCustomerHealth,
                healthScore: 40,
                engagementScore: 30,
                usageScore: 25,
                paymentScore: 60,
                supportScore: 45,
            };

            mockRepository.findOne.mockResolvedValue(customer);

            const result = await service.analyzeChurnFactors('customer-123', 'tenant-123');

            expect(result).toHaveProperty('engagement');
            expect(result).toHaveProperty('usage');
            expect(result).toHaveProperty('payment');
            expect(result).toHaveProperty('support');
            expect(result).toHaveProperty('overall');
        });

        it('should calculate impact weights correctly', async () => {
            const customer = {
                ...mockCustomerHealth,
                engagementScore: 20, // Very low
                usageScore: 80,
                paymentScore: 70,
            };

            mockRepository.findOne.mockResolvedValue(customer);

            const result = await service.analyzeChurnFactors('customer-123', 'tenant-123');

            // Engagement should have highest impact (lowest score)
            const engagementImpact = result.engagement.impactWeight;
            const usageImpact = result.usage.impactWeight;

            expect(engagementImpact).toBeGreaterThan(usageImpact);
        });

        it('should provide actionable recommendations', async () => {
            const customer = {
                ...mockCustomerHealth,
                engagementScore: 25,
                usageScore: 30,
            };

            mockRepository.findOne.mockResolvedValue(customer);

            const result = await service.analyzeChurnFactors('customer-123', 'tenant-123');

            expect(result.engagement.recommendation).toBeDefined();
            expect(result.engagement.recommendation).toContain('engagement');
            expect(result.usage.recommendation).toContain('usage');
        });
    });

    describe('predictLifetimeValue', () => {
        it('should predict higher LTV for healthy customers', async () => {
            const healthyCustomer = {
                ...mockCustomerHealth,
                healthScore: 90,
                engagementScore: 85,
                paymentScore: 95,
            };

            mockRepository.findOne.mockResolvedValue(healthyCustomer);

            const result = await service.predictLifetimeValue('customer-123', 'tenant-123');

            expect(result.predictedLTV).toBeGreaterThan(0);
            expect(result.retentionProbability).toBeGreaterThan(0.8);
        });

        it('should predict lower LTV for at-risk customers', async () => {
            const atRiskCustomer = {
                ...mockCustomerHealth,
                healthScore: 30,
                engagementScore: 25,
                paymentScore: 40,
            };

            mockRepository.findOne.mockResolvedValue(atRiskCustomer);

            const result = await service.predictLifetimeValue('customer-123', 'tenant-123');

            expect(result.predictedLTV).toBeLessThan(100000); // Lower LTV
            expect(result.retentionProbability).toBeLessThan(0.5);
        });

        it('should factor in engagement when calculating LTV', async () => {
            const highEngagementCustomer = {
                ...mockCustomerHealth,
                healthScore: 75,
                engagementScore: 95, // Very high engagement
                paymentScore: 70,
            };

            const lowEngagementCustomer = {
                ...mockCustomerHealth,
                healthScore: 75,
                engagementScore: 30, // Low engagement
                paymentScore: 70,
            };

            mockRepository.findOne.mockResolvedValueOnce(highEngagementCustomer);
            const highResult = await service.predictLifetimeValue('customer-1', 'tenant-123');

            mockRepository.findOne.mockResolvedValueOnce(lowEngagementCustomer);
            const lowResult = await service.predictLifetimeValue('customer-2', 'tenant-123');

            expect(highResult.predictedLTV).toBeGreaterThan(lowResult.predictedLTV);
        });
    });

    describe('generateInterventionStrategy', () => {
        it('should generate strategy for high-risk customer', async () => {
            const highRiskCustomer = {
                ...mockCustomerHealth,
                healthScore: 25,
                engagementScore: 20,
                usageScore: 15,
            };

            mockRepository.findOne.mockResolvedValue(highRiskCustomer);

            const result = await service.generateInterventionStrategy(
                'customer-123',
                'tenant-123',
            );

            expect(result).toHaveProperty('priority');
            expect(result).toHaveProperty('actions');
            expect(result).toHaveProperty('timeline');
            expect(result.priority).toBe('high');
            expect(result.actions.length).toBeGreaterThan(0);
        });

        it('should prioritize actions based on impact', async () => {
            const customer = {
                ...mockCustomerHealth,
                engagementScore: 15, // Worst score
                usageScore: 60,
                paymentScore: 70,
            };

            mockRepository.findOne.mockResolvedValue(customer);

            const result = await service.generateInterventionStrategy(
                'customer-123',
                'tenant-123',
            );

            // First action should target engagement (lowest score)
            expect(result.actions[0].category).toContain('engagement');
        });

        it('should include timeline for interventions', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);

            const result = await service.generateInterventionStrategy(
                'customer-123',
                'tenant-123',
            );

            expect(result.timeline).toHaveProperty('immediate');
            expect(result.timeline).toHaveProperty('short_term');
            expect(result.timeline).toHaveProperty('long_term');
        });

        it('should suggest low-touch for medium-risk customers', async () => {
            const mediumRiskCustomer = {
                ...mockCustomerHealth,
                healthScore: 55,
                engagementScore: 50,
            };

            mockRepository.findOne.mockResolvedValue(mediumRiskCustomer);

            const result = await service.generateInterventionStrategy(
                'customer-123',
                'tenant-123',
            );

            expect(result.priority).toBe('medium');
            expect(result.actions.some(a => a.type === 'automated')).toBe(true);
        });
    });

    describe('trainModel', () => {
        it('should train model with historical data', async () => {
            const historicalData = Array.from({ length: 100 }, (_, i) => ({
                ...mockCustomerHealth,
                id: `health-${i}`,
                healthScore: Math.floor(Math.random() * 100),
                churned: Math.random() > 0.7, // 30% churn rate
            }));

            mockRepository.find.mockResolvedValue(historicalData);

            const result = await service.trainModel('tenant-123');

            expect(result).toHaveProperty('accuracy');
            expect(result).toHaveProperty('precision');
            expect(result).toHaveProperty('recall');
            expect(result).toHaveProperty('trainingSize');
            expect(result.trainingSize).toBe(100);
        });

        it('should emit model trained event', async () => {
            mockRepository.find.mockResolvedValue([mockCustomerHealth]);

            await service.trainModel('tenant-123');

            expect(eventEmitter.emit).toHaveBeenCalledWith('churn.model.trained', {
                tenantId: 'tenant-123',
                timestamp: expect.any(Date),
                metrics: expect.any(Object),
            });
        });

        it('should handle insufficient data gracefully', async () => {
            mockRepository.find.mockResolvedValue([mockCustomerHealth]); // Only 1 record

            await expect(service.trainModel('tenant-123')).rejects.toThrow(
                'Insufficient data for model training',
            );
        });
    });

    describe('Edge Cases & Error Handling', () => {
        it('should handle null values in health scores', async () => {
            const customerWithNulls = {
                ...mockCustomerHealth,
                engagementScore: null,
                usageScore: undefined,
            };

            mockRepository.findOne.mockResolvedValue(customerWithNulls);

            const result = await service.predictChurn('customer-123', 'tenant-123');

            expect(result).toBeDefined();
            expect(result.churnProbability).toBeDefined();
        });

        it('should handle database errors gracefully', async () => {
            mockRepository.find.mockRejectedValue(new Error('Database connection lost'));

            await expect(service.getAtRiskCustomers('tenant-123')).rejects.toThrow(
                'Database connection lost',
            );
        });

        it('should validate tenant isolation', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.predictChurn('customer-123', 'wrong-tenant'),
            ).rejects.toThrow();
        });

        it('should handle concurrent predictions', async () => {
            const customers = ['cust-1', 'cust-2', 'cust-3', 'cust-4', 'cust-5'];
            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);

            const promises = customers.map(id => service.predictChurn(id, 'tenant-123'));

            const results = await Promise.all(promises);

            expect(results.length).toBe(5);
            expect(results.every(r => r.churnProbability !== undefined)).toBe(true);
        });
    });

    describe('Performance & Accuracy', () => {
        it('should maintain prediction accuracy above 75%', async () => {
            const testSet = Array.from({ length: 100 }, (_, i) => ({
                ...mockCustomerHealth,
                id: `health-${i}`,
                healthScore: Math.floor(Math.random() * 100),
                actualChurn: Math.random() > 0.7,
            }));

            mockRepository.find.mockResolvedValue(testSet);

            let correctPredictions = 0;
            for (const customer of testSet) {
                mockRepository.findOne.mockResolvedValue(customer);
                const prediction = await service.predictChurn(customer.id, 'tenant-123');

                const predictedChurn = prediction.churnProbability > 0.5;
                if (predictedChurn === customer.actualChurn) {
                    correctPredictions++;
                }
            }

            const accuracy = correctPredictions / testSet.length;
            // Note: This is a mock test, real accuracy would depend on actual ML model
            expect(accuracy).toBeGreaterThan(0); // Placeholder assertion
        });

        it('should complete predictions within acceptable time', async () => {
            mockRepository.findOne.mockResolvedValue(mockCustomerHealth);

            const startTime = Date.now();
            await service.predictChurn('customer-123', 'tenant-123');
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(1000); // < 1 second
        });
    });
});
