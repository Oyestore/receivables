import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    GamificationPoints,
    UserLevel,
    Achievement,
    UserAchievement,
    PointEventType,
    AchievementCategory,
} from '../entities/gamification.entity';

// Level progression requirements
const LEVEL_REQUIREMENTS = [
    { level: 1, pointsRequired: 0 },
    { level: 2, pointsRequired: 100 },
    { level: 3, pointsRequired: 250 },
    { level: 4, pointsRequired: 500 },
    { level: 5, pointsRequired: 1000 },
    { level: 6, pointsRequired: 2000 },
    { level: 7, pointsRequired: 3500 },
    { level: 8, pointsRequired: 5500 },
    { level: 9, pointsRequired: 8500 },
    { level: 10, pointsRequired: 12500 },
];

// Point rewards for different events
const POINT_REWARDS = {
    [PointEventType.INVOICE_CREATED]: 10,
    [PointEventType.INVOICE_PAID]: 50,
    [PointEventType.REFERRAL_SIGNUP]: 100,
    [PointEventType.REFERRAL_CONVERTED]: 500,
    [PointEventType.MILESTONE_ACHIEVED]: 200,
    [PointEventType.STREAK_MAINTAINED]: 25,
    [PointEventType.PROFILE_COMPLETED]: 50,
    [PointEventType.FIRST_PAYMENT]: 100,
    [PointEventType.DISPUTE_RESOLVED]: 150,
};

@Injectable()
export class GamificationService {
    private readonly logger = new Logger(GamificationService.name);

    constructor(
        @InjectRepository(GamificationPoints)
        private readonly pointsRepository: Repository<GamificationPoints>,
        @InjectRepository(UserLevel)
        private readonly userLevelRepository: Repository<UserLevel>,
        @InjectRepository(Achievement)
        private readonly achievementRepository: Repository<Achievement>,
        @InjectRepository(UserAchievement)
        private readonly userAchievementRepository: Repository<UserAchievement>,
    ) { }

    /**
     * Award points to user for an event
     */
    async awardPoints(
        userId: string,
        eventType: PointEventType,
        referenceId?: string,
        referenceType?: string,
        customPoints?: number,
    ): Promise<GamificationPoints> {
        const points = customPoints || POINT_REWARDS[eventType] || 0;

        // Create points record
        const pointsRecord = this.pointsRepository.create({
            userId,
            eventType,
            points,
            referenceId,
            referenceType,
            description: this.getEventDescription(eventType),
        });

        await this.pointsRepository.save(pointsRecord);

        // Update user level
        await this.updateUserLevel(userId, points);

        // Check for achievements
        await this.checkAchievements(userId, eventType);

        // Update streak
        await this.updateStreak(userId);

        this.logger.log(`Awarded ${points} points to user ${userId} for ${eventType}`);

        return pointsRecord;
    }

    /**
     * Update user level based on total points
     */
    private async updateUserLevel(userId: string, pointsToAdd: number): Promise<void> {
        let userLevel = await this.userLevelRepository.findOne({ where: { userId } });

        if (!userLevel) {
            userLevel = this.userLevelRepository.create({
                userId,
                totalPoints: 0,
                currentLevel: 1,
                pointsToNextLevel: LEVEL_REQUIREMENTS[1].pointsRequired,
            });
        }

        userLevel.totalPoints += pointsToAdd;

        // Check for level up
        const newLevel = this.calculateLevel(userLevel.totalPoints);
        if (newLevel > userLevel.currentLevel) {
            userLevel.currentLevel = newLevel;
            
            // Calculate points to next level immediately
            const nextLevelReq = LEVEL_REQUIREMENTS.find((req) => req.level > userLevel.currentLevel);
            userLevel.pointsToNextLevel = nextLevelReq
                ? nextLevelReq.pointsRequired - userLevel.totalPoints
                : 0;

            // Save state BEFORE recursion to prevent infinite loop
            await this.userLevelRepository.save(userLevel);

            // Award bonus points for leveling up
            await this.awardPoints(
                userId,
                PointEventType.MILESTONE_ACHIEVED,
                null,
                'level_up',
                100,
            );

            this.logger.log(`User ${userId} leveled up to level ${newLevel}!`);
            return; // Exit as we already saved and recursed
        }

        // Calculate points to next level
        const nextLevelReq = LEVEL_REQUIREMENTS.find((req) => req.level > userLevel.currentLevel);
        userLevel.pointsToNextLevel = nextLevelReq
            ? nextLevelReq.pointsRequired - userLevel.totalPoints
            : 0;

        await this.userLevelRepository.save(userLevel);
    }

