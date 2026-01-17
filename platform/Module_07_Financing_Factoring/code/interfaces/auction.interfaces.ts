import { StandardOffer } from '../services/offer-normalization.service';
import { RankingContext } from '../services/offer-ranking.service';
import {
    AuctionStatus,
    PartnerOfferRecord,
    WinningOfferDetails,
    AuctionAnalytics,
} from '../entities/auction.entity';

/**
 * Options for starting an auction
 */
export interface AuctionOptions {
    timeoutMinutes?: number; // How long to wait for offers (default: 15)
    minOffersRequired?: number; // Minimum offers to complete (default: 2)
    rankingContext?: RankingContext; // How to rank offers
    autoComplete?: boolean; // Auto-complete when all partners respond (default: true)
    earlyTerminationThreshold?: number; // Complete if X offers received (default: null)
}

/**
 * Result of a completed auction
 */
export interface AuctionResult {
    auctionId: string;
    status: AuctionStatus;

    // Offers
    totalOffersReceived: number;
    offers: StandardOffer[];
    rankedOffers: StandardOffer[];

    // Winner
    winner: WinningOfferDetails | null;

    // Analytics
    analytics: AuctionAnalytics;

    // Timestamps
    startedAt: Date;
    completedAt: Date | null;
    expiresAt: Date;
    duration: number; // milliseconds

    // Metadata
    applicationId: string;
    partnerIds: string[];
}

/**
 * Real-time auction status
 */
export interface AuctionStatusResponse {
    auctionId: string;
    status: AuctionStatus;

    // Progress
    partnersInvited: number;
    offersReceived: number;
    offersExpected: number;
    participationRate: number; // percentage

    // Timing
    startedAt: Date;
    expiresAt: Date;
    remainingTime: number; // seconds
    estimatedCompletionTime: Date | null;

    // Current best (if any offers received)
    currentLeader?: {
        partnerId: string;
        partnerName: string;
        effectiveAPR: number;
        rank: number;
    };

    // Offers received (summary)
    offers: Array<{
        partnerId: string;
        partnerName: string;
        receivedAt: Date;
        responseTime: number;
    }>;

    // Next steps
    canComplete: boolean; // Has minimum offers
    canCancel: boolean;
    willAutoComplete: boolean;
}

/**
 * Partner submission result
 */
export interface PartnerSubmissionResult {
    partnerId: string;
    partnerName: string;
    success: boolean;
    offers?: any[]; // Raw partner offers
    error?: string;
    responseTime: number; // milliseconds
    submittedAt: Date;
}

/**
 * Collected offer with metadata
 */
export interface CollectedOffer {
    partnerId: string;
    partnerName: string;
    offer: StandardOffer;
    receivedAt: Date;
    responseTime: number;
}

/**
 * Auction completion criteria
 */
export interface CompletionCriteria {
    hasMinimumOffers: boolean;
    hasTimedOut: boolean;
    allPartnersResponded: boolean;
    earlyTerminationMet: boolean;
    shouldComplete: boolean;
    reason: string;
}

/**
 * Winner selection criteria
 */
export interface WinnerSelectionCriteria {
    minApprovalProbability: number; // percentage (default: 50)
    maxAcceptableRate?: number; // maximum APR (default: null)
    minPartnerReputation?: number; // minimum reputation score (default: null)
    requirePrepaymentAllowed?: boolean; // (default: false)
}

/**
 * Auction event for notifications
 */
export interface AuctionEvent {
    auctionId: string;
    eventType: 'started' | 'offer_received' | 'completed' | 'cancelled' | 'expired';
    timestamp: Date;
    data: any;
}
