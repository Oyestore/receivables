import { Test, TestingModule } from '@nestjs/testing';
import { PaymentIntelligenceService } from './payment-intelligence.service';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentRouteEntity } from '../entities/intelligence.entity';
import { TestFixtures } from '../../tests/fixtures';

describe('PaymentIntelligenceService', () => {
    let service: PaymentIntelligenceService;
    let paymentRouteRepo: any;

    beforeEach(async () => {
        paymentRouteRepo = createMockRepository<PaymentRouteEntity>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentIntelligenceService,
                {
                    provide: getRepositoryToken(PaymentRouteEntity),
                    useValue: paymentRouteRepo,
                },
            ],
        }).compile();

        service = module.get<PaymentIntelligenceService>(PaymentIntelligenceService);
    });

    describe('getOptimalPaymentRoute', () => {
        it('should return optimal payment route for corridor', async () => {
            const mockRoutes = [
                TestFixtures.createMockPaymentRoute({
                    fromCountry: 'US',
                    toCountry: 'UK',
                    paymentMethod: 'SWIFT',
                    averageDays: 3,
                    averageCost: 25,
                    successRate: 98.5,
                    isRecommended: true,
                }),
                TestFixtures.createMockPaymentRoute({
                    fromCountry: 'US',
                    toCountry: 'UK',
                    paymentMethod: 'Wire',
                    averageDays: 5,
                    averageCost: 15,
                    successRate: 95.0,
                    isRecommended: false,
                }),
            ];

            paymentRouteRepo.find.mockResolvedValue(mockRoutes);

            const result = await service.getOptimalPaymentRoute('US', 'UK');

            expect(result).toBeDefined();
            expect(result.paymentMethod).toBe('SWIFT');
            expect(result.isRecommended).toBe(true);
        });

        it('should prioritize by success rate', async () => {
            const mockRoutes = [
                TestFixtures.createMockPaymentRoute({ successRate: 95.0 }),
                TestFixtures.createMockPaymentRoute({ successRate: 99.0 }),
            ];

            paymentRouteRepo.find.mockResolvedValue(mockRoutes);

            const result = await service.getOptimalPaymentRoute('US', 'UK');

            expect(result.successRate).toBeGreaterThanOrEqual(95.0);
        });

        it('should handle no available routes', async () => {
            paymentRouteRepo.find.mockResolvedValue([]);

            await expect(service.getOptimalPaymentRoute('XX', 'YY')).rejects.toThrow('No payment routes available');
        });
    });

    describe('calculatePaymentCost', () => {
        it('should calculate total payment cost', async () => {
            const route = TestFixtures.createMockPaymentRoute({
                averageCost: 25,
            });

            paymentRouteRepo.findOne.mockResolvedValue(route);

            const result = await service.calculatePaymentCost(1000, 'US', 'UK', 'SWIFT');

            expect(result.baseCost).toBe(25);
            expect(result.totalCost).toBeGreaterThanOrEqual(25);
        });
    });

    describe('getPaymentRoutesByCountry', () => {
        it('should return all routes from country', async () => {
            const mockRoutes = [
                TestFixtures.createMockPaymentRoute({ fromCountry: 'US', toCountry: 'UK' }),
                TestFixtures.createMockPaymentRoute({ fromCountry: 'US', toCountry: 'EU' }),
            ];

            paymentRouteRepo.find.mockResolvedValue(mockRoutes);

            const result = await service.getPaymentRoutesByCountry('US');

            expect(result).toHaveLength(2);
            expect(result.every(r => r.fromCountry === 'US')).toBe(true);
        });
    });

    describe('analyzePaymentPerformance', () => {
        it('should analyze route performance metrics', async () => {
            const route = TestFixtures.createMockPaymentRoute({
                successRate: 98.5,
                averageDays: 3,
            });

            const result = await service.analyzePaymentPerformance(route);

            expect(result.performanceScore).toBeGreaterThan(0);
            expect(result.reliability).toBeDefined();
        });
    });
});
