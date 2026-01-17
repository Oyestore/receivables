import { Request, Response, NextFunction } from 'express';
import { riskAssessmentService } from '../services/risk-assessment.service';
import { auditService } from '../services/audit.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('RiskController');

export class RiskController {
    /**
     * GET /api/v1/risk/categories
     * Get risk categories
     */
    async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { activeOnly } = req.query;

            const categories = await riskAssessmentService.getCategories(
                activeOnly === 'false' ? false : true
            );

            res.status(200).json({
                data: categories,
                total: categories.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/risk/assessments
     * Create risk assessment
     */
    async createAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { assessmentDate, assessmentType, assessorId, assessorName } = req.body;

            if (!req.user?.tenantId) {
                throw new ValidationError('Tenant ID is required');
            }

            const assessment = await riskAssessmentService.createAssessment({
                tenantId: req.user.tenantId,
                assessmentDate: assessmentDate ? new Date(assessmentDate) : new Date(),
                assessmentType,
                assessorId,
                assessorName,
            });

            await auditService.log({
                tenantId: req.user.tenantId,
                userId: req.user.id,
                action: 'risk.assessment_create',
                resourceType: 'risk_assessment',
                resourceId: assessment.id,
                changes: { assessmentType },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Risk assessment created',
                data: assessment,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/risk/events
     * Record risk event
     */
    async recordEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                categoryId,
                eventTitle,
                eventDescription,
                eventType,
                severity,
                impactScore,
                likelihoodScore,
                affectedSystems,
                financialImpact,
            } = req.body;

            if (!eventTitle || !severity) {
                throw new ValidationError('Event title and severity are required');
            }

            const event = await riskAssessmentService.recordEvent({
                tenantId: req.user?.tenantId,
                categoryId,
                eventTitle,
                eventDescription,
                eventType,
                severity,
                impactScore,
                likelihoodScore,
                affectedSystems,
                financialImpact,
                reportedBy: req.user?.id,
            });

            res.status(201).json({
                message: 'Risk event recorded',
                data: event,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/risk/mitigation
     * Create mitigation plan
     */
    async createMitigation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                assessmentId,
                eventId,
                categoryId,
                riskDescription,
                mitigationStrategy,
                mitigationType,
                implementationPlan,
                assignedTo,
                ownerName,
                priority,
                dueDate,
                estimatedCost,
            } = req.body;

            if (!riskDescription || !mitigationStrategy) {
                throw new ValidationError('Risk description and mitigation strategy are required');
            }

            const mitigation = await riskAssessmentService.createMitigation({
                tenantId: req.user?.tenantId,
                assessmentId,
                eventId,
                categoryId,
                riskDescription,
                mitigationStrategy,
                mitigationType,
                implementationPlan,
                assignedTo,
                ownerName,
                priority,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                estimatedCost,
            });

            res.status(201).json({
                message: 'Mitigation plan created',
                data: mitigation,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/risk/score/:tenantId
     * Calculate risk score
     */
    async calculateScore(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { categoryId } = req.query;

            const score = await riskAssessmentService.calculateRiskScore(
                tenantId,
                categoryId as string
            );

            res.status(200).json({
                data: {
                    tenantId,
                    categoryId,
                    riskScore: score,
                    riskLevel: score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low',
                    calculatedAt: new Date(),
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/risk/trends/:tenantId
     * Get risk trends
     */
    async getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { days } = req.query;

            // Update current trends first
            await riskAssessmentService.updateTrends(tenantId);

            const trends = await riskAssessmentService.getTrends(
                tenantId,
                days ? parseInt(days as string, 10) : 30
            );

            res.status(200).json({
                data: trends,
                total: trends.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/risk/predictions/:tenantId
     * Generate risk prediction
     */
    async generatePrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tenantId } = req.params;
            const { predictionHorizon, categoryId } = req.body;

            if (!predictionHorizon) {
                throw new ValidationError('Prediction horizon is required');
            }

            const prediction = await riskAssessmentService.generatePrediction(
                tenantId,
                predictionHorizon,
                categoryId
            );

            res.status(200).json({
                message: 'Risk prediction generated',
                data: prediction,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const riskController = new RiskController();
