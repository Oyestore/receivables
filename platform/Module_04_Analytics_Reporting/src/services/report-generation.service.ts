import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Between, LessThan } from 'typeorm';
import { ReportExecution, ReportStatus } from '../entities/report-execution.entity';
import { ReportTemplate } from '../entities/report-template.entity';
import { User } from '../entities/user.entity';
import { ScheduledReport } from '../entities/scheduled-report.entity';
import { QueueService } from './queue.service';
import { NotificationService } from './notification.service';

@Injectable()
export class ReportGenerationService {
  private readonly logger = new Logger(ReportGenerationService.name);

  constructor(
    @InjectRepository(ReportExecution)
    private readonly reportExecutionRepository: Repository<ReportExecution>,
    @InjectRepository(ScheduledReport)
    private readonly scheduledReportRepository: Repository<ScheduledReport>,
    private readonly notificationService: NotificationService,
  ) {}

  async generateReport(
    templateId: string,
    name: string,
    format: string,
    parameters: any,
    userId: string,
  ): Promise<ReportExecution> {
    this.logger.log(`Generating report: ${name} (${format})`);

    const execution = this.reportExecutionRepository.create({
      templateId,
      name,
      format,
      parameters,
      status: ReportStatus.PENDING,
      progress: 0,
      createdBy: userId,
      createdAt: new Date(),
    });

    const savedExecution = await this.reportExecutionRepository.save(execution);

    // Start async report generation
    this.generateReportAsync(savedExecution.id);

    return savedExecution;
  }

  private async generateReportAsync(executionId: string): Promise<void> {
    try {
      const execution = await this.reportExecutionRepository.findOne({
        where: { id: executionId },
        relations: ['template'],
      });

      if (!execution) {
        this.logger.error(`Report execution not found: ${executionId}`);
        return;
      }

      // Update status to processing
      execution.status = ReportStatus.PROCESSING;
      execution.startedAt = new Date();
      execution.progress = 10;
      await this.reportExecutionRepository.save(execution);

      // Simulate report generation steps
      await this.simulateReportGeneration(execution);

      // Update status to completed
      execution.status = ReportStatus.COMPLETED;
      execution.progress = 100;
      execution.completedAt = new Date();
      execution.filePath = `/reports/${execution.id}.${execution.format}`;
      execution.fileSize = Math.floor(Math.random() * 1000000); // Mock file size

      await this.reportExecutionRepository.save(execution);

      // Send notification if needed
      if (execution.template?.executions?.length > 0) {
        // Send email notification
        await this.sendReportNotification(execution);
      }

      this.logger.log(`Report generated successfully: ${execution.id}`);
    } catch (error) {
      this.logger.error(`Report generation failed: ${executionId}`, error);

      // Update status to failed
      const execution = await this.reportExecutionRepository.findOne({
        where: { id: executionId },
      });

      if (execution) {
        execution.status = ReportStatus.FAILED;
        execution.errorMessage = error.message;
        execution.completedAt = new Date();
        await this.reportExecutionRepository.save(execution);
      }
    }
  }

  private async simulateReportGeneration(execution: ReportExecution): Promise<void> {
    const steps = [
      { progress: 25, message: 'Fetching data...' },
      { progress: 50, message: 'Processing data...' },
      { progress: 75, message: 'Generating report...' },
      { progress: 90, message: 'Finalizing...' },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
      
      execution.progress = step.progress;
      await this.reportExecutionRepository.save(execution);
      
      this.logger.log(`Report generation progress: ${execution.id} - ${step.progress}% - ${step.message}`);
    }
  }

  private async sendReportNotification(execution: ReportExecution): Promise<void> {
    try {
      // Get user information for notification
      const user = await this.getUserById(execution.createdBy);
      
      if (user) {
        await this.notificationService.sendReportEmail(
          user.email,
          `Report Generated: ${execution.name}`,
          execution.name,
          execution.filePath || '',
          execution.format,
          {
            generatedAt: execution.completedAt,
            fileSize: execution.fileSize,
            templateId: execution.templateId,
          },
        );
      }
    } catch (error) {
      this.logger.error('Error sending report notification:', error);
    }
  }

  private async getUserById(userId: string): Promise<any> {
    // Mock implementation - would use UserRepository
    return {
      id: userId,
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
    };
  }

