import { Test, TestingModule } from '@nestjs/testing';
import { CommunityIntelligenceService } from '../community-intelligence.service';

describe('CommunityIntelligenceService', () => {
    let service: CommunityIntelligenceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CommunityIntelligenceService],
        }).compile();

        service = module.get<CommunityIntelligenceService>(CommunityIntelligenceService);
    });

    describe('getNetworkInsights', () => {
        it('should return community network insights', async () => {
            const result = await service.getNetworkInsights('tenant-123');

            expect(result).toBeDefined();
            expect(result.networkStrength).toBeGreaterThanOrEqual(0);
        });
    });

    describe('analyzePeerComparisons', () => {
        it('should provide peer comparison data', async () => {
            const result = await service.analyzePeerComparisons('customer-123', 'tenant-123');

            expect(result.peerGroup).toBeDefined();
            expect(result.percentileRank).toBeGreaterThanOrEqual(0);
        });
    });
});
