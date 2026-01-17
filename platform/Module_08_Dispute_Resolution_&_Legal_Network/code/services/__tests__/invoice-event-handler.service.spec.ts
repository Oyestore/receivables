import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceEventHandlerService } from '../invoice-event-handler.service';
import { DisputeManagementService } from '../dispute-management.service';
import { CollectionManagementService } from '../collection-management.service';
import { AuditService } from '../audit.service';

describe('InvoiceEventHandlerService', () => {
    let service: InvoiceEventHandlerService;
    let disputeService: jest.Mocked<DisputeManagementService>;
    let collectionService: jest.Mocked<CollectionManagementService>;
    let auditService: jest.Mocked<AuditService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvoiceEventHandlerService,
                {
                    provide: DisputeManagementService,
                    useValue: {
                        create: jest.fn(),
                        findByInvoiceId: jest.fn(),
                        addNote: jest.fn(),
                    },
                },
                {
                    provide: CollectionManagementService,
                    useValue: {
                        create: jest.fn(),
                        findByInvoiceId: jest.fn(),
                        updateOverdueInfo: jest.fn(),
                    },
                },
                {
                    provide: AuditService,
                    useValue: {
                        log: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<InvoiceEventHandlerService>(InvoiceEventHandlerService);
        disputeService = module.get(DisputeManagementService) as jest.Mocked<DisputeManagementService>;
        collectionService = module.get(CollectionManagementService) as jest.Mocked<CollectionManagementService>;
        auditService = module.get(AuditService) as jest.Mocked<AuditService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleInvoiceOverdue', () => {
        const mockOverdueEvent = {
            invoiceId: 'inv-123',
            invoiceNumber: 'INV-2024-001',
            customerId: 'cust-456',
            customerName: 'Test Customer',
            amount: 50000,
            dueDate: new Date('2024-01-01'),
            overdueDays: 10,
            tenantId: 'tenant-789',
        };

        it('should create collection case when overdue exceeds grace period', async () => {
            collectionService.findByInvoiceId.mockResolvedValue(null);
            collectionService.create.mockResolvedValue({ id: 'coll-123' } as any);

            await service.handleInvoiceOverdue(mockOverdueEvent);

            expect(collectionService.findByInvoiceId).toHaveBeenCalledWith('inv-123');
            expect(collectionService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    invoiceId: 'inv-123',
                    invoiceNumber: 'INV-2024-001',
                    outstandingAmount: 50000,
                    overdueDays: 10,
                    source: 'AUTO_CREATED',
                })
            );
            expect(auditService.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'COLLECTION_CASE_AUTO_CREATED',
                })
            );
        });

        it('should not create collection case within grace period', async () => {
            const withinGraceEvent = { ...mockOverdueEvent, overdueDays: 3 };

            await service.handleInvoiceOverdue(withinGraceEvent);

            expect(collectionService.create).not.toHaveBeenCalled();
        });

        it('should update existing collection case instead of creating duplicate', async () => {
            collectionService.findByInvoiceId.mockResolvedValue({ id: 'existing-123' } as any);

            await service.handleInvoiceOverdue(mockOverdueEvent);

            expect(collectionService.create).not.toHaveBeenCalled();
            expect(collectionService.updateOverdueInfo).toHaveBeenCalledWith(
                'existing-123',
                expect.objectContaining({
                    overdueDays: 10,
                    currentAmount: 50000,
                })
            );
        });

        it('should create high-priority dispute for high-value invoices', async () => {
            const highValueEvent = { ...mockOverdueEvent, amount: 150000 };
            collectionService.findByInvoiceId.mockResolvedValue(null);
            collectionService.create.mockResolvedValue({ id: 'coll-123' } as any);
            disputeService.create.mockResolvedValue({ id: 'dispute-123' } as any);

            await service.handleInvoiceOverdue(highValueEvent);

            expect(disputeService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    invoiceId: 'inv-123',
                    disputeType: 'PAYMENT_DELAY',
                    priority: 'HIGH',
                    amount: 150000,
                })
            );
        });

        it('should create dispute for extended overdue (90+ days)', async () => {
            const extendedOverdueEvent = { ...mockOverdueEvent, overdueDays: 95 };
            collectionService.findByInvoiceId.mockResolvedValue(null);
            collectionService.create.mockResolvedValue({ id: 'coll-123' } as any);
            disputeService.create.mockResolvedValue({ id: 'dispute-123' } as any);

            await service.handleInvoiceOverdue(extendedOverdueEvent);

            expect(disputeService.create).toHaveBeenCalled();
            expect(disputeService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        reason: 'EXTENDED_OVERDUE',
                    }),
                })
            );
        });

        it('should calculate correct priority based on amount and days', async () => {
            // Test LOW priority
            const lowPriorityEvent = { ...mockOverdueEvent, amount: 10000, overdueDays: 10 };
            collectionService.findByInvoiceId.mockResolvedValue(null);
            collectionService.create.mockResolvedValue({ id: 'coll-1' } as any);

            await service.handleInvoiceOverdue(lowPriorityEvent);

            expect(collectionService.create).toHaveBeenCalledWith(
                expect.objectContaining({ priority: 'LOW' })
            );

            jest.clearAllMocks();
            collectionService.findByInvoiceId.mockResolvedValue(null);
            collectionService.create.mockResolvedValue({ id: 'coll-2' } as any);

            // Test MEDIUM priority
            const mediumPriorityEvent = { ...mockOverdueEvent, amount: 60000, overdueDays: 35 };
            await service.handleInvoiceOverdue(mediumPriorityEvent);

            expect(collectionService.create).toHaveBeenCalledWith(
                expect.objectContaining({ priority: 'MEDIUM' })
            );
        });

        it('should prevent duplicate event processing', async () => {
            collectionService.findByInvoiceId.mockResolvedValue(null);
            collectionService.create.mockResolvedValue({ id: 'coll-123' } as any);

            // Process same event twice
            await service.handleInvoiceOverdue(mockOverdueEvent);
            await service.handleInvoiceOverdue(mockOverdueEvent);

            // Should only create once
            expect(collectionService.create).toHaveBeenCalledTimes(1);
        });

        it('should handle errors gracefully without throwing', async () => {
            collectionService.findByInvoiceId.mockRejectedValue(new Error('Database error'));

            await expect(service.handleInvoiceOverdue(mockOverdueEvent)).resolves.not.toThrow();

            expect(auditService.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'COLLECTION_CASE_AUTO_CREATE_FAILED',
                })
            );
        });
    });

    describe('handlePaymentFailed', () => {
        const mockPaymentFailedEvent = {
            paymentId: 'pay-123',
            invoiceId: 'inv-456',
            invoiceNumber: 'INV-2024-002',
            customerId: 'cust-789',
            customerName: 'Test Customer 2',
            amount: 75000,
            attemptedAt: new Date(),
            failureReason: 'Insufficient funds',
            attemptNumber: 3,
            tenantId: 'tenant-789',
        };

        it('should create dispute when payment attempts exceed threshold', async () => {
            disputeService.findByInvoiceId.mockResolvedValue(null);
            disputeService.create.mockResolvedValue({ id: 'dispute-123' } as any);

            await service.handlePaymentFailed(mockPaymentFailedEvent);

            expect(disputeService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    invoiceId: 'inv-456',
                    disputeType: 'PAYMENT_FAILURE',
                    amount: 75000,
                    category: 'INSUFFICIENT_FUNDS',
                })
            );
            expect(auditService.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'DISPUTE_AUTO_CREATED_PAYMENT_FAILURE',
                })
            );
        });

        it('should not create dispute below threshold attempts', async () => {
            const belowThresholdEvent = { ...mockPaymentFailedEvent, attemptNumber: 1 };

            await service.handlePaymentFailed(belowThresholdEvent);

            expect(disputeService.create).not.toHaveBeenCalled();
        });

        it('should add note to existing dispute instead of creating duplicate', async () => {
            disputeService.findByInvoiceId.mockResolvedValue({ id: 'existing-dispute' } as any);

            await service.handlePaymentFailed(mockPaymentFailedEvent);

            expect(disputeService.create).not.toHaveBeenCalled();
            expect(disputeService.addNote).toHaveBeenCalledWith(
                'existing-dispute',
                expect.objectContaining({
                    note: expect.stringContaining('Payment attempt 3 failed'),
                })
            );
        });

        it('should create both dispute and collection case on multiple failures', async () => {
            const multipleFailuresEvent = { ...mockPaymentFailedEvent, attemptNumber: 5 };
            disputeService.findByInvoiceId.mockResolvedValue(null);
            disputeService.create.mockResolvedValue({ id: 'dispute-123' } as any);
            collectionService.create.mockResolvedValue({ id: 'coll-123' } as any);

            await service.handlePaymentFailed(multipleFailuresEvent);

            expect(disputeService.create).toHaveBeenCalled();
            expect(collectionService.create).toHaveBeenCalled();
            expect(collectionService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    priority: 'HIGH',
                    metadata: expect.objectContaining({
                        paymentFailures: 5,
                    }),
                })
            );
        });

        it('should correctly categorize different failure reasons', async () => {
            disputeService.findByInvoiceId.mockResolvedValue(null);
            disputeService.create.mockResolvedValue({ id: 'dispute-123' } as any);

            // Test insufficient funds
            await service.handlePaymentFailed({ ...mockPaymentFailedEvent, failureReason: 'Insufficient balance' });
            expect(disputeService.create).toHaveBeenCalledWith(
                expect.objectContaining({ category: 'INSUFFICIENT_FUNDS' })
            );

            jest.clearAllMocks();
            disputeService.create.mockResolvedValue({ id: 'dispute-124' } as any);

            // Test invalid payment method
            await service.handlePaymentFailed({ ...mockPaymentFailedEvent, failureReason: 'Invalid card' });
            expect(disputeService.create).toHaveBeenCalledWith(
                expect.objectContaining({ category: 'INVALID_PAYMENT_METHOD' })
            );

            jest.clearAllMocks();
            disputeService.create.mockResolvedValue({ id: 'dispute-125' } as any);

            // Test payment declined
            await service.handlePaymentFailed({ ...mockPaymentFailedEvent, failureReason: 'Payment declined by bank' });
            expect(disputeService.create).toHaveBeenCalledWith(
                expect.objectContaining({ category: 'PAYMENT_DECLINED' })
            );
        });

        it('should set priority based on attempt number', async () => {
            disputeService.findByInvoiceId.mockResolvedValue(null);
            disputeService.create.mockResolvedValue({ id: 'dispute-123' } as any);

            // Test MEDIUM priority (< 5 attempts)
            await service.handlePaymentFailed({ ...mockPaymentFailedEvent, attemptNumber: 3 });
            expect(disputeService.create).toHaveBeenCalledWith(
                expect.objectContaining({ priority: 'MEDIUM' })
            );

            jest.clearAllMocks();
            disputeService.findByInvoiceId.mockResolvedValue(null);
            disputeService.create.mockResolvedValue({ id: 'dispute-124' } as any);

            // Test HIGH priority (>= 5 attempts)
            await service.handlePaymentFailed({ ...mockPaymentFailedEvent, attemptNumber: 6 });
            expect(disputeService.create).toHaveBeenCalledWith(
                expect.objectContaining({ priority: 'HIGH' })
            );
        });

        it('should prevent duplicate event processing', async () => {
            disputeService.findByInvoiceId.mockResolvedValue(null);
            disputeService.create.mockResolvedValue({ id: 'dispute-123' } as any);

            // Process same event twice
            await service.handlePaymentFailed(mockPaymentFailedEvent);
            await service.handlePaymentFailed(mockPaymentFailedEvent);

            // Should only create once
            expect(disputeService.create).toHaveBeenCalledTimes(1);
        });

        it('should handle errors gracefully without throwing', async () => {
            disputeService.findByInvoiceId.mockRejectedValue(new Error('Database error'));

            await expect(service.handlePaymentFailed(mockPaymentFailedEvent)).resolves.not.toThrow();

            expect(auditService.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'DISPUTE_AUTO_CREATE_FAILED',
                })
            );
        });
    });
});
