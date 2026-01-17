import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccountingIntegrationService } from './accounting-integration.service';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { Refund } from '../entities/refund.entity';
import { AccountingHubService } from '@accounting-integration-hub';

describe('AccountingIntegrationService', () => {
    let service: AccountingIntegrationService;
    let paymentRepo: Repository<PaymentTransaction>;
    let refundRepo: Repository<Refund>;
    let accountingHub: AccountingHubService;
    let eventEmitter: EventEmitter2;

    const mockPaymentRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockRefundRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockAccountingHub = {
        syncPaymentReceived: jest.fn(),
        syncRefund: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AccountingIntegrationService,
                {
                    provide: getRepositoryToken(PaymentTransaction),
                    useValue: mockPaymentRepo,
                },
                {
                    provide: getRepositoryToken(Refund),
                    useValue: mockRefundRepo,
                },
                {
                    provide: AccountingHubService,
                    useValue: mockAccountingHub,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<AccountingIntegrationService>(AccountingIntegrationService);
        paymentRepo = module.get(getRepositoryToken(PaymentTransaction));
        refundRepo = module.get(getRepositoryToken(Refund));
        accountingHub = module.get<AccountingHubService>(AccountingHubService);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('syncPaymentReceived', () => {
        const mockPayment = {
            id: 'payment-1',
            amount: 10000,
            payment_method: 'upi',
            transaction_id: 'TXN123',
            gateway: 'phonepe',
            status: 'completed',
            currency: 'INR',
            created_at: new Date(),
            invoice: {
                id: 'inv-1',
                external_id: 'TALLY-INV-001',
            },
        };

        it('should sync payment successfully', async () => {
            mockPaymentRepo.findOne.mockResolvedValue(mockPayment);
            mockAccountingHub.syncPaymentReceived.mockResolvedValue(undefined);

            await service.syncPaymentReceived({
                paymentId: 'payment-1',
                tenantId: 'tenant-123',
            });

            expect(mockAccountingHub.syncPaymentReceived).toHaveBeenCalledWith({
                tenantId: 'tenant-123',
                invoice: {
                    id: 'inv-1',
                    external_id: 'TALLY-INV-001',
                },
                amount: 10000,
                method: 'upi',
                transactionId: 'TXN123',
                timestamp: expect.any(Date),
                metadata: {
                    gateway: 'phonepe',
                    status: 'completed',
                    currency: 'INR',
                },
            });
        });

        it('should throw error when payment not found', async () => {
            mockPaymentRepo.findOne.mockResolvedValue(null);

            await expect(
                service.syncPaymentReceived({
                    paymentId: 'nonexistent',
                    tenantId: 'tenant-123',
                })
            ).rejects.toThrow('Payment nonexistent not found');
        });

        it('should emit error event on sync failure', async () => {
            mockPaymentRepo.findOne.mockResolvedValue(mockPayment);
            mockAccountingHub.syncPaymentReceived.mockRejectedValue(
                new Error('Sync failed')
            );

            await expect(
                service.syncPaymentReceived({
                    paymentId: 'payment-1',
                    tenantId: 'tenant-123',
                })
            ).rejects.toThrow('Sync failed');

            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'accounting.sync.failed',
                expect.objectContaining({
                    entityType: 'payment',
                    entityId: 'payment-1',
                    tenantId: 'tenant-123',
                })
            );
        });
    });

    describe('syncRefund', () => {
        const mockRefund = {
            id: 'refund-1',
            payment_id: 'payment-1',
            amount: 5000,
            reason: 'Customer request',
            status: 'processed',
            refund_transaction_id: 'REFUND-TXN-123',
            created_at: new Date(),
            payment: {
                id: 'payment-1',
                external_id: 'TALLY-PAY-001',
                gateway: 'razorpay',
                invoice: {
                    id: 'inv-1',
                },
            },
        };

        it('should sync refund successfully', async () => {
            mockRefundRepo.findOne.mockResolvedValue(mockRefund);
            mockAccountingHub.syncRefund.mockResolvedValue(undefined);

            await service.syncRefund({
                refundId: 'refund-1',
                tenantId: 'tenant-123',
            });

            expect(mockAccountingHub.syncRefund).toHaveBeenCalledWith({
                tenantId: 'tenant-123',
                id: 'refund-1',
                payment_id: 'payment-1',
                payment_external_id: 'TALLY-PAY-001',
                invoice_id: 'inv-1',
                amount: 5000,
                reason: 'Customer request',
                refund_date: expect.any(Date),
                status: 'processed',
                metadata: {
                    gateway: 'razorpay',
                    refund_transaction_id: 'REFUND-TXN-123',
                },
            });
        });

        it('should handle refund not found', async () => {
            mockRefundRepo.findOne.mockResolvedValue(null);

            await expect(
                service.syncRefund({
                    refundId: 'nonexistent',
                    tenantId: 'tenant-123',
                })
            ).rejects.toThrow('Refund nonexistent not found');
        });
    });

    describe('Event Handlers', () => {
        it('should auto-sync on payment.completed event', async () => {
            const mockPayment = {
                id: 'payment-1',
                amount: 10000,
                invoice: { id: 'inv-1', external_id: 'EXT-1' },
            };

            mockPaymentRepo.findOne.mockResolvedValue(mockPayment);
            mockAccountingHub.syncPaymentReceived.mockResolvedValue(undefined);

            await service.handlePaymentCompleted({
                paymentId: 'payment-1',
                tenantId: 'tenant-123',
            });

            expect(mockAccountingHub.syncPaymentReceived).toHaveBeenCalled();
        });

        it('should auto-sync on refund.processed event', async () => {
            const mockRefund = {
                id: 'refund-1',
                payment: { id: 'payment-1', invoice: { id: 'inv-1' } },
            };

            mockRefundRepo.findOne.mockResolvedValue(mockRefund);
            mockAccountingHub.syncRefund.mockResolvedValue(undefined);

            await service.handleRefundProcessed({
                refundId: 'refund-1',
                tenantId: 'tenant-123',
            });

            expect(mockAccountingHub.syncRefund).toHaveBeenCalled();
        });

        it('should handle retry event', async () => {
            const mockPayment = {
                id: 'payment-1',
                amount: 10000,
                invoice: { id: 'inv-1' },
            };

            mockPaymentRepo.findOne.mockResolvedValue(mockPayment);
            mockAccountingHub.syncPaymentReceived.mockResolvedValue(undefined);

            await service.retryFailedSync({
                entityType: 'payment',
                entityId: 'payment-1',
                tenantId: 'tenant-123',
            });

            expect(mockAccountingHub.syncPaymentReceived).toHaveBeenCalled();
        });
    });

    describe('Integration with M11 Hub', () => {
        it('should call hub with correct payment structure', async () => {
            const payment = {
                id: 'payment-1',
                amount: 15000,
                payment_method: 'card',
                transaction_id: 'CARD-TXN-456',
                gateway: 'razorpay',
                status: 'completed',
                currency: 'INR',
                created_at: new Date('2024-01-15T10:00:00Z'),
                invoice: {
                    id: 'inv-1',
                    external_id: 'ZOHO-INV-789',
                },
            };

            mockPaymentRepo.findOne.mockResolvedValue(payment);
            mockAccountingHub.syncPaymentReceived.mockResolvedValue(undefined);

            await service.syncPaymentReceived({
                paymentId: 'payment-1',
                tenantId: 'tenant-123',
            });

            expect(mockAccountingHub.syncPaymentReceived).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'tenant-123',
                    invoice: expect.objectContaining({
                        id: 'inv-1',
                        external_id: 'ZOHO-INV-789',
                    }),
                    amount: 15000,
                    method: 'card',
                    transactionId: 'CARD-TXN-456',
                })
            );
        });

        it('should propagate hub errors correctly', async () => {
            mockPaymentRepo.findOne.mockResolvedValue({
                id: 'payment-1',
                invoice: { id: 'inv-1' },
            });

            mockAccountingHub.syncPaymentReceived.mockRejectedValue(
                new Error('Hub connection failed')
            );

            await expect(
                service.syncPaymentReceived({
                    paymentId: 'payment-1',
                    tenantId: 'tenant-123',
                })
            ).rejects.toThrow('Hub connection failed');
        });
    });

    describe('Error Scenarios', () => {
        it('should handle malformed payment data gracefully', async () => {
            mockPaymentRepo.findOne.mockResolvedValue({
                id: 'payment-1',
                // Missing required fields
            });

            mockAccountingHub.syncPaymentReceived.mockRejectedValue(
                new Error('Invalid data')
            );

            await expect(
                service.syncPaymentReceived({
                    paymentId: 'payment-1',
                    tenantId: 'tenant-123',
                })
            ).rejects.toThrow();

            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'accounting.sync.failed',
                expect.any(Object)
            );
        });
    });
});
