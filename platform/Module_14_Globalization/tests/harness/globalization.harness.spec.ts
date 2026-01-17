
import { Test, TestingModule } from '@nestjs/testing';
import { GlobalizationService } from '../../src/services/globalization.service';
import { CurrencyExchangeRateEntity, LocalizationSettingsEntity, TranslationEntity } from '../../src/entities/globalization.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Deterministic Harness for Globalization Service (Module 14)
 * 
 * Scenarios:
 * 1. Currency Conversion (with mocked rates)
 * 2. Localization Settings Defaults
 */
describe('Globalization Service Harness', () => {
    let service: GlobalizationService;
    let exchangeRateRepo: Repository<CurrencyExchangeRateEntity>;
    let localizationRepo: Repository<LocalizationSettingsEntity>;

    const mockExchangeRateRepo = {
        findOne: jest.fn(),
        find: jest.fn(),
    };

    const mockLocalizationRepo = {
        findOne: jest.fn(),
        create: jest.fn(dto => dto),
        save: jest.fn(dto => Promise.resolve({ id: 'loc-1', ...dto })),
    };

    const mockTranslationRepo = {
        find: jest.fn(),
    };

    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            providers: [
                GlobalizationService,
                { provide: getRepositoryToken(CurrencyExchangeRateEntity), useValue: mockExchangeRateRepo },
                { provide: getRepositoryToken(LocalizationSettingsEntity), useValue: mockLocalizationRepo },
                { provide: getRepositoryToken(TranslationEntity), useValue: mockTranslationRepo },
            ],
        }).compile();

        service = module.get<GlobalizationService>(GlobalizationService);
    });

    afterAll(async () => {
        if (module) {
            await module.close();
        }
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should convert currency correctly', async () => {
        mockExchangeRateRepo.findOne.mockResolvedValue({
            rate: 3.67, // USD to AED
            fromCurrency: 'USD',
            toCurrency: 'AED'
        });

        const result = await service.convertCurrency('tenant-1', {
            fromCurrency: 'USD',
            toCurrency: 'AED',
            amount: 100
        });

        expect(result.convertedAmount).toBe(367.00);
        expect(result.rate).toBe(3.67);
    });

    it('should create default localization settings if none exist', async () => {
        mockLocalizationRepo.findOne.mockResolvedValue(null); // No settings found

        const settings = await service.getLocalizationSettings('tenant-1');

        expect(settings.languageCode).toBe('en_US');
        expect(settings.currencyCode).toBe('USD');
        expect(mockLocalizationRepo.save).toHaveBeenCalled();
    });

    it('should return existing settings', async () => {
        const existing = {
            tenantId: 'tenant-1',
            languageCode: 'fr_FR',
            currencyCode: 'EUR'
        };
        mockLocalizationRepo.findOne.mockResolvedValue(existing);

        const settings = await service.getLocalizationSettings('tenant-1');

        expect(settings.languageCode).toBe('fr_FR');
        expect(mockLocalizationRepo.save).not.toHaveBeenCalled();
    });
});
