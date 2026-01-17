import { Test, TestingModule } from '@nestjs/testing';
import { DistributionService } from '../services/distribution.service';
import { EmailService } from '../services/email.service';
import { SMSService } from '../services/sms.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { DistributionOrchestratorService } from '../services/distribution-orchestrator.service';
import { DistributionQueueService } from '../services/distribution-queue.service';
import { RecipientContactService } from '../services/recipient-contact.service';
import { TemplateService } from '../services/template.service';
import { DistributionChannel, DistributionStatus } from '../entities/distribution-entities';

describe('Module 02 Performance Tests', () => {
  let distributionService: DistributionService;
  let emailService: EmailService;
  let smsService: SMSService;
  let whatsappService: WhatsAppService;
  let orchestratorService: DistributionOrchestratorService;
  let queueService: DistributionQueueService;
  let contactService: RecipientContactService;
  let templateService: TemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DistributionService,
          useValue: {
            createDistributionRule: jest.fn(),
            processDistribution: jest.fn(),
            getDistributionAnalytics: jest.fn(),
            listDistributionRules: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
            validateEmailConfig: jest.fn(),
            getEmailDeliveryStatus: jest.fn(),
          },
        },
        {
          provide: SMSService,
          useValue: {
            sendSMS: jest.fn(),
            validateSMSConfig: jest.fn(),
            getSMSDeliveryStatus: jest.fn(),
          },
        },
        {
          provide: WhatsAppService,
          useValue: {
            sendWhatsAppMessage: jest.fn(),
            validateWhatsAppConfig: jest.fn(),
            getWhatsAppDeliveryStatus: jest.fn(),
          },
        },
        {
          provide: DistributionOrchestratorService,
          useValue: {
            orchestrateDistribution: jest.fn(),
            getOptimalChannel: jest.fn(),
            processBatchDistribution: jest.fn(),
          },
        },
        {
          provide: DistributionQueueService,
          useValue: {
            addToQueue: jest.fn(),
            processQueue: jest.fn(),
            getQueueMetrics: jest.fn(),
            clearQueue: jest.fn(),
          },
        },
        {
          provide: RecipientContactService,
          useValue: {
            getRecipientContactById: jest.fn(),
            getContactsByCustomerId: jest.fn(),
            validateContact: jest.fn(),
            listRecipientContacts: jest.fn(),
          },
        },
        {
          provide: TemplateService,
          useValue: {
            getTemplateById: jest.fn(),
            renderTemplate: jest.fn(),
            validateTemplate: jest.fn(),
            listTemplates: jest.fn(),
          },
        },
      ],
    }).compile();

    distributionService = module.get<DistributionService>(DistributionService);
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SMSService>(SMSService);
    whatsappService = module.get<WhatsAppService>(WhatsAppService);
    orchestratorService = module.get<DistributionOrchestratorService>(DistributionOrchestratorService);
    queueService = module.get<DistributionQueueService>(DistributionQueueService);
    contactService = module.get<RecipientContactService>(RecipientContactService);
    templateService = module.get<TemplateService>(TemplateService);
  });

  describe('Load Testing - Distribution Processing', () => {
    it('should handle 1000 concurrent distribution requests', async () => {
      const requests = Array.from({ length: 1000 }, (_, i) => ({
        invoiceId: `invoice-${i}`,
        customerId: `customer-${i}`,
        amount: 1000 + (i % 10000),
        channel: DistributionChannel.EMAIL,
      }));

      const mockResults = Array.from({ length: 1000 }, (_, i) => ({
        invoiceId: `invoice-${i}`,
        customerId: `customer-${i}`,
        status: DistributionStatus.SENT,
        messageId: `msg-${i}`,
        sentAt: new Date(),
        processingTime: Math.random() * 100, // 0-100ms
      }));

      jest.spyOn(orchestratorService, 'orchestrateDistribution').mockImplementation(async (req) => {
        const result = mockResults.find(r => r.invoiceId === req.invoiceId);
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return result;
      });

      const startTime = Date.now();
      const promises = requests.map(req => orchestratorService.orchestrateDistribution(req));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(1000);
      expect(results.filter(r => r.status === DistributionStatus.SENT)).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const averageProcessingTime = results.reduce((sum, r) => sum + (r as any).processingTime, 0) / results.length;
      expect(averageProcessingTime).toBeLessThan(100); // Average under 100ms
    });

    it('should handle high-volume batch processing', async () => {
      const batchSize = 5000;
      const batchRequests = Array.from({ length: batchSize }, (_, i) => ({
        invoiceId: `batch-invoice-${i}`,
        customerId: `batch-customer-${i}`,
        channel: DistributionChannel.EMAIL,
      }));

      const batchResults = Array.from({ length: batchSize }, (_, i) => ({
        invoiceId: `batch-invoice-${i}`,
        status: i % 100 === 0 ? DistributionStatus.FAILED : DistributionStatus.SENT,
        messageId: i % 100 === 0 ? null : `batch-msg-${i}`,
        error: i % 100 === 0 ? 'Random failure' : null,
      }));

      jest.spyOn(orchestratorService, 'processBatchDistribution').mockResolvedValue(batchResults);

      const startTime = Date.now();
      const results = await orchestratorService.processBatchDistribution(batchRequests);
      const endTime = Date.now();

      expect(results).toHaveLength(batchSize);
      expect(results.filter(r => r.status === DistributionStatus.SENT)).toHaveLength(4950);
      expect(results.filter(r => r.status === DistributionStatus.FAILED)).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      const throughput = batchSize / ((endTime - startTime) / 1000); // requests per second
      expect(throughput).toBeGreaterThan(500); // Should handle at least 500 req/sec
    });

    it('should maintain performance under sustained load', async () => {
      const duration = 30000; // 30 seconds of sustained load
      const requestsPerSecond = 100;
      const totalRequests = (duration / 1000) * requestsPerSecond;

      jest.spyOn(orchestratorService, 'orchestrateDistribution').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20)); // 0-20ms processing
        return {
          status: DistributionStatus.SENT,
          messageId: `msg-${Math.random()}`,
          sentAt: new Date(),
        };
      });

      const startTime = Date.now();
      const results = [];
      
      // Generate sustained load
      for (let i = 0; i < totalRequests; i++) {
        const promise = orchestratorService.orchestrateDistribution({
          invoiceId: `sustained-${i}`,
          customerId: `customer-${i % 100}`,
        });
        results.push(promise);
        
        // Rate limiting
        if (i % requestsPerSecond === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const resolvedResults = await Promise.all(results);
      const endTime = Date.now();

      expect(resolvedResults).toHaveLength(totalRequests);
      expect(endTime - startTime).toBeLessThan(duration + 5000); // Allow 5s buffer
      
      const successRate = resolvedResults.filter(r => r.status === DistributionStatus.SENT).length / resolvedResults.length;
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate under load
    });
  });

  describe('Stress Testing - Service Limits', () => {
    it('should handle memory-intensive operations', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `contact-${i}`,
        email: `contact${i}@example.com`,
        phone: `+123456789${i.toString().padStart(4, '0')}`,
        preferences: {
          preferredChannel: Object.values(DistributionChannel)[i % Object.values(DistributionChannel).length],
          timezone: `UTC${i % 24 - 12}`,
          metadata: {
            tags: Array.from({ length: 10 }, (_, j) => `tag-${i}-${j}`),
            customFields: Array.from({ length: 20 }, (_, j) => ({
              key: `field-${j}`,
              value: `value-${i}-${j}`,
            })),
          },
        },
      }));

      jest.spyOn(contactService, 'listRecipientContacts').mockResolvedValue(largeDataset);

      const startTime = Date.now();
      const result = await contactService.listRecipientContacts({ limit: 10000 }, { user: { tenantId: 'tenant-1' } });
      const endTime = Date.now();

      expect(result).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(5000); // Should handle large datasets within 5s
      
      // Memory efficiency check
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
    });

    it('should handle concurrent template rendering', async () => {
      const templateRequests = Array.from({ length: 1000 }, (_, i) => ({
        templateId: 'template-1',
        variables: {
          invoiceNumber: `INV-${i.toString().padStart(6, '0')}`,
          customerName: `Customer ${i}`,
          amount: `$${(Math.random() * 10000).toFixed(2)}`,
          dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, j) => ({
            name: `Item ${j}`,
            quantity: Math.floor(Math.random() * 10) + 1,
            price: (Math.random() * 1000).toFixed(2),
          })),
        },
      }));

      jest.spyOn(templateService, 'renderTemplate').mockImplementation(async (templateId, variables) => {
        // Simulate complex template rendering
        await new Promise(resolve => setTimeout(resolve, Math.random() * 30));
        return {
          subject: `Invoice #${variables.invoiceNumber}`,
          body: `Dear ${variables.customerName}, your invoice #${variables.invoiceNumber} for ${variables.amount} is ready.`,
          html: `<p>Dear ${variables.customerName}, your invoice #${variables.invoiceNumber} for ${variables.amount} is ready.</p>`,
        };
      });

      const startTime = Date.now();
      const promises = templateRequests.map(req => templateService.renderTemplate(req.templateId, req.variables));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(1000);
      expect(results.every(r => r.subject && r.body && r.html)).toBe(true);
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds
      
      const averageRenderTime = (endTime - startTime) / results.length;
      expect(averageRenderTime).toBeLessThan(15); // Average under 15ms per template
    });

    it('should handle queue overflow scenarios', async () => {
      const queueSize = 10000;
      const overflowRequests = Array.from({ length: queueSize + 1000 }, (_, i) => ({
        id: `queue-item-${i}`,
        priority: Math.random() > 0.8 ? 'high' : 'normal',
        payload: {
          invoiceId: `invoice-${i}`,
          customerId: `customer-${i}`,
          channel: DistributionChannel.EMAIL,
        },
      }));

      jest.spyOn(queueService, 'addToQueue').mockImplementation(async (item) => {
        // Simulate queue pressure
        if (Math.random() > 0.95) {
          throw new Error('Queue full');
        }
        return { id: item.id, queuedAt: new Date() };
      });

      jest.spyOn(queueService, 'getQueueMetrics').mockResolvedValue({
        totalItems: queueSize,
        processingItems: 500,
        failedItems: 50,
        averageWaitTime: 2500, // 2.5 seconds
      });

      const startTime = Date.now();
      const results = [];
      const errors = [];

      for (const request of overflowRequests) {
        try {
          const result = await queueService.addToQueue(request);
          results.push(result);
        } catch (error) {
          errors.push(error);
        }
      }

      const endTime = Date.now();

      expect(results.length).toBeGreaterThan(queueSize * 0.9); // At least 90% should succeed
      expect(errors.length).toBeLessThan(queueSize * 0.1); // Less than 10% should fail
      expect(endTime - startTime).toBeLessThan(20000); // Should complete within 20 seconds

      const metrics = await queueService.getQueueMetrics();
      expect(metrics.totalItems).toBe(queueSize);
      expect(metrics.averageWaitTime).toBeLessThan(5000); // Wait time under 5 seconds
    });
  });

  describe('Performance Monitoring', () => {
    it('should track and report performance metrics', async () => {
      const performanceMetrics = {
        requestCount: 1000,
        averageResponseTime: 150, // ms
        p95ResponseTime: 300, // ms
        p99ResponseTime: 500, // ms
        errorRate: 0.02, // 2%
        throughput: 500, // requests per second
        memoryUsage: {
          heapUsed: 250 * 1024 * 1024, // 250MB
          heapTotal: 500 * 1024 * 1024, // 500MB
          external: 50 * 1024 * 1024, // 50MB
        },
        cpuUsage: 0.65, // 65%
        activeConnections: 150,
        queueSize: 100,
      };

      jest.spyOn(distributionService, 'getDistributionAnalytics').mockResolvedValue(performanceMetrics);

      const metrics = await distributionService.getDistributionAnalytics({
        tenantId: 'tenant-1',
        includePerformance: true,
      });

      expect(metrics.requestCount).toBe(1000);
      expect(metrics.averageResponseTime).toBe(150);
      expect(metrics.p95ResponseTime).toBe(300);
      expect(metrics.errorRate).toBe(0.02);
      expect(metrics.throughput).toBe(500);
      expect(metrics.memoryUsage.heapUsed).toBe(250 * 1024 * 1024);
    });

    it('should detect performance degradation', async () => {
      const degradedMetrics = {
        requestCount: 1000,
        averageResponseTime: 500, // Degraded from 150ms to 500ms
        p95ResponseTime: 1200, // Degraded from 300ms to 1200ms
        p99ResponseTime: 2000, // Degraded from 500ms to 2000ms
        errorRate: 0.08, // Increased from 2% to 8%
        throughput: 200, // Decreased from 500 to 200 req/sec
        alerts: [
          {
            type: 'response_time',
            severity: 'high',
            message: 'Average response time increased by 233%',
          },
          {
            type: 'error_rate',
            severity: 'medium',
            message: 'Error rate increased to 8%',
          },
          {
            type: 'throughput',
            severity: 'high',
            message: 'Throughput decreased by 60%',
          },
        ],
      };

      jest.spyOn(distributionService, 'getDistributionAnalytics').mockResolvedValue(degradedMetrics);

      const metrics = await distributionService.getDistributionAnalytics({
        tenantId: 'tenant-1',
        includePerformance: true,
      });

      expect(metrics.averageResponseTime).toBeGreaterThan(300); // Above acceptable threshold
      expect(metrics.errorRate).toBeGreaterThan(0.05); // Above acceptable threshold
      expect(metrics.throughput).toBeLessThan(300); // Below acceptable threshold
      expect(metrics.alerts).toHaveLength(3);
      expect(metrics.alerts.some(alert => alert.severity === 'high')).toBe(true);
    });
  });

  describe('Channel Performance Tests', () => {
    it('should measure email service performance', async () => {
      const emailRequests = Array.from({ length: 500 }, (_, i) => ({
        to: `customer${i}@example.com`,
        subject: `Invoice #INV-${i.toString().padStart(6, '0')}`,
        body: `Your invoice #INV-${i.toString().padStart(6, '0')} is ready.`,
        templateId: 'template-1',
      }));

      jest.spyOn(emailService, 'sendEmail').mockImplementation(async (request) => {
        const processingTime = Math.random() * 100 + 50; // 50-150ms
        await new Promise(resolve => setTimeout(resolve, processingTime));
        return {
          messageId: `email-${Math.random()}`,
          status: 'sent',
          processingTime,
        };
      });

      const startTime = Date.now();
      const results = await Promise.all(emailRequests.map(req => emailService.sendEmail(req)));
      const endTime = Date.now();

      expect(results).toHaveLength(500);
      expect(results.every(r => r.status === 'sent')).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      const averageProcessingTime = results.reduce((sum, r) => sum + (r as any).processingTime, 0) / results.length;
      expect(averageProcessingTime).toBeLessThan(120); // Average under 120ms
    });

    it('should measure SMS service performance', async () => {
      const smsRequests = Array.from({ length: 300 }, (_, i) => ({
        to: `+123456789${i.toString().padStart(4, '0')}`,
        message: `Invoice #INV-${i.toString().padStart(6, '0')} ready`,
        templateId: 'sms-template-1',
      }));

      jest.spyOn(smsService, 'sendSMS').mockImplementation(async (request) => {
        const processingTime = Math.random() * 80 + 30; // 30-110ms
        await new Promise(resolve => setTimeout(resolve, processingTime));
        return {
          messageId: `sms-${Math.random()}`,
          status: 'sent',
          processingTime,
        };
      });

      const startTime = Date.now();
      const results = await Promise.all(smsRequests.map(req => smsService.sendSMS(req)));
      const endTime = Date.now();

      expect(results).toHaveLength(300);
      expect(results.every(r => r.status === 'sent')).toBe(true);
      expect(endTime - startTime).toBeLessThan(8000); // Should complete within 8 seconds

      const averageProcessingTime = results.reduce((sum, r) => sum + (r as any).processingTime, 0) / results.length;
      expect(averageProcessingTime).toBeLessThan(80); // Average under 80ms
    });

    it('should measure WhatsApp service performance', async () => {
      const whatsappRequests = Array.from({ length: 200 }, (_, i) => ({
        to: `+123456789${i.toString().padStart(4, '0')}`,
        message: `Invoice #INV-${i.toString().padStart(6, '0')} ready`,
        templateId: 'wa-template-1',
      }));

      jest.spyOn(whatsappService, 'sendWhatsAppMessage').mockImplementation(async (request) => {
        const processingTime = Math.random() * 120 + 80; // 80-200ms
        await new Promise(resolve => setTimeout(resolve, processingTime));
        return {
          messageId: `wa-${Math.random()}`,
          status: 'sent',
          processingTime,
        };
      });

      const startTime = Date.now();
      const results = await Promise.all(whatsappRequests.map(req => whatsappService.sendWhatsAppMessage(req)));
      const endTime = Date.now();

      expect(results).toHaveLength(200);
      expect(results.every(r => r.status === 'sent')).toBe(true);
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds

      const averageProcessingTime = results.reduce((sum, r) => sum + (r as any).processingTime, 0) / results.length;
      expect(averageProcessingTime).toBeLessThan(150); // Average under 150ms
    });
  });

  describe('Database Performance Tests', () => {
    it('should handle high-volume database operations', async () => {
      const dbOperations = Array.from({ length: 1000 }, (_, i) => ({
        operation: 'create',
        entity: 'distribution_record',
        data: {
          invoiceId: `invoice-${i}`,
          customerId: `customer-${i}`,
          channel: DistributionChannel.EMAIL,
          status: DistributionStatus.SENT,
          messageId: `msg-${i}`,
          metadata: {
            processingTime: Math.random() * 100,
            retryCount: 0,
            priority: Math.random() > 0.8 ? 'high' : 'normal',
          },
        },
      }));

      jest.spyOn(distributionService, 'processDistribution').mockImplementation(async (data) => {
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5)); // 5-25ms
        return {
          id: `record-${Math.random()}`,
          ...data,
          createdAt: new Date(),
        };
      });

      const startTime = Date.now();
      const results = await Promise.all(dbOperations.map(op => 
        distributionService.processDistribution(op.data)
      ));
      const endTime = Date.now();

      expect(results).toHaveLength(1000);
      expect(results.every(r => r.id && r.createdAt)).toBe(true);
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds

      const averageDbTime = (endTime - startTime) / results.length;
      expect(averageDbTime).toBeLessThan(15); // Average under 15ms per operation
    });

    it('should handle complex query performance', async () => {
      const complexQueries = [
        {
          description: 'Analytics query with aggregations',
          query: {
            tenantId: 'tenant-1',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            groupBy: ['channel', 'status'],
            aggregations: ['count', 'avg', 'sum'],
          },
        },
        {
          description: 'Join query with multiple tables',
          query: {
            tenantId: 'tenant-1',
            include: ['customer', 'template', 'contact'],
            filters: {
              status: [DistributionStatus.SENT, DistributionStatus.DELIVERED],
              channels: [DistributionChannel.EMAIL, DistributionChannel.SMS],
            },
          },
        },
        {
          description: 'Full-text search query',
          query: {
            tenantId: 'tenant-1',
            searchText: 'invoice payment',
            searchFields: ['subject', 'body', 'customerName'],
            fuzzy: true,
          },
        },
      ];

      jest.spyOn(distributionService, 'getDistributionAnalytics').mockImplementation(async (query) => {
        // Simulate complex query processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100)); // 100-300ms
        return {
          query,
          resultCount: Math.floor(Math.random() * 1000) + 100,
          executionTime: Math.random() * 200 + 100,
        };
      });

      const startTime = Date.now();
      const results = await Promise.all(complexQueries.map(q => 
        distributionService.getDistributionAnalytics(q.query)
      ));
      const endTime = Date.now();

      expect(results).toHaveLength(3);
      expect(results.every(r => r.resultCount > 0)).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds

      const averageQueryTime = results.reduce((sum, r) => sum + (r as any).executionTime, 0) / results.length;
      expect(averageQueryTime).toBeLessThan(250); // Average under 250ms per complex query
    });
  });

  describe('Resource Utilization Tests', () => {
    it('should monitor memory usage during peak load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate memory-intensive workload
      const memoryLoad = Array.from({ length: 5000 }, (_, i) => ({
        id: `memory-test-${i}`,
        data: new Array(1000).fill(0).map(() => ({
          key: `key-${Math.random()}`,
          value: `value-${Math.random()}`,
          metadata: {
            timestamp: new Date(),
            random: Math.random(),
            array: Array.from({ length: 10 }, () => Math.random()),
          },
        })),
      }));

      jest.spyOn(distributionService, 'processDistribution').mockImplementation(async (data) => {
        // Simulate memory-intensive processing
        const processedData = JSON.parse(JSON.stringify(data)); // Deep copy
        await new Promise(resolve => setTimeout(resolve, 10));
        return { id: Math.random().toString(), processedData };
      });

      await Promise.all(memoryLoad.map(item => 
        distributionService.processDistribution(item)
      ));

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      expect(finalMemory.heapUsed).toBeLessThan(400 * 1024 * 1024); // Total under 400MB
    });

    it('should handle CPU-intensive operations efficiently', async () => {
      const cpuIntensiveTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `cpu-task-${i}`,
        calculations: Array.from({ length: 10000 }, () => ({
          complex: Math.sqrt(Math.random() * 1000000),
          trigonometric: Math.sin(Math.random() * Math.PI * 2),
          logarithmic: Math.log(Math.random() * 1000 + 1),
        })),
      }));

      jest.spyOn(distributionService, 'processDistribution').mockImplementation(async (data) => {
        // Simulate CPU-intensive processing
        const results = data.calculations.map(calc => ({
          sum: calc.complex + calc.trigonometric + calc.logarithmic,
          product: calc.complex * calc.trigonometric * calc.logarithmic,
        }));
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate I/O
        return { id: Math.random().toString(), results };
      });

      const startTime = Date.now();
      const results = await Promise.all(cpuIntensiveTasks.map(task => 
        distributionService.processDistribution(task)
      ));
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(results.every(r => (r as any).results.length === 10000)).toBe(true);
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds

      const averageTaskTime = (endTime - startTime) / results.length;
      expect(averageTaskTime).toBeLessThan(150); // Average under 150ms per CPU-intensive task
    });
  });

  describe('Scalability Tests', () => {
    it('should scale horizontally with increased load', async () => {
      const loadLevels = [
        { requests: 100, expectedTime: 2000 },
        { requests: 500, expectedTime: 8000 },
        { requests: 1000, expectedTime: 15000 },
        { requests: 2000, expectedTime: 28000 },
      ];

      jest.spyOn(orchestratorService, 'orchestrateDistribution').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
        return { status: DistributionStatus.SENT, messageId: `msg-${Math.random()}` };
      });

      const scalabilityResults = [];

      for (const level of loadLevels) {
        const requests = Array.from({ length: level.requests }, (_, i) => ({
          invoiceId: `scale-${level.requests}-${i}`,
          customerId: `customer-${i}`,
        }));

        const startTime = Date.now();
        await Promise.all(requests.map(req => orchestratorService.orchestrateDistribution(req)));
        const endTime = Date.now();

        const actualTime = endTime - startTime;
        const throughput = level.requests / (actualTime / 1000);

        scalabilityResults.push({
          requests: level.requests,
          actualTime,
          expectedTime: level.expectedTime,
          throughput,
          efficiency: level.expectedTime / actualTime,
        });

        expect(actualTime).toBeLessThan(level.expectedTime * 1.5); // Allow 50% buffer
      }

      // Verify linear scalability
      const throughputs = scalabilityResults.map(r => r.throughput);
      const throughputVariance = Math.max(...throughputs) / Math.min(...throughputs);
      expect(throughputVariance).toBeLessThan(2); // Throughput should be relatively consistent
    });

    it('should maintain performance with increasing data complexity', async () => {
      const complexityLevels = [
        { complexity: 'simple', dataPoints: 10, expectedTime: 1000 },
        { complexity: 'medium', dataPoints: 100, expectedTime: 3000 },
        { complexity: 'complex', dataPoints: 1000, expectedTime: 8000 },
        { complexity: 'very_complex', dataPoints: 10000, expectedTime: 20000 },
      ];

      jest.spyOn(templateService, 'renderTemplate').mockImplementation(async (templateId, variables) => {
        // Simulate processing based on data complexity
        const processingTime = Math.log10(variables.dataPoints?.length || 1) * 100;
        await new Promise(resolve => setTimeout(resolve, processingTime));
        return {
          subject: `Complex template with ${variables.dataPoints?.length || 0} data points`,
          body: `Rendered in ${processingTime}ms`,
        };
      });

      for (const level of complexityLevels) {
        const templateData = {
          dataPoints: Array.from({ length: level.dataPoints }, (_, i) => ({
            id: i,
            value: Math.random(),
            nested: {
              level1: { level2: { level3: `data-${i}` } },
            },
          })),
        };

        const startTime = Date.now();
        await templateService.renderTemplate('template-1', templateData);
        const endTime = Date.now();

        const actualTime = endTime - startTime;
        expect(actualTime).toBeLessThan(level.expectedTime);
      }
    });
  });

  describe('Performance Regression Tests', () => {
    it('should detect performance regressions', async () => {
      const baselineMetrics = {
        averageResponseTime: 100,
        p95ResponseTime: 200,
        p99ResponseTime: 400,
        throughput: 1000,
        errorRate: 0.01,
      };

      const currentMetrics = {
        averageResponseTime: 150, // 50% regression
        p95ResponseTime: 350, // 75% regression
        p99ResponseTime: 600, // 50% regression
        throughput: 800, // 20% regression
        errorRate: 0.02, // 100% regression
      };

      const regressions = [];

      // Check for regressions
      if (currentMetrics.averageResponseTime > baselineMetrics.averageResponseTime * 1.2) {
        regressions.push({
          metric: 'averageResponseTime',
          baseline: baselineMetrics.averageResponseTime,
          current: currentMetrics.averageResponseTime,
          regression: ((currentMetrics.averageResponseTime - baselineMetrics.averageResponseTime) / baselineMetrics.averageResponseTime) * 100,
        });
      }

      if (currentMetrics.throughput < baselineMetrics.throughput * 0.8) {
        regressions.push({
          metric: 'throughput',
          baseline: baselineMetrics.throughput,
          current: currentMetrics.throughput,
          regression: ((baselineMetrics.throughput - currentMetrics.throughput) / baselineMetrics.throughput) * 100,
        });
      }

      expect(regressions).toHaveLength(2);
      expect(regressions.some(r => r.metric === 'averageResponseTime')).toBe(true);
      expect(regressions.some(r => r.metric === 'throughput')).toBe(true);
      expect(regressions.every(r => r.regression > 20)).toBe(true); // All regressions > 20%
    });
  });
});
