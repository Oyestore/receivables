import { Test, TestingModule } from '@nestjs/testing';
import { GlobalizationService } from '../../src/services/globalization.service';
import { CurrencyService } from '../../src/services/currency.service';
import { I18nService } from '../../src/services/i18n.service';
import { PaymentIntelligenceService } from '../../src/services/payment-intelligence.service';
import { ComplianceIntelligenceService } from '../../src/services/compliance-intelligence.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Module 14 Additional Integration Tests', () => {
    let globalizationService: GlobalizationService;
    let currencyService: CurrencyService;
    let i18nService: I18nService;
    let paymentIntelligence: PaymentIntelligenceService;
    let complianceIntelligence: ComplianceIntelligenceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GlobalizationService,
                CurrencyService,
                I18nService,
                PaymentIntelligenceService,
                ComplianceIntelligenceService,
            ],
        }).compile();

        globalizationService = module.get(GlobalizationService);
        currencyService = module.get(CurrencyService);
        i18nService = module.get(I18nService);
        paymentIntelligence = module.get(PaymentIntelligenceService);
        complianceIntelligence = module.get(ComplianceIntelligenceService);
    });

    describe('Service Coordination', () => {
        it('should coordinate localization with currency conversion', async () => {
            const currencySpy = jest.spyOn(currencyService, 'convert').mockResolvedValue(83.45);
            const i18nSpy = jest.spyOn(i18nService, 'formatCurrency').mockReturnValue('₹83.45');

            await globalizationService.getLocalizedAmount(1, 'USD', 'INR', 'hi_IN');

            expect(currencySpy).toHaveBeenCalled();
            expect(i18nSpy).toHaveBeenCalled();
        });

        it('should coordinate payment intelligence with compliance', async () => {
            const paymentSpy = jest.spyOn(paymentIntelligence, 'getOptimalRoute').mockResolvedValue({
                provider: 'wise',
                cost: 1.5,
            } as any);
            const complianceSpy = jest.spyOn(complianceIntelligence, 'validateRoute').mockResolvedValue(true);

            await globalizationService.setupCrossBorderPayment('US', 'IN');

            expect(paymentSpy).toHaveBeenCalled();
            expect(complianceSpy).toHaveBeenCalled();
        });
    });

    describe('Module Integration', () => {
        it('should integrate with Module 13 for cross-border trade', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { tradeId: 'trade-1' } });

            await globalizationService.initiateInternationalTrade({
                from: 'US',
                to: 'AE',
                currency: 'USD',
            } as any);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/cross-border/trade'),
                expect.any(Object)
            );
        });

        it('should integrate with Module 03 for payment localization', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { methods: ['upi', 'card'] },
            });

            await paymentIntelligence.getLocalPaymentMethods('IN');

            expect(mockedAxios.get).toHaveBeenCalled();
        });
    });

    describe('External API Mocking', () => {
        it('should fetch real-time forex rates', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { rate: 83.45, timestamp: new Date().toISOString() },
            });

            await currencyService.fetchLiveRate('USD', 'INR');

            expect(mockedAxios.get).toHaveBeenCalled();
        });

        it('should validate VAT number with external service', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { valid: true, companyName: 'Test LLC' },
            });

            await complianceIntelligence.validateVATNumber('123456789012345', 'AE');

            expect(mockedAxios.post).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle forex API failures gracefully', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('API unavailable'));

            await expect(
                currencyService.fetchLiveRate('USD', 'EUR')
            ).rejects.toThrow('API unavailable');
        });

        it('should fall back to cache on translation service failure', async () => {
            jest.spyOn(i18nService, 'getTranslation').mockRejectedValueOnce(new Error('Service down'));
            jest.spyN(i18nService, 'getCachedTranslation').mockResolvedValue('Cached text');

            const result = await globalizationService.getTranslationWithFallback('key');

            expect(result).toBe('Cached text');
        });
    });
});
