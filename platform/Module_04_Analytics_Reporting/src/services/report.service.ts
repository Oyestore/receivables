import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { ReportTemplate, ReportFormat } from '../entities/report-template.entity';
import { ReportExecution, ReportStatus } from '../entities/report-execution.entity';
import { ScheduledReport } from '../entities/scheduled-report.entity';
import { User } from '../entities/user.entity';
import { CreateReportTemplateDto, UpdateReportTemplateDto, ExecuteReportDto, ReportQueryDto } from '../dto/report.dto';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly reportTemplateRepository: Repository<ReportTemplate>,
    private readonly reportExecutionRepository: Repository<ReportExecution>,
    private readonly scheduledReportRepository: Repository<ScheduledReport>,
    private readonly userRepository: Repository<User>,
  ) {}

  async createReportTemplate(createReportTemplateDto: CreateReportTemplateDto, userId: string): Promise<ReportTemplate> {
    this.logger.log(`Creating report template: ${createReportTemplateDto.name} for user: ${userId}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const reportTemplate = this.reportTemplateRepository.create({
      ...createReportTemplateDto,
      createdBy: userId,
    });

    const savedTemplate = await this.reportTemplateRepository.save(reportTemplate);

    this.logger.log(`Report template created successfully: ${savedTemplate.id}`);
    return savedTemplate;
  }

  async getReportTemplates(query: ReportQueryDto, userId: string): Promise<{ templates: ReportTemplate[]; total: number }> {
    this.logger.log(`Fetching report templates for user: ${userId}`);

    const findOptions: FindManyOptions<ReportTemplate> = {
      where: [
        { createdBy: userId },
        { isPublic: true },
      ],
      relations: ['createdByUser'],
      order: {},
    };

    // Apply filters
    if (query.search) {
      findOptions.where = [
        { name: Like(`%${query.search}%`), createdBy: userId },
        { name: Like(`%${query.search}%`), isPublic: true },
      ];
    }

    if (query.format) {
      findOptions.where = [
        { format: query.format, createdBy: userId },
        { format: query.format, isPublic: true },
      ];
    }

    if (query.category) {
      findOptions.where = [
        { category: query.category, createdBy: userId },
        { category: query.category, isPublic: true },
      ];
    }

    if (query.isPublic !== undefined) {
      findOptions.where = [
        { isPublic: query.isPublic, createdBy: userId },
        { isPublic: query.isPublic },
      ];
    }

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    
    if (findOptions.order) {
      (findOptions.order as any)[sortBy] = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    }

    // Apply pagination
    if (query.page && query.limit) {
      findOptions.skip = (query.page - 1) * query.limit;
      findOptions.take = query.limit;
    }

    const [templates, total] = await this.reportTemplateRepository.findAndCount(findOptions);

    this.logger.log(`Found ${templates.length} report templates out of ${total} total`);
    return { templates, total };
  }

  async getReportTemplateById(id: string, userId: string): Promise<ReportTemplate> {
    this.logger.log(`Fetching report template: ${id}`);

    const template = await this.reportTemplateRepository.findOne({
      where: { id },
      relations: ['createdByUser', 'executions', 'scheduledReports'],
    });

    if (!template) {
      throw new NotFoundException('Report template not found');
    }

    // Check access permissions
    if (!this.hasTemplateAccess(template, userId)) {
      throw new BadRequestException('Access denied');
    }

    this.logger.log(`Report template fetched successfully: ${id}`);
    return template;
  }

  async updateReportTemplate(id: string, updateReportTemplateDto: UpdateReportTemplateDto, userId: string): Promise<ReportTemplate> {
    this.logger.log(`Updating report template: ${id}`);

    const template = await this.getReportTemplateById(id, userId);

    // Check edit permissions
    if (template.createdBy !== userId) {
      throw new BadRequestException('Only template owner can edit');
    }

    Object.assign(template, updateReportTemplateDto);
    const updatedTemplate = await this.reportTemplateRepository.save(template);

    this.logger.log(`Report template updated successfully: ${id}`);
    return updatedTemplate;
  }

  async deleteReportTemplate(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting report template: ${id}`);

    const template = await this.getReportTemplateById(id, userId);

    // Check ownership
    if (template.createdBy !== userId) {
      throw new BadRequestException('Only template owner can delete');
    }

    await this.reportTemplateRepository.remove(template);

    this.logger.log(`Report template deleted successfully: ${id}`);
  }

  async executeReport(executeReportDto: ExecuteReportDto, userId: string): Promise<ReportExecution> {
    this.logger.log(`Executing report: ${executeReportDto.name}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let template: ReportTemplate | null = null;
    if (executeReportDto.templateId) {
      template = await this.getReportTemplateById(executeReportDto.templateId, userId);
    }

    const execution = this.reportExecutionRepository.create({
      templateId: executeReportDto.templateId,
      name: executeReportDto.name,
      format: executeReportDto.format,
      parameters: executeReportDto.parameters,
      status: ReportStatus.PENDING,
      createdBy: userId,
      createdByUser: user,
      template: template || undefined,
    });

    const savedExecution = await this.reportExecutionRepository.save(execution);

    // Start async report generation
    this.generateReport(savedExecution.id);

    this.logger.log(`Report execution started: ${savedExecution.id}`);
    return savedExecution;
  }

  async getReportExecutions(userId: string, query?: ReportQueryDto): Promise<{ executions: ReportExecution[]; total: number }> {
    this.logger.log(`Fetching report executions for user: ${userId}`);

    const findOptions: FindManyOptions<ReportExecution> = {
      where: { createdBy: userId },
      relations: ['template', 'createdByUser'],
      order: { createdAt: 'DESC' },
    };

    // Apply pagination
    if (query?.page && query?.limit) {
      findOptions.skip = (query.page - 1) * query.limit;
      findOptions.take = query.limit;
    }

    const [executions, total] = await this.reportExecutionRepository.findAndCount(findOptions);

    this.logger.log(`Found ${executions.length} report executions out of ${total} total`);
    return { executions, total };
  }

  async getReportExecutionById(id: string, userId: string): Promise<ReportExecution> {
    this.logger.log(`Fetching report execution: ${id}`);

    const execution = await this.reportExecutionRepository.findOne({
      where: { id },
      relations: ['template', 'createdByUser'],
    });

    if (!execution) {
      throw new NotFoundException('Report execution not found');
    }

    // Check ownership
    if (execution.createdBy !== userId) {
      throw new BadRequestException('Access denied');
    }

    this.logger.log(`Report execution fetched successfully: ${id}`);
    return execution;
  }

  async downloadReport(id: string, userId: string): Promise<{ filePath: string; fileName: string }> {
    this.logger.log(`Downloading report: ${id}`);

    const execution = await this.getReportExecutionById(id, userId);

    if (execution.status !== ReportStatus.COMPLETED) {
      throw new BadRequestException('Report is not ready for download');
    }

    if (!execution.filePath) {
      throw new BadRequestException('Report file not found');
    }

    // Increment download count
    await this.reportExecutionRepository.increment({ id }, 'downloadCount', 1);

    const fileName = `${execution.name}.${execution.format}`;

    this.logger.log(`Report downloaded successfully: ${id}`);
    return { filePath: execution.filePath, fileName };
  }

  async cancelReportExecution(id: string, userId: string): Promise<void> {
    this.logger.log(`Cancelling report execution: ${id}`);

    const execution = await this.getReportExecutionById(id, userId);

    if (execution.status !== ReportStatus.PENDING && execution.status !== ReportStatus.PROCESSING) {
      throw new BadRequestException('Cannot cancel report in current status');
    }

    execution.status = ReportStatus.CANCELLED;
    await this.reportExecutionRepository.save(execution);

    this.logger.log(`Report execution cancelled: ${id}`);
  }

  async createScheduledReport(
    templateId: string,
    name: string,
    scheduleType: string,
    scheduleConfig: Record<string, any>,
    recipients: string[],
    userId: string,
  ): Promise<ScheduledReport> {
    this.logger.log(`Creating scheduled report: ${name}`);

    const template = await this.getReportTemplateById(templateId, userId);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const scheduledReport = this.scheduledReportRepository.create({
      templateId,
      name,
      scheduleType,
      scheduleConfig,
      recipients,
      createdBy: userId,
      createdByUser: user,
      template,
    });

    const savedScheduledReport = await this.scheduledReportRepository.save(scheduledReport);

    this.logger.log(`Scheduled report created successfully: ${savedScheduledReport.id}`);
    return savedScheduledReport;
  }

  async getScheduledReports(userId: string): Promise<ScheduledReport[]> {
    this.logger.log(`Fetching scheduled reports for user: ${userId}`);

    const scheduledReports = await this.scheduledReportRepository.find({
      where: { createdBy: userId },
      relations: ['template', 'createdByUser'],
      order: { createdAt: 'DESC' },
    });

    this.logger.log(`Found ${scheduledReports.length} scheduled reports`);
    return scheduledReports;
  }

  async updateScheduledReport(
    id: string,
    updates: Partial<ScheduledReport>,
    userId: string,
  ): Promise<ScheduledReport> {
    this.logger.log(`Updating scheduled report: ${id}`);

    const scheduledReport = await this.scheduledReportRepository.findOne({
      where: { id },
      relations: ['template'],
    });

    if (!scheduledReport) {
      throw new NotFoundException('Scheduled report not found');
    }

    // Check ownership
    if (scheduledReport.createdBy !== userId) {
      throw new BadRequestException('Access denied');
    }

    Object.assign(scheduledReport, updates);
    const updatedScheduledReport = await this.scheduledReportRepository.save(scheduledReport);

    this.logger.log(`Scheduled report updated successfully: ${id}`);
    return updatedScheduledReport;
  }

  async deleteScheduledReport(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting scheduled report: ${id}`);

    const scheduledReport = await this.scheduledReportRepository.findOne({
      where: { id },
    });

    if (!scheduledReport) {
      throw new NotFoundException('Scheduled report not found');
    }

    // Check ownership
    if (scheduledReport.createdBy !== userId) {
      throw new BadRequestException('Access denied');
    }

    await this.scheduledReportRepository.remove(scheduledReport);

    this.logger.log(`Scheduled report deleted successfully: ${id}`);
  }

  private async generateReport(executionId: string): Promise<void> {
    this.logger.log(`Starting report generation for execution: ${executionId}`);

    const execution = await this.reportExecutionRepository.findOne({
      where: { id: executionId },
      relations: ['template'],
    });

    if (!execution) {
      this.logger.error(`Report execution not found: ${executionId}`);
      return;
    }

    try {
      // Update status to processing
      execution.status = ReportStatus.PROCESSING;
      execution.startedAt = new Date();
      await this.reportExecutionRepository.save(execution);

      // Simulate report generation (in real implementation, this would generate actual reports)
      await this.simulateReportGeneration(execution);

      // Update status to completed
      execution.status = ReportStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.progress = 100;
      execution.filePath = `/reports/${execution.id}.${execution.format}`;
      execution.fileSize = Math.floor(Math.random() * 1000000); // Mock file size

      await this.reportExecutionRepository.save(execution);

      this.logger.log(`Report generation completed: ${executionId}`);
    } catch (error) {
      this.logger.error(`Report generation failed: ${executionId}`, error);
      
      execution.status = ReportStatus.FAILED;
      execution.errorMessage = error.message;
      execution.completedAt = new Date();
      
      await this.reportExecutionRepository.save(execution);
    }
  }

  private async simulateReportGeneration(execution: ReportExecution): Promise<void> {
    // Simulate processing time
    const processingTime = Math.random() * 5000 + 2000; // 2-7 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Update progress periodically
    const progressSteps = [25, 50, 75, 90];
    for (const progress of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, processingTime / 4));
      execution.progress = progress;
      await this.reportExecutionRepository.save(execution);
    }
  }

  private hasTemplateAccess(template: ReportTemplate, userId: string): boolean {
    // Owner has full access
    if (template.createdBy === userId) {
      return true;
    }

    // Public templates are accessible to all
    if (template.isPublic) {
      return true;
    }

    return false;
  }
}
