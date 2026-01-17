/**
 * Integration Gateway Service
 * 
 * Central hub for all inter-module communication
 * Provides:
 * - Unified API access to all 9 platform modules
 * - Circuit breaker pattern for fault tolerance
 * - Request routing and load balancing
 * - Rate limiting and throttling
 * - Health checking and service discovery
 * - Authentication/authorization forwarding
 */

import { Injectable, Logger } from '@nestjs/common';
import { ModuleName, IModuleAdapter, IHealthCheckResult } from '../types/orchestration.types';

// Import all module adapters
import { InvoiceManagementAdapter } from '../adapters/invoice-management.adapter';
import { CustomerCommunicationAdapter } from '../adapters/customer-communication.adapter';
import { PaymentIntegrationAdapter } from '../adapters/payment-integration.adapter';
import { AnalyticsReportingAdapter } from '../adapters/analytics-reporting.adapter';
import { MilestoneWorkflowsAdapter } from '../adapters/milestone-workflows.adapter';
import { CreditScoringAdapter } from '../adapters/credit-scoring.adapter';
import { FinancingFactoringAdapter } from '../adapters/financing-factoring.adapter';
import { DisputeResolutionAdapter } from '../adapters/dispute-resolution.adapter';
import { MarketingCustomerSuccessAdapter } from '../adapters/marketing-customer-success.adapter';

interface CircuitBreakerState {
    failures: number;
    lastFailureTime: Date | null;
    state: 'closed' | 'open' | 'half-open';
    successCount: number;
}

interface RateLimitState {
    requests: number[];
    windowStart: Date;
}

@Injectable()
export class IntegrationGatewayService {
    private readonly logger = new Logger(IntegrationGatewayService.name);

    private readonly adapters: Map<ModuleName, IModuleAdapter>;
    private readonly circuitBreakers: Map<ModuleName, CircuitBreakerState>;
    private readonly rateLimits: Map<string, RateLimitState>;

    // Circuit breaker configuration
    private readonly FAILURE_THRESHOLD = 5;
    private readonly TIMEOUT_MS = 30000; // 30 seconds
    private readonly HALF_OPEN_ATTEMPTS = 3;

    // Rate limiting configuration  
    private readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
    private readonly RATE_LIMIT_MAX_REQUESTS = 100;

    constructor(
        private readonly invoiceAdapter: InvoiceManagementAdapter,
        private readonly communicationAdapter: CustomerCommunicationAdapter,
        private readonly paymentAdapter: PaymentIntegrationAdapter,
        private readonly analyticsAdapter: AnalyticsReportingAdapter,
        private readonly milestoneAdapter: MilestoneWorkflowsAdapter,
        private readonly creditAdapter: CreditScoringAdapter,
        private readonly financingAdapter: FinancingFactoringAdapter,
        private readonly disputeAdapter: DisputeResolutionAdapter,
        private readonly marketingAdapter: MarketingCustomerSuccessAdapter
    ) {
        // Initialize adapter registry
        this.adapters = new Map([
            [ModuleName.INVOICE_MANAGEMENT, invoiceAdapter],
            [ModuleName.CUSTOMER_COMMUNICATION, communicationAdapter],
            [ModuleName.PAYMENT_INTEGRATION, paymentAdapter],
            [ModuleName.ANALYTICS_REPORTING, analyticsAdapter],
            [ModuleName.MILESTONE_WORKFLOWS, milestoneAdapter],
            [ModuleName.CREDIT_SCORING, creditAdapter],
            [ModuleName.FINANCING_FACTORING, financingAdapter],
            [ModuleName.DISPUTE_RESOLUTION, disputeAdapter],
            [ModuleName.MARKETING_CUSTOMER_SUCCESS, marketingAdapter],
        ]);

        // Initialize circuit breakers
        this.circuitBreakers = new Map();
        for (const moduleName of this.adapters.keys()) {
            this.circuitBreakers.set(moduleName, {
                failures: 0,
                lastFailureTime: null,
                state: 'closed',
                successCount: 0,
            });
        }

        // Initialize rate limiters
        this.rateLimits = new Map();

        this.logger.log('Integration Gateway Service initialized with 9 module adapters');
    }

    // ============================================================================
    // Module Communication Methods
    // ============================================================================

    /**
     * Execute action on a specific module with circuit breaker protection
     */
    async executeModuleAction(
        module: ModuleName,
        action: string,
        params: Record<string, any>,
        tenantId: string
    ): Promise<any> {
        // Check rate limit
        this.checkRateLimit(tenantId);

        // Get adapter
        const adapter = this.adapters.get(module);
        if (!adapter) {
            throw new Error(`No adapter found for module: ${module}`);
        }

        // Check circuit breaker
        const circuitState = this.getCircuitBreakerState(module);
        if (circuitState === 'open') {
            throw new Error(`Circuit breaker open for module: ${module}`);
        }

        try {
            this.logger.log(`Executing ${action} on ${module} for tenant ${tenantId}`);

            // Execute with timeout
            const result = await Promise.race([
                adapter.executeAction(action, { ...params, tenantId }),
                this.timeout(this.TIMEOUT_MS),
            ]);

            // Record success
            this.recordSuccess(module);

            return result;
        } catch (error) {
            // Record failure
            this.recordFailure(module);

            this.logger.error(
                `Failed to execute ${action} on ${module}`,
                error instanceof Error ? error.stack : error
            );

            throw error;
        }
    }

