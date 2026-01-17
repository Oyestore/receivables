import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributionTemplate, TemplateVersion, TemplateUsageLog } from '../entities/template.entity';
import * as Handlebars from 'handlebars';

export interface CreateTemplateDto {
  tenant_id: string;
  name: string;
  description?: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'physical_mail';
  content: {
    subject?: string;
    body: string;
    variables: string[];
    preheader?: string;
    attachments?: any[];
  };
  category?: string;
  tags?: string[];
}

export interface RenderTemplateOptions {
  escapeHtml?: boolean;
  strict?: boolean;
}

@Injectable()
export class TemplateManagementService {
  private readonly logger = new Logger(TemplateManagementService.name);

  constructor(
    @InjectRepository(DistributionTemplate)
    private templateRepo: Repository<DistributionTemplate>,
    @InjectRepository(TemplateVersion)
    private versionRepo: Repository<TemplateVersion>,
    @InjectRepository(TemplateUsageLog)
    private usageLogRepo: Repository<TemplateUsageLog>,
  ) {
    // Register Handlebars helpers
    this.registerHandlebarsHelpers();
  }

  /**
   * Create new template
   */
  async createTemplate(dto: CreateTemplateDto, userId: string): Promise<DistributionTemplate> {
    // Validate template content
    this.validateTemplate(dto);

    const template = this.templateRepo.create({
      ...dto,
      created_by: userId,
      status: 'draft',
      is_active: true,
    });

    const saved = await this.templateRepo.save(template);

    // Create initial version
    await this.createVersion(saved, userId, 'Initial version');

    this.logger.log(`Template created: ${saved.id} by ${userId}`);

    return saved;
  }

