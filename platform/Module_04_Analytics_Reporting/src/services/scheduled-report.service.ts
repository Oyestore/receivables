import { Injectable, Logger } from '@nestjs/common';
import { Repository, LessThanOrEqual, LessThan } from 'typeorm';
import { ScheduledReport } from '../entities/scheduled-report.entity';
import { ReportTemplate } from '../entities/report-template.entity';
import { ReportGenerationService } from './report-generation.service';
import { QueueService } from './queue.service';
import { NotificationService } from './notification.service';

@Injectable()
export class ScheduledReportService {
  private readonly logger = new Logger(ScheduledReportService.name);

  constructor(
    private readonly scheduledReportRepository: Repository<ScheduledReport>,
    private readonly reportTemplateRepository: Repository<ReportTemplate>,
    private readonly reportGenerationService: ReportGenerationService,
    private readonly queueService: QueueService,
    private readonly notificationService: NotificationService,
  ) {}

  async createScheduledReport(
    templateId: string,
    name: string,
    scheduleType: string,
    scheduleConfig: any,
    parameters: any,
    recipients: string[],
    userId: string,
  ): Promise<ScheduledReport> {
    this.logger.log(`Creating scheduled report: ${name}`);

    const template = await this.reportTemplateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Report template not found');
    }

    const scheduledReport = this.scheduledReportRepository.create({
      templateId,
      name,
      scheduleType,
      scheduleConfig,
      parameters,
      recipients,
      isActive: true,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      nextRunAt: this.calculateNextRunTime(scheduleType, scheduleConfig),
    });

    const savedScheduledReport = await this.scheduledReportRepository.save(scheduledReport);

    // Schedule the first run
    await this.scheduleNextRun(savedScheduledReport.id);