    /**
     * Execute action across multiple modules in parallel
     */
    async executeMultiModuleAction(
        modules: ModuleName[],
        action: string,
        params: Record<string, any>,
        tenantId: string
    ): Promise<Map<ModuleName, any>> {
        this.logger.log(
            `Executing ${action} across ${modules.length} modules for tenant ${tenantId}`
        );

        const results = new Map<ModuleName, any>();
        const errors: Array<{ module: ModuleName; error: any }> = [];

        // Execute in parallel with individual error handling
        await Promise.all(
            modules.map(async (module) => {
                try {
                    const result = await this.executeModuleAction(module, action, params, tenantId);
                    results.set(module, result);
                } catch (error) {
                    errors.push({ module, error });
                    this.logger.warn(`Module ${module} failed during multi-module action`, error);
                }
            })
        );

        // Log summary
        this.logger.log(
            `Multi-module action complete: ${results.size} succeeded, ${errors.length} failed`
        );

        if (errors.length > 0 && results.size === 0) {
            throw new Error(
                `All modules failed during multi-module action: ${errors.map(e => e.module).join(', ')}`
            );
        }

        return results;
    }

    /**
     * Broadcast event to all modules
     */
    async broadcastEvent(
        event: {
            type: string;
            payload: Record<string, any>;
            tenantId: string;
            sourceModule?: ModuleName;
        }
    ): Promise<void> {
        this.logger.log(`Broadcasting event: ${event.type} from ${event.sourceModule || 'orchestration'}`);

        // Get all modules except source
        const targetModules = Array.from(this.adapters.keys()).filter(
            m => m !== event.sourceModule
        );

        // Broadcast to all modules (best effort - don't fail on individual errors)
        const results = await Promise.allSettled(
            targetModules.map(module =>
                this.executeModuleAction(
                    module,
                    'handleEvent',
                    { event },
                    event.tenantId
                ).catch(error => {
                    this.logger.warn(`Failed to broadcast event to ${module}`, error);
                    return null;
                })
            )
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        this.logger.log(`Event broadcast complete: ${successCount}/${targetModules.length} modules notified`);
    }

    // ============================================================================
    // Health Checking
    // ============================================================================

    /**
     * Check health of a specific module
     */
    async checkModuleHealth(module: ModuleName): Promise<IHealthCheckResult> {
        const adapter = this.adapters.get(module);
        if (!adapter) {
            return {
                module,
                status: 'unhealthy',
                response_time_ms: 0,
                error: 'Adapter not found',
                last_check: new Date(),
            };
        }

        try {
            const startTime = Date.now();
            const health = await adapter.healthCheck();
            const responseTime = Date.now() - startTime;

            return {
                ...health,
                response_time_ms: responseTime,
                last_check: new Date(),
            };
        } catch (error) {
            return {
                module,
                status: 'unhealthy',
                response_time_ms: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
                last_check: new Date(),
            };
        }
    }

    /**
     * Check health of all modules
     */
    async checkAllModules(): Promise<Map<ModuleName, IHealthCheckResult>> {
        this.logger.log('Performing health check on all modules');

        const results = new Map<ModuleName, IHealthCheckResult>();

        await Promise.all(
            Array.from(this.adapters.keys()).map(async (module) => {
                const health = await this.checkModuleHealth(module);
                results.set(module, health);
            })
        );

        // Log summary
        const healthyCount = Array.from(results.values()).filter(
            h => h.status === 'healthy'
        ).length;

        this.logger.log(
            `Health check complete: ${healthyCount}/${results.size} modules healthy`
        );

        return results;
    }

    /**
     * Get overall gateway health status
     */
    async getGatewayHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        modules: Map<ModuleName, IHealthCheckResult>;
        circuit_breakers: Record<string, string>;
        timestamp: Date;
    }> {
        const moduleHealth = await this.checkAllModules();

        const healthyCount = Array.from(moduleHealth.values()).filter(
            h => h.status === 'healthy'
        ).length;
        const totalCount = moduleHealth.size;

        let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
        if (healthyCount === totalCount) {
            overallStatus = 'healthy';
        } else if (healthyCount >= totalCount * 0.7) {
            overallStatus = 'degraded';
        } else {
            overallStatus = 'unhealthy';
        }

        // Get circuit breaker states
        const circuitStates: Record<string, string> = {};
        for (const [module, state] of this.circuitBreakers.entries()) {
            circuitStates[module] = state.state;
        }

        return {
            status: overallStatus,
            modules: moduleHealth,
            circuit_breakers: circuitStates,
            timestamp: new Date(),
        };
    }

