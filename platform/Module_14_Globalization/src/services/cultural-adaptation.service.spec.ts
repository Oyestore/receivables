import { Test, TestingModule } from '@nestjs/testing';
import { CulturalAdaptationService } from './cultural-adaptation.service';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CulturalNormEntity, RegionalPresetEntity } from '../entities/enhanced-globalization.entity';
import { TestFixtures } from '../../tests/fixtures';

describe('CulturalAdaptationService', () => {
    let service: CulturalAdaptationService;
    let culturalNormRepo: any;
    let regionalPresetRepo: any;

    beforeEach(async () => {
        culturalNormRepo = createMockRepository<CulturalNormEntity>();
        regionalPresetRepo = createMockRepository<RegionalPresetEntity>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CulturalAdaptationService,
                { provide: getRepositoryToken(CulturalNormEntity), useValue: culturalNormRepo },
                { provide: getRepositoryToken(RegionalPresetEntity), useValue: regionalPresetRepo },
            ],
        }).compile();

        service = module.get<CulturalAdaptationService>(CulturalAdaptationService);
    });

    describe('adaptContentForCulture', () => {
        it('should adapt content for target culture', async () => {
            const content = {
                greeting: 'Hello',
                farewell: 'Goodbye',
                formality: 'casual',
            };

            const mockNorms = [
                TestFixtures.createMockCulturalNorm({
                    region: 'JP',
                    category: 'communication',
                    normKey: 'greeting.formal',
                    normValue: 'こんにちは',
                }),
            ];

            culturalNormRepo.find.mockResolvedValue(mockNorms);

            const result = await service.adaptContentForCulture(content, 'JP', 'formal');

            expect(result).toBeDefined();
            expect(culturalNormRepo.find).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ region: 'JP' }) })
            );
        });

        it('should handle different formality levels', async () => {
            const content = { message: 'Thank you' };

            const mockNorms = [
                TestFixtures.createMockCulturalNorm({ normKey: 'gratitude.formal' }),
                TestFixtures.createMockCulturalNorm({ normKey: 'gratitude.casual' }),
            ];

            culturalNormRepo.find.mockResolvedValue(mockNorms);

            const formal = await service.adaptContentForCulture(content, 'JP', 'formal');
            const casual = await service.adaptContentForCulture(content, 'JP', 'casual');

            expect(formal).not.toEqual(casual);
        });
    });

    describe('getCulturalNormsForRegion', () => {
        it('should retrieve all cultural norms for region', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({ region: 'CN', category: 'communication' }),
                TestFixtures.createMockCulturalNorm({ region: 'CN', category: 'business' }),
                TestFixtures.createMockCulturalNorm({ region: 'CN', category: 'social' }),
            ];

            culturalNormRepo.find.mockResolvedValue(mockNorms);

            const result = await service.getCulturalNormsForRegion('CN');

            expect(result).toHaveLength(3);
            expect(result.every(n => n.region === 'CN')).toBe(true);
        });

        it('should filter by category', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({ category: 'business' }),
            ];

            culturalNormRepo.find.mockResolvedValue(mockNorms);

            const result = await service.getCulturalNormsForRegion('US', 'business');

            expect(result.every(n => n.category === 'business')).toBe(true);
        });
    });

    describe('adaptGreetingStyle', () => {
        it('should adapt greeting for Japanese formal context', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({
                    region: 'JP',
                    normKey: 'greeting.formal',
                    normValue: 'お早うございます',
                }),
            ];

            culturalNormRepo.findOne.mockResolvedValue(mockNorms[0]);

            const result = await service.adaptGreetingStyle('morning', 'JP', 'formal');

            expect(result).toContain('formal');
        });

        it('should adapt greeting for US casual context', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({
                    region: 'US',
                    normKey: 'greeting.casual',
                    normValue: 'Hey!',
                }),
            ];

            culturalNormRepo.findOne.mockResolvedValue(mockNorms[0]);

            const result = await service.adaptGreetingStyle('general', 'US', 'casual');

            expect(result).toBeDefined();
        });
    });

    describe('adaptColorMeaning', () => {
        it('should understand color cultural significance', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({
                    region: 'CN',
                    category: 'color_meaning',
                    normKey: 'red',
                    normValue: 'luck,prosperity,celebration',
                }),
            ];

            culturalNormRepo.findOne.mockResolvedValue(mockNorms[0]);

            const result = await service.adaptColorMeaning('red', 'CN');

            expect(result.meanings).toContain('luck');
            expect(result.meanings).toContain('prosperity');
        });

        it('should provide warnings for culturally sensitive colors', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({
                    normKey: 'white',
                    normValue: 'mourning,death',
                }),
            ];

            culturalNormRepo.findOne.mockResolvedValue(mockNorms[0]);

            const result = await service.adaptColorMeaning('white', 'CN');

            expect(result.warning).toBeDefined();
        });
    });

    describe('adaptNumberFormat', () => {
        it('should adapt number formatting for culture', () => {
            expect(service.adaptNumberFormat(1234567.89, 'US')).toMatch(/1,234,567\.89/);
            expect(service.adaptNumberFormat(1234567.89, 'FR')).toMatch(/1 234 567,89/);
            expect(service.adaptNumberFormat(1234567.89, 'IN')).toMatch(/12,34,567\.89/);
        });

        it('should handle different decimal separators', () => {
            const us = service.adaptNumberFormat(12.34, 'US');
            const de = service.adaptNumberFormat(12.34, 'DE');

            expect(us).toContain('.');
            expect(de).toContain(',');
        });
    });

    describe('adaptDateTimeFormat', () => {
        it('should adapt date/time for different cultures', () => {
            const date = new Date('2024-06-15T14:30:00');

            const us = service.adaptDateTimeFormat(date, 'US');
            const uk = service.adaptDateTimeFormat(date, 'GB');
            const jp = service.adaptDateTimeFormat(date, 'JP');

            expect(us).toBeDefined();
            expect(uk).toBeDefined();
            expect(jp).toBeDefined();
            expect(us).not.toEqual(uk);
        });

        it('should respect 12hr vs 24hr time preferences', () => {
            const date = new Date('2024-06-15T14:30:00');

            const us = service.adaptDateTimeFormat(date, 'US'); // 12hr
            const de = service.adaptDateTimeFormat(date, 'DE'); // 24hr

            expect(us).toMatch(/2:30 PM|14:30/);
            expect(de).toMatch(/14:30/);
        });
    });

    describe('adaptNameOrder', () => {
        it('should adapt name order for culture', () => {
            const name = { first: 'John', last: 'Smith' };

            const western = service.adaptNameOrder(name, 'US');
            const eastern = service.adaptNameOrder(name, 'JP');

            expect(western).toBe('John Smith');
            expect(eastern).toBe('Smith John');
        });

        it('should handle titles appropriately', () => {
            const name = { title: 'Mr.', first: 'John', last: 'Smith' };

            const result = service.adaptNameOrder(name, 'JP', true);

            expect(result).toContain('Mr.');
        });
    });

    describe('adaptCurrencyDisplay', () => {
        it('should adapt currency symbol placement', () => {
            expect(service.adaptCurrencyDisplay(100, 'USD', 'US')).toMatch(/\$100/);
            expect(service.adaptCurrencyDisplay(100, 'EUR', 'FR')).toMatch(/100\s?€/);
        });

        it('should handle different decimal places', () => {
            const usd = service.adaptCurrencyDisplay(100.123, 'USD', 'US');
            const jpy = service.adaptCurrencyDisplay(100.123, 'JPY', 'JP');

            expect(usd).toMatch(/\.12/); // 2 decimals
            expect(jpy).not.toMatch(/\./); // 0 decimals
        });
    });

    describe('getBusinessEtiquette', () => {
        it('should provide business etiquette guidelines', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({
                    region: 'JP',
                    category: 'business',
                    normKey: 'meeting.etiquette',
                    normValue: 'bow,exchange_cards,hierarchical_seating',
                }),
            ];

            culturalNormRepo.find.mockResolvedValue(mockNorms);

            const result = await service.getBusinessEtiquette('JP');

            expect(result).toBeDefined();
            expect(result.practices).toContain('bow');
        });
    });

    describe('adaptGestureInterpretation', () => {
        it('should interpret gestures culturally', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({
                    normKey: 'thumbs_up',
                    normValue: 'positive',
                }),
            ];

            culturalNormRepo.findOne.mockResolvedValue(mockNorms[0]);

            const result = await service.adaptGestureInterpretation('thumbs_up', 'US');

            expect(result.meaning).toBe('positive');
        });

        it('should warn about offensive gestures', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({
                    normKey: 'thumbs_up',
                    normValue: 'offensive',
                }),
            ];

            culturalNormRepo.findOne.mockResolvedValue(mockNorms[0]);

            const result = await service.adaptGestureInterpretation('thumbs_up', 'IR');

            expect(result.isOffensive).toBe(true);
        });
    });

    describe('getHolidayCalendar', () => {
        it('should return regional holidays', async () => {
            const result = await service.getHolidayCalendar('US', 2024);

            expect(result).toBeDefined();
            expect(result.holidays).toContainEqual(
                expect.objectContaining({ name: expect.any(String) })
            );
        });

        it('should include cultural significance', async () => {
            const result = await service.getHolidayCalendar('CN', 2024);

            expect(result.holidays.some(h => h.significance)).toBe(true);
        });
    });

    describe('adaptWorkingHours', () => {
        it('should provide typical working hours by region', async () => {
            const us = await service.adaptWorkingHours('US');
            const es = await service.adaptWorkingHours('ES');

            expect(us.start).toMatch(/9:00|08:00/);
            expect(es.siesta).toBeDefined(); // Spain has siesta
        });
    });

    describe('getCommunicationStyle', () => {
        it('should describe communication style preferences', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({
                    category: 'communication',
                    normKey: 'directness',
                    normValue: 'high_context',
                }),
            ];

            culturalNormRepo.find.mockResolvedValue(mockNorms);

            const result = await service.getCommunicationStyle('JP');

            expect(result.directness).toMatch(/indirect|high_context/);
        });
    });

    describe('getRegionalPreset', () => {
        it('should return complete regional preset', async () => {
            const mockPreset = TestFixtures.createMockRegionalPreset({
                region: 'US',
                locale: 'en-US',
                currency: 'USD',
                timezone: 'America/New_York',
            });

            regionalPresetRepo.findOne.mockResolvedValue(mockPreset);

            const result = await service.getRegionalPreset('US');

            expect(result.locale).toBe('en-US');
            expect(result.currency).toBe('USD');
        });

        it('should fall back to default preset', async () => {
            regionalPresetRepo.findOne.mockResolvedValue(null);

            const result = await service.getRegionalPreset('UNKNOWN');

            expect(result.region).toBe('US'); // Default
        });
    });

    describe('analyzeC ulturalSensitivity', () => {
        it('should analyze content for cultural sensitivity', async () => {
            const content = {
                text: 'Hello everyone',
                images: [],
                colors: ['red', 'white'],
            };

            const result = await service.analyzeCulturalSensitivity(content, 'CN');

            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.warnings).toBeDefined();
        });

        it('should flag potentially offensive content', async () => {
            const content = {
                text: 'Offensive term',
                gestures: ['thumbs_up'],
            };

            const result = await service.analyzeCulturalSensitivity(content, 'IR');

            expect(result.hasIssues).toBe(true);
        });
    });

    describe('generateCulturalReport', () => {
        it('should generate comprehensive cultural adaptation report', async () => {
            const mockNorms = [
                TestFixtures.createMockCulturalNorm({ category: 'communication' }),
                TestFixtures.createMockCulturalNorm({ category: 'business' }),
            ];

            culturalNormRepo.find.mockResolvedValue(mockNorms);

            const report = await service.generateCulturalReport('JP');

            expect(report.region).toBe('JP');
            expect(report.categories).toBeDefined();
            expect(report.recommendations).toBeDefined();
        });
    });
});
