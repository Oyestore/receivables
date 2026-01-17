import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { Milestone, MilestoneStatus } from '../entities/milestone.entity';
import { PredictionService, PredictionResult } from './prediction.service';

export interface RiskFactors {
    velocityRisk: number;        // 0-100
    dependencyRisk: number;      // 0-100
    resourceRisk: number;        // 0-100
    historicalRisk: number;      // 0-100
    deadlineProximity: number;   // 0-100
    complexityRisk: number;      // 0-100
    stakeholderRisk: number;     // 0-100
}

export interface RiskScore {
    milestoneId: string;
    overall: number; // 0-100
    breakdown: RiskFactors;
    trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
    projectedRiskDays: number; // When risk will materialize
    lastUpdated: Date;
}

export interface RiskAlert {
    milestoneId: string;
    milestoneName: string;
    riskScore: number;
    alertLevel: 'WARNING' | 'DANGER' | 'CRITICAL';
    reason: string;
    recommendations: string[];
}

/**
 * Risk Monitoring Service
 * 
 * Continuously monitors milestones for risk indicators
 * Triggers auto-escalation for high-risk situations
 */
@Injectable()
export class RiskMonitoringService {
    private readonly logger = new Logger(RiskMonitoringService.name);
    private readonly riskThresholds = {
        WARNING: 60,
        DANGER: 75,
        CRITICAL: 85,
    };

    constructor(
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
        private readonly predictionService: PredictionService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.logger.log('Risk Monitoring Service initialized');
    }

