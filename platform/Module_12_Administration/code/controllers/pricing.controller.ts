import { Request, Response, NextFunction } from 'express';
import { dynamicPricingService } from '../services/dynamic-pricing.service';
import { auditService } from '../services/audit.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('PricingController');

export class PricingController {
    /**
     * POST /api/v1/pricing/models
     * Create pricing model
     */
    async createModel(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { modelName, modelType, basePrice, currency, description, mlConfig } = req.body;

            if (!modelName || !modelType || basePrice === undefined) {
                throw new ValidationError('Missing required fields');
            }

            const model = await dynamicPricingService.createModel(
                { modelName, modelType, basePrice, currency, description, mlConfig },
                req.user?.id
            );

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId: req.user?.id,
                action: 'pricing.model_create',
                resourceType: 'pricing_model',
                resourceId: model.id,
                changes: { modelName, basePrice },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Pricing model created',
                data: model,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/pricing/calculate
     * Calculate price with discounts
     */
    async calculatePrice(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { modelId, tenantId, volume, region, discountCodes, customParameters } = req.body;

            if (!modelId) {
                throw new ValidationError('Model ID is required');
            }

            const result = await dynamicPricingService.calculatePrice({
                modelId,
                tenantId,
                volume,
                region,
                discountCodes,
                customParameters,
            });

            logger.info('Price calculated', {
                modelId,
                finalPrice: result.finalPrice,
            });

            res.status(200).json({
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/pricing/models/:id/recommendation
     * Get ML-based price recommendation
     */
    async getRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            const recommendation = await dynamicPricingService.getPriceRecommendation(id);

            if (!recommendation) {
                res.status(200).json({
                    message: 'No recommendation available yet. More data needed.',
                    data: null,
                });
                return;
            }

            res.status(200).json({
                data: recommendation,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/pricing/experiments
     * Create A/B pricing experiment
     */
    async createExperiment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                experimentName,
                controlModelId,
                variantModelId,
                trafficSplit,
                startDate,
                endDate,
                hypothesis,
                successMetrics,
            } = req.body;

            if (!experimentName || !controlModelId || !variantModelId || !startDate) {
                throw new ValidationError('Missing required fields');
            }

            const experiment = await dynamicPricingService.createExperiment(
                {
                    experimentName,
                    controlModelId,
                    variantModelId,
                    trafficSplit,
                    startDate: new Date(startDate),
                    endDate: endDate ? new Date(endDate) : undefined,
                    hypothesis,
                    successMetrics,
                },
                req.user?.id
            );

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId: req.user?.id,
                action: 'pricing.experiment_create',
                resourceType: 'pricing_experiment',
                resourceId: experiment.id,
                changes: { experimentName, controlModelId, variantModelId },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Pricing experiment created',
                data: experiment,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/pricing/experiments/:id/assign
     * Assign tenant to experiment
     */
    async assignToExperiment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { tenantId } = req.body;

            if (!tenantId) {
                throw new ValidationError('Tenant ID is required');
            }

            const variant = await dynamicPricingService.assignTenantToExperiment(tenantId, id);

            res.status(200).json({
                message: 'Tenant assigned to experiment',
                data: {
                    experimentId: id,
                    tenantId,
                    assignedVariant: variant,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/pricing/experiments/:id/results
     * Get experiment results
     */
    async getExperimentResults(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            const results = await dynamicPricingService.calculateExperimentResults(id);

            res.status(200).json({
                data: results,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const pricingController = new PricingController();
