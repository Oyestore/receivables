import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { Milestone } from '../entities/milestone.entity';
import { MilestonePrediction } from '../entities/milestone-prediction.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { MLServiceConnector } from '../integrations/ml/ml-service.connector';

export interface PredictionResult {
    milestoneId: string;
    estimatedCompletionDate: Date;
    confidence: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    delayProbability: number;
    recommendations: Recommendation[];
    factors: PredictionFactors;
}

export interface Recommendation {
    type: 'RESOURCE' | 'SCHEDULE' | 'SCOPE' | 'DEPENDENCY';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    title: string;
    description: string;
    expectedImpact: string;
    actionItems: string[];
}

export interface PredictionFactors {
    velocity: number;
    historicalAccuracy: number;
    dependencyStatus: string;
    resourceAvailability: number;
    complexityScore: number;
}

export interface HighRiskMilestone {
    milestoneId: string;
    milestoneName: string;
    riskLevel: string;
    delayProbability: number;
    estimatedDelay: number; // days
    recommendations: Recommendation[];
}

/**
 * Prediction Service
 * 
 * Orchestrates ML predictions for milestone completion
 * Provides caching, batch predictions, and high-risk detection
 */
@Injectable()
export class PredictionService {
    private readonly logger = new Logger(PredictionService.name);
    private readonly predictionCacheTTL = 6 * 60 * 60 * 1000; // 6 hours

    constructor(
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
        @InjectRepository(MilestonePrediction)
        private readonly predictionRepository: Repository<MilestonePrediction>,
        @InjectRepository(WorkflowInstance)
        private readonly workflowInstanceRepository: Repository<WorkflowInstance>,
        private readonly mlConnector: MLServiceConnector,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.logger.log('Prediction Service initialized');
    }

