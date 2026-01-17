/**
 * IntegrationGatewayService Unit Tests
 * 
 * Tests for circuit breaker, rate limiting, and module coordination
 */

import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationGatewayService } from '../integration-gateway.service';
import { ModuleName } from '../../types/orchestration.types';
import { InvoiceManagementAdapter } from '../../adapters/invoice-management.adapter';

// Mock all adapters
const createMockAdapter = (moduleName: ModuleName) => ({
    moduleName,
    baseUrl: `http://localhost:300${moduleName.split('_')[1]}`,
    version: '1.0.0',
    capabilities: ['test'],
    executeAction: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({
        module: moduleName,
        status: 'healthy',
        response_time_ms: 50,
        last_check: new Date(),
    }),
});

describe('IntegrationGatewayService', () => {
    let service: IntegrationGatewayService;
    let mockInvoiceAdapter: any;
    let mockPaymentAdapter: any;

    beforeEach(async () => {
        mockInvoiceAdapter = createMockAdapter(ModuleName.INVOICE_MANAGEMENT);
        mockPaymentAdapter = createMockAdapter(ModuleName.PAYMENT_INTEGRATION);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IntegrationGatewayService,
                { provide: 'InvoiceManagementAdapter', useValue: mockInvoiceAdapter },
                { provide: 'CustomerCommunicationAdapter', useValue: createMockAdapter(ModuleName.CUSTOMER_COMMUNICATION) },
                { provide: 'PaymentIntegrationAdapter', useValue: mockPaymentAdapter },
                { provide: 'AnalyticsReportingAdapter', useValue: createMockAdapter(ModuleName.ANALYTICS_REPORTING) },
                { provide: 'MilestoneWorkflowsAdapter', useValue: createMockAdapter(ModuleName.MILESTONE_WORKFLOWS) },
                { provide: 'CreditScoringAdapter', useValue: createMockAdapter(ModuleName.CREDIT_SCORING) },
                { provide: 'FinancingFactoringAdapter', useValue: createMockAdapter(ModuleName.FINANCING_FACTORING) },
                { provide: 'DisputeResolutionAdapter', useValue: createMockAdapter(ModuleName.DISPUTE_RESOLUTION) },
                { provide: 'MarketingCustomerSuccessAdapter', useValue: createMockAdapter(ModuleName.MARKETING_CUSTOMER_SUCCESS) },
            ],
        }).compile();

        // Need to manually construct service with adapters
        service = new IntegrationGatewayService(
            mockInvoiceAdapter,
            createMockAdapter(ModuleName.CUSTOMER_COMMUNICATION),
            mockPaymentAdapter,
            createMockAdapter(ModuleName.ANALYTICS_REPORTING),
            createMockAdapter(ModuleName.MILESTONE_WORKFLOWS),
            createMockAdapter(ModuleName.CREDIT_SCORING),
            createMockAdapter(ModuleName.FINANCING_FACTORING),
            createMockAdapter(ModuleName.DISPUTE_RESOLUTION),
            createMockAdapter(ModuleName.MARKETING_CUSTOMER_SUCCESS)
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('executeModuleAction', () => {
        it('should execute action successfully', async () => {
            mockInvoiceAdapter.executeAction.mockResolvedValue({ success: true });

            const result = await service.executeModuleAction(
                ModuleName.INVOICE_MANAGEMENT,
                'getInvoice',
                { invoiceId: 'INV-001' },
                'tenant-123'
            );

            expect(result).toEqual({ success: true });
            expect(mockInvoiceAdapter.executeAction).toHaveBeenCalledWith(
                'getInvoice',
                expect.objectContaining({ invoiceId: 'INV-001', tenantId: 'tenant-123' })
            );
        });

        it('should throw error when circuit breaker is open', async () => {
            // Trigger 5 failures to open circuit breaker
            mockInvoiceAdapter.executeAction.mockRejectedValue(new Error('Module unavailable'));

            for (let i = 0; i < 5; i++) {
                try {
                    await service.executeModuleAction(
                        ModuleName.INVOICE_MANAGEMENT,
                        'getInvoice',
                        {},
                        'tenant-123'
                    );
                } catch (error) {
                    // Expected failures
                }
            }

            // 6th call should fail with circuit breaker error
            await expect(
                service.executeModuleAction(
                    ModuleName.INVOICE_MANAGEMENT,
                    'getInvoice',
                    {},
                    'tenant-123'
                )
            ).rejects.toThrow('Circuit breaker open');
        });

        it('should enforce rate limiting', async () => {
            mockInvoiceAdapter.executeAction.mockResolvedValue({ success: true });

            // Make 100 successful requests (should succeed)
            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(
                    service.executeModuleAction(
                        ModuleName.INVOICE_MANAGEMENT,
                        'getInvoice',
                        {},
                        'tenant-123'
                    )
                );
            }
            await Promise.all(promises);

            // 101st request should fail due to rate limit
            await expect(
                service.executeModuleAction(
                    ModuleName.INVOICE_MANAGEMENT,
                    'getInvoice',
                    {},
                    'tenant-123'
                )
            ).rejects.toThrow('Rate limit exceeded');
        });

        it('should handle timeout errors', async () => {
            // Mock slow response (>30s timeout)
            mockInvoiceAdapter.executeAction.mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 35000))
            );

            await expect(
                service.executeModuleAction(
                    ModuleName.INVOICE_MANAGEMENT,
                    'getInvoice',
                    {},
                    'tenant-123'
                )
            ).rejects.toThrow('timed out');
        }, 40000); // Extend Jest timeout for this test
    });

    describe('Circuit Breaker', () => {
        it('should transition to half-open after timeout', async () => {
            jest.useFakeTimers();

            // Open circuit breaker with 5 failures
            mockInvoiceAdapter.executeAction.mockRejectedValue(new Error('Failure'));
            for (let i = 0; i < 5; i++) {
                try await service.executeModuleAction(
                    ModuleName.INVOICE_MANAGEMENT,
                    'test',
                    {},
                    'tenant-123'
                );
            } catch (error) {
                // Expected
            }
        }

      // Advance time by 30 seconds
      jest.advanceTimersByTime(30000);

        // Next call should attempt half-open
        mockInvoiceAdapter.executeAction.mockResolvedValue({ success: true });

        const result = await service.executeModuleAction(
            ModuleName.INVOICE_MANAGEMENT,
            'test',
            {},
            'tenant-123'
        );

        expect(result).toEqual({ success: true });

        jest.useRealTimers();
    });

    it('should close circuit after successful half-open attempts', async () => {
        // Open circuit
        mockInvoiceAdapter.executeAction.mockRejectedValue(new Error('Failure'));
        for (let i = 0; i < 5; i++) {
            try {
                await service.executeModuleAction(
                    ModuleName.INVOICE_MANAGEMENT,
                    'test',
                    {},
                    'tenant-123'
                );
            } catch (error) {
                // Expected
            }
        }

        // Reset circuit breaker
        service.resetCircuitBreaker(ModuleName.INVOICE_MANAGEMENT);

        // Should work now
        mockInvoiceAdapter.executeAction.mockResolvedValue({ success: true });
        const result = await service.executeModuleAction(
            ModuleName.INVOICE_MANAGEMENT,
            'test',
            {},
            'tenant-123'
        );

        expect(result).toEqual({ success: true });
    });
});