    /**
     * Calculate comprehensive risk score for a milestone
     */
    async calculateRiskScore(milestoneId: string): Promise<RiskScore> {
        try {
            const milestone = await this.milestoneRepository.findOne({
                where: { id: milestoneId, isDeleted: false },
            });

            if (!milestone) {
                throw new Error(`Milestone ${milestoneId} not found`);
            }

            // Get AI prediction for additional context
            let prediction: PredictionResult | null = null;
            try {
                prediction = await this.predictionService.predictMilestoneCompletion(milestoneId);
            } catch (error) {
                this.logger.warn(`Could not get prediction for risk calculation: ${error.message}`);
            }

            // Calculate individual risk factors
            const breakdown: RiskFactors = {
                velocityRisk: await this.calculateVelocityRisk(milestone, prediction),
                dependencyRisk: await this.calculateDependencyRisk(milestone),
                resourceRisk: await this.calculateResourceRisk(milestone),
                historicalRisk: await this.calculateHistoricalRisk(milestone),
                deadlineProximity: await this.calculateDeadlineProximityRisk(milestone),
                complexityRisk: await this.calculateComplexityRisk(milestone),
                stakeholderRisk: await this.calculateStakeholderRisk(milestone),
            };

            // Calculate overall risk (weighted average)
            const weights = {
                velocityRisk: 0.25,
                dependencyRisk: 0.15,
                resourceRisk: 0.15,
                historicalRisk: 0.10,
                deadlineProximity: 0.20,
                complexityRisk: 0.10,
                stakeholderRisk: 0.05,
            };

            const overall = Object.keys(breakdown).reduce((sum, key) => {
                return sum + (breakdown[key] * weights[key]);
            }, 0);

            // Determine trend (compare with historical scores - simplified for now)
            const trend = this.determineTrend(overall, prediction);

            // Project when risk will materialize
            const projectedRiskDays = this.projectRiskMaterialization(milestone, overall);

            const riskScore: RiskScore = {
                milestoneId: milestone.id,
                overall: Math.round(overall),
                breakdown,
                trend,
                projectedRiskDays,
                lastUpdated: new Date(),
            };

            // Trigger alerts if needed
            await this.checkAndTriggerAlerts(milestone, riskScore);

            return riskScore;
        } catch (error) {
            this.logger.error(`Failed to calculate risk score for ${milestoneId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Monitor all active milestones for a tenant
     */
    async monitorAllActiveMilestones(tenantId: string): Promise<RiskAlert[]> {
        try {
            const activeMilestones = await this.milestoneRepository.find({
                where: {
                    tenantId,
                    status: MilestoneStatus.IN_PROGRESS,
                    isDeleted: false,
                },
            });

            const alerts: RiskAlert[] = [];

            for (const milestone of activeMilestones) {
                const riskScore = await this.calculateRiskScore(milestone.id);

                if (riskScore.overall >= this.riskThresholds.WARNING) {
                    const alert: RiskAlert = {
                        milestoneId: milestone.id,
                        milestoneName: milestone.name,
                        riskScore: riskScore.overall,
                        alertLevel: this.getAlertLevel(riskScore.overall),
                        reason: this.generateRiskReason(riskScore),
                        recommendations: this.generateRecommendations(riskScore),
                    };

                    alerts.push(alert);
                }
            }

            return alerts;
        } catch (error) {
            this.logger.error(`Failed to monitor active milestones: ${error.message}`);
            return [];
        }
    }

    /**
     * Scheduled risk monitoring job
     */
    @Cron('0 */1 * * *') // Every hour
    async scheduledRiskMonitoring(): Promise<void> {
        try {
            this.logger.log('Starting scheduled risk monitoring');

            // Get all active tenants (simplified - in reality, query from database)
            const tenants = await this.getActiveTenants();

            for (const tenantId of tenants) {
                const alerts = await this.monitorAllActiveMilestones(tenantId);

                if (alerts.length > 0) {
                    this.logger.log(`Found ${alerts.length} risk alerts for tenant ${tenantId}`);

                    // Emit event for notifications
                    this.eventEmitter.emit('risk.alerts.detected', {
                        tenantId,
                        alerts,
                        timestamp: new Date(),
                    });
                }
            }

            this.logger.log('Scheduled risk monitoring complete');
        } catch (error) {
            this.logger.error(`Scheduled risk monitoring failed: ${error.message}`);
        }
    }

    /**
     * Calculate velocity risk
     */
    private async calculateVelocityRisk(
        milestone: Milestone,
        prediction: PredictionResult | null,
    ): Promise<number> {
        const progress = milestone.completionPercentage || 0;
        const now = new Date();
        const dueDate = milestone.dueDate;

        if (!dueDate) return 30; // Medium risk if no due date

        const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        const requiredVelocity = daysUntilDue > 0 ? (100 - progress) / daysUntilDue : 100;

        // Calculate actual velocity
        const startedAt = milestone.startedAt || milestone.createdAt || now;
        const daysElapsed = Math.max(1, (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24));
        const actualVelocity = progress / daysElapsed;

        // Risk increases if actual velocity is less than required
        const velocityRatio = requiredVelocity > 0 ? actualVelocity / requiredVelocity : 1;

        if (velocityRatio >= 1.0) return 10; // On track
        if (velocityRatio >= 0.8) return 30; // Slightly behind
        if (velocityRatio >= 0.6) return 60; // Concerning
        if (velocityRatio >= 0.4) return 80; // High risk
        return 95; // Critical

    }

    /**
     * Calculate dependency risk
     */
    private async calculateDependencyRisk(milestone: Milestone): Promise<number> {
        const dependencies = milestone.dependencies || [];

        if (dependencies.length === 0) return 10; // No dependencies = low risk

        // Check if dependencies are complete
        const dependencyMilestones = await this.milestoneRepository.find({
            where: {
                id: In(dependencies),
                isDeleted: false,
            },
        });

        const incompleteDeps = dependencyMilestones.filter(m => m.status !== 'COMPLETED').length;
        const riskRatio = incompleteDeps / dependencies.length;

        return Math.min(95, riskRatio * 100);
    }

    /**
     * Calculate resource risk (simplified)
     */
    private async calculateResourceRisk(milestone: Milestone): Promise<number> {
        // TODO: Integrate with resource management system
        // For now, return moderate risk
        return 40;
    }

    /**
     * Calculate historical risk
     */
    private async calculateHistoricalRisk(milestone: Milestone): Promise<number> {
        // TODO: Query similar milestone types and their success rates
        // For now, return low-moderate risk
        return 25;
    }

    /**
     * Calculate deadline proximity risk
     */
    private async calculateDeadlineProximityRisk(milestone: Milestone): Promise<number> {
        if (!milestone.dueDate) return 20;

        const now = new Date();
        const daysUntilDue = (milestone.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        const progress = milestone.completionPercentage || 0;

        // High risk if < 3 days and < 80% complete
        if (daysUntilDue < 3 && progress < 80) return 90;
        if (daysUntilDue < 7 && progress < 60) return 70;
        if (daysUntilDue < 14 && progress < 40) return 50;

        return 20;
    }

    /**
     * Calculate complexity risk (simplified)
     */
    private async calculateComplexityRisk(milestone: Milestone): Promise<number> {
        // TODO: Calculate from milestone metadata
        return 35;
    }

    /**
     * Calculate stakeholder risk (simplified)
     */
    private async calculateStakeholderRisk(milestone: Milestone): Promise<number> {
        // TODO: Track stakeholder engagement
        return 20;
    }

    /**
     * Determine risk trend
     */
    private determineTrend(
        currentRisk: number,
        prediction: PredictionResult | null,
    ): 'IMPROVING' | 'STABLE' | 'DETERIORATING' {
        // Simplified: use AI risk level as trend indicator
        if (!prediction) return 'STABLE';

        if (prediction.riskLevel === 'CRITICAL') return 'DETERIORATING';
        if (prediction.riskLevel === 'HIGH') return 'DETERIORATING';
        if (prediction.riskLevel === 'MEDIUM') return 'STABLE';
        return 'IMPROVING';
    }

    /**
     * Project when risk will materialize
     */
    private projectRiskMaterialization(milestone: Milestone, riskScore: number): number {
        if (riskScore < 60) return 999; // Far future
        if (!milestone.dueDate) return 30;

        const now = new Date();
        const daysUntilDue = (milestone.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        // Higher risk = sooner materialization
        if (riskScore >= 85) return Math.min(3, daysUntilDue);
        if (riskScore >= 75) return Math.min(7, daysUntilDue);
        return Math.min(14, daysUntilDue);
    }

    /**
     * Check and trigger alerts based on risk score
     */
    private async checkAndTriggerAlerts(milestone: Milestone, riskScore: RiskScore): Promise<void> {
        if (riskScore.overall >= this.riskThresholds.CRITICAL) {
            this.eventEmitter.emit('risk.critical', {
                milestoneId: milestone.id,
                milestoneName: milestone.name,
                riskScore: riskScore.overall,
                breakdown: riskScore.breakdown,
            });

            // Auto-escalate critical risks
            this.eventEmitter.emit('escalation.create', {
                milestoneId: milestone.id,
                level: 'CRITICAL',
                reason: `Critical risk detected (score: ${riskScore.overall})`,
                autoCreated: true,
            });
        } else if (riskScore.overall >= this.riskThresholds.DANGER) {
            this.eventEmitter.emit('risk.danger', {
                milestoneId: milestone.id,
                riskScore: riskScore.overall,
            });
        } else if (riskScore.overall >= this.riskThresholds.WARNING) {
            this.eventEmitter.emit('risk.warning', {
                milestoneId: milestone.id,
                riskScore: riskScore.overall,
            });
        }
    }

    /**
     * Get alert level based on risk score
     */
    private getAlertLevel(riskScore: number): 'WARNING' | 'DANGER' | 'CRITICAL' {
        if (riskScore >= this.riskThresholds.CRITICAL) return 'CRITICAL';
        if (riskScore >= this.riskThresholds.DANGER) return 'DANGER';
        return 'WARNING';
    }

    /**
     * Generate human-readable risk reason
     */
    private generateRiskReason(riskScore: RiskScore): string {
        const topRisks = Object.entries(riskScore.breakdown)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2);

        const reasons = topRisks.map(([key, value]) => {
            const name = key.replace('Risk', '');
            return `${name} (${Math.round(value)}%)`;
        });

        return `High risk due to: ${reasons.join(', ')}`;
    }

    /**
     * Generate recommendations based on risk factors
     */
    private generateRecommendations(riskScore: RiskScore): string[] {
        const recommendations: string[] = [];

        if (riskScore.breakdown.velocityRisk > 70) {
            recommendations.push('Increase resource allocation to improve velocity');
        }

        if (riskScore.breakdown.dependencyRisk > 70) {
            recommendations.push('Unblock or escalate dependency issues');
        }

        if (riskScore.breakdown.deadlineProximity > 70) {
            recommendations.push('Consider deadline extension or scope reduction');
        }

        if (recommendations.length === 0) {
            recommendations.push('Monitor closely and review progress daily');
        }

        return recommendations;
    }

    /**
     * Get active tenants (simplified)
     */
    private async getActiveTenants(): Promise<string[]> {
        const milestones = await this.milestoneRepository
            .createQueryBuilder('milestone')
            .select('DISTINCT milestone.tenantId', 'tenantId')
            .where('milestone.status = :status', { status: 'IN_PROGRESS' })
            .andWhere('milestone.isDeleted = :isDeleted', { isDeleted: false })
            .getRawMany();

        return milestones.map(m => m.tenantId);
    }
}
