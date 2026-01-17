import { Test, TestingModule } from '@nestjs/testing';
import { DistributionRecordController } from '../controllers/distribution-record.controller';
import { DistributionRecordService } from '../services/distribution-record.service';
import { DistributionService } from '../services/distribution.service';
import { EmailService } from '../services/email.service';
import { SMSService } from '../services/sms.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { CreateDistributionRecordDto } from '../dto/create-distribution-record.dto';
import { UpdateDistributionRecordDto } from '../dto/update-distribution-record.dto';
import { DistributionStatus, DistributionChannel } from '../entities/distribution-entities';
import { HttpStatus } from '@nestjs/common';

describe('DistributionRecordController - Complete Tests', () => {
  let controller: DistributionRecordController;
  let recordService: DistributionRecordService;
  let distributionService: DistributionService;
  let emailService: EmailService;
  let smsService: SMSService;
  let whatsappService: WhatsAppService;

  const mockRecord = {
    id: 'record-1',
    tenantId: 'tenant-1',
    invoiceId: 'invoice-1',
    customerId: 'customer-1',
    distributionChannel: DistributionChannel.EMAIL,
    distributionStatus: DistributionStatus.PENDING,
    recipientInfo: {
      email: 'test@example.com',
      phone: '+1234567890',
      whatsapp: '+1234567890',
    },
    content: {
      subject: 'Invoice Notification',
      body: 'Your invoice is ready',
      templateId: 'template-1',
    },
    metadata: {
      ruleId: 'rule-1',
      assignmentId: 'assignment-1',
      priority: 'high',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    sentAt: null,
    deliveredAt: null,
    error: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DistributionRecordController],
      providers: [
        {
          provide: DistributionRecordService,
          useValue: {
            createDistributionRecord: jest.fn(),
            getDistributionRecordById: jest.fn(),
            updateDistributionRecord: jest.fn(),
            deleteDistributionRecord: jest.fn(),
            listDistributionRecords: jest.fn(),
            resendDistribution: jest.fn(),
            cancelDistribution: jest.fn(),
            getDeliveryStatus: jest.fn(),
            getDeliveryHistory: jest.fn(),
            bulkUpdateRecords: jest.fn(),
          },
        },
        {
          provide: DistributionService,
          useValue: {
            getDistributionAssignmentById: jest.fn(),
            updateDistributionAssignment: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
            getEmailStatus: jest.fn(),
          },
        },
        {
          provide: SMSService,
          useValue: {
            sendSMS: jest.fn(),
            getSMSStatus: jest.fn(),
          },
        },
        {
          provide: WhatsAppService,
          useValue: {
            sendWhatsAppMessage: jest.fn(),
            getWhatsAppStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DistributionRecordController>(DistributionRecordController);
    recordService = module.get<DistributionRecordService>(DistributionRecordService);
    distributionService = module.get<DistributionService>(DistributionService);
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SMSService>(SMSService);
    whatsappService = module.get<WhatsAppService>(WhatsAppService);
  });

  describe('Distribution Records Management', () => {
    it('should create a new distribution record', async () => {
      const createRecordDto: CreateDistributionRecordDto = {
        invoiceId: 'invoice-1',
        customerId: 'customer-1',
        distributionChannel: DistributionChannel.EMAIL,
        recipientInfo: {
          email: 'test@example.com',
        },
        content: {
          subject: 'Test Invoice',
          body: 'Your invoice is ready',
        },
      };

      jest.spyOn(recordService, 'createDistributionRecord').mockResolvedValue(mockRecord);

      const result = await controller.createDistributionRecord(createRecordDto, { user: { id: 'user-1', tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecord);
      expect(recordService.createDistributionRecord).toHaveBeenCalledWith(createRecordDto, 'user-1', 'tenant-1');
    });

    it('should get distribution record by ID', async () => {
      jest.spyOn(recordService, 'getDistributionRecordById').mockResolvedValue(mockRecord);

      const result = await controller.getDistributionRecord('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecord);
      expect(recordService.getDistributionRecordById).toHaveBeenCalledWith('record-1', 'tenant-1');
    });

    it('should update distribution record', async () => {
      const updateData: UpdateDistributionRecordDto = {
        distributionStatus: DistributionStatus.SENT,
        sentAt: new Date(),
      };

      const updatedRecord = { ...mockRecord, ...updateData };

      jest.spyOn(recordService, 'updateDistributionRecord').mockResolvedValue(updatedRecord);

      const result = await controller.updateDistributionRecord('record-1', updateData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.distributionStatus).toBe(DistributionStatus.SENT);
    });

    it('should delete distribution record', async () => {
      jest.spyOn(recordService, 'deleteDistributionRecord').mockResolvedValue(undefined);

      const result = await controller.deleteDistributionRecord('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(recordService.deleteDistributionRecord).toHaveBeenCalledWith('record-1', 'tenant-1');
    });

    it('should list distribution records with filters', async () => {
      const records = [mockRecord];
      const query = {
        distributionStatus: DistributionStatus.PENDING,
        distributionChannel: DistributionChannel.EMAIL,
        page: 1,
        limit: 10,
      };

      jest.spyOn(recordService, 'listDistributionRecords').mockResolvedValue(records);

      const result = await controller.listDistributionRecords(query, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(records);
      expect(recordService.listDistributionRecords).toHaveBeenCalledWith('tenant-1', query);
    });
  });

  describe('Distribution Operations', () => {
    it('should resend distribution', async () => {
      const resendResult = {
        success: true,
        newRecordId: 'record-2',
        sentAt: new Date(),
        deliveryId: 'delivery-123',
      };

      jest.spyOn(recordService, 'resendDistribution').mockResolvedValue(resendResult);

      const result = await controller.resendDistribution('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(resendResult);
      expect(recordService.resendDistribution).toHaveBeenCalledWith('record-1', 'tenant-1');
    });

    it('should cancel distribution', async () => {
      const cancelResult = {
        success: true,
        cancelledAt: new Date(),
        reason: 'User requested cancellation',
      };

      jest.spyOn(recordService, 'cancelDistribution').mockResolvedValue(cancelResult);

      const result = await controller.cancelDistribution('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cancelResult);
      expect(recordService.cancelDistribution).toHaveBeenCalledWith('record-1', 'tenant-1');
    });

    it('should get delivery status', async () => {
      const status = {
        recordId: 'record-1',
        distributionStatus: DistributionStatus.DELIVERED,
        deliveryId: 'delivery-123',
        sentAt: new Date(),
        deliveredAt: new Date(),
        deliveryTime: 2.5,
        providerResponse: {
          messageId: 'msg-123',
          status: 'delivered',
          timestamp: new Date(),
        },
      };

      jest.spyOn(recordService, 'getDeliveryStatus').mockResolvedValue(status);

      const result = await controller.getDeliveryStatus('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(status);
    });

    it('should get delivery history', async () => {
      const history = [
        {
          timestamp: new Date(),
          action: 'created',
          status: DistributionStatus.PENDING,
          details: 'Record created',
        },
        {
          timestamp: new Date(),
          action: 'sent',
          status: DistributionStatus.SENT,
          details: 'Email sent via SendGrid',
        },
        {
          timestamp: new Date(),
          action: 'delivered',
          status: DistributionStatus.DELIVERED,
          details: 'Email delivered successfully',
        },
      ];

      jest.spyOn(recordService, 'getDeliveryHistory').mockResolvedValue(history);

      const result = await controller.getDeliveryHistory('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data[2].status).toBe(DistributionStatus.DELIVERED);
    });
  });

  describe('Channel-Specific Operations', () => {
    it('should handle email distribution status check', async () => {
      const emailStatus = {
        messageId: 'msg-123',
        status: 'delivered',
        deliveredAt: new Date(),
        opens: 3,
        clicks: 1,
        bounces: 0,
        spamReports: 0,
      };

      jest.spyOn(emailService, 'getEmailStatus').mockResolvedValue(emailStatus);

      const result = await controller.getChannelDeliveryStatus('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.channel).toBe(DistributionChannel.EMAIL);
      expect(result.data.status).toEqual(emailStatus);
    });

    it('should handle SMS distribution status check', async () => {
      const smsStatus = {
        messageId: 'sms-123',
        status: 'delivered',
        deliveredAt: new Date(),
        segments: 1,
        price: '0.05',
        errorCode: null,
      };

      jest.spyOn(smsService, 'getSMSStatus').mockResolvedValue(smsStatus);

      const result = await controller.getChannelDeliveryStatus('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.channel).toBe(DistributionChannel.SMS);
      expect(result.data.status).toEqual(smsStatus);
    });

    it('should handle WhatsApp distribution status check', async () => {
      const whatsappStatus = {
        messageId: 'wa-123',
        status: 'read',
        deliveredAt: new Date(),
        readAt: new Date(),
        messageType: 'template',
        templateName: 'invoice_notification',
      };

      jest.spyOn(whatsappService, 'getWhatsAppStatus').mockResolvedValue(whatsappStatus);

      const result = await controller.getChannelDeliveryStatus('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.channel).toBe(DistributionChannel.WHATSAPP);
      expect(result.data.status).toEqual(whatsappStatus);
    });
  });

  describe('Batch Operations', () => {
    it('should bulk update distribution records', async () => {
      const bulkUpdate = {
        recordIds: ['record-1', 'record-2', 'record-3'],
        updateData: {
          distributionStatus: DistributionStatus.CANCELLED,
          metadata: { reason: 'Bulk cancellation' },
        },
      };

      const updateResults = {
        total: 3,
        successful: 2,
        failed: 1,
        results: [
          { recordId: 'record-1', success: true },
          { recordId: 'record-2', success: true },
          { recordId: 'record-3', success: false, error: 'Already delivered' },
        ],
      };

      jest.spyOn(recordService, 'bulkUpdateRecords').mockResolvedValue(updateResults);

      const result = await controller.bulkUpdateRecords(bulkUpdate, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updateResults);
      expect(result.data.successful).toBe(2);
      expect(result.data.failed).toBe(1);
    });

    it('should bulk resend distributions', async () => {
      const bulkResend = {
        recordIds: ['record-1', 'record-2'],
        options: {
          updateContent: false,
          priority: 'high',
        },
      };

      const resendResults = {
        total: 2,
        successful: 2,
        failed: 0,
        results: [
          { recordId: 'record-1', newRecordId: 'record-1-new', success: true },
          { recordId: 'record-2', newRecordId: 'record-2-new', success: true },
        ],
      };

      jest.spyOn(recordService, 'bulkResendRecords').mockResolvedValue(resendResults);

      const result = await controller.bulkResendDistributions(bulkResend, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(resendResults);
      expect(result.data.successful).toBe(2);
    });
  });

  describe('Analytics and Reporting', () => {
    it('should get distribution analytics', async () => {
      const analytics = {
        totalRecords: 1000,
        statusBreakdown: {
          [DistributionStatus.PENDING]: 100,
          [DistributionStatus.SENT]: 600,
          [DistributionStatus.DELIVERED]: 250,
          [DistributionStatus.FAILED]: 30,
          [DistributionStatus.CANCELLED]: 20,
        },
        channelBreakdown: {
          [DistributionChannel.EMAIL]: 600,
          [DistributionChannel.SMS]: 250,
          [DistributionChannel.WHATSAPP]: 150,
        },
        averageDeliveryTime: 2.5,
        successRate: 0.85,
      };

      jest.spyOn(recordService, 'getDistributionAnalytics').mockResolvedValue(analytics);

      const result = await controller.getDistributionAnalytics(
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        { user: { tenantId: 'tenant-1' } }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(analytics);
      expect(result.data.successRate).toBe(0.85);
    });

    it('should get delivery performance metrics', async () => {
      const performance = {
        channel: DistributionChannel.EMAIL,
        totalSent: 500,
        delivered: 450,
        failed: 25,
        pending: 25,
        deliveryRate: 0.9,
        averageDeliveryTime: 1.2,
        costPerDelivery: 0.05,
        engagementMetrics: {
          opens: 300,
          clicks: 45,
          bounces: 10,
          spamReports: 2,
        },
      };

      jest.spyOn(recordService, 'getChannelPerformance').mockResolvedValue(performance);

      const result = await controller.getChannelPerformance(DistributionChannel.EMAIL, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(performance);
      expect(result.data.deliveryRate).toBe(0.9);
    });
  });

  describe('Template and Content Management', () => {
    it('should preview distribution content', async () => {
      const preview = {
        subject: 'Invoice #INV-001',
        body: 'Dear Customer, your invoice #INV-001 for $1,000 is ready.',
        renderedContent: '<html>...</html>',
        templateVariables: {
          invoiceNumber: 'INV-001',
          amount: '$1,000',
          customerName: 'John Doe',
        },
      };

      jest.spyOn(recordService, 'previewContent').mockResolvedValue(preview);

      const result = await controller.previewContent('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(preview);
      expect(result.data.subject).toContain('INV-001');
    });

    it('should update distribution content', async () => {
      const contentUpdate = {
        subject: 'Updated Subject',
        body: 'Updated content',
        templateId: 'new-template',
      };

      const updatedRecord = {
        ...mockRecord,
        content: contentUpdate,
        updatedAt: new Date(),
      };

      jest.spyOn(recordService, 'updateContent').mockResolvedValue(updatedRecord);

      const result = await controller.updateContent('record-1', contentUpdate, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.content.subject).toBe('Updated Subject');
    });
  });

  describe('Error Handling', () => {
    it('should handle record not found error', async () => {
      const error = new Error('Distribution record not found');
      jest.spyOn(recordService, 'getDistributionRecordById').mockRejectedValue(error);

      const result = await controller.getDistributionRecord('invalid-id', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Distribution record not found');
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        invoiceId: '',
        customerId: '',
        distributionChannel: 'invalid-channel',
      };

      const result = await controller.createDistributionRecord(invalidData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should handle resend failure', async () => {
      const error = new Error('Cannot resend already delivered record');
      jest.spyOn(recordService, 'resendDistribution').mockRejectedValue(error);

      const result = await controller.resendDistribution('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot resend');
    });

    it('should handle service unavailability', async () => {
      const error = new Error('Email service temporarily unavailable');
      jest.spyOn(emailService, 'sendEmail').mockRejectedValue(error);

      const result = await controller.getChannelDeliveryStatus('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('service temporarily unavailable');
    });
  });

  describe('Authorization Tests', () => {
    it('should allow admin to access all records', async () => {
      const adminUser = { id: 'admin-1', tenantId: 'tenant-1', role: 'admin' };
      jest.spyOn(recordService, 'getDistributionRecordById').mockResolvedValue(mockRecord);

      const result = await controller.getDistributionRecord('record-1', { user: adminUser });

      expect(result.success).toBe(true);
    });

    it('should restrict access based on tenant', async () => {
      const otherTenantUser = { id: 'user-2', tenantId: 'other-tenant' };
      jest.spyOn(recordService, 'getDistributionRecordById').mockRejectedValue(new Error('Access denied'));

      const result = await controller.getDistributionRecord('record-1', { user: otherTenantUser });

      expect(result.success).toBe(false);
    });

    it('should allow users to access their own customer records', async () => {
      const regularUser = { id: 'user-1', tenantId: 'tenant-1', customerId: 'customer-1' };
      jest.spyOn(recordService, 'getDistributionRecordById').mockResolvedValue(mockRecord);

      const result = await controller.getDistributionRecord('record-1', { user: regularUser });

      expect(result.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent record requests efficiently', async () => {
      const requests = Array.from({ length: 20 }, () =>
        controller.getDistributionRecord('record-1', { user: { tenantId: 'tenant-1' } })
      );

      jest.spyOn(recordService, 'getDistributionRecordById').mockResolvedValue(mockRecord);

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const endTime = Date.now();

      expect(results).toHaveLength(20);
      expect(results.every(result => result.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large record lists efficiently', async () => {
      const largeRecordList = Array.from({ length: 100 }, (_, i) => ({
        ...mockRecord,
        id: `record-${i}`,
        invoiceId: `invoice-${i}`,
      }));

      jest.spyOn(recordService, 'listDistributionRecords').mockResolvedValue(largeRecordList);

      const startTime = Date.now();
      const result = await controller.listDistributionRecords({ limit: 100 }, { user: { tenantId: 'tenant-1' } });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle bulk operations efficiently', async () => {
      const bulkUpdate = {
        recordIds: Array.from({ length: 50 }, (_, i) => `record-${i}`),
        updateData: { distributionStatus: DistributionStatus.SENT },
      };

      const bulkResults = {
        total: 50,
        successful: 50,
        failed: 0,
        results: Array.from({ length: 50 }, (_, i) => ({
          recordId: `record-${i}`,
          success: true,
        })),
      };

      jest.spyOn(recordService, 'bulkUpdateRecords').mockResolvedValue(bulkResults);

      const startTime = Date.now();
      const result = await controller.bulkUpdateRecords(bulkUpdate, { user: { tenantId: 'tenant-1' } });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data.successful).toBe(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields in create record', async () => {
      const invalidRecord = {
        invoiceId: '',
        customerId: '',
        distributionChannel: 'invalid',
        recipientInfo: {},
        content: {},
      };

      const result = await controller.createDistributionRecord(invalidRecord, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should validate email format in recipient info', async () => {
      const invalidRecord = {
        invoiceId: 'invoice-1',
        customerId: 'customer-1',
        distributionChannel: DistributionChannel.EMAIL,
        recipientInfo: { email: 'invalid-email' },
        content: { subject: 'Test', body: 'Test' },
      };

      const result = await controller.createDistributionRecord(invalidRecord, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should validate phone number format', async () => {
      const invalidRecord = {
        invoiceId: 'invoice-1',
        customerId: 'customer-1',
        distributionChannel: DistributionChannel.SMS,
        recipientInfo: { phone: 'invalid-phone' },
        content: { body: 'Test SMS' },
      };

      const result = await controller.createDistributionRecord(invalidRecord, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('phone');
    });

    it('should validate status transitions', async () => {
      const invalidTransition = {
        distributionStatus: 'invalid-status',
      };

      const result = await controller.updateDistributionRecord('record-1', invalidTransition, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with distribution service for assignment updates', async () => {
      const updateData = {
        distributionStatus: DistributionStatus.DELIVERED,
        deliveredAt: new Date(),
      };

      const mockAssignment = {
        id: 'assignment-1',
        distributionStatus: DistributionStatus.DELIVERED,
        deliveredAt: new Date(),
      };

      jest.spyOn(recordService, 'updateDistributionRecord').mockResolvedValue({ ...mockRecord, ...updateData });
      jest.spyOn(distributionService, 'getDistributionAssignmentById').mockResolvedValue(mockAssignment);
      jest.spyOn(distributionService, 'updateDistributionAssignment').mockResolvedValue(mockAssignment);

      const result = await controller.updateDistributionRecord('record-1', updateData, { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.distributionStatus).toBe(DistributionStatus.DELIVERED);
    });

    it('should integrate with channel services for status updates', async () => {
      const emailStatus = {
        messageId: 'msg-123',
        status: 'delivered',
        deliveredAt: new Date(),
      };

      jest.spyOn(emailService, 'getEmailStatus').mockResolvedValue(emailStatus);
      jest.spyOn(recordService, 'updateDeliveryStatus').mockResolvedValue({
        ...mockRecord,
        distributionStatus: DistributionStatus.DELIVERED,
        deliveredAt: emailStatus.deliveredAt,
      });

      const result = await controller.syncDeliveryStatus('record-1', { user: { tenantId: 'tenant-1' } });

      expect(result.success).toBe(true);
      expect(result.data.distributionStatus).toBe(DistributionStatus.DELIVERED);
    });
  });
});
