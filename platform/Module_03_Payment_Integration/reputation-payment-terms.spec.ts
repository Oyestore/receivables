import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { PaymentBehaviorScoringService } from '../services/payment-behavior-scoring.service';
import { DynamicTermsManagementService } from '../services/dynamic-terms-management.service';
import { PaymentBehaviorScore } from '../entities/payment-behavior-score.entity';
import { DynamicPaymentTerms } from '../entities/dynamic-payment-terms.entity';
import { Customer } from '../../../customers/entities/customer.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { TermsIntegrationService } from '../../../templates/services/terms-integration.service';

describe('Reputation-Based Payment Terms Module', () => {
  let paymentBehaviorScoringService: PaymentBehaviorScoringService;
  let dynamicTermsManagementService: DynamicTermsManagementService;
  let termsIntegrationService: TermsIntegrationService;
  let paymentBehaviorScoreRepository: Repository<PaymentBehaviorScore>;
  let dynamicPaymentTermsRepository: Repository<DynamicPaymentTerms>;
  let customerRepository: Repository<Customer>;
  let invoiceRepository: Repository<Invoice>;
  let paymentTransactionRepository: Repository<PaymentTransaction>;
  let eventEmitter: EventEmitter2;

  const mockPaymentBehaviorScoreRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockDynamicPaymentTermsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockCustomerRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockInvoiceRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockPaymentTransactionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockTermsIntegrationService = {
    applyDynamicTermsToTemplate: jest.fn(),
    generateTermsVariables: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentBehaviorScoringService,
        DynamicTermsManagementService,
        {
          provide: TermsIntegrationService,
          useValue: mockTermsIntegrationService,
        },
        {
          provide: getRepositoryToken(PaymentBehaviorScore),
          useValue: mockPaymentBehaviorScoreRepository,
        },
        {
          provide: getRepositoryToken(DynamicPaymentTerms),
          useValue: mockDynamicPaymentTermsRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoiceRepository,
        },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: mockPaymentTransactionRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    paymentBehaviorScoringService = module.get<PaymentBehaviorScoringService>(PaymentBehaviorScoringService);
    dynamicTermsManagementService = module.get<DynamicTermsManagementService>(DynamicTermsManagementService);
    termsIntegrationService = module.get<TermsIntegrationService>(TermsIntegrationService);
    paymentBehaviorScoreRepository = module.get<Repository<PaymentBehaviorScore>>(getRepositoryToken(PaymentBehaviorScore));
    dynamicPaymentTermsRepository = module.get<Repository<DynamicPaymentTerms>>(getRepositoryToken(DynamicPaymentTerms));
    customerRepository = module.get<Repository<Customer>>(getRepositoryToken(Customer));
    invoiceRepository = module.get<Repository<Invoice>>(getRepositoryToken(Invoice));
    paymentTransactionRepository = module.get<Repository<PaymentTransaction>>(getRepositoryToken(PaymentTransaction));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Payment Behavior Scoring Service', () => {
    const organizationId = 'org-123';
    const customerId = 'cust-456';
    
    const mockPaymentBehaviorScore = {
      id: 'score-789',
      organizationId,
      customerId,
      overallScore: 85,
      scoreComponents: {
        paymentTimeliness: { score: 80, weight: 0.4 },
        paymentConsistency: { score: 90, weight: 0.3 },
        paymentCompleteness: { score: 85, weight: 0.2 },
        relationshipDuration: { score: 90, weight: 0.1 },
      },
      historicalScores: [
        { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), score: 82 },
        { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), score: 80 },
      ],
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should calculate payment behavior score for customer', async () => {
      // Mock customer repository
      mockCustomerRepository.findOne.mockResolvedValue({
        id: customerId,
        name: 'Test Customer',
        organizationId,
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      });
      
      // Mock invoice repository
      mockInvoiceRepository.find.mockResolvedValue([
        { 
          id: 'inv-1', 
          customerId, 
          totalAmount: 100000, 
          status: 'paid', 
          dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          paidDate: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000), // 2 days early
          paidAmount: 100000,
        },
        { 
          id: 'inv-2', 
          customerId, 
          totalAmount: 150000, 
          status: 'paid', 
          dueDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          paidDate: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000), // 5 days late
          paidAmount: 150000,
        },
        { 
          id: 'inv-3', 
          customerId, 
          totalAmount: 200000, 
          status: 'paid', 
          dueDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
          paidDate: new Date(Date.now() - 118 * 24 * 60 * 60 * 1000), // 2 days early
          paidAmount: 200000,
        },
      ]);
      
      // Mock payment transaction repository
      mockPaymentTransactionRepository.find.mockResolvedValue([
        { 
          id: 'pay-1', 
          invoiceId: 'inv-1', 
          amount: 100000, 
          status: 'completed', 
          createdAt: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000),
        },
        { 
          id: 'pay-2', 
          invoiceId: 'inv-2', 
          amount: 150000, 
          status: 'completed', 
          createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
        },
        { 
          id: 'pay-3', 
          invoiceId: 'inv-3', 
          amount: 200000, 
          status: 'completed', 
          createdAt: new Date(Date.now() - 118 * 24 * 60 * 60 * 1000),
        },
      ]);
      
      // Mock existing score
      mockPaymentBehaviorScoreRepository.findOne.mockResolvedValue(null);
      
      // Mock score creation
      mockPaymentBehaviorScoreRepository.create.mockReturnValue({ ...mockPaymentBehaviorScore, id: undefined });
      mockPaymentBehaviorScoreRepository.save.mockResolvedValue(mockPaymentBehaviorScore);

      const result = await paymentBehaviorScoringService.calculateCustomerPaymentBehaviorScore(
        organizationId,
        customerId,
      );

      expect(result).toEqual(mockPaymentBehaviorScore);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.scoreComponents).toBeDefined();
      expect(mockCustomerRepository.findOne).toHaveBeenCalledWith({
        where: { id: customerId, organizationId },
      });
      expect(mockInvoiceRepository.find).toHaveBeenCalled();
      expect(mockPaymentTransactionRepository.find).toHaveBeenCalled();
      expect(mockPaymentBehaviorScoreRepository.create).toHaveBeenCalled();
      expect(mockPaymentBehaviorScoreRepository.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('reputation.score.calculated', mockPaymentBehaviorScore);
    });

    it('should update existing payment behavior score', async () => {
      // Mock customer repository
      mockCustomerRepository.findOne.mockResolvedValue({
        id: customerId,
        name: 'Test Customer',
        organizationId,
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      });
      
      // Mock invoice repository
      mockInvoiceRepository.find.mockResolvedValue([
        { 
          id: 'inv-1', 
          customerId, 
          totalAmount: 100000, 
          status: 'paid', 
          dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          paidDate: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000), // 2 days early
          paidAmount: 100000,
        },
        { 
          id: 'inv-2', 
          customerId, 
          totalAmount: 150000, 
          status: 'paid', 
          dueDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          paidDate: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000), // 5 days late
          paidAmount: 150000,
        },
        { 
          id: 'inv-3', 
          customerId, 
          totalAmount: 200000, 
          status: 'paid', 
          dueDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
          paidDate: new Date(Date.now() - 118 * 24 * 60 * 60 * 1000), // 2 days early
          paidAmount: 200000,
        },
        { 
          id: 'inv-4', 
          customerId, 
          totalAmount: 120000, 
          status: 'paid', 
          dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          paidDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 5 days late
          paidAmount: 120000,
        },
      ]);
      
      // Mock payment transaction repository
      mockPaymentTransactionRepository.find.mockResolvedValue([
        { 
          id: 'pay-1', 
          invoiceId: 'inv-1', 
          amount: 100000, 
          status: 'completed', 
          createdAt: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000),
        },
        { 
          id: 'pay-2', 
          invoiceId: 'inv-2', 
          amount: 150000, 
          status: 'completed', 
          createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
        },
        { 
          id: 'pay-3', 
          invoiceId: 'inv-3', 
          amount: 200000, 
          status: 'completed', 
          createdAt: new Date(Date.now() - 118 * 24 * 60 * 60 * 1000),
        },
        { 
          id: 'pay-4', 
          invoiceId: 'inv-4', 
          amount: 120000, 
          status: 'completed', 
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        },
      ]);
      
      // Mock existing score
      mockPaymentBehaviorScoreRepository.findOne.mockResolvedValue(mockPaymentBehaviorScore);
      
      // Mock score update
      const updatedScore = {
        ...mockPaymentBehaviorScore,
        overallScore: 83, // Decreased due to new late payment
        scoreComponents: {
          ...mockPaymentBehaviorScore.scoreComponents,
          paymentTimeliness: { score: 75, weight: 0.4 }, // Decreased
        },
        historicalScores: [
          { date: new Date(), score: 83 },
          ...mockPaymentBehaviorScore.historicalScores,
        ],
        lastUpdated: new Date(),
        updatedAt: new Date(),
      };
      
      mockPaymentBehaviorScoreRepository.save.mockResolvedValue(updatedScore);

      const result = await paymentBehaviorScoringService.calculateCustomerPaymentBehaviorScore(
        organizationId,
        customerId,
      );

      expect(result.overallScore).toBe(83);
      expect(result.scoreComponents.paymentTimeliness.score).toBe(75);
      expect(result.historicalScores.length).toBe(3);
      expect(mockPaymentBehaviorScoreRepository.findOne).toHaveBeenCalledWith({
        where: { customerId, organizationId },
      });
      expect(mockPaymentBehaviorScoreRepository.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('reputation.score.updated', updatedScore);
    });

    it('should get customer payment behavior score', async () => {
      // Mock repository method
      mockPaymentBehaviorScoreRepository.findOne.mockResolvedValue(mockPaymentBehaviorScore);

      const result = await paymentBehaviorScoringService.getCustomerPaymentBehaviorScore(
        organizationId,
        customerId,
      );

      expect(result).toEqual(mockPaymentBehaviorScore);
      expect(mockPaymentBehaviorScoreRepository.findOne).toHaveBeenCalledWith({
        where: { customerId, organizationId },
      });
    });

    it('should calculate payment behavior score for new customer', async () => {
      // Mock customer repository
      mockCustomerRepository.findOne.mockResolvedValue({
        id: customerId,
        name: 'New Test Customer',
        organizationId,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      });
      
      // Mock invoice repository - no invoices yet
      mockInvoiceRepository.find.mockResolvedValue([]);
      
      // Mock payment transaction repository - no payments yet
      mockPaymentTransactionRepository.find.mockResolvedValue([]);
      
      // Mock score creation
      const newCustomerScore = {
        id: 'score-new',
        organizationId,
        customerId,
        overallScore: 50, // Default score for new customers
        scoreComponents: {
          paymentTimeliness: { score: 50, weight: 0.4 },
          paymentConsistency: { score: 50, weight: 0.3 },
          paymentCompleteness: { score: 50, weight: 0.2 },
          relationshipDuration: { score: 50, weight: 0.1 },
        },
        historicalScores: [],
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockPaymentBehaviorScoreRepository.create.mockReturnValue({ ...newCustomerScore, id: undefined });
      mockPaymentBehaviorScoreRepository.save.mockResolvedValue(newCustomerScore);

      const result = await paymentBehaviorScoringService.calculateCustomerPaymentBehaviorScore(
        organizationId,
        customerId,
      );

      expect(result).toEqual(newCustomerScore);
      expect(result.overallScore).toBe(50);
      expect(mockCustomerRepository.findOne).toHaveBeenCalledWith({
        where: { id: customerId, organizationId },
      });
      expect(mockInvoiceRepository.find).toHaveBeenCalled();
      expect(mockPaymentTransactionRepository.find).toHaveBeenCalled();
      expect(mockPaymentBehaviorScoreRepository.create).toHaveBeenCalled();
      expect(mockPaymentBehaviorScoreRepository.save).toHaveBeenCalled();
    });
  });

  describe('Dynamic Terms Management Service', () => {
    const organizationId = 'org-123';
    const customerId = 'cust-456';
    
    const mockDynamicPaymentTerms = {
      id: 'terms-789',
      organizationId,
      customerId,
      baseTerms: {
        paymentDueDays: 30,
        earlyPaymentDiscount: { percentage: 2, days: 10 },
        latePaymentFee: { percentage: 1.5, gracePeriodDays: 5 },
      },
      adjustedTerms: {
        paymentDueDays: 45,
        earlyPaymentDiscount: { percentage: 1.5, days: 15 },
        latePaymentFee: { percentage: 2, gracePeriodDays: 3 },
      },
      adjustmentReason: 'Based on payment behavior score',
      scoreAtTimeOfAdjustment: 85,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should generate dynamic payment terms based on behavior score', async () => {
      // Mock behavior score
      jest.spyOn(paymentBehaviorScoringService,
(Content truncated due to size limit. Use line ranges to read in chunks)