    // ============================================================================
    // Circuit Breaker Implementation
    // ============================================================================

    private getCircuitBreakerState(module: ModuleName): 'closed' | 'open' | 'half-open' {
        const breaker = this.circuitBreakers.get(module);
        if (!breaker) {
            return 'closed';
        }

        // Check if circuit should transition from open to half-open
        if (breaker.state === 'open' && breaker.lastFailureTime) {
            const timeSinceFailure = Date.now() - breaker.lastFailureTime.getTime();
            if (timeSinceFailure > this.TIMEOUT_MS) {
                breaker.state = 'half-open';
                breaker.successCount = 0;
                this.logger.log(`Circuit breaker for ${module} transitioning to half-open`);
            }
        }

        return breaker.state;
    }

    private recordSuccess(module: ModuleName): void {
        const breaker = this.circuitBreakers.get(module);
        if (!breaker) return;

        if (breaker.state === 'half-open') {
            breaker.successCount++;

            if (breaker.successCount >= this.HALF_OPEN_ATTEMPTS) {
                breaker.state = 'closed';
                breaker.failures = 0;
                breaker.lastFailureTime = null;
                this.logger.log(`Circuit breaker for ${module} closed after successful recovery`);
            }
        } else if (breaker.state === 'closed') {
            // Reset failure count on success
            breaker.failures = Math.max(0, breaker.failures - 1);
        }
    }

    private recordFailure(module: ModuleName): void {
        const breaker = this.circuitBreakers.get(module);
        if (!breaker) return;

        breaker.failures++;
        breaker.lastFailureTime = new Date();

        if (breaker.state === 'half-open') {
            // Immediate open on failure during half-open
            breaker.state = 'open';
            this.logger.warn(`Circuit breaker for ${module} reopened after failure during half-open state`);
        } else if (breaker.failures >= this.FAILURE_THRESHOLD) {
            breaker.state = 'open';
            this.logger.warn(
                `Circuit breaker for ${module} opened after ${breaker.failures} consecutive failures`
            );
        }
    }

    /**
     * Manually reset circuit breaker for a module
     */
    resetCircuitBreaker(module: ModuleName): void {
        const breaker = this.circuitBreakers.get(module);
        if (breaker) {
            breaker.state = 'closed';
            breaker.failures = 0;
            breaker.lastFailureTime = null;
            breaker.successCount = 0;
            this.logger.log(`Circuit breaker for ${module} manually reset`);
        }
    }

    // ============================================================================
    // Rate Limiting
    // ============================================================================

    private checkRateLimit(tenantId: string): void {
        const now = new Date();
        let limitState = this.rateLimits.get(tenantId);

        if (!limitState) {
            limitState = {
                requests: [now.getTime()],
                windowStart: now,
            };
            this.rateLimits.set(tenantId, limitState);
            return;
        }

        // Clean old requests outside window
        const windowStart = now.getTime() - this.RATE_LIMIT_WINDOW_MS;
        limitState.requests = limitState.requests.filter(time => time > windowStart);

        // Check limit
        if (limitState.requests.length >= this.RATE_LIMIT_MAX_REQUESTS) {
            throw new Error(
                `Rate limit exceeded for tenant ${tenantId}: ${this.RATE_LIMIT_MAX_REQUESTS} requests per minute`
            );
        }

        // Record request
        limitState.requests.push(now.getTime());
    }

    // ============================================================================
    // Utility Methods
    // ============================================================================

    private timeout(ms: number): Promise<never> {
        return new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
        );
    }

    /**
     * Get adapter for a module (for direct access if needed)
     */
    getAdapter(module: ModuleName): IModuleAdapter | undefined {
        return this.adapters.get(module);
    }

    /**
     * Get all registered module names
     */
    getRegisteredModules(): ModuleName[] {
        return Array.from(this.adapters.keys());
    }

    /**
     * Get gateway statistics
     */
    getGatewayStats(): {
        total_modules: number;
        circuit_breakers: Record<string, { state: string; failures: number }>;
        rate_limits: Record<string, number>;
    } {
        const circuitStats: Record<string, { state: string; failures: number }> = {};
        for (const [module, breaker] of this.circuitBreakers.entries()) {
            circuitStats[module] = {
                state: breaker.state,
                failures: breaker.failures,
            };
        }

        const rateLimitStats: Record<string, number> = {};
        for (const [tenantId, limitState] of this.rateLimits.entries()) {
            rateLimitStats[tenantId] = limitState.requests.length;
        }

        return {
            total_modules: this.adapters.size,
            circuit_breakers: circuitStats,
            rate_limits: rateLimitStats,
        };
    }
}
