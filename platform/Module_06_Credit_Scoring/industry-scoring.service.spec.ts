import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IndustryScoringService } from './industry-scoring.service';
import { IndustryRiskProfile } from './industry-risk-profile.entity';

describe('IndustryScoringService', () => {
    let service: IndustryScoringService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IndustryScoringService,
                {
                    provide: getRepositoryToken(IndustryRiskProfile),
                    useValue: {
                        findOne: jest.fn(),
                        find: jest.fn(),
                        save: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<IndustryScoringService>(IndustryScoringService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getIndustryScore', () => {
        it('should return score for known industry', async () => {
            const mockProfile = {
                industryCode: 'C2520',
                baselineScore: 75,
                riskFactors: [],
            };

            jest.spyOn(service as any, 'industryRepo').mockReturnValue({
                findOne: jest.fn().mockResolvedValue(mockProfile),
            });

            const score = await (service as any).getIndustryScore('C2520');

            expect(score).toBeDefined();
            expect(score).toBeGreaterThan(0);
        });

        it('should return default score for unknown industry', async () => {
            const score = await (service as any).getIndustryScore('UNKNOWN');

            expect(score).toBe(50); // Default neutral score
        });
    });

    describe('industry risk adjustment', () => {
        it('should apply cyclical industry adjustments', () => {
            const baseScore = 75;
            const adjusted = (service as any).applyCyclicalAdjustment(baseScore, 'RETAIL');

            expect(adjusted).toBeDefined();
        });
    });
});