    this.logger.log(`Scheduled report created: ${savedScheduledReport.id}`);
    return savedScheduledReport;
  }

  async getScheduledReports(userId: string): Promise<ScheduledReport[]> {
    return await this.scheduledReportRepository.find({
      where: { createdBy: userId },
      relations: ['template', 'createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async getScheduledReportById(id: string, userId: string): Promise<ScheduledReport> {
    const scheduledReport = await this.scheduledReportRepository.findOne({
      where: { id },
      relations: ['template', 'createdByUser', 'executions'],
    });

    if (!scheduledReport) {
      throw new Error('Scheduled report not found');
    }

    // Check ownership
    if (scheduledReport.createdBy !== userId) {
      throw new Error('Access denied');
    }

    return scheduledReport;
  }

  async updateScheduledReport(
    id: string,
    updates: Partial<ScheduledReport>,
    userId: string,
  ): Promise<ScheduledReport> {
    const scheduledReport = await this.getScheduledReportById(id, userId);

    // Check ownership
    if (scheduledReport.createdBy !== userId) {
      throw new Error('Only report owner can update');
    }

    // If schedule configuration changed, recalculate next run time
    if (updates.scheduleType || updates.scheduleConfig) {
      updates.nextRunAt = this.calculateNextRunTime(
        updates.scheduleType || scheduledReport.scheduleType,
        updates.scheduleConfig || scheduledReport.scheduleConfig,
      );
    }

    Object.assign(scheduledReport, updates);
    scheduledReport.updatedAt = new Date();

    const updatedScheduledReport = await this.scheduledReportRepository.save(scheduledReport);

    // Reschedule if active
    if (updatedScheduledReport.isActive) {
      await this.scheduleNextRun(updatedScheduledReport.id);
    }

    this.logger.log(`Scheduled report updated: ${id}`);
    return updatedScheduledReport;
  }

  async deleteScheduledReport(id: string, userId: string): Promise<void> {
    const scheduledReport = await this.getScheduledReportById(id, userId);

    // Check ownership
    if (scheduledReport.createdBy !== userId) {
      throw new Error('Only report owner can delete');
    }

    // Cancel any scheduled jobs
    await this.cancelScheduledJobs(id);

    await this.scheduledReportRepository.remove(scheduledReport);

    this.logger.log(`Scheduled report deleted: ${id}`);
  }

  async activateScheduledReport(id: string, userId: string): Promise<ScheduledReport> {
    const scheduledReport = await this.getScheduledReportById(id, userId);

    scheduledReport.isActive = true;
    scheduledReport.updatedAt = new Date();
    scheduledReport.nextRunAt = this.calculateNextRunTime(
      scheduledReport.scheduleType,
      scheduledReport.scheduleConfig,
    );

    const activatedScheduledReport = await this.scheduledReportRepository.save(scheduledReport);

    // Schedule the next run
    await this.scheduleNextRun(activatedScheduledReport.id);

    this.logger.log(`Scheduled report activated: ${id}`);
    return activatedScheduledReport;
  }

  async deactivateScheduledReport(id: string, userId: string): Promise<ScheduledReport> {
    const scheduledReport = await this.getScheduledReportById(id, userId);

    scheduledReport.isActive = false;
    scheduledReport.updatedAt = new Date();

    // Cancel scheduled jobs
    await this.cancelScheduledJobs(id);

    const deactivatedScheduledReport = await this.scheduledReportRepository.save(scheduledReport);

    this.logger.log(`Scheduled report deactivated: ${id}`);
    return deactivatedScheduledReport;
  }

  async runScheduledReportNow(id: string, userId: string): Promise<void> {
    const scheduledReport = await this.getScheduledReportById(id, userId);

    if (!scheduledReport.isActive) {
      throw new Error('Scheduled report is not active');
    }

    // Generate report immediately
    await this.reportGenerationService.generateReport(
      scheduledReport.templateId,
      scheduledReport.name,
      'pdf', // Default format
      scheduledReport.parameters,
      userId,
    );

    // Update last run time and schedule next run
    scheduledReport.lastRunAt = new Date();
    scheduledReport.nextRunAt = this.calculateNextRunTime(
      scheduledReport.scheduleType,
      scheduledReport.scheduleConfig,
    );
    scheduledReport.updatedAt = new Date();

    await this.scheduledReportRepository.save(scheduledReport);

    // Schedule next run
    await this.scheduleNextRun(scheduledReport.id);

    this.logger.log(`Scheduled report run manually: ${id}`);
  }

  async getScheduledReportStats(): Promise<any> {
    const totalReports = await this.scheduledReportRepository.count();
    const activeReports = await this.scheduledReportRepository.count({
      where: { isActive: true },
    });
    const inactiveReports = totalReports - activeReports;

    const reportsByScheduleType = await this.getReportsByScheduleType();
    const reportsByStatus = await this.getReportsByStatus();

    return {
      total: totalReports,
      active: activeReports,
      inactive: inactiveReports,
      byScheduleType: reportsByScheduleType,
      byStatus: reportsByStatus,
      nextScheduledRun: await this.getNextScheduledRun(),
    };
  }

  private async scheduleNextRun(scheduledReportId: string): Promise<void> {
    const scheduledReport = await this.scheduledReportRepository.findOne({
      where: { id: scheduledReportId },
    });

    if (!scheduledReport || !scheduledReport.isActive) {
      return;
    }

    // Add to queue for scheduled execution
    await this.queueService.addReportGenerationJob(
      `scheduled-report-${scheduledReportId}`,
      scheduledReport.templateId,
      scheduledReport.parameters,
      scheduledReport.name,
    );
  }

  private async cancelScheduledJobs(scheduledReportId: string): Promise<void> {
    // Mock implementation - would cancel Bull jobs
    this.logger.log(`Cancelled scheduled jobs for: ${scheduledReportId}`);
  }

  private calculateNextRunTime(scheduleType: string, scheduleConfig: any): Date {
    const now = new Date();

    switch (scheduleType.toLowerCase()) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'custom':
        if (scheduleConfig.interval) {
          return new Date(now.getTime() + scheduleConfig.interval);
        }
        // Fall through to daily
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private async getReportsByScheduleType(): Promise<any> {
    const reports = await this.scheduledReportRepository.find({
      select: ['scheduleType'],
      where: { isActive: true },
    });

    const result: any = {};
    for (const report of reports) {
      result[report.scheduleType] = (result[report.scheduleType] || 0) + 1;
    }

    return result;
  }

  private async getReportsByStatus(): Promise<any> {
    const activeReports = await this.scheduledReportRepository.count({
      where: { isActive: true },
    });
    const inactiveReports = await this.scheduledReportRepository.count({
      where: { isActive: false },
    });

    return {
      active: activeReports,
      inactive: inactiveReports,
    };
  }

  private async getNextScheduledRun(): Promise<Date | null> {
    const nextRun = await this.scheduledReportRepository.findOne({
      where: { isActive: true },
      order: { nextRunAt: 'ASC' },
    });

    return nextRun ? nextRun.nextRunAt : null;
  }

  async testScheduleConfiguration(scheduleType: string, scheduleConfig: any): Promise<Date> {
    const nextRunTime = this.calculateNextRunTime(scheduleType, scheduleConfig);
    
    this.logger.log(`Test schedule configuration: ${scheduleType} -> ${nextRunTime.toISOString()}`);
    
    return nextRunTime;
  }

  async getUpcomingScheduledReports(hours: number = 24): Promise<ScheduledReport[]> {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const reports = await this.scheduledReportRepository.find({
      where: {
        isActive: true,
        nextRunAt: LessThanOrEqual(cutoffTime),
      },
      relations: ['template', 'createdByUser'],
      order: { nextRunAt: 'ASC' },
    });

    return reports;
  }

  async getOverdueScheduledReports(): Promise<ScheduledReport[]> {
    const now = new Date();

    const reports = await this.scheduledReportRepository.find({
      where: {
        isActive: true,
        nextRunAt: LessThan(now),
      },
      relations: ['template', 'createdByUser'],
      order: { nextRunAt: 'ASC' },
    });

    return reports;
  }

  async processScheduledReport(scheduledReportId: string): Promise<void> {
    this.logger.log(`Processing scheduled report: ${scheduledReportId}`);

    try {
      const scheduledReport = await this.scheduledReportRepository.findOne({
        where: { id: scheduledReportId },
        relations: ['template', 'createdByUser'],
      });

      if (!scheduledReport || !scheduledReport.isActive) {
        return;
      }

      // Generate report
      const execution = await this.reportGenerationService.generateReport(
        scheduledReport.templateId,
        scheduledReport.name,
        'pdf', // Default format
        scheduledReport.parameters,
        scheduledReport.createdBy,
      );

      // Send email notifications
      if (scheduledReport.recipients && scheduledReport.recipients.length > 0) {
        await this.notificationService.sendReportEmail(
          scheduledReport.recipients,
          `Scheduled Report: ${scheduledReport.name}`,
          scheduledReport.name,
          execution.filePath || '',
          execution.format,
          {
            scheduledAt: new Date(),
            templateId: scheduledReport.templateId,
            scheduleType: scheduledReport.scheduleType,
          },
        );
      }

      // Update last run time and schedule next run
      scheduledReport.lastRunAt = new Date();
      scheduledReport.nextRunAt = this.calculateNextRunTime(
        scheduledReport.scheduleType,
        scheduledReport.scheduleConfig,
      );
      scheduledReport.updatedAt = new Date();

      await this.scheduledReportRepository.save(scheduledReport);

      // Schedule next run
      await this.scheduleNextRun(scheduledReport.id);

      this.logger.log(`Scheduled report processed successfully: ${scheduledReportId}`);
    } catch (error) {
      this.logger.error(`Error processing scheduled report: ${scheduledReportId}`, error);

      // Update status to failed
      const scheduledReport = await this.scheduledReportRepository.findOne({
        where: { id: scheduledReportId },
      });

      if (scheduledReport) {
        scheduledReport.isActive = false;
        scheduledReport.updatedAt = new Date();
        await this.scheduledReportRepository.save(scheduledReport);
      }
    }
  }
}
