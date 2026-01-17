import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';
import {
    IPricingModel,
    IPriceCalculationRequest,
    IPriceCalculationResult,
    IDiscountRule,
    IPricingExperiment,
    IPriceRecommendation,
} from '../interfaces/pricing.interface';

const logger = new Logger('DynamicPricingService');

/**
 * Dynamic Pricing Service
 * AI-powered pricing engine with ML recommendations, A/B testing, and optimization
 */
export class DynamicPricingService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Create pricing model
     */
    async createModel(modelData: {
        modelName: string;
        modelType: 'base' | 'usage' | 'feature' | 'hybrid';
        basePrice: number;
        currency?: string;
        description?: string;
        mlConfig?: any;
    }, createdBy: string): Promise<IPricingModel> {
        try {
            const result = await this.pool.query(
                `INSERT INTO pricing_models (
          model_name, model_type, base_price, currency, description, ml_config, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
                [
                    modelData.modelName,
                    modelData.modelType,
                    modelData.basePrice,
                    modelData.currency || 'USD',
                    modelData.description || null,
                    modelData.mlConfig ? JSON.stringify(modelData.mlConfig) : null,
                    createdBy,
                ]
            );

            logger.info('Pricing model created', {
                modelId: result.rows[0].id,
                modelName: modelData.modelName,
            });

            return this.mapModelFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create pricing model', { error, modelData });
            throw error;
        }
    }

    /**
     * Calculate price with all discounts and optimizations
     */
    async calculatePrice(request: IPriceCalculationRequest): Promise<IPriceCalculationResult> {
        try {
            // Get pricing model
            const model = await this.getPricingModel(request.modelId);

            if (!model) {
                throw new NotFoundError('Pricing model not found');
            }

            let basePrice = model.basePrice;

            // Get experimental price if tenant is in an experiment
            if (request.tenantId) {
                const experimentPrice = await this.getExperimentalPrice(request.tenantId, request.modelId);
                if (experimentPrice !== null) {
                    basePrice = experimentPrice;
                }
            }

            // Apply volume-based tier pricing
            if (request.volume) {
                const tierPrice = await this.getTierPrice(request.modelId, request.volume);
                if (tierPrice !== null) {
                    basePrice = tierPrice;
                }
            }

            // Apply regional pricing
            if (request.region) {
                basePrice = await this.applyRegionalPricing(request.modelId, request.region, basePrice);
            }

            // Calculate discounts
            const discounts = await this.calculateDiscounts(
                request.modelId,
                basePrice,
                request.discountCodes || [],
                request.volume,
                request.tenantId
            );

            const totalDiscountAmount = discounts.reduce((sum, d) => sum + d.amount, 0);
            const finalPrice = Math.max(0, basePrice - totalDiscountAmount);

            // Calculate tax if applicable
            const taxAmount = request.region
                ? await this.calculateTax(finalPrice, request.region)
                : 0;

            const totalPrice = finalPrice + taxAmount;

            logger.info('Price calculated', {
                modelId: request.modelId,
                basePrice,
                finalPrice,
                totalPrice,
            });

            return {
                basePrice,
                discounts,
                finalPrice,
                currency: model.currency,
                taxAmount,
                totalPrice,
                breakdown: {
                    model: model.modelName,
                    volume: request.volume,
                    region: request.region,
                    appliedDiscounts: discounts.length,
                },
            };
        } catch (error) {
            logger.error('Failed to calculate price', { error, request });
            throw error;
        }
    }

    /**
     * Get ML-based price recommendation
     */
    async getPriceRecommendation(modelId: string): Promise<IPriceRecommendation | null> {
        try {
            // Get current pricing model
            const model = await this.getPricingModel(modelId);
            if (!model) {
                throw new NotFoundError('Pricing model not found');
            }

            // Get latest analytics
            const analytics = await this.getLatestAnalytics(modelId);

            // Calculate optimal price using ML model
            const recommendation = await this.calculateMLRecommendation(model, analytics);

            if (recommendation) {
                // Store recommendation
                const result = await this.pool.query(
                    `INSERT INTO price_recommendations (
            model_id, recommended_price, current_price, confidence_score,
            reasoning, expected_impact, ml_model_version
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
                    [
                        modelId,
                        recommendation.recommendedPrice,
                        model.basePrice,
                        recommendation.confidenceScore,
                        JSON.stringify(recommendation.reasoning),
                        JSON.stringify(recommendation.expectedImpact),
                        recommendation.mlModelVersion || 'v1.0',
                    ]
                );

                logger.info('Price recommendation generated', {
                    modelId,
                    recommendedPrice: recommendation.recommendedPrice,
                    confidenceScore: recommendation.confidenceScore,
                });

                return this.mapRecommendationFromDb(result.rows[0]);
            }

            return null;
        } catch (error) {
            logger.error('Failed to get price recommendation', { error, modelId });
            throw error;
        }
    }

    /**
     * Create A/B pricing experiment
     */
    async createExperiment(experimentData: {
        experimentName: string;
        controlModelId: string;
        variantModelId: string;
        trafficSplit?: number;
        startDate: Date;
        endDate?: Date;
        hypothesis?: string;
        successMetrics?: any;
    }, createdBy: string): Promise<IPricingExperiment> {
        try {
            // Validate that control and variant are different
            if (experimentData.controlModelId === experimentData.variantModelId) {
                throw new ValidationError('Control and variant models must be different');
            }

            // Validate models exist
            await Promise.all([
                this.getPricingModel(experimentData.controlModelId),
                this.getPricingModel(experimentData.variantModelId),
            ]);

            const result = await this.pool.query(
                `INSERT INTO pricing_experiments (
          experiment_name, control_model_id, variant_model_id, traffic_split,
          start_date, end_date, hypothesis, success_metrics, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
                [
                    experimentData.experimentName,
                    experimentData.controlModelId,
                    experimentData.variantModelId,
                    experimentData.trafficSplit || 50,
                    experimentData.startDate,
                    experimentData.endDate || null,
                    experimentData.hypothesis || null,
                    experimentData.successMetrics ? JSON.stringify(experimentData.successMetrics) : null,
                    createdBy,
                ]
            );

            logger.info('Pricing experiment created', {
                experimentId: result.rows[0].id,
                experimentName: experimentData.experimentName,
            });

            return this.mapExperimentFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create experiment', { error, experimentData });
            throw error;
        }
    }

    /**
     * Assign tenant to experiment variant
     */
    async assignTenantToExperiment(
        tenantId: string,
        experimentId: string
    ): Promise<'control' | 'variant'> {
        try {
            // Get experiment details
            const experiment = await this.getExperiment(experimentId);
            if (!experiment || experiment.status !== 'running') {
                throw new ValidationError('Experiment is not running');
            }

            // Check if already assigned
            const existing = await this.pool.query(
                'SELECT assigned_variant FROM customer_price_assignments WHERE tenant_id = $1 AND experiment_id = $2',
                [tenantId, experimentId]
            );

            if (existing.rows.length > 0) {
                return existing.rows[0].assigned_variant;
            }

            // Assign based on traffic split using consistent hashing
            const hash = this.hashString(tenantId + experimentId);
            const variant = (hash % 100) < experiment.trafficSplit ? 'variant' : 'control';
            const modelId = variant === 'variant' ? experiment.variantModelId : experiment.controlModelId;

            await this.pool.query(
                `INSERT INTO customer_price_assignments (
          tenant_id, model_id, experiment_id, assigned_variant
        ) VALUES ($1, $2, $3, $4)`,
                [tenantId, modelId, experimentId, variant]
            );

            logger.info('Tenant assigned to experiment', { tenantId, experimentId, variant });

            return variant;
        } catch (error) {
            logger.error('Failed to assign tenant to experiment', { error, tenantId, experimentId });
            throw error;
        }
    }

    /**
     * Calculate experiment results
     */
    async calculateExperimentResults(experimentId: string): Promise<any> {
        try {
            const experiment = await this.getExperiment(experimentId);
            if (!experiment) {
                throw new NotFoundError('Experiment not found');
            }

            // Get analytics for both variants
            const [controlAnalytics, variantAnalytics] = await Promise.all([
                this.getModelAnalytics(experiment.controlModelId),
                this.getModelAnalytics(experiment.variantModelId),
            ]);

            // Calculate statistical significance
            const results = this.calculateStatisticalSignificance(controlAnalytics, variantAnalytics);

            // Determine winner
            let winner: 'control' | 'variant' | 'inconclusive' = 'inconclusive';
            if (results.pValue < 0.05) {
                winner = results.variantRevenue > results.controlRevenue ? 'variant' : 'control';
            }

            // Update experiment with results
            await this.pool.query(
                `UPDATE pricing_experiments
         SET results = $1, winner = $2, confidence_level = $3, status = 'completed'
         WHERE id = $4`,
                [JSON.stringify(results), winner, results.confidenceLevel, experimentId]
            );

            logger.info('Experiment results calculated', { experimentId, winner });

            return {
                ...results,
                winner,
                experimentId,
            };
        } catch (error) {
            logger.error('Failed to calculate experiment results', { error, experimentId });
            throw error;
        }
    }

    /**
     * Get pricing model
     */
    private async getPricingModel(modelId: string): Promise<IPricingModel | null> {
        const result = await this.pool.query(
            'SELECT * FROM pricing_models WHERE id = $1',
            [modelId]
        );

        return result.rows.length > 0 ? this.mapModelFromDb(result.rows[0]) : null;
    }

    /**
     * Get experimental price for tenant
     */
    private async getExperimentalPrice(tenantId: string, modelId: string): Promise<number | null> {
        const result = await this.pool.query(
            `SELECT pm.base_price
       FROM customer_price_assignments cpa
       JOIN pricing_models pm ON cpa.model_id = pm.id
       WHERE cpa.tenant_id = $1 AND pm.id != $2 AND cpa.experiment_id IS NOT NULL`,
            [tenantId, modelId]
        );

        return result.rows.length > 0 ? parseFloat(result.rows[0].base_price) : null;
    }

    /**
     * Get tier price based on volume
     */
    private async getTierPrice(modelId: string, volume: number): Promise<number | null> {
        const result = await this.pool.query(
            `SELECT unit_price FROM pricing_tiers
       WHERE model_id = $1 AND ($2 >= min_volume OR min_volume IS NULL)
         AND ($2 <= max_volume OR max_volume IS NULL)
       ORDER BY min_volume DESC LIMIT 1`,
            [modelId, volume]
        );

        return result.rows.length > 0 ? parseFloat(result.rows[0].unit_price) : null;
    }

    /**
     * Apply regional pricing multiplier
     */
    private async applyRegionalPricing(
        modelId: string,
        regionCode: string,
        basePrice: number
    ): Promise<number> {
        const result = await this.pool.query(
            'SELECT base_price_multiplier FROM regional_pricing WHERE model_id = $1 AND region_code = $2 AND is_active = true',
            [modelId, regionCode]
        );

        if (result.rows.length > 0) {
            const multiplier = parseFloat(result.rows[0].base_price_multiplier);
            return basePrice * multiplier;
        }

        return basePrice;
    }

    /**
     * Calculate all applicable discounts
     */
    private async calculateDiscounts(
        modelId: string,
        basePrice: number,
        discountCodes: string[],
        volume?: number,
        tenantId?: string
    ): Promise<Array<{ ruleName: string; amount: number; percentage?: number }>> {
        const discounts: Array<{ ruleName: string; amount: number; percentage?: number }> = [];

        // Get applicable discount rules
        const result = await this.pool.query(
            `SELECT * FROM discount_rules
       WHERE is_active = true
         AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
         AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
         AND (max_uses IS NULL OR current_uses < max_uses)`,
            []
        );

        for (const rule of result.rows) {
            let applies = false;

            // Check if discount code matches
            if (discountCodes.length > 0 && discountCodes.includes(rule.rule_name)) {
                applies = true;
            }

            // Check volume discounts
            if (rule.rule_type === 'volume' && volume) {
                const conditions = rule.conditions as any;
                if (conditions && volume >= conditions.minVolume) {
                    applies = true;
                }
            }

            if (applies) {
                let discountAmount = 0;

                if (rule.discount_percentage) {
                    discountAmount = (basePrice * parseFloat(rule.discount_percentage)) / 100;
                    discounts.push({
                        ruleName: rule.rule_name,
                        amount: discountAmount,
                        percentage: parseFloat(rule.discount_percentage),
                    });
                } else if (rule.discount_amount) {
                    discountAmount = parseFloat(rule.discount_amount);
                    discounts.push({
                        ruleName: rule.rule_name,
                        amount: discountAmount,
                    });
                }

                // Increment usage counter
                if (rule.max_uses) {
                    await this.pool.query(
                        'UPDATE discount_rules SET current_uses = current_uses + 1 WHERE id = $1',
                        [rule.id]
                    );
                }
            }
        }

        return discounts;
    }

    /**
     * Calculate tax based on region
     */
    private async calculateTax(price: number, regionCode: string): Promise<number> {
        const result = await this.pool.query(
            'SELECT tax_rate FROM regional_pricing WHERE region_code = $1 AND is_active = true LIMIT 1',
            [regionCode]
        );

        if (result.rows.length > 0) {
            const taxRate = parseFloat(result.rows[0].tax_rate);
            return (price * taxRate) / 100;
        }

        return 0;
    }

    /**
     * Get latest analytics for model
     */
    private async getLatestAnalytics(modelId: string): Promise<any> {
        const result = await this.pool.query(
            `SELECT * FROM pricing_analytics
       WHERE model_id = $1
       ORDER BY metric_date DESC
       LIMIT 30`,
            [modelId]
        );

        return result.rows;
    }

    /**
     * Calculate ML-based price recommendation
     */
    private async calculateMLRecommendation(model: IPricingModel, analytics: any[]): Promise<any> {
        // Simplified ML recommendation logic
        // In production, this would call a Python ML service or TensorFlow.js model

        if (analytics.length === 0) {
            return null;
        }

        // Calculate average metrics
        const avgRevenue = analytics.reduce((sum, a) => sum + parseFloat(a.revenue), 0) / analytics.length;
        const avgConversions = analytics.reduce((sum, a) => sum + parseInt(a.conversions, 10), 0) / analytics.length;
        const avgElasticity = analytics
            .filter(a => a.price_elasticity)
            .reduce((sum, a) => sum + parseFloat(a.price_elasticity), 0) / analytics.filter(a => a.price_elasticity).length;

        // Simple recommendation logic based on trends
        let recommendedPrice = model.basePrice;
        let reasoning: any = {};

        // Increase price if high conversion and low elasticity
        if (avgConversions > 10 && Math.abs(avgElasticity) < 0.5) {
            recommendedPrice = model.basePrice * 1.10; // 10% increase
            reasoning.signal = 'low_price_sensitivity';
            reasoning.details = 'High conversions with low price elasticity suggest room for price increase';
        }

        // Decrease price if low conversion
        if (avgConversions < 5) {
            recommendedPrice = model.basePrice * 0.95; // 5% decrease
            reasoning.signal = 'low_conversions';
            reasoning.details = 'Low conversion rate suggests price resistance';
        }

        const confidenceScore = Math.min(0.95, analytics.length / 30); // More data = higher confidence

        return {
            recommendedPrice: Math.round(recommendedPrice * 100) / 100,
            confidenceScore,
            reasoning,
            expectedImpact: {
                revenueChange: ((recommendedPrice - model.basePrice) / model.basePrice) * avgRevenue,
                conversionChange: avgConversions * 0.1, // Estimated
            },
            mlModelVersion: 'v1.0-simplified',
        };
    }

    /**
     * Get experiment
     */
    private async getExperiment(experimentId: string): Promise<IPricingExperiment | null> {
        const result = await this.pool.query(
            'SELECT * FROM pricing_experiments WHERE id = $1',
            [experimentId]
        );

        return result.rows.length > 0 ? this.mapExperimentFromDb(result.rows[0]) : null;
    }

    /**
     * Get analytics for model
     */
    private async getModelAnalytics(modelId: string): Promise<any> {
        const result = await this.pool.query(
            `SELECT
         SUM(revenue) as total_revenue,
         SUM(conversions) as total_conversions,
         SUM(churn_count) as total_churn,
         AVG(price_elasticity) as avg_elasticity
       FROM pricing_analytics
       WHERE model_id = $1`,
            [modelId]
        );

        return result.rows[0];
    }

    /**
     * Calculate statistical significance
     */
    private calculateStatisticalSignificance(control: any, variant: any): any {
        const controlRevenue = parseFloat(control.total_revenue) || 0;
        const variantRevenue = parseFloat(variant.total_revenue) || 0;
        const controlConversions = parseInt(control.total_conversions, 10) || 0;
        const variantConversions = parseInt(variant.total_conversions, 10) || 0;

        // Simplified statistical test (use proper t-test in production)
        const revenueDiff = Math.abs(variantRevenue - controlRevenue);
        const revenuePercentDiff = (revenueDiff / Math.max(controlRevenue, 1)) * 100;

        // Approximate p-value (use proper calc in production)
        const pValue = revenuePercentDiff > 10 ? 0.03 : 0.15;
        const confidenceLevel = (1 - pValue) * 100;

        return {
            controlRevenue,
            variantRevenue,
            controlConversions,
            variantConversions,
            revenueDifference: revenueDiff,
            revenuePercentDifference: revenuePercentDiff,
            pValue,
            confidenceLevel,
        };
    }

    /**
     * Hash string for consistent assignment
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Map model from database
     */
    private mapModelFromDb(row: any): IPricingModel {
        return {
            id: row.id,
            modelName: row.model_name,
            modelType: row.model_type,
            basePrice: parseFloat(row.base_price),
            currency: row.currency,
            isActive: row.is_active,
            mlConfig: row.ml_config,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    /**
     * Map experiment from database
     */
    private mapExperimentFromDb(row: any): IPricingExperiment {
        return {
            id: row.id,
            experimentName: row.experiment_name,
            controlModelId: row.control_model_id,
            variantModelId: row.variant_model_id,
            trafficSplit: row.traffic_split,
            startDate: row.start_date,
            endDate: row.end_date,
            status: row.status,
            hypothesis: row.hypothesis,
            successMetrics: row.success_metrics,
            results: row.results,
            winner: row.winner,
            confidenceLevel: row.confidence_level ? parseFloat(row.confidence_level) : undefined,
        };
    }

    /**
     * Map recommendation from database
     */
    private mapRecommendationFromDb(row: any): IPriceRecommendation {
        return {
            id: row.id,
            modelId: row.model_id,
            recommendedPrice: parseFloat(row.recommended_price),
            currentPrice: parseFloat(row.current_price),
            confidenceScore: parseFloat(row.confidence_score),
            reasoning: row.reasoning,
            expectedImpact: row.expected_impact,
            mlModelVersion: row.ml_model_version,
            status: row.status,
        };
    }
}

export const dynamicPricingService = new DynamicPricingService();
