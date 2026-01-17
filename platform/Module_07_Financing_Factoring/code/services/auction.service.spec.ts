import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { FinancingAuction, AuctionStatus } from '../entities/auction.entity';
import { FinancingApplication } from '../entities/financing-application.entity';
import { PartnerRegistryService } from './partner-registry.service';
import { OfferNormalizationService } from './offer-normalization.service';
import { OfferRankingService } from './offer-ranking.service';
import { IFinancingPartnerPlugin, FinancingProduct, PartnerType } from '../interfaces/financing-partner-plugin.interface';

describe('AuctionService', () => {
    let service: AuctionService;
    let auctionRepository: jest.Mocked<Repository<FinancingAuction>>;
    let applicationRepository: jest.Mocked<Repository<FinancingApplication>>;
    let partnerRegistry: jest.Mocked<PartnerRegistryService>;
    let normalizationService: jest.Mocked<OfferNormalizationService>;
    let rankingService: jest.Mocked<OfferRankingService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const mockApplication = {
        id: 'app-123',
        tenantId: 'tenant-456',
        userId: 'user-789',
        requestedAmount: 500000,
        financingType: 'invoice_financing',
        businessDetails: {
            businessName: 'Test Corp',
            businessPan: 'ABCDE1234F',
        },
    };

    const mockPartner1: Partial<IFinancingPartnerPlugin> = {
        partnerId: 'lendingkart',
        partnerName: 'LendingKart',
        partnerType: PartnerType.NBFC,
        supportedProducts: [FinancingProduct.INVOICE_FINANCING],
        checkEligibility: jest.fn(),
        submitApplication: jest.fn(),
        getOffers: jest.fn(),
        trackStatus: jest.fn(),
        handleWebhook: jest.fn(),
    };

    const mockPartner2: Partial<IFinancingPartnerPlugin> = {
        partnerId: 'capital_float',
        partnerName: 'Capital Float',
        partnerType: PartnerType.NBFC,
        supportedProducts: [FinancingProduct.INVOICE_FINANCING],
        checkEligibility: jest.fn(),
        submitApplication: jest.fn(),
        getOffers: jest.fn(),
        trackStatus: jest.fn(),
        handleWebhook: jest.fn(),
    };

    beforeEach(async () => {
        const mockAuctionRepo = {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
        };

        const mockApplicationRepo = {
            findOne: jest.fn(),
        };

        const mockPartnerRegistry = {
            getPartner: jest.fn(),
            getAllPartners: jest.fn(),
        };

        const mockNormalizationService = {
            normalizeOffers: jest.fn(),
        };

        const mockRankingService = {
            rankOffers: jest.fn(),
        };

        const mockEventEmitter = {
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuctionService,
                { provide: getRepositoryToken(FinancingAuction), useValue: mockAuctionRepo },
                { provide: getRepositoryToken(FinancingApplication), useValue: mockApplicationRepo },
                { provide: PartnerRegistryService, useValue: mockPartnerRegistry },
                { provide: OfferNormalizationService, useValue: mockNormalizationService },
                { provide: OfferRankingService, useValue: mockRankingService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
            ],
        }).compile();

        service = module.get<AuctionService>(AuctionService);
        auctionRepository = module.get(getRepositoryToken(FinancingAuction));
        applicationRepository = module.get(getRepositoryToken(FinancingApplication));
        partnerRegistry = module.get(PartnerRegistryService);
        normalizationService = module.get(OfferNormalizationService);
        rankingService = module.get(OfferRankingService);
        eventEmitter = module.get(EventEmitter2);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('startAuction', () => {
        it('should start auction successfully', async () => {
            const partnerIds = ['lendingkart', 'capital_float'];

            applicationRepository.findOne.mockResolvedValue(mockApplication as any);
            partnerRegistry.getPartner
                .mockReturnValueOnce(mockPartner1 as IFinancingPartnerPlugin)
                .mockReturnValueOnce(mockPartner2 as IFinancingPartnerPlugin);

            const mockAuction = {
                id: 'auction-123',
                applicationId: 'app-123',
                partnerIds,
                status: AuctionStatus.ACTIVE,
                startedAt: new Date(),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            };

            auctionRepository.create.mockReturnValue(mockAuction as any);
            auctionRepository.save.mockResolvedValue(mockAuction as any);

            const result = await service.startAuction('app-123', partnerIds);

            expect(result.auctionId).toBe('auction-123');
            expect(result.status).toBe(AuctionStatus.ACTIVE);
            expect(auctionRepository.create).toHaveBeenCalled();
            expect(auctionRepository.save).toHaveBeenCalled();
        });

        it('should throw error if application not found', async () => {
            applicationRepository.findOne.mockResolvedValue(null);

            await expect(
                service.startAuction('invalid-id', ['partner1', 'partner2']),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw error if less than 2 partners', async () => {
            applicationRepository.findOne.mockResolvedValue(mockApplication as any);
            partnerRegistry.getPartner.mockReturnValue(mockPartner1 as IFinancingPartnerPlugin);

            await expect(
                service.startAuction('app-123', ['partner1']),
            ).rejects.toThrow(BadRequestException);
        });

        it('should emit auction started event', async () => {
            applicationRepository.findOne.mockResolvedValue(mockApplication as any);
            partnerRegistry.getPartner
                .mockReturnValueOnce(mockPartner1 as IFinancingPartnerPlugin)
                .mockReturnValueOnce(mockPartner2 as IFinancingPartnerPlugin);

            const mockAuction = {
                id: 'auction-123',
                partnerIds: ['p1', 'p2'],
                status: AuctionStatus.ACTIVE,
            };

            auctionRepository.create.mockReturnValue(mockAuction as any);
            auctionRepository.save.mockResolvedValue(mockAuction as any);

            await service.startAuction('app-123', ['p1', 'p2']);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'auction.started',
                expect.objectContaining({
                    auctionId: 'auction-123',
                }),
            );
        });

        it('should use custom timeout', async () => {
            applicationRepository.findOne.mockResolvedValue(mockApplication as any);
            partnerRegistry.getPartner
                .mockReturnValueOnce(mockPartner1 as IFinancingPartnerPlugin)
                .mockReturnValueOnce(mockPartner2 as IFinancingPartnerPlugin);

            auctionRepository.create.mockReturnValue({} as any);
            auctionRepository.save.mockResolvedValue({ id: 'auction-123' } as any);

            await service.startAuction('app-123', ['p1', 'p2'], {
                timeoutMinutes: 30,
            });

            const createCall = auctionRepository.create.mock.calls[0][0];
            expect(createCall.timeoutMinutes).toBe(30);
        });
    });

    describe('getAuctionStatus', () => {
        it('should return auction status', async () => {
            const mockAuction = {
                id: 'auction-123',
                status: AuctionStatus.ACTIVE,
                partnerIds: ['p1', 'p2'],
                offers: [
                    {
                        partnerId: 'p1',
                        partnerName: 'Partner 1',
                        receivedAt: new Date(),
                        responseTime: 1000,
                        offer: { offerId: 'o1' },
                    },
                ],
                startedAt: new Date(),
                expiresAt: new Date(Date.now() + 600000), // 10 min remaining
                minOffersRequired: 2,
                rankingContext: { prioritize: 'lowest_rate', urgency: 'flexible' },
                metadata: { autoComplete: true },
            };

            auctionRepository.findOne.mockResolvedValue(mockAuction as any);
            normalizationService.normalizeOffers.mockResolvedValue([
                {
                    partnerId: 'p1',
                    partnerName: 'Partner 1',
                    offerId: 'o1',
                    effectiveAPR: 15,
                    principalAmount: 500000,
                    tenure: 12,
                    totalCost: 550000,
                } as any,
            ]);
            rankingService.rankOffers.mockResolvedValue([
                {
                    partnerId: 'p1',
                    partnerName: 'Partner 1',
                    effectiveAPR: 15,
                } as any,
            ]);

            const status = await service.getAuctionStatus('auction-123');

            expect(status.auctionId).toBe('auction-123');
            expect(status.status).toBe(AuctionStatus.ACTIVE);
            expect(status.offersReceived).toBe(1);
            expect(status.offersExpected).toBe(2);
            expect(status.currentLeader).toBeDefined();
            expect(status.currentLeader?.partnerId).toBe('p1');
        });

        it('should throw error if auction not found', async () => {
            auctionRepository.findOne.mockResolvedValue(null);

            await expect(service.getAuctionStatus('invalid-id')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should calculate remaining time correctly', async () => {
            const expiresAt = new Date(Date.now() + 300000); // 5 min

            auctionRepository.findOne.mockResolvedValue({
                id: 'auction-123',
                partnerIds: ['p1'],
                offers: [],
                expiresAt,
                rankingContext: {},
                metadata: {},
            } as any);

            const status = await service.getAuctionStatus('auction-123');

            expect(status.remainingTime).toBeGreaterThan(0);
            expect(status.remainingTime).toBeLessThanOrEqual(300);
        });
    });

    describe('completeAuction', () => {
        it('should complete auction and select winner', async () => {
            const mockAuction = {
                id: 'auction-123',
                status: AuctionStatus.ACTIVE,
                partnerIds: ['p1', 'p2'],
                offers: [
                    {
                        partnerId: 'p1',
                        partnerName: 'Partner 1',
                        offerId: 'o1',
                        responseTime: 1000,
                        offer: { offerId: 'o1', amount: 500000, interestRate: 16 },
                    },
                    {
                        partnerId: 'p2',
                        partnerName: 'Partner 2',
                        offerId: 'o2',
                        responseTime: 1500,
                        offer: { offerId: 'o2', amount: 500000, interestRate: 14 },
                    },
                ],
                minOffersRequired: 2,
                rankingContext: { prioritize: 'lowest_rate', urgency: 'flexible' },
                startedAt: new Date(),
            };

            const normalizedOffers = [
                {
                    partnerId: 'p1',
                    partnerName: 'Partner 1',
                    offerId: 'o1',
                    effectiveAPR: 16,
                    principalAmount: 500000,
                    tenure: 12,
                    totalCost: 560000,
                },
                {
                    partnerId: 'p2',
                    partnerName: 'Partner 2',
                    offerId: 'o2',
                    effectiveAPR: 14,
                    principalAmount: 500000,
                    tenure: 12,
                    totalCost: 540000,
                },
            ];

            const rankedOffers = [
                { ...normalizedOffers[1], rank: 1 }, // p2 wins
                { ...normalizedOffers[0], rank: 2 },
            ];

            auctionRepository.findOne.mockResolvedValue(mockAuction as any);
            normalizationService.normalizeOffers.mockResolvedValue(normalizedOffers as any);
            rankingService.rankOffers.mockResolvedValue(rankedOffers as any);
            auctionRepository.save.mockResolvedValue({
                ...mockAuction,
                status: AuctionStatus.COMPLETED,
            } as any);

            const result = await service.completeAuction('auction-123');

            expect(result.status).toBe(AuctionStatus.COMPLETED);
            expect(result.winner).toBeDefined();
            expect(result.winner?.winnerId).toBe('p2');
            expect(result.winner?.savings).toBeGreaterThan(0);
        });

        it('should throw error if insufficient offers', async () => {
            auctionRepository.findOne.mockResolvedValue({
                id: 'auction-123',
                offers: [{ partnerId: 'p1' }],
                minOffersRequired: 2,
            } as any);

            await expect(service.completeAuction('auction-123')).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should calculate analytics correctly', async () => {
            const mockAuction = {
                id: 'auction-123',
                status: AuctionStatus.ACTIVE,
                partnerIds: ['p1', 'p2'],
                offers: [
                    { partnerId: 'p1', responseTime: 1000, offer: {} },
                    { partnerId: 'p2', responseTime: 2000, offer: {} },
                ],
                minOffersRequired: 2,
                rankingContext: {},
                startedAt: new Date(Date.now() - 60000),
            };

            auctionRepository.findOne.mockResolvedValue(mockAuction as any);
            normalizationService.normalizeOffers.mockResolvedValue([
                { effectiveAPR: 16, totalCost: 560000, principalAmount: 500000, tenure: 12, partnerId: 'p1', partnerName: 'P1', offerId: 'o1' },
                { effectiveAPR: 14, totalCost: 540000, principalAmount: 500000, tenure: 12, partnerId: 'p2', partnerName: 'P2', offerId: 'o2' },
            ] as any);
            rankingService.rankOffers.mockResolvedValue([
                { effectiveAPR: 14, totalCost: 540000, partnerId: 'p2', partnerName: 'P2', offerId: 'o2', principalAmount: 500000, tenure: 12 },
                { effectiveAPR: 16, totalCost: 560000, partnerId: 'p1', partnerName: 'P1', offerId: 'o1', principalAmount: 500000, tenure: 12 },
            ] as any);
            auctionRepository.save.mockImplementation(async (auction) => auction);

            const result = await service.completeAuction('auction-123');

            expect(result.analytics).toBeDefined();
            expect(result.analytics.partnersInvited).toBe(2);
            expect(result.analytics.offersReceived).toBe(2);
            expect(result.analytics.participationRate).toBe(100);
            expect(result.analytics.averageResponseTime).toBe(1500);
        });
    });

    describe('cancelAuction', () => {
        it('should cancel active auction', async () => {
            const mockAuction = {
                id: 'auction-123',
                status: AuctionStatus.ACTIVE,
            };

            auctionRepository.findOne.mockResolvedValue(mockAuction as any);
            auctionRepository.save.mockResolvedValue({
                ...mockAuction,
                status: AuctionStatus.CANCELLED,
            } as any);

            await service.cancelAuction('auction-123', 'user-789', 'User decided not to proceed');

            expect(auctionRepository.save).toHaveBeenCalled();
            const savedAuction = auctionRepository.save.mock.calls[0][0];
            expect(savedAuction.status).toBe(AuctionStatus.CANCELLED);
            expect(savedAuction.cancelledBy).toBe('user-789');
        });

        it('should throw error if auction not found', async () => {
            auctionRepository.findOne.mockResolvedValue(null);

            await expect(
                service.cancelAuction('invalid-id', 'user-789', 'reason'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw error if auction already completed', async () => {
            auctionRepository.findOne.mockResolvedValue({
                id: 'auction-123',
                status: AuctionStatus.COMPLETED,
            } as any);

            await expect(
                service.cancelAuction('auction-123', 'user-789', 'reason'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should emit cancelled event', async () => {
            auctionRepository.findOne.mockResolvedValue({
                id: 'auction-123',
                status: AuctionStatus.ACTIVE,
            } as any);
            auctionRepository.save.mockResolvedValue({} as any);

            await service.cancelAuction('auction-123', 'user-789', 'Test reason');

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'auction.cancelled',
                expect.objectContaining({
                    auctionId: 'auction-123',
                    reason: 'Test reason',
                }),
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle auction with no offers gracefully', async () => {
            auctionRepository.findOne.mockResolvedValue({
                id: 'auction-123',
                offers: [],
                partnerIds: ['p1', 'p2'],
                minOffersRequired: 2,
            } as any);

            await expect(service.completeAuction('auction-123')).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should handle single offer scenario', async () => {
            const mockAuction = {
                id: 'auction-123',
                status: AuctionStatus.ACTIVE,
                partnerIds: ['p1', 'p2'],
                offers: [
                    { partnerId: 'p1', offer: {}, responseTime: 1000 },
                ],
                minOffersRequired: 1, // Lowered requirement
                rankingContext: {},
                startedAt: new Date(),
            };

            auctionRepository.findOne.mockResolvedValue(mockAuction as any);
            normalizationService.normalizeOffers.mockResolvedValue([
                { effectiveAPR: 15, totalCost: 550000, partnerId: 'p1', partnerName: 'P1', offerId: 'o1', principalAmount: 500000, tenure: 12 },
            ] as any);
            rankingService.rankOffers.mockResolvedValue([
                { effectiveAPR: 15, totalCost: 550000, partnerId: 'p1', partnerName: 'P1', offerId: 'o1', principalAmount: 500000, tenure: 12 },
            ] as any);
            auctionRepository.save.mockImplementation(async (a) => a);

            const result = await service.completeAuction('auction-123');

            expect(result.winner).toBeDefined();
            expect(result.winner?.savings).toBe(0); // No alternative to compare
        });
    });
});
