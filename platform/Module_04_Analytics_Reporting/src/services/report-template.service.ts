import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, FindManyOptions, IsNull } from 'typeorm';
import { ReportTemplate, ReportFormat } from '../entities/report-template.entity';
import { ReportExecution, ReportStatus } from '../entities/report-execution.entity';
import { CreateReportTemplateDto, UpdateReportTemplateDto } from '../dto/report.dto';
import { ReportGenerationService } from './report-generation.service';
import { QueueService } from './queue.service';

@Injectable()
export class ReportTemplateService {
  private readonly logger = new Logger(ReportTemplateService.name);

  constructor(
    @InjectRepository(ReportTemplate)
    private readonly reportTemplateRepository: Repository<ReportTemplate>,
    @InjectRepository(ReportExecution)
    private readonly reportExecutionRepository: Repository<ReportExecution>,
    private readonly reportGenerationService: ReportGenerationService,
    private readonly queueService: QueueService,
  ) {}

  async createReportTemplate(
    name: string,
    description: string,
    templateConfig: any,
    format: string,
    parameters: any,
    isPublic: boolean,
    category: string,
    tags: string[],
    userId: string,
  ): Promise<ReportTemplate> {
    this.logger.log(`Creating report template: ${name}`);

    const template = this.reportTemplateRepository.create({
      name,
      description,
      templateConfig,
      format: format as ReportFormat,
      parameters,
      isPublic,
      category,
      tags,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.reportTemplateRepository.save(template);
  }

  async getReportTemplates(
    userId: string,
    includePublic: boolean = true,
    category?: string,
    tags?: string[],
  ): Promise<ReportTemplate[]> {
    const whereConditions: any[] = [{ createdBy: userId }];

    if (includePublic) {
      whereConditions.push({ isPublic: true });
    }

    // Apply additional filters
    if (category) {
      whereConditions.forEach(condition => {
        condition.category = category;
      });
    }

    if (tags && tags.length > 0) {
      whereConditions.forEach(condition => {
        condition.tags = { $overlap: tags };
      });
    }

    return await this.reportTemplateRepository.find({
      where: whereConditions,
      relations: ['createdByUser', 'executions', 'scheduledReports'],
      order: { createdAt: 'DESC' },
    });
  }

  async getReportTemplateById(id: string, userId: string): Promise<ReportTemplate> {
    const template = await this.reportTemplateRepository.findOne({
      where: { id },
      relations: ['createdByUser', 'executions', 'scheduledReports'],
    });

    if (!template) {
      throw new Error('Report template not found');
    }

    // Check access permissions
    if (template.createdBy !== userId && !template.isPublic) {
      throw new Error('Access denied');
    }

    return template;
  }

  async updateReportTemplate(
    id: string,
    updates: Partial<ReportTemplate>,
    userId: string,
  ): Promise<ReportTemplate> {
    const template = await this.getReportTemplateById(id, userId);

    // Check edit permissions
    if (template.createdBy !== userId) {
      throw new Error('Only template owner can edit');
    }

    Object.assign(template, updates);
    template.updatedAt = new Date();

    return await this.reportTemplateRepository.save(template);
  }

  async deleteReportTemplate(id: string, userId: string): Promise<void> {
    const template = await this.getReportTemplateById(id, userId);

    // Check ownership
    if (template.createdBy !== userId) {
      throw new Error('Only template owner can delete');
    }

    await this.reportTemplateRepository.remove(template);
  }

  async duplicateReportTemplate(
    id: string,
    name: string,
    userId: string,
  ): Promise<ReportTemplate> {
    const originalTemplate = await this.getReportTemplateById(id, userId);

    const duplicatedTemplate = this.reportTemplateRepository.create({
      name,
      description: originalTemplate.description,
      templateConfig: originalTemplate.templateConfig,
      format: originalTemplate.format,
      parameters: originalTemplate.parameters,
      isPublic: false,
      category: originalTemplate.category,
      tags: originalTemplate.tags,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.reportTemplateRepository.save(duplicatedTemplate);
  }

  async generateReportFromTemplate(
    templateId: string,
    name: string,
    parameters: any,
    userId: string,
    queue: boolean = false,
  ): Promise<ReportExecution> {
    const template = await this.getReportTemplateById(templateId, userId);

    if (queue) {
      // Add to queue for async processing
      return await this.queueService.addReportGenerationJob(
        'generated-report',
        templateId,
        { ...template.parameters, ...parameters },
        userId,
      );
    } else {
      // Generate immediately
      return await this.reportGenerationService.generateReport(
        templateId,
        name,
        template.format,
        { ...template.parameters, ...parameters },
        userId,
      );
    }
  }

  async getTemplateCategories(): Promise<string[]> {
    const templates = await this.reportTemplateRepository.find({
      select: ['category'],
      where: { category: Not(IsNull()) },
    });

    return templates.map(t => t.category).filter(Boolean);
  }

  async getTemplateTags(): Promise<string[]> {
    const templates = await this.reportTemplateRepository.find({
      select: ['tags'],
      where: { tags: Not(IsNull()) },
    });

    const allTags = templates.flatMap(t => t.tags);
    return [...new Set(allTags)];
  }

  async getTemplateUsageStats(templateId: string): Promise<any> {
    const template = await this.reportTemplateRepository.findOne({
      where: { id: templateId },
      relations: ['executions', 'scheduledReports'],
    });

    if (!template) {
      throw new Error('Report template not found');
    }

    const executions = template.executions || [];
    const scheduledReports = template.scheduledReports || [];

    return {
      templateId,
      templateName: template.name,
      totalExecutions: executions.length,
      successfulExecutions: executions.filter(e => e.status === 'completed').length,
      failedExecutions: executions.filter(e => e.status === 'failed').length,
      averageGenerationTime: await this.getAverageExecutionTime(templateId),
      scheduledReports: scheduledReports.length,
      lastUsed: executions.length > 0 ? executions[0].createdAt : null,
      usageFrequency: await this.getUsageFrequency(templateId),
    };
  }

  async getPopularTemplates(limit: number = 10): Promise<any[]> {
    const templates = await this.reportTemplateRepository.find({
      relations: ['executions'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return templates.map(template => ({
      id: template.id,
      name: template.name,
      category: template.category,
      usageCount: template.executions?.length || 0,
      lastUsed: template.executions?.length > 0 ? template.executions[0].createdAt : null,
    }));
  }

  async validateTemplate(templateConfig: any): Promise<any> {
    const errors: string[] = [];

    // Validate required fields
    if (!templateConfig.dataSource) {
      errors.push('Data source is required');
    }

    if (!templateConfig.layout) {
      errors.push('Layout configuration is required');
    }

    if (!templateConfig.fields || templateConfig.fields.length === 0) {
      errors.push('At least one field is required');
    }

    // Validate field configurations
    if (templateConfig.fields) {
      for (const field of templateConfig.fields) {
        if (!field.name) {
          errors.push('Field name is required');
        }
        if (!field.type) {
          errors.push(`Field type is required for field: ${field.name}`);
        }
        if (field.required && !templateConfig.parameters?.[field.name]) {
          errors.push(`Required field '${field.name}' not found in parameters`);
        }
      }
    }

    // Validate layout configuration
    if (templateConfig.layout) {
      if (!templateConfig.layout.type) {
        errors.push('Layout type is required');
      }
      if (!templateConfig.layout.components || templateConfig.layout.components.length === 0) {
        errors.push('At least one component is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  async previewTemplate(templateId: string, parameters: any, userId: string): Promise<any> {
    const template = await this.getReportTemplateById(templateId, userId);

    // Mock preview generation - in real implementation, this would
    // generate a sample report with the provided parameters
    const preview = {
      templateId,
      templateName: template.name,
      format: template.format,
      parameters,
      previewData: this.generatePreviewData(template, parameters),
      generatedAt: new Date(),
    };

    return preview;
  }

  private generatePreviewData(template: ReportTemplate, parameters: any): any {
    // Mock preview data generation
    switch (template.format) {
      case 'pdf':
        return {
          title: template.name,
          pages: [
            {
              pageNumber: 1,
              content: 'Sample content for PDF preview',
              tables: [
                {
                  headers: ['Column 1', 'Column 2', 'Column 3'],
                  rows: [
                    ['Data 1', 'Data 2', 'Data 3'],
                    ['Data 4', 'Data 5', 'Data 6'],
                  ],
                },
              ],
            },
          ],
        };
      case 'xlsx':
        return {
          worksheets: [
            {
              name: 'Sheet1',
              data: [
                ['Column 1', 'Column 2', 'Column 3'],
                ['Data 1', 'Data 2', 'Data 3'],
                ['Data 4', 'Data 5', 'Data 6'],
              ],
            },
          ],
        };
      case 'csv':
        return {
          headers: ['Column 1', 'Column 2', 'Column 3'],
          rows: [
            ['Data 1', 'Data 2', 'Data 3'],
            ['Data 4', 'Data 5', 'Data 6'],
          ],
        };
      case 'json':
        return {
          template: template.name,
          data: {
            summary: 'Sample data for JSON preview',
            records: [
              { id: 1, name: 'Item 1', value: 100 },
              { id: 2, name: 'Item 2', value: 200 },
              { id: 3, name: 'Item 3', value: 300 },
            ],
          },
        };
      case 'html':
        return {
          html: `<html><body><h1>${template.name}</h1><p>Sample content for HTML preview</p></body></html>`,
        };
      default:
        return {};
    }
  }

  async getAverageExecutionTime(templateId: string): Promise<number> {
    const executions = await this.reportExecutionRepository.find({
      where: { templateId, status: ReportStatus.COMPLETED },
      select: ['startedAt', 'completedAt']
    });

    if (executions.length === 0) {
      return 0;
    }

    const totalTime = executions.reduce((sum, execution) => {
      if (execution.startedAt && execution.completedAt) {
        return sum + (execution.completedAt.getTime() - execution.startedAt.getTime());
      }
      return sum;
    }, 0);

    return totalTime / executions.length / 1000; // Convert to seconds
  }

  async getLastUsed(templateId: string): Promise<string> {
    const lastExecution = await this.reportExecutionRepository.findOne({
      where: { templateId },
      order: { createdAt: 'DESC' }
    });

    if (!lastExecution) {
      return 'Never used';
    }

    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastExecution.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      return 'Used today';
    } else if (daysDiff === 1) {
      return 'Used yesterday';
    } else if (daysDiff < 7) {
      return 'Used this week';
    } else if (daysDiff < 30) {
      return 'Used this month';
    } else {
      return `Used ${Math.floor(daysDiff / 30)} months ago`;
    }
  }

  async getUsageFrequency(templateId: string): Promise<string> {
    const executions = await this.reportExecutionRepository.find({
      where: { templateId },
      order: { createdAt: 'DESC' }
    });

    if (executions.length === 0) {
      return 'Never used';
    }

    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - executions[executions.length - 1].createdAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 1) {
      return 'Used today';
    } else if (daysDiff < 7) {
      return 'Used this week';
    } else if (daysDiff < 30) {
      return 'Used this month';
    } else {
      return `Used ${Math.floor(daysDiff / 30)} months ago`;
    }
  }
}
