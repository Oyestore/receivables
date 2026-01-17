import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceEntity } from '../invoice.entity';
import { InvoiceLineItemEntity } from '../invoice-line-item.entity';
import { InvoiceTemplateEntity } from '../invoice-template.entity';
import { InvoiceTemplateVersionEntity } from '../invoice-template-version.entity';
import { QualityCheckEntity } from '../entities/quality-check.entity';
import { QualityCheckDetailEntity } from '../entities/quality-check-detail.entity';
import { ABTestEntity } from '../entities/ab-test.entity';
import { ABTestVariantEntity } from '../entities/ab-test-variant.entity';
import { AutoFixEntity } from '../entities/auto-fix.entity';
import { PersonalizationRuleEntity } from '../entities/personalization-rule.entity';
import { TemplateOptimizationEntity } from '../entities/template-optimization.entity';
import { InvoiceConstraintEntity } from '../entities/invoice-constraint.entity';

describe('Module 01 Entity Tests - Complete Coverage', () => {
  let invoiceRepository: Repository<InvoiceEntity>;
  let lineItemRepository: Repository<InvoiceLineItemEntity>;
  let templateRepository: Repository<InvoiceTemplateEntity>;
  let templateVersionRepository: Repository<InvoiceTemplateVersionEntity>;
  let qualityCheckRepository: Repository<QualityCheckEntity>;
  let qualityCheckDetailRepository: Repository<QualityCheckDetailEntity>;
  let abTestRepository: Repository<ABTestEntity>;
  let abTestVariantRepository: Repository<ABTestVariantEntity>;
  let autoFixRepository: Repository<AutoFixEntity>;
  let personalizationRuleRepository: Repository<PersonalizationRuleEntity>;
  let templateOptimizationRepository: Repository<TemplateOptimizationEntity>;
  let invoiceConstraintRepository: Repository<InvoiceConstraintEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(InvoiceEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InvoiceLineItemEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InvoiceTemplateEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InvoiceTemplateVersionEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(QualityCheckEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(QualityCheckDetailEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ABTestEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ABTestVariantEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AutoFixEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PersonalizationRuleEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TemplateOptimizationEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InvoiceConstraintEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    invoiceRepository = module.get<Repository<InvoiceEntity>>(getRepositoryToken(InvoiceEntity));
    lineItemRepository = module.get<Repository<InvoiceLineItemEntity>>(getRepositoryToken(InvoiceLineItemEntity));
    templateRepository = module.get<Repository<InvoiceTemplateEntity>>(getRepositoryToken(InvoiceTemplateEntity));
    templateVersionRepository = module.get<Repository<InvoiceTemplateVersionEntity>>(getRepositoryToken(InvoiceTemplateVersionEntity));
    qualityCheckRepository = module.get<Repository<QualityCheckEntity>>(getRepositoryToken(QualityCheckEntity));
    qualityCheckDetailRepository = module.get<Repository<QualityCheckDetailEntity>>(getRepositoryToken(QualityCheckDetailEntity));
    abTestRepository = module.get<Repository<ABTestEntity>>(getRepositoryToken(ABTestEntity));
    abTestVariantRepository = module.get<Repository<ABTestVariantEntity>>(getRepositoryToken(ABTestVariantEntity));
    autoFixRepository = module.get<Repository<AutoFixEntity>>(getRepositoryToken(AutoFixEntity));
    personalizationRuleRepository = module.get<Repository<PersonalizationRuleEntity>>(getRepositoryToken(PersonalizationRuleEntity));
    templateOptimizationRepository = module.get<Repository<TemplateOptimizationEntity>>(getRepositoryToken(TemplateOptimizationEntity));
    invoiceConstraintRepository = module.get<Repository<InvoiceConstraintEntity>>(getRepositoryToken(InvoiceConstraintEntity));
  });

  describe('InvoiceEntity Tests', () => {
    it('should create a valid invoice entity', () => {
      const invoice = new InvoiceEntity();
      invoice.id = 'invoice-1';
      invoice.invoiceNumber = 'INV-001';
      invoice.customerName = 'Test Customer';
      invoice.customerEmail = 'test@example.com';
      invoice.total = 1000;
      invoice.subtotal = 850;
      invoice.taxAmount = 150;
      invoice.status = 'draft';
      invoice.date = new Date();
      invoice.dueDate = new Date();
      invoice.tenantId = 'tenant-1';
      invoice.createdBy = 'user-1';

      expect(invoice.id).toBe('invoice-1');
      expect(invoice.invoiceNumber).toBe('INV-001');
      expect(invoice.total).toBe(1000);
      expect(invoice.status).toBe('draft');
    });

    it('should validate invoice status transitions', () => {
      const invoice = new InvoiceEntity();
      invoice.id = 'invoice-1';
      invoice.status = 'draft';

      // Test valid transitions
      expect(invoice.canTransitionTo('sent')).toBe(true);
      expect(invoice.canTransitionTo('cancelled')).toBe(true);
      
      // Test invalid transitions
      expect(invoice.canTransitionTo('paid')).toBe(false);
      expect(invoice.canTransitionTo('refunded')).toBe(false);
    });

    it('should calculate overdue status', () => {
      const invoice = new InvoiceEntity();
      invoice.id = 'invoice-1';
      invoice.status = 'sent';
      invoice.dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

      expect(invoice.isOverdue()).toBe(true);
    });

    it('should handle line items relationship', async () => {
      const invoice = new InvoiceEntity();
      invoice.id = 'invoice-1';
      invoice.lineItems = [
        {
          id: 'item-1',
          description: 'Test Item',
          quantity: 1,
          unitPrice: 1000,
          totalPrice: 1000,
          taxRate: 0.18,
          taxAmount: 180,
        },
      ];

      expect(invoice.lineItems).toHaveLength(1);
      expect(invoice.lineItems[0].description).toBe('Test Item');
    });
  });

  describe('InvoiceLineItemEntity Tests', () => {
    it('should create a valid line item entity', () => {
      const lineItem = new InvoiceLineItemEntity();
      lineItem.id = 'item-1';
      lineItem.invoiceId = 'invoice-1';
      lineItem.description = 'Test Item';
      lineItem.quantity = 2;
      lineItem.unitPrice = 500;
      lineItem.totalPrice = 1000;
      lineItem.taxRate = 0.18;
      lineItem.taxAmount = 180;
      lineItem.hsnCode = '1234';
      lineItem.sacCode = '5678';

      expect(lineItem.id).toBe('item-1');
      expect(lineItem.description).toBe('Test Item');
      expect(lineItem.totalPrice).toBe(1000);
      expect(lineItem.taxAmount).toBe(180);
    });

    it('should validate line item calculations', () => {
      const lineItem = new InvoiceLineItemEntity();
      lineItem.quantity = 2;
      lineItem.unitPrice = 500;
      lineItem.taxRate = 0.18;

      const calculatedTotal = lineItem.calculateTotal();
      const calculatedTax = lineItem.calculateTax();

      expect(calculatedTotal).toBe(1000);
      expect(calculatedTax).toBe(180);
    });

    it('should validate HSN/SAC codes', () => {
      const lineItem = new InvoiceLineItemEntity();
      lineItem.hsnCode = '1234';
      lineItem.sacCode = '5678';

      expect(lineItem.hasValidHSNCode()).toBe(true);
      expect(lineItem.hasValidSACCode()).toBe(true);
    });
  });

  describe('InvoiceTemplateEntity Tests', () => {
    it('should create a valid template entity', () => {
      const template = new InvoiceTemplateEntity();
      template.id = 'template-1';
      template.name = 'Standard Template';
      template.description = 'Standard invoice template';
      template.templateDefinition = {
        components: [
          {
            type: 'header',
            content: '<h1>{{companyName}}</h1>',
            styles: { color: '#333' },
          },
        ],
        styles: {
          body: { fontFamily: 'Arial' },
        },
      };
      template.isActive = true;
      template.tenantId = 'tenant-1';
      template.createdBy = 'user-1';

      expect(template.id).toBe('template-1');
      expect(template.name).toBe('Standard Template');
      expect(template.isActive).toBe(true);
    });

    it('should validate template structure', () => {
      const template = new InvoiceTemplateEntity();
      template.templateDefinition = {
        components: [
          { type: 'header', content: 'Header', styles: {} },
          { type: 'body', content: 'Body', styles: {} },
        ],
        styles: {},
      };

      expect(template.isValidStructure()).toBe(true);
      expect(template.hasRequiredComponents()).toBe(true);
    });

    it('should handle template versioning', () => {
      const template = new InvoiceTemplateEntity();
      template.currentVersion = 2;
      template.versions = [
        { version: 1, createdAt: new Date(Date.now() - 86400000) },
        { version: 2, createdAt: new Date() },
      ];

      expect(template.getCurrentVersion()).toBe(2);
      expect(template.getVersionHistory()).toHaveLength(2);
    });
  });

  describe('QualityCheckEntity Tests', () => {
    it('should create a valid quality check entity', () => {
      const qualityCheck = new QualityCheckEntity();
      qualityCheck.id = 'qc-1';
      qualityCheck.invoiceId = 'invoice-1';
      qualityCheck.score = 95;
      qualityCheck.status = 'passed';
      qualityCheck.checkType = 'comprehensive';
      qualityCheck.tenantId = 'tenant-1';
      qualityCheck.createdBy = 'user-1';

      expect(qualityCheck.id).toBe('qc-1');
      expect(qualityCheck.score).toBe(95);
      expect(qualityCheck.status).toBe('passed');
    });

    it('should validate quality score ranges', () => {
      const qualityCheck = new QualityCheckEntity();
      qualityCheck.score = 95;

      expect(qualityCheck.isHighQuality()).toBe(true);
      expect(qualityCheck.isMediumQuality()).toBe(false);
      expect(qualityCheck.isLowQuality()).toBe(false);
    });

    it('should handle quality check details', () => {
      const qualityCheck = new QualityCheckEntity();
      qualityCheck.details = [
        {
          id: 'detail-1',
          checkType: 'validation',
          status: 'passed',
          message: 'All validations passed',
        },
      ];

      expect(qualityCheck.details).toHaveLength(1);
      expect(qualityCheck.getPassedChecks()).toHaveLength(1);
      expect(qualityCheck.getFailedChecks()).toHaveLength(0);
    });
  });

  describe('ABTestEntity Tests', () => {
    it('should create a valid A/B test entity', () => {
      const abTest = new ABTestEntity();
      abTest.id = 'ab-1';
      abTest.name = 'Template A/B Test';
      abTest.description = 'Testing template effectiveness';
      abTest.status = 'running';
      abTest.startDate = new Date();
      abTest.endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      abTest.tenantId = 'tenant-1';
      abTest.createdBy = 'user-1';

      expect(abTest.id).toBe('ab-1');
      expect(abTest.name).toBe('Template A/B Test');
      expect(abTest.status).toBe('running');
    });

    it('should validate A/B test status', () => {
      const abTest = new ABTestEntity();
      abTest.status = 'running';
      abTest.startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      abTest.endDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      expect(abTest.isActive()).toBe(true);
      expect(abTest.isCompleted()).toBe(false);
    });

    it('should calculate test duration', () => {
      const abTest = new ABTestEntity();
      abTest.startDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      abTest.endDate = new Date();

      const duration = abTest.getDuration();
      expect(duration).toBe(2 * 24 * 60 * 60 * 1000);
    });
  });

  describe('AutoFixEntity Tests', () => {
    it('should create a valid auto-fix entity', () => {
      const autoFix = new AutoFixEntity();
      autoFix.id = 'fix-1';
      autoFix.invoiceId = 'invoice-1';
      autoFix.fixType = 'calculation';
      autoFix.description = 'Fixed total calculation';
      autoFix.status = 'applied';
      autoFix.originalValue = 1000;
      autoFix.fixedValue = 1180;
      autoFix.tenantId = 'tenant-1';
      autoFix.createdBy = 'system';

      expect(autoFix.id).toBe('fix-1');
      expect(autoFix.fixType).toBe('calculation');
      expect(autoFix.status).toBe('applied');
    });

    it('should validate fix impact', () => {
      const autoFix = new AutoFixEntity();
      autoFix.originalValue = 1000;
      autoFix.fixedValue = 1180;

      expect(autoFix.hasImpact()).toBe(true);
      expect(autoFix.getImpactPercentage()).toBe(18);
    });

    it('should handle fix status transitions', () => {
      const autoFix = new AutoFixEntity();
      autoFix.status = 'pending';

      expect(autoFix.canApply()).toBe(true);
      expect(autoFix.canRevert()).toBe(false);

      autoFix.status = 'applied';
      expect(autoFix.canApply()).toBe(false);
      expect(autoFix.canRevert()).toBe(true);
    });
  });

  describe('PersonalizationRuleEntity Tests', () => {
    it('should create a valid personalization rule entity', () => {
      const rule = new PersonalizationRuleEntity();
      rule.id = 'rule-1';
      rule.name = 'Customer Type Rule';
      rule.description = 'Personalize based on customer type';
      rule.ruleType = 'customer_segment';
      rule.conditions = {
        customerType: 'premium',
        invoiceAmount: { min: 5000 },
      };
      rule.actions = {
        templateId: 'premium-template',
        priority: 'high',
      };
      rule.isActive = true;
      rule.tenantId = 'tenant-1';

      expect(rule.id).toBe('rule-1');
      expect(rule.ruleType).toBe('customer_segment');
      expect(rule.isActive).toBe(true);
    });

    it('should evaluate rule conditions', () => {
      const rule = new PersonalizationRuleEntity();
      rule.conditions = {
        customerType: 'premium',
        invoiceAmount: { min: 5000 },
      };

      const context = {
        customerType: 'premium',
        invoiceAmount: 6000,
      };

      expect(rule.evaluateCondition(context)).toBe(true);
    });

    it('should apply rule actions', () => {
      const rule = new PersonalizationRuleEntity();
      rule.actions = {
        templateId: 'premium-template',
        priority: 'high',
      };

      const result = rule.applyActions({});
      expect(result.templateId).toBe('premium-template');
      expect(result.priority).toBe('high');
    });
  });

  describe('TemplateOptimizationEntity Tests', () => {
    it('should create a valid template optimization entity', () => {
      const optimization = new TemplateOptimizationEntity();
      optimization.id = 'opt-1';
      optimization.templateId = 'template-1';
      optimization.optimizationType = 'performance';
      optimization.description = 'Optimize template performance';
      optimization.metrics = {
        conversionRate: 0.85,
        averagePaymentTime: 15,
        customerSatisfaction: 4.5,
      };
      optimization.recommendations = [
        'Improve layout',
        'Add branding',
      ];
      optimization.status = 'pending';
      optimization.tenantId = 'tenant-1';

      expect(optimization.id).toBe('opt-1');
      expect(optimization.optimizationType).toBe('performance');
      expect(optimization.status).toBe('pending');
    });

    it('should calculate optimization score', () => {
      const optimization = new TemplateOptimizationEntity();
      optimization.metrics = {
        conversionRate: 0.85,
        averagePaymentTime: 15,
        customerSatisfaction: 4.5,
      };

      const score = optimization.calculateScore();
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should prioritize recommendations', () => {
      const optimization = new TemplateOptimizationEntity();
      optimization.recommendations = [
        { action: 'Improve layout', priority: 'high', impact: 0.8 },
        { action: 'Add branding', priority: 'medium', impact: 0.5 },
      ];

      const prioritized = optimization.getPrioritizedRecommendations();
      expect(prioritized[0].priority).toBe('high');
    });
  });

  describe('InvoiceConstraintEntity Tests', () => {
    it('should create a valid invoice constraint entity', () => {
      const constraint = new InvoiceConstraintEntity();
      constraint.id = 'constraint-1';
      constraint.invoiceId = 'invoice-1';
      constraint.constraintType = 'payment_delay';
      constraint.description = 'Customer pays after 45 days';
      constraint.impact = 'high';
      constraint.recommendation = 'Offer early payment discount';
      constraint.status = 'active';
      constraint.tenantId = 'tenant-1';

      expect(constraint.id).toBe('constraint-1');
      expect(constraint.constraintType).toBe('payment_delay');
      expect(constraint.impact).toBe('high');
    });

    it('should assess constraint severity', () => {
      const constraint = new InvoiceConstraintEntity();
      constraint.impact = 'high';

      expect(constraint.isHighSeverity()).toBe(true);
      expect(constraint.isMediumSeverity()).toBe(false);
      expect(constraint.isLowSeverity()).toBe(false);
    });

    it('should track constraint resolution', () => {
      const constraint = new InvoiceConstraintEntity();
      constraint.status = 'resolved';
      constraint.resolvedAt = new Date();
      constraint.resolution = 'Implemented early payment discount';

      expect(constraint.isResolved()).toBe(true);
      expect(constraint.getResolutionTime()).toBeGreaterThan(0);
    });
  });

  describe('Database Operations Tests', () => {
    it('should save invoice entity', async () => {
      const invoice = new InvoiceEntity();
      invoice.id = 'invoice-1';
      invoice.invoiceNumber = 'INV-001';
      invoice.tenantId = 'tenant-1';

      jest.spyOn(invoiceRepository, 'create').mockReturnValue(invoice);
      jest.spyOn(invoiceRepository, 'save').mockResolvedValue(invoice);

      const result = await invoiceRepository.save(invoice);

      expect(result).toEqual(invoice);
      expect(invoiceRepository.create).toHaveBeenCalled();
      expect(invoiceRepository.save).toHaveBeenCalledWith(invoice);
    });

    it('should find invoice with relations', async () => {
      const invoice = new InvoiceEntity();
      invoice.id = 'invoice-1';
      invoice.lineItems = [
        {
          id: 'item-1',
          description: 'Test Item',
          quantity: 1,
          unitPrice: 1000,
          totalPrice: 1000,
        },
      ];

      jest.spyOn(invoiceRepository, 'findOne').mockResolvedValue({
        ...invoice,
        lineItems: invoice.lineItems,
      });

      const result = await invoiceRepository.findOne({
        where: { id: 'invoice-1' },
        relations: ['lineItems'],
      });

      expect(result.lineItems).toHaveLength(1);
    });

    it('should handle batch operations', async () => {
      const invoices = [
        { id: 'invoice-1', invoiceNumber: 'INV-001' },
        { id: 'invoice-2', invoiceNumber: 'INV-002' },
      ];

      jest.spyOn(invoiceRepository, 'save').mockResolvedValue(invoices[0]);
      jest.spyOn(invoiceRepository, 'find').mockResolvedValue(invoices);

      const results = await Promise.all(
        invoices.map(invoice => invoiceRepository.save(invoice))
      );

      expect(results).toHaveLength(2);
    });
  });

  describe('Complex Scenarios Tests', () => {
    it('should handle complete invoice lifecycle', () => {
      const invoice = new InvoiceEntity();
      invoice.id = 'invoice-1';
      invoice.status = 'draft';
      invoice.lineItems = [
        {
          id: 'item-1',
          description: 'Test Item',
          quantity: 1,
          unitPrice: 1000,
          totalPrice: 1000,
          taxRate: 0.18,
          taxAmount: 180,
        },
      ];

      // Create invoice
      expect(invoice.status).toBe('draft');
      expect(invoice.calculateTotal()).toBe(1180);

      // Send invoice
      invoice.status = 'sent';
      expect(invoice.canTransitionTo('paid')).toBe(true);

      // Mark as paid
      invoice.status = 'paid';
      expect(invoice.isPaid()).toBe(true);
    });

    it('should handle template optimization workflow', () => {
      const template = new InvoiceTemplateEntity();
      template.id = 'template-1';
      template.currentVersion = 1;

      const optimization = new TemplateOptimizationEntity();
      optimization.templateId = 'template-1';
      optimization.metrics = {
        conversionRate: 0.75,
        averagePaymentTime: 25,
        customerSatisfaction: 3.8,
      };

      // Apply optimization
      template.applyOptimization(optimization);
      expect(template.currentVersion).toBe(2);
      expect(optimization.status).toBe('applied');
    });

    it('should handle quality check with auto-fix', () => {
      const qualityCheck = new QualityCheckEntity();
      qualityCheck.id = 'qc-1';
      qualityCheck.score = 60;
      qualityCheck.status = 'failed';

      const autoFix = new AutoFixEntity();
      autoFix.invoiceId = 'invoice-1';
      autoFix.status = 'applied';

      // Apply fix and recheck
      qualityCheck.applyAutoFix(autoFix);
      expect(qualityCheck.score).toBeGreaterThan(60);
      expect(qualityCheck.status).toBe('passed');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const invoices = Array.from({ length: 1000 }, (_, i) => {
        const invoice = new InvoiceEntity();
        invoice.id = `invoice-${i}`;
        invoice.invoiceNumber = `INV-${i}`;
        invoice.lineItems = Array.from({ length: 10 }, (_, j) => ({
          id: `item-${i}-${j}`,
          description: `Item ${j}`,
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
        }));
        return invoice;
      });

      const startTime = Date.now();
      const total = invoices.reduce((sum, invoice) => sum + invoice.calculateTotal(), 0);
      const endTime = Date.now();

      expect(total).toBe(1000 * 10 * 100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) =>
        invoiceRepository.findOne({ where: { id: `invoice-${i}` } })
      );

      jest.spyOn(invoiceRepository, 'findOne').mockResolvedValue(new InvoiceEntity());

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });
});
