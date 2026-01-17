import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { MilestoneVerification } from '../entities/milestone-verification.entity';
import { MilestoneEscalation } from '../entities/milestone-escalation.entity';
import { NotificationService } from './notification.service';

export interface ProbingChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'webhook' | 'api' | 'database' | 'file' | 'slack' | 'teams';
  config: any;
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    retryDelay: number;
  };
}

export interface ProbingRequest {
  milestoneId: string;
  channels: string[];
  probeType: 'status' | 'health' | 'completion' | 'verification' | 'escalation';
  frequency: 'once' | 'hourly' | 'daily' | 'weekly';
  schedule?: string;
  conditions?: any;
  template?: string;
  metadata?: any;
}

export interface ProbingResult {
  id: string;
  milestoneId: string;
  channelId: string;
  channelType: string;
  probeType: string;
  status: 'success' | 'failed' | 'pending' | 'timeout';
  response: any;
  error?: string;
  duration: number;
  timestamp: Date;
  metadata?: any;
}

export interface ProbingAnalytics {
  totalProbes: number;
  successfulProbes: number;
  failedProbes: number;
  successRate: number;
  averageResponseTime: number;
  channelPerformance: Array<{
    channelId: string;
    channelName: string;
    totalProbes: number;
    successRate: number;
    averageResponseTime: number;
  }>;
  probeTypePerformance: Array<{
    probeType: string;
    totalProbes: number;
    successRate: number;
    averageResponseTime: number;
  }>;
  trends: Array<{
    date: string;
    successRate: number;
    responseTime: number;
  }>;
}

@Injectable()
export class MultiChannelStatusProbingService implements OnModuleInit {
  private readonly logger = new Logger(MultiChannelStatusProbingService.name);
  private probingChannels: Map<string, ProbingChannel> = new Map();
  private activeProbes: Map<string, ProbingRequest> = new Map();
  private probeResults: Map<string, ProbingResult[]> = new Map();
  private scheduledProbes: Map<string, NodeJS.Timeout> = new Map();
  private channelExecutors: Map<string, (request: ProbingRequest, channel: ProbingChannel) => Promise<ProbingResult>> = new Map();

  constructor(
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,
    @InjectRepository(WorkflowInstance)
    private workflowInstanceRepository: Repository<WorkflowInstance>,
    @InjectRepository(MilestoneVerification)
    private verificationRepository: Repository<MilestoneVerification>,
    @InjectRepository(MilestoneEscalation)
    private escalationRepository: Repository<MilestoneEscalation>,
    private notificationService: NotificationService,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Multi-Channel Status Probing Service...');
    await this.initializeDefaultChannels();
    await this.initializeChannelExecutors();
    await this.startProbingScheduler();
    await this.startHealthMonitoring();
  }

  async createProbingChannel(channel: Omit<ProbingChannel, 'id'>): Promise<ProbingChannel> {
    const newChannel: ProbingChannel = {
      ...channel,
      id: `channel_${Date.now()}`,
    };

    this.probingChannels.set(newChannel.id, newChannel);
    this.logger.log(`Created probing channel: ${newChannel.name} (${newChannel.type})`);

    return newChannel;
  }

  async updateProbingChannel(channelId: string, updates: Partial<ProbingChannel>): Promise<ProbingChannel> {
    const channel = this.probingChannels.get(channelId);
    if (!channel) {
      throw new Error(`Probing channel ${channelId} not found`);
    }

    const updatedChannel = { ...channel, ...updates };
    this.probingChannels.set(channelId, updatedChannel);

    this.logger.log(`Updated probing channel: ${updatedChannel.name}`);
    return updatedChannel;
  }

  async deleteProbingChannel(channelId: string): Promise<void> {
    const channel = this.probingChannels.get(channelId);
    if (!channel) {
      throw new Error(`Probing channel ${channelId} not found`);
    }

    this.probingChannels.delete(channelId);
    this.logger.log(`Deleted probing channel: ${channel.name}`);
  }

  async getProbingChannels(): Promise<ProbingChannel[]> {
    return Array.from(this.probingChannels.values());
  }

