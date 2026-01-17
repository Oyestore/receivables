import { Request, Response, NextFunction } from 'express';
import { aiPersonalizationService } from '../services/ai-personalization.service';
import { capacityPlanningService } from '../services/ml-capacity-planning.service';
import { advancedAuthService } from '../services/advanced-auth.service';
import { auditService } from '../services/audit.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('P2FeaturesController');

/**
 * AI Personalization Controller
 */
export class PersonalizationController {
    /**
     * GET /api/v1/users/:id/profile
     * Get user profile
     */
    async getUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: userId } = req.params;

            const profile = await aiPersonalizationService.getUserProfile(userId);

            res.status(200).json({ data: profile });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/users/:id/behavior
     * Update user behavior
     */
    async updateBehavior(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: userId } = req.params;
            const { behaviorEvent } = req.body;

            if (!behaviorEvent) {
                throw new ValidationError('Behavior event is required');
            }

            await aiPersonalizationService.updateBehavior(userId, behaviorEvent);

            res.status(200).json({ message: 'Behavior updated' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/users/:id/recommendations
     * Get recommendations
     */
    async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: userId } = req.params;
            const { itemType, limit } = req.query;

            if (!itemType) {
                throw new ValidationError('Item type is required');
            }

            const recommendations = await aiPersonalizationService.getRecommendations(
                userId,
                itemType as string,
                limit ? parseInt(limit as string, 10) : 10
            );

            res.status(200).json({ data: recommendations, total: recommendations.length });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/personalization/rules
     * Create personalization rule
     */
    async createRule(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { ruleName, targetSegment, conditions, actions, priority } = req.body;

            if (!ruleName || !conditions || !actions) {
                throw new ValidationError('Rule name, conditions, and actions are required');
            }

            const rule = await aiPersonalizationService.createRule({
                ruleName,
                targetSegment,
                conditions,
                actions,
                priority,
            });

            res.status(201).json({ message: 'Rule created', data: rule });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/experiments
     * Create A/B experiment
     */
    async createExperiment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { experimentName, description, variants, trafficSplit, metrics } = req.body;

            if (!experimentName || !variants || !trafficSplit) {
                throw new ValidationError('Experiment name, variants, and traffic split are required');
            }

            const experiment = await aiPersonalizationService.createExperiment(
                {
                    experimentName,
                    description,
                    variants,
                    trafficSplit,
                    metrics,
                },
                req.user?.id
            );

            res.status(201).json({ message: 'Experiment created', data: experiment });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/experiments/:id/assign
     * Assign user to experiment
     */
    async assignToExperiment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: experimentId } = req.params;
            const { userId } = req.body;

            if (!userId) {
                throw new ValidationError('User ID is required');
            }

            const assignment = await aiPersonalizationService.assignToExperiment(userId, experimentId);

            res.status(200).json({ message: 'User assigned', data: assignment });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/segments
     * Create user segment
     */
    async createSegment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { segmentName, criteria, mlModelId } = req.body;

            if (!segmentName || !criteria) {
                throw new ValidationError('Segment name and criteria are required');
            }

            const segment = await aiPersonalizationService.createSegment({
                segmentName,
                criteria,
                mlModelId,
            });

            res.status(201).json({ message: 'Segment created', data: segment });
        } catch (error) {
            next(error);
        }
    }
}

/**
 * ML Capacity Planning Controller
 */
