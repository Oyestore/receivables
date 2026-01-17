/**
 * Push Notification Provider Integration
 * 
 * Production-ready push notification support via:
 * - Firebase Cloud Messaging (FCM) - Primary
 * - OneSignal - Alternative
 * 
 * Features:
 * - Device token management
 * - Topic/segment-based notifications
 * - Scheduled notifications
 * - Rich notifications (images, actions)
 * - Delivery tracking
 */

import { Logger } from '../logging/logger';
import { ExternalServiceError } from '../errors/app-error';

const logger = new Logger('PushNotificationProvider');

/**
 * Push notification data interface
 */
export interface IPushNotificationData {
    title: string;
    body: string;
    imageUrl?: string;
    icon?: string;
    badge?: string;
    sound?: string;
    clickAction?: string;
    data?: Record<string, any>;
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
}

/**
 * Push notification options
 */
export interface IPushNotificationOptions {
    priority?: 'high' | 'normal';
    ttl?: number; // Time-to-live in seconds
    collapseKey?: string;
    contentAvailable?: boolean;
    mutableContent?: boolean;
    category?: string;
}

/**
 * Push notification result
 */
export interface IPushNotificationResult {
    success: boolean;
    messageId?: string;
    failureCount?: number;
    successCount?: number;
    error?: string;
}

/**
 * Firebase Cloud Messaging Provider
 */
export class FirebaseCloudMessagingProvider {
    private admin: any;
    private messaging: any;

    constructor(config: {
        serviceAccount?: any;
        serviceAccountPath?: string;
        databaseURL?: string;
    }) {
        try {
            const admin = require('firebase-admin');

            // Initialize Firebase Admin
            if (!admin.apps.length) {
                const initConfig: any = {};

                if (config.serviceAccount) {
                    initConfig.credential = admin.credential.cert(config.serviceAccount);
                } else if (config.serviceAccountPath) {
                    initConfig.credential = admin.credential.cert(
                        require(config.serviceAccountPath)
                    );
                }

                if (config.databaseURL) {
                    initConfig.databaseURL = config.databaseURL;
                }

                admin.initializeApp(initConfig);
            }

            this.admin = admin;
            this.messaging = admin.messaging();

            logger.info('Firebase Cloud Messaging provider initialized');
        } catch (error) {
            logger.error('FCM initialization failed', { error });
            throw new Error('Firebase Admin SDK not available or configuration invalid');
        }
    }

    /**
     * Send notification to single device
     */
    async sendToDevice(
        token: string,
        notification: IPushNotificationData,
        options?: IPushNotificationOptions
    ): Promise<IPushNotificationResult> {
        try {
            const message: any = {
                token,
                notification: {
                    title: notification.title,
                    body: notification.body,
                    imageUrl: notification.imageUrl,
                },
                data: notification.data,
            };

            // Add Android-specific config
            if (options) {
                message.android = {
                    priority: options.priority || 'high',
                    ttl: options.ttl ? options.ttl * 1000 : undefined,
                    notification: {
                        sound: notification.sound || 'default',
                        icon: notification.icon,
                        clickAction: notification.clickAction,
                    },
                };

                // Add iOS-specific config
                message.apns = {
                    payload: {
                        aps: {
                            badge: notification.badge ? parseInt(notification.badge) : undefined,
                            sound: notification.sound || 'default',
                            contentAvailable: options.contentAvailable,
                            mutableContent: options.mutableContent,
                            category: options.category,
                        },
                    },
                };
            }

            const response = await this.messaging.send(message);

            logger.info('Push notification sent via FCM', {
                token: token.substring(0, 20) + '...',
                messageId: response,
            });

            return {
                success: true,
                messageId: response,
            };
        } catch (error: any) {
            logger.error('FCM push notification failed', {
                token: token.substring(0, 20) + '...',
                error: error.message,
                code: error.code,
            });

            throw new ExternalServiceError('FCM push notification failed', {
                provider: 'fcm',
                error: error.message,
                code: error.code,
            });
        }
    }

    /**
     * Send notification to multiple devices
     */
    async sendToDevices(
        tokens: string[],
        notification: IPushNotificationData,
        options?: IPushNotificationOptions
    ): Promise<IPushNotificationResult> {
        try {
            const message: any = {
                notification: {
                    title: notification.title,
                    body: notification.body,
                    imageUrl: notification.imageUrl,
                },
                data: notification.data,
                tokens,
            };

            if (options) {
                message.android = {
                    priority: options.priority || 'high',
                    ttl: options.ttl ? options.ttl * 1000 : undefined,
                };

                message.apns = {
                    payload: {
                        aps: {
                            sound: notification.sound || 'default',
                        },
                    },
                };
            }

            const response = await this.messaging.sendEachForMulticast(message);

            logger.info('Multicast push notification sent via FCM', {
                totalDevices: tokens.length,
                successCount: response.successCount,
                failureCount: response.failureCount,
            });

            return {
                success: response.failureCount === 0,
                successCount: response.successCount,
                failureCount: response.failureCount,
            };
        } catch (error: any) {
            logger.error('FCM multicast push notification failed', {
                tokenCount: tokens.length,
                error: error.message,
            });

            throw new ExternalServiceError('FCM multicast push notification failed', {
                provider: 'fcm',
                error: error.message,
            });
        }
    }