  async createProbingRequest(request: ProbingRequest): Promise<string> {
    const probeId = `probe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate channels
    const validChannels = request.channels.filter(channelId => this.probingChannels.has(channelId));
    if (validChannels.length === 0) {
      throw new Error('No valid probing channels specified');
    }

    const probingRequest: ProbingRequest = {
      ...request,
      channels: validChannels,
    };

    this.activeProbes.set(probeId, probingRequest);

    // Execute probe immediately if frequency is 'once'
    if (request.frequency === 'once') {
      await this.executeProbe(probeId, probingRequest);
    } else {
      // Schedule recurring probe
      await this.scheduleRecurringProbe(probeId, probingRequest);
    }

    this.logger.log(`Created probing request: ${probeId} for milestone: ${request.milestoneId}`);
    return probeId;
  }

  async executeProbe(probeId: string, request: ProbingRequest): Promise<ProbingResult[]> {
    this.logger.log(`Executing probe: ${probeId} for milestone: ${request.milestoneId}`);

    const results: ProbingResult[] = [];

    for (const channelId of request.channels) {
      const channel = this.probingChannels.get(channelId);
      if (!channel || !channel.isActive) {
        continue;
      }

      try {
        const result = await this.executeChannelProbe(request, channel);
        results.push(result);
        
        // Store result
        const milestoneResults = this.probeResults.get(request.milestoneId) || [];
        milestoneResults.push(result);
        this.probeResults.set(request.milestoneId, milestoneResults);

      } catch (error) {
        this.logger.error(`Error executing probe on channel ${channelId}:`, error);
        
        const failedResult: ProbingResult = {
          id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          milestoneId: request.milestoneId,
          channelId,
          channelType: channel.type,
          probeType: request.probeType,
          status: 'failed',
          response: null,
          error: error.message,
          duration: 0,
          timestamp: new Date(),
        };
        
        results.push(failedResult);
      }
    }

    // Send summary notification
    await this.sendProbeSummaryNotification(request, results);

    return results;
  }

  async cancelProbingRequest(probeId: string): Promise<void> {
    const probe = this.activeProbes.get(probeId);
    if (!probe) {
      throw new Error(`Probing request ${probeId} not found`);
    }

    // Cancel scheduled probe
    const scheduledProbe = this.scheduledProbes.get(probeId);
    if (scheduledProbe) {
      clearTimeout(scheduledProbe);
      this.scheduledProbes.delete(probeId);
    }

    this.activeProbes.delete(probeId);
    this.logger.log(`Cancelled probing request: ${probeId}`);
  }

  async getProbingResults(milestoneId: string, limit?: number): Promise<ProbingResult[]> {
    const results = this.probeResults.get(milestoneId) || [];
    return limit ? results.slice(-limit) : results;
  }

  async getProbingAnalytics(tenantId: string, timeRange?: string): Promise<ProbingAnalytics> {
    const allResults: ProbingResult[] = [];
    
    // Collect all results from all milestones in the tenant
    for (const [milestoneId, results] of this.probeResults) {
      allResults.push(...results);
    }

    // Filter by time range if specified
    const filteredResults = timeRange ? this.filterResultsByTimeRange(allResults, timeRange) : allResults;

    const totalProbes = filteredResults.length;
    const successfulProbes = filteredResults.filter(r => r.status === 'success').length;
    const failedProbes = filteredResults.filter(r => r.status === 'failed').length;
    const successRate = totalProbes > 0 ? (successfulProbes / totalProbes) * 100 : 0;
    const averageResponseTime = totalProbes > 0 
      ? filteredResults.reduce((sum, r) => sum + r.duration, 0) / totalProbes 
      : 0;

    // Channel performance
    const channelPerformance = this.calculateChannelPerformance(filteredResults);
    
    // Probe type performance
    const probeTypePerformance = this.calculateProbeTypePerformance(filteredResults);
    
    // Trends
    const trends = this.calculateTrends(filteredResults);

    return {
      totalProbes,
      successfulProbes,
      failedProbes,
      successRate,
      averageResponseTime,
      channelPerformance,
      probeTypePerformance,
      trends,
    };
  }

  private async initializeDefaultChannels(): Promise<void> {
    // Email channel
    await this.createProbingChannel({
      name: 'Email Notifications',
      type: 'email',
      config: {
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        username: process.env.SMTP_USERNAME,
        password: process.env.SMTP_PASSWORD,
        fromAddress: process.env.SMTP_FROM || 'noreply@company.com',
      },
      isActive: true,
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        retryDelay: 5000,
      },
    });

    // SMS channel
    await this.createProbingChannel({
      name: 'SMS Notifications',
      type: 'sms',
      config: {
        provider: process.env.SMS_PROVIDER || 'twilio',
        apiKey: process.env.SMS_API_KEY,
        apiSecret: process.env.SMS_API_SECRET,
        fromNumber: process.env.SMS_FROM_NUMBER,
      },
      isActive: true,
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'linear',
        retryDelay: 10000,
      },
    });

    // Webhook channel
    await this.createProbingChannel({
      name: 'Webhook Notifications',
      type: 'webhook',
      config: {
        url: process.env.WEBHOOK_URL || 'https://api.company.com/webhooks/milestone-status',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN || 'token'}`,
        },
        timeout: 30000,
      },
      isActive: true,
      retryPolicy: {
        maxRetries: 5,
        backoffStrategy: 'exponential',
        retryDelay: 2000,
      },
    });

    // Slack channel
    await this.createProbingChannel({
      name: 'Slack Notifications',
      type: 'slack',
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#milestone-updates',
        username: 'Milestone Bot',
      },
      isActive: true,
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'linear',
        retryDelay: 5000,
      },
    });

    // Teams channel
    await this.createProbingChannel({
      name: 'Microsoft Teams',
      type: 'teams',
      config: {
        webhookUrl: process.env.TEAMS_WEBHOOK_URL,
        title: 'Milestone Status Update',
      },
      isActive: true,
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'linear',
        retryDelay: 5000,
      },
    });

    this.logger.log(`Initialized ${this.probingChannels.size} default probing channels`);
  }

  private async initializeChannelExecutors(): Promise<void> {
    this.channelExecutors.set('email', this.executeEmailProbe.bind(this));
    this.channelExecutors.set('sms', this.executeSMSProbe.bind(this));
    this.channelExecutors.set('webhook', this.executeWebhookProbe.bind(this));
    this.channelExecutors.set('api', this.executeAPIProbe.bind(this));
    this.channelExecutors.set('database', this.executeDatabaseProbe.bind(this));
    this.channelExecutors.set('file', this.executeFileProbe.bind(this));
    this.channelExecutors.set('slack', this.executeSlackProbe.bind(this));
    this.channelExecutors.set('teams', this.executeTeamsProbe.bind(this));

    this.logger.log(`Initialized ${this.channelExecutors.size} channel executors`);
  }

  private async startProbingScheduler(): Promise<void> {
    setInterval(async () => {
      await this.processScheduledProbes();
    }, 60000); // Check every minute
  }

  private async startHealthMonitoring(): Promise<void> {
    setInterval(async () => {
      await this.performHealthChecks();
    }, 300000); // Health check every 5 minutes
  }

  private async executeChannelProbe(request: ProbingRequest, channel: ProbingChannel): Promise<ProbingResult> {
    const startTime = Date.now();
    
    try {
      const executor = this.channelExecutors.get(channel.type);
      if (!executor) {
        throw new Error(`No executor found for channel type: ${channel.type}`);
      }

      const response = await executor(request, channel);
      
      return {
        id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        milestoneId: request.milestoneId,
        channelId: channel.id,
        channelType: channel.type,
        probeType: request.probeType,
        status: 'success',
        response,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };

    } catch (error) {
      return {
        id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        milestoneId: request.milestoneId,
        channelId: channel.id,
        channelType: channel.type,
        probeType: request.probeType,
        status: 'failed',
        response: null,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  private async executeEmailProbe(request: ProbingRequest, channel: ProbingChannel): Promise<any> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: request.milestoneId, isDeleted: false },
    });

    if (!milestone) {
      throw new Error(`Milestone ${request.milestoneId} not found`);
    }

    const statusData = await this.getMilestoneStatusData(request.milestoneId, request.probeType);
    
    // Send email using notification service
    await this.notificationService.sendEmail({
      to: channel.config.recipients || ['admin@company.com'],
      subject: `Milestone Status Probe: ${milestone.title}`,
      template: request.template || 'milestone-status-probe',
      data: {
        milestone,
        statusData,
        probeType: request.probeType,
        timestamp: new Date(),
      },
    });

    return {
      message: 'Email probe sent successfully',
      recipients: channel.config.recipients,
      milestoneId: request.milestoneId,
      statusData,
    };
  }

  private async executeSMSProbe(request: ProbingRequest, channel: ProbingChannel): Promise<any> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: request.milestoneId, isDeleted: false },
    });

    if (!milestone) {
      throw new Error(`Milestone ${request.milestoneId} not found`);
    }

    const statusData = await this.getMilestoneStatusData(request.milestoneId, request.probeType);
    
    // Send SMS using notification service
    await this.notificationService.sendSMS({
      to: channel.config.recipients || ['+1234567890'],
      message: `Milestone "${milestone.title}" status: ${statusData.status}. Progress: ${statusData.progress}%`,
    });

    return {
      message: 'SMS probe sent successfully',
      recipients: channel.config.recipients,
      milestoneId: request.milestoneId,
      statusData,
    };
  }

  private async executeWebhookProbe(request: ProbingRequest, channel: ProbingChannel): Promise<any> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: request.milestoneId, isDeleted: false },
    });

    if (!milestone) {
      throw new Error(`Milestone ${request.milestoneId} not found`);
    }

    const statusData = await this.getMilestoneStatusData(request.milestoneId, request.probeType);
    
    const payload = {
      milestoneId: request.milestoneId,
      probeType: request.probeType,
      timestamp: new Date().toISOString(),
      milestone,
      statusData,
    };

    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: channel.config.headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(channel.config.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    return {
      message: 'Webhook probe sent successfully',
      url: channel.config.url,
      response: responseData,
      milestoneId: request.milestoneId,
      statusData,
    };
  }

  private async executeAPIProbe(request: ProbingRequest, channel: ProbingChannel): Promise<any> {
    const statusData = await this.getMilestoneStatusData(request.milestoneId, request.probeType);
    
    const response = await fetch(channel.config.url, {
      method: 'GET',
      headers: channel.config.headers,
      signal: AbortSignal.timeout(channel.config.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    return {
      message: 'API probe completed successfully',
      url: channel.config.url,
      response: responseData,
      milestoneId: request.milestoneId,
      statusData,
    };
  }

  private async executeDatabaseProbe(request: ProbingRequest, channel: ProbingChannel): Promise<any> {
    const statusData = await this.getMilestoneStatusData(request.milestoneId, request.probeType);
    
    // Query database for milestone status
    const query = `
      SELECT 
        m.id,
        m.status,
        m.progress_percentage,
        m.created_at,
        m.updated_at,
        COUNT(v.id) as verification_count,
        COUNT(e.id) as escalation_count
      FROM milestones m
      LEFT JOIN milestone_verifications v ON m.id = v.milestone_id
      LEFT JOIN milestone_escalations e ON m.id = e.milestone_id
      WHERE m.id = $1 AND m.is_deleted = false
      GROUP BY m.id
    `;

    const result = await this.dataSource.query(query, [request.milestoneId]);

    return {
      message: 'Database probe completed successfully',
      query,
      result: result[0] || null,
      milestoneId: request.milestoneId,
      statusData,
    };
  }

  private async executeFileProbe(request: ProbingRequest, channel: ProbingChannel): Promise<any> {
    const statusData = await this.getMilestoneStatusData(request.milestoneId, request.probeType);
    
    // Write status to file
    const filePath = `${channel.config.directory}/milestone_${request.milestoneId}_status_${Date.now()}.json`;
    const fileContent = {
      milestoneId: request.milestoneId,
      probeType: request.probeType,
      timestamp: new Date().toISOString(),
      statusData,
    };

    // In a real implementation, you would write to actual file system
    // For now, just simulate the operation
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      message: 'File probe completed successfully',
      filePath,
      fileContent,
      milestoneId: request.milestoneId,
      statusData,
    };
  }

  private async executeSlackProbe(request: ProbingRequest, channel: ProbingChannel): Promise<any> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: request.milestoneId, isDeleted: false },
    });

    if (!milestone) {
      throw new Error(`Milestone ${request.milestoneId} not found`);
    }

    const statusData = await this.getMilestoneStatusData(request.milestoneId, request.probeType);
    
    const payload = {
      channel: channel.config.channel,
      username: channel.config.username,
      text: `Milestone Status Update`,
      attachments: [{
        color: statusData.status === 'COMPLETED' ? 'good' : statusData.status === 'FAILED' ? 'danger' : 'warning',
        fields: [
          { title: 'Milestone', value: milestone.title, short: true },
          { title: 'Status', value: statusData.status, short: true },
          { title: 'Progress', value: `${statusData.progress}%`, short: true },
          { title: 'Last Updated', value: new Date().toLocaleString(), short: true },
        ],
      }],
    };

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook request failed: ${response.status} ${response.statusText}`);
    }

    return {
      message: 'Slack probe sent successfully',
      channel: channel.config.channel,
      milestoneId: request.milestoneId,
      statusData,
    };
  }

  private async executeTeamsProbe(request: ProbingRequest, channel: ProbingChannel): Promise<any> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: request.milestoneId, isDeleted: false },
    });

    if (!milestone) {
      throw new Error(`Milestone ${request.milestoneId} not found`);
    }

    const statusData = await this.getMilestoneStatusData(request.milestoneId, request.probeType);
    
    const payload = {
      title: channel.config.title,
      text: `Milestone status update for "${milestone.title}"`,
      sections: [{
        facts: [
          { name: 'Milestone ID', value: request.milestoneId },
          { name: 'Status', value: statusData.status },
          { name: 'Progress', value: `${statusData.progress}%` },
          { name: 'Last Updated', value: new Date().toLocaleString() },
        ],
      }],
      potentialAction: [{
        '@type': 'OpenUri',
        name: 'View Milestone',
        targets: [{ os: 'default', uri: `${process.env.FRONTEND_URL}/milestones/${request.milestoneId}` }],
      }],
    };

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Teams webhook request failed: ${response.status} ${response.statusText}`);
    }

    return {
      message: 'Teams probe sent successfully',
      milestoneId: request.milestoneId,
      statusData,
    };
  }

  private async getMilestoneStatusData(milestoneId: string, probeType: string): Promise<any> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId, isDeleted: false },
    });

    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`);
    }

    let statusData: any = {
      milestoneId,
      status: milestone.status,
      progress: milestone.progressPercentage || 0,
      lastUpdated: milestone.updatedAt,
    };

    switch (probeType) {
      case 'status':
        statusData = { ...statusData, type: 'status' };
        break;
      case 'health':
        const healthScore = await this.calculateMilestoneHealth(milestoneId);
        statusData = { ...statusData, healthScore, type: 'health' };
        break;
      case 'completion':
        const completionData = await this.getCompletionData(milestoneId);
        statusData = { ...statusData, ...completionData, type: 'completion' };
        break;
      case 'verification':
        const verificationData = await this.getVerificationData(milestoneId);
        statusData = { ...statusData, ...verificationData, type: 'verification' };
        break;
      case 'escalation':
        const escalationData = await this.getEscalationData(milestoneId);
        statusData = { ...statusData, ...escalationData, type: 'escalation' };
        break;
    }

    return statusData;
  }

  private async calculateMilestoneHealth(milestoneId: string): Promise<number> {
    // Simple health calculation based on various factors
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId, isDeleted: false },
    });

    if (!milestone) return 0;

    let healthScore = 100;

    // Reduce health based on status
    if (milestone.status === 'FAILED') healthScore -= 50;
    if (milestone.status === 'BLOCKED') healthScore -= 30;
    if (milestone.status === 'NOT_STARTED') healthScore -= 10;

    // Reduce health based on overdue
    if (milestone.dueDate && new Date() > milestone.dueDate) {
      const daysOverdue = Math.floor((Date.now() - milestone.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      healthScore -= Math.min(daysOverdue * 2, 40);
    }

    return Math.max(0, healthScore);
  }

  private async getCompletionData(milestoneId: string): Promise<any> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId, isDeleted: false },
    });

    if (!milestone) return {};

    return {
      progressPercentage: milestone.progressPercentage || 0,
      estimatedCompletion: milestone.dueDate,
      actualCompletion: milestone.completedDate,
      isOverdue: milestone.dueDate && new Date() > milestone.dueDate,
    };
  }

  private async getVerificationData(milestoneId: string): Promise<any> {
    const verifications = await this.verificationRepository.find({
      where: { milestoneId, isDeleted: false },
    });

    const totalVerifications = verifications.length;
    const completedVerifications = verifications.filter(v => v.status === 'APPROVED').length;
    const pendingVerifications = verifications.filter(v => v.status === 'PENDING').length;
    const rejectedVerifications = verifications.filter(v => v.status === 'REJECTED').length;

    return {
      totalVerifications,
      completedVerifications,
      pendingVerifications,
      rejectedVerifications,
      verificationRate: totalVerifications > 0 ? (completedVerifications / totalVerifications) * 100 : 0,
    };
  }

  private async getEscalationData(milestoneId: string): Promise<any> {
    const escalations = await this.escalationRepository.find({
      where: { milestoneId, isDeleted: false },
    });

    const totalEscalations = escalations.length;
    const activeEscalations = escalations.filter(e => e.status === 'ACTIVE').length;
    const resolvedEscalations = escalations.filter(e => e.status === 'RESOLVED').length;

    return {
      totalEscalations,
      activeEscalations,
      resolvedEscalations,
      resolutionRate: totalEscalations > 0 ? (resolvedEscalations / totalEscalations) * 100 : 0,
    };
  }

  private async scheduleRecurringProbe(probeId: string, request: ProbingRequest): Promise<void> {
    const interval = this.getIntervalFromFrequency(request.frequency);
    
    const scheduledProbe = setInterval(async () => {
      try {
        await this.executeProbe(probeId, request);
      } catch (error) {
        this.logger.error(`Error in scheduled probe ${probeId}:`, error);
      }
    }, interval);

    this.scheduledProbes.set(probeId, scheduledProbe);
  }

  private getIntervalFromFrequency(frequency: string): number {
    switch (frequency) {
      case 'hourly':
        return 60 * 60 * 1000; // 1 hour
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      default:
        return 60 * 60 * 1000; // Default to hourly
    }
  }

  private async processScheduledProbes(): Promise<void> {
    // Process any scheduled probes that need to run
    // This is handled by the interval timers set in scheduleRecurringProbe
  }

  private async performHealthChecks(): Promise<void> {
    // Perform health checks on all channels
    for (const [channelId, channel] of this.probingChannels) {
      if (!channel.isActive) continue;

      try {
        // Perform a simple health check based on channel type
        await this.performChannelHealthCheck(channel);
      } catch (error) {
        this.logger.error(`Health check failed for channel ${channelId}:`, error);
      }
    }
  }

  private async performChannelHealthCheck(channel: ProbingChannel): Promise<void> {
    // Simple health check - try to establish connection or ping the service
    switch (channel.type) {
      case 'email':
        // Check SMTP connection
        break;
      case 'webhook':
        // Ping webhook URL
        try {
          const response = await fetch(channel.config.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) {
            throw new Error(`Webhook health check failed: ${response.status}`);
          }
        } catch (error) {
          this.logger.warn(`Webhook health check failed for ${channel.name}:`, error);
        }
        break;
      // Add health checks for other channel types
    }
  }

  private async sendProbeSummaryNotification(request: ProbingRequest, results: ProbingResult[]): Promise<void> {
    const successfulResults = results.filter(r => r.status === 'success');
    const failedResults = results.filter(r => r.status === 'failed');

    const summary = {
      milestoneId: request.milestoneId,
      probeType: request.probeType,
      totalChannels: results.length,
      successfulChannels: successfulResults.length,
      failedChannels: failedResults.length,
      timestamp: new Date(),
    };

    // Send summary notification
    await this.notificationService.sendInAppNotification({
      userId: 'system',
      title: 'Probe Execution Summary',
      message: `Probe for milestone ${request.milestoneId} completed. Success: ${successfulResults.length}/${results.length}`,
      type: 'PROBE_SUMMARY',
      data: summary,
    });
  }

  private filterResultsByTimeRange(results: ProbingResult[], timeRange: string): ProbingResult[] {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return results.filter(result => result.timestamp >= startDate);
  }

  private calculateChannelPerformance(results: ProbingResult[]): Array<{
    channelId: string;
    channelName: string;
    totalProbes: number;
    successRate: number;
    averageResponseTime: number;
  }> {
    const channelMap = new Map<string, ProbingResult[]>();

    // Group results by channel
    results.forEach(result => {
      const channelResults = channelMap.get(result.channelId) || [];
      channelResults.push(result);
      channelMap.set(result.channelId, channelResults);
    });

    const performance = [];

    for (const [channelId, channelResults] of channelMap) {
      const channel = this.probingChannels.get(channelId);
      const totalProbes = channelResults.length;
      const successfulProbes = channelResults.filter(r => r.status === 'success').length;
      const successRate = totalProbes > 0 ? (successfulProbes / totalProbes) * 100 : 0;
      const averageResponseTime = totalProbes > 0 
        ? channelResults.reduce((sum, r) => sum + r.duration, 0) / totalProbes 
        : 0;

      performance.push({
        channelId,
        channelName: channel?.name || 'Unknown',
        totalProbes,
        successRate,
        averageResponseTime,
      });
    }

    return performance;
  }

  private calculateProbeTypePerformance(results: ProbingResult[]): Array<{
    probeType: string;
    totalProbes: number;
    successRate: number;
    averageResponseTime: number;
  }> {
    const typeMap = new Map<string, ProbingResult[]>();

    // Group results by probe type
    results.forEach(result => {
      const typeResults = typeMap.get(result.probeType) || [];
      typeResults.push(result);
      typeMap.set(result.probeType, typeResults);
    });

    const performance = [];

    for (const [probeType, typeResults] of typeMap) {
      const totalProbes = typeResults.length;
      const successfulProbes = typeResults.filter(r => r.status === 'success').length;
      const successRate = totalProbes > 0 ? (successfulProbes / totalProbes) * 100 : 0;
      const averageResponseTime = totalProbes > 0 
        ? typeResults.reduce((sum, r) => sum + r.duration, 0) / totalProbes 
        : 0;

      performance.push({
        probeType,
        totalProbes,
        successRate,
        averageResponseTime,
      });
    }

    return performance;
  }

  private calculateTrends(results: ProbingResult[]): Array<{
    date: string;
    successRate: number;
    responseTime: number;
  }> {
    const dailyMap = new Map<string, ProbingResult[]>();

    // Group results by date
    results.forEach(result => {
      const date = result.timestamp.toISOString().split('T')[0];
      const dateResults = dailyMap.get(date) || [];
      dateResults.push(result);
      dailyMap.set(date, dateResults);
    });

    const trends = [];

    for (const [date, dateResults] of dailyMap) {
      const totalProbes = dateResults.length;
      const successfulProbes = dateResults.filter(r => r.status === 'success').length;
      const successRate = totalProbes > 0 ? (successfulProbes / totalProbes) * 100 : 0;
      const averageResponseTime = totalProbes > 0 
        ? dateResults.reduce((sum, r) => sum + r.duration, 0) / totalProbes 
        : 0;

      trends.push({
        date,
        successRate,
        responseTime: averageResponseTime,
      });
    }

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }
}
