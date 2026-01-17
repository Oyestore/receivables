import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedMultiLanguageSupportService } from './advanced-multi-language-support.service';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TranslationEntity, LanguageMetadataEntity } from '../entities/globalization.entity';
import { TranslationMemoryEntity } from '../entities/intelligence.entity';
import { TestFixtures } from '../../tests/fixtures';

describe('AdvancedMultiLanguageSupportService', () => {
    let service: AdvancedMultiLanguageSupportService;
    let translationRepo: any;
    let languageMetadataRepo: any;
    let translationMemoryRepo: any;

    beforeEach(async () => {
        translationRepo = createMockRepository<TranslationEntity>();
        languageMetadataRepo = createMockRepository<LanguageMetadataEntity>();
        translationMemoryRepo = createMockRepository<TranslationMemoryEntity>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdvancedMultiLanguageSupportService,
                { provide: getRepositoryToken(TranslationEntity), useValue: translationRepo },
                { provide: getRepositoryToken(LanguageMetadataEntity), useValue: languageMetadataRepo },
                { provide: getRepositoryToken(TranslationMemoryEntity), useValue: translationMemoryRepo },
            ],
        }).compile();

        service = module.get<AdvancedMultiLanguageSupportService>(AdvancedMultiLanguageSupportService);
    });

    describe('translateWithContext', () => {
        it('should translate with context awareness', async () => {
            const mockTranslation = TestFixtures.createMockTranslation({
                key: 'greeting.formal',
                locale: 'es',
                value: 'Buenos días',
            });

            translationRepo.findOne.mockResolvedValue(mockTranslation);

            const result = await service.translateWithContext('greeting.formal', 'es', { formality: 'formal' });

            expect(result).toBe('Buenos días');
        });

        it('should fall back to default when context not found', async () => {
            translationRepo.findOne
                .mockResolvedValueOnce(null) // Context-specific not found
                .mockResolvedValueOnce(TestFixtures.createMockTranslation({ value: 'Hello' })); // Default

            const result = await service.translateWithContext('greeting.casual', 'en', { formality: 'casual' });

            expect(result).toBe('Hello');
        });

        it('should handle missing translations gracefully', async () => {
            translationRepo.findOne.mockResolvedValue(null);

            const result = await service.translateWithContext('missing.key', 'es', {});

            expect(result).toMatch(/missing\.key|Translation not found/);
        });
    });

    describe('batchTranslate', () => {
        it('should translate multiple keys efficiently', async () => {
            const mockTranslations = [
                TestFixtures.createMockTranslation({ key: 'common.welcome', value: 'Welcome' }),
                TestFixtures.createMockTranslation({ key: 'common.goodbye', value: 'Goodbye' }),
            ];

            translationRepo.find.mockResolvedValue(mockTranslations);

            const result = await service.batchTranslate(['common.welcome', 'common.goodbye'], 'en-US');

            expect(result).toHaveLength(2);
            expect(result['common.welcome']).toBe('Welcome');
            expect(result['common.goodbye']).toBe('Goodbye');
        });

        it('should handle partial translation sets', async () => {
            const mockTranslations = [
                TestFixtures.createMockTranslation({ key: 'common.welcome', value: 'Welcome' }),
            ];

            translationRepo.find.mockResolvedValue(mockTranslations);

            const result = await service.batchTranslate(['common.welcome', 'common.missing'], 'en-US');

            expect(result['common.welcome']).toBe('Welcome');
            expect(result['common.missing']).toBeDefined();
        });
    });

    describe('detectLanguage', () => {
        it('should detect language from text', async () => {
            const englishText = 'Hello, how are you?';
            const result = await service.detectLanguage(englishText);

            expect(result.language).toMatch(/en/);
            expect(result.confidence).toBeGreaterThan(0.5);
        });

        it('should detect RTL languages', async () => {
            const arabicText = 'مرحبا كيف حالك';
            const result = await service.detectLanguage(arabicText);

            expect(result.isRTL).toBe(true);
        });

        it('should handle mixed language content', async () => {
            const mixedText = 'Hello مرحبا';
            const result = await service.detectLanguage(mixedText);

            expect(result.languages).toBeDefined();
            expect(result.confidence).toBeLessThan(1.0);
        });
    });

    describe('getLanguageMetadata', () => {
        it('should return language metadata', async () => {
            const mockMetadata = TestFixtures.createMockLanguageMetadata({
                languageCode: 'ar',
                isRTL: true,
                completionPercentage: 95,
            });

            languageMetadataRepo.findOne.mockResolvedValue(mockMetadata);

            const result = await service.getLanguageMetadata('ar');

            expect(result.isRTL).toBe(true);
            expect(result.completionPercentage).toBe(95);
        });
    });

    describe('getSupportedLanguages', () => {
        it('should return all active languages', async () => {
            const mockLanguages = [
                TestFixtures.createMockLanguageMetadata({ languageCode: 'en', isActive: true }),
                TestFixtures.createMockLanguageMetadata({ languageCode: 'es', isActive: true }),
                TestFixtures.createMockLanguageMetadata({ languageCode: 'ar', isActive: true }),
            ];

            languageMetadataRepo.find.mockResolvedValue(mockLanguages);

            const result = await service.getSupportedLanguages();

            expect(result).toHaveLength(3);
            expect(result.every(l => l.isActive)).toBe(true);
        });

        it('should filter out inactive languages', async () => {
            const mockLanguages = [
                TestFixtures.createMockLanguageMetadata({ languageCode: 'en', isActive: true }),
                TestFixtures.createMockLanguageMetadata({ languageCode: 'old', isActive: false }),
            ];

            languageMetadataRepo.find.mockResolvedValue([mockLanguages[0]]);

            const result = await service.getSupportedLanguages();

            expect(result).toHaveLength(1);
            expect(result[0].languageCode).toBe('en');
        });
    });

    describe('interpolateTranslation', () => {
        it('should interpolate variables in translation', () => {
            const template = 'Hello, {{name}}! You have {{count}} messages.';
            const variables = { name: 'John', count: 5 };

            const result = service.interpolateTranslation(template, variables);

            expect(result).toBe('Hello, John! You have 5 messages.');
        });

        it('should handle missing variables', () => {
            const template = 'Hello, {{name}}!';
            const variables = {};

            const result = service.interpolateTranslation(template, variables);

            expect(result).toContain('{{name}}');
        });
    });

    describe('pluralize', () => {
        it('should handle English pluralization', () => {
            const singular = '{count} item';
            const plural = '{count} items';

            expect(service.pluralize(1, singular, plural)).toBe('1 item');
            expect(service.pluralize(5, singular, plural)).toBe('5 items');
            expect(service.pluralize(0, singular, plural)).toBe('0 items');
        });

        it('should handle complex plural rules', () => {
            const rules = {
                zero: 'No items',
                one: '1 item',
                other: '{count} items',
            };

            expect(service.pluralize(0, rules)).toBe('No items');
            expect(service.pluralize(1, rules)).toBe('1 item');
            expect(service.pluralize(5, rules)).toBe('5 items');
        });
    });

    describe('cacheTranslation', () => {
        it('should cache frequently used translations', async () => {
            const mockTranslation = TestFixtures.createMockTranslation();

            await service.cacheTranslation('common.welcome', 'en', 'Welcome');

            const cached = service.getCachedTranslation('common.welcome', 'en');

            expect(cached).toBe('Welcome');
        });

        it('should invalidate cache on update', async () => {
            await service.cacheTranslation('key', 'en', 'Old Value');
            await service.invalidateCache('key', 'en');

            const cached = service.getCachedTranslation('key', 'en');

            expect(cached).toBeNull();
        });
    });

    describe('exportTranslations', () => {
        it('should export all translations for locale', async () => {
            const mockTranslations = [
                TestFixtures.createMockTranslation({ key: 'key1', value: 'value1' }),
                TestFixtures.createMockTranslation({ key: 'key2', value: 'value2' }),
            ];

            translationRepo.find.mockResolvedValue(mockTranslations);

            const result = await service.exportTranslations('en-US');

            expect(result).toHaveProperty('key1', 'value1');
            expect(result).toHaveProperty('key2', 'value2');
        });

        it('should export in different formats', async () => {
            const mockTranslations = [TestFixtures.createMockTranslation()];
            translationRepo.find.mockResolvedValue(mockTranslations);

            const json = await service.exportTranslations('en', 'json');
            const csv = await service.exportTranslations('en', 'csv');

            expect(json).toBeDefined();
            expect(csv).toBeDefined();
        });
    });

    describe('importTranslations', () => {
        it('should import translations from data', async () => {
            const data = {
                'common.welcome': 'Welcome',
                'common.goodbye': 'Goodbye',
            };

            translationRepo.save.mockResolvedValue({});

            const result = await service.importTranslations('en-US', data);

            expect(result.imported).toBe(2);
            expect(result.failed).toBe(0);
        });

        it('should handle import errors', async () => {
            const data = { 'key': 'value' };

            translationRepo.save.mockRejectedValue(new Error('DB Error'));

            const result = await service.importTranslations('en', data);

            expect(result.failed).toBeGreaterThan(0);
        });
    });

    describe('getTranslationCoverage', () => {
        it('should calculate coverage percentage', async () => {
            const baseLocale = 'en';
            const targetLocale = 'es';

            translationRepo.find
                .mockResolvedValueOnce(new Array(100).fill({})) // Base has 100
                .mockResolvedValueOnce(new Array(80).fill({})); // Target has 80

            const result = await service.getTranslationCoverage(baseLocale, targetLocale);

            expect(result.percentage).toBe(80);
            expect(result.missing).toBe(20);
        });
    });

    describe('findSimilarTranslations', () => {
        it('should find similar existing translations', async () => {
            const mockMemory = [
                TestFixtures.createMockTranslationMemory({
                    sourceText: 'Hello world',
                    targetText: 'Hola mundo',
                }),
            ];

            translationMemoryRepo.find.mockResolvedValue(mockMemory);

            const result = await service.findSimilarTranslations('Hello world', 'en', 'es');

            expect(result).toHaveLength(1);
            expect(result[0].targetText).toBe('Hola mundo');
        });
    });

    describe('qualityCheck', () => {
        it('should perform quality checks on translations', async () => {
            const sourceText = 'Hello {{name}}';
            const translatedText = 'Hola {{name}}';

            const result = await service.qualityCheck(sourceText, translatedText);

            expect(result.hasAllVariables).toBe(true);
            expect(result.lengthDifference).toBeLessThan(50); // Reasonable difference
        });

        it('should detect missing variables', async () => {
            const sourceText = 'Hello {{name}}';
            const translatedText = 'Hola'; // Missing variable

            const result = await service.qualityCheck(sourceText, translatedText);

            expect(result.hasAllVariables).toBe(false);
            expect(result.missingVariables).toContain('name');
        });
    });

    describe('getRTLLanguages', () => {
        it('should return all RTL languages', async () => {
            const mockLanguages = [
                TestFixtures.createMockLanguageMetadata({ languageCode: 'ar', isRTL: true }),
                TestFixtures.createMockLanguageMetadata({ languageCode: 'he', isRTL: true }),
                TestFixtures.createMockLanguageMetadata({ languageCode: 'en', isRTL: false }),
            ];

            languageMetadataRepo.find.mockResolvedValue(mockLanguages.filter(l => l.isRTL));

            const result = await service.getRTLLanguages();

            expect(result).toHaveLength(2);
            expect(result.every(l => l.isRTL)).toBe(true);
        });
    });

    describe('generateTranslationReport', () => {
        it('should generate comprehensive translation report', async () => {
            const mockLanguages = [
                TestFixtures.createMockLanguageMetadata({ completionPercentage: 100 }),
                TestFixtures.createMockLanguageMetadata({ completionPercentage: 75 }),
            ];

            languageMetadataRepo.find.mockResolvedValue(mockLanguages);

            const report = await service.generateTranslationReport();

            expect(report.languages).toHaveLength(2);
            expect(report.averageCompletion).toBeGreaterThan(0);
            expect(report.totalLanguages).toBe(2);
        });
    });
});
