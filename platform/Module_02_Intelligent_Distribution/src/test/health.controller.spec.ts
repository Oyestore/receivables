import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../controllers/health.controller';
import { HealthCheckService } from '../services/health-check.service';
import { DistributionService } from '../services/distribution.service';
import { EmailService } from '../services/email.service';
import { SMSService } from '../services/sms.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { DistributionOrchestratorService } from '../services/distribution-orchestrator.service';
import { DistributionQueueService } from '../services/distribution-queue.service';
import { DynamicPricingService } from '../services/dynamic-pricing.service';
import { SMBMetricsService } from '../services/smb-metrics.service';
import { HttpStatus } from '@nestjs/common';

describe('HealthController - Complete Tests', () => {
  let controller: HealthController;
  let healthService: HealthCheckService;
  let distributionService: DistributionService;
  let emailService: EmailService;
  let smsService: SMSService;
  let whatsappService: WhatsAppService;
  let orchestratorService: DistributionOrchestratorService;
  let queueService: DistributionQueueService;
  let pricingService: DynamicPricingService;
  let metricsService: SMBMetricsService;

  const mockHealthStatus = {
    status: 'healthy',
    timestamp: new Date(),
    uptime: 3600,
    version: '1.0.0',
    environment: 'production',
    services: {
      database: { status: 'healthy', responseTime: 50 },
      email: { status: 'healthy', responseTime: 200 },
      sms: { status: 'healthy', responseTime: 150 },
      whatsapp: { status: 'degraded', responseTime: 500 },
      queue: { status: 'healthy', responseTime: 25 },
    },
    metrics: {
      totalDistributions: 10000,
      successRate: 0.95,
      averageResponseTime: 250,
      activeConnections: 150,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            getHealthStatus: jest.fn(),
            checkServiceHealth: jest.fn(),
            getSystemMetrics: jest.fn(),
            getDetailedHealthReport: jest.fn(),
            performHealthCheck: jest.fn(),
            getServiceDependencies: jest.fn(),
            getPerformanceMetrics: jest.fn(),
          },
        },
        {
          provide: DistributionService,
          useValue: {
            healthCheck: jest.fn(),
            getServiceStatus: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            healthCheck: jest.fn(),
            testConnection: jest.fn(),
          },
        },
        {
          provide: SMSService,
          useValue: {
            healthCheck: jest.fn(),
            testConnection: jest.fn(),
          },
        },
        {
          provide: WhatsAppService,
          useValue: {
            healthCheck: jest.fn(),
            testConnection: jest.fn(),
          },
        },
        {
          provide: DistributionOrchestratorService,
          useValue: {
            healthCheck: jest.fn(),
            getOrchestrationMetrics: jest.fn(),
          },
        },
        {
          provide: DistributionQueueService,
          useValue: {
            healthCheck: jest.fn(),
            getQueueMetrics: jest.fn(),
          },
        },
        {
          provide: DynamicPricingService,
          useValue: {
            healthCheck: jest.fn(),
            getPricingHealth: jest.fn(),
          },
        },
        {
          provide: SMBMetricsService,
          useValue: {
            healthCheck: jest.fn(),
            getMetricsHealth: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthCheckService>(HealthCheckService);
    distributionService = module.get<DistributionService>(DistributionService);
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SMSService>(SMSService);
    whatsappService = module.get<WhatsAppService>(WhatsAppService);
    orchestratorService = module.get<DistributionOrchestratorService>(DistributionOrchestratorService);
    queueService = module.get<DistributionQueueService>(DistributionQueueService);
    pricingService = module.get<DynamicPricingService>(DynamicPricingService);
    metricsService = module.get<SMBMetricsService>(SMBMetricsService);
  });

  describe('Basic Health Checks', () => {
    it('should return overall health status', async () => {
      jest.spyOn(healthService, 'getHealthStatus').mockResolvedValue(mockHealthStatus);

      const result = await controller.getHealthStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHealthStatus);
      expect(result.data.status).toBe('healthy');
    });

    it('should handle unhealthy status gracefully', async () => {
      const unhealthyStatus = {
        ...mockHealthStatus,
        status: 'unhealthy',
        services: {
          database: { status: 'unhealthy', responseTime: 5000 },
          email: { status: 'unhealthy', responseTime: 5000 },
        },
      };

      jest.spyOn(healthService, 'getHealthStatus').mockResolvedValue(unhealthyStatus);

      const result = await controller.getHealthStatus();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('unhealthy');
    });

    it('should return service-specific health status', async () => {
      const serviceHealth = {
        service: 'email',
        status: 'healthy',
        responseTime: 200,
        lastCheck: new Date(),
        details: {
          provider: 'SendGrid',
          successRate: 0.98,
          errorCount: 2,
        },
      };

      jest.spyOn(healthService, 'checkServiceHealth').mockResolvedValue(serviceHealth);

      const result = await controller.getServiceHealth('email');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(serviceHealth);
      expect(result.data.service).toBe('email');
    });
  });

  describe('Detailed Health Reports', () => {
    it('should return detailed health report', async () => {
      const detailedReport = {
        overall: {
          status: 'healthy',
          score: 95,
          timestamp: new Date(),
        },
        services: [
          {
            name: 'database',
            status: 'healthy',
            score: 100,
            responseTime: 50,
            uptime: '99.9%',
            details: {},
          },
          {
            name: 'email',
            status: 'healthy',
            score: 90,
            responseTime: 200,
            uptime: '99.5%',
            details: {},
          },
        ],
        dependencies: {
          external: [
            { name: 'SendGrid API', status: 'healthy', responseTime: 150 },
            { name: 'Twilio API', status: 'healthy', responseTime: 100 },
          ],
          internal: [
            { name: 'Database', status: 'healthy', responseTime: 50 },
            { name: 'Redis Cache', status: 'healthy', responseTime: 10 },
          ],
        },
        performance: {
          averageResponseTime: 250,
          throughput: 1000,
          errorRate: 0.02,
          memoryUsage: 0.65,
          cpuUsage: 0.45,
        },
      };

      jest.spyOn(healthService, 'getDetailedHealthReport').mockResolvedValue(detailedReport);

      const result = await controller.getDetailedHealthReport();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(detailedReport);
      expect(result.data.overall.score).toBe(95);
      expect(result.data.services).toHaveLength(2);
    });

    it('should include performance metrics in detailed report', async () => {
      const performanceMetrics = {
        responseTime: {
          average: 250,
          p50: 200,
          p95: 500,
          p99: 1000,
        },
        throughput: {
          requestsPerSecond: 1000,
          peakRPS: 1500,
        },
        errors: {
          rate: 0.02,
          total: 200,
          recent: 5,
        },
        resources: {
          memoryUsage: 0.65,
          cpuUsage: 0.45,
          diskUsage: 0.30,
        },
      };

      jest.spyOn(healthService, 'getPerformanceMetrics').mockResolvedValue(performanceMetrics);

      const result = await controller.getPerformanceMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(performanceMetrics);
      expect(result.data.responseTime.average).toBe(250);
    });
  });

  describe('Service Dependencies', () => {
    it('should return service dependencies', async () => {
      const dependencies = {
        external: [
          {
            name: 'SendGrid API',
            status: 'healthy',
            responseTime: 150,
            lastCheck: new Date(),
            endpoint: 'https://api.sendgrid.com',
            timeout: 5000,
          },
          {
            name: 'Twilio API',
            status: 'healthy',
            responseTime: 100,
            lastCheck: new Date(),
            endpoint: 'https://api.twilio.com',
            timeout: 3000,
          },
        ],
        internal: [
          {
            name: 'Database',
            status: 'healthy',
            responseTime: 50,
            lastCheck: new Date(),
            connectionPool: { active: 10, idle: 20, total: 30 },
          },
          {
            name: 'Redis Cache',
            status: 'healthy',
            responseTime: 10,
            lastCheck: new Date(),
            memoryUsage: '256MB',
          },
        ],
      };

      jest.spyOn(healthService, 'getServiceDependencies').mockResolvedValue(dependencies);

      const result = await controller.getServiceDependencies();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(dependencies);
      expect(result.data.external).toHaveLength(2);
      expect(result.data.internal).toHaveLength(2);
    });

    it('should handle dependency failures', async () => {
      const failedDependencies = {
        external: [
          {
            name: 'SendGrid API',
            status: 'unhealthy',
            responseTime: 5000,
            lastCheck: new Date(),
            error: 'Connection timeout',
          },
        ],
        internal: [
          {
            name: 'Database',
            status: 'degraded',
            responseTime: 500,
            lastCheck: new Date(),
            warning: 'High response time',
          },
        ],
      };

      jest.spyOn(healthService, 'getServiceDependencies').mockResolvedValue(failedDependencies);

      const result = await controller.getServiceDependencies();

      expect(result.success).toBe(true);
      expect(result.data.external[0].status).toBe('unhealthy');
      expect(result.data.internal[0].status).toBe('degraded');
    });
  });

  describe('Individual Service Health Checks', () => {
    it('should check distribution service health', async () => {
      const distributionHealth = {
        status: 'healthy',
        responseTime: 100,
        activeRules: 25,
        pendingAssignments: 10,
        lastProcessedAt: new Date(),
      };

      jest.spyOn(distributionService, 'healthCheck').mockResolvedValue(distributionHealth);

      const result = await controller.checkDistributionServiceHealth();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(distributionHealth);
    });

    it('should check email service health', async () => {
      const emailHealth = {
        status: 'healthy',
        provider: 'SendGrid',
        responseTime: 200,
        dailyLimit: { used: 5000, limit: 10000 },
        lastEmailSent: new Date(),
        errorCount: 2,
      };

      jest.spyOn(emailService, 'healthCheck').mockResolvedValue(emailHealth);

      const result = await controller.checkEmailServiceHealth();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(emailHealth);
      expect(result.data.provider).toBe('SendGrid');
    });

    it('should check SMS service health', async () => {
      const smsHealth = {
        status: 'healthy',
        provider: 'Twilio',
        responseTime: 150,
        dailyLimit: { used: 1000, limit: 5000 },
        lastSMSSent: new Date(),
        errorCount: 1,
      };

      jest.spyOn(smsService, 'healthCheck').mockResolvedValue(smsHealth);

      const result = await controller.checkSMSServiceHealth();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(smsHealth);
      expect(result.data.provider).toBe('Twilio');
    });

    it('should check WhatsApp service health', async () => {
      const whatsappHealth = {
        status: 'degraded',
        provider: 'Meta WhatsApp',
        responseTime: 500,
        dailyLimit: { used: 800, limit: 1000 },
        lastMessageSent: new Date(),
        errorCount: 5,
        warning: 'Approaching daily limit',
      };

      jest.spyOn(whatsappService, 'healthCheck').mockResolvedValue(whatsappHealth);

      const result = await controller.checkWhatsAppServiceHealth();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(whatsappHealth);
      expect(result.data.status).toBe('degraded');
    });

    it('should check orchestrator service health', async () => {
      const orchestratorHealth = {
        status: 'healthy',
        activeOrchestrations: 5,
        completedToday: 150,
        averageProcessingTime: 300,
        queueSize: 25,
        lastProcessedAt: new Date(),
      };

      jest.spyOn(orchestratorService, 'healthCheck').mockResolvedValue(orchestratorHealth);

      const result = await controller.checkOrchestratorServiceHealth();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(orchestratorHealth);
      expect(result.data.activeOrchestrations).toBe(5);
    });

    it('should check queue service health', async () => {
      const queueHealth = {
        status: 'healthy',
        queueSize: 100,
        processingRate: 50,
        averageWaitTime: 30,
        failedJobs: 2,
        lastProcessedAt: new Date(),
      };

      jest.spyOn(queueService, 'healthCheck').mockResolvedValue(queueHealth);

      const result = await controller.checkQueueServiceHealth();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(queueHealth);
      expect(result.data.queueSize).toBe(100);
    });

    it('should check pricing service health', async () => {
      const pricingHealth = {
        status: 'healthy',
        lastCalculation: new Date(),
        calculationTime: 50,
        activeStrategies: 10,
        errorRate: 0.01,
        cacheHitRate: 0.85,
      };

      jest.spyOn(pricingService, 'healthCheck').mockResolvedValue(pricingHealth);

      const result = await controller.checkPricingServiceHealth();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(pricingHealth);
      expect(result.data.cacheHitRate).toBe(0.85);
    });

    it('should check metrics service health', async () => {
      const metricsHealth = {
        status: 'healthy',
        lastReport: new Date(),
        reportGenerationTime: 200,
        dataPoints: 1000000,
        cacheSize: '500MB',
        errorRate: 0.005,
      };

      jest.spyOn(metricsService, 'healthCheck').mockResolvedValue(metricsHealth);

      const result = await controller.checkMetricsServiceHealth();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(metricsHealth);
      expect(result.data.dataPoints).toBe(1000000);
    });
  });

  describe('Connection Tests', () => {
    it('should test email service connection', async () => {
      const connectionTest = {
        success: true,
        provider: 'SendGrid',
        responseTime: 200,
        testEmail: 'test@example.com',
        messageId: 'test-msg-123',
        timestamp: new Date(),
      };

      jest.spyOn(emailService, 'testConnection').mockResolvedValue(connectionTest);

      const result = await controller.testEmailConnection();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(connectionTest);
      expect(result.data.success).toBe(true);
    });

    it('should test SMS service connection', async () => {
      const connectionTest = {
        success: true,
        provider: 'Twilio',
        responseTime: 150,
        testPhone: '+1234567890',
        messageId: 'sms-test-123',
        timestamp: new Date(),
      };

      jest.spyOn(smsService, 'testConnection').mockResolvedValue(connectionTest);

      const result = await controller.testSMSConnection();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(connectionTest);
      expect(result.data.provider).toBe('Twilio');
    });

    it('should test WhatsApp service connection', async () => {
      const connectionTest = {
        success: true,
        provider: 'Meta WhatsApp',
        responseTime: 300,
        testPhone: '+1234567890',
        messageId: 'wa-test-123',
        timestamp: new Date(),
      };

      jest.spyOn(whatsappService, 'testConnection').mockResolvedValue(connectionTest);

      const result = await controller.testWhatsAppConnection();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(connectionTest);
    });

    it('should handle connection test failures', async () => {
      const failedTest = {
        success: false,
        provider: 'SendGrid',
        error: 'API key invalid',
        responseTime: 5000,
        timestamp: new Date(),
      };

      jest.spyOn(emailService, 'testConnection').mockResolvedValue(failedTest);

      const result = await controller.testEmailConnection();

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.error).toContain('API key invalid');
    });
  });

  describe('System Metrics', () => {
    it('should return system metrics', async () => {
      const systemMetrics = {
        timestamp: new Date(),
        uptime: 86400,
        version: '1.0.0',
        environment: 'production',
        nodeVersion: '18.17.0',
        platform: 'linux',
        memory: {
          used: '512MB',
          total: '2GB',
          percentage: 25,
        },
        cpu: {
          usage: 0.45,
          cores: 4,
        },
        disk: {
          used: '10GB',
          total: '100GB',
          percentage: 10,
        },
        network: {
          requests: 10000,
          bandwidth: '1GB',
        },
      };

      jest.spyOn(healthService, 'getSystemMetrics').mockResolvedValue(systemMetrics);

      const result = await controller.getSystemMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(systemMetrics);
      expect(result.data.uptime).toBe(86400);
    });

    it('should return application metrics', async () => {
      const appMetrics = {
        timestamp: new Date(),
        distributions: {
          total: 10000,
          today: 500,
          successRate: 0.95,
          averageTime: 250,
        },
        users: {
          active: 150,
          total: 1000,
          newToday: 5,
        },
        performance: {
          averageResponseTime: 200,
          requestsPerSecond: 50,
          errorRate: 0.02,
        },
        resources: {
          activeConnections: 150,
          queueSize: 100,
          cacheHitRate: 0.85,
        },
      };

      jest.spyOn(healthService, 'getSystemMetrics').mockResolvedValue(appMetrics);

      const result = await controller.getApplicationMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(appMetrics);
      expect(result.data.distributions.total).toBe(10000);
    });
  });

  describe('Health Check Actions', () => {
    it('should perform comprehensive health check', async () => {
      const healthCheckResult = {
        checkId: 'check-123',
        timestamp: new Date(),
        duration: 5000,
        overall: {
          status: 'healthy',
          score: 92,
        },
        services: [
          {
            name: 'database',
            status: 'healthy',
            score: 100,
            duration: 50,
          },
          {
            name: 'email',
            status: 'healthy',
            score: 85,
            duration: 200,
          },
        ],
        recommendations: [
          {
            priority: 'low',
            action: 'Monitor WhatsApp service response time',
            reason: 'Response time above threshold',
          },
        ],
      };

      jest.spyOn(healthService, 'performHealthCheck').mockResolvedValue(healthCheckResult);

      const result = await controller.performHealthCheck({ comprehensive: true });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(healthCheckResult);
      expect(result.data.overall.score).toBe(92);
    });

    it('should perform targeted health check', async () => {
      const targetedCheck = {
        checkId: 'check-456',
        timestamp: new Date(),
        duration: 1000,
        services: ['email', 'sms'],
        results: [
          {
            name: 'email',
            status: 'healthy',
            score: 90,
            duration: 200,
          },
          {
            name: 'sms',
            status: 'healthy',
            score: 95,
            duration: 150,
          },
        ],
      };

      jest.spyOn(healthService, 'performHealthCheck').mockResolvedValue(targetedCheck);

      const result = await controller.performHealthCheck({ services: ['email', 'sms'] });

      expect(result.success).toBe(true);
      expect(result.data.services).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle health service failure gracefully', async () => {
      const error = new Error('Health check service unavailable');
      jest.spyOn(healthService, 'getHealthStatus').mockRejectedValue(error);

      const result = await controller.getHealthStatus();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Health check service unavailable');
    });

    it('should handle timeout during health check', async () => {
      const timeoutError = new Error('Request timeout');
      jest.spyOn(healthService, 'checkServiceHealth').mockRejectedValue(timeoutError);

      const result = await controller.getServiceHealth('database');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Request timeout');
    });

    it('should handle invalid service name', async () => {
      const error = new Error('Invalid service name');
      jest.spyOn(healthService, 'checkServiceHealth').mockRejectedValue(error);

      const result = await controller.getServiceHealth('invalid-service');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid service name');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent health check requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () =>
        controller.getHealthStatus()
      );

      jest.spyOn(healthService, 'getHealthStatus').mockResolvedValue(mockHealthStatus);

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(results.every(result => result.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle detailed health report efficiently', async () => {
      const detailedReport = {
        overall: { status: 'healthy', score: 95 },
        services: Array.from({ length: 20 }, (_, i) => ({
          name: `service-${i}`,
          status: 'healthy',
          score: 90 + i,
        })),
        dependencies: { external: [], internal: [] },
        performance: {},
      };

      jest.spyOn(healthService, 'getDetailedHealthReport').mockResolvedValue(detailedReport);

      const startTime = Date.now();
      const result = await controller.getDetailedHealthReport();
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data.services).toHaveLength(20);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Integration Tests', () => {
    it('should integrate all services for comprehensive health check', async () => {
      // Mock all service health checks
      jest.spyOn(distributionService, 'healthCheck').mockResolvedValue({ status: 'healthy' });
      jest.spyOn(emailService, 'healthCheck').mockResolvedValue({ status: 'healthy' });
      jest.spyOn(smsService, 'healthCheck').mockResolvedValue({ status: 'healthy' });
      jest.spyOn(whatsappService, 'healthCheck').mockResolvedValue({ status: 'healthy' });
      jest.spyOn(orchestratorService, 'healthCheck').mockResolvedValue({ status: 'healthy' });
      jest.spyOn(queueService, 'healthCheck').mockResolvedValue({ status: 'healthy' });
      jest.spyOn(pricingService, 'healthCheck').mockResolvedValue({ status: 'healthy' });
      jest.spyOn(metricsService, 'healthCheck').mockResolvedValue({ status: 'healthy' });

      const comprehensiveCheck = {
        overall: { status: 'healthy', score: 100 },
        services: [
          { name: 'distribution', status: 'healthy' },
          { name: 'email', status: 'healthy' },
          { name: 'sms', status: 'healthy' },
        ],
        timestamp: new Date(),
      };

      jest.spyOn(healthService, 'performHealthCheck').mockResolvedValue(comprehensiveCheck);

      const result = await controller.performHealthCheck({ comprehensive: true });

      expect(result.success).toBe(true);
      expect(result.data.overall.score).toBe(100);
    });
  });
});
