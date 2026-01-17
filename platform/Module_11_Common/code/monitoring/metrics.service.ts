import client from 'prom-client';
import { Logger } from '../logging/logger';

const logger = new Logger('MetricsService');

/**
 * Metrics Service
 * Provides Prometheus metrics collection for monitoring
 */
export class MetricsService {
  private static instance: MetricsService;
  private register: client.Registry;

  // HTTP Metrics
  private httpRequestDuration: client.Histogram;
  private httpRequestTotal: client.Counter;
  private httpRequestErrors: client.Counter;

  // Database Metrics
  private dbQueryDuration: client.Histogram;
  private dbConnectionsActive: client.Gauge;
  private dbQueryErrors: client.Counter;

  // Business Metrics
  private invoicesCreated: client.Counter;
  private paymentsProcessed: client.Counter;
  private paymentAmount: client.Histogram;
  private creditScoreCalculations: client.Counter;

  // System Metrics
  private activeUsers: client.Gauge;
  private activeTenants: client.Gauge;
  private cacheHits: client.Counter;
  private cacheMisses: client.Counter;

  // Agent Metrics (for Module 10)
  private agentTasksExecuted: client.Counter;
  private agentTaskDuration: client.Histogram;
  private agentErrors: client.Counter;

  private constructor() {
    this.register = new client.Registry();

    // Set default labels
    this.register.setDefaultLabels({
      app: 'sme-receivables-platform',
    });

    // Collect default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ register: this.register });

    // Initialize HTTP metrics
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestErrors = new client.Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.register],
    });

    // Initialize database metrics
    this.dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2],
      registers: [this.register],
    });

    this.dbConnectionsActive = new client.Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.register],
    });

    this.dbQueryErrors = new client.Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['query_type', 'error_type'],
      registers: [this.register],
    });

    // Initialize business metrics
    this.invoicesCreated = new client.Counter({
      name: 'invoices_created_total',
      help: 'Total number of invoices created',
      labelNames: ['tenant_id', 'invoice_type'],
      registers: [this.register],
    });

    this.paymentsProcessed = new client.Counter({
      name: 'payments_processed_total',
      help: 'Total number of payments processed',
      labelNames: ['tenant_id', 'payment_method', 'status'],
      registers: [this.register],
    });

    this.paymentAmount = new client.Histogram({
      name: 'payment_amount',
      help: 'Payment amounts in base currency',
      labelNames: ['tenant_id', 'currency'],
      buckets: [100, 1000, 10000, 50000, 100000, 500000, 1000000],
      registers: [this.register],
    });

    this.creditScoreCalculations = new client.Counter({
      name: 'credit_score_calculations_total',
      help: 'Total number of credit score calculations',
      labelNames: ['tenant_id'],
      registers: [this.register],
    });

    // Initialize system metrics
    this.activeUsers = new client.Gauge({
      name: 'active_users',
      help: 'Number of currently active users',
      labelNames: ['tenant_id'],
      registers: [this.register],
    });

    this.activeTenants = new client.Gauge({
      name: 'active_tenants',
      help: 'Number of active tenants',
      registers: [this.register],
    });

    this.cacheHits = new client.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_key_prefix'],
      registers: [this.register],
    });

    this.cacheMisses = new client.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_key_prefix'],
      registers: [this.register],
    });

    // Initialize agent metrics
    this.agentTasksExecuted = new client.Counter({
      name: 'agent_tasks_executed_total',
      help: 'Total number of agent tasks executed',
      labelNames: ['agent_type', 'task_type', 'status'],
      registers: [this.register],
    });

    this.agentTaskDuration = new client.Histogram({
      name: 'agent_task_duration_seconds',
      help: 'Duration of agent task execution in seconds',
      labelNames: ['agent_type', 'task_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.register],
    });

    this.agentErrors = new client.Counter({
      name: 'agent_errors_total',
      help: 'Total number of agent errors',
      labelNames: ['agent_type', 'error_type'],
      registers: [this.register],
    });

    logger.info('MetricsService initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Get metrics registry
   */
  public getRegister(): client.Registry {
    return this.register;
  }

  /**
   * Get metrics in Prometheus format
   */
  public async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  // =====================================================
  // HTTP Metrics
  // =====================================================

  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);
    this.httpRequestTotal.labels(method, route, statusCode.toString()).inc();
  }

  public recordHttpError(method: string, route: string, errorType: string): void {
    this.httpRequestErrors.labels(method, route, errorType).inc();
  }

  // =====================================================
  // Database Metrics
  // =====================================================

  public recordDbQuery(queryType: string, table: string, duration: number): void {
    this.dbQueryDuration.labels(queryType, table).observe(duration);
  }

  public setDbConnectionsActive(count: number): void {
    this.dbConnectionsActive.set(count);
  }

  public recordDbError(queryType: string, errorType: string): void {
    this.dbQueryErrors.labels(queryType, errorType).inc();
  }

  // =====================================================
  // Business Metrics
  // =====================================================

  public recordInvoiceCreated(tenantId: string, invoiceType: string): void {
    this.invoicesCreated.labels(tenantId, invoiceType).inc();
  }

  public recordPaymentProcessed(tenantId: string, paymentMethod: string, status: string): void {
    this.paymentsProcessed.labels(tenantId, paymentMethod, status).inc();
  }

  public recordPaymentAmount(tenantId: string, currency: string, amount: number): void {
    this.paymentAmount.labels(tenantId, currency).observe(amount);
  }

  public recordCreditScoreCalculation(tenantId: string): void {
    this.creditScoreCalculations.labels(tenantId).inc();
  }

  // =====================================================
  // System Metrics
  // =====================================================

  public setActiveUsers(tenantId: string, count: number): void {
    this.activeUsers.labels(tenantId).set(count);
  }

  public setActiveTenants(count: number): void {
    this.activeTenants.set(count);
  }

  public recordCacheHit(keyPrefix: string): void {
    this.cacheHits.labels(keyPrefix).inc();
  }

  public recordCacheMiss(keyPrefix: string): void {
    this.cacheMisses.labels(keyPrefix).inc();
  }

  // =====================================================
  // Agent Metrics
  // =====================================================

  public recordAgentTask(agentType: string, taskType: string, status: string, duration: number): void {
    this.agentTasksExecuted.labels(agentType, taskType, status).inc();
    this.agentTaskDuration.labels(agentType, taskType).observe(duration);
  }

  public recordAgentError(agentType: string, errorType: string): void {
    this.agentErrors.labels(agentType, errorType).inc();
  }
}

// Export singleton instance
export const metricsService = MetricsService.getInstance();
