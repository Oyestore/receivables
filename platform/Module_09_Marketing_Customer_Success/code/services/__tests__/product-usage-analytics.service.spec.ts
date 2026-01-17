import { Test, TestingModule } from '@nestjs/testing';
import { ProductUsageAnalyticsService } from '../product-usage-analytics.service';

describe('ProductUsageAnalyticsService', () => {
    let service: ProductUsageAnalyticsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ProductUsageAnalyticsService],
        }).compile();

        service = module.get<ProductUsageAnalyticsService>(ProductUsageAnalyticsService);
    });

    describe('trackFeatureUsage', () => {
        it('should track feature usage events', async () => {
            const result = await service.trackFeatureUsage({
                userId: 'user-123',
                featureName: 'invoice_creation',
                timestamp: new Date(),
            });

            expect(result).toBeDefined();
        });
    });

    describe('getFeatureAdoptionRate', () => {
        it('should calculate adoption rate', async () => {
            const result = await service.getFeatureAdoptionRate('invoice_creation', 'tenant-123');

            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
        });
    });

    describe('getUserJourney', () => {
        it('should return user journey steps', async () => {
            const result = await service.getUserJourney('user-123', 'tenant-123');

            expect(result).toBeDefined();
            expect(Array.isArray(result.steps)).toBe(true);
        });
    });
});
