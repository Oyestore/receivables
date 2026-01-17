import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { GamificationService } from '../services/gamification.service';
import { PointEventType } from '../entities/gamification.entity';

@Controller('api/v1/gamification')
export class GamificationController {
    constructor(private readonly gamificationService: GamificationService) { }

    /**
     * Award points to user
     */
    @Post('points/award')
    @HttpCode(HttpStatus.CREATED)
    async awardPoints(
        @Body()
        body: {
            userId: string;
            eventType: PointEventType;
            referenceId?: string;
            referenceType?: string;
            customPoints?: number;
        },
    ) {
        return this.gamificationService.awardPoints(
            body.userId,
            body.eventType,
            body.referenceId,
            body.referenceType,
            body.customPoints,
        );
    }

    /**
     * Get user's gamification stats
     */
    @Get('users/:userId/stats')
    async getUserStats(@Param('userId') userId: string) {
        return this.gamificationService.getUserStats(userId);
    }

    /**
     * Get leaderboard
     */
    @Get('leaderboard')
    async getLeaderboard(@Query('limit') limit?: number) {
        return this.gamificationService.getLeaderboard(limit ? parseInt(limit.toString()) : 100);
    }

    /**
     * Seed achievements (admin only)
     */
    @Post('achievements/seed')
    @HttpCode(HttpStatus.OK)
    async seedAchievements() {
        await this.gamificationService.seedAchievements();
        return { message: 'Achievements seeded successfully' };
    }
}
