import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone } from '../../entities/milestone.entity';
import { MilestoneVerification } from '../../entities/milestone-verification.entity';

/**
 * ML Service Connector
 * 
 * Connects to ML services for AI-powered predictions and verification
 * Foundation for Phase 2 AI features
 */
@Injectable()
export class MLServiceConnector {
    private readonly logger = new Logger(MLServiceConnector.name);
    private readonly mlServiceUrl: string;
    private isMLServiceAvailable: boolean = false;

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
    ) {
        this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
        this.checkMLServiceAvailability();
    }

    /**
     * Check if ML service is available
     */
    private async checkMLServiceAvailability(): Promise<void> {
        try {
            await firstValueFrom(
                this.httpService.get(`${this.mlServiceUrl}/health`, { timeout: 3000 })
            );
            this.isMLServiceAvailable = true;
            this.logger.log(`ML Service connected at ${this.mlServiceUrl}`);
        } catch (error) {
            this.isMLServiceAvailable = false;
            this.logger.warn(`ML Service not available at ${this.mlServiceUrl} - AI features disabled`);
        }
    }

    /**
     * Predict milestone completion date and risk
     * Returns null if ML service unavailable (graceful degradation)
     */
    async predictMilestoneCompletion(milestoneId: string): Promise<{
        estimatedCompletionDate: Date;
        confidence: number;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        delayProbability: number;
        recommendations: string[];
    } | null> {
        if (!this.isMLServiceAvailable) {
            this.logger.debug('ML Service unavailable - skipping prediction');
            return null;
        }

        try {
            const milestone = await this.getMilestoneWithHistory(milestoneId);

            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.mlServiceUrl}/api/predict/milestone-completion`,
                    {
                        milestoneId: milestone.id,
                        currentProgress: milestone.completionPercentage || 0,
                        dueDate: milestone.dueDate,
                        startedAt: milestone.startedAt,
                        estimatedDuration: milestone.estimatedDurationDays,
                        dependencies: milestone.dependencies || [],
                        historicalData: milestone.historicalData || {},
                        workflowType: milestone.workflowType,
                    },
                    { timeout: 10000 }
                )
            );

            const prediction = response.data;

            return {
                estimatedCompletionDate: new Date(prediction.completion_date),
                confidence: prediction.confidence,
                riskLevel: prediction.risk_level,
                delayProbability: prediction.delay_probability,
                recommendations: prediction.recommendations || [],
            };
        } catch (error) {
            this.logger.error(`ML prediction failed for milestone ${milestoneId}: ${error.message}`);
            return null;
        }
    }

    /**
     * Verify evidence using AI (computer vision + NLP)
     * Returns null if ML service unavailable
     */
    async verifyEvidenceWithAI(evidenceId: string, evidenceData: {
        type: string;
        fileUrl: string;
        requirements: string[];
    }): Promise<{
        isValid: boolean;
        confidence: number;
        findings: string[];
        requiresHumanReview: boolean;
        matchedRequirements: string[];
        missingRequirements: string[];
    } | null> {
        if (!this.isMLServiceAvailable) {
            this.logger.debug('ML Service unavailable - skipping AI verification');
            return null;
        }

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.mlServiceUrl}/api/verify/evidence`,
                    {
                        evidenceId,
                        evidenceType: evidenceData.type,
                        fileUrl: evidenceData.fileUrl,
                        requirements: evidenceData.requirements,
                    },
                    { timeout: 15000 } // Longer timeout for AI processing
                )
            );

            const verification = response.data;

            return {
                isValid: verification.is_valid,
                confidence: verification.confidence,
                findings: verification.findings || [],
                requiresHumanReview: verification.needs_review,
                matchedRequirements: verification.matched_requirements || [],
                missingRequirements: verification.missing_requirements || [],
            };
        } catch (error) {
            this.logger.error(`AI verification failed for evidence ${evidenceId}: ${error.message}`);
            return null;
        }
    }

    /**
     * Detect anomalies in workflow execution
     */
    async detectWorkflowAnomalies(workflowInstanceId: string): Promise<{
        anomalies: Array<{
            type: string;
            severity: 'LOW' | 'MEDIUM' | 'HIGH';
            description: string;
            affectedMilestones: string[];
        }>;
    } | null> {
        if (!this.isMLServiceAvailable) {
            return null;
        }

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.mlServiceUrl}/api/detect/anomalies`,
                    { workflowInstanceId },
                    { timeout: 10000 }
                )
            );

            return {
                anomalies: response.data.anomalies || [],
            };
        } catch (error) {
            this.logger.error(`Anomaly detection failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Get AI-powered recommendations for workflow optimization
     */
    async getWorkflowRecommendations(workflowDefinitionId: string): Promise<{
        recommendations: Array<{
            type: string;
            priority: 'LOW' | 'MEDIUM' | 'HIGH';
            title: string;
            description: string;
            expectedImpact: string;
        }>;
    } | null> {
        if (!this.isMLServiceAvailable) {
            return null;
        }

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.mlServiceUrl}/api/recommend/workflow-optimization`,
                    { workflowDefinitionId },
                    { timeout: 10000 }
                )
            );

            return {
                recommendations: response.data.recommendations || [],
            };
        } catch (error) {
            this.logger.error(`Failed to get recommendations: ${error.message}`);
            return null;
        }
    }

    /**
     * Get milestone with historical data for prediction
     */
    private async getMilestoneWithHistory(milestoneId: string): Promise<any> {
        const milestone = await this.milestoneRepository.findOne({
            where: { id: milestoneId, isDeleted: false },
            relations: ['workflowInstance', 'workflowInstance.workflowDefinition'],
        });

        if (!milestone) {
            throw new Error(`Milestone ${milestoneId} not found`);
        }

        // Fetch similar historical milestones for better prediction
        const historicalMilestones = await this.milestoneRepository.find({
            where: {
                tenantId: milestone.tenantId,
                status: 'COMPLETED',
                type: milestone.type,
                isDeleted: false,
            },
            take: 20,
            order: { completedAt: 'DESC' },
        });

        return {
            ...milestone,
            historicalData: {
                similarMilestones: historicalMilestones.map(m => ({
                    duration: m.startedAt && m.completedAt
                        ? (m.completedAt.getTime() - m.startedAt.getTime()) / (1000 * 60 * 60 * 24)
                        : null,
                    wasOnTime: m.completedAt && m.dueDate ? m.completedAt <= m.dueDate : null,
                    completionPercentage: m.completionPercentage,
                })),
            },
            workflowType: milestone.workflowInstance?.workflowDefinition?.type,
        };
    }

    /**
     * Health check for ML service
     */
    async isHealthy(): Promise<boolean> {
        await this.checkMLServiceAvailability();
        return this.isMLServiceAvailable;
    }
}
