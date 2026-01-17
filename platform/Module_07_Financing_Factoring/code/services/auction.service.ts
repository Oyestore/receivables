import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FinancingAuction, AuctionStatus, PartnerOfferRecord, WinningOfferDetails, AuctionAnalytics } from '../entities/auction.entity';
import { FinancingApplication } from '../entities/financing-application.entity';
import { PartnerRegistryService } from './partner-registry.service';
import { OfferNormalizationService, StandardOffer } from './offer-normalization.service';
import { OfferRankingService, RankingContext } from './offer-ranking.service';
import { IFinancingPartnerPlugin, FinancingRequest } from '../interfaces/financing-partner-plugin.interface';
import {
    AuctionOptions,
    AuctionResult,
    AuctionStatusResponse,
    PartnerSubmissionResult,
    CompletionCriteria,
    WinnerSelectionCriteria,
} from '../interfaces/auction.interfaces';

/**
 * Multi-Partner Auction Service
 * 
 * Coordinates parallel submissions to multiple financing partners
 * Collects offers with timeout handling
 * Selects winner using AI-powered ranking
 */
@Injectable()
export class AuctionService {
    private readonly logger = new Logger(AuctionService.name);

    constructor(
        @InjectRepository(FinancingAuction)
        private readonly auctionRepository: Repository<FinancingAuction>,
        @InjectRepository(FinancingApplication)
        private readonly applicationRepository: Repository<FinancingApplication>,
        private readonly partnerRegistry: PartnerRegistryService,
        private readonly normalizationService: OfferNormalizationService,
        private readonly rankingService: OfferRankingService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * Start a multi-partner auction
     */
    async startAuction(
        applicationId: string,
        partnerIds: string[],
        options: AuctionOptions = {},
    ): Promise<AuctionResult> {
        this.logger.log(`Starting auction for application ${applicationId} with ${partnerIds.length} partners`);

        // 1. Get application
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
        });

        if (!application) {
            throw new NotFoundException(`Application ${applicationId} not found`);
        }

        // 2. Validate partners
        const partners = await this.getPartners(partnerIds);

        if (partners.length < 2) {
            throw new BadRequestException('Auction requires at least 2 partners');
        }

        // 3. Create auction record
        const timeout = options.timeoutMinutes || 15;
        const expiresAt = new Date(Date.now() + timeout * 60 * 1000);

        const auction = this.auctionRepository.create({
            applicationId: application.id,
            tenantId: application.tenantId,
            userId: application.userId,
            partnerIds,
            status: AuctionStatus.ACTIVE,
            startedAt: new Date(),
            expiresAt,
            timeoutMinutes: timeout,
            minOffersRequired: options.minOffersRequired || 2,
            rankingContext: {
                prioritize: options.rankingContext?.prioritize || 'lowest_rate',
                urgency: options.rankingContext?.urgency || 'flexible',
                businessProfile: options.rankingContext?.businessProfile,
            },
            metadata: {
                autoComplete: options.autoComplete !== false,
                earlyTerminationThreshold: options.earlyTerminationThreshold,
            },
        });

        const savedAuction = await this.auctionRepository.save(auction);

        // 4. Emit auction started event
        this.eventEmitter.emit('auction.started', {
            auctionId: savedAuction.id,
            applicationId,
            partnerIds,
            expiresAt,
        });

        // 5. Start async partner submissions
        this.submitToPartnersAsync(savedAuction.id, application, partners);

