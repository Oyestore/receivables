import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, Interval } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { DistributionRecord } from '../entities/distribution-record.entity';
import { DistributionAssignment } from '../entities/distribution-assignment.entity';

export interface Webhook {
  id: string;
  name: string;
  description: string;
  tenantId: string;
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  secret?: string;
  isActive: boolean;
  retryPolicy: RetryPolicy;
  deliveryLogs: WebhookDeliveryLog[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface WebhookEvent {
  type: 'distribution.sent' | 'distribution.delivered' | 'distribution.failed' | 'customer.created' | 'customer.updated';
  filters?: Record<string, any>;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number; // in seconds
  backoffMultiplier: number;
  maxRetryDelay: number; // in seconds
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  eventId: string;
  payload: any;
  attempt: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  statusCode?: number;
  response?: string;
  error?: string;
  nextRetryAt?: Date;
  createdAt: Date;
  completedAt?: Date;
}

export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: Date;
  tenantId: string;
  data: any;
  signature?: string;
}

@Injectable()
export class WebhookManagementService {
  private readonly logger = new Logger(WebhookManagementService.name);
  private webhooks: Map<string, Webhook> = new Map();
  private deliveryQueue: WebhookDeliveryLog[] = [];
  private processingQueue = false;

  constructor(
    @InjectRepository(DistributionRecord)
    private readonly recordRepository: Repository<DistributionRecord>,
    @InjectRepository(DistributionAssignment)
    private readonly assignmentRepository: Repository<DistributionAssignment>,
    private readonly httpService: HttpService,
  ) {}

  async createWebhook(webhookData: Partial<Webhook>): Promise<Webhook> {
    const webhook: Webhook = {
      id: this.generateWebhookId(),
      name: webhookData.name!,
      description: webhookData.description!,
      tenantId: webhookData.tenantId!,
      url: webhookData.url!,
      events: webhookData.events || [],
      headers: webhookData.headers || {},
      secret: webhookData.secret || this.generateSecret(),
      isActive: webhookData.isActive ?? true,
      retryPolicy: webhookData.retryPolicy || {
        maxRetries: 3,
        retryDelay: 60,
        backoffMultiplier: 2,
        maxRetryDelay: 3600,
      },
      deliveryLogs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: webhookData.createdBy!,
    };

    // Validate webhook URL
    await this.validateWebhookUrl(webhook.url);

    this.webhooks.set(webhook.id, webhook);
    this.logger.log(`Created webhook: ${webhook.id} - ${webhook.name}`);

    return webhook;
  }

  async updateWebhook(webhookId: string, updates: Partial<Webhook>): Promise<Webhook> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    // Validate URL if being updated
    if (updates.url && updates.url !== webhook.url) {
      await this.validateWebhookUrl(updates.url);
    }

    const updatedWebhook = {
      ...webhook,
      ...updates,
      updatedAt: new Date(),
    };

    this.webhooks.set(webhookId, updatedWebhook);
    this.logger.log(`Updated webhook: ${webhookId}`);

    return updatedWebhook;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    this.webhooks.delete(webhookId);
    this.logger.log(`Deleted webhook: ${webhookId}`);
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    return webhook;
  }

  async getWebhooks(tenantId?: string): Promise<Webhook[]> {
    const webhooks = Array.from(this.webhooks.values());
    return tenantId ? webhooks.filter(w => w.tenantId === tenantId) : webhooks;
  }

  async triggerWebhook(eventType: string, data: any, tenantId: string): Promise<void> {
    this.logger.log(`Triggering webhook event: ${eventType} for tenant: ${tenantId}`);

    // Find matching webhooks
    const matchingWebhooks = await this.findMatchingWebhooks(eventType, data, tenantId);

    for (const webhook of matchingWebhooks) {
      if (!webhook.isActive) continue;

      try {
        const payload = this.createWebhookPayload(eventType, data, tenantId, webhook);
        const deliveryLog = this.createDeliveryLog(webhook.id, payload);
        
        webhook.deliveryLogs.push(deliveryLog);
        this.deliveryQueue.push(deliveryLog);

        this.logger.log(`Queued webhook delivery: ${webhook.id} for event: ${eventType}`);
      } catch (error) {
        this.logger.error(`Failed to queue webhook ${webhook.id}:`, error);
      }
    }

    // Process delivery queue
    if (!this.processingQueue) {
      this.processDeliveryQueue();
    }
  }

