import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../invoice.entity';

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
    deepseek: {
      status: 'available' | 'unavailable';
      responseTime?: number;
      error?: string;
    };
  };
  metrics: {
    totalInvoices: number;
    activeTemplates: number;
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
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const [
      databaseStatus,
      redisStatus,
      deepseekStatus,
      metrics,
    ] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDeepSeek(),
      this.getMetrics(),
    ]);

    const overallStatus = this.determineOverallStatus([
      databaseStatus,
      redisStatus,
      deepseekStatus,
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
        deepseek: this.getServiceStatus(deepseekStatus),
      },
      metrics: {
        totalInvoices: metrics.status === 'fulfilled' ? metrics.value.totalInvoices : 0,
        activeTemplates: metrics.status === 'fulfilled' ? metrics.value.activeTemplates : 0,
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
      await this.invoiceRepository.query('SELECT 1');
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

  private async checkDeepSeek(): Promise<{ status: 'available'; responseTime: number }> {
    const startTime = Date.now();
    try {
      // This would typically make a real API call to DeepSeek
      // For now, we'll simulate the check
      const apiKey = this.configService.get('OPENROUTER_API_KEY');
      if (!apiKey) {
        throw new Error('OpenRouter API key not configured');
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        status: 'available',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`DeepSeek service unavailable: ${error.message}`);
    }
  }

  private async getMetrics(): Promise<{ totalInvoices: number; activeTemplates: number }> {
    try {
      const totalInvoices = await this.invoiceRepository.count();
      // This would typically query templates table
      const activeTemplates = 5; // Mock value
      
      return {
        totalInvoices,
        activeTemplates,
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
      deepseek: await this.checkDeepSeek().catch(() => ({ status: 'unavailable' })),
    };

    const allReady = Object.values(checks).every(check => check.status === 'connected' || check.status === 'available');

    return {
      status: allReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
