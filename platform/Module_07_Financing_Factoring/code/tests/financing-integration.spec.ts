import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ApplicationController } from '../controllers/application.controller';
import { ApplicationOrchestratorService } from '../services/application-orchestrator.service';
import { PartnerRegistryService } from '../services/partner-registry.service';
import { OfferNormalizationService } from '../services/offer-normalization.service';
import { OfferRankingService } from '../services/offer-ranking.service';
import { LendingKartAdapter } from '../adapters/lendingkart.adapter';
import { CapitalFloatAdapter } from '../adapters/capital-float.adapter';

describe('Financing Integration Tests', () => {
    let app: TestingModule;
    let partnerRegistry: PartnerRegistryService;
    let lendingKart: LendingKartAdapter;
    let capitalFloat: CapitalFloatAdapter;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [HttpModule, ConfigModule.forRoot()],
            controllers: [ApplicationController],
            providers: [
                ApplicationOrchestratorService,
                PartnerRegistryService,
                OfferNormalizationService,
                OfferRankingService,
                LendingKartAdapter,
                CapitalFloatAdapter,
            ],
        }).compile();

        partnerRegistry = app.get<PartnerRegistryService>(PartnerRegistryService);
        lendingKart = app.get<LendingKartAdapter>(LendingKartAdapter);
        capitalFloat = app.get<CapitalFloatAdapter>(CapitalFloatAdapter);

        // Register partners
        partnerRegistry.registerPartner(lendingKart);
        partnerRegistry.registerPartner(capitalFloat);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Partner Registration Flow', () => {
        it('should register both partners on module init', () => {
            expect(partnerRegistry.getPartnerCount()).toBe(2);
            expect(partnerRegistry.hasPartner('lendingkart')).toBe(true);
            expect(partnerRegistry.hasPartner('capital_float')).toBe(true);
        });

        it('should retrieve partners by product', () => {
            const invoicePartners = partnerRegistry.getPartnersByProduct('invoice_financing');

            expect(invoicePartners.length).toBeGreaterThanOrEqual(2);
            expect(invoicePartners).toContain(lendingKart);
            expect(invoicePartners).toContain(capitalFloat);
        });

        it('should get partner registry stats', () => {
            const stats = partnerRegistry.getRegistryStats();

            expect(stats.totalPartners).toBe(2);
            expect(stats.partnersByType['nbfc']).toBe(2);
            expect(stats.productCoverage['invoice_financing']).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Partner Adapter Contract', () => {
        const mockBusinessProfile = {
            businessName: 'Test Corp',
            pan: 'ABCDE1234F',
            gstin: '27ABCDE1234F1Z5',
            yearsInBusiness: 5,
            annualRevenue: 20000000,
            industry: 'Technology',
            creditScore: 750,
        };

        it('LendingKart should implement all required methods', () => {
            expect(typeof lendingKart.checkEligibility).toBe('function');
            expect(typeof lendingKart.submitApplication).toBe('function');
            expect(typeof lendingKart.getOffers).toBe('function');
            expect(typeof lendingKart.trackStatus).toBe('function');
            expect(typeof lendingKart.handleWebhook).toBe('function');
        });

        it('Capital Float should implement all required methods', () => {
            expect(typeof capitalFloat.checkEligibility).toBe('function');
            expect(typeof capitalFloat.submitApplication).toBe('function');
            expect(typeof capitalFloat.getOffers).toBe('function');
            expect(typeof capitalFloat.trackStatus).toBe('function');
            expect(typeof capitalFloat.handleWebhook).toBe('function');
        });

        it('should validate partner implementations', () => {
            const lkValidation = partnerRegistry.validatePartner(lendingKart);
            const cfValidation = partnerRegistry.validatePartner(capitalFloat);

            expect(lkValidation.valid).toBe(true);
            expect(lkValidation.errors).toHaveLength(0);

            expect(cfValidation.valid).toBe(true);
            expect(cfValidation.errors).toHaveLength(0);
        });

        it('should check eligibility for both partners', async () => {
            const lkEligibility = await lendingKart.checkEligibility(mockBusinessProfile);
            const cfEligibility = await capitalFloat.checkEligibility(mockBusinessProfile);

            expect(lkEligibility.eligible).toBe(true);
            expect(cfEligibility.eligible).toBe(true);

            // Compare eligibility criteria
            expect(cfEligibility.minimumAmount).toBeLessThanOrEqual(lkEligibility.minimumAmount!);
            expect(cfEligibility.maximumAmount).toBeGreaterThanOrEqual(lkEligibility.maximumAmount!);
        });
    });

    describe('Offer Normalization and Ranking Pipeline', () => {
        let normalizationService: OfferNormalizationService;
        let rankingService: OfferRankingService;

        beforeAll(() => {
            normalizationService = app.get<OfferNormalizationService>(OfferNormalizationService);
            rankingService = app.get<OfferRankingService>(OfferRankingService);
        });

        it('should normalize and rank offers from multiple partners', async () => {
            const mockPartnerOffers = [
                {
                    offer: {
                        offerId: 'lk-1',
                        amount: 500000,
                        interestRate: 16,
                        processingFee: 10000,
                        tenure: 12,
                        disbursalTime: '48 hours',
                        conditions: ['Prepayment allowed'],
                        expiresAt: new Date(),
                        rawData: {},
                    },
                    partnerId: 'lendingkart',
                    partnerName: 'LendingKart',
                },
                {
                    offer: {
                        offerId: 'cf-1',
                        amount: 500000,
                        interestRate: 14,
                        processingFee: 7500,
                        tenure: 12,
                        disbursalTime: '24 hours',
                        conditions: ['Flexible repayment', 'No prepayment penalty'],
                        expiresAt: new Date(),
                        rawData: {},
                    },
                    partnerId: 'capital_float',
                    partnerName: 'Capital Float',
                },
            ];

            // Normalize
            const normalized = await normalizationService.normalizeOffers(mockPartnerOffers);

            expect(normalized).toHaveLength(2);
            expect(normalized[0].effectiveAPR).toBeGreaterThan(0);
            expect(normalized[1].effectiveAPR).toBeGreaterThan(0);

            // Rank
            const ranked = await rankingService.rankOffers(normalized, {
                prioritize: 'lowest_rate',
                urgency: 'flexible',
            });

            expect(ranked).toHaveLength(2);
            expect(ranked[0].rank).toBe(1);
            expect(ranked[1].rank).toBe(2);

            // Capital Float should rank higher (lower rate, faster disbursal)
            expect(ranked[0].partnerId).toBe('capital_float');
        });

        it('should assign appropriate badges', async () => {
            const mockOffers = [
                {
                    partnerId: 'lendingkart',
                    partnerName: 'LendingKart',
                    offerId: 'lk-1',
                    principalAmount: 500000,
                    tenure: 12,
                    nominalAPR: 18,
                    effectiveAPR: 19,
                    processingFee: 10000,
                    totalInterest: 50000,
                    totalCost: 560000,
                    disbursalSpeed: 2,
                    flexibility: 70,
                    reputation: 85,
                    rawOffer: {} as any,
                    expiresAt: new Date(),
                },
                {
                    partnerId: 'capital_float',
                    partnerName: 'Capital Float',
                    offerId: 'cf-1',
                    principalAmount: 500000,
                    tenure: 12,
                    nominalAPR: 14,
                    effectiveAPR: 15,
                    processingFee: 7500,
                    totalInterest: 40000,
                    totalCost: 547500,
                    disbursalSpeed: 1,
                    flexibility: 85,
                    reputation: 90,
                    rawOffer: {} as any,
                    expiresAt: new Date(),
                },
            ];

            const ranked = await rankingService.rankOffers(mockOffers, {
                prioritize: 'lowest_rate',
                urgency: 'flexible',
            });

            // Top offer should have "Best Overall"
            expect(ranked[0].badge).toBe('Best Overall');

            // Should have other badges
            const badges = ranked.map(o => o.badge).filter(Boolean);
            expect(badges.length).toBeGreaterThan(0);
        });
    });

    describe('Complete Application Flow', () => {
        it('should handle complete workflow from eligibility to offer comparison', async () => {
            const businessProfile = {
                businessName: 'Integration Test Corp',
                pan: 'ABCDE1234F',
                gstin: '27ABCDE1234F1Z5',
                yearsInBusiness: 5,
                annualRevenue: 15000000,
                industry: 'Manufacturing',
                creditScore: 720,
            };

            // Step 1: Check eligibility with both partners
            const partners = partnerRegistry.getAllPartners();
            const eligibilities = await Promise.all(
                partners.map(p => p.checkEligibility(businessProfile)),
            );

            expect(eligibilities.every(e => e.eligible)).toBe(true);

            // Step 2: Get available products
            const products = partnerRegistry.getAvailableProducts();

            expect(products).toContain('invoice_financing');
            expect(products).toContain('working_capital');

            // Step 3: Find best partner for invoice financing
            const bestPartner = await partnerRegistry.findBestPartner('invoice_financing');

            expect(bestPartner).not.toBeNull();
            expect(bestPartner!.supportedProducts).toContain('invoice_financing');
        });
    });

    describe('Error Resilience', () => {
        it('should handle partial partner failures gracefully', async () => {
            const partners = partnerRegistry.getPartnersByProduct('invoice_financing');

            // Even if one partner fails, others should still work
            expect(partners.length).toBeGreaterThan(1);

            const results = await Promise.allSettled(
                partners.map(p => p.checkEligibility({
                    businessName: 'Test',
                    pan: 'INVALID',
                    yearsInBusiness: 0,
                    annualRevenue: 0,
                    industry: 'Test',
                })),
            );

            // At least some should respond (even if not eligible)
            const fulfilled = results.filter(r => r.status === 'fulfilled');
            expect(fulfilled.length).toBeGreaterThan(0);
        });
    });

    describe('Performance', () => {
        it('should handle concurrent partner queries efficiently', async () => {
            const start = Date.now();

            const businessProfile = {
                businessName: 'Perf Test Corp',
                pan: 'ABCDE1234F',
                yearsInBusiness: 5,
                annualRevenue: 10000000,
                industry: 'Technology',
            };

            // Query all partners concurrently
            const partners = partnerRegistry.getAllPartners();
            await Promise.all(partners.map(p => p.checkEligibility(businessProfile)));

            const duration = Date.now() - start;

            // Should complete in reasonable time (< 1 second for eligibility checks)
            expect(duration).toBeLessThan(1000);
        });
    });
});
