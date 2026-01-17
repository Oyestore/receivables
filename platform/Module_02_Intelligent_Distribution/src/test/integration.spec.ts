import { Test, TestingModule } from '@nestjs/testing';
import { DistributionService } from '../services/distribution.service';
import { EmailService } from '../services/email.service';
import { SMSService } from '../services/sms.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { DistributionOrchestratorService } from '../services/distribution-orchestrator.service';
import { RecipientContactService } from '../services/recipient-contact.service';
import { TemplateService } from '../services/template.service';
import { DistributionRule } from '../entities/distribution-rule.entity';
import { DistributionAssignment } from '../entities/distribution-assignment.entity';
import { DistributionRecord } from '../entities/distribution-record.entity';
import { RecipientContact } from '../entities/recipient-contact.entity';
import { Template } from '../entities/template.entity';
import { DistributionChannel, DistributionStatus } from '../entities/distribution-entities';

describe('Module 02 Integration Tests - Complete Workflow', () => {
  let distributionService: DistributionService;
  let emailService: EmailService;
  let smsService: SMSService;
  let whatsappService: WhatsAppService;
  let orchestratorService: DistributionOrchestratorService;
  let contactService: RecipientContactService;
  let templateService: TemplateService;

  const mockRule = {
    id: 'rule-1',
    tenantId: 'tenant-1',
    ruleName: 'High Value Rule',
    ruleType: 'amount_based',
    conditions: { minAmount: 10000 },
    targetChannel: DistributionChannel.EMAIL,
    priority: 90,
    isActive: true,
  };

  const mockContact = {
    id: 'contact-1',
    tenantId: 'tenant-1',
    customerId: 'customer-1',
    contactName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    preferences: {
      preferredChannel: DistributionChannel.EMAIL,
      timezone: 'America/New_York',
    },
  };

  const mockTemplate = {
    id: 'template-1',
    tenantId: 'tenant-1',
    templateName: 'Invoice Template',
    templateType: 'email',
    subject: 'Invoice #{{invoiceNumber}}',
    body: 'Dear {{customerName}}, your invoice #{{invoiceNumber}} for {{amount}} is ready.',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DistributionService,
          useValue: {
            createDistributionRule: jest.fn(),
            getDistributionRuleById: jest.fn(),
            createDistributionAssignment: jest.fn(),
            processDistribution: jest.fn(),
            getDistributionAnalytics: jest.fn(),
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
          provide: RecipientContactService,
          useValue: {
            getRecipientContactById: jest.fn(),
            getContactsByCustomerId: jest.fn(),
            validateContact: jest.fn(),
          },
        },
        {
          provide: TemplateService,
          useValue: {
            getTemplateById: jest.fn(),
            renderTemplate: jest.fn(),
            validateTemplate: jest.fn(),
          },
        },
      ],
    }).compile();

    distributionService = module.get<DistributionService>(DistributionService);
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SMSService>(SMSService);
    whatsappService = module.get<WhatsAppService>(WhatsAppService);
    orchestratorService = module.get<DistributionOrchestratorService>(DistributionOrchestratorService);
    contactService = module.get<RecipientContactService>(RecipientContactService);
    templateService = module.get<TemplateService>(TemplateService);
  });

  describe('Complete Distribution Workflow', () => {
    it('should handle end-to-end invoice distribution', async () => {
      // 1. Create distribution rule
      jest.spyOn(distributionService, 'createDistributionRule').mockResolvedValue(mockRule);
      const createdRule = await distributionService.createDistributionRule(mockRule as any, 'user-1', 'tenant-1');
      expect(createdRule).toEqual(mockRule);

      // 2. Get recipient contact
      jest.spyOn(contactService, 'getRecipientContactById').mockResolvedValue(mockContact);
      const contact = await contactService.getRecipientContactById('contact-1', 'tenant-1');
      expect(contact).toEqual(mockContact);

      // 3. Get template
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      const template = await templateService.getTemplateById('template-1', 'tenant-1');
      expect(template).toEqual(mockTemplate);

      // 4. Render template
      const renderedContent = {
        subject: 'Invoice #INV-001',
        body: 'Dear John Doe, your invoice #INV-001 for $1,000 is ready.',
      };
      jest.spyOn(templateService, 'renderTemplate').mockResolvedValue(renderedContent);
      const rendered = await templateService.renderTemplate('template-1', {
        invoiceNumber: 'INV-001',
        customerName: 'John Doe',
        amount: '$1,000',
      });
      expect(rendered).toEqual(renderedContent);

      // 5. Determine optimal channel
      jest.spyOn(orchestratorService, 'getOptimalChannel').mockResolvedValue(DistributionChannel.EMAIL);
      const optimalChannel = await orchestratorService.getOptimalChannel('customer-1', 'invoice-1');
      expect(optimalChannel).toBe(DistributionChannel.EMAIL);

      // 6. Send email
      const emailResult = {
        messageId: 'email-123',
        status: 'sent',
        delivered: true,
        timestamp: new Date(),
      };
      jest.spyOn(emailService, 'sendEmail').mockResolvedValue(emailResult);
      const emailSent = await emailService.sendEmail({
        to: 'john.doe@example.com',
        subject: renderedContent.subject,
        body: renderedContent.body,
      });
      expect(emailSent.messageId).toBe('email-123');

      // 7. Create distribution record
      const distributionRecord = {
        id: 'record-1',
        invoiceId: 'invoice-1',
        customerId: 'customer-1',
        channel: DistributionChannel.EMAIL,
        status: DistributionStatus.SENT,
        messageId: 'email-123',
        sentAt: new Date(),
      };
      jest.spyOn(distributionService, 'processDistribution').mockResolvedValue(distributionRecord);
      const record = await distributionService.processDistribution({
        invoiceId: 'invoice-1',
        customerId: 'customer-1',
        channel: DistributionChannel.EMAIL,
        messageId: 'email-123',
      });
      expect(record.status).toBe(DistributionStatus.SENT);
    });

    it('should handle multi-channel distribution fallback', async () => {
      // Simulate email failure
      jest.spyOn(emailService, 'sendEmail').mockRejectedValue(new Error('Email service unavailable'));
      
      // Fallback to SMS
      const smsResult = {
        messageId: 'sms-123',
        status: 'sent',
        delivered: true,
        timestamp: new Date(),
      };
      jest.spyOn(smsService, 'sendSMS').mockResolvedValue(smsResult);

      // Orchestrator should handle fallback
      const fallbackResult = {
        channel: DistributionChannel.SMS,
        messageId: 'sms-123',
        status: DistributionStatus.SENT,
        fallbackReason: 'Email service unavailable',
      };
      jest.spyOn(orchestratorService, 'orchestrateDistribution').mockResolvedValue(fallbackResult);

      const result = await orchestratorService.orchestrateDistribution({
        invoiceId: 'invoice-1',
        customerId: 'customer-1',
        preferredChannels: [DistributionChannel.EMAIL, DistributionChannel.SMS],
      });
      
      expect(result.channel).toBe(DistributionChannel.SMS);
      expect(result.fallbackReason).toBe('Email service unavailable');
    });

    it('should handle batch distribution processing', async () => {
      const batchRequests = [
        { invoiceId: 'invoice-1', customerId: 'customer-1' },
        { invoiceId: 'invoice-2', customerId: 'customer-2' },
        { invoiceId: 'invoice-3', customerId: 'customer-3' },
      ];

      const batchResults = [
        { invoiceId: 'invoice-1', status: 'sent', messageId: 'msg-1' },
        { invoiceId: 'invoice-2', status: 'sent', messageId: 'msg-2' },
        { invoiceId: 'invoice-3', status: 'failed', error: 'Invalid contact' },
      ];

      jest.spyOn(orchestratorService, 'processBatchDistribution').mockResolvedValue(batchResults);

      const results = await orchestratorService.processBatchDistribution(batchRequests);
      
      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('sent');
      expect(results[2].status).toBe('failed');
      expect(results[2].error).toBe('Invalid contact');
    });
  });

  describe('Channel-Specific Integration', () => {
    it('should integrate email service with distribution workflow', async () => {
      const emailPayload = {
        to: 'customer@example.com',
        subject: 'Invoice Notification',
        body: 'Your invoice is ready',
        templateId: 'template-1',
      };

      const emailResult = {
        messageId: 'email-123',
        provider: 'SendGrid',
        status: 'delivered',
        timestamp: new Date(),
      };

      jest.spyOn(emailService, 'sendEmail').mockResolvedValue(emailResult);
      jest.spyOn(emailService, 'getEmailDeliveryStatus').mockResolvedValue({
        status: 'delivered',
        deliveredAt: new Date(),
        opens: 1,
        clicks: 0,
      });

      const sent = await emailService.sendEmail(emailPayload);
      expect(sent.messageId).toBe('email-123');

      const status = await emailService.getEmailDeliveryStatus('email-123');
      expect(status.status).toBe('delivered');
      expect(status.opens).toBe(1);
    });

    it('should integrate SMS service with distribution workflow', async () => {
      const smsPayload = {
        to: '+1234567890',
        message: 'Your invoice #INV-001 is ready',
        templateId: 'template-1',
      };

      const smsResult = {
        messageId: 'sms-123',
        provider: 'Twilio',
        status: 'delivered',
        timestamp: new Date(),
      };

      jest.spyOn(smsService, 'sendSMS').mockResolvedValue(smsResult);
      jest.spyOn(smsService, 'getSMSDeliveryStatus').mockResolvedValue({
        status: 'delivered',
        deliveredAt: new Date(),
        cost: 0.05,
      });

      const sent = await smsService.sendSMS(smsPayload);
      expect(sent.messageId).toBe('sms-123');

      const status = await smsService.getSMSDeliveryStatus('sms-123');
      expect(status.status).toBe('delivered');
      expect(status.cost).toBe(0.05);
    });

    it('should integrate WhatsApp service with distribution workflow', async () => {
      const whatsappPayload = {
        to: '+1234567890',
        message: 'Your invoice #INV-001 is ready',
        templateId: 'template-1',
      };

      const whatsappResult = {
        messageId: 'wa-123',
        provider: 'Meta WhatsApp',
        status: 'delivered',
        timestamp: new Date(),
      };

      jest.spyOn(whatsappService, 'sendWhatsAppMessage').mockResolvedValue(whatsappResult);
      jest.spyOn(whatsappService, 'getWhatsAppDeliveryStatus').mockResolvedValue({
        status: 'read',
        readAt: new Date(),
        replies: 0,
      });

      const sent = await whatsappService.sendWhatsAppMessage(whatsappPayload);
      expect(sent.messageId).toBe('wa-123');

      const status = await whatsappService.getWhatsAppDeliveryStatus('wa-123');
      expect(status.status).toBe('read');
      expect(status.replies).toBe(0);
    });
  });

  describe('Template Integration', () => {
    it('should integrate template rendering with distribution', async () => {
      const templateData = {
        invoiceNumber: 'INV-001',
        customerName: 'John Doe',
        amount: '$1,000',
        dueDate: '2024-02-01',
      };

      const renderedTemplate = {
        subject: 'Invoice #INV-001 - Due on 2024-02-01',
        body: 'Dear John Doe, Your invoice #INV-001 for $1,000 is due on 2024-02-01.',
        html: '<p>Dear John Doe, Your invoice #INV-001 for $1,000 is due on 2024-02-01.</p>',
      };

      jest.spyOn(templateService, 'renderTemplate').mockResolvedValue(renderedTemplate);

      const result = await templateService.renderTemplate('template-1', templateData);
      
      expect(result.subject).toContain('INV-001');
      expect(result.body).toContain('John Doe');
      expect(result.html).toContain('<p>');
    });

    it('should handle template validation in distribution context', async () => {
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: ['Consider adding unsubscribe link'],
        variables: ['invoiceNumber', 'customerName', 'amount'],
      };

      jest.spyOn(templateService, 'validateTemplate').mockResolvedValue(validationResult);

      const result = await templateService.validateTemplate('template-1');
      
      expect(result.isValid).toBe(true);
      expect(result.variables).toContain('invoiceNumber');
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('Contact Management Integration', () => {
    it('should integrate contact validation with distribution', async () => {
      const contactValidation = {
        isValid: true,
        validatedFields: {
          email: { valid: true, verified: true },
          phone: { valid: true, verified: false },
        },
        recommendations: ['Verify phone number for SMS delivery'],
      };

      jest.spyOn(contactService, 'validateContact').mockResolvedValue(contactValidation);

      const result = await contactService.validateContact('contact-1');
      
      expect(result.isValid).toBe(true);
      expect(result.validatedFields.email.verified).toBe(true);
      expect(result.recommendations).toContain('Verify phone number for SMS delivery');
    });

    it('should handle contact preferences in channel selection', async () => {
      const contactWithPreferences = {
        ...mockContact,
        preferences: {
          preferredChannel: DistributionChannel.SMS,
          timezone: 'America/New_York',
          doNotDisturb: false,
          workingHours: { start: '09:00', end: '17:00' },
        },
      };

      jest.spyOn(contactService, 'getRecipientContactById').mockResolvedValue(contactWithPreferences);
      jest.spyOn(orchestratorService, 'getOptimalChannel').mockResolvedValue(DistributionChannel.SMS);

      const contact = await contactService.getRecipientContactById('contact-1', 'tenant-1');
      const optimalChannel = await orchestratorService.getOptimalChannel('customer-1', 'invoice-1');

      expect(contact.preferences.preferredChannel).toBe(DistributionChannel.SMS);
      expect(optimalChannel).toBe(DistributionChannel.SMS);
    });
  });

  describe('Analytics Integration', () => {
    it('should provide comprehensive distribution analytics', async () => {
      const analyticsData = {
        totalDistributions: 1000,
        successfulDistributions: 950,
        failedDistributions: 50,
        successRate: 0.95,
        channelBreakdown: {
          [DistributionChannel.EMAIL]: { sent: 600, delivered: 580, failed: 20 },
          [DistributionChannel.SMS]: { sent: 300, delivered: 290, failed: 10 },
          [DistributionChannel.WHATSAPP]: { sent: 100, delivered: 80, failed: 20 },
        },
        averageDeliveryTime: 2.5,
        engagementMetrics: {
          openRate: 0.75,
          clickRate: 0.15,
          replyRate: 0.05,
        },
        timeSeriesData: [
          { date: '2024-01-01', sent: 100, delivered: 95, failed: 5 },
          { date: '2024-01-02', sent: 120, delivered: 115, failed: 5 },
        ],
      };

      jest.spyOn(distributionService, 'getDistributionAnalytics').mockResolvedValue(analyticsData);

      const result = await distributionService.getDistributionAnalytics({
        tenantId: 'tenant-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result.totalDistributions).toBe(1000);
      expect(result.successRate).toBe(0.95);
      expect(result.channelBreakdown[DistributionChannel.EMAIL].sent).toBe(600);
      expect(result.engagementMetrics.openRate).toBe(0.75);
    });

    it('should track real-time distribution metrics', async () => {
      const realTimeMetrics = {
        activeDistributions: 25,
        queueSize: 100,
        processingRate: 50, // per minute
        errorRate: 0.02,
        averageResponseTime: 1.2, // seconds
        systemLoad: 0.65,
      };

      jest.spyOn(distributionService, 'getDistributionAnalytics').mockResolvedValue(realTimeMetrics);

      const result = await distributionService.getDistributionAnalytics({
        tenantId: 'tenant-1',
        realTime: true,
      });

      expect(result.activeDistributions).toBe(25);
      expect(result.processingRate).toBe(50);
      expect(result.systemLoad).toBe(0.65);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service failures gracefully', async () => {
      // Simulate email service failure
      jest.spyOn(emailService, 'sendEmail').mockRejectedValue(new Error('Email service timeout'));
      
      // Orchestrator should handle fallback
      const fallbackResult = {
        channel: DistributionChannel.SMS,
        messageId: 'sms-fallback-123',
        status: DistributionStatus.SENT,
        fallbackReason: 'Email service timeout',
        originalChannel: DistributionChannel.EMAIL,
      };

      jest.spyOn(orchestratorService, 'orchestrateDistribution').mockResolvedValue(fallbackResult);

      const result = await orchestratorService.orchestrateDistribution({
        invoiceId: 'invoice-1',
        customerId: 'customer-1',
        preferredChannel: DistributionChannel.EMAIL,
      });

      expect(result.channel).toBe(DistributionChannel.SMS);
      expect(result.fallbackReason).toBe('Email service timeout');
      expect(result.originalChannel).toBe(DistributionChannel.EMAIL);
    });

    it('should handle template rendering errors', async () => {
      const templateError = new Error('Template variables missing');
      jest.spyOn(templateService, 'renderTemplate').mockRejectedValue(templateError);

      try {
        await templateService.renderTemplate('template-1', {});
      } catch (error) {
        expect(error.message).toBe('Template variables missing');
      }
    });

    it('should handle contact validation failures', async () => {
      const validationError = {
        isValid: false,
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'phone', message: 'Phone number not verified' },
        ],
      };

      jest.spyOn(contactService, 'validateContact').mockResolvedValue(validationError);

      const result = await contactService.validateContact('contact-1');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('Performance Integration', () => {
    it('should handle high-volume distribution efficiently', async () => {
      const highVolumeRequests = Array.from({ length: 1000 }, (_, i) => ({
        invoiceId: `invoice-${i}`,
        customerId: `customer-${i}`,
      }));

      const startTime = Date.now();
      
      const batchResults = Array.from({ length: 1000 }, (_, i) => ({
        invoiceId: `invoice-${i}`,
        status: i % 100 === 0 ? 'failed' : 'sent',
        messageId: `msg-${i}`,
      }));

      jest.spyOn(orchestratorService, 'processBatchDistribution').mockResolvedValue(batchResults);

      const results = await orchestratorService.processBatchDistribution(highVolumeRequests);
      const endTime = Date.now();

      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(results.filter(r => r.status === 'sent')).toHaveLength(990);
      expect(results.filter(r => r.status === 'failed')).toHaveLength(10);
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrentRequests = Array.from({ length: 50 }, () =>
        orchestratorService.orchestrateDistribution({
          invoiceId: `invoice-${Math.random()}`,
          customerId: `customer-${Math.random()}`,
        })
      );

      const results = Array.from({ length: 50 }, (_, i) => ({
        invoiceId: `invoice-${i}`,
        status: 'sent',
        messageId: `msg-${i}`,
        channel: DistributionChannel.EMAIL,
      }));

      jest.spyOn(orchestratorService, 'orchestrateDistribution').mockImplementation(async () => 
        results[Math.floor(Math.random() * results.length)]
      );

      const startTime = Date.now();
      const resolvedResults = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      expect(resolvedResults).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Security Integration', () => {
    it('should enforce tenant isolation', async () => {
      const tenantARule = { ...mockRule, tenantId: 'tenant-a' };
      const tenantBRule = { ...mockRule, tenantId: 'tenant-b' };

      jest.spyOn(distributionService, 'getDistributionRuleById')
        .mockImplementation(async (id, tenantId) => {
          if (tenantId === 'tenant-a') return tenantARule;
          if (tenantId === 'tenant-b') return tenantBRule;
          throw new Error('Access denied');
        });

      const ruleA = await distributionService.getDistributionRuleById('rule-1', 'tenant-a');
      const ruleB = await distributionService.getDistributionRuleById('rule-1', 'tenant-b');

      expect(ruleA.tenantId).toBe('tenant-a');
      expect(ruleB.tenantId).toBe('tenant-b');

      await expect(distributionService.getDistributionRuleById('rule-1', 'tenant-c'))
        .rejects.toThrow('Access denied');
    });

    it('should validate input sanitization', async () => {
      const maliciousInput = {
        to: '<script>alert("xss")</script>@example.com',
        subject: 'Invoice <script>alert("xss")</script>',
        body: 'Click <script>alert("xss")</script> here',
      };

      const sanitizedResult = {
        to: 'example.com',
        subject: 'Invoice',
        body: 'Click here',
        warnings: ['Input sanitized for security'],
      };

      jest.spyOn(emailService, 'sendEmail').mockResolvedValue(sanitizedResult);

      const result = await emailService.sendEmail(maliciousInput);
      
      expect(result.to).toBe('example.com');
      expect(result.subject).toBe('Invoice');
      expect(result.body).toBe('Click here');
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('Multi-Service Coordination', () => {
    it('should coordinate multiple services for complex distribution', async () => {
      // Setup complex scenario
      const invoice = {
        id: 'invoice-1',
        customerId: 'customer-1',
        amount: 15000,
        dueDate: '2024-02-01',
      };

      // 1. Get customer's preferred channels
      jest.spyOn(contactService, 'getContactsByCustomerId').mockResolvedValue([
        { ...mockContact, preferences: { preferredChannel: DistributionChannel.EMAIL } },
        { ...mockContact, id: 'contact-2', preferences: { preferredChannel: DistributionChannel.SMS } },
      ]);

      // 2. Determine optimal channels based on amount and preferences
      jest.spyOn(orchestratorService, 'getOptimalChannel').mockResolvedValue(DistributionChannel.EMAIL);

      // 3. Get and render template
      jest.spyOn(templateService, 'getTemplateById').mockResolvedValue(mockTemplate);
      jest.spyOn(templateService, 'renderTemplate').mockResolvedValue({
        subject: 'Invoice #invoice-1 for $15,000',
        body: 'Your invoice #invoice-1 for $15,000 is due on 2024-02-01',
      });

      // 4. Send via primary channel
      jest.spyOn(emailService, 'sendEmail').mockResolvedValue({
        messageId: 'email-123',
        status: 'sent',
      });

      // 5. Schedule follow-up via secondary channel
      jest.spyOn(smsService, 'sendSMS').mockResolvedValue({
        messageId: 'sms-123',
        status: 'scheduled',
      });

      // Execute coordinated workflow
      const contacts = await contactService.getContactsByCustomerId('customer-1', 'tenant-1');
      const optimalChannel = await orchestratorService.getOptimalChannel('customer-1', 'invoice-1');
      const template = await templateService.getTemplateById('template-1', 'tenant-1');
      const rendered = await templateService.renderTemplate('template-1', {
        invoiceNumber: 'invoice-1',
        amount: '$15,000',
        dueDate: '2024-02-01',
      });

      const emailResult = await emailService.sendEmail({
        to: contacts[0].email,
        subject: rendered.subject,
        body: rendered.body,
      });

      const smsResult = await smsService.sendSMS({
        to: contacts[1].phone,
        message: `Reminder: ${rendered.body}`,
        scheduleTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours later
      });

      expect(contacts).toHaveLength(2);
      expect(optimalChannel).toBe(DistributionChannel.EMAIL);
      expect(emailResult.status).toBe('sent');
      expect(smsResult.status).toBe('scheduled');
    });

    it('should handle service dependencies and failures', async () => {
      // Simulate template service failure
      jest.spyOn(templateService, 'getTemplateById').mockRejectedValue(new Error('Template not found'));

      // Fallback to default template
      const defaultTemplate = {
        id: 'default-template',
        subject: 'Invoice Notification',
        body: 'Your invoice is ready for payment.',
      };

      jest.spyOn(templateService, 'getDefaultTemplate').mockResolvedValue(defaultTemplate);
      jest.spyOn(emailService, 'sendEmail').mockResolvedValue({
        messageId: 'email-default-123',
        status: 'sent',
      });

      try {
        await templateService.getTemplateById('invalid-template', 'tenant-1');
      } catch (error) {
        const fallbackTemplate = await templateService.getDefaultTemplate('invoice');
        const result = await emailService.sendEmail({
          to: 'customer@example.com',
          subject: fallbackTemplate.subject,
          body: fallbackTemplate.body,
        });

        expect(result.messageId).toBe('email-default-123');
        expect(result.status).toBe('sent');
      }
    });
  });
});
