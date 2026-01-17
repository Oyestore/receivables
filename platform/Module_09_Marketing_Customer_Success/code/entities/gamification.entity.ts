import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../../Module_12_Administration/src/entities/user.entity';

export enum PointEventType {
    INVOICE_CREATED = 'invoice_created',
    INVOICE_PAID = 'invoice_paid',
    REFERRAL_SIGNUP = 'referral_signup',
    REFERRAL_CONVERTED = 'referral_converted',
    MILESTONE_ACHIEVED = 'milestone_achieved',
    STREAK_MAINTAINED = 'streak_maintained',
    PROFILE_COMPLETED = 'profile_completed',
    FIRST_PAYMENT = 'first_payment',
    DISPUTE_RESOLVED = 'dispute_resolved',
}

@Entity('gamification_points')
export class GamificationPoints {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ type: 'enum', enum: PointEventType })
    eventType: PointEventType;

    @Column({ type: 'int' })
    points: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'reference_id', nullable: true })
    referenceId: string; // Invoice ID, Referral ID, etc.

    @Column({ name: 'reference_type', nullable: true })
    referenceType: string; // 'invoice', 'referral', etc.

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('user_levels')
export class UserLevel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid', unique: true })
    userId: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ name: 'total_points', type: 'int', default: 0 })
    totalPoints: number;

    @Column({ name: 'current_level', type: 'int', default: 1 })
    currentLevel: number;

    @Column({ name: 'points_to_next_level', type: 'int' })
    pointsToNextLevel: number;

    @Column({ name: 'current_streak', type: 'int', default: 0 })
    currentStreak: number;

    @Column({ name: 'longest_streak', type: 'int', default: 0 })
    longestStreak: number;

    @Column({ name: 'last_activity_date', type: 'date', nullable: true })
    lastActivityDate: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

export enum AchievementCategory {
    INVOICING = 'invoicing',
    COLLECTIONS = 'collections',
    REFERRALS = 'referrals',
    ENGAGEMENT = 'engagement',
    MILESTONES = 'milestones',
}

@Entity('achievements')
export class Achievement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string;

    @Column()
    name: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'enum', enum: AchievementCategory })
    category: AchievementCategory;

    @Column({ name: 'icon_url', nullable: true })
    iconUrl: string;

    @Column({ name: 'points_reward', type: 'int' })
    pointsReward: number;

    @Column({ name: 'requirement_type' })
    requirementType: string; // 'count', 'value', 'streak', etc.

    @Column({ name: 'requirement_value', type: 'int' })
    requirementValue: number;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @Column({ name: 'display_order', type: 'int', default: 0 })
    displayOrder: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

@Entity('user_achievements')
export class UserAchievement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ name: 'achievement_id', type: 'uuid' })
    achievementId: string;

    @ManyToOne(() => Achievement)
    @JoinColumn({ name: 'achievement_id' })
    achievement: Achievement;

    @Column({ name: 'progress', type: 'int', default: 0 })
    progress: number;

    @Column({ name: 'is_unlocked', type: 'boolean', default: false })
    isUnlocked: boolean;

    @Column({ name: 'unlocked_at', type: 'timestamp', nullable: true })
    unlockedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