    /**
     * Calculate user level from total points
     */
    private calculateLevel(totalPoints: number): number {
        for (let i = LEVEL_REQUIREMENTS.length - 1; i >= 0; i--) {
            if (totalPoints >= LEVEL_REQUIREMENTS[i].pointsRequired) {
                return LEVEL_REQUIREMENTS[i].level;
            }
        }
        return 1;
    }

    /**
     * Update user's daily activity streak
     */
    private async updateStreak(userId: string): Promise<void> {
        const userLevel = await this.userLevelRepository.findOne({ where: { userId } });
        if (!userLevel) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastActivity = userLevel.lastActivityDate
            ? new Date(userLevel.lastActivityDate)
            : null;

        if (lastActivity) {
            lastActivity.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor(
                (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysDiff === 1) {
                // Continue streak
                userLevel.currentStreak += 1;
                if (userLevel.currentStreak > userLevel.longestStreak) {
                    userLevel.longestStreak = userLevel.currentStreak;
                }

                // Award streak bonus every 7 days
                if (userLevel.currentStreak % 7 === 0) {
                    await this.awardPoints(userId, PointEventType.STREAK_MAINTAINED);
                }
            } else if (daysDiff > 1) {
                // Streak broken
                userLevel.currentStreak = 1;
            }
        } else {
            // First activity
            userLevel.currentStreak = 1;
            userLevel.longestStreak = 1;
        }

        userLevel.lastActivityDate = today;
        await this.userLevelRepository.save(userLevel);
    }

    /**
     * Check and unlock achievements for user
     */
    private async checkAchievements(
        userId: string,
        eventType: PointEventType,
    ): Promise<void> {
        // Get all active achievements
        const achievements = await this.achievementRepository.find({
            where: { isActive: true },
        });

        for (const achievement of achievements) {
            // Check if user already unlocked this
            let userAchievement = await this.userAchievementRepository.findOne({
                where: { userId, achievementId: achievement.id },
            });

            if (userAchievement?.isUnlocked) continue;

            if (!userAchievement) {
                userAchievement = this.userAchievementRepository.create({
                    userId,
                    achievementId: achievement.id,
                    progress: 0,
                });
            }

            // Update progress based on achievement type
            const progress = await this.calculateAchievementProgress(
                userId,
                achievement,
                eventType,
            );

            userAchievement.progress = progress;

            // Check if unlocked
            if (progress >= achievement.requirementValue && !userAchievement.isUnlocked) {
                userAchievement.isUnlocked = true;
                userAchievement.unlockedAt = new Date();

                // Award achievement points
                await this.awardPoints(
                    userId,
                    PointEventType.MILESTONE_ACHIEVED,
                    achievement.id,
                    'achievement',
                    achievement.pointsReward,
                );

                this.logger.log(
                    `User ${userId} unlocked achievement: ${achievement.name}`,
                );
            }

            await this.userAchievementRepository.save(userAchievement);
        }
    }

    /**
     * Calculate achievement progress
     */
    private async calculateAchievementProgress(
        userId: string,
        achievement: Achievement,
        eventType: PointEventType,
    ): Promise<number> {
        switch (achievement.requirementType) {
            case 'invoice_count':
                return await this.pointsRepository.count({
                    where: { userId, eventType: PointEventType.INVOICE_CREATED },
                });

            case 'paid_invoice_count':
                return await this.pointsRepository.count({
                    where: { userId, eventType: PointEventType.INVOICE_PAID },
                });

            case 'referral_count':
                return await this.pointsRepository.count({
                    where: { userId, eventType: PointEventType.REFERRAL_SIGNUP },
                });

            case 'total_points':
                const userLevel = await this.userLevelRepository.findOne({
                    where: { userId },
                });
                return userLevel?.totalPoints || 0;

            case 'streak_days':
                const level = await this.userLevelRepository.findOne({ where: { userId } });
                return level?.longestStreak || 0;

            default:
                return 0;
        }
    }

    /**
     * Get user's gamification stats
     */
    async getUserStats(userId: string) {
        const userLevel = await this.userLevelRepository.findOne({
            where: { userId },
        });

        const recentPoints = await this.pointsRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 10,
        });

        const achievements = await this.userAchievementRepository.find({
            where: { userId },
            relations: ['achievement'],
            order: { unlockedAt: 'DESC' },
        });

