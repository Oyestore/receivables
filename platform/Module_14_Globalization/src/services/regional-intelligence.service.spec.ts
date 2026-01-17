import { Test, TestingModule } from '@nestjs/testing';
import { RegionalIntelligenceService } from './regional-intelligence.service';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegionalPresetEntity } from '../entities/enhanced-globalization.entity';
import { TestFixtures } from '../../tests/fixtures';

describe('RegionalIntelligenceService', () => {
    let service: RegionalIntelligenceService;
    let regionalPresetRepo: any;

    beforeEach(async () => {
        regionalPresetRepo = createMockRepository<RegionalPresetEntity>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RegionalIntelligenceService,
                { provide: getRepositoryToken(RegionalPresetEntity), useValue: regionalPresetRepo },
            ],
        }).compile();

        service = module.get<RegionalIntelligenceService>(RegionalIntelligenceService);
    });

    describe('getRegionalPreset', () => {
        it('should return regional preset', async () => {
            const mockPreset = TestFixtures.createMockRegionalPreset({ region: 'EU' });

            regionalPresetRepo.findOne.mockResolvedValue(mockPreset);

            const result = await service.getRegionalPreset('EU');

            expect(result.region).toBe('EU');
        });
    });

    describe('getAllPresets', () => {
        it('should return all regional presets', async () => {
            const mockPresets = [
                TestFixtures.createMockRegionalPreset({ region: 'US' }),
                TestFixtures.createMockRegionalPreset({ region: 'EU' }),
            ];

            regionalPresetRepo.find.mockResolvedValue(mockPresets);

            const result = await service.getAllPresets();

            expect(result).toHaveLength(2);
        });
    });

    describe('getDefaultPreset', () => {
        it('should return default preset for region', async () => {
            const mockPreset = TestFixtures.createMockRegionalPreset({ isDefault: true });

            regionalPresetRepo.findOne.mockResolvedValue(mockPreset);

            const result = await service.getDefaultPreset('US');

            expect(result.isDefault).toBe(true);
        });
    });

    describe('analyzeRegionalTrends', () => {
        it('should analyze regional preferences', async () => {
            const result = await service.analyzeRegionalTrends('APAC', 'monthly');

            expect(result.trends).toBeDefined();
            expect(result.period).toBe('monthly');
        });
    });
});
