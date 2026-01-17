import { Test, TestingModule } from '@nestjs/testing';
import { CulturalIntelligenceService } from './cultural-intelligence.service';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CulturalNormEntity } from '../entities/enhanced-globalization.entity';
import { TestFixtures } from '../../tests/fixtures';

describe('CulturalIntelligenceService (Enhanced)', () => {
    let service: CulturalIntelligenceService;
    let culturalNormRepo: any;

    beforeEach(async () => {
        culturalNormRepo = createMockRepository<CulturalNormEntity>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CulturalIntelligenceService,
                { provide: getRepositoryToken(CulturalNormEntity), useValue: culturalNormRepo },
            ],
        }).compile();

        service = module.get<CulturalIntelligenceService>(CulturalIntelligenceService);
    });

    describe('getCulturalNorms', () => {
        it('should retrieve cultural norms for region', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({ region: 'JP', category: 'business' }),
                TestFixtures.createMockCulturalNorm({ region: 'JP', category: 'social' }),
            ];

            culturalNormRepo.find.mockResolvedValue(mockNorms);

            const result = await service.getCulturalNorms('JP');

            expect(result).toHaveLength(2);
            expect(result.every(n => n.region === 'JP')).toBe(true);
        });
    });

    describe('analyzeCulturalContext', () => {
        it('should analyze cultural context for content', async () => {
            const content = { text: 'Business proposal', images: [] };

            const result = await service.analyzeCulturalContext(content, 'JP');

            expect(result.recommendations).toBeDefined();
            expect(result.culturalScore).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getCulturalInsights', () => {
        it('should provide cultural insights for multi-region campaigns', async () => {
            const regions = ['US', 'JP', 'CN'];

            const result = await service.getCulturalInsights(regions);

            expect(result).toHaveLength(3);
            expect(result.every(r => r.region)).toBe(true);
        });
    });

    describe('detectCulturalMisalignment', () => {
        it('should detect cultural misalignments', async () => {
            const content = { colors: ['white'], symbols: ['thumbs-up'] };

            const result = await service.detectCulturalMisalignment(content, 'CN');

            expect(result.issues).toBeDefined();
            expect(result.severity).toMatch(/low|medium|high|critical/);
        });
    });

    describe('suggestCulturalAdaptations', () => {
        it('should suggest cultural adaptations', async () => {
            const content = { greeting: 'Hi there!' };

            const result = await service.suggestCulturalAdaptations(content, 'JP', 'business');

            expect(result.suggestions).toBeDefined();
            expect(result.suggestions.length).toBeGreaterThan(0);
        });
    });
});
