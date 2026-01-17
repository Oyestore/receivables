import { Test, TestingModule } from '@nestjs/testing';
import { RevenueAnalyticsService } from '../revenue-analytics.service';

describe('RevenueAnalyticsService', () => {
    let service: RevenueAnalyticsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RevenueAnalyticsService],
        }).compile();

        service = module.get<RevenueAnalyticsService>(RevenueAnalyticsService);
    });

    describe('calculateMRR', () => {
        it('should calculate monthly recurring revenue', async () => {
            const result = await service.calculateMRR('tenant-123');

            expect(result).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getCohortAnalysis', () => {
        it('should return cohort revenue data', async () => {
            const result = await service.getCohortAnalysis('tenant-123', new Date('2026-01-01'));

            expect(result).toBeDefined();
            expect(result.cohortSize).toBeGreaterThanOrEqual(0);
        });
    });

    describe('calculateLTV', () => {
        it('should calculate customer lifetime value', async () => {
            const result = await service.calculateLTV('customer-123', 'tenant-123');

            expect(result).toBeGreaterThanOrEqual(0);
        });
    });
});
