import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InvoiceModuleIntegrationService {
  private readonly logger = new Logger(InvoiceModuleIntegrationService.name);
  private readonly baseUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('INVOICE_MODULE_URL') || 'http://localhost:3001';
  }

  async createInvoiceForMilestone(milestoneId: string, invoiceData: any): Promise<any> {
    this.logger.log(`Creating invoice for milestone: ${milestoneId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/v1/invoices`, {
          ...invoiceData,
          referenceId: milestoneId,
          referenceType: 'MILESTONE',
        }),
      );

      this.logger.log(`Invoice created successfully: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create invoice for milestone: ${milestoneId}`, error);
      throw error;
    }
  }

  async updateInvoiceStatus(invoiceId: string, status: string): Promise<any> {
    this.logger.log(`Updating invoice status: ${invoiceId} to ${status}`);

    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.baseUrl}/api/v1/invoices/${invoiceId}/status`, {
          status,
        }),
      );

      this.logger.log(`Invoice status updated successfully: ${invoiceId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update invoice status: ${invoiceId}`, error);
      throw error;
    }
  }

  async getInvoiceByReference(milestoneId: string): Promise<any> {
    this.logger.log(`Fetching invoice for milestone: ${milestoneId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/invoices`, {
          params: {
            referenceId: milestoneId,
            referenceType: 'MILESTONE',
          },
        }),
      );

      return response.data.invoices?.[0] || null;
    } catch (error) {
      this.logger.error(`Failed to fetch invoice for milestone: ${milestoneId}`, error);
      throw error;
    }
  }

  async cancelInvoice(invoiceId: string, reason: string): Promise<any> {
    this.logger.log(`Cancelling invoice: ${invoiceId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.baseUrl}/api/v1/invoices/${invoiceId}/cancel`, {
          reason,
        }),
      );

      this.logger.log(`Invoice cancelled successfully: ${invoiceId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to cancel invoice: ${invoiceId}`, error);
      throw error;
    }
  }
}

@Injectable()
export class PaymentModuleIntegrationService {
  private readonly logger = new Logger(PaymentModuleIntegrationService.name);
  private readonly baseUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('PAYMENT_MODULE_URL') || 'http://localhost:3003';
  }

  async initiatePaymentForMilestone(milestoneId: string, paymentData: any): Promise<any> {
    this.logger.log(`Initiating payment for milestone: ${milestoneId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/v1/payments`, {
          ...paymentData,
          referenceId: milestoneId,
          referenceType: 'MILESTONE',
        }),
      );

      this.logger.log(`Payment initiated successfully: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to initiate payment for milestone: ${milestoneId}`, error);
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    this.logger.log(`Fetching payment status: ${paymentId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/payments/${paymentId}/status`),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch payment status: ${paymentId}`, error);
      throw error;
    }
  }

  async getPaymentsByMilestone(milestoneId: string): Promise<any[]> {
    this.logger.log(`Fetching payments for milestone: ${milestoneId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/payments`, {
          params: {
            referenceId: milestoneId,
            referenceType: 'MILESTONE',
          },
        }),
      );

      return response.data.payments || [];
    } catch (error) {
      this.logger.error(`Failed to fetch payments for milestone: ${milestoneId}`, error);
      throw error;
    }
  }

  async processRefund(paymentId: string, refundData: any): Promise<any> {
    this.logger.log(`Processing refund for payment: ${paymentId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/v1/refunds`, {
          paymentId,
          ...refundData,
        }),
      );

      this.logger.log(`Refund processed successfully: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to process refund: ${paymentId}`, error);
      throw error;
    }
  }
}

