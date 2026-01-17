import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CommunityIntelligenceService } from '../services/community-intelligence.service';
import { SuperReferralEngine2Service } from '../services/super-referral-engine-2.service';

/**
 * Growth Catalyst Controller
 * 
 * REST API endpoints for Phase 9.5 transformative growth features
 */

@Controller('api/v1/growth')
export class GrowthCatalystController {
    constructor(
        private readonly communityService: CommunityIntelligenceService,
        private readonly referralService: SuperReferralEngine2Service,
    ) { }

    // ========================================================================
    // COMMUNITY INTELLIGENCE ENDPOINTS
    // ========================================================================

    @Post('community/posts')
    @HttpCode(HttpStatus.CREATED)
    async createPost(
        @Body() body: {
            tenantId: string;
            authorId: string;
            title: string;
            content: string;
            category: string;
            tags?: string[];
        },
    ) {
        return this.communityService.createPost(body.tenantId, {
            authorId: body.authorId,
            title: body.title,
            content: body.content,
            category: body.category,
            tags: body.tags,
        });
    }

    @Post('community/templates')
    @HttpCode(HttpStatus.CREATED)
    async submitTemplate(
        @Body() body: {
            creatorId: string;
            name: string;
            description: string;
            category: string;
            templateData: Record<string, any>;
        },
    ) {
        return this.communityService.submitTemplate(body);
    }

    @Post('community/templates/:templateId/download')
    @HttpCode(HttpStatus.OK)
    async downloadTemplate(
        @Param('templateId') templateId: string,
        @Body() body: { userId: string },
    ) {
        return this.communityService.downloadTemplate(templateId, body.userId);
    }

    @Post('community/templates/:templateId/rate')
    @HttpCode(HttpStatus.OK)
    async rateTemplate(
        @Param('templateId') templateId: string,
        @Body() body: {
            userId: string;
            rating: number;
            successReport?: {
                achieved: boolean;
                dsoImprovement?: number;
                collectionRateImprovement?: number;
            };
        },
    ) {
        return this.communityService.rateTemplate(
            templateId,
            body.userId,
            body.rating,
            body.successReport,
        );
    }

    @Post('community/peers/match')
    @HttpCode(HttpStatus.OK)
    async findPeerMatches(
        @Body() body: {
            userId: string;
            preferences: {
                lookingFor: 'mentoring' | 'peer_learning' | 'collaboration';
                expertiseAreas?: string[];
            };
        },
    ) {
        return this.communityService.findPeerMatches(
            body.userId,
            body.preferences,
        );
    }

    @Get('community/trending')
    async getTrendingTopics(
        @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'week',
    ) {
        return this.communityService.getTrendingTopics(timeframe);
    }

    @Get('community/contributors/top')
    async getTopContributors(
        @Query('timeframe') timeframe: 'week' | 'month' | 'all_time' = 'month',
        @Query('limit') limit: number = 10,
    ) {
        return this.communityService.getTopContributors(timeframe, limit);
    }

    @Get('community/analytics')
    async getCommunityAnalytics() {
        return this.communityService.getCommunityAnalytics();
    }

    // ========================================================================
    // REFERRAL ENGINE 2.0 ENDPOINTS
    // ========================================================================

    @Post('referrals/send')
    @HttpCode(HttpStatus.CREATED)
    async sendReferral(
        @Body() body: {
            referrerId: string;
            referredContact: {
                email: string;
                name?: string;
                company?: string;
            };
            context?: {
                referrerLTV?: number;
                referredCompanySize?: 'small' | 'medium' | 'large';
                industryMatch?: boolean;
                timeUrgency?: 'high' | 'medium' | 'low';
                competitiveThreat?: boolean;
            };
        },
    ) {
        return this.referralService.sendReferral(
            body.referrerId,
            body.referredContact,
            body.context,
        );
    }

    @Post('referrals/:inviteId/convert')
    @HttpCode(HttpStatus.OK)
    async trackConversion(
        @Param('inviteId') inviteId: string,
        @Body() body: { referredUserId: string },
    ) {
        return this.referralService.trackConversion(
            inviteId,
            body.referredUserId,
        );
    }

    @Post('referrals/rewards/calculate')
    @HttpCode(HttpStatus.OK)
    async calculateDynamicReward(
        @Body() body: {
            referrerId: string;
            context: {
                referrerLTV?: number;
                referredCompanySize?: 'small' | 'medium' | 'large';
                industryMatch?: boolean;
                timeUrgency?: 'high' | 'medium' | 'low';
                competitiveThreat?: boolean;
            };
        },
    ) {
        return this.referralService.calculateDynamicReward(
            body.referrerId,
            body.context,
        );
    }

    @Get('referrals/dashboard/:userId')
    async getAmbassadorDashboard(
        @Param('userId') userId: string,
    ) {
        return this.referralService.getAmbassadorDashboard(userId);
    }

    @Get('referrals/suggestions/:userId')
    async getSuggestedReferrals(
        @Param('userId') userId: string,
    ) {
        return this.referralService.getSuggestedReferrals(userId);
    }

    @Post('referrals/social/share')
    @HttpCode(HttpStatus.OK)
    async generateSocialShare(
        @Body() body: {
            userId: string;
            platform: 'linkedin' | 'twitter' | 'facebook' | 'whatsapp';
        },
    ) {
        return this.referralService.generateSocialShare(
            body.userId,
            body.platform,
        );
    }

    @Get('referrals/leaderboard')
    async getLeaderboard(
        @Query('timeframe') timeframe: 'week' | 'month' | 'all_time' = 'month',
        @Query('limit') limit: number = 10,
    ) {
        return this.referralService.getLeaderboard(timeframe, limit);
    }
}
