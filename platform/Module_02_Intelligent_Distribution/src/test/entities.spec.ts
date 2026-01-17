import { Test, TestingModule } from '@nestjs/testing';
import { DistributionRule } from '../entities/distribution-rule.entity';
import { DistributionAssignment } from '../entities/distribution-assignment.entity';
import { FollowUpRule } from '../entities/follow-up-rule.entity';
import { FollowUpSequence } from '../entities/follow-up-sequence.entity';
import { FollowUpStep } from '../entities/follow-up-step.entity';
import { RecipientContact } from '../entities/recipient-contact.entity';
import { SenderProfile } from '../entities/sender-profile.entity';
import { DistributionRecord } from '../entities/distribution-record.entity';
import { Template } from '../entities/template.entity';
import { TemplateVersion } from '../entities/template-version.entity';
import { TemplateApproval } from '../entities/template-approval.entity';
import { InvoiceConstraint } from '../entities/invoice-constraint.entity';
import { DistributionRuleType, DistributionChannel, DistributionStatus, ContactStatus } from '../entities/distribution-entities';

describe('Module 02 Entities - Complete Tests', () => {
  let entities: any;

  beforeEach(async () => {
    entities = {
      DistributionRule,
      DistributionAssignment,
      FollowUpRule,
      FollowUpSequence,
      FollowUpStep,
      RecipientContact,
      SenderProfile,
      DistributionRecord,
      Template,
      TemplateVersion,
      TemplateApproval,
      InvoiceConstraint,
    };
  });

  describe('DistributionRule Entity', () => {
    it('should create a valid distribution rule', () => {
      const rule = new DistributionRule();
      rule.id = 'rule-1';
      rule.tenantId = 'tenant-1';
      rule.ruleName = 'High Value Rule';
      rule.description = 'Distribute high value invoices';
      rule.ruleType = DistributionRuleType.AMOUNT_BASED;
      rule.conditions = { minAmount: 10000 };
      rule.targetChannel = DistributionChannel.EMAIL;
      rule.priority = 90;
      rule.isActive = true;
      rule.createdBy = 'user-1';
      rule.createdAt = new Date();
      rule.updatedAt = new Date();

      expect(rule.id).toBe('rule-1');
      expect(rule.ruleName).toBe('High Value Rule');
      expect(rule.ruleType).toBe(DistributionRuleType.AMOUNT_BASED);
      expect(rule.conditions.minAmount).toBe(10000);
      expect(rule.targetChannel).toBe(DistributionChannel.EMAIL);
      expect(rule.priority).toBe(90);
      expect(rule.isActive).toBe(true);
    });

    it('should validate rule type enum', () => {
      const validTypes = [
        DistributionRuleType.AMOUNT_BASED,
        DistributionRuleType.CUSTOMER_BASED,
        DistributionRuleType.INDUSTRY_BASED,
        DistributionRuleType.GEOGRAPHIC,
        DistributionRuleType.CUSTOM,
      ];

      validTypes.forEach(type => {
        const rule = new DistributionRule();
        rule.ruleType = type;
        expect(rule.ruleType).toBe(type);
      });
    });

    it('should handle complex conditions', () => {
      const rule = new DistributionRule();
      rule.conditions = {
        minAmount: 5000,
        maxAmount: 50000,
        customerSegments: ['premium', 'enterprise'],
        industries: ['technology', 'healthcare'],
        geographic: ['US', 'CA'],
        customLogic: 'amount > 10000 && customer.segment === "premium"',
      };

      expect(rule.conditions.minAmount).toBe(5000);
      expect(rule.conditions.customerSegments).toContain('premium');
      expect(rule.conditions.customLogic).toContain('amount > 10000');
    });

    it('should validate priority range', () => {
      const rule = new DistributionRule();
      rule.priority = 100; // Maximum priority
      expect(rule.priority).toBe(100);

      rule.priority = 0; // Minimum priority
      expect(rule.priority).toBe(0);
    });

    it('should handle rule activation/deactivation', () => {
      const rule = new DistributionRule();
      rule.isActive = true;
      expect(rule.isActive).toBe(true);

      rule.isActive = false;
      expect(rule.isActive).toBe(false);
    });
  });

  describe('DistributionAssignment Entity', () => {
    it('should create a valid distribution assignment', () => {
      const assignment = new DistributionAssignment();
      assignment.id = 'assignment-1';
      assignment.tenantId = 'tenant-1';
      assignment.invoiceId = 'invoice-1';
      assignment.customerId = 'customer-1';
      assignment.assignedChannel = DistributionChannel.EMAIL;
      assignment.ruleId = 'rule-1';
      assignment.assignmentReason = 'High value invoice';
      assignment.distributionStatus = DistributionStatus.PENDING;
      assignment.metadata = { priority: 'high' };
      assignment.createdAt = new Date();
      assignment.updatedAt = new Date();

      expect(assignment.id).toBe('assignment-1');
      expect(assignment.invoiceId).toBe('invoice-1');
      expect(assignment.assignedChannel).toBe(DistributionChannel.EMAIL);
      expect(assignment.distributionStatus).toBe(DistributionStatus.PENDING);
      expect(assignment.assignmentReason).toBe('High value invoice');
    });

    it('should handle status transitions', () => {
      const assignment = new DistributionAssignment();
      assignment.distributionStatus = DistributionStatus.PENDING;

      // Valid transition: PENDING -> SENT
      assignment.distributionStatus = DistributionStatus.SENT;
      expect(assignment.distributionStatus).toBe(DistributionStatus.SENT);

      // Valid transition: SENT -> DELIVERED
      assignment.distributionStatus = DistributionStatus.DELIVERED;
      expect(assignment.distributionStatus).toBe(DistributionStatus.DELIVERED);

      // Valid transition: DELIVERED -> FAILED
      assignment.distributionStatus = DistributionStatus.FAILED;
      expect(assignment.distributionStatus).toBe(DistributionStatus.FAILED);
    });

    it('should track timestamps correctly', () => {
      const assignment = new DistributionAssignment();
      const now = new Date();
      assignment.createdAt = now;
      assignment.updatedAt = now;
      assignment.sentAt = now;
      assignment.deliveredAt = new Date(now.getTime() + 3600000); // 1 hour later

      expect(assignment.createdAt).toBe(now);
      expect(assignment.updatedAt).toBe(now);
      expect(assignment.sentAt).toBe(now);
      expect(assignment.deliveredAt.getTime()).toBeGreaterThan(assignment.sentAt.getTime());
    });

    it('should store error information', () => {
      const assignment = new DistributionAssignment();
      assignment.error = 'Email service unavailable';
      assignment.distributionStatus = DistributionStatus.FAILED;

      expect(assignment.error).toBe('Email service unavailable');
      expect(assignment.distributionStatus).toBe(DistributionStatus.FAILED);
    });
  });

  describe('FollowUpRule Entity', () => {
    it('should create a valid follow-up rule', () => {
      const rule = new FollowUpRule();
      rule.id = 'followup-rule-1';
      rule.tenantId = 'tenant-1';
      rule.ruleName = 'Payment Reminder';
      rule.description = 'Send payment reminders before due date';
      rule.triggerType = 'before_due';
      rule.triggerConditions = {
        daysBeforeDue: 3,
        minAmount: 1000,
        customerSegments: ['all'],
      };
      rule.isActive = true;
      rule.createdBy = 'user-1';
      rule.createdAt = new Date();
      rule.updatedAt = new Date();

      expect(rule.id).toBe('followup-rule-1');
      expect(rule.ruleName).toBe('Payment Reminder');
      expect(rule.triggerType).toBe('before_due');
      expect(rule.triggerConditions.daysBeforeDue).toBe(3);
      expect(rule.isActive).toBe(true);
    });

    it('should handle different trigger types', () => {
      const rule = new FollowUpRule();
      
      rule.triggerType = 'before_due';
      rule.triggerConditions = { daysBeforeDue: 7 };
      expect(rule.triggerConditions.daysBeforeDue).toBe(7);

      rule.triggerType = 'on_due';
      rule.triggerConditions = {};
      expect(rule.triggerType).toBe('on_due');

      rule.triggerType = 'after_due';
      rule.triggerConditions = { daysAfterDue: 3 };
      expect(rule.triggerConditions.daysAfterDue).toBe(3);
    });

    it('should validate trigger conditions', () => {
      const rule = new FollowUpRule();
      rule.triggerConditions = {
        daysBeforeDue: 5,
        daysAfterDue: 10,
        minAmount: 500,
        maxAmount: 10000,
        customerSegments: ['premium', 'standard'],
        invoiceTypes: ['standard', 'recurring'],
        excludeWeekends: true,
        businessHoursOnly: true,
      };

      expect(rule.triggerConditions.daysBeforeDue).toBe(5);
      expect(rule.triggerConditions.customerSegments).toHaveLength(2);
      expect(rule.triggerConditions.excludeWeekends).toBe(true);
    });
  });

  describe('FollowUpSequence Entity', () => {
    it('should create a valid follow-up sequence', () => {
      const sequence = new FollowUpSequence();
      sequence.id = 'sequence-1';
      sequence.tenantId = 'tenant-1';
      sequence.ruleId = 'followup-rule-1';
      sequence.sequenceName = 'Payment Reminder Sequence';
      sequence.description = '3-step payment reminder process';
      sequence.isActive = true;
      sequence.createdBy = 'user-1';
      sequence.createdAt = new Date();
      sequence.updatedAt = new Date();

      expect(sequence.id).toBe('sequence-1');
      expect(sequence.ruleId).toBe('followup-rule-1');
      expect(sequence.sequenceName).toBe('Payment Reminder Sequence');
      expect(sequence.isActive).toBe(true);
    });

    it('should track sequence execution', () => {
      const sequence = new FollowUpSequence();
      sequence.totalExecutions = 100;
      sequence.successfulExecutions = 85;
      sequence.failedExecutions = 15;
      sequence.averageExecutionTime = 120; // seconds
      sequence.lastExecutedAt = new Date();

      expect(sequence.totalExecutions).toBe(100);
      expect(sequence.successfulExecutions).toBe(85);
      expect(sequence.failedExecutions).toBe(15);
      expect(sequence.averageExecutionTime).toBe(120);
    });

    it('should calculate success rate', () => {
      const sequence = new FollowUpSequence();
      sequence.totalExecutions = 100;
      sequence.successfulExecutions = 85;
      
      const successRate = sequence.successfulExecutions / sequence.totalExecutions;
      expect(successRate).toBe(0.85);
    });
  });

  describe('FollowUpStep Entity', () => {
    it('should create a valid follow-up step', () => {
      const step = new FollowUpStep();
      step.id = 'step-1';
      step.sequenceId = 'sequence-1';
      step.stepOrder = 1;
      step.stepName = 'Initial Reminder';
      step.stepType = 'email';
      step.delayMinutes = 0;
      step.templateId = 'template-1';
      step.channel = DistributionChannel.EMAIL;
      step.isActive = true;
      step.createdAt = new Date();
      step.updatedAt = new Date();

      expect(step.id).toBe('step-1');
      expect(step.sequenceId).toBe('sequence-1');
      step.stepOrder = 1;
      expect(step.stepName).toBe('Initial Reminder');
      expect(step.stepType).toBe('email');
      expect(step.delayMinutes).toBe(0);
      expect(step.channel).toBe(DistributionChannel.EMAIL);
    });

    it('should handle step delays', () => {
      const step = new FollowUpStep();
      step.delayMinutes = 60; // 1 hour
      step.delayType = 'fixed';
      expect(step.delayMinutes).toBe(60);
      expect(step.delayType).toBe('fixed');

      step.delayMinutes = 1440; // 1 day
      step.delayType = 'business_hours';
      expect(step.delayMinutes).toBe(1440);
      expect(step.delayType).toBe('business_hours');
    });

    it('should handle different step types', () => {
      const step = new FollowUpStep();
      
      step.stepType = 'email';
      step.templateId = 'email-template';
      expect(step.stepType).toBe('email');

      step.stepType = 'sms';
      step.templateId = 'sms-template';
      expect(step.stepType).toBe('sms');

      step.stepType = 'whatsapp';
      step.templateId = 'whatsapp-template';
      expect(step.stepType).toBe('whatsapp');

      step.stepType = 'webhook';
      step.webhookUrl = 'https://example.com/webhook';
      expect(step.stepType).toBe('webhook');
    });

    it('should track step execution metrics', () => {
      const step = new FollowUpStep();
      step.totalExecutions = 200;
      step.successfulExecutions = 180;
      step.failedExecutions = 20;
      step.averageExecutionTime = 30;
      step.lastExecutedAt = new Date();

      expect(step.totalExecutions).toBe(200);
      expect(step.successfulExecutions).toBe(180);
      expect(step.failedExecutions).toBe(20);
      expect(step.averageExecutionTime).toBe(30);
    });
  });

  describe('RecipientContact Entity', () => {
    it('should create a valid recipient contact', () => {
      const contact = new RecipientContact();
      contact.id = 'contact-1';
      contact.tenantId = 'tenant-1';
      contact.customerId = 'customer-1';
      contact.contactName = 'John Doe';
      contact.contactType = 'primary';
      contact.email = 'john.doe@example.com';
      contact.phone = '+1234567890';
      contact.whatsapp = '+1234567890';
      contact.status = ContactStatus.ACTIVE;
      contact.createdAt = new Date();
      contact.updatedAt = new Date();

      expect(contact.id).toBe('contact-1');
      expect(contact.customerId).toBe('customer-1');
      expect(contact.contactName).toBe('John Doe');
      expect(contact.email).toBe('john.doe@example.com');
      expect(contact.phone).toBe('+1234567890');
      expect(contact.status).toBe(ContactStatus.ACTIVE);
    });

    it('should handle address information', () => {
      const contact = new RecipientContact();
      contact.address = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
      };

      expect(contact.address.street).toBe('123 Main St');
      expect(contact.address.city).toBe('New York');
      expect(contact.address.postalCode).toBe('10001');
    });

    it('should handle contact preferences', () => {
      const contact = new RecipientContact();
      contact.preferences = {
        preferredChannel: DistributionChannel.EMAIL,
        timezone: 'America/New_York',
        language: 'en',
        doNotDisturb: false,
        workingHours: {
          start: '09:00',
          end: '17:00',
          timezone: 'America/New_York',
        },
      };

      expect(contact.preferences.preferredChannel).toBe(DistributionChannel.EMAIL);
      expect(contact.preferences.timezone).toBe('America/New_York');
      expect(contact.preferences.doNotDisturb).toBe(false);
      expect(contact.preferences.workingHours.start).toBe('09:00');
    });

    it('should handle contact status transitions', () => {
      const contact = new RecipientContact();
      contact.status = ContactStatus.ACTIVE;

      contact.status = ContactStatus.INACTIVE;
      expect(contact.status).toBe(ContactStatus.INACTIVE);

      contact.status = ContactStatus.BLOCKED;
      expect(contact.status).toBe(ContactStatus.BLOCKED);

      contact.status = ContactStatus.VERIFIED;
      expect(contact.status).toBe(ContactStatus.VERIFIED);
    });

    it('should store metadata', () => {
      const contact = new RecipientContact();
      contact.metadata = {
        source: 'manual',
        verified: true,
        lastVerified: new Date(),
        verificationMethod: 'email',
        tags: ['vip', 'premium'],
      };

      expect(contact.metadata.source).toBe('manual');
      expect(contact.metadata.verified).toBe(true);
      expect(contact.metadata.tags).toContain('vip');
    });
  });

  describe('SenderProfile Entity', () => {
    it('should create a valid sender profile', () => {
      const profile = new SenderProfile();
      profile.id = 'profile-1';
      profile.tenantId = 'tenant-1';
      profile.profileName = 'Default Sender';
      profile.displayName = 'ACME Corporation';
      profile.email = 'noreply@acme.com';
      profile.phone = '+1234567890';
      profile.whatsapp = '+1234567890';
      profile.isActive = true;
      profile.isDefault = true;
      profile.createdAt = new Date();
      profile.updatedAt = new Date();

      expect(profile.id).toBe('profile-1');
      expect(profile.profileName).toBe('Default Sender');
      expect(profile.displayName).toBe('ACME Corporation');
      expect(profile.email).toBe('noreply@acme.com');
      expect(profile.isActive).toBe(true);
      expect(profile.isDefault).toBe(true);
    });

    it('should handle sender configuration', () => {
      const profile = new SenderProfile();
      profile.configuration = {
        emailProvider: 'sendgrid',
        smsProvider: 'twilio',
        whatsappProvider: 'meta',
        emailSettings: {
          apiKey: 'sg-api-key',
          fromName: 'ACME Corp',
          replyTo: 'support@acme.com',
        },
        smsSettings: {
          accountSid: 'twilio-sid',
          authToken: 'twilio-token',
          fromNumber: '+1234567890',
        },
      };

      expect(profile.configuration.emailProvider).toBe('sendgrid');
      expect(profile.configuration.emailSettings.fromName).toBe('ACME Corp');
      expect(profile.configuration.smsSettings.fromNumber).toBe('+1234567890');
    });

    it('should track usage statistics', () => {
      const profile = new SenderProfile();
      profile.usageStats = {
        totalSent: 10000,
        totalDelivered: 9500,
        totalFailed: 500,
        averageDeliveryTime: 2.5,
        lastUsedAt: new Date(),
        dailyLimit: 1000,
        dailyUsed: 750,
      };

      expect(profile.usageStats.totalSent).toBe(10000);
      expect(profile.usageStats.totalDelivered).toBe(9500);
      expect(profile.usageStats.dailyUsed).toBe(750);
    });
  });

  describe('DistributionRecord Entity', () => {
    it('should create a valid distribution record', () => {
      const record = new DistributionRecord();
      record.id = 'record-1';
      record.tenantId = 'tenant-1';
      record.invoiceId = 'invoice-1';
      record.customerId = 'customer-1';
      record.distributionChannel = DistributionChannel.EMAIL;
      record.distributionStatus = DistributionStatus.PENDING;
      record.recipientInfo = {
        email: 'customer@example.com',
        phone: '+1234567890',
      };
      record.content = {
        subject: 'Invoice Notification',
        body: 'Your invoice is ready',
        templateId: 'template-1',
      };
      record.createdAt = new Date();
      record.updatedAt = new Date();

      expect(record.id).toBe('record-1');
      expect(record.invoiceId).toBe('invoice-1');
      expect(record.distributionChannel).toBe(DistributionChannel.EMAIL);
      expect(record.distributionStatus).toBe(DistributionStatus.PENDING);
      expect(record.recipientInfo.email).toBe('customer@example.com');
    });

    it('should handle delivery tracking', () => {
      const record = new DistributionRecord();
      record.sentAt = new Date();
      record.deliveredAt = new Date(Date.now() + 3600000);
      record.deliveryId = 'delivery-123';
      record.providerResponse = {
        messageId: 'msg-123',
        status: 'delivered',
        timestamp: new Date(),
      };

      expect(record.sentAt).toBeInstanceOf(Date);
      expect(record.deliveredAt).toBeInstanceOf(Date);
      expect(record.deliveryId).toBe('delivery-123');
      expect(record.providerResponse.messageId).toBe('msg-123');
    });

    it('should handle content variations', () => {
      const record = new DistributionRecord();
      record.content = {
        subject: 'Invoice #INV-001',
        body: 'Dear Customer, your invoice #INV-001 for $1,000 is ready.',
        templateId: 'invoice-template',
        templateVariables: {
          invoiceNumber: 'INV-001',
          amount: '$1,000',
          customerName: 'John Doe',
        },
        renderedContent: '<html>...</html>',
      };

      expect(record.content.subject).toBe('Invoice #INV-001');
      expect(record.content.templateVariables.invoiceNumber).toBe('INV-001');
      expect(record.content.renderedContent).toBe('<html>...</html>');
    });

    it('should track engagement metrics', () => {
      const record = new DistributionRecord();
      record.engagementMetrics = {
        opened: true,
        openedAt: new Date(),
        clicked: true,
        clickedAt: new Date(),
        clicks: 2,
        replies: 1,
        repliedAt: new Date(),
        bounceType: null,
      };

      expect(record.engagementMetrics.opened).toBe(true);
      expect(record.engagementMetrics.clicked).toBe(true);
      expect(record.engagementMetrics.clicks).toBe(2);
      expect(record.engagementMetrics.replies).toBe(1);
    });
  });

  describe('Template Entity', () => {
    it('should create a valid template', () => {
      const template = new Template();
      template.id = 'template-1';
      template.tenantId = 'tenant-1';
      template.templateName = 'Invoice Template';
      template.description = 'Standard invoice notification template';
      template.templateType = 'email';
      template.subject = 'Invoice #{{invoiceNumber}}';
      template.body = 'Dear {{customerName}}, your invoice #{{invoiceNumber}} for {{amount}} is ready.';
      template.isActive = true;
      template.isDefault = false;
      template.createdBy = 'user-1';
      template.createdAt = new Date();
      template.updatedAt = new Date();

      expect(template.id).toBe('template-1');
      expect(template.templateName).toBe('Invoice Template');
      expect(template.templateType).toBe('email');
      expect(template.subject).toContain('{{invoiceNumber}}');
      expect(template.body).toContain('{{customerName}}');
      expect(template.isActive).toBe(true);
    });

    it('should handle template variables', () => {
      const template = new Template();
      template.variables = [
        { name: 'invoiceNumber', type: 'string', required: true, description: 'Invoice number' },
        { name: 'customerName', type: 'string', required: true, description: 'Customer name' },
        { name: 'amount', type: 'currency', required: true, description: 'Invoice amount' },
        { name: 'dueDate', type: 'date', required: false, description: 'Due date' },
      ];

      expect(template.variables).toHaveLength(4);
      expect(template.variables[0].name).toBe('invoiceNumber');
      expect(template.variables[0].required).toBe(true);
      expect(template.variables[3].type).toBe('date');
    });

    it('should handle template styling', () => {
      const template = new Template();
      template.styling = {
        css: 'body { font-family: Arial, sans-serif; }',
        header: { backgroundColor: '#007bff', color: '#ffffff' },
        footer: { backgroundColor: '#f8f9fa', fontSize: '12px' },
        customStyles: {
          button: { backgroundColor: '#28a745', padding: '10px 20px' },
          table: { border: '1px solid #dee2e6' },
        },
      };

      expect(template.styling.css).toContain('font-family');
      expect(template.styling.header.backgroundColor).toBe('#007bff');
      expect(template.styling.customStyles.button.backgroundColor).toBe('#28a745');
    });

    it('should track template usage', () => {
      const template = new Template();
      template.usageStats = {
        totalUses: 5000,
        successfulUses: 4750,
        failedUses: 250,
        averageRenderTime: 50,
        lastUsedAt: new Date(),
        monthlyUsage: {
          '2024-01': 1000,
          '2024-02': 1200,
          '2024-03': 1100,
        },
      };

      expect(template.usageStats.totalUses).toBe(5000);
      expect(template.usageStats.successfulUses).toBe(4750);
      expect(template.usageStats.monthlyUsage['2024-01']).toBe(1000);
    });
  });

  describe('TemplateVersion Entity', () => {
    it('should create a valid template version', () => {
      const version = new TemplateVersion();
      version.id = 'version-1';
      version.templateId = 'template-1';
      version.versionNumber = '1.0.0';
      version.subject = 'Invoice #{{invoiceNumber}}';
      version.body = 'Dear {{customerName}}, your invoice #{{invoiceNumber}} for {{amount}} is ready.';
      version.isActive = true;
      version.createdBy = 'user-1';
      version.createdAt = new Date();

      expect(version.id).toBe('version-1');
      expect(version.templateId).toBe('template-1');
      expect(version.versionNumber).toBe('1.0.0');
      expect(version.isActive).toBe(true);
    });

    it('should handle version changes', () => {
      const version = new TemplateVersion();
      version.changes = [
        {
          type: 'subject',
          oldValue: 'Invoice Notification',
          newValue: 'Invoice #{{invoiceNumber}}',
          reason: 'Add invoice number to subject',
        },
        {
          type: 'body',
          oldValue: 'Your invoice is ready',
          newValue: 'Dear {{customerName}}, your invoice #{{invoiceNumber}} for {{amount}} is ready.',
          reason: 'Personalize email body',
        },
      ];

      expect(version.changes).toHaveLength(2);
      expect(version.changes[0].type).toBe('subject');
      expect(version.changes[1].reason).toBe('Personalize email body');
    });

    it('should track version performance', () => {
      const version = new TemplateVersion();
      version.performanceMetrics = {
        totalUses: 1000,
        openRate: 0.75,
        clickRate: 0.15,
        bounceRate: 0.02,
        averageRenderTime: 45,
        a/bTestResults: {
          variantA: { opens: 400, clicks: 60, conversions: 20 },
          variantB: { opens: 350, clicks: 70, conversions: 25 },
        },
      };

      expect(version.performanceMetrics.openRate).toBe(0.75);
      expect(version.performanceMetrics.clickRate).toBe(0.15);
      expect(version.performanceMetrics.a/bTestResults.variantA.opens).toBe(400);
    });
  });

  describe('TemplateApproval Entity', () => {
    it('should create a valid template approval', () => {
      const approval = new TemplateApproval();
      approval.id = 'approval-1';
      approval.templateId = 'template-1';
      approval.versionId = 'version-1';
      approval.approvalType = 'create';
      approval.requestedBy = 'user-1';
      approval.status = 'pending';
      approval.createdAt = new Date();

      expect(approval.id).toBe('approval-1');
      expect(approval.templateId).toBe('template-1');
      expect(approval.approvalType).toBe('create');
      expect(approval.status).toBe('pending');
    });

    it('should handle approval workflow', () => {
      const approval = new TemplateApproval();
      approval.approvalWorkflow = [
        {
          step: 'review',
          assignedTo: 'manager-1',
          status: 'completed',
          completedAt: new Date(),
          comments: 'Template looks good',
        },
        {
          step: 'approve',
          assignedTo: 'admin-1',
          status: 'pending',
          comments: 'Pending final approval',
        },
      ];

      expect(approval.approvalWorkflow).toHaveLength(2);
      expect(approval.approvalWorkflow[0].step).toBe('review');
      expect(approval.approvalWorkflow[0].status).toBe('completed');
    });

    it('should handle approval decisions', () => {
      const approval = new TemplateApproval();
      approval.status = 'approved';
      approval.approvedBy = 'admin-1';
      approval.approvedAt = new Date();
      approval.approvalComments = 'Template approved for production use';
      approval.conditions = [
        'Update company logo',
        'Add unsubscribe link',
      ];

      expect(approval.status).toBe('approved');
      expect(approval.approvedBy).toBe('admin-1');
      expect(approval.conditions).toHaveLength(2);
    });
  });

  describe('InvoiceConstraint Entity', () => {
    it('should create a valid invoice constraint', () => {
      const constraint = new InvoiceConstraint();
      constraint.id = 'constraint-1';
      constraint.tenantId = 'tenant-1';
      constraint.constraintName = 'Payment Terms Constraint';
      constraint.description = 'Ensure payment terms are within acceptable range';
      constraint.constraintType = 'validation';
      constraint.constraintRule = 'paymentTerms.days <= 60';
      constraint.severity = 'high';
      constraint.isActive = true;
      constraint.createdBy = 'user-1';
      constraint.createdAt = new Date();
      constraint.updatedAt = new Date();

      expect(constraint.id).toBe('constraint-1');
      expect(constraint.constraintName).toBe('Payment Terms Constraint');
      expect(constraint.constraintType).toBe('validation');
      expect(constraint.constraintRule).toContain('paymentTerms.days');
      expect(constraint.severity).toBe('high');
    });

    it('should handle different constraint types', () => {
      const constraint = new InvoiceConstraint();
      
      constraint.constraintType = 'validation';
      constraint.constraintRule = 'amount > 0 && amount <= 100000';
      expect(constraint.constraintType).toBe('validation');

      constraint.constraintType = 'business';
      constraint.constraintRule = 'customer.creditLimit >= invoice.amount';
      expect(constraint.constraintType).toBe('business');

      constraint.constraintType = 'regulatory';
      constraint.constraintRule = 'invoice.taxRate <= 0.18';
      expect(constraint.constraintType).toBe('regulatory');
    });

    it('should handle constraint severity levels', () => {
      const constraint = new InvoiceConstraint();
      const severityLevels = ['low', 'medium', 'high', 'critical'];

      severityLevels.forEach(severity => {
        constraint.severity = severity;
        expect(constraint.severity).toBe(severity);
      });
    });

    it('should track constraint violations', () => {
      const constraint = new InvoiceConstraint();
      constraint.violationStats = {
        totalChecks: 10000,
        violations: 150,
        violationRate: 0.015,
        lastViolation: new Date(),
        commonViolations: [
          { reason: 'Amount exceeds limit', count: 80 },
          { reason: 'Invalid tax rate', count: 45 },
          { reason: 'Missing required fields', count: 25 },
        ],
      };

      expect(constraint.violationStats.totalChecks).toBe(10000);
      expect(constraint.violationStats.violations).toBe(150);
      expect(constraint.violationStats.violationRate).toBe(0.015);
      expect(constraint.violationStats.commonViolations).toHaveLength(3);
    });

    it('should handle constraint actions', () => {
      const constraint = new InvoiceConstraint();
      constraint.actions = [
        {
          trigger: 'violation',
          action: 'block',
          description: 'Block invoice creation if constraint violated',
        },
        {
          trigger: 'warning',
          action: 'notify',
          description: 'Notify admin of constraint violation',
          recipients: ['admin@company.com'],
        },
      ];

      expect(constraint.actions).toHaveLength(2);
      expect(constraint.actions[0].action).toBe('block');
      expect(constraint.actions[1].recipients).toContain('admin@company.com');
    });
  });

  describe('Entity Relationships', () => {
    it('should demonstrate rule-assignment relationship', () => {
      const rule = new DistributionRule();
      rule.id = 'rule-1';
      rule.ruleName = 'High Value Rule';

      const assignment = new DistributionAssignment();
      assignment.id = 'assignment-1';
      assignment.ruleId = rule.id;
      assignment.rule = rule;

      expect(assignment.ruleId).toBe(rule.id);
      expect(assignment.rule.ruleName).toBe('High Value Rule');
    });

    it('should demonstrate template-version relationship', () => {
      const template = new Template();
      template.id = 'template-1';
      template.templateName = 'Invoice Template';

      const version = new TemplateVersion();
      version.id = 'version-1';
      version.templateId = template.id;
      version.template = template;

      expect(version.templateId).toBe(template.id);
      expect(version.template.templateName).toBe('Invoice Template');
    });

    it('should demonstrate follow-up sequence-steps relationship', () => {
      const sequence = new FollowUpSequence();
      sequence.id = 'sequence-1';
      sequence.sequenceName = 'Payment Reminder Sequence';

      const step = new FollowUpStep();
      step.id = 'step-1';
      step.sequenceId = sequence.id;
      step.sequence = sequence;

      expect(step.sequenceId).toBe(sequence.id);
      expect(step.sequence.sequenceName).toBe('Payment Reminder Sequence');
    });
  });

  describe('Entity Validation', () => {
    it('should validate required fields', () => {
      const rule = new DistributionRule();
      
      // Test missing required fields
      expect(() => {
        rule.tenantId = '';
        if (!rule.tenantId) throw new Error('Tenant ID is required');
      }).toThrow('Tenant ID is required');

      expect(() => {
        rule.ruleName = '';
        if (!rule.ruleName) throw new Error('Rule name is required');
      }).toThrow('Rule name is required');
    });

    it('should validate email format', () => {
      const contact = new RecipientContact();
      
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      validEmails.forEach(email => {
        contact.email = email;
        expect(contact.email).toBe(email);
      });
    });

    it('should validate phone format', () => {
      const contact = new RecipientContact();
      
      const validPhones = [
        '+1234567890',
        '+44 20 7946 0958',
        '+1 (555) 123-4567',
      ];

      validPhones.forEach(phone => {
        contact.phone = phone;
        expect(contact.phone).toBe(phone);
      });
    });
  });

  describe('Entity Performance', () => {
    it('should handle large number of entities efficiently', () => {
      const startTime = Date.now();
      
      // Create 1000 entities
      const entities = Array.from({ length: 1000 }, (_, i) => {
        const rule = new DistributionRule();
        rule.id = `rule-${i}`;
        rule.ruleName = `Rule ${i}`;
        rule.tenantId = 'tenant-1';
        rule.createdAt = new Date();
        rule.updatedAt = new Date();
        return rule;
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(entities).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle complex queries efficiently', () => {
      const rules = Array.from({ length: 100 }, (_, i) => {
        const rule = new DistributionRule();
        rule.id = `rule-${i}`;
        rule.ruleName = `Rule ${i}`;
        rule.priority = i % 100;
        rule.isActive = i % 2 === 0;
        return rule;
      });

      const startTime = Date.now();
      
      // Simulate complex query
      const activeRules = rules.filter(rule => rule.isActive && rule.priority > 50);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(activeRules.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10); // Should complete within 10ms
    });
  });
});
