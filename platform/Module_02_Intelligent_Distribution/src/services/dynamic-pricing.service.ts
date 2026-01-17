/**
 * Dynamic Pricing Service for Advanced Billing Engine
 * SME Receivables Management Platform - Module 11 Phase 2
 * 
 * Comprehensive service for AI-powered dynamic pricing with real-time optimization,
 * machine learning integration, and revenue enhancement capabilities
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as tf from '@tensorflow/tfjs-node';
import { Matrix } from 'ml-matrix';
import { linearRegression, polynomialRegression } from 'simple-statistics';
import axios from 'axios';

import {
  DynamicPricingEntity,
  PricingHistoryEntity,
  RevenueOptimizationEntity,
  PricingRecommendationEntity
} from '../entities/dynamic-pricing.entity';

import {
  PricingStrategy,
  PricingTier,
  RevenueOptimizationStrategy,
  CurrencyCode,
  BillingCycle,
  PredictionModel,
  ProcessingStatus
} from '@shared/enums/advanced-features.enum';

import {
  PricingConfiguration,
  RevenueOptimizationModel,
  RevenuePrediction,
  OptimizationRecommendation,
  PredictionFactor
} from '@shared/interfaces/advanced-features.interface';

@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);
  private readonly deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
  private readonly openAiApiKey = process.env.OPENAI_API_KEY;
  private tfModel: tf.LayersModel | null = null;

  constructor(
    @InjectRepository(DynamicPricingEntity)
    private readonly pricingRepository: Repository<DynamicPricingEntity>,
    
    @InjectRepository(PricingHistoryEntity)
    private readonly historyRepository: Repository<PricingHistoryEntity>,
    
    @InjectRepository(RevenueOptimizationEntity)
    private readonly optimizationRepository: Repository<RevenueOptimizationEntity>,
    
    @InjectRepository(PricingRecommendationEntity)
    private readonly recommendationRepository: Repository<PricingRecommendationEntity>,
    
    private readonly eventEmitter: EventEmitter2
  ) {
    this.initializeTensorFlowModel();
  }

  // ============================================================================
  // PRICING CONFIGURATION MANAGEMENT
  // ============================================================================

  async createPricingConfiguration(
    tenantId: string,
    configData: CreatePricingConfigurationDto,
    userId: string
  ): Promise<DynamicPricingEntity> {
    try {
      this.logger.log(`Creating pricing configuration for tenant: ${tenantId}`);

      // Validate configuration data
      await this.validatePricingConfiguration(configData);

      // Create pricing configuration
      const pricingConfig = this.pricingRepository.create({
        ...configData,
        tenantId,
        createdBy: userId,
        updatedBy: userId,
        currentPrice: configData.basePrice,
        averagePrice: configData.basePrice,
        validFrom: configData.validFrom || new Date(),
        processingStatus: ProcessingStatus.PENDING
      });

      const savedConfig = await this.pricingRepository.save(pricingConfig);

      // Initialize ML model for this configuration
      await this.initializeMLModel(savedConfig.id);

      // Generate initial recommendations
      await this.generateOptimizationRecommendations(savedConfig.id);

      // Emit event
      this.eventEmitter.emit('pricing.configuration.created', {
        tenantId,
        configurationId: savedConfig.id,
        userId
      });

      this.logger.log(`Pricing configuration created successfully: ${savedConfig.id}`);
      return savedConfig;

    } catch (error) {
      this.logger.error(`Failed to create pricing configuration: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create pricing configuration: ${error.message}`);
    }
  }

  async updatePricingConfiguration(
    configId: string,
    updateData: UpdatePricingConfigurationDto,
    userId: string
  ): Promise<DynamicPricingEntity> {
    try {
      const config = await this.findPricingConfigurationById(configId);
      
      // Validate update data
      await this.validatePricingConfiguration(updateData);

      // Update configuration
      Object.assign(config, {
        ...updateData,
        updatedBy: userId,
        processingStatus: ProcessingStatus.PENDING
      });

      const updatedConfig = await this.pricingRepository.save(config);

      // Retrain ML model if strategy or parameters changed
      if (updateData.strategy || updateData.mlParameters) {
        await this.retrainMLModel(configId);
      }

      // Generate new recommendations
      await this.generateOptimizationRecommendations(configId);

      this.eventEmitter.emit('pricing.configuration.updated', {
        tenantId: config.tenantId,
        configurationId: configId,
        userId
      });

      return updatedConfig;

    } catch (error) {
      this.logger.error(`Failed to update pricing configuration: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update pricing configuration: ${error.message}`);
    }
  }

  async findPricingConfigurationById(configId: string): Promise<DynamicPricingEntity> {
    const config = await this.pricingRepository.findOne({
      where: { id: configId },
      relations: ['pricingHistory', 'optimizations', 'recommendations']
    });

    if (!config) {
      throw new NotFoundException(`Pricing configuration not found: ${configId}`);
    }

    return config;
  }

  async findPricingConfigurationsByTenant(
    tenantId: string,
    filters?: PricingConfigurationFilters
  ): Promise<DynamicPricingEntity[]> {
    const queryBuilder = this.pricingRepository.createQueryBuilder('pricing')
      .where('pricing.tenantId = :tenantId', { tenantId });

    if (filters?.strategy) {
      queryBuilder.andWhere('pricing.strategy = :strategy', { strategy: filters.strategy });
    }

    if (filters?.tier) {
      queryBuilder.andWhere('pricing.tier = :tier', { tier: filters.tier });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('pricing.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters?.validDate) {
      queryBuilder.andWhere('pricing.validFrom <= :date', { date: filters.validDate })
                  .andWhere('(pricing.validTo IS NULL OR pricing.validTo >= :date)', { date: filters.validDate });
    }

    return queryBuilder
      .orderBy('pricing.createdAt', 'DESC')
      .getMany();
  }

  // ============================================================================
  // DYNAMIC PRICING CALCULATIONS
  // ============================================================================

  async calculateOptimalPrice(
    configId: string,
    context: PricingContext
  ): Promise<PricingCalculationResult> {
    try {
      const config = await this.findPricingConfigurationById(configId);

      if (!config.canAdjustPrice()) {
        throw new BadRequestException('Pricing configuration is not available for price adjustment');
      }

      // Gather market data
      const marketData = await this.gatherMarketData(config, context);

      // Calculate price using different methods
      const calculations = await Promise.all([
        this.calculateRuleBasedPrice(config, context, marketData),
        this.calculateMLBasedPrice(config, context, marketData),
        this.calculateCompetitivePrice(config, context, marketData)
      ]);

      // Combine results using ensemble method
      const optimalPrice = this.combineCalculations(calculations, config);

      // Validate price bounds
      const finalPrice = this.validatePriceBounds(optimalPrice, config);

      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(calculations, config);

      // Create pricing calculation result
      const result: PricingCalculationResult = {
        configurationId: configId,
        originalPrice: config.currentPrice,
        optimalPrice: finalPrice,
        adjustment: ((finalPrice - config.currentPrice) / config.currentPrice) * 100,
        confidenceScore,
        factors: this.extractPricingFactors(calculations, marketData),
        recommendations: await this.generatePriceRecommendations(config, finalPrice, context),
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + config.adjustmentFrequencyMinutes * 60 * 1000)
      };

      // Log calculation for audit
      await this.logPricingCalculation(config, result, context);

      return result;

    } catch (error) {
      this.logger.error(`Failed to calculate optimal price: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to calculate optimal price: ${error.message}`);
    }
  }

  async applyPriceAdjustment(
    configId: string,
    newPrice: number,
    reason: string,
    userId: string
  ): Promise<PricingHistoryEntity> {
    try {
      const config = await this.findPricingConfigurationById(configId);
      const oldPrice = config.currentPrice;

      // Validate new price
      if (newPrice < config.minPrice || newPrice > config.maxPrice) {
        throw new BadRequestException(`Price ${newPrice} is outside allowed range [${config.minPrice}, ${config.maxPrice}]`);
      }

      // Calculate adjustment percentage
      const adjustmentPercentage = Math.abs((newPrice - oldPrice) / oldPrice);
      if (adjustmentPercentage > config.maxAdjustmentPercentage) {
        throw new BadRequestException(`Price adjustment ${adjustmentPercentage * 100}% exceeds maximum allowed ${config.maxAdjustmentPercentage * 100}%`);
      }

      // Update configuration
      config.currentPrice = newPrice;
      config.updatedBy = userId;
      await this.pricingRepository.save(config);

      // Create history record
      const historyRecord = this.historyRepository.create({
        pricingConfigurationId: configId,
        oldPrice,
        newPrice,
        adjustmentReason: reason,
        adjustmentFactors: {},
        confidenceScore: 1.0, // Manual adjustment has full confidence
        createdBy: userId
      });

      const savedHistory = await this.historyRepository.save(historyRecord);

      // Emit event
      this.eventEmitter.emit('pricing.adjustment.applied', {
        tenantId: config.tenantId,
        configurationId: configId,
        oldPrice,
        newPrice,
        userId
      });

      this.logger.log(`Price adjustment applied: ${configId} from ${oldPrice} to ${newPrice}`);
      return savedHistory;

    } catch (error) {
      this.logger.error(`Failed to apply price adjustment: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to apply price adjustment: ${error.message}`);
    }
  }

  // ============================================================================
  // MACHINE LEARNING INTEGRATION
  // ============================================================================

  private async initializeMLModel(configId: string): Promise<void> {
    try {
      const config = await this.findPricingConfigurationById(configId);

      switch (config.mlModelType) {
        case PredictionModel.DEEPSEEK_R1:
          await this.initializeDeepSeekModel(config);
          break;
        case PredictionModel.NEURAL_NETWORK:
          await this.initializeTensorFlowModel();
          break;
        case PredictionModel.RANDOM_FOREST:
          await this.initializeRandomForestModel(config);
          break;
        default:
          await this.initializeLinearRegressionModel(config);
      }

      config.processingStatus = ProcessingStatus.COMPLETED;
      await this.pricingRepository.save(config);

    } catch (error) {
      this.logger.error(`Failed to initialize ML model: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async initializeDeepSeekModel(config: DynamicPricingEntity): Promise<void> {
    if (!this.deepSeekApiKey) {
      this.logger.warn('DeepSeek API key not configured, falling back to TensorFlow');
      await this.initializeTensorFlowModel();
      return;
    }

    try {
      // Initialize DeepSeek R1 model for pricing optimization
      const response = await axios.post('https://api.deepseek.com/v1/models/initialize', {
        model: 'deepseek-r1',
        task: 'pricing_optimization',
        parameters: {
          ...config.mlParameters,
          optimization_strategy: config.optimizationStrategy,
          price_sensitivity: config.priceSensitivity
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.deepSeekApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      config.metadata.deepSeekModelId = response.data.model_id;
      this.logger.log(`DeepSeek R1 model initialized: ${response.data.model_id}`);

    } catch (error) {
      this.logger.error(`Failed to initialize DeepSeek model: ${error.message}`);
      // Fallback to TensorFlow
      await this.initializeTensorFlowModel();
    }
  }

  private async initializeTensorFlowModel(): Promise<void> {
    try {
      // Create a simple neural network for pricing prediction
      this.tfModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [10], units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'linear' })
        ]
      });

      this.tfModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      this.logger.log('TensorFlow model initialized successfully');

    } catch (error) {
      this.logger.error(`Failed to initialize TensorFlow model: ${error.message}`);
      throw error;
    }
  }

  private async calculateMLBasedPrice(
    config: DynamicPricingEntity,
    context: PricingContext,
    marketData: MarketData
  ): Promise<PriceCalculation> {
    try {
      switch (config.mlModelType) {
        case PredictionModel.DEEPSEEK_R1:
          return await this.calculateDeepSeekPrice(config, context, marketData);
        case PredictionModel.NEURAL_NETWORK:
          return await this.calculateTensorFlowPrice(config, context, marketData);
        case PredictionModel.RANDOM_FOREST:
          return await this.calculateRandomForestPrice(config, context, marketData);
        default:
          return await this.calculateLinearRegressionPrice(config, context, marketData);
      }
    } catch (error) {
      this.logger.error(`ML price calculation failed: ${error.message}`);
      // Fallback to rule-based calculation
      return await this.calculateRuleBasedPrice(config, context, marketData);
    }
  }

  private async calculateDeepSeekPrice(
    config: DynamicPricingEntity,
    context: PricingContext,
    marketData: MarketData
  ): Promise<PriceCalculation> {
    try {
      const response = await axios.post('https://api.deepseek.com/v1/pricing/predict', {
        model_id: config.metadata.deepSeekModelId,
        features: {
          base_price: config.basePrice,
          current_price: config.currentPrice,
          demand_level: marketData.demandLevel,
          competitor_prices: marketData.competitorPrices,
          seasonal_factor: marketData.seasonalFactor,
          customer_segment: context.customerSegment,
          usage_pattern: context.usagePattern,
          market_conditions: marketData.marketConditions
        },
        optimization_target: config.optimizationStrategy
      }, {
        headers: {
          'Authorization': `Bearer ${this.deepSeekApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        method: 'deepseek_r1',
        price: response.data.predicted_price,
        confidence: response.data.confidence,
        factors: response.data.factors,
        reasoning: response.data.reasoning
      };

    } catch (error) {
      this.logger.error(`DeepSeek price calculation failed: ${error.message}`);
      throw error;
    }
  }

  private async calculateTensorFlowPrice(
    config: DynamicPricingEntity,
    context: PricingContext,
    marketData: MarketData
  ): Promise<PriceCalculation> {
    if (!this.tfModel) {
      throw new Error('TensorFlow model not initialized');
    }

    try {
      // Prepare input features
      const features = tf.tensor2d([[
        config.basePrice / 1000, // Normalize price
        marketData.demandLevel,
        marketData.competitorPrices.length > 0 ? marketData.competitorPrices.reduce((a, b) => a + b) / marketData.competitorPrices.length / 1000 : 0,
        marketData.seasonalFactor,
        this.encodeCustomerSegment(context.customerSegment),
        this.encodeUsagePattern(context.usagePattern),
        marketData.marketConditions.volatility || 0,
        marketData.marketConditions.trend || 0,
        config.priceSensitivity,
        config.conversionRate
      ]]);

      // Make prediction
      const prediction = this.tfModel.predict(features) as tf.Tensor;
      const predictedPrice = (await prediction.data())[0] * 1000; // Denormalize

      // Calculate confidence based on model accuracy
      const confidence = Math.min(config.modelAccuracy * 1.2, 1.0);

      // Clean up tensors
      features.dispose();
      prediction.dispose();

      return {
        method: 'tensorflow',
        price: predictedPrice,
        confidence,
        factors: [
          { name: 'demand_level', impact: marketData.demandLevel - 1.0 },
          { name: 'competitive_pressure', impact: this.calculateCompetitivePressure(config, marketData) },
          { name: 'seasonal_adjustment', impact: marketData.seasonalFactor - 1.0 }
        ],
        reasoning: 'Neural network prediction based on historical patterns and market conditions'
      };

    } catch (error) {
      this.logger.error(`TensorFlow price calculation failed: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // REVENUE OPTIMIZATION
  // ============================================================================

  async generateRevenueOptimization(
    configId: string,
    timeHorizon: number = 30
  ): Promise<RevenueOptimizationEntity> {
    try {
      const config = await this.findPricingConfigurationById(configId);

      // Gather historical data
      const historicalData = await this.gatherHistoricalData(configId, timeHorizon * 2);

      // Train optimization model
      const optimizationModel = await this.trainOptimizationModel(config, historicalData);

      // Generate predictions
      const predictions = await this.generateRevenuePredictions(config, optimizationModel, timeHorizon);

      // Create optimization record
      const optimization = this.optimizationRepository.create({
        pricingConfigurationId: configId,
        name: `Revenue Optimization - ${new Date().toISOString()}`,
        strategy: config.optimizationStrategy,
        modelType: config.mlModelType,
        parameters: optimizationModel.parameters,
        trainingData: optimizationModel.trainingData,
        accuracy: optimizationModel.accuracy,
        lastTrainedAt: new Date(),
        isActive: true,
        predictions
      });

      const savedOptimization = await this.optimizationRepository.save(optimization);

      // Update configuration with new model accuracy
      config.modelAccuracy = optimizationModel.accuracy;
      config.lastTrainedAt = new Date();
      await this.pricingRepository.save(config);

      this.logger.log(`Revenue optimization generated: ${savedOptimization.id}`);
      return savedOptimization;

    } catch (error) {
      this.logger.error(`Failed to generate revenue optimization: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate revenue optimization: ${error.message}`);
    }
  }

  async generateOptimizationRecommendations(configId: string): Promise<PricingRecommendationEntity[]> {
    try {
      const config = await this.findPricingConfigurationById(configId);
      const recommendations: CreateRecommendationDto[] = [];

      // Analyze current performance
      const performanceAnalysis = await this.analyzePerformance(config);

      // Generate recommendations based on analysis
      if (performanceAnalysis.conversionRate < 0.05) {
        recommendations.push({
          type: 'price_reduction',
          description: 'Consider reducing price to improve conversion rate',
          expectedImpact: performanceAnalysis.conversionRate * 0.3 * config.basePrice,
          confidence: 0.75,
          implementationEffort: 'LOW',
          priority: 1
        });
      }

      if (performanceAnalysis.churnRate > 0.1) {
        recommendations.push({
          type: 'retention_pricing',
          description: 'Implement retention pricing strategy for at-risk customers',
          expectedImpact: performanceAnalysis.churnRate * 0.5 * config.averagePrice,
          confidence: 0.65,
          implementationEffort: 'MEDIUM',
          priority: 2
        });
      }

      if (performanceAnalysis.competitivePosition > 1.2) {
        recommendations.push({
          type: 'competitive_adjustment',
          description: 'Price is significantly above market average, consider adjustment',
          expectedImpact: (performanceAnalysis.competitivePosition - 1.0) * config.currentPrice * 0.1,
          confidence: 0.8,
          implementationEffort: 'LOW',
          priority: 1
        });
      }

      // Save recommendations
      const savedRecommendations = await Promise.all(
        recommendations.map(rec => {
          const recommendation = this.recommendationRepository.create({
            ...rec,
            pricingConfigurationId: configId
          });
          return this.recommendationRepository.save(recommendation);
        })
      );

      this.logger.log(`Generated ${savedRecommendations.length} optimization recommendations for ${configId}`);
      return savedRecommendations;

    } catch (error) {
      this.logger.error(`Failed to generate recommendations: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate recommendations: ${error.message}`);
    }
  }

  // ============================================================================
  // AUTOMATED PRICING ADJUSTMENTS
  // ============================================================================

  @Cron(CronExpression.EVERY_HOUR)
  async performAutomatedPricingAdjustments(): Promise<void> {
    try {
      this.logger.log('Starting automated pricing adjustments');

      // Find active configurations with real-time adjustment enabled
      const activeConfigs = await this.pricingRepository.find({
        where: {
          isActive: true,
          realTimeAdjustment: true,
          processingStatus: ProcessingStatus.COMPLETED
        }
      });

      const adjustmentPromises = activeConfigs.map(config => 
        this.processAutomatedAdjustment(config)
      );

      const results = await Promise.allSettled(adjustmentPromises);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.logger.log(`Automated pricing adjustments completed: ${successful} successful, ${failed} failed`);

    } catch (error) {
      this.logger.error(`Automated pricing adjustments failed: ${error.message}`, error.stack);
    }
  }

  private async processAutomatedAdjustment(config: DynamicPricingEntity): Promise<void> {
    try {
      // Check if adjustment is due
      const lastAdjustment = await this.historyRepository.findOne({
        where: { pricingConfigurationId: config.id },
        order: { timestamp: 'DESC' }
      });

      const timeSinceLastAdjustment = lastAdjustment 
        ? Date.now() - lastAdjustment.timestamp.getTime()
        : Infinity;

      const adjustmentInterval = config.adjustmentFrequencyMinutes * 60 * 1000;

      if (timeSinceLastAdjustment < adjustmentInterval) {
        return; // Too soon for adjustment
      }

      // Calculate optimal price
      const context: PricingContext = {
        customerSegment: 'default',
        usagePattern: 'normal',
        geographicRegion: 'global',
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };

      const calculation = await this.calculateOptimalPrice(config.id, context);

      // Apply adjustment if significant and confident
      if (Math.abs(calculation.adjustment) >= 1.0 && calculation.confidenceScore >= 0.7) {
        await this.applyPriceAdjustment(
          config.id,
          calculation.optimalPrice,
          `Automated adjustment: ${calculation.adjustment.toFixed(2)}% change`,
          'system'
        );

        this.logger.log(`Automated price adjustment applied for ${config.id}: ${calculation.adjustment.toFixed(2)}%`);
      }

    } catch (error) {
      this.logger.error(`Failed to process automated adjustment for ${config.id}: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // ANALYTICS AND REPORTING
  // ============================================================================

  async getPricingAnalytics(
    configId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<PricingAnalytics> {
    try {
      const config = await this.findPricingConfigurationById(configId);

      // Get pricing history
      const history = await this.historyRepository.find({
        where: {
          pricingConfigurationId: configId,
          timestamp: Between(timeRange.start, timeRange.end)
        },
        order: { timestamp: 'ASC' }
      });

      // Calculate analytics
      const analytics: PricingAnalytics = {
        configurationId: configId,
        timeRange,
        totalAdjustments: history.length,
        averagePrice: history.length > 0 
          ? history.reduce((sum, h) => sum + h.newPrice, 0) / history.length
          : config.currentPrice,
        priceVolatility: this.calculatePriceVolatility(history),
        revenueImpact: config.revenueImpact,
        conversionRate: config.conversionRate,
        churnRate: config.churnRate,
        optimizationScore: config.getOptimizationScore(),
        recommendations: await this.recommendationRepository.find({
          where: { pricingConfigurationId: configId },
          order: { priority: 'ASC' }
        }),
        performanceTrends: this.calculatePerformanceTrends(history),
        competitivePosition: await this.calculateCompetitivePosition(config)
      };

      return analytics;

    } catch (error) {
      this.logger.error(`Failed to get pricing analytics: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get pricing analytics: ${error.message}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async validatePricingConfiguration(configData: any): Promise<void> {
    if (configData.minPrice && configData.maxPrice && configData.minPrice >= configData.maxPrice) {
      throw new BadRequestException('Minimum price must be less than maximum price');
    }

    if (configData.basePrice && configData.minPrice && configData.basePrice < configData.minPrice) {
      throw new BadRequestException('Base price must be greater than or equal to minimum price');
    }

    if (configData.basePrice && configData.maxPrice && configData.basePrice > configData.maxPrice) {
      throw new BadRequestException('Base price must be less than or equal to maximum price');
    }

    if (configData.maxAdjustmentPercentage && (configData.maxAdjustmentPercentage < 0 || configData.maxAdjustmentPercentage > 1)) {
      throw new BadRequestException('Maximum adjustment percentage must be between 0 and 1');
    }
  }

  private async gatherMarketData(
    config: DynamicPricingEntity,
    context: PricingContext
  ): Promise<MarketData> {
    // This would integrate with external market data sources
    return {
      demandLevel: 1.0 + (Math.random() - 0.5) * 0.4, // Simulated demand
      competitorPrices: [config.basePrice * 0.9, config.basePrice * 1.1, config.basePrice * 1.05],
      seasonalFactor: this.calculateSeasonalFactor(new Date()),
      marketConditions: {
        volatility: Math.random() * 0.3,
        trend: (Math.random() - 0.5) * 0.2
      }
    };
  }

  private calculateSeasonalFactor(date: Date): number {
    const month = date.getMonth();
    // Simple seasonal adjustment (higher in Q4, lower in Q1)
    const seasonalFactors = [0.9, 0.95, 1.0, 1.05, 1.1, 1.05, 1.0, 0.95, 1.0, 1.05, 1.1, 1.15];
    return seasonalFactors[month];
  }

  private calculatePriceVolatility(history: PricingHistoryEntity[]): number {
    if (history.length < 2) return 0;

    const prices = history.map(h => h.newPrice);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private encodeCustomerSegment(segment: string): number {
    const segments = { 'basic': 0.2, 'professional': 0.5, 'enterprise': 0.8, 'default': 0.5 };
    return segments[segment] || 0.5;
  }

  private encodeUsagePattern(pattern: string): number {
    const patterns = { 'low': 0.2, 'normal': 0.5, 'high': 0.8, 'peak': 1.0 };
    return patterns[pattern] || 0.5;
  }
}

// Supporting DTOs and Interfaces
interface CreatePricingConfigurationDto {
  name: string;
  description?: string;
  strategy: PricingStrategy;
  tier: PricingTier;
  optimizationStrategy: RevenueOptimizationStrategy;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  currency: CurrencyCode;
  billingCycle: BillingCycle;
  mlModelType?: PredictionModel;
  mlParameters?: Record<string, any>;
  realTimeAdjustment?: boolean;
  adjustmentFrequencyMinutes?: number;
  maxAdjustmentPercentage?: number;
  priceSensitivity?: number;
  validFrom?: Date;
  validTo?: Date;
}

interface UpdatePricingConfigurationDto extends Partial<CreatePricingConfigurationDto> {}

interface PricingConfigurationFilters {
  strategy?: PricingStrategy;
  tier?: PricingTier;
  isActive?: boolean;
  validDate?: Date;
}

interface PricingContext {
  customerSegment: string;
  usagePattern: string;
  geographicRegion: string;
  timeOfDay: number;
  dayOfWeek: number;
}

interface MarketData {
  demandLevel: number;
  competitorPrices: number[];
  seasonalFactor: number;
  marketConditions: {
    volatility: number;
    trend: number;
  };
}

interface PriceCalculation {
  method: string;
  price: number;
  confidence: number;
  factors: Array<{ name: string; impact: number }>;
  reasoning: string;
}

interface PricingCalculationResult {
  configurationId: string;
  originalPrice: number;
  optimalPrice: number;
  adjustment: number;
  confidenceScore: number;
  factors: PredictionFactor[];
  recommendations: OptimizationRecommendation[];
  calculatedAt: Date;
  expiresAt: Date;
}

interface CreateRecommendationDto {
  type: string;
  description: string;
  expectedImpact: number;
  confidence: number;
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  priority: number;
}

interface PricingAnalytics {
  configurationId: string;
  timeRange: { start: Date; end: Date };
  totalAdjustments: number;
  averagePrice: number;
  priceVolatility: number;
  revenueImpact: number;
  conversionRate: number;
  churnRate: number;
  optimizationScore: number;
  recommendations: PricingRecommendationEntity[];
  performanceTrends: any;
  competitivePosition: number;
}

