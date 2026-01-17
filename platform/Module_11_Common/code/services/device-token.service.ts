/**
 * Device Token Management Service
 * 
 * Manages device tokens for push notifications
 */

import { Repository } from 'typeorm';
import { DeviceToken, DevicePlatform, DeviceTokenStatus } from '../entities/device-token.entity';
import { Logger } from '../logging/logger';

const logger = new Logger('DeviceTokenService');

export interface IDeviceTokenCreateDTO {
    userId: string;
    token: string;
    platform: DevicePlatform;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    language?: string;
    timezone?: string;
    metadata?: any;
}

export class DeviceTokenService {
    constructor(private deviceTokenRepository: Repository<DeviceToken>) {
        logger.info('DeviceTokenService initialized');
    }

    /**
     * Register or update device token
     */
    async registerToken(dto: IDeviceTokenCreateDTO): Promise<DeviceToken> {
        // Check if token already exists
        let deviceToken = await this.deviceTokenRepository.findOne({
            where: { token: dto.token },
        });

        if (deviceToken) {
            // Update existing token
            deviceToken.userId = dto.userId;
            deviceToken.platform = dto.platform;
            deviceToken.deviceModel = dto.deviceModel;
            deviceToken.osVersion = dto.osVersion;
            deviceToken.appVersion = dto.appVersion;
            deviceToken.language = dto.language;
            deviceToken.timezone = dto.timezone;
            deviceToken.metadata = dto.metadata;
            deviceToken.status = DeviceTokenStatus.ACTIVE;
            deviceToken.lastActiveAt = new Date();

            logger.info('Device token updated', {
                userId: dto.userId,
                platform: dto.platform,
            });
        } else {
            // Create new token
            deviceToken = this.deviceTokenRepository.create({
                ...dto,
                status: DeviceTokenStatus.ACTIVE,
                lastActiveAt: new Date(),
                notificationsSent: 0,
                notificationsOpened: 0,
                topics: [],
            });

            logger.info('Device token registered', {
                userId: dto.userId,
                platform: dto.platform,
            });
        }

        return this.deviceTokenRepository.save(deviceToken);
    }

    /**
     * Get all active tokens for a user
     */
    async getUserTokens(userId: string, platform?: DevicePlatform): Promise<DeviceToken[]> {
        const where: any = {
            userId,
            status: DeviceTokenStatus.ACTIVE,
        };

        if (platform) {
            where.platform = platform;
        }

        return this.deviceTokenRepository.find({ where });
    }

    /**
     * Get token strings for a user
     */
    async getUserTokenStrings(userId: string, platform?: DevicePlatform): Promise<string[]> {
        const tokens = await this.getUserTokens(userId, platform);
        return tokens.map(t => t.token);
    }

    /**
     * Unregister device token
     */
    async unregisterToken(token: string): Promise<void> {
        await this.deviceTokenRepository.update(
            { token },
            { status: DeviceTokenStatus.INACTIVE }
        );

        logger.info('Device token unregistered', { token: token.substring(0, 20) + '...' });
    }

    /**
     * Mark token as invalid (e.g., when FCM reports it)
     */
    async markTokenAsInvalid(token: string): Promise<void> {
        await this.deviceTokenRepository.update(
            { token },
            { status: DeviceTokenStatus.INVALID }
        );

        logger.info('Device token marked as invalid', { token: token.substring(0, 20) + '...' });
    }

    /**
     * Update last active time
     */
    async updateLastActive(token: string): Promise<void> {
        await this.deviceTokenRepository.update(
            { token },
            { lastActiveAt: new Date() }
        );
    }

    /**
     * Increment notification sent counter
     */
    async incrementNotificationsSent(token: string): Promise<void> {
        await this.deviceTokenRepository.increment({ token }, 'notificationsSent', 1);
    }

    /**
     * Increment notifications opened counter
     */
    async incrementNotificationsOpened(token: string): Promise<void> {
        await this.deviceTokenRepository.increment({ token }, 'notificationsOpened', 1);
    }

    /**
     * Subscribe to topic
     */
    async subscribeToTopic(userId: string, topic: string): Promise<void> {
        const tokens = await this.getUserTokens(userId);

        for (const token of tokens) {
            if (!token.topics.includes(topic)) {
                token.topics.push(topic);
                await this.deviceTokenRepository.save(token);
            }
        }

        logger.info('User subscribed to topic', { userId, topic });
    }

    /**
     * Unsubscribe from topic
     */
    async unsubscribeFromTopic(userId: string, topic: string): Promise<void> {
        const tokens = await this.getUserTokens(userId);

        for (const token of tokens) {
            token.topics = token.topics.filter(t => t !== topic);
            await this.deviceTokenRepository.save(token);
        }

        logger.info('User unsubscribed from topic', { userId, topic });
    }

    /**
     * Get users subscribed to topic
     */
    async getUsersForTopic(topic: string): Promise<string[]> {
        const tokens = await this.deviceTokenRepository
            .createQueryBuilder('token')
            .where(':topic = ANY(token.topics)', { topic })
            .andWhere('token.status = :status', { status: DeviceTokenStatus.ACTIVE })
            .getMany();

        // Get unique user IDs
        const userIds = [...new Set(tokens.map(t => t.userId))];

        return userIds;
    }

    /**
     * Clean up inactive tokens (older than X days)
     */
    async cleanupInactiveTokens(daysInactive: number = 90): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

        const result = await this.deviceTokenRepository
            .createQueryBuilder()
            .delete()
            .where('lastActiveAt < :cutoffDate', { cutoffDate })
            .orWhere('status = :status', { status: DeviceTokenStatus.INVALID })
            .execute();

        logger.info('Inactive tokens cleaned up', {
            daysInactive,
            deletedCount: result.affected,
        });

        return result.affected || 0;
    }

    /**
     * Get token statistics
     */
    async getTokenStatistics(userId: string): Promise<any> {
        const tokens = await this.deviceTokenRepository.find({
            where: { userId },
        });

        const activeTokens = tokens.filter(t => t.status === DeviceTokenStatus.ACTIVE);

        const platformCounts = tokens.reduce((acc, token) => {
            acc[token.platform] = (acc[token.platform] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const totalSent = tokens.reduce((sum, t) => sum + t.notificationsSent, 0);
        const totalOpened = tokens.reduce((sum, t) => sum + t.notificationsOpened, 0);

        return {
            totalTokens: tokens.length,
            activeTokens: activeTokens.length,
            platformCounts,
            totalNotificationsSent: totalSent,
            totalNotificationsOpened: totalOpened,
            openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        };
    }
}