    /**
     * Send notification to topic
     */
    async sendToTopic(
        topic: string,
        notification: IPushNotificationData,
        options?: IPushNotificationOptions
    ): Promise<IPushNotificationResult> {
        try {
            const message: any = {
                topic,
                notification: {
                    title: notification.title,
                    body: notification.body,
                    imageUrl: notification.imageUrl,
                },
                data: notification.data,
            };

            if (options) {
                message.android = {
                    priority: options.priority || 'high',
                };

                message.apns = {
                    payload: {
                        aps: {
                            sound: notification.sound || 'default',
                        },
                    },
                };
            }

            const response = await this.messaging.send(message);

            logger.info('Topic push notification sent via FCM', {
                topic,
                messageId: response,
            });

            return {
                success: true,
                messageId: response,
            };
        } catch (error: any) {
            logger.error('FCM topic push notification failed', {
                topic,
                error: error.message,
            });

            throw new ExternalServiceError('FCM topic push notification failed', {
                provider: 'fcm',
                error: error.message,
            });
        }
    }

    /**
     * Subscribe device to topic
     */
    async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
        try {
            await this.messaging.subscribeToTopic(tokens, topic);

            logger.info('Devices subscribed to topic', {
                topic,
                deviceCount: tokens.length,
            });
        } catch (error: any) {
            logger.error('Topic subscription failed', {
                topic,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Unsubscribe device from topic
     */
    async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
        try {
            await this.messaging.unsubscribeFromTopic(tokens, topic);

            logger.info('Devices unsubscribed from topic', {
                topic,
                deviceCount: tokens.length,
            });
        } catch (error: any) {
            logger.error('Topic unsubscription failed', {
                topic,
                error: error.message,
            });
            throw error;
        }
    }
}

/**
 * OneSignal Provider
 */
export class OneSignalProvider {
    private appId: string;
    private apiKey: string;

    constructor(config: { appId: string; apiKey: string }) {
        this.appId = config.appId;
        this.apiKey = config.apiKey;

        logger.info('OneSignal provider initialized', { appId: config.appId });
    }

    /**
     * Send notification to specific users
     */
    async sendToUsers(
        userIds: string[],
        notification: IPushNotificationData,
        options?: IPushNotificationOptions
    ): Promise<IPushNotificationResult> {
        try {
            const axios = require('axios');

            const payload = {
                app_id: this.appId,
                include_external_user_ids: userIds,
                headings: { en: notification.title },
                contents: { en: notification.body },
                data: notification.data,
                big_picture: notification.imageUrl,
                ios_badgeType: 'Increase',
                ios_badgeCount: notification.badge ? parseInt(notification.badge) : 1,
                priority: options?.priority === 'high' ? 10 : 5,
                ttl: options?.ttl,
            };

            const response = await axios.post(
                'https://onesignal.com/api/v1/notifications',
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${this.apiKey}`,
                    },
                }
            );

            logger.info('Push notification sent via OneSignal', {
                userCount: userIds.length,
                notificationId: response.data.id,
                recipients: response.data.recipients,
            });

            return {
                success: true,
                messageId: response.data.id,
                successCount: response.data.recipients,
            };
        } catch (error: any) {
            logger.error('OneSignal push notification failed', {
                userCount: userIds.length,
                error: error.response?.data || error.message,
            });

            throw new ExternalServiceError('OneSignal push notification failed', {
                provider: 'onesignal',
                error: error.response?.data?.errors || error.message,
            });
        }
    }

    /**
     * Send notification to all users (broadcast)
     */
    async sendBroadcast(
        notification: IPushNotificationData,
        options?: IPushNotificationOptions
    ): Promise<IPushNotificationResult> {
        try {
            const axios = require('axios');

            const payload = {
                app_id: this.appId,
                included_segments: ['All'],
                headings: { en: notification.title },
                contents: { en: notification.body },
                data: notification.data,
                big_picture: notification.imageUrl,
            };

            const response = await axios.post(
                'https://onesignal.com/api/v1/notifications',
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${this.apiKey}`,
                    },
                }
            );

            logger.info('Broadcast push notification sent via OneSignal', {
                notificationId: response.data.id,
            });

            return {
                success: true,
                messageId: response.data.id,
            };
        } catch (error: any) {
            logger.error('OneSignal broadcast push notification failed', {
                error: error.response?.data || error.message,
            });

            throw new ExternalServiceError('OneSignal broadcast failed', {
                provider: 'onesignal',
                error: error.response?.data?.errors || error.message,
            });
        }
    }

    /**
     * Cancel scheduled notification
     */
    async cancelNotification(notificationId: string): Promise<void> {
        try {
            const axios = require('axios');

            await axios.delete(
                `https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${this.appId}`,
                {
                    headers: {
                        'Authorization': `Basic ${this.apiKey}`,
                    },
                }
            );

            logger.info('Notification cancelled', { notificationId });
        } catch (error: any) {
            logger.error('Cancel notification failed', {
                notificationId,
                error: error.response?.data || error.message,
            });
            throw error;
        }
    }
}

/**
 * Push Notification Provider Factory
 */
export class PushNotificationProviderFactory {
    static createFCM(config: any): FirebaseCloudMessagingProvider {
        return new FirebaseCloudMessagingProvider(config);
    }

    static createOneSignal(config: { appId: string; apiKey: string }): OneSignalProvider {
        return new OneSignalProvider(config);
    }
}
