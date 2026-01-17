import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(private configService: ConfigService) {}

  async performHealthCheck(): Promise<any> {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '3.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
      services: await this.checkServices(),
      metrics: this.getSystemMetrics(),
    };

    // Determine overall health status
    const unhealthyServices = Object.values(healthStatus.services).filter(
      (service: any) => service.status !== 'healthy'
    );

    if (unhealthyServices.length > 0) {
      healthStatus.status = 'degraded';
    }

    return healthStatus;
  }

  async performLivenessCheck(): Promise<any> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  async performReadinessCheck(): Promise<any> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      paymentGateways: await this.checkPaymentGateways(),
    };

    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');

    return {
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  async checkPaymentGateways(): Promise<any> {
    const gateways = {
      razorpay: await this.checkRazorpay(),
      payu: await this.checkPayU(),
      ccavenue: await this.checkCCAvenue(),
      upi: await this.checkUPI(),
    };

    return gateways;
  }

  async getSystemMetrics(): Promise<any> {
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
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null,
      platform: process.platform,
      nodeVersion: process.version,
    };
  }

  private async checkServices(): Promise<any> {
    return {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      paymentGateways: await this.checkPaymentGateways(),
      queue: await this.checkQueue(),
      externalApis: await this.checkExternalAPIs(),
    };
  }

  private async checkDatabase(): Promise<any> {
    try {
      // This would be implemented with actual database connection check
      // For now, simulate a healthy database connection
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          host: this.configService.get('DB_HOST', 'localhost'),
          port: this.configService.get('DB_PORT', '5434'),
          database: this.configService.get('DB_DATABASE', 'payment_db'),
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<any> {
    try {
      // This would be implemented with actual Redis connection check
      // For now, simulate a healthy Redis connection
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          host: this.configService.get('REDIS_HOST', 'localhost'),
          port: this.configService.get('REDIS_PORT', '6379'),
        },
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkQueue(): Promise<any> {
    try {
      // This would be implemented with actual BullMQ queue check
      // For now, simulate a healthy queue system
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          activeJobs: 0,
          waitingJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
        },
      };
    } catch (error) {
      this.logger.error('Queue health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkExternalAPIs(): Promise<any> {
    const apis = {
      deepseek: await this.checkDeepSeekAPI(),
      accounting: await this.checkAccountingAPIs(),
    };

    return apis;
  }

  private async checkRazorpay(): Promise<any> {
    try {
      const apiKey = this.configService.get('RAZORPAY_KEY_ID');
      if (!apiKey) {
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'API key not configured',
        };
      }

      // Simulate API health check
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          configured: true,
          testMode: apiKey.startsWith('rzp_test_'),
        },
      };
    } catch (error) {
      this.logger.error('Razorpay health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkPayU(): Promise<any> {
    try {
      const merchantKey = this.configService.get('PAYU_MERCHANT_KEY');
      if (!merchantKey) {
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Merchant key not configured',
        };
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          configured: true,
          testMode: merchantKey.includes('test'),
        },
      };
    } catch (error) {
      this.logger.error('PayU health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkCCAvenue(): Promise<any> {
    try {
      const merchantId = this.configService.get('CCAVENUE_MERCHANT_ID');
      if (!merchantId) {
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Merchant ID not configured',
        };
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          configured: true,
          testMode: merchantId.includes('test'),
        },
      };
    } catch (error) {
      this.logger.error('CCAvenue health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkUPI(): Promise<any> {
    try {
      const apiKey = this.configService.get('UPI_PROVIDER_API_KEY');
      if (!apiKey) {
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'UPI provider API key not configured',
        };
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          configured: true,
        },
      };
    } catch (error) {
      this.logger.error('UPI health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkDeepSeekAPI(): Promise<any> {
    try {
      // This would be implemented with actual DeepSeek API check
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          configured: true,
        },
      };
    } catch (error) {
      this.logger.error('DeepSeek API health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkAccountingAPIs(): Promise<any> {
    const accounting = {
      zoho: await this.checkZohoAPI(),
      busy: await this.checkBusyAPI(),
      quickbooks: await this.checkQuickBooksAPI(),
      marg: await this.checkMargAPI(),
    };

    return accounting;
  }

  private async checkZohoAPI(): Promise<any> {
    try {
      const clientId = this.configService.get('ZOHO_CLIENT_ID');
      return {
        status: clientId ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          configured: !!clientId,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkBusyAPI(): Promise<any> {
    try {
      const dbHost = this.configService.get('BUSY_DATABASE_HOST');
      return {
        status: dbHost ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          configured: !!dbHost,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkQuickBooksAPI(): Promise<any> {
    try {
      const clientId = this.configService.get('QUICKBOOKS_CLIENT_ID');
      return {
        status: clientId ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          configured: !!clientId,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkMargAPI(): Promise<any> {
    try {
      const apiKey = this.configService.get('MARG_API_KEY');
      return {
        status: apiKey ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          configured: !!apiKey,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}
