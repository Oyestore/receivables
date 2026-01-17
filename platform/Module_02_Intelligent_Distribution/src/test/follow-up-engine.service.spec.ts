import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUpEngineService } from '../services/follow-up-engine.service';
import { FollowUpRule, TriggerType } from '../entities/follow-up-rule.entity';
import { FollowUpSequence } from '../entities/follow-up-sequence.entity';
import { FollowUpStep } from '../entities/follow-up-step.entity';

// Mock DistributionService
const mockDistributionService = {
  distributeInvoice: jest.fn(),
};

describe('FollowUpEngineService', () => {
  let service: FollowUpEngineService;
  let followUpRuleRepository: Repository<FollowUpRule>;
  let followUpSequenceRepository: Repository<FollowUpSequence>;
  let followUpStepRepository: Repository<FollowUpStep>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [FollowUpRule, FollowUpSequence, FollowUpStep],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([FollowUpRule, FollowUpSequence, FollowUpStep]),
      ],
      providers: [
        FollowUpEngineService,
        {
          provide: 'DistributionService',
          useValue: mockDistributionService,
        },
      ],
    }).compile();

    service = module.get<FollowUpEngineService>(FollowUpEngineService);
    followUpRuleRepository = module.get<Repository<FollowUpRule>>(Repository<FollowUpRule);
    followUpSequenceRepository = module.get<Repository<FollowUpSequence>>(Repository<FollowUpSequence>);
    followUpStepRepository = module.get<Repository<FollowUpStep>>(Repository<FollowUpStep>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rule Evaluation Logic', () => {
    it('should evaluate before due date rules correctly', async () => {
      // Create a rule that triggers 3 days before due date
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Before Due Date Rule',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 3,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        recipientId: 'customer-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-02-15'),
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      };

      // Set today to 3 days before due date
      const today = new Date('2024-02-12');
      
      const shouldTrigger = service['shouldTriggerRule'](rule, invoiceData.dueDate, today, invoiceData.status);
      
      expect(shouldTrigger).toBe(true);
    });

    it('should evaluate on due date rules correctly', async () => {
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'On Due Date Rule',
        triggerType: TriggerType.ON_DUE,
        daysOffset: 0,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        recipientId: 'customer-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-02-15'),
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      };

      const today = new Date('2024-02-15');
      
      const shouldTrigger = service['shouldTriggerRule'](rule, invoiceData.dueDate, today, invoiceData.status);
      
      expect(shouldTrigger).toBe(true);
    });

    it('should evaluate after due date rules correctly', async () => {
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'After Due Date Rule',
        triggerType: TriggerType.AFTER_DUE,
        daysOffset: 7,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        recipientId: 'customer-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-02-15'),
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      };

      const today = new Date('2024-02-22');
      
      const shouldTrigger = service['shouldTriggerRule'](rule, invoiceData.dueDate, today, invoiceData.status);
      
      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger rules for paid invoices', async () => {
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Before Due Date Rule',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 3,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        recipientId: 'customer-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-02-15'),
        amount: 5000,
        status: 'PAID', // Paid invoice
        createdAt: new Date('2024-01-01'),
      };

      const today = new Date('2024-02-12');
      
      const shouldTrigger = service['shouldTriggerRule'](rule, invoiceData.dueDate, today, invoiceData.status);
      
      expect(shouldTrigger).toBe(false);
    });

    it('should handle event-based triggers', async () => {
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Event-based Rule',
        triggerType: TriggerType.ON_EVENT,
        daysOffset: 0,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        recipientId: 'customer-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-02-15'),
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      };

      const today = new Date('2024-02-12');
      
      const shouldTrigger = service['shouldTriggerRule'](rule, invoiceData.dueDate, today, invoiceData.status);
      
      expect(shouldTrigger).toBe(false); // Event-based rules not implemented yet
    });

    it('should handle unknown trigger types', async () => {
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Unknown Rule',
        triggerType: 'unknown' as TriggerType,
        daysOffset: 0,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        recipientId: 'customer-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-02-15'),
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      };

      const today = new Date('2024-02-12');
      
      const shouldTrigger = service['shouldTriggerRule'](rule, invoiceData.dueDate, today, invoiceData.status);
      
      expect(shouldTrigger).toBe(false);
    });
  });

  describe('Sequence Execution', () => {
    it('should execute follow-up sequences', async () => {
      // Create a sequence with steps
      const sequence = await followUpSequenceRepository.save({
        organizationId: 'org-1',
        name: 'Test Sequence',
        description: 'Test sequence for follow-up',
        isActive: true,
      });

      // Create steps for the sequence
      const step1 = await followUpStepRepository.save({
        sequenceId: sequence.id,
        stepNumber: 1,
        ruleId: 'rule-1',
        delayDays: 0,
        isActive: true,
      });

      const step2 = await followUpStepRepository.save({
        sequenceId: sequence.id,
        stepNumber: 2,
        ruleId: 'rule-2',
        delayDays: 3,
        isActive: true,
      });

      const result = await service.getFollowUpSequence(sequence.id, 'org-1');
      
      expect(result).toBeDefined();
      expect(result.id).toBe(sequence.id);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].stepNumber).toBe(1);
      expect(result.steps[1].stepNumber).toBe(2);
    });

    it('should apply sequence to invoice', async () => {
      // Create a sequence with steps
      const sequence = await followUpSequenceRepository.save({
        organizationId: 'org-1',
        name: 'Test Sequence',
        description: 'Test sequence for follow-up',
        isActive: true,
      });

      await followUpStepRepository.save({
        sequenceId: sequence.id,
        stepNumber: 1,
        ruleId: 'rule-1',
        delayDays: 0,
        isActive: true,
      });

      const consoleSpy = jest.spy(console, 'log');
      
      await service.applySequenceToInvoice(
        sequence.id,
        'invoice-1',
        'customer-1',
        'org-1'
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled follow-up for invoice invoice-1')
      );
    });

    it('should handle non-existent sequence', async () => {
      await expect(service.getFollowUpSequence('non-existent', 'org-1'))
        .rejects.toThrow('Follow-up sequence with ID non-existent not found');
    });

    it('should handle sequence application with non-existent sequence', async () => {
      await expect(service.applySequenceToInvoice('non-existent', 'invoice-1', 'customer-1', 'org-1'))
        .rejects.toThrow('Follow-up sequence with ID non-existent not found');
    });
  });

  describe('Follow-up Processing', () => {
    it('should process follow-ups for multiple invoices', async () => {
      // Create rules
      await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Before Due Date Rule',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 3,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'On Due Date Rule',
        triggerType: TriggerType.ON_DUE,
        daysOffset: 0,
        channel: 'email',
        templateId: 'template-2',
        isActive: true,
      });

      const invoices = [
        {
          id: 'invoice-1',
          recipientId: 'customer-1',
          organizationId: 'org-1',
          dueDate: new Date('2024-02-15'),
          amount: 5000,
          status: 'PENDING',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'invoice-2',
          recipientId: 'customer-2',
          organizationId: 'org-1',
          dueDate: new Date('2024-02-20'),
          amount: 3000,
          status: 'PENDING',
          createdAt: new Date('2024-01-05'),
        },
      ];

      const consoleSpy = jest.spy(console, 'log');
      
      await service.processFollowUps(invoices);
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });

    it('should process follow-up for single invoice', async () => {
      await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Before Due Date Rule',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 3,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        recipientId: 'customer-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-02-15'),
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      };

      const consoleSpy = jest.spy(console, 'log');
      
      await service.processInvoiceFollowUps(invoiceData);
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should find applicable rules for invoice', async () => {
      // Create multiple rules for the organization
      await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Rule 1',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 3,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Rule 2',
        triggerType: TriggerType.ON_DUE,
        daysOffset: 0,
        channel: 'sms',
        templateId: 'template-2',
        isActive: true,
      });

      await followUpRuleRepository.save({
        organizationId: 'org-2', // Different organization
        ruleName: 'Rule 3',
        triggerType: TriggerType.AFTER_DUE,
        daysOffset: 7,
        channel: 'email',
        templateId: 'template-3',
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        organizationId: 'org-1',
        status: 'PENDING',
      };

      const rules = await service['findApplicableRules'](invoiceData);
      
      expect(rules).toHaveLength(2);
      expect(rules[0].organizationId).toBe('org-1');
      expect(rules[1].organizationId).toBe('org-1');
    });

    it('should trigger follow-up communication', async () => {
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Test Rule',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 3,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const consoleSpy = jest.spy(console, 'log');
      
      await service['triggerFollowUp'](rule, 'invoice-1', 'customer-1', 'org-1');
      
      expect(mockDistributionService.distributeInvoice).toHaveBeenCalledWith(
        'invoice-1',
        'customer-1',
        'email',
        'template-1',
        undefined,
        undefined,
        'org-1',
        2
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Triggered follow-up for invoice invoice-1 using rule ' + rule.id
      );
    });

    it('should handle follow-up trigger errors', async () => {
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Test Rule',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 3,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      // Mock distribution service to throw error
      mockDistributionService.distributeInvoice.mockRejectedValueOnce(new Error('Distribution failed'));

      const consoleSpy = jest.spy(console, 'error');
      
      await service['triggerFollowUp'](rule, 'invoice-1', 'customer-1', 'org-1');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to trigger follow-up for invoice invoice-1:',
        expect.any(Error)
      );
    });
  });

  describe('Date Calculations', () => {
    it('should handle time zone conversions correctly', async () => {
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Before Due Date Rule',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 3,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        recipientId: 'customer-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-02-15T23:59:59Z'), // End of day
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      };

      const today = new Date('2024-02-12T00:00:00Z'); // Start of day
      
      const shouldTrigger = service['shouldTriggerRule'](rule, invoiceData.dueDate, today, invoiceData.status);
      
      expect(shouldTrigger).toBe(true);
    });

    it('should handle leap years correctly', async () => {
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Before Due Date Rule',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 1,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        recipientId: 'customer-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-03-01'), // Leap year
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      };

      const today = new Date('2024-02-29'); // Leap day
      
      const shouldTrigger = service['shouldTriggerRule'](rule, invoiceData.dueDate, today, invoiceData.status);
      
      expect(shouldTrigger).toBe(true);
    });

    it('should handle month boundaries correctly', async () => {
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Before Due Date Rule',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 1,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        recipientId: 'customer-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-03-01'), // First day of month
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      };

      const today = new Date('2024-02-29'); // Last day of previous month
      
      const shouldTrigger = service['shouldTriggerRule'](rule, invoiceData.dueDate, today, invoiceData.status);
      
      expect(shouldTrigger).toBe(true);
    });
  });

  describe('Sequence Management', () => {
    it('should get all follow-up sequences for organization', async () => {
      // Create sequences for different organizations
      await followUpSequenceRepository.save({
        organizationId: 'org-1',
        name: 'Sequence 1',
        description: 'First sequence',
        isActive: true,
      });

      await followUpSequenceRepository.save({
        organizationId: 'org-1',
        name: 'Sequence 2',
        description: 'Second sequence',
        isActive: true,
      });

      await followUpSequenceRepository.save({
        organizationId: 'org-2',
        name: 'Sequence 3',
        description: 'Third sequence',
        isActive: true,
      });

      const sequences = await service.getFollowUpSequences('org-1');
      
      expect(sequences).toHaveLength(2);
      expect(sequences[0].organizationId).toBe('org-1');
      expect(sequences[1].organizationId).toBe('org-1');
    });

    it('should return empty array for organization with no sequences', async () => {
      const sequences = await service.getFollowUpSequences('non-existent-org');
      
      expect(sequences).toHaveLength(0);
    });

    it('should sort sequences by name', async () => {
      await followUpSequenceRepository.save({
        organizationId: 'org-1',
        name: 'Z Sequence',
        description: 'Last sequence',
        isActive: true,
      });

      await followUpSequenceRepository.save({
        organizationId: 'org-1',
        name: 'A Sequence',
        description: 'First sequence',
        isActive: true,
      });

      await followUpSequenceRepository.save({
        organizationId: 'org-1',
        name: 'M Sequence',
        description: 'Middle sequence',
        isActive: true,
      });

      const sequences = await service.getFollowUpSequences('org-1');
      
      expect(sequences).toHaveLength(3);
      expect(sequences[0].name).toBe('A Sequence');
      expect(sequences[1].name).toBe('M Sequence');
      expect(sequences[2].name).toBe('Z Sequence');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock repository to throw error
      jest.spyOn(followUpRuleRepository, 'find').mockRejectedValueOnce(new Error('Database error'));

      const invoiceData = {
        id: 'invoice-1',
        organizationId: 'org-1',
        status: 'PENDING',
      };

      await expect(service['findApplicableRules'](invoiceData))
        .rejects.toThrow('Database error');
    });

    it('should handle invalid invoice data', async () => {
      const invalidInvoiceData = {
        id: '',
        recipientId: '',
        organizationId: '',
        dueDate: new Date(),
        amount: 0,
        status: '',
        createdAt: new Date(),
      };

      // Should not throw, but handle gracefully
      const rules = await service['findApplicableRules'](invalidInvoiceData);
      
      expect(rules).toBeDefined();
    });

    it('should handle missing rule properties', async () => {
      const rule = await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Incomplete Rule',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 3,
        // Missing channel and templateId
        isActive: true,
      });

      const invoiceData = {
        id: 'invoice-1',
        recipientId: 'customer-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-02-15'),
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      };

      const today = new Date('2024-02-12');
      
      const shouldTrigger = service['shouldTriggerRule'](rule, invoiceData.dueDate, today, invoiceData.status);
      
      expect(shouldTrigger).toBe(true); // Should still work
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of invoices efficiently', async () => {
      // Create multiple rules
      for (let i = 0; i < 10; i++) {
        await followUpRuleRepository.save({
          organizationId: 'org-1',
          ruleName: `Rule ${i}`,
          triggerType: TriggerType.BEFORE_DUE,
          daysOffset: i,
          channel: 'email',
          templateId: `template-${i}`,
          isActive: true,
        });
      }

      // Create large number of invoices
      const invoices = Array(1000).fill(null).map((_, index) => ({
        id: `invoice-${index}`,
        recipientId: `customer-${index}`,
        organizationId: 'org-1',
        dueDate: new Date('2024-02-15'),
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      }));

      const startTime = Date.now();
      await service.processFollowUps(invoices);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent processing', async () => {
      await followUpRuleRepository.save({
        organizationId: 'org-1',
        ruleName: 'Concurrent Rule',
        triggerType: TriggerType.BEFORE_DUE,
        daysOffset: 3,
        channel: 'email',
        templateId: 'template-1',
        isActive: true,
      });

      const invoices = Array(100).fill(null).map((_, index) => ({
        id: `invoice-${index}`,
        recipientId: `customer-${index}`,
        organizationId: 'org-1',
        dueDate: new Date('2024-02-15'),
        amount: 5000,
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
      }));

      const promises = invoices.map(invoice => service.processInvoiceFollowUps(invoice));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
    });
  });
});