        return {
            level: userLevel?.currentLevel || 1,
            totalPoints: userLevel?.totalPoints || 0,
            pointsToNextLevel: userLevel?.pointsToNextLevel || 100,
            currentStreak: userLevel?.currentStreak || 0,
            longestStreak: userLevel?.longestStreak || 0,
            recentPoints,
            achievements: achievements.map((ua) => ({
                ...ua.achievement,
                progress: ua.progress,
                isUnlocked: ua.isUnlocked,
                unlockedAt: ua.unlockedAt,
            })),
        };
    }

    /**
     * Get leaderboard
     */
    async getLeaderboard(limit: number = 100) {
        return await this.userLevelRepository.find({
            relations: ['user'],
            order: { totalPoints: 'DESC' },
            take: limit,
        });
    }

    /**
     * Seed initial achievements
     */
    async seedAchievements(): Promise<void> {
        const achievements = [
            // Invoicing
            {
                code: 'FIRST_INVOICE',
                name: 'First Steps',
                description: 'Create your first invoice',
                category: AchievementCategory.INVOICING,
                pointsReward: 50,
                requirementType: 'invoice_count',
                requirementValue: 1,
            },
            {
                code: 'INVOICE_MASTER',
                name: 'Invoice Master',
                description: 'Create 100 invoices',
                category: AchievementCategory.INVOICING,
                pointsReward: 500,
                requirementType: 'invoice_count',
                requirementValue: 100,
            },
            // Collections
            {
                code: 'FIRST_PAYMENT',
                name: 'Cash is King',
                description: 'Receive your first payment',
                category: AchievementCategory.COLLECTIONS,
                pointsReward: 100,
                requirementType: 'paid_invoice_count',
                requirementValue: 1,
            },
            {
                code: 'PAYMENT_PRO',
                name: 'Payment Pro',
                description: 'Receive 50 payments',
                category: AchievementCategory.COLLECTIONS,
                pointsReward: 750,
                requirementType: 'paid_invoice_count',
                requirementValue: 50,
            },
            // Referrals
            {
                code: 'FIRST_REFERRAL',
                name: 'Share the Love',
                description: 'Refer your first user',
                category: AchievementCategory.REFERRALS,
                pointsReward: 200,
                requirementType: 'referral_count',
                requirementValue: 1,
            },
            {
                code: 'REFERRAL_CHAMPION',
                name: 'Referral Champion',
                description: 'Refer 10 users',
                category: AchievementCategory.REFERRALS,
                pointsReward: 2000,
                requirementType: 'referral_count',
                requirementValue: 10,
            },
            // Engagement
            {
                code: 'WEEK_STREAK',
                name: 'Consistent Creator',
                description: 'Maintain a 7-day streak',
                category: AchievementCategory.ENGAGEMENT,
                pointsReward: 150,
                requirementType: 'streak_days',
                requirementValue: 7,
            },
            {
                code: 'MONTH_STREAK',
                name: 'Dedication Master',
                description: 'Maintain a 30-day streak',
                category: AchievementCategory.ENGAGEMENT,
                pointsReward: 1000,
                requirementType: 'streak_days',
                requirementValue: 30,
            },
            // Milestones
            {
                code: 'POINTS_1K',
                name: 'Rising Star',
                description: 'Earn 1,000 points',
                category: AchievementCategory.MILESTONES,
                pointsReward: 100,
                requirementType: 'total_points',
                requirementValue: 1000,
            },
            {
                code: 'POINTS_10K',
                name: 'Platform Legend',
                description: 'Earn 10,000 points',
                category: AchievementCategory.MILESTONES,
                pointsReward: 1000,
                requirementType: 'total_points',
                requirementValue: 10000,
            },
        ];

        for (const achievement of achievements) {
            const existing = await this.achievementRepository.findOne({
                where: { code: achievement.code },
            });

            if (!existing) {
                await this.achievementRepository.save(
                    this.achievementRepository.create(achievement),
                );
                this.logger.log(`Seeded achievement: ${achievement.name}`);
            }
        }
    }

    /**
     * Get event description
     */
    private getEventDescription(eventType: PointEventType): string {
        const descriptions = {
            [PointEventType.INVOICE_CREATED]: 'Created an invoice',
            [PointEventType.INVOICE_PAID]: 'Invoice payment received',
            [PointEventType.REFERRAL_SIGNUP]: 'Referred a new user',
            [PointEventType.REFERRAL_CONVERTED]: 'Referral became a customer',
            [PointEventType.MILESTONE_ACHIEVED]: 'Achieved a milestone',
            [PointEventType.STREAK_MAINTAINED]: 'Maintained daily streak',
            [PointEventType.PROFILE_COMPLETED]: 'Completed profile',
            [PointEventType.FIRST_PAYMENT]: 'First payment received',
            [PointEventType.DISPUTE_RESOLVED]: 'Resolved a dispute',
        };

        return descriptions[eventType] || 'Activity reward';
    }
}
