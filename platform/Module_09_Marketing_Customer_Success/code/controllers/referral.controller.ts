import { Controller, Get, Post, Put, Param, Body, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ReferralService } from '../services/referral.service';
import { Request } from 'express';

@Controller('api/v1/referrals')
export class ReferralController {
    constructor(private readonly referralService: ReferralService) { }

    /**
     * Generate new referral code for user
     */
    @Post('generate-code')
    @HttpCode(HttpStatus.CREATED)
    async generateCode(
        @Body()
        body: {
            referrerId: string;
            utmSource?: string;
            utmMedium?: string;
            utmCampaign?: string;
        },
    ) {
        return this.referralService.generateReferralCode(body);
    }

    /**
     * Track referral click
     */
    @Post('track-click/:code')
    @HttpCode(HttpStatus.OK)
    async trackClick(@Param('code') code: string, @Req() req: Request) {
        const ip = req.ip || req.connection.remoteAddress;
        await this.referralService.trackClick(code, ip);
        return { message: 'Click tracked successfully' };
    }

    /**
     * Apply referral code during signup
     */
    @Post('apply-code')
    @HttpCode(HttpStatus.OK)
    async applyCode(
        @Body() body: { referralCode: string; refereeId: string },
        @Req() req: Request,
    ) {
        const ip = req.ip || req.connection.remoteAddress;
        return this.referralService.applyReferralCode({
            ...body,
            refereeIp: ip,
        });
    }

    /**
     * Mark referral as completed (first payment made)
     */
    @Post(':referralId/complete')
    @HttpCode(HttpStatus.OK)
    async completeReferral(@Param('referralId') referralId: string, @Req() req: Request) {
        const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
        await this.referralService.completeReferral(tenantId, referralId);
        return { message: 'Referral completed and rewards created' };
    }

    /**
     * Get user's referral statistics
     */
    @Get('stats/:userId')
    async getStats(@Param('userId') userId: string) {
        return this.referralService.getStats(userId);
    }

    /**
     * Get user's referrals
     */
    @Get('my-referrals/:userId')
    async getMyReferrals(@Param('userId') userId: string, @Req() req: Request) {
        const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
        return this.referralService.getUserReferrals(tenantId, userId);
    }

    /**
     * Get user's referral analytics
     */
    @Get('analytics/:userId')
    async getAnalytics(@Param('userId') userId: string) {
        return this.referralService.getAnalytics(userId);
    }

    /**
     * Get leaderboard
     */
    @Get('leaderboard')
    async getLeaderboard(@Req() req: Request, @Query('limit') limit?: number) {
        const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
        const resolvedLimit = typeof limit === 'number' ? limit : 100;
        return this.referralService.getLeaderboard(tenantId, resolvedLimit);
    }

    /**
     * Get user's rewards
     */
    @Get('rewards/:userId')
    async getRewards(@Param('userId') userId: string) {
        return this.referralService.getUserRewards(userId);
    }

    /**
     * Claim reward
     */
    @Put('rewards/:rewardId/claim')
    @HttpCode(HttpStatus.OK)
    async claimReward(
        @Param('rewardId') rewardId: string,
        @Body() body: { userId: string },
    ) {
        return this.referralService.claimReward(rewardId, body.userId);
    }
}
