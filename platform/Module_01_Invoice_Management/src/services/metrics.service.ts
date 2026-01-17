import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
    private readonly registry: Registry;

    // Counters
    private readonly invoiceCreatedCounter: Counter<string>;
    private readonly invoiceUpdatedCounter: Counter<string>;
    private readonly invoicePaidCounter: Counter<string>;
    private readonly approvalRequestCounter: Counter<string>;
    private readonly cacheHitCounter: Counter<string>;
    private readonly cacheMissCounter: Counter<string>;

    // Histograms
    private readonly invoiceProcessingDuration: Histogram<string>;
    private readonly apiResponseTime: Histogram<string>;
    private readonly dbQueryDuration: Histogram<string>;

    constructor() {
        this.registry = register;

        // Initialize counters
        this.invoiceCreatedCounter = new Counter({
            name: 'invoices_created_total',
            help: 'Total number of invoices created',
            labelNames: ['tenant_id', 'status'],
            registers: [this.registry],
        });

        this.invoiceUpdatedCounter = new Counter({
            name: 'invoices_updated_total',
            help: 'Total number of invoices updated',
            labelNames: ['tenant_id'],
            registers: [this.registry],
        });

        this.invoicePaidCounter = new Counter({
            name: 'invoices_paid_total',
            help: 'Total number of invoices marked as paid',
            labelNames: ['tenant_id'],
            registers: [this.registry],
        });

        this.approvalRequestCounter = new Counter({
            name: 'approval_requests_total',
            help: 'Total number of approval requests',
            labelNames: ['tenant_id', 'action'],
            registers: [this.registry],
        });

        this.cacheHitCounter = new Counter({
            name: 'cache_hits_total',
            help: 'Total cache hits',
            labelNames: ['cache_type'],
            registers: [this.registry],
        });

        this.cacheMissCounter = new Counter({
            name: 'cache_misses_total',
            help: 'Total cache misses',
            labelNames: ['cache_type'],
            registers: [this.registry],
        });

        // Initialize histograms
        this.invoiceProcessingDuration = new Histogram({
            name: 'invoice_processing_duration_seconds',
            help: 'Invoice processing duration in seconds',
            buckets: [0.1, 0.5, 1, 2, 5, 10],
            labelNames: ['operation'],
            registers: [this.registry],
        });

        this.apiResponseTime = new Histogram({
            name: 'api_response_time_seconds',
            help: 'API response time in seconds',
            buckets: [0.05, 0.1, 0.3, 0.5, 1, 2],
            labelNames: ['endpoint', 'method', 'status_code'],
            registers: [this.registry],
        });

        this.dbQueryDuration = new Histogram({
            name: 'db_query_duration_seconds',
            help: 'Database query duration in seconds',
            buckets: [0.01, 0.05, 0.1, 0.5, 1],
            labelNames: ['query_type'],
            registers: [this.registry],
        });
    }

    // Counter methods
    recordInvoiceCreated(tenantId: string, status: string): void {
        this.invoiceCreatedCounter.inc({ tenant_id: tenantId, status });
    }

    recordInvoiceUpdated(tenantId: string): void {
        this.invoiceUpdatedCounter.inc({ tenant_id: tenantId });
    }

    recordInvoicePaid(tenantId: string): void {
        this.invoicePaidCounter.inc({ tenant_id: tenantId });
    }

    recordApprovalRequest(tenantId: string, action: string): void {
        this.approvalRequestCounter.inc({ tenant_id: tenantId, action });
    }

    recordCacheHit(cacheType: string): void {
        this.cacheHitCounter.inc({ cache_type: cacheType });
    }

    recordCacheMiss(cacheType: string): void {
        this.cacheMissCounter.inc({ cache_type: cacheType });
    }

    // Histogram methods
    recordProcessingTime(operation: string, duration: number): void {
        this.invoiceProcessingDuration.observe({ operation }, duration);
    }

    recordApiResponseTime(
        endpoint: string,
        method: string,
        statusCode: number,
        duration: number,
    ): void {
        this.apiResponseTime.observe(
            { endpoint, method, status_code: statusCode.toString() },
            duration,
        );
    }

    recordDbQueryTime(queryType: string, duration: number): void {
        this.dbQueryDuration.observe({ query_type: queryType }, duration);
    }

    // Get metrics for Prometheus scraping
    async getMetrics(): Promise<string> {
        return this.registry.metrics();
    }

    // Clear all metrics (for testing)
    clearMetrics(): void {
        this.registry.clear();
    }
}
