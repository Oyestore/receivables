/**
 * Web Push Provider (W3C Standard)
 * 
 * 100% Open-Source, Zero-Cost Push Notifications
 * 
 * Features:
 * - Standards-based (Web Push Protocol / VAPID)
 * - Works on all modern browsers (Chrome, Firefox, Safari, Edge)
 * - Progressive Web App (PWA) support
 * - No third-party dependencies (except open-source library)
 * - Complete data ownership
 * 
 * Library: web-push (MIT License, open-source)
 * GitHub: https://github.com/web-push-libs/web-push
 */

import { Logger } from '../logging/logger';
import { ExternalServiceError } from '../errors/app-error';
import { IPushNotificationData, IPushNotificationResult } from './push.provider';

const logger = new Logger('WebPushProvider');

export interface IWebPushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface IWebPushOptions {
    vapidPublicKey: string;
    vapidPrivateKey: string;
    vapidSubject: string; // 'mailto:admin@smeplatform.com' or 'https://smeplatform.com'
}

/**
 * Web Push Provider
 * Zero-cost push notifications for web browsers and PWAs
 */
export class WebPushProvider {
    private webpush: any;
    private vapidDetails: {
        subject: string;
        publicKey: string;
        privateKey: string;
    };

    constructor(options: IWebPushOptions) {
        try {
            this.webpush = require('web-push');

            // Set VAPID details
            this.vapidDetails = {
                subject: options.vapidSubject,
                publicKey: options.vapidPublicKey,
                privateKey: options.vapidPrivateKey,
            };

            this.webpush.setVapidDetails(
                this.vapidDetails.subject,
                this.vapidDetails.publicKey,
                this.vapidDetails.privateKey
            );

            logger.info('Web Push provider initialized', {
                subject: options.vapidSubject,
            });
        } catch (error) {
            logger.error('Web Push initialization failed', { error });
            throw new Error('web-push package not installed. Run: npm install web-push');
        }
    }

    /**
     * Send notification to single subscription
     */
    async sendToSubscription(
        subscription: IWebPushSubscription,
        notification: IPushNotificationData
    ): Promise<IPushNotificationResult> {
        try {
            const payload = JSON.stringify({
                title: notification.title,
                body: notification.body,
                icon: notification.icon || '/logo192.png',
                badge: notification.badge || '/badge.png',
                image: notification.imageUrl,
                data: notification.data || {},
                actions: notification.actions || [],
                tag: notification.data?.tag || 'default',
                requireInteraction: notification.data?.requireInteraction || false,
                timestamp: Date.now(),
            });

            const options = {
                TTL: 86400, // 24 hours
                urgency: 'high' as const,
            };

            const result = await this.webpush.sendNotification(subscription, payload, options);

            logger.info('Web Push notification sent', {
                endpoint: subscription.endpoint.substring(0, 50) + '...',
                statusCode: result.statusCode,
            });

            return {
                success: result.statusCode >= 200 && result.statusCode < 300,
                messageId: `webpush_${Date.now()}`,
            };
        } catch (error: any) {
            logger.error('Web Push notification failed', {
                endpoint: subscription.endpoint.substring(0, 50) + '...',
                error: error.message,
                statusCode: error.statusCode,
            });

            // Handle specific errors
            if (error.statusCode === 410) {
                // Subscription expired
                throw new Error('SUBSCRIPTION_EXPIRED');
            }

            throw new ExternalServiceError('Web Push notification failed', {
                provider: 'web-push',
                error: error.message,
                statusCode: error.statusCode,
            });
        }
    }

    /**
     * Send notification to multiple subscriptions
     */
    async sendToSubscriptions(
        subscriptions: IWebPushSubscription[],
        notification: IPushNotificationData
    ): Promise<IPushNotificationResult> {
        const results = await Promise.allSettled(
            subscriptions.map(sub => this.sendToSubscription(sub, notification))
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.filter(r => r.status === 'rejected').length;

        logger.info('Web Push multicast sent', {
            total: subscriptions.length,
            success: successCount,
            failed: failureCount,
        });

        return {
            success: failureCount === 0,
            successCount,
            failureCount,
        };
    }

    /**
     * Generate VAPID keys (run once during setup)
     * 
     * Usage:
     * const keys = WebPushProvider.generateVAPIDKeys();
     * console.log('Public Key:', keys.publicKey);
     * console.log('Private Key:', keys.privateKey);
     * // Save these in your .env file
     */
    static generateVAPIDKeys(): { publicKey: string; privateKey: string } {
        const webpush = require('web-push');
        const vapidKeys = webpush.generateVAPIDKeys();

        return {
            publicKey: vapidKeys.publicKey,
            privateKey: vapidKeys.privateKey,
        };
    }

    /**
     * Get public VAPID key for client subscription
     */
    getPublicKey(): string {
        return this.vapidDetails.publicKey;
    }
}

/**
 * Web Push Subscription Manager
 * Manages browser push subscriptions in database
 */
import { Repository } from 'typeorm';

export interface IWebPushSubscriptionEntity {
    id: string;
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
    createdAt: Date;
    lastUsedAt?: Date;
}

export class WebPushSubscriptionManager {
    constructor(private subscriptionRepository: Repository<any>) {
        logger.info('WebPushSubscriptionManager initialized');
    }

    /**
     * Save subscription
     */
    async saveSubscription(
        userId: string,
        subscription: IWebPushSubscription,
        userAgent?: string
    ): Promise<void> {
        // Check if subscription already exists
        const existing = await this.subscriptionRepository.findOne({
            where: { endpoint: subscription.endpoint },
        });

        if (existing) {
            // Update existing
            existing.userId = userId;
            existing.p256dh = subscription.keys.p256dh;
            existing.auth = subscription.keys.auth;
            existing.userAgent = userAgent;
            existing.lastUsedAt = new Date();

            await this.subscriptionRepository.save(existing);
            logger.info('Web Push subscription updated', { userId });
        } else {
            // Create new
            const newSubscription = this.subscriptionRepository.create({
                userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userAgent,
                createdAt: new Date(),
                lastUsedAt: new Date(),
            });

            await this.subscriptionRepository.save(newSubscription);
            logger.info('Web Push subscription saved', { userId });
        }
    }

    /**
     * Get user subscriptions
     */
    async getUserSubscriptions(userId: string): Promise<IWebPushSubscription[]> {
        const subscriptions = await this.subscriptionRepository.find({
            where: { userId },
        });

        return subscriptions.map((sub: any) => ({
            endpoint: sub.endpoint,
            keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
            },
        }));
    }

    /**
     * Remove subscription
     */
    async removeSubscription(endpoint: string): Promise<void> {
        await this.subscriptionRepository.delete({ endpoint });
        logger.info('Web Push subscription removed', {
            endpoint: endpoint.substring(0, 50) + '...',
        });
    }

    /**
     * Clean up expired subscriptions
     */
    async cleanupExpired(daysInactive: number = 90): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

        const result = await this.subscriptionRepository
            .createQueryBuilder()
            .delete()
            .where('lastUsedAt < :cutoffDate OR lastUsedAt IS NULL', { cutoffDate })
            .execute();

        logger.info('Expired Web Push subscriptions cleaned up', {
            deletedCount: result.affected,
        });

        return result.affected || 0;
    }
}