  async getReportExecutionStatus(executionId: string): Promise<ReportExecution> {
    const execution = await this.reportExecutionRepository.findOne({
      where: { id: executionId },
      relations: ['template'],
    });

    if (!execution) {
      throw new Error('Report execution not found');
    }

    return execution;
  }

  async cancelReportExecution(executionId: string): Promise<void> {
    const execution = await this.reportExecutionRepository.findOne({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error('Report execution not found');
    }

    if (execution.status === ReportStatus.COMPLETED) {
      throw new Error('Cannot cancel completed report');
    }

    execution.status = ReportStatus.CANCELLED;
    execution.completedAt = new Date();
    await this.reportExecutionRepository.save(execution);

    this.logger.log(`Report execution cancelled: ${executionId}`);
  }

  async retryReportExecution(executionId: string): Promise<ReportExecution> {
    const execution = await this.reportExecutionRepository.findOne({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error('Report execution not found');
    }

    if (execution.status !== ReportStatus.FAILED) {
      throw new Error('Can only retry failed reports');
    }

    // Reset execution status and retry
    execution.status = ReportStatus.PENDING;
    execution.progress = 0;
    execution.errorMessage = '';
    execution.startedAt = new Date();
    execution.completedAt = new Date();
    execution.filePath = '';
    execution.fileSize = 0;

    const savedExecution = await this.reportExecutionRepository.save(execution);

    // Start async report generation again
    await this.generateReportAsync(savedExecution.id);

    return savedExecution;
  }

  async getReportExecutionsByUser(userId: string, limit: number = 10): Promise<ReportExecution[]> {
    return await this.reportExecutionRepository.find({
      where: { createdBy: userId },
      relations: ['template'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getReportExecutionsByTemplate(templateId: string, limit: number = 10): Promise<ReportExecution[]> {
    return await this.reportExecutionRepository.find({
      where: { templateId },
      relations: ['template'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getReportStatistics(): Promise<any> {
    const totalReports = await this.reportExecutionRepository.count();
    const completedReports = await this.reportExecutionRepository.count({
      where: { status: ReportStatus.COMPLETED },
    });
    const failedReports = await this.reportExecutionRepository.count({
      where: { status: ReportStatus.FAILED },
    });
    const pendingReports = await this.reportExecutionRepository.count({
      where: { status: ReportStatus.PENDING },
    });

    const reportsByFormat = await this.getReportsByFormat();
    const reportsByStatus = await this.getReportsByStatus();

    return {
      total: totalReports,
      completed: completedReports,
      failed: failedReports,
      pending: pendingReports,
      byFormat: reportsByFormat,
      byStatus: reportsByStatus,
      successRate: totalReports > 0 ? (completedReports / totalReports) * 100 : 0,
      averageGenerationTime: await this.getAverageGenerationTime(),
    };
  }

  private async getReportsByFormat(): Promise<any> {
    const formats = ['pdf', 'xlsx', 'csv', 'json', 'html'];
    const result: any = {};

    for (const format of formats) {
      result[format] = await this.reportExecutionRepository.count({
        where: { format },
      });
    }

    return result;
  }

  private async getReportsByStatus(): Promise<any> {
    const statuses = [ReportStatus.PENDING, ReportStatus.PROCESSING, ReportStatus.COMPLETED, ReportStatus.FAILED, ReportStatus.CANCELLED];
    const result: any = {};

    for (const status of statuses) {
      result[status] = await this.reportExecutionRepository.count({
        where: { status },
      });
    }

    return result;
  }

  private async getAverageGenerationTime(): Promise<number> {
    const completedReports = await this.reportExecutionRepository.find({
      where: { status: ReportStatus.COMPLETED },
      select: ['startedAt', 'completedAt'],
    });

    if (completedReports.length === 0) {
      return 0;
    }

    const totalTime = completedReports.reduce((sum, report) => {
      if (report.startedAt && report.completedAt) {
        return sum + (report.completedAt.getTime() - report.startedAt.getTime());
      }
      return sum;
    }, 0);

    return totalTime / completedReports.length / 1000; // Convert to seconds
  }

  async cleanupOldReports(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.reportExecutionRepository.delete({
      createdAt: LessThan(cutoffDate),
      status: ReportStatus.COMPLETED,
    });

    this.logger.log(`Cleaned up ${result.affected || 0} old reports`);
    return result.affected || 0;
  }
}
