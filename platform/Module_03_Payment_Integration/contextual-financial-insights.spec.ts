import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { FinancialIntelligenceService } from '../services/financial-intelligence.service';
import { CashFlowOptimizationService } from '../services/cash-flow-optimization.service';
import { FinancialInsight } from '../entities/financial-insight.entity';
import { FinancialScenario } from '../entities/financial-scenario.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { Organization } from '../../../organizations/entities/organization.entity';

describe('Contextual Financial Insights Module', () => {
  let financialIntelligenceService: FinancialIntelligenceService;
  let cashFlowOptimizationService: CashFlowOptimizationService;
  let financialInsightRepository: Repository<FinancialInsight>;
  let financialScenarioRepository: Repository<FinancialScenario>;
  let invoiceRepository: Repository<Invoice>;
  let paymentTransactionRepository: Repository<PaymentTransaction>;
  let organizationRepository: Repository<Organization>;
  let eventEmitter: EventEmitter2;

  const mockFinancialInsightRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockFinancialScenarioRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockInvoiceRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockPaymentTransactionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockOrganizationRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialIntelligenceService,
        CashFlowOptimizationService,
        {
          provide: getRepositoryToken(FinancialInsight),
          useValue: mockFinancialInsightRepository,
        },
        {
          provide: getRepositoryToken(FinancialScenario),
          useValue: mockFinancialScenarioRepository,
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
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    financialIntelligenceService = module.get<FinancialIntelligenceService>(FinancialIntelligenceService);
    cashFlowOptimizationService = module.get<CashFlowOptimizationService>(CashFlowOptimizationService);
    financialInsightRepository = module.get<Repository<FinancialInsight>>(getRepositoryToken(FinancialInsight));
    financialScenarioRepository = module.get<Repository<FinancialScenario>>(getRepositoryToken(FinancialScenario));
    invoiceRepository = module.get<Repository<Invoice>>(getRepositoryToken(Invoice));
    paymentTransactionRepository = module.get<Repository<PaymentTransaction>>(getRepositoryToken(PaymentTransaction));
    organizationRepository = module.get<Repository<Organization>>(getRepositoryToken(Organization));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Financial Intelligence Service', () => {
    const organizationId = 'org-123';
    const invoiceId = 'inv-456';
    
    const mockFinancialInsight = {
      id: 'insight-789',
      organizationId,
      contextType: 'invoice',
      contextId: invoiceId,
      insightType: 'payment_impact',
      insightData: {
        currentCashPosition: 500000,
        projectedCashPosition: 600000,
        dsoImpact: -2.5,
        cashFlowImpact: 100000,
        workingCapitalImpact: 100000,
      },
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should generate invoice payment impact insight', async () => {
      // Mock invoice repository
      mockInvoiceRepository.findOne.mockResolvedValue({
        id: invoiceId,
        organizationId,
        customerId: 'cust-123',
        totalAmount: 100000,
        status: 'issued',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      
      // Mock organization repository
      mockOrganizationRepository.findOne.mockResolvedValue({
        id: organizationId,
        name: 'Test Organization',
        financialData: {
          currentCashPosition: 500000,
          averageMonthlyCashBurn: 300000,
          averageMonthlyRevenue: 400000,
          dso: 45,
          totalAccountsReceivable: 800000,
          totalAccountsPayable: 600000,
        },
      });
      
      // Mock repository methods
      mockFinancialInsightRepository.create.mockReturnValue({ ...mockFinancialInsight, id: undefined });
      mockFinancialInsightRepository.save.mockResolvedValue(mockFinancialInsight);

      const result = await financialIntelligenceService.generateInvoicePaymentImpactInsight(
        organizationId,
        invoiceId,
      );

      expect(result).toEqual(mockFinancialInsight);
      expect(mockInvoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId, organizationId },
      });
      expect(mockOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(mockFinancialInsightRepository.create).toHaveBeenCalled();
      expect(mockFinancialInsightRepository.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('insights.generated', mockFinancialInsight);
    });

    it('should generate real-time financial intelligence', async () => {
      // Mock organization repository
      mockOrganizationRepository.findOne.mockResolvedValue({
        id: organizationId,
        name: 'Test Organization',
        financialData: {
          currentCashPosition: 500000,
          averageMonthlyCashBurn: 300000,
          averageMonthlyRevenue: 400000,
          dso: 45,
          totalAccountsReceivable: 800000,
          totalAccountsPayable: 600000,
        },
      });
      
      // Mock invoice repository for outstanding invoices
      mockInvoiceRepository.find.mockResolvedValue([
        { id: 'inv-1', totalAmount: 100000, status: 'issued', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
        { id: 'inv-2', totalAmount: 150000, status: 'issued', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { id: 'inv-3', totalAmount: 200000, status: 'overdue', dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      ]);
      
      // Mock payment transactions
      mockPaymentTransactionRepository.find.mockResolvedValue([
        { id: 'pay-1', amount: 80000, status: 'completed', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        { id: 'pay-2', amount: 120000, status: 'completed', createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
      ]);
      
      // Mock insights repository
      mockFinancialInsightRepository.find.mockResolvedValue([
        {
          id: 'insight-1',
          organizationId,
          contextType: 'cash_flow',
          insightType: 'cash_flow_forecast',
          insightData: {
            projectedCashPosition: 600000,
            forecastPeriod: 30,
            confidenceLevel: 'high',
          },
          priority: 'medium',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      ]);

      const result = await financialIntelligenceService.generateRealTimeIntelligence(organizationId);

      expect(result.cashPosition).toBeDefined();
      expect(result.receivablesHealth).toBeDefined();
      expect(result.cashFlowForecast).toBeDefined();
      expect(result.keyMetrics).toBeDefined();
      expect(result.actionableInsights).toBeDefined();
      expect(mockOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(mockInvoiceRepository.find).toHaveBeenCalled();
      expect(mockPaymentTransactionRepository.find).toHaveBeenCalled();
      expect(mockFinancialInsightRepository.find).toHaveBeenCalled();
    });

    it('should generate payment decision intelligence', async () => {
      // Mock invoice repository
      mockInvoiceRepository.findOne.mockResolvedValue({
        id: invoiceId,
        organizationId,
        customerId: 'cust-123',
        totalAmount: 100000,
        status: 'issued',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      
      // Mock organization repository
      mockOrganizationRepository.findOne.mockResolvedValue({
        id: organizationId,
        name: 'Test Organization',
        financialData: {
          currentCashPosition: 500000,
          averageMonthlyCashBurn: 300000,
          averageMonthlyRevenue: 400000,
          dso: 45,
          totalAccountsReceivable: 800000,
          totalAccountsPayable: 600000,
        },
      });
      
      // Mock payment options
      const paymentOptions = [
        { id: 'option-1', name: 'Standard Payment', amount: 100000, processingFee: 0, settlementTime: 3 },
        { id: 'option-2', name: 'Express Payment', amount: 99000, processingFee: 1000, settlementTime: 1 },
        { id: 'option-3', name: 'Financing Option', amount: 95000, processingFee: 500, settlementTime: 1, interestRate: 10 },
      ];

      const result = await financialIntelligenceService.generatePaymentDecisionIntelligence(
        organizationId,
        invoiceId,
        paymentOptions,
      );

      expect(result.recommendedOption).toBeDefined();
      expect(result.optionAnalysis).toHaveLength(3);
      expect(result.financialImpact).toBeDefined();
      expect(result.reasoningFactors).toBeDefined();
      expect(mockInvoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId, organizationId },
      });
      expect(mockOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
    });
  });

  describe('Cash Flow Optimization Service', () => {
    const organizationId = 'org-123';
    
    it('should generate cash flow scenarios', async () => {
      // Mock organization repository
      mockOrganizationRepository.findOne.mockResolvedValue({
        id: organizationId,
        name: 'Test Organization',
        financialData: {
          currentCashPosition: 500000,
          averageMonthlyCashBurn: 300000,
          averageMonthlyRevenue: 400000,
          dso: 45,
          totalAccountsReceivable: 800000,
          totalAccountsPayable: 600000,
        },
      });
      
      // Mock invoice repository for outstanding invoices
      mockInvoiceRepository.find.mockResolvedValue([
        { id: 'inv-1', totalAmount: 100000, status: 'issued', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
        { id: 'inv-2', totalAmount: 150000, status: 'issued', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { id: 'inv-3', totalAmount: 200000, status: 'overdue', dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      ]);
      
      // Mock scenario repository
      const mockBaseScenario = {
        id: 'scenario-base',
        organizationId,
        scenarioType: 'base',
        name: 'Base Scenario',
        description: 'Current projected cash flow without interventions',
        projectionData: {
          startingCashPosition: 500000,
          projectionPeriod: 90,
          dailyProjections: [],
          endingCashPosition: 700000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockFinancialScenarioRepository.create.mockReturnValue({ ...mockBaseScenario, id: undefined });
      mockFinancialScenarioRepository.save.mockResolvedValue(mockBaseScenario);

      const scenarioParams = {
        projectionPeriod: 90,
        includeOptimizationScenarios: true,
      };

      const result = await cashFlowOptimizationService.generateCashFlowScenarios(
        organizationId,
        scenarioParams,
      );

      expect(result.baseScenario).toBeDefined();
      expect(result.optimizationScenarios).toBeDefined();
      expect(result.optimizationScenarios.length).toBeGreaterThan(0);
      expect(result.comparisonAnalysis).toBeDefined();
      expect(mockOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(mockInvoiceRepository.find).toHaveBeenCalled();
      expect(mockFinancialScenarioRepository.create).toHaveBeenCalled();
      expect(mockFinancialScenarioRepository.save).toHaveBeenCalled();
    });

    it('should analyze payment strategy impact', async () => {
      // Mock organization repository
      mockOrganizationRepository.findOne.mockResolvedValue({
        id: organizationId,
        name: 'Test Organization',
        financialData: {
          currentCashPosition: 500000,
          averageMonthlyCashBurn: 300000,
          averageMonthlyRevenue: 400000,
          dso: 45,
          totalAccountsReceivable: 800000,
          totalAccountsPayable: 600000,
        },
      });
      
      // Mock invoice repository
      mockInvoiceRepository.find.mockResolvedValue([
        { id: 'inv-1', totalAmount: 100000, status: 'issued', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
        { id: 'inv-2', totalAmount: 150000, status: 'issued', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { id: 'inv-3', totalAmount: 200000, status: 'overdue', dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      ]);

      const strategies = [
        {
          id: 'strategy-1',
          name: 'Early Payment Discount',
          description: 'Offer 2% discount for payments within 10 days',
          parameters: {
            discountPercentage: 2,
            discountDays: 10,
          },
        },
        {
          id: 'strategy-2',
          name: 'Late Payment Fee',
          description: 'Apply 1.5% late fee after 5 day grace period',
          parameters: {
            feePercentage: 1.5,
            gracePeriodDays: 5,
          },
        },
      ];

      const result = await cashFlowOptimizationService.analyzePaymentStrategyImpact(
        organizationId,
        strategies,
      );

      expect(result.strategies).toHaveLength(2);
      expect(result.strategies[0].impact).toBeDefined();
      expect(result.strategies[1].impact).toBeDefined();
      expect(result.recommendedStrategy).toBeDefined();
      expect(result.combinedStrategyImpact).toBeDefined();
      expect(mockOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(mockInvoiceRepository.find).toHaveBeenCalled();
    });

    it('should generate data-driven recommendations', async () => {
      // Mock organization repository
      mockOrganizationRepository.findOne.mockResolvedValue({
        id: organizationId,
        name: 'Test Organization',
        financialData: {
          currentCashPosition: 500000,
          averageMonthlyCashBurn: 300000,
          averageMonthlyRevenue: 400000,
          dso: 45,
          totalAccountsReceivable: 800000,
          totalAccountsPayable: 600000,
        },
      });
      
      // Mock invoice repository
      mockInvoiceRepository.find.mockResolvedValue([
        { id: 'inv-1', totalAmount: 100000, status: 'issued', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
        { id: 'inv-2', totalAmount: 150000, status:
(Content truncated due to size limit. Use line ranges to read in chunks)