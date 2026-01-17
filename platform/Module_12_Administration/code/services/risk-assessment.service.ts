import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';
import {
    IRiskCategory,
    IRiskAssessment,
    IRiskIndicator,
    IRiskEvent,
    IRiskMitigation,
    IRiskTrend,
    IRiskPrediction,
} from '../interfaces/risk.interface';

const logger = new Logger('RiskAssessmentService');

/**
 * Risk Assessment Service
 * Predictive risk analytics with automated scoring and mitigation tracking
 */
export class RiskAssessmentService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Get all risk categories
     */
    async getCategories(activeOnly: boolean = true): Promise<IRiskCategory[]> {
        try {
            let query = 'SELECT * FROM risk_categories';

            if (activeOnly) {
                query += ' WHERE is_active = true';
            }

            query += ' ORDER BY category_type, category_name';

            const result = await this.pool.query(query);

            return result.rows.map(row => this.mapCategoryFromDb(row));
        } catch (error) {
            logger.error('Failed to get risk categories', { error });
            throw error;
        }
    }

    /**
     * Create risk assessment
     */
    async createAssessment(assessmentData: {
        tenantId: string;
        assessmentDate: Date;
        assessmentType?: 'periodic' | 'triggered' | 'incident' | 'audit';
        assessorId?: string;
        assessorName?: string;
    }): Promise<IRiskAssessment> {
        try {
            // Generate assessment number
            const assessmentNumber = await this.generateAssessmentNumber(assessmentData.tenantId);

            const result = await this.pool.query(
                `INSERT INTO risk_assessments (
          tenant_id, assessment_number, assessment_date, assessment_type,
          assessor_id, assessor_name, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'in_progress')
        RETURNING *`,
                [
                    assessmentData.tenantId,
                    assessmentNumber,
                    assessmentData.assessmentDate,
                    assessmentData.assessmentType || 'periodic',
                    assessmentData.assessorId || null,
                    assessmentData.assessorName || null,
                ]
            );

            logger.info('Risk assessment created', {
                assessmentId: result.rows[0].id,
                assessmentNumber,
                tenantId: assessmentData.tenantId,
            });

            return this.mapAssessmentFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create risk assessment', { error, assessmentData });
            throw error;
        }
    }

    /**
     * Record risk event
     */
    async recordEvent(eventData: {
        tenantId?: string;
        categoryId?: string;
        eventTitle: string;
        eventDescription?: string;
        eventType?: 'incident' | 'near_miss' | 'threat' | 'vulnerability' | 'breach';
        severity: 'low' | 'medium' | 'high' | 'critical';
        impactScore?: number;
        likelihoodScore?: number;
        affectedSystems?: any;
        financialImpact?: number;
        reportedBy?: string;
    }): Promise<IRiskEvent> {
        try {
            // Calculate risk score
            const impactScore = eventData.impactScore || this.estimateImpact(eventData.severity);
            const likelihoodScore = eventData.likelihoodScore || 5.0;
            const riskScore = (impactScore * likelihoodScore) / 10;

            const result = await this.pool.query(
                `INSERT INTO risk_events (
          tenant_id, category_id, event_title, event_description, event_type,
          severity, impact_score, likelihood_score, risk_score,
          affected_systems, financial_impact, reported_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'open')
        RETURNING *`,
                [
                    eventData.tenantId || null,
                    eventData.categoryId || null,
                    eventData.eventTitle,
                    eventData.eventDescription || null,
                    eventData.eventType || 'incident',
                    eventData.severity,
                    impactScore,
                    likelihoodScore,
                    riskScore,
                    eventData.affectedSystems ? JSON.stringify(eventData.affectedSystems) : null,
                    eventData.financialImpact || null,
                    eventData.reportedBy || null,
                ]
            );

            logger.info('Risk event recorded', {
                eventId: result.rows[0].id,
                severity: eventData.severity,
                riskScore,
            });

            return this.mapEventFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to record risk event', { error, eventData });
            throw error;
        }
    }

    /**
     * Create mitigation plan
     */
    async createMitigation(mitigationData: {
        tenantId?: string;
        assessmentId?: string;
        eventId?: string;
        categoryId?: string;
        riskDescription: string;
        mitigationStrategy: string;
        mitigationType?: 'avoid' | 'transfer' | 'mitigate' | 'accept';
        implementationPlan?: string;
        assignedTo?: string;
        ownerName?: string;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        dueDate?: Date;
        estimatedCost?: number;
    }): Promise<IRiskMitigation> {
        try {
            const result = await this.pool.query(
                `INSERT INTO risk_mitigation (
          tenant_id, assessment_id, event_id, category_id, risk_description,
          mitigation_strategy, mitigation_type, implementation_plan,
          assigned_to, owner_name, priority, due_date, estimated_cost, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'planned')
        RETURNING *`,
                [
                    mitigationData.tenantId || null,
                    mitigationData.assessmentId || null,
                    mitigationData.eventId || null,
                    mitigationData.categoryId || null,
                    mitigationData.riskDescription,
                    mitigationData.mitigationStrategy,
                    mitigationData.mitigationType || 'mitigate',
                    mitigationData.implementationPlan || null,
                    mitigationData.assignedTo || null,
                    mitigationData.ownerName || null,
                    mitigationData.priority || 'medium',
                    mitigationData.dueDate || null,
                    mitigationData.estimatedCost || null,
                ]
            );

            logger.info('Mitigation plan created', {
                mitigationId: result.rows[0].id,
                priority: mitigationData.priority,
            });

            return this.mapMitigationFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create mitigation', { error, mitigationData });
            throw error;
        }
    }

    /**
     * Calculate risk score for tenant
     */
    async calculateRiskScore(tenantId: string, categoryId?: string): Promise<number> {
        try {
            let query = `
        SELECT
          AVG(re.risk_score) as avg_risk,
          COUNT(*) FILTER (WHERE re.severity = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE re.severity = 'high') as high_count,
          COUNT(*) FILTER (WHERE re.status IN ('open', 'investigating')) as open_count
        FROM risk_events re
        WHERE re.tenant_id = $1
          AND re.event_date >= CURRENT_DATE - INTERVAL '90 days'
      `;

            const params: any[] = [tenantId];

            if (categoryId) {
                params.push(categoryId);
                query += ` AND re.category_id = $${params.length}`;
            }

            const result = await this.pool.query(query, params);

            const row = result.rows[0];
            const avgRisk = parseFloat(row.avg_risk) || 0;
            const criticalCount = parseInt(row.critical_count, 10) || 0;
            const highCount = parseInt(row.high_count, 10) || 0;
            const openCount = parseInt(row.open_count, 10) || 0;

            // Calculate weighted score
            let score = avgRisk * 10; // Base score from average risk
            score += criticalCount * 5; // Critical events add significant weight
            score += highCount * 2.5; // High severity events
            score += openCount * 1.5; // Open events

            // Cap at 100
            score = Math.min(100, score);

            logger.info('Risk score calculated', {
                tenantId,
                categoryId,
                score,
            });

            return Math.round(score * 100) / 100; // Round to 2 decimals
        } catch (error) {
            logger.error('Failed to calculate risk score', { error, tenantId });
            throw error;
        }
    }

    /**
     * Update risk indicator
     */
    async updateIndicator(indicatorData: {
        tenantId?: string;
        categoryId: string;
        indicatorName: string;
        currentValue: number;
        thresholdValue?: number;
        thresholdOperator?: '>' | '<' | '>=' | '<=' | '=' | '!=';
    }): Promise<IRiskIndicator> {
        try {
            // Determine status based on threshold
            let status: 'normal' | 'warning' | 'critical' = 'normal';

            if (indicatorData.thresholdValue !== undefined && indicatorData.thresholdOperator) {
                status = this.evaluateThreshold(
                    indicatorData.currentValue,
                    indicatorData.thresholdValue,
                    indicatorData.thresholdOperator
                );
            }

            const result = await this.pool.query(
                `INSERT INTO risk_indicators (
          tenant_id, category_id, indicator_name, current_value,
          threshold_value, threshold_operator, status, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (tenant_id, indicator_name)
        DO UPDATE SET
          previous_value = risk_indicators.current_value,
          current_value = EXCLUDED.current_value,
          threshold_value = EXCLUDED.threshold_value,
          threshold_operator = EXCLUDED.threshold_operator,
          status = EXCLUDED.status,
          last_updated = CURRENT_TIMESTAMP
        RETURNING *`,
                [
                    indicatorData.tenantId || null,
                    indicatorData.categoryId,
                    indicatorData.indicatorName,
                    indicatorData.currentValue,
                    indicatorData.thresholdValue || null,
                    indicatorData.thresholdOperator || null,
                    status,
                ]
            );

            logger.info('Risk indicator updated', {
                indicatorName: indicatorData.indicatorName,
                status,
            });

            return this.mapIndicatorFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to update indicator', { error, indicatorData });
            throw error;
        }
    }

    /**
     * Generate predictive risk assessment
     */
    async generatePrediction(
        tenantId: string,
        predictionHorizon: '7_days' | '30_days' | '90_days' | '180_days' | '365_days',
        categoryId?: string
    ): Promise<IRiskPrediction> {
        try {
            // Get historical trend data
            const trendsResult = await this.pool.query(
                `SELECT * FROM risk_trends
         WHERE tenant_id = $1
         ORDER BY trend_date DESC
         LIMIT 30`,
                [tenantId]
            );

            // Simplified prediction model
            const prediction = await this.calculatePrediction(trendsResult.rows, predictionHorizon, categoryId);

            const result = await this.pool.query(
                `INSERT INTO risk_predictions (
          tenant_id, category_id, prediction_date, prediction_horizon,
          predicted_risk_score, predicted_risk_level, confidence_score,
          prediction_factors, ml_model_version
        ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
                [
                    tenantId,
                    categoryId || null,
                    predictionHorizon,
                    prediction.score,
                    prediction.level,
                    prediction.confidence,
                    JSON.stringify(prediction.factors),
                    'v1.0-simplified',
                ]
            );

            logger.info('Risk prediction generated', {
                tenantId,
                predictionHorizon,
                predictedScore: prediction.score,
            });

            return this.mapPredictionFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to generate prediction', { error, tenantId });
            throw error;
        }
    }

    /**
     * Update risk trends
     */
    async updateTrends(tenantId: string, trendDate: Date = new Date()): Promise<void> {
        try {
            // Calculate overall risk score
            const overallScore = await this.calculateRiskScore(tenantId);

            // Determine risk level
            const riskLevel = this.getRiskLevel(overallScore);

            // Get open events count
            const eventsResult = await this.pool.query(
                `SELECT
           COUNT(*) FILTER (WHERE status IN ('open', 'investigating')) as open_count,
           COUNT(*) FILTER (WHERE severity = 'critical' AND status IN ('open', 'investigating')) as critical_count
         FROM risk_events
         WHERE tenant_id = $1`,
                [tenantId]
            );

            const openEvents = parseInt(eventsResult.rows[0].open_count, 10) || 0;
            const criticalEvents = parseInt(eventsResult.rows[0].critical_count, 10) || 0;

            // Get mitigation completion rate
            const mitigationResult = await this.pool.query(
                `SELECT
           COUNT(*) FILTER (WHERE status = 'completed') as completed,
           COUNT(*) as total
         FROM risk_mitigation
         WHERE tenant_id = $1
           AND created_at >= $2`,
                [tenantId, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)] // Last 90 days
            );

            const completed = parseInt(mitigationResult.rows[0].completed, 10) || 0;
            const total = parseInt(mitigationResult.rows[0].total, 10) || 0;
            const completionRate = total > 0 ? (completed / total) * 100 : 0;

            // Get previous trend to determine direction
            const previousTrend = await this.pool.query(
                `SELECT overall_risk_score FROM risk_trends
         WHERE tenant_id = $1 AND trend_date < $2
         ORDER BY trend_date DESC LIMIT 1`,
                [tenantId, trendDate]
            );

            let trendDirection: 'improving' | 'stable' | 'deteriorating' = 'stable';
            if (previousTrend.rows.length > 0) {
                const previousScore = parseFloat(previousTrend.rows[0].overall_risk_score);
                const scoreDiff = overallScore - previousScore;

                if (scoreDiff < -5) {
                    trendDirection = 'improving';
                } else if (scoreDiff > 5) {
                    trendDirection = 'deteriorating';
                }
            }

            // Upsert trend
            await this.pool.query(
                `INSERT INTO risk_trends (
          tenant_id, trend_date, overall_risk_score, risk_level,
          open_events, critical_events, mitigation_completion_rate, trend_direction
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (tenant_id, trend_date)
        DO UPDATE SET
          overall_risk_score = EXCLUDED.overall_risk_score,
          risk_level = EXCLUDED.risk_level,
          open_events = EXCLUDED.open_events,
          critical_events = EXCLUDED.critical_events,
          mitigation_completion_rate = EXCLUDED.mitigation_completion_rate,
          trend_direction = EXCLUDED.trend_direction`,
                [
                    tenantId,
                    trendDate,
                    overallScore,
                    riskLevel,
                    openEvents,
                    criticalEvents,
                    completionRate,
                    trendDirection,
                ]
            );

            logger.info('Risk trends updated', { tenantId, overallScore, trendDirection });
        } catch (error) {
            logger.error('Failed to update trends', { error, tenantId });
            throw error;
        }
    }

    /**
     * Get risk trends
     */
    async getTrends(tenantId: string, days: number = 30): Promise<IRiskTrend[]> {
        try {
            const result = await this.pool.query(
                `SELECT * FROM risk_trends
         WHERE tenant_id = $1
           AND trend_date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY trend_date DESC`,
                [tenantId]
            );

            return result.rows.map(row => this.mapTrendFromDb(row));
        } catch (error) {
            logger.error('Failed to get trends', { error, tenantId });
            throw error;
        }
    }

    /**
     * Estimate impact based on severity
     */
    private estimateImpact(severity: string): number {
        const impacts = {
            low: 2.5,
            medium: 5.0,
            high: 7.5,
            critical: 10.0,
        };

        return impacts[severity] || 5.0;
    }

    /**
     * Evaluate threshold
     */
    private evaluateThreshold(
        value: number,
        threshold: number,
        operator: string
    ): 'normal' | 'warning' | 'critical' {
        let breached = false;

        switch (operator) {
            case '>':
                breached = value > threshold;
                break;
            case '<':
                breached = value < threshold;
                break;
            case '>=':
                breached = value >= threshold;
                break;
            case '<=':
                breached = value <= threshold;
                break;
            case '=':
                breached = value === threshold;
                break;
            case '!=':
                breached = value !== threshold;
                break;
        }

        if (!breached) {
            return 'normal';
        }

        // Determine severity based on how much the threshold is exceeded
        const percentDiff = Math.abs((value - threshold) / threshold) * 100;

        if (percentDiff > 50) {
            return 'critical';
        } else if (percentDiff > 20) {
            return 'warning';
        }

        return 'normal';
    }

    /**
     * Calculate prediction
     */
    private async calculatePrediction(
        trends: any[],
        horizon: string,
        categoryId?: string
    ): Promise<any> {
        // Simplified prediction model
        // In production, this would use ML models

        if (trends.length === 0) {
            return {
                score: 50,
                level: 'medium',
                confidence: 0.3,
                factors: { message: 'Insufficient historical data' },
            };
        }

        // Calculate trend slope
        const recentScores = trends.slice(0, 7).map(t => parseFloat(t.overall_risk_score) || 0);
        const avgRecent = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;

        const olderScores = trends.slice(7, 14).map(t => parseFloat(t.overall_risk_score) || 0);
        const avgOlder = olderScores.length > 0
            ? olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length
            : avgRecent;

        const slope = avgRecent - avgOlder;

        // Project future score based on horizon
        const horizonDays = parseInt(horizon.split('_')[0], 10);
        const projectedScore = Math.max(0, Math.min(100, avgRecent + (slope * horizonDays / 7)));

        const confidence = Math.min(0.95, trends.length / 30); // More data = higher confidence

        return {
            score: Math.round(projectedScore * 100) / 100,
            level: this.getRiskLevel(projectedScore),
            confidence,
            factors: {
                recentAverage: avgRecent,
                trendSlope: slope,
                dataPoints: trends.length,
            },
        };
    }

    /**
     * Get risk level
     */
    private getRiskLevel(score: number): string {
        if (score >= 75) return 'critical';
        if (score >= 50) return 'high';
        if (score >= 25) return 'medium';
        return 'low';
    }

    /**
     * Generate assessment number
     */
    private async generateAssessmentNumber(tenantId: string): Promise<string> {
        const year = new Date().getFullYear();

        const countResult = await this.pool.query(
            `SELECT COUNT(*) FROM risk_assessments
       WHERE tenant_id = $1 AND EXTRACT(YEAR FROM assessment_date) = $2`,
            [tenantId, year]
        );

        const seq = (parseInt(countResult.rows[0].count, 10) + 1).toString().padStart(4, '0');

        return `RISK-${year}-${seq}`;
    }

    /**
     * Map category from database
     */
    private mapCategoryFromDb(row: any): IRiskCategory {
        return {
            id: row.id,
            categoryName: row.category_name,
            categoryType: row.category_type,
            weight: parseFloat(row.weight),
            description: row.description,
            isActive: row.is_active,
        };
    }

    /**
     * Map assessment from database
     */
    private mapAssessmentFromDb(row: any): IRiskAssessment {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            assessmentNumber: row.assessment_number,
            assessmentDate: row.assessment_date,
            overallRiskScore: row.overall_risk_score ? parseFloat(row.overall_risk_score) : undefined,
            riskLevel: row.risk_level,
            assessmentType: row.assessment_type,
            assessmentData: row.assessment_data,
            assessorId: row.assessor_id,
            assessorName: row.assessor_name,
            status: row.status,
            completionDate: row.completion_date,
            nextAssessmentDate: row.next_assessment_date,
            notes: row.notes,
        };
    }

    /**
     * Map indicator from database
     */
    private mapIndicatorFromDb(row: any): IRiskIndicator {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            categoryId: row.category_id,
            indicatorName: row.indicator_name,
            indicatorType: row.indicator_type,
            measurementUnit: row.measurement_unit,
            thresholdValue: row.threshold_value ? parseFloat(row.threshold_value) : undefined,
            thresholdOperator: row.threshold_operator,
            currentValue: row.current_value ? parseFloat(row.current_value) : undefined,
            previousValue: row.previous_value ? parseFloat(row.previous_value) : undefined,
            status: row.status,
            calculationFormula: row.calculation_formula,
            collectionFrequency: row.collection_frequency,
            lastUpdated: row.last_updated,
            isActive: row.is_active,
        };
    }

    /**
     * Map event from database
     */
    private mapEventFromDb(row: any): IRiskEvent {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            categoryId: row.category_id,
            eventTitle: row.event_title,
            eventDescription: row.event_description,
            eventType: row.event_type,
            severity: row.severity,
            impactScore: row.impact_score ? parseFloat(row.impact_score) : undefined,
            likelihoodScore: row.likelihood_score ? parseFloat(row.likelihood_score) : undefined,
            riskScore: row.risk_score ? parseFloat(row.risk_score) : undefined,
            eventDate: row.event_date,
            detectionDate: row.detection_date,
            resolutionDate: row.resolution_date,
            status: row.status,
            affectedSystems: row.affected_systems,
            financialImpact: row.financial_impact ? parseFloat(row.financial_impact) : undefined,
            reportedBy: row.reported_by,
            assignedTo: row.assigned_to,
            rootCause: row.root_cause,
            lessonsLearned: row.lessons_learned,
        };
    }

    /**
     * Map mitigation from database
     */
    private mapMitigationFromDb(row: any): IRiskMitigation {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            assessmentId: row.assessment_id,
            eventId: row.event_id,
            categoryId: row.category_id,
            riskDescription: row.risk_description,
            mitigationStrategy: row.mitigation_strategy,
            mitigationType: row.mitigation_type,
            implementationPlan: row.implementation_plan,
            assignedTo: row.assigned_to,
            ownerName: row.owner_name,
            priority: row.priority,
            status: row.status,
            startDate: row.start_date,
            dueDate: row.due_date,
            completionDate: row.completion_date,
            estimatedCost: row.estimated_cost ? parseFloat(row.estimated_cost) : undefined,
            actualCost: row.actual_cost ? parseFloat(row.actual_cost) : undefined,
            effectivenessScore: row.effectiveness_score ? parseFloat(row.effectiveness_score) : undefined,
            notes: row.notes,
        };
    }

    /**
     * Map trend from database
     */
    private mapTrendFromDb(row: any): IRiskTrend {
        return {
            tenantId: row.tenant_id,
            trendDate: row.trend_date,
            overallRiskScore: row.overall_risk_score ? parseFloat(row.overall_risk_score) : undefined,
            riskLevel: row.risk_level,
            categoryScores: row.category_scores,
            openEvents: row.open_events,
            criticalEvents: row.critical_events,
            mitigationCompletionRate: row.mitigation_completion_rate ? parseFloat(row.mitigation_completion_rate) : undefined,
            trendDirection: row.trend_direction,
        };
    }

    /**
     * Map prediction from database
     */
    private mapPredictionFromDb(row: any): IRiskPrediction {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            categoryId: row.category_id,
            predictionDate: row.prediction_date,
            predictionHorizon: row.prediction_horizon,
            predictedRiskScore: row.predicted_risk_score ? parseFloat(row.predicted_risk_score) : undefined,
            predictedRiskLevel: row.predicted_risk_level,
            confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : undefined,
            predictionFactors: row.prediction_factors,
            mlModelVersion: row.ml_model_version,
        };
    }
}

export const riskAssessmentService = new RiskAssessmentService();