    /**
     * Predict completion for a single milestone
     */
    async predictMilestoneCompletion(milestoneId: string, useCache: boolean = true): Promise<PredictionResult> {
        try {
            this.logger.log(`Predicting completion for milestone: ${milestoneId}`);

            // Check cache first
            if (useCache) {
                const cached = await this.getCachedPrediction(milestoneId);
                if (cached) {
                    this.logger.log(`Using cached prediction for milestone: ${milestoneId}`);
                    return cached;
                }
            }

            const milestone = await this.milestoneRepository.findOne({
                where: { id: milestoneId, isDeleted: false },
            });

            if (!milestone) {
                throw new Error(`Milestone ${milestoneId} not found`);
            }

            // Skip prediction for completed milestones
            if (milestone.status === 'COMPLETED') {
                return this.createCompletedPrediction(milestone);
            }

            // Try ML prediction first
            let prediction = await this.mlConnector.predictMilestoneCompletion(milestoneId);

            // Fallback to rule-based if ML unavailable
            if (!prediction) {
                this.logger.warn(`ML prediction unavailable for ${milestoneId}, using rule-based`);
                prediction = await this.ruleBasedPrediction(milestone);
            }

            // Enhance with additional factors
            const factors = await this.calculatePredictionFactors(milestone);

            const result: PredictionResult = {
                milestoneId: milestone.id,
                estimatedCompletionDate: prediction.estimatedCompletionDate,
                confidence: prediction.confidence,
                riskLevel: prediction.riskLevel,
                delayProbability: prediction.delayProbability,
                recommendations: prediction.recommendations,
                factors,
            };

            // Cache the prediction
            await this.cachePrediction(result, 'ML_SERVICE');

            // Emit high-risk event if needed
            if (result.riskLevel === 'HIGH' || result.riskLevel === 'CRITICAL') {
                this.eventEmitter.emit('milestone.high.risk.detected', {
                    milestoneId: result.milestoneId,
                    riskLevel: result.riskLevel,
                    delayProbability: result.delayProbability,
                });
            }

            return result;
        } catch (error) {
            this.logger.error(`Failed to predict milestone ${milestoneId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Predict completion for all milestones in a workflow
     */
    async predictAllWorkflowMilestones(workflowInstanceId: string): Promise<PredictionResult[]> {
        try {
            this.logger.log(`Predicting all milestones for workflow: ${workflowInstanceId}`);

            const milestones = await this.milestoneRepository.find({
                where: {
                    workflowInstanceId,
                    isDeleted: false,
                },
                order: { dueDate: 'ASC' },
            });

            const predictions: PredictionResult[] = [];

            for (const milestone of milestones) {
                try {
                    const prediction = await this.predictMilestoneCompletion(milestone.id);
                    predictions.push(prediction);
                } catch (error) {
                    this.logger.error(`Failed to predict milestone ${milestone.id}: ${error.message}`);
                }
            }

            return predictions;
        } catch (error) {
            this.logger.error(`Failed to predict workflow ${workflowInstanceId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Detect high-risk milestones for a tenant
     */
    async detectHighRiskMilestones(tenantId: string): Promise<HighRiskMilestone[]> {
        try {
            const activeMilestones = await this.milestoneRepository.find({
                where: {
                    tenantId,
                    status: 'IN_PROGRESS',
                    isDeleted: false,
                },
            });

            const highRiskMilestones: HighRiskMilestone[] = [];

            for (const milestone of activeMilestones) {
                const prediction = await this.predictMilestoneCompletion(milestone.id);

                if (prediction.riskLevel === 'HIGH' || prediction.riskLevel === 'CRITICAL') {
                    const estimatedDelay = Math.ceil(
                        (prediction.estimatedCompletionDate.getTime() - (milestone.dueDate?.getTime() || Date.now())) /
                        (1000 * 60 * 60 * 24)
                    );

                    highRiskMilestones.push({
                        milestoneId: milestone.id,
                        milestoneName: milestone.name,
                        riskLevel: prediction.riskLevel,
                        delayProbability: prediction.delayProbability,
                        estimatedDelay: Math.max(0, estimatedDelay),
                        recommendations: prediction.recommendations,
                    });
                }
            }

            return highRiskMilestones;
        } catch (error) {
            this.logger.error(`Failed to detect high-risk milestones: ${error.message}`);
            return [];
        }
    }

    /**
     * Update all active predictions (scheduled job)
     */
    @Cron('0 */6 * * *') // Every 6 hours
    async updateAllPredictions(): Promise<void> {
        try {
            this.logger.log('Starting scheduled prediction update');

            const activeWorkflows = await this.workflowInstanceRepository.find({
                where: {
                    status: 'IN_PROGRESS',
                    isDeleted: false,
                },
            });

            let totalUpdated = 0;

            for (const workflow of activeWorkflows) {
                const predictions = await this.predictAllWorkflowMilestones(workflow.id);
                totalUpdated += predictions.length;
            }

            this.logger.log(`Scheduled prediction update complete - ${totalUpdated} predictions updated`);
        } catch (error) {
            this.logger.error(`Scheduled prediction update failed: ${error.message}`);
        }
    }

    /**
     * Cache prediction
     */
    private async cachePrediction(
        prediction: PredictionResult,
        source: string = 'ML_SERVICE',
    ): Promise<void> {
        try {
            await this.predictionRepository.save({
                milestoneId: prediction.milestoneId,
                tenantId: await this.getMilestoneTenantId(prediction.milestoneId),
                estimatedCompletionDate: prediction.estimatedCompletionDate,
                confidence: prediction.confidence,
                riskLevel: prediction.riskLevel,
                delayProbability: prediction.delayProbability,
                recommendations: prediction.recommendations,
                factors: prediction.factors,
                predictionSource: source,
                isActive: true,
            });
        } catch (error) {
            this.logger.error(`Failed to cache prediction: ${error.message}`);
        }
    }

    /**
     * Get cached prediction
     */
    private async getCachedPrediction(milestoneId: string): Promise<PredictionResult | null> {
        try {
            const cacheExpiry = new Date(Date.now() - this.predictionCacheTTL);

            const cached = await this.predictionRepository.findOne({
                where: {
                    milestoneId,
                    isActive: true,
                    createdAt: MoreThan(cacheExpiry),
                },
                order: { createdAt: 'DESC' },
            });

            if (!cached) {
                return null;
            }

            return {
                milestoneId: cached.milestoneId,
                estimatedCompletionDate: cached.estimatedCompletionDate,
                confidence: cached.confidence,
                riskLevel: cached.riskLevel as any,
                delayProbability: cached.delayProbability,
                recommendations: cached.recommendations || [],
                factors: cached.factors as any,
            };
        } catch (error) {
            this.logger.error(`Failed to get cached prediction: ${error.message}`);
            return null;
        }
    }

    /**
     * Rule-based prediction (fallback when ML unavailable)
     */
    private async ruleBasedPrediction(milestone: Milestone): Promise<any> {
        const now = new Date();
        const startedAt = milestone.startedAt || milestone.createdAt || now;
        const progress = milestone.completionPercentage || 0;

        // Calculate velocity (progress per day)
        const daysElapsed = Math.max(1, (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24));
        const velocity = progress / daysElapsed;

        // Estimate remaining days
        const remainingProgress = 100 - progress;
        const estimatedRemainingDays = velocity > 0 ? remainingProgress / velocity : 30;

        // Calculate estimated completion
        const estimatedCompletionDate = new Date(now.getTime() + estimatedRemainingDays * 24 * 60 * 60 * 1000);

        // Determine risk level
        const daysUntilDue = milestone.dueDate
            ? (milestone.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            : 999;

        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        let delayProbability = 0;

        if (estimatedRemainingDays > daysUntilDue + 7) {
            riskLevel = 'CRITICAL';
            delayProbability = 0.9;
        } else if (estimatedRemainingDays > daysUntilDue + 3) {
            riskLevel = 'HIGH';
            delayProbability = 0.7;
        } else if (estimatedRemainingDays > daysUntilDue) {
            riskLevel = 'MEDIUM';
            delayProbability = 0.4;
        } else {
            riskLevel = 'LOW';
            delayProbability = 0.1;
        }

        // Generate recommendations
        const recommendations: Recommendation[] = [];
        if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
            recommendations.push({
                type: 'RESOURCE',
                priority: 'HIGH',
                title: 'Increase Resource Allocation',
                description: `Current velocity suggests ${Math.ceil(estimatedRemainingDays - daysUntilDue)} day delay`,
                expectedImpact: 'Reduce delay by 50%',
                actionItems: [
                    'Add 1-2 additional team members',
                    'Prioritize this milestone over others',
                ],
            });
        }

        return {
            estimatedCompletionDate,
            confidence: 0.6, // Rule-based has lower confidence
            riskLevel,
            delayProbability,
            recommendations,
        };
    }

    /**
     * Calculate prediction factors
     */
    private async calculatePredictionFactors(milestone: Milestone): Promise<PredictionFactors> {
        // Get historical accuracy for similar milestones
        const historicalPredictions = await this.predictionRepository.find({
            where: {
                tenantId: milestone.tenantId,
                wasAccurate: true,
            },
            take: 20,
        });

        const historicalAccuracy = historicalPredictions.length > 0
            ? historicalPredictions.reduce((sum, p) => sum + p.accuracyScore, 0) / historicalPredictions.length
            : 70; // Default

        return {
            velocity: milestone.completionPercentage || 0,
            historicalAccuracy,
            dependencyStatus: 'NORMAL', // TODO: Calculate from dependencies
            resourceAvailability: 0.8, // TODO: Get from resource management
            complexityScore: 0.5, // TODO: Calculate from milestone metadata
        };
    }

    /**
     * Create prediction for completed milestone
     */
    private createCompletedPrediction(milestone: Milestone): PredictionResult {
        return {
            milestoneId: milestone.id,
            estimatedCompletionDate: milestone.completedAt,
            confidence: 1.0,
            riskLevel: 'LOW',
            delayProbability: 0,
            recommendations: [],
            factors: {
                velocity: 100,
                historicalAccuracy: 100,
                dependencyStatus: 'COMPLETE',
                resourceAvailability: 1.0,
                complexityScore: 0,
            },
        };
    }

    /**
     * Get tenant ID for milestone
     */
    private async getMilestoneTenantId(milestoneId: string): Promise<string> {
        const milestone = await this.milestoneRepository.findOne({
            where: { id: milestoneId },
            select: ['tenantId'],
        });
        return milestone?.tenantId || 'unknown';
    }

    /**
     * Track prediction accuracy (called when milestone completes)
     */
    async trackPredictionAccuracy(milestoneId: string, actualCompletionDate: Date): Promise<void> {
        try {
            const predictions = await this.predictionRepository.find({
                where: { milestoneId, isActive: true },
                order: { createdAt: 'DESC' },
            });

            for (const prediction of predictions) {
                const predictedDate = prediction.estimatedCompletionDate;
                const deviationMs = Math.abs(actualCompletionDate.getTime() - predictedDate.getTime());
                const deviationDays = Math.ceil(deviationMs / (1000 * 60 * 60 * 24));

                // Consider accurate if within 3 days
                const wasAccurate = deviationDays <= 3;
                const accuracyScore = Math.max(0, 100 - (deviationDays * 10));

                await this.predictionRepository.update(prediction.id, {
                    actualCompletionDate,
                    wasAccurate,
                    deviationDays,
                    accuracyScore,
                });
            }

            this.logger.log(`Tracked prediction accuracy for milestone: ${milestoneId}`);
        } catch (error) {
            this.logger.error(`Failed to track prediction accuracy: ${error.message}`);
        }
    }
}