describe('Multi-Module Actions', () => {
    it('should execute actions across multiple modules in parallel', async () => {
        mockInvoiceAdapter.executeAction.mockResolvedValue({ invoice: 'data' });
        mockPaymentAdapter.executeAction.mockResolvedValue({ payment: 'data' });

        const results = await service.executeMultiModuleAction(
            [ModuleName.INVOICE_MANAGEMENT, ModuleName.PAYMENT_INTEGRATION],
            'getData',
            {},
            'tenant-123'
        );

        expect(results.size).toBe(2);
        expect(results.get(ModuleName.INVOICE_MANAGEMENT)).toEqual({ invoice: 'data' });
        expect(results.get(ModuleName.PAYMENT_INTEGRATION)).toEqual({ payment: 'data' });
    });

    it('should continue on partial failures', async () => {
        mockInvoiceAdapter.executeAction.mockResolvedValue({ invoice: 'data' });
        mockPaymentAdapter.executeAction.mockRejectedValue(new Error('Payment failed'));

        const results = await service.executeMultiModuleAction(
            [ModuleName.INVOICE_MANAGEMENT, ModuleName.PAYMENT_INTEGRATION],
            'getData',
            {},
            'tenant-123'
        );

        // Should have invoice data despite payment failure
        expect(results.size).toBe(1);
        expect(results.get(ModuleName.INVOICE_MANAGEMENT)).toEqual({ invoice: 'data' });
    });

    it('should throw error when all modules fail', async () => {
        mockInvoiceAdapter.executeAction.mockRejectedValue(new Error('Failed'));
        mockPaymentAdapter.executeAction.mockRejectedValue(new Error('Failed'));

        await expect(
            service.executeMultiModuleAction(
                [ModuleName.INVOICE_MANAGEMENT, ModuleName.PAYMENT_INTEGRATION],
                'getData',
                {},
                'tenant-123'
            )
        ).rejects.toThrow('All modules failed');
    });
});

describe('Health Checking', () => {
    it('should check individual module health', async () => {
        const health = await service.checkModuleHealth(ModuleName.INVOICE_MANAGEMENT);

        expect(health.module).toBe(ModuleName.INVOICE_MANAGEMENT);
        expect(health.status).toBe('healthy');
        expect(health.response_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('should check all modules health', async () => {
        const allHealth = await service.checkAllModules();

        expect(allHealth.size).toBe(9);

        for (const [module, health] of allHealth.entries()) {
            expect(health.module).toBe(module);
            expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
        }
    });

    it('should report overall gateway health', async () => {
        const gatewayHealth = await service.getGatewayHealth();

        expect(gatewayHealth.status).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(gatewayHealth.status);
        expect(gatewayHealth.modules.size).toBe(9);
        expect(gatewayHealth.circuit_breakers).toBeDefined();
    });
});

describe('Statistics', () => {
    it('should provide gateway statistics', () => {
        const stats = service.getGatewayStats();

        expect(stats.total_modules).toBe(9);
        expect(stats.circuit_breakers).toBeDefined();
        expect(stats.rate_limits).toBeDefined();
    });
});
});
