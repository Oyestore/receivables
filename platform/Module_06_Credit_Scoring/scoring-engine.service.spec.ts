import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoringEngineService } from './scoring-engine.service';
import { ScoringModel } from './scoring-model.entity';
import { CreditAssessment } from './credit-assessment.entity';
import { BuyerProfile } from './buyer-profile.entity';
import { CreditScoreFactor } from './credit-score-factor.entity';
import { ModelType, ModelStatus, ModelCategory, ModelVersion } from '../enums/scoring.enum';

describe('ScoringEngineService', () => {
  let service: ScoringEngineService;
  let scoringModelRepository: Repository<ScoringModel>;
  let creditAssessmentRepository: Repository<CreditAssessment>;
  let buyerProfileRepository: Repository<BuyerProfile>;
  let creditScoreFactorRepository: Repository<CreditScoreFactor>;

  const mockScoringModelRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockCreditAssessmentRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockBuyerProfileRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockCreditScoreFactorRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
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

  const mockScoringModel: ScoringModel = {
    id: 'model-123',
    name: 'Test Credit Scoring Model',
    description: 'A comprehensive credit scoring model',
    modelType: ModelType.MACHINE_LEARNING,
    category: ModelCategory.COMPREHENSIVE,
    version: ModelVersion.V1_0,
    status: ModelStatus.DEPLOYED,
    isActive: true,
    isDefault: true,
    accuracy: 0.85,
    precision: 0.82,
    recall: 0.88,
    f1Score: 0.85,
    features: [
      {
        name: 'businessAge',
        type: 'numerical',
        weight: 0.2,
        importance: 0.15,
      },
      {
        name: 'annualRevenue',
        type: 'numerical',
        weight: 0.3,
        importance: 0.25,
      },
      {
        name: 'gstRegistered',
        type: 'categorical',
        weight: 0.1,
        importance: 0.1,
      },
    ],
    hyperparameters: {
      learningRate: 0.01,
      maxDepth: 5,
      nEstimators: 100,
    },
    trainingData: {
      samples: 10000,
      features: 15,
      targetVariable: 'creditScore',
      trainingDate: new Date('2023-01-01'),
    },
    validationResults: {
      crossValidationScore: 0.84,
      testScore: 0.85,
      validationDate: new Date('2023-06-01'),
    },
    performanceMetrics: {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1Score: 0.85,
      aucRoc: 0.89,
      lastUpdated: new Date(),
    },
    thresholds: {
      approval: 0.7,
      rejection: 0.3,
      review: 0.5,
    },
    calibration: {
      method: 'platt_scaling',
      parameters: { a: 1.5, b: -0.5 },
      lastCalibrated: new Date(),
    },
    explainability: {
      method: 'shap',
      featureImportance: {
        businessAge: 0.15,
        annualRevenue: 0.25,
        gstRegistered: 0.1,
      },
      lastExplained: new Date(),
    },
    monitoring: {
      driftDetection: true,
      performanceMonitoring: true,
      alertThresholds: {
        accuracyDrop: 0.1,
        driftThreshold: 0.2,
      },
      lastMonitored: new Date(),
    },
    deployment: {
      environment: 'production',
      endpoint: '/api/v1/score/predict',
      version: '1.0.0',
      deployedAt: new Date(),
    },
    governance: {
      owner: 'data-science-team',
      approvers: ['risk-team', 'compliance-team'],
      reviewFrequency: 'quarterly',
      lastReview: new Date(),
    },
    usage: {
      totalPredictions: 50000,
      averageResponseTime: 150,
      errorRate: 0.001,
      lastUsed: new Date(),
    },
    buyerProfileId: 'buyer-123',
    buyerProfile: mockBuyerProfile,
    creditAssessments: [],
    parentModel: null,
    childModels: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringEngineService,
        {
          provide: getRepositoryToken(ScoringModel),
          useValue: mockScoringModelRepository,
        },
        {
          provide: getRepositoryToken(CreditAssessment),
          useValue: mockCreditAssessmentRepository,
        },
        {
          provide: getRepositoryToken(BuyerProfile),
          useValue: mockBuyerProfileRepository,
        },
        {
          provide: getRepositoryToken(CreditScoreFactor),
          useValue: mockCreditScoreFactorRepository,
        },
      ],
    }).compile();

    service = module.get<ScoringEngineService>(ScoringEngineService);
    scoringModelRepository = module.get<Repository<ScoringModel>>(
      getRepositoryToken(ScoringModel),
    );
    creditAssessmentRepository = module.get<Repository<CreditAssessment>>(
      getRepositoryToken(CreditAssessment),
    );
    buyerProfileRepository = module.get<Repository<BuyerProfile>>(
      getRepositoryToken(BuyerProfile),
    );
    creditScoreFactorRepository = module.get<Repository<CreditScoreFactor>>(
      getRepositoryToken(CreditScoreFactor),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('predictScore', () => {
    it('should predict credit score successfully', async () => {
      const inputData = {
        businessAge: 5,
        annualRevenue: 10000000,
        gstRegistered: true,
        employeeCount: 25,
        industry: 'technology',
      };

      const expectedScore = 750;
      const expectedRiskLevel = 'LOW';
      const expectedConfidence = 0.85;

      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);
      jest.spyOn(service as any, 'applyModel').mockResolvedValue({
        score: expectedScore,
        confidence: expectedConfidence,
        riskLevel: expectedRiskLevel,
      });

      const result = await service.predictScore('model-123', inputData);

      expect(result).toEqual({
        score: expectedScore,
        confidence: expectedConfidence,
        riskLevel: expectedRiskLevel,
        modelId: 'model-123',
        timestamp: expect.any(Date),
      });
      expect(scoringModelRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'model-123', isActive: true },
      });
    });

    it('should throw NotFoundException when model does not exist', async () => {
      mockScoringModelRepository.findOne.mockResolvedValue(null);

      await expect(
        service.predictScore('nonexistent-model', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when model is not active', async () => {
      const inactiveModel = { ...mockScoringModel, isActive: false };
      mockScoringModelRepository.findOne.mockResolvedValue(inactiveModel);

      await expect(service.predictScore('model-123', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('batchPredict', () => {
    it('should perform batch predictions successfully', async () => {
      const inputDataArray = [
        { businessAge: 5, annualRevenue: 10000000 },
        { businessAge: 3, annualRevenue: 5000000 },
      ];

      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);
      jest.spyOn(service as any, 'applyModel').mockResolvedValue({
        score: 750,
        confidence: 0.85,
        riskLevel: 'LOW',
      });

      const result = await service.batchPredict('model-123', inputDataArray);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        score: 750,
        confidence: 0.85,
        riskLevel: 'LOW',
        modelId: 'model-123',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('getModel', () => {
    it('should return model by ID', async () => {
      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);

      const result = await service.getModel('model-123');

      expect(result).toEqual(mockScoringModel);
      expect(scoringModelRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'model-123' },
        relations: ['buyerProfile', 'creditAssessments'],
      });
    });
  });

  describe('getActiveModels', () => {
    it('should return all active models', async () => {
      const activeModels = [mockScoringModel];
      mockScoringModelRepository.find.mockResolvedValue(activeModels);

      const result = await service.getActiveModels();

      expect(result).toEqual(activeModels);
      expect(scoringModelRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('createModel', () => {
    it('should create a new scoring model', async () => {
      const createModelDto = {
        name: 'New Model',
        description: 'Test model description',
        modelType: ModelType.MACHINE_LEARNING,
        category: ModelCategory.COMPREHENSIVE,
        features: [
          { name: 'testFeature', type: 'numerical', weight: 0.5 },
        ],
        hyperparameters: { learningRate: 0.01 },
      };

      const newModel = { ...mockScoringModel, ...createModelDto };
      mockScoringModelRepository.create.mockReturnValue(newModel);
      mockScoringModelRepository.save.mockResolvedValue(newModel);

      const result = await service.createModel(createModelDto);

      expect(result).toEqual(newModel);
      expect(scoringModelRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createModelDto,
          status: ModelStatus.TRAINING,
          isActive: false,
          isDefault: false,
        }),
      );
    });
  });

  describe('updateModel', () => {
    it('should update a scoring model', async () => {
      const updateDto = {
        name: 'Updated Model Name',
        description: 'Updated description',
      };

      const updatedModel = { ...mockScoringModel, ...updateDto };
      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);
      mockScoringModelRepository.save.mockResolvedValue(updatedModel);

      const result = await service.updateModel('model-123', updateDto);

      expect(result).toEqual(updatedModel);
      expect(scoringModelRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockScoringModel,
          ...updateDto,
          updatedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('deployModel', () => {
    it('should deploy a model successfully', async () => {
      const trainedModel = { ...mockScoringModel, status: ModelStatus.TRAINED };
      const deployedModel = {
        ...trainedModel,
        status: ModelStatus.DEPLOYED,
        isActive: true,
        deployment: {
          ...trainedModel.deployment,
          deployedAt: expect.any(Date),
        },
      };

      mockScoringModelRepository.findOne.mockResolvedValue(trainedModel);
      mockScoringModelRepository.save.mockResolvedValue(deployedModel);

      const result = await service.deployModel('model-123');

      expect(result.status).toBe(ModelStatus.DEPLOYED);
      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException when model is not trained', async () => {
      const untrainedModel = { ...mockScoringModel, status: ModelStatus.TRAINING };
      mockScoringModelRepository.findOne.mockResolvedValue(untrainedModel);

      await expect(service.deployModel('model-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('retireModel', () => {
    it('should retire a model successfully', async () => {
      const retiredModel = {
        ...mockScoringModel,
        status: ModelStatus.RETIRED,
        isActive: false,
      };

      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);
      mockScoringModelRepository.save.mockResolvedValue(retiredModel);

      const result = await service.retireModel('model-123');

      expect(result.status).toBe(ModelStatus.RETIRED);
      expect(result.isActive).toBe(false);
    });
  });

  describe('validateModel', () => {
    it('should validate model performance', async () => {
      const validationData = [
        { features: {}, expectedScore: 750 },
        { features: {}, expectedScore: 650 },
      ];

      const validationResult = {
        accuracy: 0.85,
        precision: 0.82,
        recall: 0.88,
        f1Score: 0.85,
        meanAbsoluteError: 25.5,
        rootMeanSquaredError: 35.2,
      };

      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);
      jest.spyOn(service as any, 'calculateValidationMetrics').mockResolvedValue(
        validationResult,
      );

      const result = await service.validateModel('model-123', validationData);

      expect(result).toEqual(validationResult);
    });
  });

  describe('getModelMetrics', () => {
    it('should return model performance metrics', async () => {
      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);

      const result = await service.getModelMetrics('model-123');

      expect(result).toEqual(mockScoringModel.performanceMetrics);
    });
  });

  describe('getModelFeatureImportance', () => {
    it('should return feature importance', async () => {
      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);

      const result = await service.getModelFeatureImportance('model-123');

      expect(result).toEqual(mockScoringModel.explainability.featureImportance);
    });
  });

  describe('Private methods', () => {
    it('should apply model to input data', async () => {
      const inputData = {
        businessAge: 5,
        annualRevenue: 10000000,
        gstRegistered: true,
      };

      const result = await (service as any).applyModel(mockScoringModel, inputData);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('riskLevel');
      expect(typeof result.score).toBe('number');
      expect(typeof result.confidence).toBe('number');
    });

    it('should preprocess input data', () => {
      const rawData = {
        businessAge: '5',
        annualRevenue: '10000000',
        gstRegistered: 'true',
      };

      const processedData = (service as any).preprocessInput(
        mockScoringModel.features,
        rawData,
      );

      expect(processedData.businessAge).toBe(5);
      expect(processedData.annualRevenue).toBe(10000000);
      expect(processedData.gstRegistered).toBe(true);
    });

    it('should postprocess model output', () => {
      const rawOutput = 0.75;

      const processedOutput = (service as any).postprocessOutput(
        mockScoringModel,
        rawOutput,
      );

      expect(processedOutput).toHaveProperty('score');
      expect(processedOutput).toHaveProperty('confidence');
      expect(processedOutput).toHaveProperty('riskLevel');
    });

    it('should calculate validation metrics', async () => {
      const validationData = [
        { features: {}, expectedScore: 750 },
        { features: {}, expectedScore: 650 },
      ];

      jest.spyOn(service as any, 'applyModel').mockResolvedValue({
        score: 740,
        confidence: 0.85,
      });

      const metrics = await (service as any).calculateValidationMetrics(
        mockScoringModel,
        validationData,
      );

      expect(metrics).toHaveProperty('accuracy');
      expect(metrics).toHaveProperty('precision');
      expect(metrics).toHaveProperty('recall');
      expect(metrics).toHaveProperty('f1Score');
    });
  });

  describe('Error handling', () => {
    it('should handle model prediction errors', async () => {
      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);
      jest.spyOn(service as any, 'applyModel').mockRejectedValue(
        new Error('Model prediction failed'),
      );

      await expect(
        service.predictScore('model-123', {}),
      ).rejects.toThrow('Model prediction failed');
    });

    it('should handle invalid input data', async () => {
      mockScoringModelRepository.findOne.mockResolvedValue(mockScoringModel);

      await expect(
        service.predictScore('model-123', { invalidField: 'value' }),
      ).rejects.toThrow();
    });
  });
});
