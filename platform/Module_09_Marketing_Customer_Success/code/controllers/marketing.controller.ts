import {
    Controller,
    Post,
    Get,
    Put,
    Param,
    Body,
    Query,
    HttpStatus,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ReferralService, CreateReferralDto } from '../services/referral.service';
import { CampaignService, CampaignType } from '../services/campaign.service';
import { CustomerHealthService } from '../services/customer-health.service';
import { FraudDetectionService, TransactionData } from '../services/fraud-detection.service';

/**
 * Marketing & Customer Success Controller
 * REST API for referrals, campaigns, customer health, and fraud detection
 */
@Controller('marketing')
export class MarketingController {
    constructor(
        private readonly referralService: ReferralService,
        private readonly campaignService: CampaignService,
        private readonly customerHealthService: CustomerHealthService,
        private readonly fraudService: FraudDetectionService,
    ) { }

    // ============================================
    // REFERRAL ENDPOINTS
    // ============================================

    /**
     * Create a new referral
     * POST /marketing/referrals
     */
    @Post('referrals')
    async createReferral(
        @Body() dto: CreateReferralDto,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const referral = await this.referralService.createReferral(tenantId, dto);

        return {
            statusCode: HttpStatus.CREATED,
            message: 'Referral created successfully',
            data: referral,
        };
    }

    /**
     * Convert referral (when referred user signs up)
     * POST /marketing/referrals/:code/convert
     */
    @Post('referrals/:code/convert')
    async convertReferral(
        @Param('code') referralCode: string,
        @Body('referredUserId') referredUserId: string,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const referral = await this.referralService.convertReferral(
            tenantId,
            referralCode,
            referredUserId,
        );

        return {
            statusCode: HttpStatus.OK,
            message: 'Referral converted successfully',
            data: referral,
        };
    }

    /**
     * Complete referral (when referred user makes first purchase)
     * POST /marketing/referrals/:id/complete
     */
    @Post('referrals/:id/complete')
    async completeReferral(
        @Param('id') referralId: string,
        @Body('firstPurchaseAmount') firstPurchaseAmount: number,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const referral = await this.referralService.completeReferral(
            tenantId,
            referralId,
            firstPurchaseAmount,
        );

        return {
            statusCode: HttpStatus.OK,
            message: 'Referral completed successfully',
            data: referral,
        };
    }

    /**
     * Get user referrals
     * GET /marketing/referrals/user/:userId
     */
    @Get('referrals/user/:userId')
    async getUserReferrals(
        @Param('userId') userId: string,
        @Query('status') status: string,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const referrals = await this.referralService.getUserReferrals(
            tenantId,
            userId,
            status as any,
        );

        return {
            statusCode: HttpStatus.OK,
            data: referrals,
            count: referrals.length,
        };
    }

    /**
     * Get referral statistics
     * GET /marketing/referrals/user/:userId/stats
     */
    @Get('referrals/user/:userId/stats')
    async getReferralStats(
        @Param('userId') userId: string,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const stats = await this.referralService.getUserReferralStats(tenantId, userId);

        return {
            statusCode: HttpStatus.OK,
            data: stats,
        };
    }

    /**
     * Get referral leaderboard
     * GET /marketing/referrals/leaderboard
     */
    @Get('referrals/leaderboard')
    async getLeaderboard(
        @Query('limit') limit: string,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const leaderboard = await this.referralService.getLeaderboard(
            tenantId,
            parseInt(limit) || 10,
        );

        return {
            statusCode: HttpStatus.OK,
            data: leaderboard,
        };
    }

    /**
     * Redeem rewards
     * POST /marketing/referrals/rewards/redeem
     */
    @Post('referrals/rewards/redeem')
    async redeemRewards(
        @Body('userId') userId: string,
        @Body('rewardIds') rewardIds: string[],
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const result = await this.referralService.redeemRewards(
            tenantId,
            userId,
            rewardIds,
        );

        return {
            statusCode: HttpStatus.OK,
            message: 'Rewards redeemed successfully',
            data: result,
        };
    }

    // ============================================
    // CAMPAIGN ENDPOINTS
    // ============================================

    /**
     * Create campaign
     * POST /marketing/campaigns
     */
    @Post('campaigns')
    async createCampaign(
        @Body() campaignData: any,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
        campaignData.createdBy = req.user?.id || 'system';

        const campaign = await this.campaignService.createCampaign(
            tenantId as string,
            (req.user?.id as string) || 'system',
            campaignData,
        );

        return {
            statusCode: HttpStatus.CREATED,
            message: 'Campaign created successfully',
            data: campaign,
        };
    }

