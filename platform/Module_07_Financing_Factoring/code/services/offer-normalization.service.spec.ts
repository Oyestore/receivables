import { Test, TestingModule } from '@nestjs/testing';
import { OfferNormalizationService, StandardOffer } from './offer-normalization.service';
import { PartnerOffer } from '../interfaces/financing-partner-plugin.interface';

describe('OfferNormalizationService', () => {
    let service: OfferNormalizationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OfferNormalizationService],
        }).compile();

        service = module.get<OfferNormalizationService>(OfferNormalizationService);
    });

    const mockPartnerOffer: PartnerOffer = {
        offerId: 'test-offer-1',
        amount: 500000,
        interestRate: 16, // 16%  APR
        processingFee: 10000,
        tenure: 12,
        disbursalTime: '24 hours',
        emi: 45000,
        totalRepayment: 540000,
        conditions: [
            'Prepayment allowed without penalty',
            'Flexible repayment terms',
        ],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        rawData: {},
    };

    describe('normalizeOffer', () => {
        it('should normalize offer successfully', async () => {
            const normalized = await service.normalizeOffer(
                mockPartnerOffer,
                'lendingkart',
                'LendingKart',
            );

            expect(normalized.partnerId).toBe('lendingkart');
            expect(normalized.partnerName).toBe('LendingKart');
            expect(normalized.offerId).toBe('test-offer-1');
            expect(normalized.principalAmount).toBe(500000);
            expect(normalized.tenure).toBe(12);
            expect(normalized.nominalAPR).toBe(16);
            expect(normalized.processingFee).toBe(10000);
        });

        it('should calculate effective APR including fees', async () => {
            const normalized = await service.normalizeOffer(
                mockPartnerOffer,
                'lendingkart',
                'LendingKart',
            );

            // Effective APR should be higher than nominal due to fees
            expect(normalized.effectiveAPR).toBeGreaterThan(normalized.nominalAPR);
            expect(normalized.effectiveAPR).toBeGreaterThan(0);
        });

        it('should calculate total interest', async () => {
            const normalized = await service.normalizeOffer(
                mockPartnerOffer,
                'lendingkart',
                'LendingKart',
            );

            // Total interest = totalRepayment - principal
            const expectedInterest = mockPartnerOffer.totalRepayment! - mockPartnerOffer.amount;
            expect(normalized.totalInterest).toBe(expectedInterest);
        });

        it('should calculate total cost', async () => {
            const normalized = await service.normalizeOffer(
                mockPartnerOffer,
                'lendingkart',
                'LendingKart',
            );

            // Total cost = principal + interest + fees
            const expectedCost = mockPartnerOffer.amount + 40000 + 10000; // 500k + 40k interest + 10k fee
            expect(normalized.totalCost).toBe(expectedCost);
        });

        it('should quantify disbursal speed', async () => {
            const normalized = await service.normalizeOffer(
                mockPartnerOffer,
                'lendingkart',
                'LendingKart',
            );

            // "24 hours" = 1 day
            expect(normalized.disbursalSpeed).toBe(1);
        });

        it('should calculate EMI if not provided', async () => {
            const offerWithoutEMI: PartnerOffer = {
                ...mockPartnerOffer,
                emi: undefined,
                totalRepayment: undefined,
            };

            const normalized = await service.normalizeOffer(
                offerWithoutEMI,
                'capital_float',
                'Capital Float',
            );

            expect(normalized.monthlyEMI).toBeGreaterThan(0);
            expect(normalized.monthlyEMI).toBeGreaterThan(normalized.principalAmount / normalized.tenure);
        });
    });

    describe('calculateEffectiveAPR', () => {
        it('should handle high processing fees', async () => {
            const highFeeOffer: PartnerOffer = {
                ...mockPartnerOffer,
                processingFee: 50000, // 10% fee
            };

            const normalized = await service.normalizeOffer(
                highFeeOffer,
                'lendingkart',
                'LendingKart',
            );

            // Effective APR should be significantly higher
            expect(normalized.effectiveAPR).toBeGreaterThan(normalized.nominalAPR + 5);
        });

        it('should handle zero fees correctly', async () => {
            const zeroFeeOffer: PartnerOffer = {
                ...mockPartnerOffer,
                processingFee: 0,
            };

            const normalized = await service.normalizeOffer(
                zeroFeeOffer,
                'lendingkart',
                'LendingKart',
            );

            // Effective APR should be close to nominal APR
            expect(Math.abs(normalized.effectiveAPR - normalized.nominalAPR)).toBeLessThan(1);
        });
    });

    describe('quantifyDisbursalSpeed', () => {
        it('should parse "same day" correctly', async () => {
            const offer: PartnerOffer = {
                ...mockPartnerOffer,
                disbursalTime: 'Same day disbursal',
            };

            const normalized = await service.normalizeOffer(offer, 'partner', 'Partner');

            expect(normalized.disbursalSpeed).toBe(0.5);
        });

        it('should parse hours correctly', async () => {
            const offer: PartnerOffer = {
                ...mockPartnerOffer,
                disbursalTime: '48 hours',
            };

            const normalized = await service.normalizeOffer(offer, 'partner', 'Partner');

            expect(normalized.disbursalSpeed).toBe(2); // 48/24 = 2 days
        });

        it('should parse days correctly', async () => {
            const offer: PartnerOffer = {
                ...mockPartnerOffer,
                disbursalTime: '3 days',
            };

            const normalized = await service.normalizeOffer(offer, 'partner', 'Partner');

            expect(normalized.disbursalSpeed).toBe(3);
        });

        it('should parse day ranges correctly', async () => {
            const offer: PartnerOffer = {
                ...mockPartnerOffer,
                disbursalTime: '3-5 days',
            };

            const normalized = await service.normalizeOffer(offer, 'partner', 'Partner');

            expect(normalized.disbursalSpeed).toBe(4); // Average of 3 and 5
        });

        it('should handle unknown format with default', async () => {
            const offer: PartnerOffer = {
                ...mockPartnerOffer,
                disbursalTime: 'As soon as possible',
            };

            const normalized = await service.normalizeOffer(offer, 'partner', 'Partner');

            expect(normalized.disbursalSpeed).toBe(2); // Default
        });
    });

    describe('scoreFlexibility', () => {
        it('should score high for flexible terms', async () => {
            const flexibleOffer: PartnerOffer = {
                ...mockPartnerOffer,
                conditions: [
                    'Prepayment allowed',
                    'No prepayment penalty',
                    'Flexible repayment schedule',
                    'Payment holidays available',
                    'Partial withdrawals permitted',
                ],
            };

            const normalized = await service.normalizeOffer(
                flexibleOffer,
                'partner',
                'Partner',
            );

            expect(normalized.flexibility).toBeGreaterThan(80);
        });

        it('should score low for rigid terms', async () => {
            const rigidOffer: PartnerOffer = {
                ...mockPartnerOffer,
                conditions: ['Fixed repayment schedule', 'Prepayment penalty applies'],
            };

            const normalized = await service.normalizeOffer(
                rigidOffer,
                'partner',
                'Partner',
            );

            expect(normalized.flexibility).toBeLessThan(60);
        });

        it('should give base score for standard terms', async () => {
            const standardOffer: PartnerOffer = {
                ...mockPartnerOffer,
                conditions: ['Standard terms apply'],
            };

            const normalized = await service.normalizeOffer(
                standardOffer,
                'partner',
                'Partner',
            );

            expect(normalized.flexibility).toBeGreaterThanOrEqual(40);
            expect(normalized.flexibility).toBeLessThanOrEqual(60);
        });
    });

    describe('getPartnerReputation', () => {
        it('should return high score for LendingKart', async () => {
            const normalized = await service.normalizeOffer(
                mockPartnerOffer,
                'lendingkart',
                'LendingKart',
            );

            expect(normalized.reputation).toBeGreaterThan(80);
        });

        it('should return high score for Capital Float', async () => {
            const normalized = await service.normalizeOffer(
                mockPartnerOffer,
                'capital_float',
                'Capital Float',
            );

            expect(normalized.reputation).toBeGreaterThan(85);
        });

        it('should return default score for unknown partner', async () => {
            const normalized = await service.normalizeOffer(
                mockPartnerOffer,
                'new_partner',
                'New Partner',
            );

            expect(normalized.reputation).toBe(70); // Default
        });
    });

    describe('normalizeOffers (batch)', () => {
        it('should normalize multiple offers in parallel', async () => {
            const offers = [
                { offer: mockPartnerOffer, partnerId: 'lendingkart', partnerName: 'LendingKart' },
                { offer: { ...mockPartnerOffer, offerId: 'offer-2' }, partnerId: 'capital_float', partnerName: 'Capital Float' },
            ];

            const normalized = await service.normalizeOffers(offers);

            expect(normalized).toHaveLength(2);
            expect(normalized[0].partnerId).toBe('lendingkart');
            expect(normalized[1].partnerId).toBe('capital_float');
        });
    });

    describe('calculateSavings', () => {
        it('should calculate savings vs baseline', async () => {
            const normalized = await service.normalizeOffer(
                mockPartnerOffer,
                'lendingkart',
                'LendingKart',
            );

            const baselineCost = 600000;
            const savings = service.calculateSavings(normalized, baselineCost);

            expect(savings).toBeGreaterThan(0);
            expect(savings).toBe(baselineCost - normalized.totalCost);
        });

        it('should return negative savings if more expensive', async () => {
            const normalized = await service.normalizeOffer(
                mockPartnerOffer,
                'lendingkart',
                'LendingKart',
            );

            const lowBaseline = 500000;
            const savings = service.calculateSavings(normalized, lowBaseline);

            expect(savings).toBeLessThan(0);
        });
    });

    describe('addBadges', () => {
        const createMockNormalized = (overrides: Partial<StandardOffer> = {}): StandardOffer => ({
            partnerId: 'test',
            partnerName: 'Test',
            offerId: 'offer-1',
            principalAmount: 500000,
            tenure: 12,
            nominalAPR: 16,
            effectiveAPR: 17,
            processingFee: 10000,
            totalInterest: 40000,
            totalCost: 550000,
            disbursalSpeed: 1,
            flexibility: 70,
            reputation: 85,
            rawOffer: mockPartnerOffer,
            expiresAt: new Date(),
            ...overrides,
        });

        it('should assign "Best Overall" to top ranked offer', () => {
            const offers = [
                createMockNormalized({ offerId: '1', overallScore: 95 }),
                createMockNormalized({ offerId: '2', overallScore: 85 }),
            ];

            const badged = service.addBadges(offers);

            expect(badged[0].badge).toBe('Best Overall');
        });

        it('should assign "Lowest Rate" badge', () => {
            const offers = [
                createMockNormalized({ offerId: '1', effectiveAPR: 14 }),
                createMockNormalized({ offerId: '2', effectiveAPR: 18 }),
            ];

            const badged = service.addBadges(offers);

            expect(badged.find(o => o.effectiveAPR === 14)?.badge).toBe('Lowest Rate');
        });

        it('should assign "Fastest" badge', () => {
            const offers = [
                createMockNormalized({ offerId: '1', disbursalSpeed: 0.5 }),
                createMockNormalized({ offerId: '2', disbursalSpeed: 3 }),
            ];

            const badged = service.addBadges(offers);

            expect(badged.find(o => o.disbursalSpeed === 0.5)?.badge).toBe('Fastest');
        });

        it('should handle empty offers array', () => {
            const badged = service.addBadges([]);

            expect(badged).toHaveLength(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero interest rate', async () => {
            const zeroInterestOffer: PartnerOffer = {
                ...mockPartnerOffer,
                interestRate: 0,
                totalRepayment: 500000,
            };

            const normalized = await service.normalizeOffer(
                zeroInterestOffer,
                'partner',
                'Partner',
            );

            expect(normalized.effectiveAPR).toBeGreaterThanOrEqual(0);
            expect(normalized.totalInterest).toBe(0);
        });

        it('should handle very short tenure (1 month)', async () => {
            const shortOffer: PartnerOffer = {
                ...mockPartnerOffer,
                tenure: 1,
            };

            const normalized = await service.normalizeOffer(
                shortOffer,
                'partner',
                'Partner',
            );

            expect(normalized.tenure).toBe(1);
            expect(normalized.monthlyEMI).toBeGreaterThan(0);
        });

        it('should handle long tenure (60 months)', async () => {
            const longOffer: PartnerOffer = {
                ...mockPartnerOffer,
                tenure: 60,
            };

            const normalized = await service.normalizeOffer(
                longOffer,
                'partner',
                'Partner',
            );

            expect(normalized.tenure).toBe(60);
        });

        it('should handle large amounts', async () => {
            const largeOffer: PartnerOffer = {
                ...mockPartnerOffer,
                amount: 100000000, // 10 Cr
                processingFee: 2000000, // 2% fee
            };

            const normalized = await service.normalizeOffer(
                largeOffer,
                'partner',
                'Partner',
            );

            expect(normalized.principalAmount).toBe(100000000);
            expect(normalized.totalCost).toBeGreaterThan(100000000);
        });
    });
});
