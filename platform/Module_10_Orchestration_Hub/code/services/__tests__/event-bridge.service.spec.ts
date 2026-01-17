/**
 * EventBridgeService Unit Tests
 * 
 * Tests for event publishing, subscription management, and distribution
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBridgeService } from '../event-bridge.service';
import { IntegrationGatewayService } from '../integration-gateway.service';
import { ModuleName, IModuleEvent } from '../../types/orchestration.types';

describe('EventBridgeService', () => {
    let service: EventBridgeService;
    let eventEmitter: EventEmitter2;
    let mockIntegrationGateway: Partial<IntegrationGatewayService>;

    beforeEach(async () => {
        mockIntegrationGateway = {
            executeModuleAction: jest.fn().mockResolvedValue({ success: true }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventBridgeService,
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
                {
                    provide: IntegrationGatewayService,
                    useValue: mockIntegrationGateway,
                },
            ],
        }).compile();

        service = module.get<EventBridgeService>(EventBridgeService);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('publishEvent', () => {
        it('should publish event and emit locally', async () => {
            const event: IModuleEvent = {
                event_type: 'invoice.created',
                source_module: ModuleName.INVOICE_MANAGEMENT,
                tenant_id: 'tenant-123',
                payload: { invoiceId: 'INV-001' },
            };

            await service.publishEvent(event);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'invoice.created',
                expect.objectContaining({
                    event_type: 'invoice.created',
                    event_id: expect.any(String),
                    timestamp: expect.any(Date),
                })
            );
        });

        it('should auto-generate event ID if not provided', async () => {
            const event: IModuleEvent = {
                event_type: 'payment.received',
                source_module: ModuleName.PAYMENT_INTEGRATION,
                tenant_id: 'tenant-123',
                payload: {},
            };

            await service.publishEvent(event);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'payment.received',
                expect.objectContaining({
                    event_id: expect.stringMatching(/^evt-/),
                })
            );
        });

        it('should distribute event to subscribed modules', async () => {
            // Subscribe payment module to invoice events
            service.subscribeModule(ModuleName.PAYMENT_INTEGRATION, ['invoice.created']);

            const event: IModuleEvent = {
                event_type: 'invoice.created',
                source_module: ModuleName.INVOICE_MANAGEMENT,
                tenant_id: 'tenant-123',
                payload: {},
            };

            await service.publishEvent(event);

            expect(mockIntegrationGateway.executeModuleAction).toHaveBeenCalledWith(
                ModuleName.PAYMENT_INTEGRATION,
                'handleEvent',
                expect.objectContaining({ event }),
                'tenant-123'
            );
        });

        it('should not distribute event to source module', async () => {
            // Subscribe invoice module to its own events
            service.subscribeModule(ModuleName.INVOICE_MANAGEMENT, ['invoice.created']);

            const event: IModuleEvent = {
                event_type: 'invoice.created',
                source_module: ModuleName.INVOICE_MANAGEMENT,
                tenant_id: 'tenant-123',
                payload: {},
            };

            await service.publishEvent(event);

            // Should NOT call integration gateway for source module
            expect(mockIntegrationGateway.executeModuleAction).not.toHaveBeenCalledWith(
                ModuleName.INVOICE_MANAGEMENT,
                expect.anything(),
                expect.anything(),
                expect.anything()
            );
        });
    });

    describe('publishBatch', () => {
        it('should publish multiple events', async () => {
            const events: IModuleEvent[] = [
                {
                    event_type: 'invoice.created',
                    source_module: ModuleName.INVOICE_MANAGEMENT,
                    tenant_id: 'tenant-123',
                    payload: {},
                },
                {
                    event_type: 'payment.received',
                    source_module: ModuleName.PAYMENT_INTEGRATION,
                    tenant_id: 'tenant-123',
                    payload: {},
                },
            ];

            await service.publishBatch(events);

            expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
            expect(eventEmitter.emit).toHaveBeenCalledWith('invoice.created', expect.anything());
            expect(eventEmitter.emit).toHaveBeenCalledWith('payment.received', expect.anything());
        });
    });

    describe('Subscription Management', () => {
        it('should subscribe module to event types', () => {
            service.subscribeModule(ModuleName.PAYMENT_INTEGRATION, [
                'invoice.created',
                'invoice.sent',
            ]);

            const subscriptions = service.getModuleSubscriptions(ModuleName.PAYMENT_INTEGRATION);

            expect(subscriptions).toContain('invoice.created');
            expect(subscriptions).toContain('invoice.sent');
            expect(subscriptions.length).toBe(2);
        });

        it('should not duplicate subscriptions', () => {
            service.subscribeModule(ModuleName.PAYMENT_INTEGRATION, ['invoice.created']);
            service.subscribeModule(ModuleName.PAYMENT_INTEGRATION, ['invoice.created']);

            const subscriptions = service.getModuleSubscriptions(ModuleName.PAYMENT_INTEGRATION);

            expect(subscriptions.filter(s => s === 'invoice.created').length).toBe(1);
        });

        it('should unsubscribe module from event types', () => {
            service.subscribeModule(ModuleName.PAYMENT_INTEGRATION, [
                'invoice.created',
                'invoice.sent',
            ]);

            service.unsubscribeModule(ModuleName.PAYMENT_INTEGRATION, ['invoice.created']);

            const subscriptions = service.getModuleSubscriptions(ModuleName.PAYMENT_INTEGRATION);

            expect(subscriptions).not.toContain('invoice.created');
            expect(subscriptions).toContain('invoice.sent');
        });

        it('should clear all subscriptions', () => {
            service.subscribeModule(ModuleName.PAYMENT_INTEGRATION, ['invoice.created']);
            service.subscribeModule(ModuleName.ANALYTICS_REPORTING, ['payment.received']);

            service.clearSubscriptions();

            const stats = service.getStatistics();
            expect(stats.active_subscriptions).toBe(0);
        });
    });

    describe('Default Event Subscriptions', () => {
        it('should have pre-configured invoice event subscriptions', () => {
            // EventBridgeService sets up default subscriptions in onModuleInit
            service.onModuleInit();

            const paymentSubs = service.getModuleSubscriptions(ModuleName.PAYMENT_INTEGRATION);
            const commSubs = service.getModuleSubscriptions(ModuleName.CUSTOMER_COMMUNICATION);

            expect(paymentSubs).toContain('invoice.created');
            expect(commSubs).toContain('invoice.overdue');
        });

        it('should have pre-configured payment event subscriptions', () => {
            service.onModuleInit();

            const invoiceSubs = service.getModuleSubscriptions(ModuleName.INVOICE_MANAGEMENT);

            expect(invoiceSubs).toContain('payment.received');
            expect(invoiceSubs).toContain('payment.failed');
        });
    });

    describe('Event Distribution', () => {
        it('should distribute to multiple subscribers', async () => {
            service.subscribeModule(ModuleName.PAYMENT_INTEGRATION, ['invoice.created']);
            service.subscribeModule(ModuleName.ANALYTICS_REPORTING, ['invoice.created']);

            const event: IModuleEvent = {
                event_type: 'invoice.created',
                source_module: ModuleName.INVOICE_MANAGEMENT,
                tenant_id: 'tenant-123',
                payload: {},
            };

            await service.publishEvent(event);

            expect(mockIntegrationGateway.executeModuleAction).toHaveBeenCalledTimes(2);
        });

        it('should handle distribution failures gracefully', async () => {
            (mockIntegrationGateway.executeModuleAction as jest.Mock).mockRejectedValue(
                new Error('Module unavailable')
            );

            service.subscribeModule(ModuleName.PAYMENT_INTEGRATION, ['invoice.created']);

            const event: IModuleEvent = {
                event_type: 'invoice.created',
                source_module: ModuleName.INVOICE_MANAGEMENT,
                tenant_id: 'tenant-123',
                payload: {},
            };

            // Should not throw despite distribution failure
            await expect(service.publishEvent(event)).resolves.not.toThrow();
        });
    });

    describe('Statistics', () => {
        it('should track total events published', async () => {
            const event: IModuleEvent = {
                event_type: 'test.event',
                source_module: ModuleName.INVOICE_MANAGEMENT,
                tenant_id: 'tenant-123',
                payload: {},
            };

            await service.publishEvent(event);
            await service.publishEvent(event);
            await service.publishEvent(event);

            const stats = service.getStatistics();
            expect(stats.total_events_published).toBe(3);
        });

        it('should track active subscriptions', () => {
            service.subscribeModule(ModuleName.PAYMENT_INTEGRATION, ['invoice.created', 'invoice.sent']);
            service.subscribeModule(ModuleName.ANALYTICS_REPORTING, ['payment.received']);

            const stats = service.getStatistics();
            expect(stats.active_subscriptions).toBe(3);
        });

        it('should track subscriptions by event type', () => {
            service.subscribeModule(ModuleName.PAYMENT_INTEGRATION, ['invoice.created']);
            service.subscribeModule(ModuleName.ANALYTICS_REPORTING, ['invoice.created']);
            service.subscribeModule(ModuleName.CUSTOMER_COMMUNICATION, ['payment.received']);

            const stats = service.getStatistics();
            expect(stats.subscriptions_by_event['invoice.created']).toBe(2);
            expect(stats.subscriptions_by_event['payment.received']).toBe(1);
        });
    });

    describe('Internal Event Handlers', () => {
        it('should handle invoice.overdue events', async () => {
            const event: IModuleEvent = {
                event_type: 'invoice.overdue',
                source_module: ModuleName.INVOICE_MANAGEMENT,
                tenant_id: 'tenant-123',
                payload: { invoiceId: 'INV-001' },
            };

            // Should process without error
            await expect(service.handleInvoiceOverdue(event)).resolves.not.toThrow();
        });

        it('should handle payment.received events', async () => {
            const event: IModuleEvent = {
                event_type: 'payment.received',
                source_module: ModuleName.PAYMENT_INTEGRATION,
                tenant_id: 'tenant-123',
                payload: { paymentId: 'PAY-001' },
            };

            await expect(service.handlePaymentReceived(event)).resolves.not.toThrow();
        });

        it('should handle credit.limit_exceeded events', async () => {
            const event: IModuleEvent = {
                event_type: 'credit.limit_exceeded',
                source_module: ModuleName.CREDIT_SCORING,
                tenant_id: 'tenant-123',
                payload: { customerId: 'CUST-001' },
            };

            await expect(service.handleCreditLimitExceeded(event)).resolves.not.toThrow();
        });
    });
});
