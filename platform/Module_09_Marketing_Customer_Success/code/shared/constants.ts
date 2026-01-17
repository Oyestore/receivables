/**
 * Module 09 - Marketing & Customer Success Constants
 * Shared constants and types across all services
 */

// Customer Health Scoring Constants
export const ENGAGEMENT_MULTIPLIER = 5;
export const USAGE_MULTIPLIER = 2;
export const PAYMENT_PENALTY = 3;
export const SUPPORT_PENALTY = 10;

// Health Score Weights
export const WEIGHT_ENGAGEMENT = 0.3;
export const WEIGHT_USAGE = 0.3;
export const WEIGHT_PAYMENT = 0.3;
export const WEIGHT_SUPPORT = 0.1;

// Risk Thresholds
export const LOW_ENGAGEMENT_THRESHOLD = 30;
export const LOW_PAYMENT_HEALTH_THRESHOLD = 50;
export const LOW_SUPPORT_HEALTH_THRESHOLD = 40;
export const HIGH_OVERALL_SCORE_THRESHOLD = 80;

// Referral Tier Thresholds
export const PLATINUM_THRESHOLD = 50;
export const GOLD_THRESHOLD = 20;
export const SILVER_THRESHOLD = 10;

// Referral Reward Amounts (in paise/cents)
export const REFERRAL_SIGNUP_REWARD = 500;
export const REFERRAL_COMPLETION_BASE = 1000;
export const PURCHASE_PERCENTAGE_REWARD = 0.05; // 5%

// Lead Scoring Constants
export const BUSINESS_EMAIL_BONUS = 10;
export const COMPANY_NAME_BONUS = 5;
export const PHONE_BONUS = 5;

/**
 * Type-safe interfaces to replace `any` types
 */

// Referral Statistics
export interface ReferralStats {
    totalReferrals: number;
    successfulReferrals: number;
    pendingReferrals: number;
    totalRewardsEarned: number;
    currentTier: string;
    nextTierProgress: number;
}

// Campaign Analytics
export interface CampaignAnalytics {
    id: string;
    name: string;
    status: string;
    stats: {
        sent: number;
        opened: number;
        clicked: number;
        converted: number;
        rates: {
            open: number;
            click: number;
            conversion: number;
        };
    };
}

// Customer Health Metrics
export interface CustomerHealthMetrics {
    loginCount: number;
    invoiceCount: number;
    paymentDelayDays: number;
    supportTickets: number;
}

// Leaderboard Entry
export interface LeaderboardEntry {
    userId: string;
    referralCount: number;
    tier: string;
}

// Audience Segmentation Result
export interface AudienceSegmentResult {
    segmentId: string;
    count: number;
    criteria: Record<string, any>;
}

// Referral Application Data
export interface ReferralApplicationData {
    referralCode: string;
    refereeId: string;
    refereeIp: string;
}

// User Stats Response
export interface UserStatsResponse {
    totalReferrals: number;
    successfulReferrals: number;
    pendingReferrals: number;
    totalRewardsEarned: number;
    currentTier: string;
    nextTierProgress: number;
}

// Analytics Response
export interface ReferralAnalyticsResponse {
    views: number;
    clicks: number;
    conversions: number;
    history: any[];
}

// Reward Redemption Result
export interface RewardRedemptionResult {
    totalAmount: number;
    redeemedCount: number;
}
