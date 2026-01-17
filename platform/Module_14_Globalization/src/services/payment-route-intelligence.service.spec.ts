import { Test, TestingModule } from '@nestjs/testing';
import { PaymentRouteIntelligenceService } from './payment-route-intelligence.service';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentRouteEntity } from '../entities/intelligence.entity';
import { TestFixtures } from '../../tests/fixtures';

describe('PaymentRouteIntelligenceService', () => {
    let service: PaymentRouteIntelligenceService;
    let paymentRouteRepo: any;

    beforeEach(async () => {
        paymentRouteRepo = createMockRepository<PaymentRouteEntity>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentRouteIntelligenceService,
                { provide: getRepositoryToken(PaymentRouteEntity), useValue: paymentRouteRepo },
            ],
        }).compile();

        service = module.get<PaymentRouteIntelligenceService>(PaymentRouteIntelligenceService);
    });

    describe('optimizePaymentRoute', () => {
        it('should optimize route based on speed priority', async () => {
            const mockRoutes = [
                TestFixtures.createMockPaymentRoute({ averageDays: 1, averageCost: 50 }),
                TestFixtures.createMockPaymentRoute({ averageDays: 5, averageCost: 10 }),
            ];

            paymentRouteRepo.find.mockResolvedValue(mockRoutes);

            const result = await service.optimizePaymentRoute('US', 'UK', 'speed');

            expect(result.averageDays).toBe(1); // Fastest route selected
        });

        it('should optimize route based on cost priority', async () => {
            const mockRoutes = [
                TestFixtures.createMockPaymentRoute({ averageDays: 1, averageCost: 50 }),
                TestFixtures.createMockPaymentRoute({ averageDays: 5, averageCost: 10 }),
            ];

            paymentRouteRepo.find.mockResolvedValue(mockRoutes);

            const result = await service.optimizePaymentRoute('US', 'UK', 'cost');

            expect(result.averageCost).toBe(10); // Cheapest route selected
        });

        it('should balance speed and cost for balanced priority', async () => {
            const mockRoutes = [
                TestFixtures.createMockPaymentRoute({
                    averageDays: 3,
                    averageCost: 25,
                    successRate: 98,
                }),
            ];

            paymentRouteRepo.find.mockResolvedValue(mockRoutes);

            const result = await service.optimizePaymentRoute('US', 'EU', 'balanced');

            expect(result).toBeDefined();
            expect(result.averageDays).toBeLessThanOrEqual(5);
            expect(result.averageCost).toBeLessThanOrEqual(50);
        });
    });

    describe('calculateRouteCost', () => {
        it('should calculate total route cost with fees', async () => {
            const route = TestFixtures.createMockPaymentRoute({
                averageCost: 25,
                fromCountry: 'US',
                toCountry: 'UK',
            });

            const result = await service.calculateRouteCost(route, 10000);

            expect(result.baseCost).toBe(25);
            expect(result.totalCost).toBeGreaterThanOrEqual(25);
            expect(result.percentageFee).toBeDefined();
        });

        it('should apply volume discounts for large amounts', async () => {
            const route = TestFixtures.createMockPaymentRoute({ averageCost: 50 });

            const small = await service.calculateRouteCost(route, 1000);
            const large = await service.calculateRouteCost(route, 100000);

            expect(large.discount).toBeGreaterThan(small.discount);
        });
    });

    describe('predictRouteDuration', () => {
        it('should predict payment duration', async () => {
            const route = TestFixtures.createMockPaymentRoute({ averageDays: 3 });

            const result = await service.predictRouteDuration(route, 'standard');

            expect(result.estimatedDays).toBe(3);
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should adjust for express processing', async () => {
            const route = TestFixtures.createMockPaymentRoute({ averageDays: 3 });

            const standard = await service.predictRouteDuration(route, 'standard');
            const express = await service.predictRouteDuration(route, 'express');

            expect(express.estimatedDays).toBeLessThan(standard.estimatedDays);
        });
    });

    describe('analyzeRouteReliability', () => {
        it('should analyze route success rate and reliability', async () => {
            const route = TestFixtures.createMockPaymentRoute({
                successRate: 98.5,
                averageDays: 3,
            });

            const result = await service.analyzeRouteReliability(route);

            expect(result.reliabilityScore).toBeGreaterThan(90);
            expect(result.rating).toMatch(/excellent|good|fair|poor/);
        });

        it('should flag low reliability routes', async () => {
            const route = TestFixtures.createMockPaymentRoute({ successRate: 75 });

            const result = await service.analyzeRouteReliability(route);

            expect(result.warning).toBeDefined();
            expect(result.reliabilityScore).toBeLessThan(80);
        });
    });

    describe('compareRoutes', () => {
        it('should compare multiple routes', async () => {
            const routes = [
                TestFixtures.createMockPaymentRoute({
                    paymentMethod: 'SWIFT',
                    averageDays: 3,
                    averageCost: 25,
                }),
                TestFixtures.createMockPaymentRoute({
                    paymentMethod: 'Wire',
                    averageDays: 5,
                    averageCost: 15,
                }),
            ];

            const result = await service.compareRoutes(routes);

            expect(result.fastest).toBe('SWIFT');
            expect(result.cheapest).toBe('Wire');
            expect(result.recommended).toBeDefined();
        });
    });

    describe('getRoutesByPerformance', () => {
        it('should filter routes by performance metrics', async () => {
            const mockRoutes = [
                TestFixtures.createMockPaymentRoute({ successRate: 99, averageDays: 2 }),
                TestFixtures.createMockPaymentRoute({ successRate: 85, averageDays: 7 }),
            ];

            paymentRouteRepo.find.mockResolvedValue(mockRoutes);

            const result = await service.getRoutesByPerformance({ minSuccessRate: 95, maxDays: 5 });

            expect(result).toHaveLength(1);
            expect(result[0].successRate).toBeGreaterThanOrEqual(95);
        });
    });

    describe('getHistoricalPerformance', () => {
        it('should return historical performance data', async () => {
            const route = TestFixtures.createMockPaymentRoute();

            const result = await service.getHistoricalPerformance(route.id, 'month');

            expect(result.period).toBe('month');
            expect(result.dataPoints).toBeDefined();
            expect(result.averageSuccess).toBeGreaterThan(0);
        });
    });

    describe('recommendAlternativeRoutes', () => {
        it('should recommend alternatives if primary route fails', async () => {
            const primaryRoute = TestFixtures.createMockPaymentRoute({
                fromCountry: 'US',
                toCountry: 'UK',
                isRecommended: true,
            });

            const alternativeRoutes = [
                TestFixtures.createMockPaymentRoute({ fromCountry: 'US', toCountry: 'UK' }),
            ];

            paymentRouteRepo.find.mockResolvedValue(alternativeRoutes);

            const result = await service.recommendAlternativeRoutes(primaryRoute);

            expect(result).toHaveLength(1);
            expect(result[0].fromCountry).toBe('US');
            expect(result[0].toCountry).toBe('UK');
        });
    });

    describe('calculateROI', () => {
        it('should calculate ROI for route selection', async () => {
            const route = TestFixtures.createMockPaymentRoute({
                averageCost: 25,
                averageDays: 3,
                successRate: 98,
            });

            const result = await service.calculateROI(route, 10000, 'monthly');

            expect(result.totalSavings).toBeDefined();
            expect(result.roi).toBeGreaterThan(0);
        });
    });

    describe('getRegionalAvailability', () => {
        it('should check route availability for regions', async () => {
            const mockRoutes = [
                TestFixtures.createMockPaymentRoute({ fromCountry: 'US' }),
                TestFixtures.createMockPaymentRoute({ fromCountry: 'UK' }),
            ];

            paymentRouteRepo.find.mockResolvedValue(mockRoutes);

            const result = await service.getRegionalAvailability('US');

            expect(result.availableDestinations).toBeDefined();
            expect(result.totalRoutes).toBe(2);
        });
    });
});