  @Interval(5000) // Process queue every 5 seconds
  private async processDeliveryQueue(): Promise<void> {
    if (this.processingQueue || this.deliveryQueue.length === 0) return;

    this.processingQueue = true;

    try {
      const pendingDeliveries = this.deliveryQueue.filter(log => 
        log.status === 'pending' || 
        (log.status === 'retrying' && log.nextRetryAt && log.nextRetryAt <= new Date())
      );

      for (const delivery of pendingDeliveries) {
        await this.processWebhookDelivery(delivery);
      }

      // Clean up old delivery logs
      await this.cleanupOldDeliveryLogs();
    } catch (error) {
      this.logger.error('Error processing webhook delivery queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  private async processWebhookDelivery(delivery: WebhookDeliveryLog): Promise<void> {
    const webhook = this.webhooks.get(delivery.webhookId);
    if (!webhook) {
      delivery.status = 'failed';
      delivery.error = 'Webhook not found';
      delivery.completedAt = new Date();
      return;
    }

    delivery.status = 'retrying';
    delivery.attempt++;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'SME-Platform-Webhooks/1.0',
        ...webhook.headers,
      };

      // Add signature if secret is configured
      if (webhook.secret) {
        headers['X-SME-Signature'] = this.generateSignature(delivery.payload, webhook.secret);
      }

      const response = await this.httpService.post(webhook.url, delivery.payload, {
        headers,
        timeout: 30000, // 30 seconds timeout
      }).toPromise();

      delivery.status = 'success';
      delivery.statusCode = response.status;
      delivery.response = JSON.stringify(response.data);
      delivery.completedAt = new Date();

      this.logger.log(`Webhook delivered successfully: ${webhook.id}, Status: ${response.status}`);

    } catch (error: any) {
      delivery.status = 'failed';
      delivery.error = error.message;
      delivery.statusCode = error.response?.status;

      // Schedule retry if applicable
      if (delivery.attempt < webhook.retryPolicy.maxRetries) {
        const retryDelay = this.calculateRetryDelay(delivery.attempt, webhook.retryPolicy);
        delivery.nextRetryAt = new Date(Date.now() + retryDelay * 1000);
        delivery.status = 'retrying';
        
        this.logger.log(`Webhook delivery failed, scheduling retry: ${webhook.id}, Attempt: ${delivery.attempt}, Retry in: ${retryDelay}s`);
      } else {
        delivery.completedAt = new Date();
        this.logger.error(`Webhook delivery failed permanently: ${webhook.id}, Error: ${error.message}`);
      }
    }

    // Update webhook delivery logs
    webhook.deliveryLogs = webhook.deliveryLogs.map(log => 
      log.id === delivery.id ? delivery : log
    );
  }

  private async findMatchingWebhooks(eventType: string, data: any, tenantId: string): Promise<Webhook[]> {
    const tenantWebhooks = Array.from(this.webhooks.values())
      .filter(w => w.tenantId === tenantId && w.isActive);

    const matchingWebhooks: Webhook[] = [];

    for (const webhook of tenantWebhooks) {
      for (const event of webhook.events) {
        if (event.type === eventType) {
          // Check if filters match
          if (this.eventMatchesFilters(data, event.filters)) {
            matchingWebhooks.push(webhook);
            break; // Don't add the same webhook multiple times
          }
        }
      }
    }

    return matchingWebhooks;
  }

