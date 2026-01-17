import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditAssessmentService } from './credit-assessment.service';
import { CreditAssessment } from './credit-assessment.entity';
import { BuyerProfile } from './buyer-profile.entity';
import { PaymentHistory } from './payment-history.entity';
import { CreditScoreFactor } from './credit-score-factor.entity';
import { AssessmentDataSource } from './assessment-data-source.entity';
import { ScoringModel } from './scoring-model.entity';
import { CreditScoreType } from '../enums/credit-score-type.enum';
import { CreditAssessmentStatus } from '../enums/credit-assessment-status.enum';
import { ConfidenceLevel } from '../enums/confidence-level.enum';
import { RiskLevel } from '../enums/risk-level.enum';
import { DataSourceType } from '../enums/data-source-type.enum';

describe('CreditAssessmentService', () => {
  let service: CreditAssessmentService;
  let creditAssessmentRepository: Repository<CreditAssessment>;
  let buyerProfileRepository: Repository<BuyerProfile>;
  let scoringModelRepository: Repository<ScoringModel>;

  const mockCreditAssessmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockBuyerProfileRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockScoringModelRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
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
    id: 'assessment-123',
    buyerId: 'buyer-123',
    scoreType: CreditScoreType.COMPREHENSIVE,
    scoreValue: 750,
    minScore: 300,
    maxScore: 900,
    riskLevel: RiskLevel.LOW,
    confidenceLevel: ConfidenceLevel.HIGH,
    recommendedCreditLimit: 500000,
    currencyCode: 'INR',
    expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    factorScores: {
      paymentHistory: 0.8,
      creditUtilization: 0.7,
      businessStability: 0.9,
      industryRisk: 0.6,
    },
    dataSources: {
      creditBureau: true,
      bankStatements: true,
      gstReturns: true,
      financialStatements: false,
    },
    status: CreditAssessmentStatus.COMPLETED,
    notes: 'Test assessment',
    modelVersionId: 'model-123',
    createdBy: 'user-123',
    updatedBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockScoringModel = {
    id: 'model-123',
    name: 'Test Model',
    version: '1.0',
    status: 'DEPLOYED',
    isActive: true,
    accuracy: 0.85,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditAssessmentService,
        {
          provide: getRepositoryToken(CreditAssessment),
          useValue: mockCreditAssessmentRepository,
        },
        {
          provide: getRepositoryToken(BuyerProfile),
          useValue: mockBuyerProfileRepository,
        },
        {
          provide: getRepositoryToken(ScoringModel),
          useValue: mockScoringModelRepository,
        },
      ],
    }).compile();

    service = module.get<CreditAssessmentService>(CreditAssessmentService);
    creditAssessmentRepository = module.get<Repository<CreditAssessment>>(
      getRepositoryToken(CreditAssessment),
    );
    buyerProfileRepository = module.get<Repository<BuyerProfile>>(
      getRepositoryToken(BuyerProfile),
    );
    scoringModelRepository = module.get<Repository<ScoringModel>>(
      getRepositoryToken(ScoringModel),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a credit assessment successfully', async () => {
      const createAssessmentDto = {
        buyerId: 'buyer-123',
        scoreType: CreditScoreType.COMPREHENSIVE,
        createdBy: 'user-123',
      };

      mockBuyerProfileRepository.findOne.mockResolvedValue(mockBuyerProfile);
      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);
      mockCreditAssessmentRepository.create.mockReturnValue(mockCreditAssessment);
      mockCreditAssessmentRepository.save.mockResolvedValue(mockCreditAssessment);

      const result = await service.create(createAssessmentDto);

      expect(result).toEqual(mockCreditAssessment);
      expect(buyerProfileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'buyer-123' },
      });
      expect(creditAssessmentRepository.create).toHaveBeenCalledWith({
        ...createAssessmentDto,
        status: CreditAssessmentStatus.PENDING,
        scoreValue: expect.any(Number),
        riskLevel: expect.any(String),
        confidenceLevel: expect.any(String),
        recommendedCreditLimit: expect.any(Number),
        currencyCode: 'INR',
        expirationDate: expect.any(Date),
        factorScores: {},
        dataSources: {},
        notes: '',
      });
      expect(creditAssessmentRepository.save).toHaveBeenCalledWith(mockCreditAssessment);
    });

    it('should throw NotFoundException when buyer does not exist', async () => {
      const createAssessmentDto = {
        buyerId: 'nonexistent-buyer',
        scoreType: CreditScoreType.COMPREHENSIVE,
        createdBy: 'user-123',
      };

      mockBuyerProfileRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createAssessmentDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a credit assessment by ID', async () => {
      mockCreditAssessmentRepository.findOne.mockResolvedValue(mockCreditAssessment);

      const result = await service.findOne('assessment-123');

      expect(result).toEqual(mockCreditAssessment);
      expect(creditAssessmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'assessment-123' },
        relations: ['buyer', 'paymentHistory', 'creditScoreFactors', 'dataSources'],
      });
    });

    it('should throw NotFoundException when assessment does not exist', async () => {
      mockCreditAssessmentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-assessment')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByBuyerId', () => {
    it('should return assessments for a buyer', async () => {
      const assessments = [mockCreditAssessment];
      mockCreditAssessmentRepository.find.mockResolvedValue(assessments);

      const result = await service.findByBuyerId('buyer-123');

      expect(result).toEqual(assessments);
      expect(creditAssessmentRepository.find).toHaveBeenCalledWith({
        where: { buyerId: 'buyer-123' },
        order: { createdAt: 'DESC' },
        relations: ['buyer'],
      });
    });
  });

  describe('update', () => {
    it('should update a credit assessment', async () => {
      const updateDto = {
        notes: 'Updated notes',
        recommendedCreditLimit: 600000,
      };

      const updatedAssessment = { ...mockCreditAssessment, ...updateDto };
      mockCreditAssessmentRepository.findOne.mockResolvedValue(mockCreditAssessment);
      mockCreditAssessmentRepository.save.mockResolvedValue(updatedAssessment);

      const result = await service.update('assessment-123', updateDto);

      expect(result).toEqual(updatedAssessment);
      expect(creditAssessmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'assessment-123' },
      });
      expect(creditAssessmentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockCreditAssessment,
          ...updateDto,
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException when updating non-existent assessment', async () => {
      mockCreditAssessmentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-assessment', { notes: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a credit assessment', async () => {
      mockCreditAssessmentRepository.findOne.mockResolvedValue(mockCreditAssessment);
      mockCreditAssessmentRepository.remove.mockResolvedValue(mockCreditAssessment);

      await service.remove('assessment-123');

      expect(creditAssessmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'assessment-123' },
      });
      expect(creditAssessmentRepository.remove).toHaveBeenCalledWith(
        mockCreditAssessment,
      );
    });

    it('should throw NotFoundException when removing non-existent assessment', async () => {
      mockCreditAssessmentRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-assessment')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('calculateCreditScore', () => {
    it('should calculate credit score based on buyer data', async () => {
      const buyerData = mockBuyerProfile;
      const scoringFactors = [
        {
          factor: 'business_age',
          weight: 0.2,
          value: 5,
          score: 0.8,
        },
        {
          factor: 'revenue',
          weight: 0.3,
          value: 10000000,
          score: 0.7,
        },
        {
          factor: 'gst_registered',
          weight: 0.1,
          value: true,
          score: 1.0,
        },
      ];

      const result = await service.calculateCreditScore(buyerData, scoringFactors);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('confidenceLevel');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(Object.values(RiskLevel)).toContain(result.riskLevel);
      expect(Object.values(ConfidenceLevel)).toContain(result.confidenceLevel);
    });

    it('should handle empty scoring factors', async () => {
      const buyerData = mockBuyerProfile;
      const scoringFactors = [];

      const result = await service.calculateCreditScore(buyerData, scoringFactors);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('confidenceLevel');
    });
  });

  describe('getAssessmentStatistics', () => {
    it('should return assessment statistics', async () => {
      const assessments = [mockCreditAssessment];
      mockCreditAssessmentRepository.find.mockResolvedValue(assessments);

      const result = await service.getAssessmentStatistics();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byRiskLevel');
      expect(result).toHaveProperty('byScoreType');
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('averageScore');
      expect(result.total).toBe(1);
    });

    it('should handle empty assessments', async () => {
      mockCreditAssessmentRepository.find.mockResolvedValue([]);

      const result = await service.getAssessmentStatistics();

      expect(result.total).toBe(0);
      expect(result.averageScore).toBe(0);
    });
  });

  describe('validateAssessmentData', () => {
    it('should validate correct assessment data', () => {
      const validData = {
        buyerId: 'buyer-123',
        scoreType: CreditScoreType.COMPREHENSIVE,
        scoreValue: 750,
        riskLevel: RiskLevel.LOW,
        confidenceLevel: ConfidenceLevel.HIGH,
      };

      const result = service.validateAssessmentData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid assessment data', () => {
      const invalidData = {
        buyerId: '',
        scoreType: 'invalid',
        scoreValue: -1,
        riskLevel: 'invalid',
        confidenceLevel: 'invalid',
      };

      const result = service.validateAssessmentData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('expireOldAssessments', () => {
    it('should expire old assessments', async () => {
      const oldAssessment = {
        ...mockCreditAssessment,
        expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        status: CreditAssessmentStatus.COMPLETED,
      };

      mockCreditAssessmentRepository.find.mockResolvedValue([oldAssessment]);
      mockCreditAssessmentRepository.save.mockResolvedValue({
        ...oldAssessment,
        status: CreditAssessmentStatus.EXPIRED,
      });

      const result = await service.expireOldAssessments();

      expect(result.expiredCount).toBe(1);
      expect(creditAssessmentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CreditAssessmentStatus.EXPIRED,
        }),
      );
    });

    it('should handle no expired assessments', async () => {
      mockCreditAssessmentRepository.find.mockResolvedValue([]);

      const result = await service.expireOldAssessments();

      expect(result.expiredCount).toBe(0);
    });
  });

  describe('getRecommendedCreditLimit', () => {
    it('should calculate recommended credit limit', async () => {
      const assessment = mockCreditAssessment;
      const buyer = mockBuyerProfile;

      const result = await service.getRecommendedCreditLimit(assessment, buyer);

      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('currency');
      expect(result).toHaveProperty('reasoning');
      expect(result.limit).toBeGreaterThan(0);
      expect(result.currency).toBe('INR');
    });

    it('should handle high risk assessment', async () => {
      const highRiskAssessment = {
        ...mockCreditAssessment,
        riskLevel: RiskLevel.EXTREME,
        scoreValue: 200,
      };

      const result = await service.getRecommendedCreditLimit(
        highRiskAssessment,
        mockBuyerProfile,
      );

      expect(result.limit).toBeLessThan(mockCreditAssessment.recommendedCreditLimit);
    });
  });

  describe('batchAssess', () => {
    it('should perform batch assessments', async () => {
      const buyerIds = ['buyer-1', 'buyer-2'];
      const assessments = [mockCreditAssessment, { ...mockCreditAssessment, id: 'assessment-2' }];

      mockBuyerProfileRepository.findOne.mockResolvedValue(mockBuyerProfile);
      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);
      mockCreditAssessmentRepository.create.mockReturnValue(mockCreditAssessment);
      mockCreditAssessmentRepository.save.mockResolvedValue(mockCreditAssessment);

      const result = await service.batchAssess(buyerIds);

      expect(result).toHaveLength(2);
      expect(buyerProfileRepository.findOne).toHaveBeenCalledTimes(2);
      expect(creditAssessmentRepository.save).toHaveBeenCalledTimes(2);
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
});
