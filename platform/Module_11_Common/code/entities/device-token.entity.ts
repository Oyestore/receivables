/**
 * Device Token Management
 * 
 * Manages device tokens for push notifications with:
 * - Token registration/unregistration
 * - Multi-device support per user
 * - Platform detection (iOS, Android, Web)
 * - Token validation
 * - Inactive token cleanup
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum DevicePlatform {
    IOS = 'ios',
    ANDROID = 'android',
    WEB = 'web',
}

export enum DeviceTokenStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    INVALID = 'invalid',
}

@Entity('device_tokens')
@Index(['userId', 'platform', 'status'])
@Index(['token'], { unique: true })
export class DeviceToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    userId: string;

    @Column({ type: 'varchar', length: 500, unique: true })
    token: string;

    @Column({
        type: 'enum',
        enum: DevicePlatform,
    })
    platform: DevicePlatform;

    @Column({
        type: 'enum',
        enum: DeviceTokenStatus,
        default: DeviceTokenStatus.ACTIVE,
    })
    status: DeviceTokenStatus;

    @Column({ type: 'varchar', length: 200, nullable: true })
    deviceModel: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    osVersion: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    appVersion: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    language: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    timezone: string;

    @Column({ type: 'timestamp', nullable: true })
    lastActiveAt: Date;

    @Column({ type: 'int', default: 0 })
    notificationsSent: number;

    @Column({ type: 'int', default: 0 })
    notificationsOpened: number;

    @Column({ type: 'json', nullable: true })
    topics: string[]; // Subscribed topics

    @Column({ type: 'json', nullable: true })
    metadata: {
        deviceId?: string;
        userAgent?: string;
        ipAddress?: string;
    };

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
