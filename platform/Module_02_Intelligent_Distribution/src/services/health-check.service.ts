import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributionRule } from '../entities/distribution-rule.entity';
import { DistributionAssignment } from '../entities/distribution-entities';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
      error?: string;
    };
    email: {
      status: 'available' | 'unavailable';
      providers: {
        sendgrid: 'available' | 'unavailable';
        ses: 'available' | 'unavailable';
        mailgun: 'available' | 'unavailable';
      };
    };
    sms: {
      status: 'available' | 'unavailable';
      providers: {
        twilio: 'available' | 'unavailable';
        sns: 'available' | 'unavailable';
        plivo: 'available' | 'unavailable';
      };
    };
    whatsapp: {
      status: 'available' | 'unavailable';
      error?: string;
    };
    queue: {
      status: 'connected' | 'disconnected';
      activeJobs: number;
      failedJobs: number;
      completedJobs: number;
    };
  };
  metrics: {
    totalRules: number;
    activeRules: number;
    totalAssignments: number;
    pendingAssignments: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    cpuUsage: number;
  };
}

@Injectable()
export class HealthCheckService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(DistributionRule)
    private readonly distributionRuleRepository: Repository<DistributionRule>,
    @InjectRepository(DistributionAssignment)
    private readonly distributionAssignmentRepository: Repository<DistributionAssignment>,
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const [
      databaseStatus,
      redisStatus,
      emailStatus,
      smsStatus,
      whatsappStatus,
      queueStatus,
      metrics,
    ] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkEmailProviders(),
      this.checkSMSProviders(),
      this.checkWhatsApp(),
      this.checkQueue(),
      this.getMetrics(),
    ]);

    const overallStatus = this.determineOverallStatus([
      databaseStatus,
      redisStatus,
      emailStatus,
      smsStatus,
      whatsappStatus,
      queueStatus,
    ]);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '2.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
      services: {
        database: this.getServiceStatus(databaseStatus),
        redis: this.getServiceStatus(redisStatus),
        email: emailStatus.status === 'fulfilled' ? emailStatus.value : { status: 'unavailable', providers: { sendgrid: 'unavailable', ses: 'unavailable', mailgun: 'unavailable' } },
        sms: smsStatus.status === 'fulfilled' ? smsStatus.value : { status: 'unavailable', providers: { twilio: 'unavailable', sns: 'unavailable', plivo: 'unavailable' } },
        whatsapp: this.getServiceStatus(whatsappStatus),
        queue: queueStatus.status === 'fulfilled' ? queueStatus.value : { status: 'disconnected', activeJobs: 0, failedJobs: 0, completedJobs: 0 },
      },
      metrics: {
        totalRules: metrics.status === 'fulfilled' ? metrics.value.totalRules : 0,
        activeRules: metrics.status === 'fulfilled' ? metrics.value.activeRules : 0,
        totalAssignments: metrics.status === 'fulfilled' ? metrics.value.totalAssignments : 0,
        pendingAssignments: metrics.status === 'fulfilled' ? metrics.value.pendingAssignments : 0,
        memoryUsage: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
        cpuUsage: (cpuUsage.user / cpuUsage.system) * 100 || 0,
      },
    };
  }

  private async checkDatabase(): Promise<{ status: 'connected'; responseTime: number }> {
    const startTime = Date.now();
    try {
      await this.distributionRuleRepository.query('SELECT 1');
      return {
        status: 'connected',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  private async checkRedis(): Promise<{ status: 'connected'; responseTime: number }> {
    const startTime = Date.now();
    try {
      // This would typically use a Redis client
      // For now, we'll simulate the check
      await new Promise(resolve => setTimeout(resolve, 10));
      return {
        status: 'connected',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Redis connection failed: ${error.message}`);
    }
  }

  private async checkEmailProviders(): Promise<{
    status: 'available';
    providers: {
      sendgrid: 'available' | 'unavailable';
      ses: 'available' | 'unavailable';
      mailgun: 'available' | 'unavailable';
    };
  }> {
    const providers = {
      sendgrid: await this.checkSendGrid(),
      ses: await this.checkSES(),
      mailgun: await this.checkMailgun(),
    };

    return {
      status: 'available',
      providers,
    };
  }

  private async checkSMSProviders(): Promise<{
    status: 'available';
    providers: {
      twilio: 'available' | 'unavailable';
      sns: 'available' | 'unavailable';
      plivo: 'available' | 'unavailable';
    };
  }> {
    const providers = {
      twilio: await this.checkTwilio(),
      sns: await this.checkSNS(),
      plivo: await this.checkPlivo(),
    };

    return {
      status: 'available',
      providers,
    };
  }

  private async checkWhatsApp(): Promise<{ status: 'available'; responseTime: number }> {
    const startTime = Date.now();
    try {
      const accessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN');
      if (!accessToken) {
        throw new Error('WhatsApp access token not configured');
      }
      
      // Simulate API check
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        status: 'available',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`WhatsApp service unavailable: ${error.message}`);
    }
  }

  private async checkQueue(): Promise<{
    status: 'connected';
    activeJobs: number;
    failedJobs: number;
    completedJobs: number;
  }> {
    try {
      // This would typically check BullMQ queue status
      // For now, we'll simulate the check
      return {
        status: 'connected',
        activeJobs: 5,
        failedJobs: 2,
        completedJobs: 150,
      };
    } catch (error) {
      throw new Error(`Queue connection failed: ${error.message}`);
    }
  }

  private async getMetrics(): Promise<{
    totalRules: number;
    activeRules: number;
    totalAssignments: number;
    pendingAssignments: number;
  }> {
    try {
      const totalRules = await this.distributionRuleRepository.count();
      const activeRules = await this.distributionRuleRepository.count({ where: { isActive: true } });
      const totalAssignments = await this.distributionAssignmentRepository.count();
      const pendingAssignments = await this.distributionAssignmentRepository.count({
        where: { distributionStatus: 'PENDING' },
      });

      return {
        totalRules,
        activeRules,
        totalAssignments,
        pendingAssignments,
      };
    } catch (error) {
      throw new Error(`Failed to get metrics: ${error.message}`);
    }
  }

  private getServiceStatus(result: PromiseSettledResult<any>): any {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'disconnected',
        error: result.reason.message,
      };
    }
  }

  private determineOverallStatus(results: PromiseSettledResult<any>[]): 'healthy' | 'unhealthy' {
    const failedServices = results.filter(result => result.status === 'rejected');
    return failedServices.length === 0 ? 'healthy' : 'unhealthy';
  }

  // Provider-specific health checks
  private async checkSendGrid(): Promise<'available' | 'unavailable'> {
    try {
      const apiKey = this.configService.get('SENDGRID_API_KEY');
      return apiKey ? 'available' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  private async checkSES(): Promise<'available' | 'unavailable'> {
    try {
      const accessKey = this.configService.get('AWS_SES_ACCESS_KEY');
      const secretKey = this.configService.get('AWS_SES_SECRET_KEY');
      return accessKey && secretKey ? 'available' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  private async checkMailgun(): Promise<'available' | 'unavailable'> {
    try {
      const apiKey = this.configService.get('MAILGUN_API_KEY');
      return apiKey ? 'available' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  private async checkTwilio(): Promise<'available' | 'unavailable'> {
    try {
      const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
      const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
      return accountSid && authToken ? 'available' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  private async checkSNS(): Promise<'available' | 'unavailable'> {
    try {
      const accessKey = this.configService.get('AWS_SNS_ACCESS_KEY');
      const secretKey = this.configService.get('AWS_SNS_SECRET_KEY');
      return accessKey && secretKey ? 'available' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  private async checkPlivo(): Promise<'available' | 'unavailable'> {
    try {
      const authId = this.configService.get('PLIVO_AUTH_ID');
      const authToken = this.configService.get('PLIVO_AUTH_TOKEN');
      return authId && authToken ? 'available' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  async checkLiveness(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness(): Promise<{ status: string; timestamp: string; checks: any }> {
    const checks = {
      database: await this.checkDatabase().catch(() => ({ status: 'disconnected' })),
      redis: await this.checkRedis().catch(() => ({ status: 'disconnected' })),
      queue: await this.checkQueue().catch(() => ({ status: 'disconnected', activeJobs: 0, failedJobs: 0, completedJobs: 0 })),
    };

    const allReady = Object.values(checks).every(check => check.status === 'connected');

    return {
      status: allReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
