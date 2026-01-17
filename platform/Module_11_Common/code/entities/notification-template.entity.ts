/**
 * Template Entity
 * 
 * Database entity for notification templates (Email, SMS, WhatsApp)
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne } from 'typeorm';

export enum TemplateType {
    EMAIL = 'email',
    SMS = 'sms',
    WHATSAPP = 'whatsapp',
}

export enum TemplateStatus {
    DRAFT = 'draft',
    PENDING_APPROVAL = 'pending_approval',
    APPROVED = 'approved',
    ACTIVE = 'active',
    ARCHIVED = 'archived',
    REJECTED = 'rejected',
}

export enum TemplateCategory {
    AUTHENTICATION = 'authentication',
    TRANSACTIONAL = 'transactional',
    MARKETING = 'marketing',
    NOTIFICATION = 'notification',
    REMINDER = 'reminder',
    ALERT = 'alert',
}

@Entity('notification_templates')
@Index(['type', 'status', 'language'])
@Index(['name', 'version'])
@Index(['category', 'isActive'])
export class NotificationTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    @Index()
    name: string;

    @Column({ type: 'varchar', length: 200 })
    displayName: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: TemplateType,
    })
    type: TemplateType;

    @Column({
        type: 'enum',
        enum: TemplateCategory,
    })
    category: TemplateCategory;

    @Column({
        type: 'enum',
        enum: TemplateStatus,
        default: TemplateStatus.DRAFT,
    })
    status: TemplateStatus;

    @Column({ type: 'varchar', length: 10, default: 'en' })
    language: string;

    @Column({ type: 'int', default: 1 })
    version: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    // Email-specific fields
    @Column({ type: 'varchar', length: 200, nullable: true })
    subject: string;

    @Column({ type: 'text', nullable: true })
    htmlBody: string;

    @Column({ type: 'text', nullable: true })
    textBody: string;

    // SMS/WhatsApp-specific fields
    @Column({ type: 'text', nullable: true })
    messageBody: string;

    // WhatsApp-specific fields
    @Column({ type: 'varchar', length: 100, nullable: true })
    whatsappTemplateName: string; // Meta-approved template name

    @Column({ type: 'json', nullable: true })
    whatsappComponents: any; // WhatsApp template components

    // Template variables
    @Column({ type: 'json', default: '[]' })
    variables: string[]; // e.g., ['name', 'invoiceNumber', 'amount']

    @Column({ type: 'json', nullable: true })
    variableDescriptions: Record<string, string>; // Variable descriptions for documentation

    // Validation rules
    @Column({ type: 'json', nullable: true })
    validationRules: {
        maxLength?: number;
        requiredVariables?: string[];
        allowedTags?: string[]; // For HTML emails
    };

    // Metadata
    @Column({ type: 'json', nullable: true })
    metadata: {
        tags?: string[];
        useCase?: string;
        exampleData?: Record<string, any>;
        approvedBy?: string;
        approvedAt?: Date;
        rejectionReason?: string;
    };

    // Versioning
    @Column({ type: 'uuid', nullable: true })
    parentTemplateId: string; // Reference to previous version

    @Column({ type: 'text', nullable: true })
    changeLog: string; // Description of changes in this version

    // Usage tracking
    @Column({ type: 'int', default: 0 })
    usageCount: number;

    @Column({ type: 'timestamp', nullable: true })
    lastUsedAt: Date;

    // A/B Testing
    @Column({ type: 'boolean', default: false })
    isABTest: boolean;

    @Column({ type: 'varchar', length: 100, nullable: true })
    abTestGroup: string; // e.g., 'A', 'B'

    @Column({ type: 'float', nullable: true })
    abTestWeight: number; // 0.0 to 1.0

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'varchar', length: 100, nullable: true })
    createdBy: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    updatedBy: string;
}

/**
 * Template Usage Log Entity
 * Tracks template usage for analytics
 */
@Entity('template_usage_logs')
@Index(['templateId', 'sentAt'])
@Index(['recipientId', 'sentAt'])
export class TemplateUsageLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    templateId: string;

    @Column({ type: 'varchar', length: 100 })
    templateName: string;

    @Column({ type: 'int' })
    templateVersion: number;

    @Column({ type: 'varchar', length: 200 })
    recipient: string; // Email, phone number, or WhatsApp ID

    @Column({ type: 'uuid', nullable: true })
    recipientId: string; // User/customer ID

    @Column({ type: 'json', nullable: true })
    variables: Record<string, any>; // Variables used for rendering

    @Column({ type: 'varchar', length: 100, nullable: true })
    messageId: string; // Provider message ID

    @Column({ type: 'enum', enum: ['sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'] })
    status: string;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @Column({ type: 'timestamp' })
    sentAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    deliveredAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    openedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    clickedAt: Date;

    @Column({ type: 'json', nullable: true })
    metadata: {
        campaign?: string;
        abTestGroup?: string;
        userAgent?: string;
        ipAddress?: string;
    };

    @CreateDateColumn()
    createdAt: Date;
}
