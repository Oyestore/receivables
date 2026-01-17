import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Portal access mode - determines UI experience
 */
export enum PortalAccessMode {
    CHAT = 'CHAT',       // AI-powered chat interface
    STATIC = 'STATIC'    // Traditional web portal view
}

/**
 * Portal action types for analytics tracking
 */
export enum PortalActionType {
    VIEW = 'VIEW',
    DOWNLOAD_PDF = 'DOWNLOAD_PDF',
    INITIATE_PAYMENT = 'INITIATE_PAYMENT',
    COMPLETE_PAYMENT = 'COMPLETE_PAYMENT',
    RAISE_DISPUTE = 'RAISE_DISPUTE',
    APPROVE_DRAFT = 'APPROVE_DRAFT',
    SHARE_REFERRAL = 'SHARE_REFERRAL'
}

/**
 * Portal action log entry
 */
export interface PortalActionLog {
    type: PortalActionType;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

/**
 * Payer Portal Session Entity
 * Manages secure token-based access to invoices without authentication
 */
@Entity('payer_portal_sessions')
export class PayerPortalSessionEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    tenantId: string;

    @Column()
    @Index()
    invoiceId: string;

    @Column({ nullable: true })
    recipientId: string;

    /**
     * Secure access token (encrypted)
     * Used for public URL access without authentication
     */
    @Column({ unique: true })
    @Index()
    accessToken: string;

    /**
     * Access mode determines the UI experience
     */
    @Column({
        type: 'varchar',
        default: PortalAccessMode.STATIC
    })
    accessMode: PortalAccessMode;

    /**
     * Token expiration time
     * Default: 30 days from creation
     */
    @Column()
    expiresAt: Date;

    /**
     * Session status
     */
    @Column({ default: true })
    isActive: boolean;

    /**
     * Client IP address for security tracking
     */
    @Column({ nullable: true })
    ipAddress: string;

    /**
     * User agent for analytics
     */
    @Column({ nullable: true })
    userAgent: string;

    /**
     * Total view count
     */
    @Column({ default: 0 })
    viewCount: number;

    /**
     * Last accessed timestamp
     */
    @Column({ nullable: true })
    lastAccessedAt: Date;

    /**
     * Actions performed in this session
     */
    @Column('jsonb', { default: [] })
    actionsLog: PortalActionLog[];

    /**
     * Associated chat session ID (if user switches to chat mode)
     */
    @Column({ nullable: true })
    chatSessionId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    /**
     * Check if session is still valid
     */
    isValid(): boolean {
        return this.isActive && new Date() < this.expiresAt;
    }

    /**
     * Log an action
     */
    logAction(type: PortalActionType, metadata?: Record<string, unknown>): void {
        this.actionsLog.push({
            type,
            timestamp: new Date(),
            metadata
        });
        this.lastAccessedAt = new Date();
    }

    /**
     * Increment view count
     */
    recordView(): void {
        this.viewCount++;
        this.lastAccessedAt = new Date();
    }
}