@Injectable()
export class AnalyticsModuleIntegrationService {
  private readonly logger = new Logger(AnalyticsModuleIntegrationService.name);
  private readonly baseUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('ANALYTICS_MODULE_URL') || 'http://localhost:3004';
  }

  async trackMilestoneEvent(eventData: any): Promise<any> {
    this.logger.log(`Tracking milestone event: ${eventData.event}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/v1/events/milestone`, eventData),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to track milestone event: ${eventData.event}`, error);
      throw error;
    }
  }

  async getMilestoneAnalytics(milestoneId: string, timeRange?: string): Promise<any> {
    this.logger.log(`Fetching analytics for milestone: ${milestoneId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/analytics/milestones/${milestoneId}`, {
          params: { timeRange },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch milestone analytics: ${milestoneId}`, error);
      throw error;
    }
  }

  async getWorkflowAnalytics(workflowId: string, timeRange?: string): Promise<any> {
    this.logger.log(`Fetching analytics for workflow: ${workflowId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/analytics/workflows/${workflowId}`, {
          params: { timeRange },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch workflow analytics: ${workflowId}`, error);
      throw error;
    }
  }

  async generateMilestoneReport(milestoneId: string, reportType: string): Promise<any> {
    this.logger.log(`Generating report for milestone: ${milestoneId}, type: ${reportType}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/v1/reports/milestones/${milestoneId}`, {
          reportType,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to generate milestone report: ${milestoneId}`, error);
      throw error;
    }
  }

  async getProjectAnalytics(projectId: string, timeRange?: string): Promise<any> {
    this.logger.log(`Fetching analytics for project: ${projectId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/analytics/projects/${projectId}`, {
          params: { timeRange },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch project analytics: ${projectId}`, error);
      throw error;
    }
  }
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async sendEmailNotification(notificationData: any): Promise<any> {
    this.logger.log(`Sending email notification: ${notificationData.subject}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.configService.get('NOTIFICATION_SERVICE_URL')}/api/v1/notifications/email`, notificationData),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send email notification`, error);
      throw error;
    }
  }

  async sendSMSNotification(notificationData: any): Promise<any> {
    this.logger.log(`Sending SMS notification to: ${notificationData.phoneNumber}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.configService.get('NOTIFICATION_SERVICE_URL')}/api/v1/notifications/sms`, notificationData),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send SMS notification`, error);
      throw error;
    }
  }

  async sendPushNotification(notificationData: any): Promise<any> {
    this.logger.log(`Sending push notification: ${notificationData.title}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.configService.get('NOTIFICATION_SERVICE_URL')}/api/v1/notifications/push`, notificationData),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send push notification`, error);
      throw error;
    }
  }

  async sendInAppNotification(notificationData: any): Promise<any> {
    this.logger.log(`Sending in-app notification to user: ${notificationData.userId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.configService.get('NOTIFICATION_SERVICE_URL')}/api/v1/notifications/in-app`, notificationData),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send in-app notification`, error);
      throw error;
    }
  }
}

@Injectable()
export class ExternalAPIService {
  private readonly logger = new Logger(ExternalAPIService.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async validateExternalAPI(apiKey: string, apiEndpoint: string): Promise<boolean> {
    this.logger.log(`Validating external API: ${apiEndpoint}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(apiEndpoint, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );

      return response.status === 200;
    } catch (error) {
      this.logger.error(`External API validation failed: ${apiEndpoint}`, error);
      return false;
    }
  }

  async callExternalAPI(apiEndpoint: string, method: string, data?: any, headers?: any): Promise<any> {
    this.logger.log(`Calling external API: ${method} ${apiEndpoint}`);

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: 30000,
      };

      let response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await firstValueFrom(this.httpService.get(apiEndpoint, config));
          break;
        case 'POST':
          response = await firstValueFrom(this.httpService.post(apiEndpoint, data, config));
          break;
        case 'PUT':
          response = await firstValueFrom(this.httpService.put(apiEndpoint, data, config));
          break;
        case 'PATCH':
          response = await firstValueFrom(this.httpService.patch(apiEndpoint, data, config));
          break;
        case 'DELETE':
          response = await firstValueFrom(this.httpService.delete(apiEndpoint, config));
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error(`External API call failed: ${method} ${apiEndpoint}`, error);
      throw error;
    }
  }

  async uploadFileToExternalService(file: Buffer, fileName: string, mimeType: string): Promise<any> {
    this.logger.log(`Uploading file to external service: ${fileName}`);

    try {
      const formData = new FormData();
      const blob = new Blob([file], { type: mimeType });
      formData.append('file', blob, fileName);

      const response = await firstValueFrom(
        this.httpService.post(`${this.configService.get('FILE_STORAGE_SERVICE_URL')}/api/v1/files/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`File upload failed: ${fileName}`, error);
      throw error;
    }
  }

  async downloadFileFromExternalService(fileUrl: string): Promise<Buffer> {
    this.logger.log(`Downloading file from external service: ${fileUrl}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(fileUrl, {
          responseType: 'arraybuffer',
          timeout: 60000,
        }),
      );

      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`File download failed: ${fileUrl}`, error);
      throw error;
    }
  }
}
