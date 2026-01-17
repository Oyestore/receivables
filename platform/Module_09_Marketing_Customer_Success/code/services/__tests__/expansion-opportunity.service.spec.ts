import { Test, TestingModule } from '@nestjs/testing';
import { ExpansionOpportunityService } from '../expansion-opportunity.service';

describe('ExpansionOpportunityService', () => {
    let service: ExpansionOpportunityService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ExpansionOpportunityService],
        }).compile();

        service = module.get<ExpansionOpportunityService>(ExpansionOpportunityService);
    });

    describe('detectUpsellOpportunities', () => {
        it('should identify upsell opportunities', async () => {
            const result = await service.detectUpsellOpportunities('customer-123', 'tenant-123');

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('calculateExpansionRevenue', () => {
        it('should calculate potential expansion revenue', async () => {
            const result = await service.calculateExpansionRevenue('customer-123', 'tenant-123');

            expect(result.potentialMRR).toBeGreaterThanOrEqual(0);
        });
    });
});
