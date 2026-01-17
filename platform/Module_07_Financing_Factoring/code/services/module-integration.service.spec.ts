import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ModuleIntegrationService } from './module-integration.service';
import {
    IWorkflowService,
    INotificationService,
    ICreditNoteService,
    ICreditScoringService,
} from '../interfaces/module-integration.interfaces';
import { FINANCING_EVENTS } from '../events/financing.events';

describe('ModuleIntegrationService', () => {
    let service: ModuleIntegrationService;
    let eventEmitter: jest.Mocked<EventEmitter2>;
    let workflowService: jest.Mocked<IWorkflowService>;
    let notificationService: jest.Mocked<INotificationService>;
    let creditNoteService: jest.Mocked<ICreditNoteService>;
    let creditScoringService: jest.Mocked<ICreditScoringService>;

    const createServiceWithDependencies = async (deps: {
        workflow?: boolean;
        notification?: boolean;
        creditNote?: boolean;
        creditScoring?: boolean;
    }) => {
        const mockEventEmitter = {
            emit: jest.fn(),
        };

        const mockWorkflow = deps.workflow
            ? {
                triggerWorkflow: jest.fn().mockResolvedValue({ instanceId: 'wf-123' }),
                getWorkflowInstance: jest.fn(),
                cancelWorkflow: jest.fn(),
            }
            : undefined;

        const mockNotification = deps.notification
            ? {
                sendApplicationNotification: jest.fn().mockResolvedValue({ success: true }),
                sendDiscountOfferNotification: jest.fn().mockResolvedValue({ success: true }),
                sendMultiChannelNotification: jest.fn().mockResolvedValue([{ success: true }]),
            }
            : undefined;

        const mockCreditNote = deps.creditNote
            ? {
                createCreditNote: jest.fn().mockResolvedValue({ success: true, creditNoteId: 'cn-123' }),
                getCreditNote: jest.fn(),
                validateCreditNoteEligibility: jest.fn(),
            }
            : undefined;

        const mockCreditScoring = deps.creditScoring
            ? {
                reportFinancingActivity: jest.fn().mockResolvedValue({ success: true }),
                getCreditScore: jest.fn(),
                requestCreditAssessment: jest.fn(),
            }
            : undefined;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ModuleIntegrationService,
                { provide: EventEmitter2, useValue: mockEventEmitter },
                ...(mockWorkflow ? [{ provide: 'IWorkflowService', useValue: mockWorkflow }] : []),
                ...(mockNotification ? [{ provide: 'INotificationService', useValue: mockNotification }] : []),
                ...(mockCreditNote ? [{ provide: 'ICreditNoteService', useValue: mockCreditNote }] : []),
                ...(mockCreditScoring ? [{ provide: 'ICreditScoringService', useValue: mockCreditScoring }] : []),
            ],
        }).compile();

        return {
            service: module.get<ModuleIntegrationService>(ModuleIntegrationService),
            eventEmitter: module.get(EventEmitter2),
            workflowService: mockWorkflow as any,
            notificationService: mockNotification as any,
            creditNoteService: mockCreditNote as any,
            creditScoringService: mockCreditScoring as any,
        };
    };

    describe('Initialization', () => {
        it('should initialize with all services available', async () => {
            const { service } = await createServiceWithDependencies({
                workflow: true,
                notification: true,
                creditNote: true,
                creditScoring: true,
            });

            const health = service.getIntegrationHealth();

            expect(health.module05_workflow.integrated).toBe(true);
            expect(health.module11_notification.integrated).toBe(true);
            expect(health.module01_creditNote.integrated).toBe(true);
            expect(health.module06_creditScoring.integrated).toBe(true);
        });

        it('should initialize with no services available (graceful degradation)', async () => {
            const { service } = await createServiceWithDependencies({});

            const health = service.getIntegrationHealth();

            expect(health.module05_workflow.integrated).toBe(false);
            expect(health.module11_notification.integrated).toBe(false);
            expect(health.module01_creditNote.integrated).toBe(false);
            expect(health.module06_creditScoring.integrated).toBe(false);
        });

        it('should initialize with partial services (real-world scenario)', async () => {
            const { service } = await createServiceWithDependencies({
                notification: true,
                creditScoring: true,
            });

            const health = service.getIntegrationHealth();

            expect(health.module11_notification.integrated).toBe(true);
            expect(health.module06_creditScoring.integrated).toBe(true);
            expect(health.module05_workflow.integrated).toBe(false);
            expect(health.module01_creditNote.integrated).toBe(false);
        });
    });

    describe('onApplicationCreated', () => {
        it('should emit event when all services available', async () => {
            const { service, eventEmitter, notificationService, creditScoringService } =
                await createServiceWithDependencies({
                    notification: true,
                    creditScoring: true,
                });

            await service.onApplicationCreated(
                'app-123',
                'tenant-456',
                'user-789',
                'invoice_financing',
                500000,
                ['inv-1'],
            );

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                FINANCING_EVENTS.APPLICATION_CREATED,
                expect.objectContaining({
                    applicationId: 'app-123',
                    tenantId: 'tenant-456',
                    userId: 'user-789',
                }),
            );

            expect(notificationService.sendApplicationNotification).toHaveBeenCalled();
            expect(creditScoringService.reportFinancingActivity).toHaveBeenCalled();
        });

        it('should emit event even when services unavailable (graceful degradation)', async () => {
            const { service, eventEmitter } = await createServiceWithDependencies({});

            await service.onApplicationCreated(
                'app-123',
                'tenant-456',
                'user-789',
                'invoice_financing',
                500000,
            );

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                FINANCING_EVENTS.APPLICATION_CREATED,
                expect.anything(),
            );
        });

        it('should not throw error if notification fails', async () => {
            const { service, notificationService } = await createServiceWithDependencies({
                notification: true,
            });

            notificationService.sendApplicationNotification.mockRejectedValue(
                new Error('Notification failed'),
            );

            await expect(
                service.onApplicationCreated('app-123', 'tenant-456', 'user-789', 'invoice_financing', 500000),
            ).resolves.not.toThrow();
        });
    });

    describe('onApplicationApproved', () => {
        it('should send multi-channel notifications', async () => {
            const { service, notificationService } = await createServiceWithDependencies({
                notification: true,
            });

            await service.onApplicationApproved(
                'app-123',
                'tenant-456',
                'user-789',
                'lendingkart',
                500000,
                16.5,
            );

            expect(notificationService.sendMultiChannelNotification).toHaveBeenCalledWith(
                { userId: 'user-789' },
                ['email', 'whatsapp', 'sms'],
                expect.objectContaining({
                    templateId: 'loan_approved',
                    variables: expect.objectContaining({
                        amount: 500000,
                        rate: 16.5,
                    }),
                }),
            );
        });

        it('should report to credit scoring', async () => {
            const { service, creditScoringService } = await createServiceWithDependencies({
                creditScoring: true,
            });

            await service.onApplicationApproved(
                'app-123',
                'tenant-456',
                'user-789',
                'lendingkart',
                500000,
                16.5,
            );

            expect(creditScoringService.reportFinancingActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'tenant-456',
                    activityType: 'loan_approval',
                    amount: 500000,
                }),
            );
        });
    });

    describe('onLoanDisbursed', () => {
        it('should emit event and notify user', async () => {
            const { service, eventEmitter, notificationService } = await createServiceWithDependencies({
                notification: true,
            });

            await service.onLoanDisbursed('app-123', 'tenant-456', 'user-789', 'lendingkart', 500000);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                FINANCING_EVENTS.APPLICATION_DISBURSED,
                expect.anything(),
            );

            expect(notificationService.sendApplicationNotification).toHaveBeenCalledWith(
                { userId: 'user-789' },
                'loan_disbursed',
                expect.objectContaining({
                    amount: 500000,
                }),
            );
        });
    });

    describe('onDiscountOfferCreated', () => {
        it('should trigger workflow when available', async () => {
            const { service, workflowService } = await createServiceWithDependencies({
                workflow: true,
                notification: true,
            });

            await service.onDiscountOfferCreated(
                'offer-123',
                'inv-456',
                'tenant-789',
                'buyer-1',
                'supplier-2',
                2.5,
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            );

            expect(workflowService.triggerWorkflow).toHaveBeenCalledWith(
                'discount_offer_lifecycle',
                expect.objectContaining({
                    entityType: 'discount_offer',
                    entityId: 'offer-123',
                }),
            );
        });

        it('should notify supplier', async () => {
            const { service, notificationService } = await createServiceWithDependencies({
                notification: true,
            });

            const expiryDate = new Date();

            await service.onDiscountOfferCreated(
                'offer-123',
                'inv-456',
                'tenant-789',
                'buyer-1',
                'supplier-2',
                2.5,
                expiryDate,
            );

            expect(notificationService.sendDiscountOfferNotification).toHaveBeenCalledWith(
                { userId: 'supplier-2' },
                'offer_received',
                expect.objectContaining({
                    offerId: 'offer-123',
                    discountRate: 2.5,
                }),
            );
        });

        it('should work without workflow service', async () => {
            const { service, eventEmitter } = await createServiceWithDependencies({});

            await service.onDiscountOfferCreated(
                'offer-123',
                'inv-456',
                'tenant-789',
                'buyer-1',
                'supplier-2',
                2.5,
                new Date(),
            );

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                FINANCING_EVENTS.DISCOUNT_OFFER_CREATED,
                expect.anything(),
            );
        });
    });

    describe('onDiscountOfferAccepted', () => {
        it('should create credit note when service available', async () => {
            const { service, creditNoteService } = await createServiceWithDependencies({
                creditNote: true,
            });

            await service.onDiscountOfferAccepted(
                'offer-123',
                'inv-456',
                'tenant-789',
                'buyer-1',
                'supplier-2',
                97500, // Discounted amount
                100000, // Original amount
            );

            expect(creditNoteService.createCreditNote).toHaveBeenCalledWith(
                expect.objectContaining({
                    invoiceId: 'inv-456',
                    creditAmount: 2500, // Discount
                }),
            );
        });

        it('should emit credit note required event when service unavailable', async () => {
            const { service, eventEmitter } = await createServiceWithDependencies({});

            await service.onDiscountOfferAccepted(
                'offer-123',
                'inv-456',
                'tenant-789',
                'buyer-1',
                'supplier-2',
                97500,
                100000,
            );

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                FINANCING_EVENTS.CREDIT_NOTE_REQUIRED,
                expect.objectContaining({
                    discountAmount: 2500,
                }),
            );
        });

        it('should notify both buyer and supplier', async () => {
            const { service, notificationService } = await createServiceWithDependencies({
                notification: true,
            });

            await service.onDiscountOfferAccepted(
                'offer-123',
                'inv-456',
                'tenant-789',
                'buyer-1',
                'supplier-2',
                97500,
                100000,
            );

            expect(notificationService.sendDiscountOfferNotification).toHaveBeenCalledTimes(2);
        });
    });

    describe('getIntegrationHealth', () => {
        it('should return correct capabilities for each module', async () => {
            const { service } = await createServiceWithDependencies({
                workflow: true,
                notification: true,
                creditNote: true,
                creditScoring: true,
            });

            const health = service.getIntegrationHealth();

            expect(health.module05_workflow.capabilities).toContain('discount_offer_lifecycle');
            expect(health.module11_notification.capabilities).toContain('email');
            expect(health.module11_notification.capabilities).toContain('sms');
            expect(health.module11_notification.capabilities).toContain('whatsapp');
            expect(health.module01_creditNote.capabilities).toContain('automated_credit_notes');
            expect(health.module06_creditScoring.capabilities).toContain('activity_reporting');
        });

        it('should show empty capabilities when service unavailable', async () => {
            const { service } = await createServiceWithDependencies({});

            const health = service.getIntegrationHealth();

            expect(health.module05_workflow.capabilities).toHaveLength(0);
            expect(health.module11_notification.capabilities).toHaveLength(0);
        });
    });

    describe('Error Handling', () => {
        it('should not break core flow if integration fails', async () => {
            const { service, notificationService } = await createServiceWithDependencies({
                notification: true,
            });

            notificationService.sendApplicationNotification.mockRejectedValue(
                new Error('Service down'),
            );

            await expect(
                service.onApplicationCreated('app-123', 'tenant-456', 'user-789', 'invoice_financing', 500000),
            ).resolves.not.toThrow();
        });

        it('should continue even if credit scoring fails', async () => {
            const { service, creditScoringService } = await createServiceWithDependencies({
                creditScoring: true,
            });

            creditScoringService.reportFinancingActivity.mockRejectedValue(
                new Error('Scoring service error'),
            );

            await expect(
                service.onApplicationApproved('app-123', 'tenant-456', 'user-789', 'partner', 500000, 16),
            ).resolves.not.toThrow();
        });
    });
});
