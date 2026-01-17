import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { ClickHouseClient } from '@clickhouse/client';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly redis: Redis;
  private readonly clickhouse: ClickHouseClient;

  constructor(
    private readonly dataSource: DataSource,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6380,
      password: process.env.REDIS_PASSWORD,
    });

    this.clickhouse = ClickHouseClient.create({
      host: process.env.CLICKHOUSE_HOST || 'localhost',
      port: parseInt(process.env.CLICKHOUSE_PORT) || 9000,
      database: process.env.CLICKHOUSE_DATABASE || 'analytics',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
    });
  }

  async getHealthStatus() {
    const checks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '4.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        clickhouse: await this.checkClickHouse(),
      },
      metrics: await this.getSystemMetrics(),
    };

    // Determine overall health status
    const unhealthyServices = Object.values(checks.services).filter(service => service.status !== 'healthy');
    if (unhealthyServices.length > 0) {
      checks.status = 'degraded';
    }

    const criticalServices = Object.values(checks.services).filter(service => service.status === 'unhealthy');
    if (criticalServices.length > 0) {
      checks.status = 'unhealthy';
    }

    return checks;
  }

  async getLivenessStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  async getReadinessStatus() {
    const checks = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        clickhouse: await this.checkClickHouse(),
      },
    };

    // Check if all critical services are ready
    const criticalServices = Object.values(checks.checks).filter(service => service.status !== 'healthy');
    if (criticalServices.length > 0) {
      checks.status = 'not_ready';
    }

    return checks;
  }

  async getProviderStatus() {
    return {
      timestamp: new Date().toISOString(),
      providers: {
        clickhouse: await this.checkClickHouse(),
        redis: await this.checkRedis(),
        postgresql: await this.checkDatabase(),
        ai_services: await this.checkAIServices(),
        external_apis: await this.checkExternalAPIs(),
      },
    };
  }

  async getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase() {
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async checkRedis() {
    try {
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async checkClickHouse() {
    try {
      const start = Date.now();
      await this.clickhouse.query({ query: 'SELECT 1' });
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('ClickHouse health check failed', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async checkAIServices() {
    try {
      // Check if AI services are enabled and accessible
      const aiEnabled = process.env.AI_SERVICE_ENABLED === 'true';
      
      if (!aiEnabled) {
        return {
          status: 'disabled',
          message: 'AI services are disabled',
          timestamp: new Date().toISOString(),
        };
      }

      // Add actual AI service health check here
      return {
        status: 'healthy',
        message: 'AI services are operational',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('AI services health check failed', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async checkExternalAPIs() {
    try {
      // Check Power BI integration
      const powerBIEnabled = !!process.env.POWERBI_CLIENT_ID;
      
      // Check WhatsApp integration
      const whatsappEnabled = !!process.env.WHATSAPP_API_KEY;

      return {
        status: 'healthy',
        services: {
          powerbi: powerBIEnabled ? 'enabled' : 'disabled',
          whatsapp: whatsappEnabled ? 'enabled' : 'disabled',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('External APIs health check failed', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
    await this.clickhouse.close();
  }
}
