/**
 * Prometheus Metrics Provider
 * 
 * Defines all metrics for Module 10 Orchestration Hub
 */

import { makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

export const prometheusProviders = [
    // Workflow metrics
    makeCounterProvider({
        name: 'workflow_executions_total',
        help: 'Total number of workflow executions',
        labelNames: ['workflow_type', 'tenant_id', 'status'],
    }),

    makeHistogramProvider({
        name: 'workflow_duration_seconds',
        help: 'Workflow execution duration in seconds',
        labelNames: ['workflow_type', 'tenant_id'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300], // 0.1s to 5 minutes
    }),

    makeCounterProvider({
        name: 'workflow_errors_total',
        help: 'Total number of workflow errors',
        labelNames: ['workflow_type', 'tenant_id'],
    }),

    // Constraint analysis metrics
    makeCounterProvider({
        name: 'constraint_analysis_total',
        help: 'Total number of constraint analyses performed',
        labelNames: ['tenant_id', 'constraints_found'],
    }),

    // Strategic recommendation metrics
    makeCounterProvider({
        name: 'recommendations_generated_total',
        help: 'Total number of strategic recommendations generated',
        labelNames: ['tenant_id', 'count'],
    }),

    // Integration gateway metrics
    makeCounterProvider({
        name: 'integration_gateway_requests_total',
        help: 'Total number of integration gateway requests',
        labelNames: ['module', 'action', 'tenant_id', 'status'],
    }),

    makeCounterProvider({
        name: 'integration_gateway_errors_total',
        help: 'Total number of integration gateway errors',
        labelNames: ['module', 'action', 'tenant_id'],
    }),

    makeGaugeProvider({
        name: 'circuit_breaker_state',
        help: 'Circuit breaker state (0=closed, 0.5=half-open, 1=open)',
        labelNames: ['module'],
    }),

    makeCounterProvider({
        name: 'rate_limit_exceeded_total',
        help: 'Total number of rate limit exceeded events',
        labelNames: ['tenant_id'],
    }),

    // Event bridge metrics
    makeCounterProvider({
        name: 'events_published_total',
        help: 'Total number of events published',
        labelNames: ['event_type', 'source_module', 'tenant_id'],
    }),

    // Active workflows gauge
    makeGaugeProvider({
        name: 'active_workflows',
        help: 'Number of currently active workflows',
        labelNames: ['workflow_type', 'tenant_id'],
    }),
];