        // 6. Return initial result
        return this.buildAuctionResult(savedAuction);
    }

    /**
     * Submit to partners asynchronously
     */
    private async submitToPartnersAsync(
        auctionId: string,
        application: FinancingApplication,
        partners: IFinancingPartnerPlugin[],
    ): Promise<void> {
        try {
            // Collect offers with timeout
            const results = await this.collectOffersWithTimeout(auctionId, application, partners);

            // Process results
            await this.processOfferResults(auctionId, results);

            // Try to complete auction
            await this.tryCompleteAuction(auctionId);
        } catch (error: any) {
            this.logger.error(`Auction ${auctionId} failed: ${error?.message || error}`);

            // Mark auction as failed
            await this.auctionRepository.update(auctionId, {
                status: AuctionStatus.EXPIRED,
                metadata: { error: error?.message || 'Unknown error' },
            });
        }
    }

    /**
     * Collect offers from all partners with timeout
     */
    private async collectOffersWithTimeout(
        auctionId: string,
        application: FinancingApplication,
        partners: IFinancingPartnerPlugin[],
    ): Promise<PartnerSubmissionResult[]> {
        const auction = await this.auctionRepository.findOne({ where: { id: auctionId } });
        if (!auction) throw new NotFoundException('Auction not found');

        const timeout = auction.timeoutMinutes * 60 * 1000;

        // Submit to all partners in parallel
        const submissions = partners.map(partner =>
            this.submitToPartner(auction, application, partner)
        );

        // Race between all submissions and timeout
        const timeoutPromise = new Promise<PartnerSubmissionResult[]>((resolve) => {
            setTimeout(() => {
                this.logger.warn(`Auction ${auctionId} timed out after ${auction.timeoutMinutes} minutes`);
                resolve([]);
            }, timeout);
        });

        // Wait for either completion or timeout
        const result = await Promise.race([
            Promise.allSettled(submissions),
            timeoutPromise,
        ]);

        // Extract results
        if (Array.isArray(result) && result.length > 0) {
            return result
                .filter(r => r.status === 'fulfilled')
                .map(r => (r as PromiseFulfilledResult<PartnerSubmissionResult>).value);
        }

        return [];
    }

    /**
     * Submit to a single partner
     */
    private async submitToPartner(
        auction: FinancingAuction,
        application: FinancingApplication,
        partner: IFinancingPartnerPlugin,
    ): Promise<PartnerSubmissionResult> {
        const startTime = Date.now();

        try {
            this.logger.log(`Submitting to partner: ${partner.partnerId}`);

            // Get offers from partner
            const request: FinancingRequest = {
                amount: application.requestedAmount,
                purpose: application.financingType as any,
                urgency: auction.rankingContext.urgency,
                tenure: 12, // Default, could be from application
                businessProfile: application.businessDetails,
            };

            const offers = await partner.getOffers(request);

            const responseTime = Date.now() - startTime;

            return {
                partnerId: partner.partnerId,
                partnerName: partner.partnerName,
                success: true,
                offers,
                responseTime,
                submittedAt: new Date(),
            };
        } catch (error: any) {
            const responseTime = Date.now() - startTime;

            this.logger.error(`Partner ${partner.partnerId} failed: ${error?.message || error}`);

            return {
                partnerId: partner.partnerId,
                partnerName: partner.partnerName,
                success: false,
                error: error?.message || 'Unknown error',
                responseTime,
                submittedAt: new Date(),
            };
        }
    }

    /**
     * Process offer results and save to auction
     */
    private async processOfferResults(
        auctionId: string,
        results: PartnerSubmissionResult[],
    ): Promise<void> {
        const auction = await this.auctionRepository.findOne({ where: { id: auctionId } });
        if (!auction) return;

        // Convert to partner offer records
        const offerRecords: PartnerOfferRecord[] = results
            .filter(r => r.success && r.offers && r.offers.length > 0)
            .map(r => ({
                partnerId: r.partnerId,
                partnerName: r.partnerName,
                offerId: r.offers![0].offerId,
                receivedAt: r.submittedAt,
                responseTime: r.responseTime,
                offer: r.offers![0],
                error: undefined,
            }));

        // Update auction with offers
        auction.offers = offerRecords;
        await this.auctionRepository.save(auction);

        // Emit offer received events
        offerRecords.forEach(offer => {
            this.eventEmitter.emit('auction.offer_received', {
                auctionId,
                partnerId: offer.partnerId,
                offerId: offer.offerId,
            });
        });
    }

    /**
     * Try to complete auction if criteria met
     */
    private async tryCompleteAuction(auctionId: string): Promise<void> {
        const auction = await this.auctionRepository.findOne({ where: { id: auctionId } });
        if (!auction) return;

        const criteria = this.checkCompletionCriteria(auction);

        if (criteria.shouldComplete) {
            this.logger.log(`Completing auction ${auctionId}: ${criteria.reason}`);
            await this.completeAuction(auctionId);
        }
    }

    /**
     * Check if auction can/should be completed
     */
    private checkCompletionCriteria(auction: FinancingAuction): CompletionCriteria {
        const now = new Date();
        const hasTimedOut = now >= auction.expiresAt;
        const offersReceived = auction.offers?.length || 0;
        const hasMinimumOffers = offersReceived >= auction.minOffersRequired;
        const allPartnersResponded = offersReceived >= auction.partnerIds.length;

        const earlyThreshold = auction.metadata?.earlyTerminationThreshold;
        const earlyTerminationMet = earlyThreshold && offersReceived >= earlyThreshold;

        const autoComplete = auction.metadata?.autoComplete !== false;

        let shouldComplete = false;
        let reason = '';

        if (hasTimedOut && hasMinimumOffers) {
            shouldComplete = true;
            reason = 'Timeout reached with minimum offers';
        } else if (autoComplete && allPartnersResponded && hasMinimumOffers) {
            shouldComplete = true;
            reason = 'All partners responded';
        } else if (earlyTerminationMet) {
            shouldComplete = true;
            reason = `Early termination threshold met (${earlyThreshold} offers)`;
        }

        return {
            hasMinimumOffers,
            hasTimedOut,
            allPartnersResponded,
            earlyTerminationMet: earlyTerminationMet || false,
            shouldComplete,
            reason,
        };
    }

    /**
     * Complete auction and select winner
     */
    async completeAuction(auctionId: string): Promise<AuctionResult> {
        const auction = await this.auctionRepository.findOne({ where: { id: auctionId } });
        if (!auction) {
            throw new NotFoundException(`Auction ${auctionId} not found`);
        }

        if (auction.status === AuctionStatus.COMPLETED) {
            return this.buildAuctionResult(auction);
        }

        const offers = auction.offers || [];

        if (offers.length < auction.minOffersRequired) {
            throw new BadRequestException(`Insufficient offers: ${offers.length} < ${auction.minOffersRequired}`);
        }

        // 1. Normalize offers
        const normalizedOffers = await this.normalizationService.normalizeOffers(
            offers.map(o => ({
                offer: o.offer,
                partnerId: o.partnerId,
                partnerName: o.partnerName,
            })),
        );

        // 2. Rank offers
        const rankedOffers = await this.rankingService.rankOffers(
            normalizedOffers,
            auction.rankingContext as RankingContext,
        );

        // 3. Select winner
        const winner = await this.selectWinner(rankedOffers, auction);

        // 4. Calculate analytics
        const analytics = this.calculateAnalytics(auction, offers, rankedOffers, winner);

        // 5. Update auction
        auction.status = AuctionStatus.COMPLETED;
        auction.completedAt = new Date();
        auction.winningOffer = winner;
        auction.analytics = analytics;

        await this.auctionRepository.save(auction);

        // 6. Emit completed event
        this.eventEmitter.emit('auction.completed', {
            auctionId: auction.id,
            winnerId: winner.winnerId,
            totalOffers: offers.length,
        });

        return this.buildAuctionResult(auction);
    }

    /**
     * Select winner from ranked offers
     */
    private async selectWinner(
        rankedOffers: StandardOffer[],
        auction: FinancingAuction,
    ): Promise<WinningOfferDetails> {
        // Apply business rules
        const criteria: WinnerSelectionCriteria = {
            minApprovalProbability: 50,
            maxAcceptableRate: undefined, // Could be from user preferences
        };

        const eligible = rankedOffers.filter(offer =>
            (offer.scores?.approvalProbability || 100) >= criteria.minApprovalProbability
        );

        if (eligible.length === 0) {
            // Fallback to top ranked even if below threshold
            this.logger.warn('No offers met approval threshold, selecting best available');
        }

        const winner = eligible[0] || rankedOffers[0];
        const nextBest = rankedOffers[1];

        // Calculate savings
        const savings = nextBest
            ? nextBest.totalCost - winner.totalCost
            : 0;

        const savingsPercentage = nextBest
            ? (savings / nextBest.totalCost) * 100
            : 0;

        return {
            winnerId: winner.partnerId,
            winnerName: winner.partnerName,
            offerId: winner.offerId,
            rank: 1,
            totalOffers: rankedOffers.length,
            effectiveAPR: winner.effectiveAPR,
            amount: winner.principalAmount,
            tenure: winner.tenure,
            totalCost: winner.totalCost,
            savings,
            savingsPercentage,
            selectedAt: new Date(),
            reason: winner.recommendation || 'Best overall offer',
        };
    }

    /**
     * Calculate auction analytics
     */
    private calculateAnalytics(
        auction: FinancingAuction,
        offers: PartnerOfferRecord[],
        rankedOffers: StandardOffer[],
        winner: WinningOfferDetails,
    ): AuctionAnalytics {
        const responseTimes = offers.map(o => o.responseTime);
        const rates = rankedOffers.map(o => o.effectiveAPR);

        const fastest = offers.reduce((prev, curr) =>
            curr.responseTime < prev.responseTime ? curr : prev
        );

        const slowest = offers.reduce((prev, curr) =>
            curr.responseTime > prev.responseTime ? curr : prev
        );

        const duration = auction.completedAt
            ? auction.completedAt.getTime() - auction.startedAt.getTime()
            : 0;

        return {
            partnersInvited: auction.partnerIds.length,
            offersReceived: offers.length,
            offersRejected: auction.partnerIds.length - offers.length,
            participationRate: (offers.length / auction.partnerIds.length) * 100,

            averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
            fastestPartner: fastest.partnerName,
            fastestResponseTime: fastest.responseTime,
            slowestPartner: slowest.partnerName,
            slowestResponseTime: slowest.responseTime,

            bestRate: Math.min(...rates),
            worstRate: Math.max(...rates),
            averageRate: rates.reduce((a, b) => a + b, 0) / rates.length,
            rateSpread: Math.max(...rates) - Math.min(...rates),

            savingsVsBestAlternative: winner.savings,
            savingsPercentage: winner.savingsPercentage,

            startTime: auction.startedAt,
            endTime: auction.completedAt!,
            durationMs: duration,
        };
    }

    /**
     * Get auction status
     */
    async getAuctionStatus(auctionId: string): Promise<AuctionStatusResponse> {
        const auction = await this.auctionRepository.findOne({ where: { id: auctionId } });

        if (!auction) {
            throw new NotFoundException(`Auction ${auctionId} not found`);
        }

        const now = new Date();
        const offers = auction.offers || [];
        const offersReceived = offers.length;
        const remainingTime = Math.max(0, Math.floor((auction.expiresAt.getTime() - now.getTime()) / 1000));

        // Find current leader if any offers
        let currentLeader;
        if (offers.length > 0) {
            const normalized = await this.normalizationService.normalizeOffers(
                offers.map(o => ({
                    offer: o.offer,
                    partnerId: o.partnerId,
                    partnerName: o.partnerName,
                })),
            );

            const ranked = await this.rankingService.rankOffers(normalized, auction.rankingContext as RankingContext);

            if (ranked.length > 0) {
                currentLeader = {
                    partnerId: ranked[0].partnerId,
                    partnerName: ranked[0].partnerName,
                    effectiveAPR: ranked[0].effectiveAPR,
                    rank: 1,
                };
            }
        }

        const criteria = this.checkCompletionCriteria(auction);

        return {
            auctionId: auction.id,
            status: auction.status,
            partnersInvited: auction.partnerIds.length,
            offersReceived,
            offersExpected: auction.partnerIds.length,
            participationRate: (offersReceived / auction.partnerIds.length) * 100,
            startedAt: auction.startedAt,
            expiresAt: auction.expiresAt,
            remainingTime,
            estimatedCompletionTime: criteria.shouldComplete ? new Date() : null,
            currentLeader,
            offers: offers.map(o => ({
                partnerId: o.partnerId,
                partnerName: o.partnerName,
                receivedAt: o.receivedAt,
                responseTime: o.responseTime,
            })),
            canComplete: criteria.hasMinimumOffers,
            canCancel: auction.status === AuctionStatus.ACTIVE,
            willAutoComplete: auction.metadata?.autoComplete !== false,
        };
    }

    /**
     * Cancel auction
     */
    async cancelAuction(auctionId: string, userId: string, reason: string): Promise<void> {
        const auction = await this.auctionRepository.findOne({ where: { id: auctionId } });

        if (!auction) {
            throw new NotFoundException(`Auction ${auctionId} not found`);
        }

        if (auction.status !== AuctionStatus.ACTIVE && auction.status !== AuctionStatus.PENDING) {
            throw new BadRequestException(`Cannot cancel auction in ${auction.status} status`);
        }

        auction.status = AuctionStatus.CANCELLED;
        auction.completedAt = new Date();
        auction.cancelledBy = userId;
        auction.cancellationReason = reason;

        await this.auctionRepository.save(auction);

        this.eventEmitter.emit('auction.cancelled', {
            auctionId: auction.id,
            reason,
        });
    }

    /**
     * Build auction result from entity
     */
    private buildAuctionResult(auction: FinancingAuction): AuctionResult {
        const duration = auction.completedAt
            ? auction.completedAt.getTime() - auction.startedAt.getTime()
            : Date.now() - auction.startedAt.getTime();

        return {
            auctionId: auction.id,
            status: auction.status,
            totalOffersReceived: auction.offers?.length || 0,
            offers: [], // Populate if needed
            rankedOffers: [], // Populate if needed
            winner: auction.winningOffer || null,
            analytics: auction.analytics || ({} as AuctionAnalytics),
            startedAt: auction.startedAt,
            completedAt: auction.completedAt || null,
            expiresAt: auction.expiresAt,
            duration,
            applicationId: auction.applicationId,
            partnerIds: auction.partnerIds,
        };
    }

    /**
     * Get partners by IDs
     */
    private async getPartners(partnerIds: string[]): Promise<IFinancingPartnerPlugin[]> {
        const partners: IFinancingPartnerPlugin[] = [];

        for (const id of partnerIds) {
            const partner = this.partnerRegistry.getPartner(id);
            if (partner) {
                partners.push(partner);
            }
        }

        return partners;
    }
}
