import { Injectable, Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import { ReportService } from '../services/report.service';
import { CreateReportTemplateDto, UpdateReportTemplateDto, ExecuteReportDto, ReportQueryDto } from '../dto/report.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ResponseInterceptor } from '../interceptors/response.interceptor';

@Injectable()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseInterceptor)
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(private readonly reportService: ReportService) {}

  async createReportTemplate(createReportTemplateDto: CreateReportTemplateDto, user: any) {
    this.logger.log(`POST /reports/templates - Creating report template: ${createReportTemplateDto.name}`);
    return await this.reportService.createReportTemplate(createReportTemplateDto, user.id);
  }

  async getReportTemplates(query: ReportQueryDto, user: any) {
    this.logger.log(`GET /reports/templates - Fetching report templates`);
    return await this.reportService.getReportTemplates(query, user.id);
  }

  async getReportTemplateById(id: string, user: any) {
    this.logger.log(`GET /reports/templates/:id - Fetching report template: ${id}`);
    return await this.reportService.getReportTemplateById(id, user.id);
  }

  async updateReportTemplate(id: string, updateReportTemplateDto: UpdateReportTemplateDto, user: any) {
    this.logger.log(`PUT /reports/templates/:id - Updating report template: ${id}`);
    return await this.reportService.updateReportTemplate(id, updateReportTemplateDto, user.id);
  }

  async deleteReportTemplate(id: string, user: any) {
    this.logger.log(`DELETE /reports/templates/:id - Deleting report template: ${id}`);
    return await this.reportService.deleteReportTemplate(id, user.id);
  }

  async executeReport(executeReportDto: ExecuteReportDto, user: any) {
    this.logger.log(`POST /reports/execute - Executing report: ${executeReportDto.name}`);
    return await this.reportService.executeReport(executeReportDto, user.id);
  }

  async getReportExecutions(user: any, query?: ReportQueryDto) {
    this.logger.log(`GET /reports/executions - Fetching report executions`);
    return await this.reportService.getReportExecutions(user.id, query);
  }

  async getReportExecutionById(id: string, user: any) {
    this.logger.log(`GET /reports/executions/:id - Fetching report execution: ${id}`);
    return await this.reportService.getReportExecutionById(id, user.id);
  }

  async downloadReport(id: string, user: any) {
    this.logger.log(`GET /reports/executions/:id/download - Downloading report: ${id}`);
    return await this.reportService.downloadReport(id, user.id);
  }

  async cancelReportExecution(id: string, user: any) {
    this.logger.log(`POST /reports/executions/:id/cancel - Cancelling report execution: ${id}`);
    return await this.reportService.cancelReportExecution(id, user.id);
  }

  async createScheduledReport(templateId: string, name: string, scheduleType: string, scheduleConfig: any, recipients: string[], user: any) {
    this.logger.log(`POST /reports/scheduled - Creating scheduled report: ${name}`);
    return await this.reportService.createScheduledReport(templateId, name, scheduleType, scheduleConfig, recipients, user.id);
  }

  async getScheduledReports(user: any) {
    this.logger.log(`GET /reports/scheduled - Fetching scheduled reports`);
    return await this.reportService.getScheduledReports(user.id);
  }

  async updateScheduledReport(id: string, updates: any, user: any) {
    this.logger.log(`PUT /reports/scheduled/:id - Updating scheduled report: ${id}`);
    return await this.reportService.updateScheduledReport(id, updates, user.id);
  }

  async deleteScheduledReport(id: string, user: any) {
    this.logger.log(`DELETE /reports/scheduled/:id - Deleting scheduled report: ${id}`);
    return await this.reportService.deleteScheduledReport(id, user.id);
  }
}
