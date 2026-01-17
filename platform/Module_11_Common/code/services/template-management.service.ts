/**
 * Template Management Service
 * 
 * Manages notification templates with:
 * - CRUD operations
 * - Versioning
 * - Approval workflow
 * - Template rendering
 * - A/B testing
 * - Usage analytics
 */

import { Repository } from 'typeorm';
import { Logger } from '../logging/logger';
import {
    NotificationTemplate,
    TemplateType,
    TemplateStatus,
    TemplateCategory,
    TemplateUsageLog,
} from '../entities/notification-template.entity';

const logger = new Logger('TemplateManagementService');

export interface ITemplateCreateDTO {
    name: string;
    displayName: string;
    description?: string;
    type: TemplateType;
    category: TemplateCategory;
    language?: string;
    subject?: string;
    htmlBody?: string;
    textBody?: string;
    messageBody?: string;
    whatsappTemplateName?: string;
    whatsappComponents?: any;
    variables?: string[];
    variableDescriptions?: Record<string, string>;
    metadata?: any;
    createdBy?: string;
}

export interface ITemplateUpdateDTO extends Partial<ITemplateCreateDTO> {
    changeLog?: string;
    updatedBy?: string;
}

export interface ITemplateRenderOptions {
    variables: Record<string, any>;
    recipientId?: string;
    campaignId?: string;
    trackOpens?: boolean;
    trackClicks?: boolean;
}

export interface IRenderedTemplate {
    subject?: string;
    html?: string;
    text?: string;
    message?: string;
    templateId: string;
    templateVersion: number;
}

export class TemplateManagementService {
    constructor(
        private templateRepository: Repository<NotificationTemplate>,
        private usageLogRepository: Repository<TemplateUsageLog>
    ) {
        logger.info('TemplateManagementService initialized');
    }

    /**
     * Create new template
     */
    async createTemplate(dto: ITemplateCreateDTO): Promise<NotificationTemplate> {
        logger.info('Creating template', { name: dto.name, type: dto.type });

        // Check for duplicate name
        const existing = await this.templateRepository.findOne({
            where: { name: dto.name },
        });

        if (existing) {
            throw new Error(`Template with name '${dto.name}' already exists`);
        }

        const template = this.templateRepository.create({
            ...dto,
            status: TemplateStatus.DRAFT,
            version: 1,
            isActive: false,
            usageCount: 0,
            language: dto.language || 'en',
        });

        const saved = await this.templateRepository.save(template);

        logger.info('Template created', {
            id: saved.id,
            name: saved.name,
            type: saved.type,
        });

        return saved;
    }

    /**
     * Get template by ID
     */
    async getTemplate(id: string): Promise<NotificationTemplate | null> {
        return this.templateRepository.findOne({ where: { id } });
    }

    /**
     * Get template by name (latest active version)
     */
    async getTemplateByName(
        name: string,
        language: string = 'en'
    ): Promise<NotificationTemplate | null> {
        return this.templateRepository.findOne({
            where: {
                name,
                language,
                status: TemplateStatus.ACTIVE,
                isActive: true,
            },
            order: { version: 'DESC' },
        });
    }