export class CapacityPlanningController {
    /**
     * POST /api/v1/capacity/:tenantId/metrics
     * Record resource metric
     */
    async recordMetric(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { resourceType, metricName, value, unit } = req.body;

            if (!resourceType || !metricName || value === undefined) {
                throw new ValidationError('Resource type, metric name, and value are required');
            }

            const metric = await capacityPlanningService.recordMetric({
                tenantId,
                resourceType,
                metricName,
                value,
                unit,
            });

            res.status(201).json({ message: 'Metric recorded', data: metric });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/capacity/:tenantId/forecast
     * Generate capacity forecast
     */
    async generateForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { daysAhead } = req.query;

            const forecasts = await capacityPlanningService.generateForecast(
                tenantId,
                daysAhead ? parseInt(daysAhead as string, 10) : 30
            );

            res.status(200).json({ data: forecasts, total: forecasts.length });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/capacity/:tenantId/scaling-policy
     * Create scaling policy
     */
    async createScalingPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { policyName, resourceType, scaleTrigger, scaleAction, cooldownMinutes } = req.body;

            if (!policyName || !resourceType || !scaleTrigger || !scaleAction) {
                throw new ValidationError('Policy name, resource type, trigger, and action are required');
            }

            const policy = await capacityPlanningService.createScalingPolicy({
                tenantId,
                policyName,
                resourceType,
                scaleTrigger,
                scaleAction,
                cooldownMinutes,
            });

            res.status(201).json({ message: 'Scaling policy created', data: policy });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/capacity/:tenantId/cost-analysis
     * Generate cost analysis
     */
    async analyzeCosts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { periodStart, periodEnd } = req.query;

            if (!periodStart || !periodEnd) {
                throw new ValidationError('Period start and end dates are required');
            }

            const analysis = await capacityPlanningService.analyzeCosts(
                tenantId,
                new Date(periodStart as string),
                new Date(periodEnd as string)
            );

            res.status(200).json({ data: analysis });
        } catch (error) {
            next(error);
        }
    }
}

/**
 * Advanced Authentication Controller
 */
export class AdvancedAuthController {
    /**
     * POST /api/v1/auth/biometric/register
     * Register biometric credential
     */
    async registerBiometric(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, biometricType, deviceId, publicKey, credentialId } = req.body;

            if (!userId || !biometricType || !publicKey) {
                throw new ValidationError('User ID, biometric type, and public key are required');
            }

            const registration = await advancedAuthService.registerBiometric({
                userId,
                biometricType,
                deviceId,
                publicKey,
                credentialId,
            });

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId,
                action: 'biometric.register',
                resourceType: 'biometric',
                resourceId: registration.id,
                changes: { biometricType },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({ message: 'Biometric registered', data: registration });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/auth/biometric/verify
     * Verify biometric authentication
     */
    async verifyBiometric(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, credentialId, signature, challenge } = req.body;

            if (!userId || !credentialId || !signature || !challenge) {
                throw new ValidationError('User ID, credential ID, signature, and challenge are required');
            }

            const isValid = await advancedAuthService.verifyBiometric({
                userId,
                credentialId,
                signature,
                challenge,
            });

            res.status(200).json({ valid: isValid });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/auth/hardware-token/register
     * Register hardware token
     */
    async registerHardwareToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, tokenSerial, tokenType } = req.body;

            if (!userId || !tokenSerial || !tokenType) {
                throw new ValidationError('User ID, token serial, and token type are required');
            }

            const token = await advancedAuthService.registerHardwareToken({
                userId,
                tokenSerial,
                tokenType,
            });

            res.status(201).json({ message: 'Hardware token registered', data: token });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/auth/hardware-token/validate
     * Validate hardware token
     */
    async validateHardwareToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, tokenSerial, otp } = req.body;

            if (!userId || !tokenSerial || !otp) {
                throw new ValidationError('User ID, token serial, and OTP are required');
            }

            const isValid = await advancedAuthService.validateHardwareToken(userId, tokenSerial, otp);

            res.status(200).json({ valid: isValid });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/directory/connect
     * Create directory connection
     */
    async createDirectoryConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { directoryType, connectionConfig, syncConfig } = req.body;

            if (!req.user?.tenantId || !directoryType || !connectionConfig) {
                throw new ValidationError('Tenant ID, directory type, and connection config are required');
            }

            const connection = await advancedAuthService.createDirectoryConnection({
                tenantId: req.user.tenantId,
                directoryType,
                connectionConfig,
                syncConfig,
            });

            res.status(201).json({ message: 'Directory connected', data: connection });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/directory/:id/sync
     * Sync directory users
     */
    async syncDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: connectionId } = req.params;
            const { syncType } = req.body;

            const syncLog = await advancedAuthService.syncDirectory(connectionId, syncType || 'manual');

            res.status(202).json({ message: 'Directory sync started', data: syncLog });
        } catch (error) {
            next(error);
        }
    }
}

export const personalizationController = new PersonalizationController();
export const capacityPlanningController = new CapacityPlanningController();
export const advancedAuthController = new AdvancedAuthController();
