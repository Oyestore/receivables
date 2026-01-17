/**
 * Monitoring Service
 * 
 * Prometheus metrics, health checks, and observability for Module 10
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class MonitoringService {
    private readonly logger = new Logger(MonitoringService.name);

    constructor(
        @InjectMetric('workflow_executions_total') public workflowExecutionsCounter: Counter<string>,
        @InjectMetric('workflow_duration_seconds') public workflowDurationHistogram: Histogram<string>,
        @InjectMetric('workflow_errors_total') public workflowErrorsCounter: Counter<string>,
        @InjectMetric('constraint_analysis_total') public constraintAnalysisCounter: Counter<string>,
        @InjectMetric('recommendations_generated_total') public recommendationsCounter: Counter<string>,
        @InjectMetric('integration_gateway_requests_total') public gatewayRequestsCounter: Counter<string>,
        @InjectMetric('integration_gateway_errors_total') public gatewayErrorsCounter: Counter<string>,
        @InjectMetric('circuit_breaker_state') public circuitBreakerGauge: Gauge<string>,
        @InjectMetric('rate_limit_exceeded_total') public rateLimitCounter: Counter<string>,
        @InjectMetric('events_published_total') public eventsPublishedCounter: Counter<string>,
        @InjectMetric('active_workflows') public activeWorkflowsGauge: Gauge<string>,
    ) {
        this.logger.log('Monitoring Service initialized');
    }

    // ============================================================================
    // Workflow Metrics
    // ============================================================================

    recordWorkflowStart(workflowType: string, tenantId: string): void {
        this.workflowExecutionsCounter.inc({
            workflow_type: workflowType,
            tenant_id: tenantId,
            status: 'started',
        });

        this.activeWorkflowsGauge.inc({
            workflow_type: workflowType,
            tenant_id: tenantId,
        });
    }

    recordWorkflowCompletion(
        workflowType: string,
        tenantId: string,
        durationMs: number,
        status: 'completed' | 'failed'
    ): void {
        this.workflowExecutionsCounter.inc({
            workflow_type: workflowType,
            tenant_id: tenantId,
            status,
        });

        this.workflowDurationHistogram.observe(
            {
                workflow_type: workflowType,
                tenant_id: tenantId,
            },
            durationMs / 1000 // Convert to seconds
        );

        this.activeWorkflowsGauge.dec({
            workflow_type: workflowType,
            tenant_id: tenantId,
        });

        if (status === 'failed') {
            this.workflowErrorsCounter.inc({
                workflow_type: workflowType,
                tenant_id: tenantId,
            });
        }
    }

    // ============================================================================
    // Constraint Analysis Metrics
    // ============================================================================

    recordConstraintAnalysis(
        tenantId: string,
        constraintsFound: number,
        durationMs: number
    ): void {
        this.constraintAnalysisCounter.inc({
            tenant_id: tenantId,
            constraints_found: constraintsFound > 0 ? 'yes' : 'no',
        });
    }

    // ============================================================================
    // Recommendation Metrics
    // ============================================================================

    recordRecommendationGeneration(
        tenantId: string,
        recommendationCount: number
    ): void {
        this.recommendationsCounter.inc({
            tenant_id: tenantId,
            count: recommendationCount.toString(),
        });
    }

    // ============================================================================
    // Integration Gateway Metrics
    // ============================================================================

    recordGatewayRequest(
        module: string,
        action: string,
        tenantId: string,
        success: boolean,
        durationMs: number
    ): void {
        this.gatewayRequestsCounter.inc({
            module,
            action,
            tenant_id: tenantId,
            status: success ? 'success' : 'error',
        });

        if (!success) {
            this.gatewayErrorsCounter.inc({
                module,
                action,
                tenant_id: tenantId,
            });
        }
    }

    recordCircuitBreakerState(
        module: string,
        state: 'open' | 'closed' | 'half-open'
    ): void {
        const stateValue = state === 'open' ? 1 : state === 'half-open' ? 0.5 : 0;

        this.circuitBreakerGauge.set(
            {
                module,
            },
            stateValue
        );
    }

    recordRateLimitExceeded(tenantId: string): void {
        this.rateLimitCounter.inc({
            tenant_id: tenantId,
        });
    }

    // ============================================================================
    // Event Bridge Metrics
    // ============================================================================

    recordEventPublished(eventType: string, sourceModule: string, tenantId: string): void {
        this.eventsPublishedCounter.inc({
            event_type: eventType,
            source_module: sourceModule,
            tenant_id: tenantId,
        });
    }

    // ============================================================================
    // Custom Metrics Aggregation
    // ============================================================================

    async getMetricsSummary(): Promise<{
        workflows: { total: number; active: number; failed: number };
        gateway: { total_requests: number; errors: number };
        events: { total_published: number };
        constraints: { total_analyses: number };
    }> {
        // This would query the actual Prometheus metrics
        // For now, returning structure
        return {
            workflows: {
                total: 0,
                active: 0,
                failed: 0,
            },
            gateway: {
                total_requests: 0,
                errors: 0,
            },
            events: {
                total_published: 0,
            },
            constraints: {
                total_analyses: 0,
            },
        };
    }
}