    /**
     * List templates
     */
    async listTemplates(filters?: {
        type?: TemplateType;
        category?: TemplateCategory;
        status?: TemplateStatus;
        language?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ templates: NotificationTemplate[]; total: number }> {
        const query = this.templateRepository.createQueryBuilder('template');

        if (filters?.type) {
            query.andWhere('template.type = :type', { type: filters.type });
        }

        if (filters?.category) {
            query.andWhere('template.category = :category', { category: filters.category });
        }

        if (filters?.status) {
            query.andWhere('template.status = :status', { status: filters.status });
        }

        if (filters?.language) {
            query.andWhere('template.language = :language', { language: filters.language });
        }

        if (filters?.search) {
            query.andWhere(
                '(template.name LIKE :search OR template.displayName LIKE :search OR template.description LIKE :search)',
                { search: `%${filters.search}%` }
            );
        }

        query.orderBy('template.updatedAt', 'DESC');

        if (filters?.limit) {
            query.take(filters.limit);
        }

        if (filters?.offset) {
            query.skip(filters.offset);
        }

        const [templates, total] = await query.getManyAndCount();

        return { templates, total };
    }

    /**
     * Update template
     */
    async updateTemplate(id: string, dto: ITemplateUpdateDTO): Promise<NotificationTemplate> {
        logger.info('Updating template', { id });

        const template = await this.getTemplate(id);

        if (!template) {
            throw new Error('Template not found');
        }

        // Reset status to draft if content changed
        const contentChanged =
            dto.subject !== undefined ||
            dto.htmlBody !== undefined ||
            dto.textBody !== undefined ||
            dto.messageBody !== undefined;

        if (contentChanged && template.status === TemplateStatus.ACTIVE) {
            throw new Error('Cannot modify active template. Create a new version instead.');
        }

        Object.assign(template, dto);
        template.updatedAt = new Date();

        const updated = await this.templateRepository.save(template);

        logger.info('Template updated', { id: updated.id, name: updated.name });

        return updated;
    }

    /**
     * Create new version of template
     */
    async createVersion(
        templateId: string,
        dto: ITemplateUpdateDTO
    ): Promise<NotificationTemplate> {
        logger.info('Creating template version', { templateId });

        const originalTemplate = await this.getTemplate(templateId);

        if (!originalTemplate) {
            throw new Error('Original template not found');
        }

        // Create new version
        const newVersion = this.templateRepository.create({
            ...originalTemplate,
            id: undefined, // Will generate new UUID
            version: originalTemplate.version + 1,
            parentTemplateId: originalTemplate.id,
            status: TemplateStatus.DRAFT,
            isActive: false,
            usageCount: 0,
            lastUsedAt: null,
            changeLog: dto.changeLog,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: dto.updatedBy,
            updatedBy: dto.updatedBy,
        });

        // Apply updates
        if (dto.subject !== undefined) newVersion.subject = dto.subject;
        if (dto.htmlBody !== undefined) newVersion.htmlBody = dto.htmlBody;
        if (dto.textBody !== undefined) newVersion.textBody = dto.textBody;
        if (dto.messageBody !== undefined) newVersion.messageBody = dto.messageBody;
        if (dto.variables !== undefined) newVersion.variables = dto.variables;

        const saved = await this.templateRepository.save(newVersion);

        logger.info('Template version created', {
            id: saved.id,
            name: saved.name,
            version: saved.version,
        });

        return saved;
    }

    /**
     * Submit template for approval
     */
    async submitForApproval(id: string, submittedBy: string): Promise<NotificationTemplate> {
        logger.info('Submitting template for approval', { id });

        const template = await this.getTemplate(id);

        if (!template) {
            throw new Error('Template not found');
        }

        if (template.status !== TemplateStatus.DRAFT) {
            throw new Error('Only draft templates can be submitted for approval');
        }

        template.status = TemplateStatus.PENDING_APPROVAL;
        template.updatedBy = submittedBy;

        const updated = await this.templateRepository.save(template);

        logger.info('Template submitted for approval', { id: updated.id });

        return updated;
    }

    /**
     * Approve template
     */
    async approveTemplate(id: string, approvedBy: string): Promise<NotificationTemplate> {
        logger.info('Approving template', { id, approvedBy });

        const template = await this.getTemplate(id);

        if (!template) {
            throw new Error('Template not found');
        }

        if (template.status !== TemplateStatus.PENDING_APPROVAL) {
            throw new Error('Only pending templates can be approved');
        }

        template.status = TemplateStatus.APPROVED;
        template.metadata = {
            ...template.metadata,
            approvedBy,
            approvedAt: new Date(),
        };

        const updated = await this.templateRepository.save(template);

        logger.info('Template approved', { id: updated.id });

        return updated;
    }

    /**
     * Reject template
     */
    async rejectTemplate(
        id: string,
        rejectedBy: string,
        reason: string
    ): Promise<NotificationTemplate> {
        logger.info('Rejecting template', { id, rejectedBy, reason });

        const template = await this.getTemplate(id);

        if (!template) {
            throw new Error('Template not found');
        }

        template.status = TemplateStatus.REJECTED;
        template.metadata = {
            ...template.metadata,
            rejectionReason: reason,
            rejectedBy,
            rejectedAt: new Date(),
        };

        const updated = await this.templateRepository.save(template);

        logger.info('Template rejected', { id: updated.id });

        return updated;
    }

    /**
     * Activate template
     */
    async activateTemplate(id: string): Promise<NotificationTemplate> {
        logger.info('Activating template', { id });

        const template = await this.getTemplate(id);

        if (!template) {
            throw new Error('Template not found');
        }

        if (template.status !== TemplateStatus.APPROVED) {
            throw new Error('Only approved templates can be activated');
        }

        // Deactivate other versions of the same template
        await this.templateRepository.update(
            {
                name: template.name,
                language: template.language,
                isActive: true,
            },
            { isActive: false }
        );

        template.status = TemplateStatus.ACTIVE;
        template.isActive = true;

        const updated = await this.templateRepository.save(template);

        logger.info('Template activated', { id: updated.id, name: updated.name });

        return updated;
    }

    /**
     * Archive template
     */
    async archiveTemplate(id: string): Promise<NotificationTemplate> {
        logger.info('Archiving template', { id });

        const template = await this.getTemplate(id);

        if (!template) {
            throw new Error('Template not found');
        }

        template.status = TemplateStatus.ARCHIVED;
        template.isActive = false;

        const updated = await this.templateRepository.save(template);

        logger.info('Template archived', { id: updated.id });

        return updated;
    }

    /**
     * Render template with variables
     */
    async renderTemplate(
        templateName: string,
        options: ITemplateRenderOptions
    ): Promise<IRenderedTemplate> {
        const template = await this.getTemplateByName(templateName, 'en');

        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        // Validate required variables
        const missingVars = template.variables.filter(v => !(v in options.variables));

        if (missingVars.length > 0) {
            throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
        }

        const rendered: IRenderedTemplate = {
            templateId: template.id,
            templateVersion: template.version,
        };

        // Render based on template type
        switch (template.type) {
            case TemplateType.EMAIL:
                rendered.subject = this.replacePlaceholders(template.subject!, options.variables);
                rendered.html = this.replacePlaceholders(template.htmlBody!, options.variables);
                rendered.text = this.replacePlaceholders(template.textBody!, options.variables);
                break;

            case TemplateType.SMS:
            case TemplateType.WHATSAPP:
                rendered.message = this.replacePlaceholders(template.messageBody!, options.variables);
                break;
        }

        return rendered;
    }

    /**
     * Replace placeholders in template
     */
    private replacePlaceholders(template: string, variables: Record<string, any>): string {
        let result = template;

        for (const [key, value] of Object.entries(variables)) {
            const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            result = result.replace(placeholder, String(value));
        }

        return result;
    }

    /**
     * Log template usage
     */
    async logUsage(
        templateId: string,
        recipient: string,
        variables: Record<string, any>,
        messageId?: string,
        recipientId?: string
    ): Promise<void> {
        const template = await this.getTemplate(templateId);

        if (!template) {
            logger.warn('Template not found for usage logging', { templateId });
            return;
        }

        const log = this.usageLogRepository.create({
            templateId: template.id,
            templateName: template.name,
            templateVersion: template.version,
            recipient,
            recipientId,
            variables,
            messageId,
            status: 'sent',
            sentAt: new Date(),
        });

        await this.usageLogRepository.save(log);

        // Update template usage count
        template.usageCount += 1;
        template.lastUsedAt = new Date();
        await this.templateRepository.save(template);

        logger.debug('Template usage logged', {
            templateId,
            templateName: template.name,
            recipient,
        });
    }

    /**
     * Update delivery status
     */
    async updateDeliveryStatus(
        messageId: string,
        status: 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked',
        errorMessage?: string
    ): Promise<void> {
        const log = await this.usageLogRepository.findOne({
            where: { messageId },
        });

        if (!log) {
            logger.warn('Usage log not found for message', { messageId });
            return;
        }

        log.status = status;

        if (status === 'delivered') {
            log.deliveredAt = new Date();
        } else if (status === 'opened') {
            log.openedAt = new Date();
        } else if (status === 'clicked') {
            log.clickedAt = new Date();
        } else if (status === 'failed' || status === 'bounced') {
            log.errorMessage = errorMessage;
        }

        await this.usageLogRepository.save(log);

        logger.debug('Delivery status updated', { messageId, status });
    }

    /**
     * Get template analytics
     */
    async getTemplateAnalytics(templateId: string, days: number = 30): Promise<any> {
        const template = await this.getTemplate(templateId);

        if (!template) {
            throw new Error('Template not found');
        }

        const since = new Date();
        since.setDate(since.getDate() - days);

        const logs = await this.usageLogRepository
            .createQueryBuilder('log')
            .where('log.templateId = :templateId', { templateId })
            .andWhere('log.sentAt >= :since', { since })
            .getMany();

        const total = logs.length;
        const delivered = logs.filter(l => l.status === 'delivered').length;
        const failed = logs.filter(l => l.status === 'failed').length;
        const bounced = logs.filter(l => l.status === 'bounced').length;
        const opened = logs.filter(l => l.status === 'opened').length;
        const clicked = logs.filter(l => l.status === 'clicked').length;

        return {
            templateId: template.id,
            templateName: template.name,
            templateVersion: template.version,
            period: `Last ${days} days`,
            metrics: {
                total,
                delivered,
                failed,
                bounced,
                opened,
                clicked,
                deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
                openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
                clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
                bounceRate: total > 0 ? (bounced / total) * 100 : 0,
            },
        };
    }
}
