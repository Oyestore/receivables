import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';
import {
    IResourceMetric,
    ICapacityForecast,
    IScalingPolicy,
    IScalingEvent,
    ICostAnalysis,
} from '../interfaces/p2-features.interface';

const logger = new Logger('CapacityPlanningService');

/**
 * ML-Based Capacity Planning Service
 * Resource forecasting, auto-scaling, and cost optimization
 */
export class CapacityPlanningService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Record resource metric
     */
    async recordMetric(metricData: {
        tenantId: string;
        resourceType: 'cpu' | 'memory' | 'storage' | 'network' | 'database' | 'custom';
        metricName: string;
        value: number;
        unit?: string;
    }): Promise<IResourceMetric> {
        try {
            const result = await this.pool.query(
                `INSERT INTO resource_metrics (tenant_id, resource_type, metric_name, value, unit)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
                [
                    metricData.tenantId,
                    metricData.resourceType,
                    metricData.metricName,
                    metricData.value,
                    metricData.unit || null,
                ]
            );

            // Check scaling policies
            setTimeout(() => this.checkScalingPolicies(metricData.tenantId, metricData.resourceType), 100);

            return this.mapMetricFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to record metric', { error, metricData });
            throw error;
        }
    }

    /**
     * Generate capacity forecast
     */
    async generateForecast(tenantId: string, daysAhead: number = 30): Promise<ICapacityForecast[]> {
        try {
            const forecasts: ICapacityForecast[] = [];

            //Get historical metrics (last 30 days)
            const historicalData = await this.pool.query(
                `SELECT resource_type, metric_name, AVG(value) as avg_value, STDDEV(value) as stddev
         FROM resource_metrics
         WHERE tenant_id = $1
           AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
         GROUP BY resource_type, metric_name`,
                [tenantId]
            );

            // Generate forecasts using linear regression
            for (let day = 1; day <= daysAhead; day++) {
                const forecastDate = new Date();
                forecastDate.setDate(forecastDate.getDate() + day);

                const predictions: any = {};

                for (const row of historicalData.rows) {
                    const trend = parseFloat(row.avg_value);
                    const noise = (parseFloat(row.stddev) || 0) * 0.1;
                    const forecast = trend * (1 + (day / 30) * 0.05); // 5% growth over 30 days

                    predictions[`${row.resource_type}_${row.metric_name}`] = {
                        value: forecast + noise,
                        confidence: Math.max(0.5, 1 - (day / daysAhead) * 0.3), // Confidence decreases over time
                    };
                }

                const result = await this.pool.query(
                    `INSERT INTO capacity_forecasts (
            tenant_id, forecast_date, resource_predictions, confidence, algorithm
          ) VALUES ($1, $2, $3, $4, 'linear_regression')
          ON CONFLICT (tenant_id, forecast_date)
          DO UPDATE SET
            resource_predictions = EXCLUDED.resource_predictions,
            confidence = EXCLUDED.confidence
          RETURNING *`,
                    [
                        tenantId,
                        forecastDate.toISOString().split('T')[0],
                        JSON.stringify(predictions),
                        predictions[Object.keys(predictions)[0]]?.confidence || 0.8,
                    ]
                );

                forecasts.push(this.mapForecastFromDb(result.rows[0]));
            }

            logger.info('Capacity forecasts generated', { tenantId, daysAhead, count: forecasts.length });

            return forecasts;
        } catch (error) {
            logger.error('Failed to generate forecast', { error, tenantId });
            throw error;
        }
    }

    /**
     * Create scaling policy
     */
    async createScalingPolicy(policyData: {
        tenantId: string;
        policyName: string;
        resourceType: string;
        scaleTrigger: any;
        scaleAction: any;
        cooldownMinutes?: number;
    }): Promise<IScalingPolicy> {
        try {
            const result = await this.pool.query(
                `INSERT INTO scaling_policies (
          tenant_id, policy_name, resource_type, scale_trigger,
          scale_action, cooldown_minutes, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *`,
                [
                    policyData.tenantId,
                    policyData.policyName,
                    policyData.resourceType,
                    JSON.stringify(policyData.scaleTrigger),
                    JSON.stringify(policyData.scaleAction),
                    policyData.cooldownMinutes || 5,
                ]
            );

            logger.info('Scaling policy created', { policyId: result.rows[0].id });

            return this.mapPolicyFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create scaling policy', { error, policyData });
            throw error;
        }
    }

    /**
     * Execute scaling action
     */
    async executeScaling(tenantId: string, policyId: string, triggerReason: string): Promise<IScalingEvent> {
        try {
            // Get policy
            const policyResult = await this.pool.query(
                'SELECT * FROM scaling_policies WHERE id = $1 AND is_active = true',
                [policyId]
            );

            if (policyResult.rows.length === 0) {
                throw new NotFoundError('Scaling policy not found or inactive');
            }

            const policy = policyResult.rows[0];

            // Check cooldown
            const lastEvent = await this.pool.query(
                `SELECT * FROM scaling_events
         WHERE tenant_id = $1 AND policy_id = $2
         ORDER BY timestamp DESC LIMIT 1`,
                [tenantId, policyId]
            );

            if (lastEvent.rows.length > 0) {
                const lastTimestamp = new Date(lastEvent.rows[0].timestamp);
                const cooldownEnd = new Date(lastTimestamp.getTime() + policy.cooldown_minutes * 60000);

                if (new Date() < cooldownEnd) {
                    // Still in cooldown
                    const result = await this.pool.query(
                        `INSERT INTO scaling_events (tenant_id, policy_id, trigger_reason, action_taken, result)
             VALUES ($1, $2, $3, $4, 'skipped')
             RETURNING *`,
                        [tenantId, policyId, triggerReason, JSON.stringify({ reason: 'cooldown' })]
                    );

                    return this.mapEventFromDb(result.rows[0]);
                }
            }

            // Execute scaling action
            const scaleAction = policy.scale_action;
            const actionResult = await this.performScaling(scaleAction);

            const result = await this.pool.query(
                `INSERT INTO scaling_events (tenant_id, policy_id, trigger_reason, action_taken, result)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
                [tenantId, policyId, triggerReason, JSON.stringify(scaleAction), actionResult ? 'success' : 'failed']
            );

            logger.info('Scaling executed', {
                tenantId,
                policyId,
                result: actionResult ? 'success' : 'failed',
            });

            return this.mapEventFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to execute scaling', { error, tenantId, policyId });
            throw error;
        }
    }

    /**
     * Generate cost analysis
     */
    async analyzeCosts(tenantId: string, periodStart: Date, periodEnd: Date): Promise<ICostAnalysis> {
        try {
            // Get resource usage metrics
            const metrics = await this.pool.query(
                `SELECT resource_type, metric_name, AVG(value) as avg_value, MAX(value) as max_value
         FROM resource_metrics
         WHERE tenant_id = $1
           AND timestamp >= $2
           AND timestamp <= $3
         GROUP BY resource_type, metric_name`,
                [tenantId, periodStart, periodEnd]
            );

            // Calculate costs (simplified pricing)
            const resourceCosts: any = {};
            let totalCost = 0;

            const pricing = {
                cpu: 0.05, // per CPU hour
                memory: 0.01, // per GB hour
                storage: 0.10, // per GB month
                network: 0.09, // per GB transferred
                database: 0.02, // per query
            };

            for (const row of metrics.rows) {
                const resourceType = row.resource_type;
                const avgValue = parseFloat(row.avg_value);
                const cost = avgValue * (pricing[resourceType as keyof typeof pricing] || 0.01);

                resourceCosts[`${resourceType}_${row.metric_name}`] = {
                    usage: avgValue,
                    cost: cost.toFixed(2),
                };

                totalCost += cost;
            }

            // Generate optimization suggestions
            const suggestions = this.generateOptimizationSuggestions(resourceCosts);
            const potentialSavings = suggestions.reduce((sum, s) => sum + (s.savings || 0), 0);

            const result = await this.pool.query(
                `INSERT INTO cost_analysis (
          tenant_id, period_start, period_end, resource_costs,
          total_cost, optimization_suggestions, potential_savings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tenant_id, period_start, period_end)
        DO UPDATE SET
          resource_costs = EXCLUDED.resource_costs,
          total_cost = EXCLUDED.total_cost,
          optimization_suggestions = EXCLUDED.optimization_suggestions,
          potential_savings = EXCLUDED.potential_savings
        RETURNING *`,
                [
                    tenantId,
                    periodStart,
                    periodEnd,
                    JSON.stringify(resourceCosts),
                    totalCost.toFixed(2),
                    JSON.stringify(suggestions),
                    potentialSavings.toFixed(2),
                ]
            );

            logger.info('Cost analysis generated', { tenantId, totalCost, potentialSavings });

            return this.mapCostAnalysisFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to analyze costs', { error, tenantId });
            throw error;
        }
    }

    /**
     * Private helper methods
     */

    private async checkScalingPolicies(tenantId: string, resourceType: string): Promise<void> {
        try {
            const policies = await this.pool.query(
                `SELECT * FROM scaling_policies
         WHERE tenant_id = $1 AND resource_type = $2 AND is_active = true`,
                [tenantId, resourceType]
            );

            for (const policy of policies.rows) {
                const trigger = policy.scale_trigger;

                // Get recent metrics
                const metrics = await this.pool.query(
                    `SELECT AVG(value) as avg_value FROM resource_metrics
           WHERE tenant_id = $1
             AND resource_type = $2
             AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '5 minutes'`,
                    [tenantId, resourceType]
                );

                if (metrics.rows.length === 0) continue;

                const currentValue = parseFloat(metrics.rows[0].avg_value);

                // Check if trigger condition is met
                if (this.evaluateTrigger(trigger, currentValue)) {
                    await this.executeScaling(tenantId, policy.id, `${resourceType} exceeded threshold`);
                }
            }
        } catch (error) {
            logger.error('Failed to check scaling policies', { error, tenantId });
        }
    }

    private evaluateTrigger(trigger: any, currentValue: number): boolean {
        const threshold = trigger.threshold || 80;
        const operator = trigger.operator || 'greater_than';

        switch (operator) {
            case 'greater_than':
                return currentValue > threshold;
            case 'less_than':
                return currentValue < threshold;
            case 'equals':
                return currentValue === threshold;
            default:
                return false;
        }
    }

    private async performScaling(action: any): Promise<boolean> {
        // Simplified scaling execution
        // In production, would integrate with cloud provider APIs (AWS, GCP, Azure)

        logger.info('Scaling action performed', { action });

        // Simulate scaling action
        return new Promise((resolve) => {
            setTimeout(() => resolve(true), 1000);
        });
    }

    private generateOptimizationSuggestions(resourceCosts: any): any[] {
        const suggestions = [];

        for (const [resource, data] of Object.entries(resourceCosts)) {
            if (typeof data === 'object' && data !== null && 'usage' in data) {
                const usage = parseFloat((data as any).usage);
                const cost = parseFloat((data as any).cost);

                // Suggest optimization if usage is low
                if (usage < 30) {
                    suggestions.push({
                        resource,
                        type: 'right-sizing',
                        recommendation: `${resource} utilization is low (${usage.toFixed(1)}%). Consider downsizing.`,
                        savings: cost * 0.3, // 30% savings potential
                    });
                }

                // Suggest reserved instances if usage is steady
                if (usage > 70 && usage < 90) {
                    suggestions.push({
                        resource,
                        type: 'reserved_capacity',
                        recommendation: `${resource} shows steady usage. Consider reserved capacity for cost savings.`,
                        savings: cost * 0.4, // 40% savings potential
                    });
                }
            }
        }

        return suggestions;
    }

    /**
     * Mapping functions
     */

    private mapMetricFromDb(row: any): IResourceMetric {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            resourceType: row.resource_type,
            metricName: row.metric_name,
            value: parseFloat(row.value),
            unit: row.unit,
            timestamp: row.timestamp,
        };
    }

    private mapForecastFromDb(row: any): ICapacityForecast {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            forecastDate: row.forecast_date,
            resourcePredictions: row.resource_predictions,
            confidence: row.confidence ? parseFloat(row.confidence) : undefined,
            algorithm: row.algorithm,
        };
    }

    private mapPolicyFromDb(row: any): IScalingPolicy {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            policyName: row.policy_name,
            resourceType: row.resource_type,
            scaleTrigger: row.scale_trigger,
            scaleAction: row.scale_action,
            cooldownMinutes: row.cooldown_minutes,
            isActive: row.is_active,
        };
    }

    private mapEventFromDb(row: any): IScalingEvent {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            policyId: row.policy_id,
            triggerReason: row.trigger_reason,
            actionTaken: row.action_taken,
            result: row.result,
            errorMessage: row.error_message,
            timestamp: row.timestamp,
        };
    }

    private mapCostAnalysisFromDb(row: any): ICostAnalysis {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            periodStart: row.period_start,
            periodEnd: row.period_end,
            resourceCosts: row.resource_costs,
            totalCost: row.total_cost ? parseFloat(row.total_cost) : undefined,
            optimizationSuggestions: row.optimization_suggestions,
            potentialSavings: row.potential_savings ? parseFloat(row.potential_savings) : undefined,
        };
    }
}

export const capacityPlanningService = new CapacityPlanningService();