    /**
     * Launch campaign
     * POST /marketing/campaigns/:id/launch
     */
    @Post('campaigns/:id/launch')
    async launchCampaign(
        @Param('id') campaignId: string,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const result = await this.campaignService.launchCampaign(tenantId, campaignId);

        return {
            statusCode: HttpStatus.OK,
            message: 'Campaign launched successfully',
            data: result,
        };
    }

    /**
     * Get campaign analytics
     * GET /marketing/campaigns/:id/analytics
     */
    @Get('campaigns/:id/analytics')
    async getCampaignAnalytics(
        @Param('id') campaignId: string,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const analytics = await this.campaignService.getCampaignAnalytics(
            tenantId,
            campaignId,
        );

        return {
            statusCode: HttpStatus.OK,
            data: analytics,
        };
    }

    /**
     * Segment audience
     * POST /marketing/campaigns/segment
     */
    @Post('campaigns/segment')
    async segmentAudience(
        @Body() criteria: any,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const segments = await this.campaignService.segmentAudience(tenantId, criteria);

        return {
            statusCode: HttpStatus.OK,
            message: 'Audience segmented successfully',
            data: segments,
        };
    }

    // ============================================
    // CUSTOMER HEALTH ENDPOINTS
    // ============================================

    /**
     * Calculate customer health score
     * POST /marketing/customer-health/:customerId
     */
    @Post('customer-health/:customerId')
    async calculateHealthScore(
        @Param('customerId') customerId: string,
        @Body() customerData: any,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const healthScore = await this.customerHealthService.calculateHealthScore(
            tenantId,
            customerId,
            customerData,
        );

        return {
            statusCode: HttpStatus.OK,
            data: healthScore,
        };
    }

    /**
     * Get at-risk customers
     * GET /marketing/customer-health/at-risk
     */
    @Get('customer-health/at-risk')
    async getAtRiskCustomers(
        @Query('threshold') threshold: string,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const atRisk = await this.customerHealthService.identifyAtRiskCustomers(
            tenantId,
            parseInt(threshold) || 50,
        );

        return {
            statusCode: HttpStatus.OK,
            data: atRisk,
            count: atRisk.length,
        };
    }

    /**
     * Trigger interventions for customer
     * POST /marketing/customer-health/:customerId/interventions
     */
    @Post('customer-health/:customerId/interventions')
    async triggerInterventions(
        @Param('customerId') customerId: string,
        @Body() healthScore: any,
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const interventions = await this.customerHealthService.triggerInterventions(
            tenantId,
            customerId,
            healthScore,
        );

        return {
            statusCode: HttpStatus.OK,
            message: 'Interventions triggered successfully',
            data: interventions,
        };
    }

    /**
     * Get portfolio health summary
     * POST /marketing/portfolio/health-summary
     */
    @Post('portfolio/health-summary')
    async getPortfolioHealth(
        @Body('customerIds') customerIds: string[],
        @Req() req: any,
    ) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

        const summary = await this.customerHealthService.getPortfolioHealthSummary(
            tenantId,
            customerIds,
        );

        return {
            statusCode: HttpStatus.OK,
            data: summary,
        };
    }

    // ============================================
    // FRAUD DETECTION ENDPOINTS
    // ============================================

    /**
     * Check transaction for fraud
     * POST /marketing/fraud/check
     */
    @Post('fraud/check')
    async checkFraud(
        @Body() transaction: TransactionData,
        @Req() req: any,
    ) {
        const fraudCheck = await this.fraudService.comprehensiveFraudCheck(transaction);

        return {
            statusCode: HttpStatus.OK,
            data: fraudCheck,
        };
    }

    /**
     * Real-time fraud monitoring (instant decision)
     * POST /marketing/fraud/monitor
     */
    @Post('fraud/monitor')
    async realTimeFraudMonitor(
        @Body() transaction: TransactionData,
        @Req() req: any,
    ) {
        const decision = await this.fraudService.realTimeFraudMonitoring(transaction);

        return {
            statusCode: HttpStatus.OK,
            data: decision,
        };
    }

    /**
     * Get customer fraud statistics
     * POST /marketing/fraud/customer-stats
     */
    @Post('fraud/customer-stats')
    async getCustomerFraudStats(
        @Body('customerId') customerId: string,
        @Body('transactionHistory') transactionHistory: TransactionData[],
        @Req() req: any,
    ) {
        const stats = await this.fraudService.getCustomerFraudStats(
            customerId,
            transactionHistory,
        );

        return {
            statusCode: HttpStatus.OK,
            data: stats,
        };
    }
}
