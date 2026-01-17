import { Test, TestingModule } from '@nestjs/testing';
import { PaymentIntelligenceService } from './payment-intelligence.service';
import { CulturalIntelligenceService } from './cultural-intelligence.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentRouteEntity, ComplianceRuleEntity } from '../entities/intelligence.entity';
import { CulturalNormEntity } from '../entities/enhanced-globalization.entity';
import { CurrencyService } from './currency.service';

describe('IntelligenceServices (Unit)', () => {
    let paymentService: PaymentIntelligenceService;
    let culturalService: CulturalIntelligenceService;

    // Mocks
    let paymentRepoMock = { 
        findOne: jest.fn(), 
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)), 
        create: jest.fn((dto) => dto) 
    };
    let culturalRepoMock = { findOne: jest.fn(), save: jest.fn(), create: jest.fn((dto) => dto) };
    let currencyServiceMock = {};

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentIntelligenceService,
                CulturalIntelligenceService,
                { provide: getRepositoryToken(PaymentRouteEntity), useValue: paymentRepoMock },
                { provide: getRepositoryToken(CulturalNormEntity), useValue: culturalRepoMock },
                { provide: CurrencyService, useValue: currencyServiceMock }
            ],
        }).compile();

        paymentService = module.get<PaymentIntelligenceService>(PaymentIntelligenceService);
        culturalService = module.get<CulturalIntelligenceService>(CulturalIntelligenceService);
    });

    describe('PaymentIntelligence', () => {
        it('should recommend optimized route', async () => {
            // Mock repo to return nothing -> simulate external analysis
            paymentRepoMock.findOne.mockResolvedValue(null);

            const result = await paymentService.optimizePaymentRoute({
                fromCountry: 'US', toCountry: 'UK', amount: 1000,
                currency: 'USD', urgency: 'standard'
            });

            expect(result.recommendation.provider).toBeDefined();
            expect(result.recommendation.savingsVsDefault).toBeGreaterThan(0);
        });
    });

    describe('CulturalIntelligence', () => {
        it('should adapt message for high formality (JP)', async () => {
            culturalRepoMock.findOne.mockResolvedValue({
                countryCode: 'JP',
                communicationPreferences: { formality: 'high', directness: 'indirect' }
            });

            const result = await culturalService.adaptMessage({
                message: 'Hey, pay me now.',
                targetCountry: 'JP',
                type: 'reminder'
            });

            expect(result.adapted).toContain('いつもお世話になっております'); // Japanese greeting added
            expect(result.changes).toHaveLength(3); // Formality + Directness + Cultural courtesy
        });
    });
});