  private eventMatchesFilters(data: any, filters?: Record<string, any>): boolean {
    if (!filters) return true;

    for (const [key, value] of Object.entries(filters)) {
      const dataValue = this.getNestedValue(data, key);
      
      if (typeof value === 'object' && value !== null) {
        // Handle complex filter objects
        if (!this.matchesComplexFilter(dataValue, value)) {
          return false;
        }
      } else if (dataValue !== value) {
        return false;
      }
    }

    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private matchesComplexFilter(dataValue: any, filter: any): boolean {
    if (filter.$eq) return dataValue === filter.$eq;
    if (filter.$ne) return dataValue !== filter.$ne;
    if (filter.$gt) return dataValue > filter.$gt;
    if (filter.$gte) return dataValue >= filter.$gte;
    if (filter.$lt) return dataValue < filter.$lt;
    if (filter.$lte) return dataValue <= filter.$lte;
    if (filter.$in) return Array.isArray(filter.$in) && filter.$in.includes(dataValue);
    if (filter.$nin) return Array.isArray(filter.$nin) && !filter.$nin.includes(dataValue);
    if (filter.$exists) return (dataValue !== undefined) === filter.$exists;
    
    return false;
  }

  private createWebhookPayload(eventType: string, data: any, tenantId: string, webhook: Webhook): WebhookPayload {
    const payload: WebhookPayload = {
      id: this.generatePayloadId(),
      event: eventType,
      timestamp: new Date(),
      tenantId,
      data,
    };

    // Add signature if secret is configured
    if (webhook.secret) {
      payload.signature = this.generateSignature(payload, webhook.secret);
    }

    return payload;
  }

  private createDeliveryLog(webhookId: string, payload: WebhookPayload): WebhookDeliveryLog {
    return {
      id: this.generateDeliveryLogId(),
      webhookId,
      eventId: payload.id,
      payload,
      attempt: 0,
      status: 'pending',
      createdAt: new Date(),
    };
  }

  private generateSignature(payload: any, secret: string): string {
    // HMAC-SHA256 signature
    const crypto = require('crypto');
    const payloadString = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  private calculateRetryDelay(attempt: number, retryPolicy: RetryPolicy): number {
    const delay = retryPolicy.retryDelay * Math.pow(retryPolicy.backoffMultiplier, attempt - 1);
    return Math.min(delay, retryPolicy.maxRetryDelay);
  }

  private async validateWebhookUrl(url: string): Promise<void> {
    try {
      // Basic URL validation
      const urlObj = new URL(url);
      
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
      }

      // Test connectivity (optional - could be disabled for performance)
      // await this.httpService.get(url, { timeout: 5000 }).toPromise();
      
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${error.message}`);
    }
  }

  @Cron('0 0 * * *') // Daily at midnight
  private async cleanupOldDeliveryLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep logs for 30 days

    for (const webhook of this.webhooks.values()) {
      const originalLength = webhook.deliveryLogs.length;
      webhook.deliveryLogs = webhook.deliveryLogs.filter(log => 
        log.createdAt > cutoffDate || log.status === 'pending' || log.status === 'retrying'
      );
      
      if (webhook.deliveryLogs.length < originalLength) {
        this.logger.log(`Cleaned up ${originalLength - webhook.deliveryLogs.length} old delivery logs for webhook: ${webhook.id}`);
      }
    }

    // Clean up delivery queue
    this.deliveryQueue = this.deliveryQueue.filter(log => 
      log.createdAt > cutoffDate || log.status === 'pending' || log.status === 'retrying'
    );
  }

  async getWebhookDeliveryLogs(webhookId: string, limit = 100): Promise<WebhookDeliveryLog[]> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    return webhook.deliveryLogs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getWebhookStatistics(webhookId: string): Promise<any> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const logs = webhook.deliveryLogs;
    const totalDeliveries = logs.length;
    const successfulDeliveries = logs.filter(log => log.status === 'success').length;
    const failedDeliveries = logs.filter(log => log.status === 'failed').length;
    const pendingDeliveries = logs.filter(log => log.status === 'pending' || log.status === 'retrying').length;

    const successRate = totalDeliveries > 0 ? successfulDeliveries / totalDeliveries : 0;
    const averageResponseTime = this.calculateAverageResponseTime(logs);

    return {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      pendingDeliveries,
      successRate,
      averageResponseTime,
      lastDelivery: logs[0]?.createdAt,
      webhookStatus: webhook.isActive ? 'active' : 'inactive',
    };
  }

  async testWebhook(webhookId: string, testPayload?: any): Promise<any> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const payload = testPayload || {
      id: this.generatePayloadId(),
      event: 'webhook.test',
      timestamp: new Date(),
      tenantId: webhook.tenantId,
      data: {
        message: 'This is a test webhook delivery',
        webhookId: webhook.id,
      },
    };

    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'SME-Platform-Webhooks/1.0',
        'X-SME-Test': 'true',
        ...webhook.headers,
      };

      if (webhook.secret) {
        headers['X-SME-Signature'] = this.generateSignature(payload, webhook.secret);
      }

      const startTime = Date.now();
      const response = await this.httpService.post(webhook.url, payload, {
        headers,
        timeout: 10000, // 10 seconds timeout for test
      }).toPromise();
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        statusCode: response.status,
        responseTime,
        response: response.data,
        timestamp: new Date(),
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        timestamp: new Date(),
      };
    }
  }

  async getWebhookHealth(): Promise<any> {
    const totalWebhooks = this.webhooks.size;
    const activeWebhooks = Array.from(this.webhooks.values()).filter(w => w.isActive).length;
    const queueSize = this.deliveryQueue.filter(log => log.status === 'pending').length;
    const retryingDeliveries = this.deliveryQueue.filter(log => log.status === 'retrying').length;

    // Calculate success rates across all webhooks
    let totalDeliveries = 0;
    let successfulDeliveries = 0;

    for (const webhook of this.webhooks.values()) {
      const logs = webhook.deliveryLogs;
      totalDeliveries += logs.length;
      successfulDeliveries += logs.filter(log => log.status === 'success').length;
    }

    const overallSuccessRate = totalDeliveries > 0 ? successfulDeliveries / totalDeliveries : 0;

    return {
      totalWebhooks,
      activeWebhooks,
      inactiveWebhooks: totalWebhooks - activeWebhooks,
      queueSize,
      retryingDeliveries,
      overallSuccessRate,
      systemLoad: this.calculateSystemLoad(),
      lastUpdated: new Date(),
    };
  }

  private calculateAverageResponseTime(logs: WebhookDeliveryLog[]): number {
    const completedLogs = logs.filter(log => log.completedAt);
    if (completedLogs.length === 0) return 0;

    const totalResponseTime = completedLogs.reduce((sum, log) => 
      sum + (log.completedAt!.getTime() - log.createdAt.getTime()), 0);

    return totalResponseTime / completedLogs.length;
  }

  private calculateSystemLoad(): number {
    // Simplified system load calculation
    const queueLoad = this.deliveryQueue.length / 1000; // Normalize to 1000
    const processingLoad = this.processingQueue ? 0.5 : 0;
    
    return Math.min(1, queueLoad + processingLoad);
  }

  // Event triggers for distribution events
  async triggerDistributionSent(distributionId: string, data: any): Promise<void> {
    await this.triggerWebhook('distribution.sent', { distributionId, ...data }, data.tenantId);
  }

  async triggerDistributionDelivered(distributionId: string, data: any): Promise<void> {
    await this.triggerWebhook('distribution.delivered', { distributionId, ...data }, data.tenantId);
  }

  async triggerDistributionFailed(distributionId: string, data: any): Promise<void> {
    await this.triggerWebhook('distribution.failed', { distributionId, ...data }, data.tenantId);
  }

  async triggerCustomerCreated(customerId: string, data: any): Promise<void> {
    await this.triggerWebhook('customer.created', { customerId, ...data }, data.tenantId);
  }

  async triggerCustomerUpdated(customerId: string, data: any): Promise<void> {
    await this.triggerWebhook('customer.updated', { customerId, ...data }, data.tenantId);
  }

  // Utility methods
  private generateWebhookId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePayloadId(): string {
    return `payload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDeliveryLogId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}
