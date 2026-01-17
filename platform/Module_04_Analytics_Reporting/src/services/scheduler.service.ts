import { Injectable, Logger } from '@nestjs/common';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ScheduledReport } from '../entities/scheduled-report.entity';
import { ReportExecution } from '../entities/report-execution.entity';
import { ReportService } from './report.service';
import { ReportFormat } from '../entities/report-template.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly scheduledReportRepository: Repository<ScheduledReport>,
    private readonly reportExecutionRepository: Repository<ReportExecution>,
    private readonly reportService: ReportService,
  ) {}

  async startScheduler(): Promise<void> {
    this.logger.log('Starting report scheduler...');
    
    // Check for due reports every minute
    setInterval(async () => {
      await this.processDueReports();
    }, 60000);
    
    this.logger.log('Report scheduler started successfully');
  }

  private async processDueReports(): Promise<void> {
    try {
      const now = new Date();
      const dueReports = await this.scheduledReportRepository.find({
        where: {
          isActive: true,
          nextRunAt: LessThanOrEqual(now),
        },
      });

      for (const scheduledReport of dueReports) {
        await this.executeScheduledReport(scheduledReport);
      }
    } catch (error) {
      this.logger.error('Error processing due reports:', error);
    }
  }

  private async executeScheduledReport(scheduledReport: ScheduledReport): Promise<void> {
    this.logger.log(`Executing scheduled report: ${scheduledReport.name}`);

    try {
      // Execute the report
      const execution = await this.reportService.executeReport(
        {
          templateId: scheduledReport.templateId,
          name: scheduledReport.name,
          format: ReportFormat.PDF, // Default format for scheduled reports
          parameters: scheduledReport.parameters,
        },
        scheduledReport.createdBy,
      );

      // Send email to recipients
      await this.sendReportEmail(execution, scheduledReport.recipients);

      // Update next run time
      await this.updateNextRunTime(scheduledReport);

      this.logger.log(`Scheduled report executed successfully: ${scheduledReport.name}`);
    } catch (error) {
      this.logger.error(`Failed to execute scheduled report: ${scheduledReport.name}`, error);
    }
  }

  private async sendReportEmail(execution: ReportExecution, recipients: string[]): Promise<void> {
    // Mock email sending - in real implementation, this would use an email service
    this.logger.log(`Sending report ${execution.id} to recipients: ${recipients.join(', ')}`);
    
    // Implementation would include:
    // - Email template generation
    // - Report file attachment
    // - SMTP or email service integration
    // - Error handling for failed deliveries
  }

  private async updateNextRunTime(scheduledReport: ScheduledReport): Promise<void> {
    const nextRunAt = this.calculateNextRunTime(scheduledReport);
    
    await this.scheduledReportRepository.update(scheduledReport.id, {
      lastRunAt: new Date(),
      nextRunAt,
    });
  }

  private calculateNextRunTime(scheduledReport: ScheduledReport): Date {
    const now = new Date();
    const { scheduleType, scheduleConfig } = scheduledReport;

    switch (scheduleType) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'custom':
        // Custom scheduling logic based on scheduleConfig
        return new Date(now.getTime() + (scheduleConfig.interval || 24) * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}
