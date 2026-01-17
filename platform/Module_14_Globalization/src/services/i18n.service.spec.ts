import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from './i18n.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TranslationEntity } from '../entities/globalization.entity';
import { LanguageMetadataEntity } from '../entities/enhanced-globalization.entity';

describe('I18nService (Unit)', () => {
    let service: I18nService;
    let translationRepoMock: any;
    let langMetadataRepoMock: any;

    beforeEach(async () => {
        translationRepoMock = {
            find: jest.fn().mockResolvedValue([])
        };
        langMetadataRepoMock = {
            findOne: jest.fn()
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                I18nService,
                { provide: getRepositoryToken(TranslationEntity), useValue: translationRepoMock },
                { provide: getRepositoryToken(LanguageMetadataEntity), useValue: langMetadataRepoMock },
            ],
        }).compile();

        service = module.get<I18nService>(I18nService);
    });

    describe('translate', () => {
        it('should return key if translation missing', async () => {
            expect(await service.translate('HELLO', 'fr')).toBe('HELLO');
        });

        it('should interpolate variables', async () => {
            translationRepoMock.find.mockResolvedValue([
                { translationKey: 'WELCOME', translatedText: 'Hello {{name}}', languageCode: 'en_US', namespace: 'common' }
            ]);

            const result = await service.translate('WELCOME', 'en_US', { name: 'Alice' });
            expect(result).toBe('Hello Alice');
        });

        it('should handle simple pluralization', async () => {
            translationRepoMock.find.mockResolvedValue([
                {
                    translationKey: 'APPLES',
                    translatedText: { one: '1 Apple', other: '{{count}} Apples' },
                    languageCode: 'en_US',
                    namespace: 'common'
                }
            ]);

            expect(await service.translate('APPLES', 'en_US', { count: 1 })).toBe('1 Apple');
            expect(await service.translate('APPLES', 'en_US', { count: 5 })).toBe('5 Apples');
        });
    });
});
