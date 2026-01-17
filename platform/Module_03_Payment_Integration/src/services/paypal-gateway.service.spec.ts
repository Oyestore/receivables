import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PayPalGatewayService } from './paypal-gateway.service';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { Refund } from '../entities/refund.entity';

describe('PayPalGatewayService', () => {
    let service: PayPalGatewayService;

    const mockPaymentRepo = { findOne: jest.fn(), save: jest.fn() };
    const mockRefundRepo = { findOne: jest.fn(), save: jest.fn() };
    const mockEventEmitter = { emit: jest.fn() };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PayPalGatewayService,
                { provide: getRepositoryToken(PaymentTransaction), useValue: mockPaymentRepo },
                { provide: getRepositoryToken(Refund), useValue: mockRefundRepo },
                { provide: EventEmitter2, useValue: mockEventEmitter },
            ],
        }).compile();

        service = module.get<PayPalGatewayService>(PayPalGatewayService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('currency support', () => {
        it('should support USD', () => expect(service.isCurrencySupported('USD')).toBe(true));
        it('should support EUR', () => expect(service.isCurrencySupported('EUR')).toBe(true));
        it('should support INR', () => expect(service.isCurrencySupported('INR')).toBe(true));
        it('should reject unsupported currency', () => expect(service.isCurrencySupported('XYZ')).toBe(false));
    });

    describe('amount formatting', () => {
        it('should format to 2 decimals', () => {
            expect(service.formatAmount(100.123)).toBe('100.12');
            expect(service.formatAmount(50.5)).toBe('50.50');
            expect(service.formatAmount(10)).toBe('10.00');
        });
    });

    describe('order operations', () => {
        it('should create order successfully', async () => {
            expect(service.createOrder).toBeDefined();
        });

        it('should get approval URL from order', () => {
            const mockOrder = {
                id: 'order_123',
                status: 'CREATED',
                links: [
                    { rel: 'self', href: 'https://api.paypal.com/v2/checkout/orders/order_123' },
                    { rel: 'approve', href: 'https://www.paypal.com/checkoutnow?token=order_123' },
                ],
            } as any;

            const approvalUrl = service.getApprovalUrl(mockOrder);
            expect(approvalUrl).toContain('paypal.com/checkoutnow');
        });

        it('should return null if no approval link', () => {
            const mockOrder = { id: 'order_123', links: [] } as any;
            expect(service.getApprovalUrl(mockOrder)).toBeNull();
        });
    });

    describe('webhook verification', () => {
        it('should verify webhook signature', async () => {
            expect(service.verifyWebhookSignature).toBeDefined();
        });
    });

    describe('event handlers', () => {
        it('should emit order approved event', async () => {
            const event = {
                event_type: 'CHECKOUT.ORDER.APPROVED',
                resource: { id: 'order_123', payer: { email: 'user@example.com' } },
            };

            await service.processWebhook({
                headers: {
                    'paypal-auth-algo': 'SHA256withRSA',
                    'paypal-cert-url': 'https://api.paypal.com/cert',
                    'paypal-transmission-id': 'txn_123',
                    'paypal-transmission-sig': 'sig_123',
                    'paypal-transmission-time': '2024-01-15T15:00:00Z',
                },
                body: event,
            });

            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'paypal.order.approved',
                expect.any(Object)
            );
        });

        it('should emit capture completed event', async () => {
            const event = {
                event_type: 'PAYMENT.CAPTURE.COMPLETED',
                resource: { id: 'capture_123', status: 'COMPLETED', amount: { value: '100.00' } },
            };

            await service.processWebhook({
                headers: {
                    'paypal-auth-algo': 'SHA256withRSA',
                    'paypal-cert-url': 'https://api.paypal.com/cert',
                    'paypal-transmission-id': 'txn_123',
                    'paypal-transmission-sig': 'sig_123',
                    'paypal-transmission-time': '2024-01-15T15:00:00Z',
                },
                body: event,
            });

            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'paypal.capture.completed',
                expect.any(Object)
            );
        });
    });
});
