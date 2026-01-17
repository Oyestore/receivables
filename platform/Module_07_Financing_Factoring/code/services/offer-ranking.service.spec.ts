import { Test, TestingModule } from '@nestjs/testing';
import { OfferRankingService, RankingContext, ScoredOffer } from './offer-ranking.service';
import { StandardOffer } from './offer-normalization.service';

describe('OfferRankingService', () => {
    let service: OfferRankingService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OfferRankingService],
        }).compile();

        service = module.get<OfferRankingService>(OfferRankingService);
    });

    const createMockOffer = (overrides: Partial<StandardOffer> = {}): StandardOffer => ({
        partnerId: 'test_partner',
        partnerName: 'Test Partner',
        offerId: 'offer-1',
        principalAmount: 500000,
        tenure: 12,
        nominalAPR: 16,
        effectiveAPR: 17,
        processingFee: 10000,
        totalInterest: 40000,
        totalCost: 550000,
        disbursalSpeed: 2,
        flexibility: 70,
        reputation: 80,
        rawOffer: {} as any,
        expiresAt: new Date(),
        ...overrides,
    });

    const mockContext: RankingContext = {
        prioritize: 'lowest_rate',
        urgency: 'flexible',
        businessProfile: {
            creditScore: 700,
            yearsInBusiness: 3,
        },
    };

    describe('rankOffers', () => {
        it('should rank offers by overall score', async () => {
            const offers = [
                createMockOffer({ offerId: '1', effectiveAPR: 18 }),
                createMockOffer({ offerId: '2', effectiveAPR: 14 }), // Better rate
                createMockOffer({ offerId: '3', effectiveAPR: 20 }),
            ];

            const ranked = await service.rankOffers(offers, mockContext);

            expect(ranked).toHaveLength(3);
            expect(ranked[0].rank).toBe(1);
            expect(ranked[1].rank).toBe(2);
            expect(ranked[2].rank).toBe(3);

            // Best offer should have highest score
            expect(ranked[0].overallScore).toBeGreaterThan(ranked[1].overallScore);
            expect(ranked[1].overallScore).toBeGreaterThan(ranked[2].overallScore);
        });

        it('should prioritize lowest rate when requested', async () => {
            const offers = [
                createMockOffer({ offerId: '1', effectiveAPR: 18, disbursalSpeed: 0.5 }), // Fast but expensive
                createMockOffer({ offerId: '2', effectiveAPR: 14, disbursalSpeed: 3 }), // Slow but cheap
            ];

            const context: RankingContext = {
                prioritize: 'lowest_rate',
                urgency: 'flexible',
            };

            const ranked = await service.rankOffers(offers, context);

            // Cheapest should rank first when prioritizing rate
            expect(ranked[0].effectiveAPR).toBe(14);
        });

        it('should prioritize fastest disbursal when requested', async () => {
            const offers = [
                createMockOffer({ offerId: '1', effectiveAPR: 14, disbursalSpeed: 3 }), // Cheap but slow
                createMockOffer({ offerId: '2', effectiveAPR: 18, disbursalSpeed: 0.5 }), // Expensive but fast
            ];

            const context: RankingContext = {
                prioritize: 'fastest_disbursal',
                urgency: 'same_day',
            };

            const ranked = await service.rankOffers(offers, context);

            // Fastest should rank first when prioritizing speed
            expect(ranked[0].disbursalSpeed).toBe(0.5);
        });

        it('should prioritize flexibility when requested', async () => {
            const offers = [
                createMockOffer({ offerId: '1', flexibility: 50 }),
                createMockOffer({ offerId: '2', flexibility: 90 }), // Most flexible
            ];

            const context: RankingContext = {
                prioritize: 'flexible_terms',
                urgency: 'flexible',
            };

            const ranked = await service.rankOffers(offers, context);

            expect(ranked[0].flexibility).toBe(90);
        });

        it('should generate recommendations for each offer', async () => {
            const offers = [
                createMockOffer({ offerId: '1' }),
                createMockOffer({ offerId: '2' }),
            ];

            const ranked = await service.rankOffers(offers, mockContext);

            ranked.forEach(offer => {
                expect(offer.recommendation).toBeDefined();
                expect(typeof offer.recommendation).toBe('string');
                expect(offer.recommendation.length).toBeGreaterThan(0);
            });
        });

        it('should extract pros and cons for each offer', async () => {
            const offers = [createMockOffer()];

            const ranked = await service.rankOffers(offers, mockContext);

            expect(ranked[0].pros).toBeDefined();
            expect(Array.isArray(ranked[0].pros)).toBe(true);
            expect(ranked[0].cons).toBeDefined();
            expect(Array.isArray(ranked[0].cons)).toBe(true);
        });

        it('should assign badges appropriately', async () => {
            const offers = [
                createMockOffer({ offerId: '1', effectiveAPR: 14, disbursalSpeed: 2 }),
                createMockOffer({ offerId: '2', effectiveAPR: 18, disbursalSpeed: 0.5 }),
            ];

            const ranked = await service.rankOffers(offers, mockContext);

            // At least one offer should have a badge
            const badgedOffers = ranked.filter(o => o.badge);
            expect(badgedOffers.length).toBeGreaterThan(0);
        });

        it('should handle empty offers array', async () => {
            const ranked = await service.rankOffers([], mockContext);

            expect(ranked).toHaveLength(0);
        });

        it('should handle single offer', async () => {
            const offers = [createMockOffer()];

            const ranked = await service.rankOffers(offers, mockContext);

            expect(ranked).toHaveLength(1);
            expect(ranked[0].rank).toBe(1);
            expect(ranked[0].badge).toBe('Best Overall');
        });
    });

    describe('scoreOffer', () => {
        it('should calculate all dimension scores', async () => {
            const offers = [createMockOffer()];

            const ranked = await service.rankOffers(offers, mockContext);
            const scored = ranked[0] as ScoredOffer;

            expect(scored.scores).toBeDefined();
            expect(scored.scores.costScore).toBeGreaterThanOrEqual(0);
            expect(scored.scores.costScore).toBeLessThanOrEqual(100);
            expect(scored.scores.speedScore).toBeGreaterThanOrEqual(0);
            expect(scored.scores.speedScore).toBeLessThanOrEqual(100);
            expect(scored.scores.reliabilityScore).toBeGreaterThanOrEqual(0);
            expect(scored.scores.reliabilityScore).toBeLessThanOrEqual(100);
            expect(scored.scores.flexibilityScore).toBeGreaterThanOrEqual(0);
            expect(scored.scores.flexibilityScore).toBeLessThanOrEqual(100);
            expect(scored.scores.approvalProbability).toBeGreaterThanOrEqual(0);
            expect(scored.scores.approvalProbability).toBeLessThanOrEqual(100);
        });

        it('should give higher cost score to lower APR', async () => {
            const offers = [
                createMockOffer({ offerId: '1', effectiveAPR: 14 }), // Lower APR
                createMockOffer({ offerId: '2', effectiveAPR: 20 }), // Higher APR
            ];

            const ranked = await service.rankOffers(offers, mockContext);

            expect(ranked[0].scores.costScore).toBeGreaterThan(ranked[1].scores.costScore);
        });

        it('should give higher speed score to faster disbursal', async () => {
            const offers = [
                createMockOffer({ offerId: '1', disbursalSpeed: 0.5 }), // 12 hours
                createMockOffer({ offerId: '2', disbursalSpeed: 7 }), // 7 days
            ];

            const ranked = await service.rankOffers(offers, mockContext);

            expect(ranked[0].scores.speedScore).toBeGreaterThan(ranked[1].scores.speedScore);
        });
    });

    describe('approvalProbability', () => {
        it('should predict higher approval for good credit score', async () => {
            const offers = [createMockOffer()];

            const goodCreditContext: RankingContext = {
                ...mockContext,
                businessProfile: { creditScore: 780, yearsInBusiness: 3 },
            };

            const poorCreditContext: RankingContext = {
                ...mockContext,
                businessProfile: { creditScore: 620, yearsInBusiness: 3 },
            };

            const goodRanked = await service.rankOffers(offers, goodCreditContext);
            const poorRanked = await service.rankOffers(offers, poorCreditContext);

            expect(goodRanked[0].scores.approvalProbability).toBeGreaterThan(
                poorRanked[0].scores.approvalProbability,
            );
        });

        it('should predict higher approval for established businesses', async () => {
            const offers = [createMockOffer()];

            const establishedContext: RankingContext = {
                ...mockContext,
                businessProfile: { yearsInBusiness: 10 },
            };

            const newContext: RankingContext = {
                ...mockContext,
                businessProfile: { yearsInBusiness: 0.5 },
            };

            const establishedRanked = await service.rankOffers(offers, establishedContext);
            const newRanked = await service.rankOffers(offers, newContext);

            expect(establishedRanked[0].scores.approvalProbability).toBeGreaterThan(
                newRanked[0].scores.approvalProbability,
            );
        });
    });

    describe('recommendations', () => {
        it('should recommend excellent offers positively', async () => {
            const excellentOffer = createMockOffer({
                effectiveAPR: 12,
                disbursalSpeed: 0.5,
                reputation: 95,
            });

            const ranked = await service.rankOffers([excellentOffer], mockContext);

            expect(ranked[0].recommendation).toContain('Excellent');
        });

        it('should mention rate for low-rate seekers', async () => {
            const offers = [createMockOffer({ effectiveAPR: 14 })];

            const context: RankingContext = {
                prioritize: 'lowest_rate',
                urgency: 'flexible',
            };

            const ranked = await service.rankOffers(offers, context);

            expect(ranked[0].recommendation.toLowerCase()).toMatch(/rate|apr|cost/);
        });

        it('should mention speed for urgent requests', async () => {
            const offers = [createMockOffer({ disbursalSpeed: 0.5 })];

            const context: RankingContext = {
                prioritize: 'fastest_disbursal',
                urgency: 'same_day',
            };

            const ranked = await service.rankOffers(offers, context);

            expect(ranked[0].recommendation.toLowerCase()).toMatch(/fast|quick|hours|days/);
        });
    });

    describe('pros and cons', () => {
        it('should list competitive rate as pro', async () => {
            const offers = [createMockOffer({ effectiveAPR: 13 })]; // Very good rate

            const ranked = await service.rankOffers(offers, mockContext);

            const hasRatePro = ranked[0].pros.some(pro =>
                pro.toLowerCase().includes('rate') || pro.toLowerCase().includes('apr')
            );
            expect(hasRatePro).toBe(true);
        });

        it('should list fast disbursal as pro', async () => {
            const offers = [createMockOffer({ disbursalSpeed: 0.5 })];

            const ranked = await service.rankOffers(offers, mockContext);

            const hasSpeedPro = ranked[0].pros.some(pro =>
                pro.toLowerCase().includes('fast') || pro.toLowerCase().includes('disbursal')
            );
            expect(hasSpeedPro).toBe(true);
        });

        it('should list high rate as con', async () => {
            const offers = [createMockOffer({ effectiveAPR: 24 })]; // Very high rate

            const ranked = await service.rankOffers(offers, mockContext);

            const hasRateCon = ranked[0].cons.some(con =>
                con.toLowerCase().includes('higher') && con.toLowerCase().includes('rate')
            );
            expect(hasRateCon).toBe(true);
        });

        it('should list affordable EMI as pro', async () => {
            const offers = [createMockOffer({ monthlyEMI: 45000 })];

            const ranked = await service.rankOffers(offers, mockContext);

            const hasEMIPro = ranked[0].pros.some(pro => pro.toLowerCase().includes('emi'));
            expect(hasEMIPro).toBe(true);
        });
    });

    describe('badge assignment', () => {
        it('should assign "Best Overall" to top ranked', async () => {
            const offers = [
                createMockOffer({ offerId: '1', effectiveAPR: 14 }),
                createMockOffer({ offerId: '2', effectiveAPR: 18 }),
            ];

            const ranked = await service.rankOffers(offers, mockContext);

            expect(ranked[0].badge).toBe('Best Overall');
        });

        it('should assign "Lowest Rate" appropriately', async () => {
            const offers = [
                createMockOffer({ offerId: '1', effectiveAPR: 14 }),
                createMockOffer({ offerId: '2', effectiveAPR: 18 }),
                createMockOffer({ offerId: '3', effectiveAPR: 16 }),
            ];

            const ranked = await service.rankOffers(offers, mockContext);

            const lowestRateOffer = ranked.find(o => o.effectiveAPR === 14);
            expect(lowestRateOffer?.badge).toMatch(/Lowest Rate|Best Overall/);
        });

        it('should assign "Fastest" appropriately', async () => {
            const offers = [
                createMockOffer({ offerId: '1', disbursalSpeed: 0.5 }),
                createMockOffer({ offerId: '2', disbursalSpeed: 3 }),
            ];

            const ranked = await service.rankOffers(offers, mockContext);

            const fastestOffer = ranked.find(o => o.disbursalSpeed === 0.5);
            expect(fastestOffer?.badge).toMatch(/Fastest|Best Overall/);
        });
    });

    describe('Edge Cases', () => {
        it('should handle offers with identical scores', async () => {
            const offers = [
                createMockOffer({ offerId: '1' }),
                createMockOffer({ offerId: '2' }), // Identical
            ];

            const ranked = await service.rankOffers(offers, mockContext);

            expect(ranked).toHaveLength(2);
            expect(ranked[0].rank).toBe(1);
            expect(ranked[1].rank).toBe(2);
        });

        it('should handle missing business profile', async () => {
            const offers = [createMockOffer()];

            const contextWithoutProfile: RankingContext = {
                prioritize: 'lowest_rate',
                urgency: 'flexible',
            };

            const ranked = await service.rankOffers(offers, contextWithoutProfile);

            expect(ranked).toHaveLength(1);
            expect(ranked[0].scores.approvalProbability).toBeGreaterThan(0);
        });

        it('should handle all priority modes', async () => {
            const offers = [createMockOffer()];

            const priorities: Array<RankingContext['prioritize']> = [
                'lowest_rate',
                'fastest_disbursal',
                'flexible_terms',
                'highest_approval_chance',
            ];

            for (const priority of priorities) {
                const context: RankingContext = {
                    prioritize: priority,
                    urgency: 'flexible',
                };

                const ranked = await service.rankOffers(offers, context);

                expect(ranked).toHaveLength(1);
                expect(ranked[0].overallScore).toBeGreaterThan(0);
            }
        });

        it('should handle extreme values', async () => {
            const extremeOffer = createMockOffer({
                effectiveAPR: 5, // Extremely low
                disbursalSpeed: 0.1, // Instant
                flexibility: 100,
                reputation: 100,
            });

            const ranked = await service.rankOffers([extremeOffer], mockContext);

            expect(ranked[0].overallScore).toBeGreaterThan(90);
        });
    });
});