  /**
   * Get all templates with filtering
   */
  async getTemplates(
    tenantId: string,
    filters?: {
      channel?: string;
      status?: string;
      category?: string;
      tags?: string[];
      isDefault?: boolean;
      search?: string;
    },
  ): Promise<{ templates: DistributionTemplate[]; total: number }> {
    const query = this.templateRepo
      .createQueryBuilder('template')
      .where('template.tenant_id = :tenantId', { tenantId })
      .andWhere('template.is_active = :isActive', { isActive: true });

    if (filters?.channel) {
      query.andWhere('template.channel = :channel', { channel: filters.channel });
    }

    if (filters?.status) {
      query.andWhere('template.status = :status', { status: filters.status });
    }

    if (filters?.category) {
      query.andWhere('template.category = :category', { category: filters.category });
    }

    if (filters?.isDefault !== undefined) {
      query.andWhere('template.is_default = :isDefault', { isDefault: filters.isDefault });
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.andWhere('template.tags @> :tags', { tags: filters.tags });
    }

    if (filters?.search) {
      query.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    query.orderBy('template.created_at', 'DESC');

    const [templates, total] = await query.getManyAndCount();

    return { templates, total };
  }

  /**
   * Get single template by ID
   */
  async getTemplate(id: string, tenantId: string): Promise<DistributionTemplate> {
    const template = await this.templateRepo.findOne({
      where: { id, tenant_id: tenantId, is_active: true },
      relations: ['versions'],
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    tenantId: string,
    updates: Partial<CreateTemplateDto>,
    userId: string,
  ): Promise<DistributionTemplate> {
    const template = await this.getTemplate(id, tenantId);

    // Validate if content is being updated
    if (updates.content) {
      this.validateTemplate({ ...template, ...updates } as CreateTemplateDto);
    }

    Object.assign(template, updates);
    const updated = await this.templateRepo.save(template);

    // Create new version
    await this.createVersion(updated, userId, 'Template updated');

    this.logger.log(`Template updated: ${id} by ${userId}`);

    return updated;
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    const template = await this.getTemplate(id, tenantId);
    template.is_active = false;
    await this.templateRepo.save(template);
    this.logger.log(`Template deleted: ${id}`);
  }

  /**
   * Render template with variables
   */
  async renderTemplate(
    templateId: string,
    tenantId: string,
    variables: Record<string, any>,
    options: RenderTemplateOptions = {},
  ): Promise<{ subject?: string; body: string }> {
    const template = await this.getTemplate(templateId, tenantId);

    try {
      // Configure Handlebars
      const compileOptions = {
        strict: options.strict !== false,
        noEscape: !options.escapeHtml,
      };

      // Render subject (if email)
      let subject: string | undefined;
      if (template.content.subject) {
        const subjectTemplate = Handlebars.compile(template.content.subject, compileOptions);
        subject = subjectTemplate(variables);
      }

      // Render body
      const bodyTemplate = Handlebars.compile(template.content.body, compileOptions);
      const body = bodyTemplate(variables);

      // Log usage
      await this.logUsage(templateId, tenantId, variables, true);

      // Increment usage count
      template.usage_count += 1;
      await this.templateRepo.save(template);

      return { subject, body };
    } catch (error) {
      this.logger.error(`Template rendering failed: ${templateId}`, error);

      // Log failed usage
      await this.logUsage(templateId, tenantId, variables, false, error.message);

      throw new BadRequestException(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(
    templateId: string,
    tenantId: string,
    sampleData: Record<string, any>,
  ): Promise<{ subject?: string; body: string }> {
    return this.renderTemplate(templateId, tenantId, sampleData, { escapeHtml: false });
  }

  /**
   * Submit template for approval
   */
  async submitForApproval(id: string, tenantId: string, userId: string): Promise<DistributionTemplate> {
    const template = await this.getTemplate(id, tenantId);

    if (template.status !== 'draft' && template.status !== 'rejected') {
      throw new BadRequestException('Only draft or rejected templates can be submitted');
    }

    template.status = 'pending_approval';
    const updated = await this.templateRepo.save(template);

    await this.createVersion(updated, userId, 'Submitted for approval');

    this.logger.log(`Template submitted for approval: ${id}`);

    return updated;
  }

  /**
   * Approve template
   */
  async approveTemplate(id: string, tenantId: string, approverId: string): Promise<DistributionTemplate> {
    const template = await this.getTemplate(id, tenantId);

    if (template.status !== 'pending_approval') {
      throw new BadRequestException('Template is not pending approval');
    }

    template.status = 'approved';
    template.approved_by = approverId;
    template.approved_at = new Date();

    const updated = await this.templateRepo.save(template);

    await this.createVersion(updated, approverId, 'Template approved');

    this.logger.log(`Template approved: ${id} by ${approverId}`);

    return updated;
  }

  /**
   * Reject template
   */
  async rejectTemplate(
    id: string,
    tenantId: string,
    approverId: string,
    reason: string,
  ): Promise<DistributionTemplate> {
    const template = await this.getTemplate(id, tenantId);

    if (template.status !== 'pending_approval') {
      throw new BadRequestException('Template is not pending approval');
    }

    template.status = 'rejected';
    template.rejection_reason = reason;

    const updated = await this.templateRepo.save(template);

    await this.createVersion(updated, approverId, `Template rejected: ${reason}`);

    this.logger.log(`Template rejected: ${id} by ${approverId}`);

    return updated;
  }

  /**
   * Clone template
   */
  async cloneTemplate(
    id: string,
    tenantId: string,
    newName: string,
    userId: string,
  ): Promise<DistributionTemplate> {
    const original = await this.getTemplate(id, tenantId);

    const cloned = this.templateRepo.create({
      tenant_id: tenantId,
      name: newName,
      description: `Cloned from: ${original.name}`,
      channel: original.channel,
      content: { ...original.content },
      category: original.category,
      tags: original.tags ? [...original.tags] : [],
      created_by: userId,
      status: 'draft',
      is_active: true,
      is_default: false,
    });

    const saved = await this.templateRepo.save(cloned);

    await this.createVersion(saved, userId, `Cloned from template ${id}`);

    this.logger.log(`Template cloned: ${id} -> ${saved.id}`);

    return saved;
  }

  /**
   * Get version history
   */
  async getVersionHistory(templateId: string, tenantId: string): Promise<TemplateVersion[]> {
    await this.getTemplate(templateId, tenantId); // Verify access

    return this.versionRepo.find({
      where: { template_id: templateId },
      order: { version_number: 'DESC' },
    });
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    total_uses: number;
    success_rate: number;
    by_template: Array<{ template_id: string; template_name: string; uses: number }>;
    by_channel: Array<{ channel: string; uses: number }>;
  }> {
    const logs = await this.usageLogRepo
      .createQueryBuilder('log')
      .where('log.tenant_id = :tenantId', { tenantId })
      .andWhere('log.used_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    const total_uses = logs.length;
    const successful = logs.filter((l) => l.success).length;
    const success_rate = total_uses > 0 ? (successful / total_uses) * 100 : 0;

    // Group by template
    const byTemplate = Object.entries(
      logs.reduce((acc, log) => {
        acc[log.template_id] = (acc[log.template_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    ).map(([template_id, uses]) => ({ template_id, template_name: '', uses })); // Fetch names separately

    // Group by channel
    const byChannel = Object.entries(
      logs.reduce((acc, log) => {
        acc[log.channel] = (acc[log.channel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    ).map(([channel, uses]) => ({ channel, uses }));

    return {
      total_uses,
      success_rate,
      by_template: byTemplate,
      by_channel: byChannel,
    };
  }

  // Private helper methods

  private validateTemplate(dto: CreateTemplateDto): void {
    if (!dto.content.body) {
      throw new BadRequestException('Template body is required');
    }

    // Extract variables from template
    const usedVars = this.extractVariables(dto.content.body);

    if (dto.content.subject) {
      const subjectVars = this.extractVariables(dto.content.subject);
      usedVars.push(...subjectVars);
    }

    // Check if all used variables are declared
    const declaredVars = dto.content.variables || [];
    const undeclared = usedVars.filter((v) => !declaredVars.includes(v));

    if (undeclared.length > 0) {
      throw new BadRequestException(
        `Undeclared variables in template: ${undeclared.join(', ')}`,
      );
    }

    // Validate template syntax
    try {
      Handlebars.compile(dto.content.body); // Throws on syntax error
      if (dto.content.subject) {
        Handlebars.compile(dto.content.subject);
      }
    } catch (error) {
      throw new BadRequestException(`Invalid template syntax: ${error.message}`);
    }
  }

  private extractVariables(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = Array.from(template.matchAll(regex));
    return matches
      .map((m) => m[1].trim().split(' ')[0]) // Get first word (handle helpers)
      .filter((v) => !['if', 'unless', 'each', 'with'].includes(v)); // Exclude Handlebars keywords
  }

  private async createVersion(
    template: DistributionTemplate,
    userId: string,
    changeNotes: string,
  ): Promise<TemplateVersion> {
    const latestVersion = await this.versionRepo.findOne({
      where: { template_id: template.id },
      order: { version_number: 'DESC' },
    });

    const versionNumber = latestVersion ? latestVersion.version_number + 1 : 1;

    const version = this.versionRepo.create({
      template_id: template.id,
      version_number: versionNumber,
      content_snapshot: template.content,
      change_notes: changeNotes,
      created_by: userId,
    });

    return this.versionRepo.save(version);
  }

  private async logUsage(
    templateId: string,
    tenantId: string,
    variables: Record<string, any>,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    const log = this.usageLogRepo.create({
      template_id: templateId,
      tenant_id: tenantId,
      variables_used: variables,
      success,
      error_message: errorMessage,
      channel: 'unknown', // Set by caller if needed
    });

    await this.usageLogRepo.save(log);
  }

  private registerHandlebarsHelpers(): void {
    // Format currency
    Handlebars.registerHelper('currency', (value: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(value);
    });

    // Format date
    Handlebars.registerHelper('formatDate', (date: Date, format: string = 'short') => {
      return new Intl.DateTimeFormat('en-US', { dateStyle: format as any }).format(new Date(date));
    });

    // Uppercase
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str?.toUpperCase() || '';
    });

    // Lowercase
    Handlebars.registerHelper('lowercase', (str: string) => {
      return str?.toLowerCase() || '';
    });
  }
}
