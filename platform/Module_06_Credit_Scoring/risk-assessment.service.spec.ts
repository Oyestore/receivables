import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskAssessmentService } from './risk-assessment.service';
import { RiskAssessment, RiskAssessmentType, RiskAssessmentMethod, RiskAssessmentStatus } from './risk-assessment.entity';
import { BuyerProfile } from './buyer-profile.entity';
import { CreditAssessment } from './credit-assessment.entity';
import { RiskRule } from './risk-rule.entity';
import { RiskAlert } from './risk-alert.entity';
import { RiskLevel } from '../enums/risk-level.enum';

describe('RiskAssessmentService', () => {
  let service: RiskAssessmentService;
  let riskAssessmentRepository: Repository<RiskAssessment>;
  let buyerProfileRepository: Repository<BuyerProfile>;
  let creditAssessmentRepository: Repository<CreditAssessment>;
  let riskRuleRepository: Repository<RiskRule>;
  let riskAlertRepository: Repository<RiskAlert>;

  const mockRiskAssessmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };

  const mockBuyerProfileRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockCreditAssessmentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRiskRuleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRiskAlertRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockBuyerProfile: BuyerProfile = {
    id: 'buyer-123',
    businessName: 'Test Business',
    legalStructure: 'PRIVATE_LIMITED',
    businessAge: 5,
    annualRevenue: 10000000,
    employeeCount: 25,
    industry: 'technology',
    gstRegistered: true,
    panNumber: 'ABCDE1234F',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreditAssessment: CreditAssessment = {
    id: 'credit-assessment-123',
    buyerId: 'buyer-123',
    scoreType: 'COMPREHENSIVE',
    scoreValue: 750,
    minScore: 300,
    maxScore: 900,
    riskLevel: RiskLevel.LOW,
    confidenceLevel: 'HIGH',
    recommendedCreditLimit: 500000,
    currencyCode: 'INR',
    expirationDate: new Date(),
    factorScores: {},
    dataSources: {},
    status: 'COMPLETED',
    notes: '',
    modelVersionId: 'model-123',
    createdBy: 'user-123',
    updatedBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRiskAssessment: RiskAssessment = {
    id: 'risk-assessment-123',
    buyerId: 'buyer-123',
    assessmentType: RiskAssessmentType.CREDIT_RISK,
    assessmentMethod: RiskAssessmentMethod.AUTOMATED,
    status: RiskAssessmentStatus.COMPLETED,
    assessmentDate: new Date(),
    overallRiskLevel: RiskLevel.LOW,
    overallRiskScore: 0.75,
    riskFactors: [],
    recommendations: [],
    assessmentSummary: 'Low risk assessment',
    createdBy: 'user-123',
    updatedBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRiskRule: RiskRule = {
    id: 'rule-123',
    name: 'Test Rule',
    description: 'Test rule description',
    ruleType: 'VALIDATION',
    category: 'CREDIT_SCORING',
    status: 'ACTIVE',
    trigger: 'ON_CREATE',
    conditions: [
      {
        field: 'buyer.businessAge',
        operator: 'GREATER_THAN',
        value: 2,
        weight: 1.0,
      },
    ],
    actions: [
      {
        type: 'adjust_score',
        parameters: { adjustment: 0.1 },
        priority: 'medium',
      },
    ],
    isActive: true,
    isGlobal: true,
    createdBy: 'system',
    updatedBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskAssessmentService,
        {
          provide: getRepositoryToken(RiskAssessment),
          useValue: mockRiskAssessmentRepository,
        },
        {
          provide: getRepositoryToken(BuyerProfile),
          useValue: mockBuyerProfileRepository,
        },
        {
          provide: getRepositoryToken(CreditAssessment),
          useValue: mockCreditAssessmentRepository,
        },
        {
          provide: getRepositoryToken(RiskRule),
          useValue: mockRiskRuleRepository,
        },
        {
          provide: getRepositoryToken(RiskAlert),
          useValue: mockRiskAlertRepository,
        },
      ],
    }).compile();

    service = module.get<RiskAssessmentService>(RiskAssessmentService);
    riskAssessmentRepository = module.get<Repository<RiskAssessment>>(
      getRepositoryToken(RiskAssessment),
    );
    buyerProfileRepository = module.get<Repository<BuyerProfile>>(
      getRepositoryToken(BuyerProfile),
    );
    creditAssessmentRepository = module.get<Repository<CreditAssessment>>(
      getRepositoryToken(CreditAssessment),
    );
    riskRuleRepository = module.get<Repository<RiskRule>>(
      getRepositoryToken(RiskRule),
    );
    riskAlertRepository = module.get<Repository<RiskAlert>>(
      getRepositoryToken(RiskAlert),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a risk assessment successfully', async () => {
      const createRiskAssessmentDto = {
        buyerId: 'buyer-123',
        assessmentType: RiskAssessmentType.CREDIT_RISK,
        assessmentMethod: RiskAssessmentMethod.AUTOMATED,
        createdBy: 'user-123',
      };

      mockBuyerProfileRepository.findOne.mockResolvedValue(mockBuyerProfile);
      mockRiskAssessmentRepository.create.mockReturnValue(mockRiskAssessment);
      mockRiskAssessmentRepository.save.mockResolvedValue(mockRiskAssessment);

      const result = await service.create(createRiskAssessmentDto);

      expect(result).toEqual(mockRiskAssessment);
      expect(buyerProfileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'buyer-123' },
      });
      expect(riskAssessmentRepository.create).toHaveBeenCalledWith({
        ...createRiskAssessmentDto,
        assessmentDate: expect.any(Date),
        status: RiskAssessmentStatus.PENDING,
        buyer: mockBuyerProfile,
      });
      expect(riskAssessmentRepository.save).toHaveBeenCalledWith(mockRiskAssessment);
    });

    it('should throw NotFoundException when buyer does not exist', async () => {
      const createRiskAssessmentDto = {
        buyerId: 'nonexistent-buyer',
        assessmentType: RiskAssessmentType.CREDIT_RISK,
        assessmentMethod: RiskAssessmentMethod.AUTOMATED,
        createdBy: 'user-123',
      };

      mockBuyerProfileRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createRiskAssessmentDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return filtered risk assessments', async () => {
      const filters = {
        buyerId: 'buyer-123',
        assessmentType: RiskAssessmentType.CREDIT_RISK,
        status: RiskAssessmentStatus.COMPLETED,
        page: 1,
        limit: 10,
      };

      const assessments = [mockRiskAssessment];
      const total = 1;

      mockRiskAssessmentRepository.findAndCount.mockResolvedValue([assessments, total]);

      const result = await service.findAll(filters);

      expect(result).toEqual({ assessments, total });
      expect(riskAssessmentRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          buyerId: 'buyer-123',
          assessmentType: RiskAssessmentType.CREDIT_RISK,
          status: RiskAssessmentStatus.COMPLETED,
        },
        relations: ['buyer', 'creditAssessments'],
        order: { assessmentDate: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle date range filters', async () => {
      const dateFrom = new Date('2023-01-01');
      const dateTo = new Date('2023-12-31');
      const filters = { dateFrom, dateTo };

      mockRiskAssessmentRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(filters);

      expect(riskAssessmentRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assessmentDate: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a risk assessment by ID', async () => {
      mockRiskAssessmentRepository.findOne.mockResolvedValue(mockRiskAssessment);

      const result = await service.findOne('risk-assessment-123');

      expect(result).toEqual(mockRiskAssessment);
      expect(riskAssessmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'risk-assessment-123' },
        relations: ['buyer', 'creditAssessments', 'riskFactors'],
      });
    });

    it('should throw NotFoundException when assessment does not exist', async () => {
      mockRiskAssessmentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-assessment')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a risk assessment', async () => {
      const updateDto = {
        assessmentSummary: 'Updated summary',
        overallRiskScore: 0.8,
      };

      const updatedAssessment = { ...mockRiskAssessment, ...updateDto };
      mockRiskAssessmentRepository.findOne.mockResolvedValue(mockRiskAssessment);
      mockRiskAssessmentRepository.save.mockResolvedValue(updatedAssessment);

      const result = await service.update('risk-assessment-123', updateDto);

      expect(result).toEqual(updatedAssessment);
      expect(riskAssessmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'risk-assessment-123' },
      });
      expect(riskAssessmentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockRiskAssessment,
          ...updateDto,
          updatedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should remove a risk assessment', async () => {
      mockRiskAssessmentRepository.findOne.mockResolvedValue(mockRiskAssessment);
      mockRiskAssessmentRepository.remove.mockResolvedValue(mockRiskAssessment);

      await service.remove('risk-assessment-123');

      expect(riskAssessmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'risk-assessment-123' },
      });
      expect(riskAssessmentRepository.remove).toHaveBeenCalledWith(mockRiskAssessment);
    });
  });

  describe('performAutomatedAssessment', () => {
    it('should perform automated assessment successfully', async () => {
      const assessmentData = {
        buyer: mockBuyerProfile,
        creditAssessments: [mockCreditAssessment],
        previousRiskAssessments: [],
        currentData: {
          date: new Date(),
          economicIndicators: { gdpGrowth: 0.06 },
          industryTrends: { growthRate: 0.08 },
        },
      };

      const ruleResults = [
        {
          ruleId: 'rule-123',
          ruleName: 'Test Rule',
          result: true,
          score: 0.8,
          impact: 'positive',
          details: [],
        },
      ];

      const updatedAssessment = {
        ...mockRiskAssessment,
        status: RiskAssessmentStatus.COMPLETED,
        overallRiskLevel: RiskLevel.LOW,
        overallRiskScore: 0.75,
        riskFactors: [],
        recommendations: [],
        assessmentSummary: 'Risk assessment completed',
      };

      mockRiskAssessmentRepository.findOne.mockResolvedValue(mockRiskAssessment);
      mockRiskAssessmentRepository.save.mockResolvedValue(updatedAssessment);
      mockBuyerProfileRepository.findOne.mockResolvedValue(mockBuyerProfile);
      mockCreditAssessmentRepository.find.mockResolvedValue([mockCreditAssessment]);
      mockRiskRuleRepository.find.mockResolvedValue([mockRiskRule]);

      jest.spyOn(service as any, 'gatherAssessmentData').mockResolvedValue(assessmentData);
      jest.spyOn(service as any, 'applyRiskRules').mockResolvedValue(ruleResults);
      jest.spyOn(service as any, 'calculateRiskScores').mockResolvedValue({
        factors: [],
        overallScore: 0.75,
        breakdown: {},
      });
      jest.spyOn(service as any, 'determineOverallRiskLevel').mockReturnValue({
        level: RiskLevel.LOW,
        score: 0.75,
      });
      jest.spyOn(service as any, 'generateRecommendations').mockResolvedValue([]);
      jest.spyOn(service as any, 'generateAssessmentSummary').mockReturnValue('Summary');

      const result = await service.performAutomatedAssessment('risk-assessment-123');

      expect(result.status).toBe(RiskAssessmentStatus.COMPLETED);
      expect(riskAssessmentRepository.save).toHaveBeenCalled();
    });

    it('should handle assessment failure', async () => {
      mockRiskAssessmentRepository.findOne.mockResolvedValue(mockRiskAssessment);
      mockRiskAssessmentRepository.save.mockResolvedValue(mockRiskAssessment);

      jest.spyOn(service as any, 'gatherAssessmentData').mockRejectedValue(
        new Error('Assessment failed'),
      );

      await expect(
        service.performAutomatedAssessment('risk-assessment-123'),
      ).rejects.toThrow('Assessment failed');
    });
  });

  describe('getRiskStatistics', () => {
    it('should return risk statistics', async () => {
      const assessments = [mockRiskAssessment];
      mockRiskAssessmentRepository.find.mockResolvedValue(assessments);

      const result = await service.getRiskStatistics();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byRiskLevel');
      expect(result).toHaveProperty('byAssessmentType');
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('averageRiskScore');
      expect(result).toHaveProperty('completionRate');
      expect(result.total).toBe(1);
    });

    it('should handle date range in statistics', async () => {
      const dateFrom = new Date('2023-01-01');
      const dateTo = new Date('2023-12-31');

      mockRiskAssessmentRepository.find.mockResolvedValue([]);

      await service.getRiskStatistics(dateFrom, dateTo);

      expect(riskAssessmentRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assessmentDate: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('batchAssess', () => {
    it('should perform batch assessments', async () => {
      const buyerIds = ['buyer-1', 'buyer-2'];

      mockBuyerProfileRepository.findOne.mockResolvedValue(mockBuyerProfile);
      mockRiskAssessmentRepository.create.mockReturnValue(mockRiskAssessment);
      mockRiskAssessmentRepository.save.mockResolvedValue(mockRiskAssessment);

      const result = await service.batchAssess(buyerIds);

      expect(result).toHaveLength(2);
      expect(buyerProfileRepository.findOne).toHaveBeenCalledTimes(2);
      expect(riskAssessmentRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch assessment', async () => {
      const buyerIds = ['buyer-1', 'nonexistent-buyer'];

      mockBuyerProfileRepository
        .findOne
        .mockResolvedValueOnce(mockBuyerProfile)
        .mockResolvedValueOnce(null);

      const result = await service.batchAssess(buyerIds);

      expect(result).toHaveLength(1);
    });
  });

  describe('Private methods', () => {
    it('should calculate payment history score', () => {
      const assessments = [
        { ...mockCreditAssessment, riskLevel: RiskLevel.LOW },
        { ...mockCreditAssessment, riskLevel: RiskLevel.MEDIUM },
      ];

      const score = (service as any).calculatePaymentHistoryScore(assessments);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should calculate financial health score', () => {
      const buyer = { ...mockBuyerProfile, businessAge: 10, annualRevenue: 20000000 };

      const score = (service as any).calculateFinancialHealthScore(buyer);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should determine overall risk level', () => {
      const riskScores = { overallScore: 0.8 };

      const result = (service as any).determineOverallRiskLevel(riskScores);

      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('score');
      expect(Object.values(RiskLevel)).toContain(result.level);
    });

    it('should generate assessment summary', () => {
      const riskScores = {
        breakdown: {
          paymentHistory: 0.8,
          financialHealth: 0.7,
          industryRisk: 0.6,
          businessStability: 0.9,
        },
      };
      const overallRiskLevel = { level: RiskLevel.LOW };

      const summary = (service as any).generateAssessmentSummary(
        riskScores,
        overallRiskLevel,
      );

      expect(summary).toContain('LOW');
      expect(summary).toContain('80.0%');
      expect(summary).toContain('70.0%');
    });
  });
});
