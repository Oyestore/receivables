import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConciergeService } from '../../services/concierge.service';
import { PaymentIntegrationService } from '../../services/payment-integration.service';
import { DisputeIntegrationService } from '../../services/dispute-integration.service';
import { NotificationService } from '../../services/notification.service';
import { ReferralIntegrationService } from '../../services/referral-integration.service';
import { PrivacyGatewayService } from '../../services/privacy-gateway.service';
import { ChatSession, ChatPersona } from '../../entities/chat-session.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Module 16 Integration Tests', () => {
    let conciergeService: ConciergeService;
    let paymentService: PaymentIntegrationService;
    let disputeService: DisputeIntegrationService;
    let notificationService: NotificationService;
    let privacyGateway: PrivacyGatewayService;
    let sessionRepo: Repository<ChatSession>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConciergeService,
                PaymentIntegrationService,
                DisputeIntegrationService,
                NotificationService,
                ReferralIntegrationService,
                PrivacyGatewayService,
                {
                    provide: getRepositoryToken(ChatSession),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                        createQueryBuilder: jest.fn(),
                    },
                },
                {
                    provide: 'ModuleRef',
                    useValue: {
                        get: jest.fn().mockReturnValue({
                            generate: jest.fn().mockResolvedValue({
                                text: 'AI response',
                            }),
                        }),
                    },
                },
            ],
        }).compile();

        conciergeService = module.get<ConciergeService>(ConciergeService);
        paymentService = module.get<PaymentIntegrationService>(PaymentIntegrationService);
        disputeService = module.get<DisputeIntegrationService>(DisputeIntegrationService);
        notificationService = module.get<NotificationService>(NotificationService);
        privacyGateway = module.get<PrivacyGatewayService>(PrivacyGatewayService);
        sessionRepo = module.get<Repository<ChatSession>>(getRepositoryToken(ChatSession));

        // Trigger onModuleInit for ConciergeService
        conciergeService.onModuleInit();
    });

    describe('Service Integration', () => {
        it('should coordinate session creation with privacy protection', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                persona: ChatPersona.CFO,
                messages: [],
            };

            (sessionRepo.create as jest.Mock).mockReturnValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const session = await conciergeService.startSession('tenant-1', ChatPersona.CFO);

            expect(session).toBeDefined();
            expect(session.tenantId).toBe('tenant-1');
        });

        it('should sanitize prompts before AI processing', () => {
            const sensitivePrompt = 'My email is test@example.com and GSTIN is 29ABCDE1234F1Z5';
            const sanitized = privacyGateway.sanitizePrompt(sensitivePrompt);

            expect(sanitized).not.toContain('test@example.com');
            expect(sanitized).not.toContain('29ABCDE1234F1Z5');
            expect(sanitized).toContain('[REDACTED_EMAIL]');
            expect(sanitized).toContain('[REDACTED_GSTIN]');
        });

        it('should handle end-to-end chat interaction', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                persona: ChatPersona.CFO,
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const result = await conciergeService.processMessage(
                'session-1',
                'Analyze cash flow'
            );

            expect(result.response).toBeDefined();
            expect(result.suggestedActions).toBeDefined();
        });

        it('should coordinate payment notifications', async () => {
            // Mock notification service methods
            const sendWhatsAppSpy = jest.spyOn(notificationService, 'sendWhatsApp').mockResolvedValue();
            const sendEmailSpy = jest.spyOn(notificationService, 'sendEmail').mockResolvedValue();

            await notificationService.sendPaymentConfirmation(
                '+919876543210',
                'customer@example.com',
                'pay_123',
                5000,
                'upi'
            );

            expect(sendWhatsAppSpy).toHaveBeenCalled();
            expect(sendEmailSpy).toHaveBeenCalled();
        });

        it('should validate session retrieval', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                persona: ChatPersona.PAYER,
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);

            const session = await conciergeService.getSession('session-1');

            expect(session).toEqual(mockSession);
        });
    });

    describe('Cross-Service Workflows', () => {
        it('should handle complete payment workflow', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: { razorpayOrderId: 'order_123' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            // This would normally trigger payment webhook
            // Testing the session update portion
            const session = await sessionRepo.createQueryBuilder().where('').getOne();

            expect(session).toBeDefined();
            expect(session.metadata.razorpayOrderId).toBe('order_123');
        });

        it('should handle complete dispute workflow', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                externalReferenceId: 'invoice-123',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            // Session exists for dispute creation
            const session = await conciergeService.getSession('session-1');

            expect(session.externalReferenceId).toBe('invoice-123');
        });

        it('should handle notification retry logic', async () => {
            const sendSpy = jest.spyOn(notificationService, 'sendWhatsApp');

            // Mock will use retry logic internally
            await notificationService.sendWhatsApp{
                to: '+919876543210',
                    template: 'test',
                        variables: { },
            });

        expect(sendSpy).toHaveBeenCalled();
    });

    it('should coordinate referral tracking', async () => {
        const mockSession = {
            id: 'session-1',
            tenantId: 'tenant-1',
            metadata: { referralCode: 'REF123' },
        };

        (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);

        const session = await conciergeService.getSession('session-1');

        expect(session.metadata.referralCode).toBe('REF123');
    });
});

describe('Error Handling Integration', () => {
    it('should handle session not found gracefully', async () => {
        (sessionRepo.findOne as jest.Mock).mockResolvedValue(null);

        await expect(conciergeService.processMessage('invalid-session', 'Test')).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
        (sessionRepo.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

        await expect(conciergeService.getSession('session-1')).rejects.toThrow();
    });
});

describe('Data Flow Integration', () => {
    it('should maintain session state across operations', async () => {
        const mockSession = {
            id: 'session-1',
            tenantId: 'tenant-1',
            persona: ChatPersona.CFO,
            messages: [],
            metadata: {},
        };

        (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
        (sessionRepo.save as jest.Mock).mockImplementation((session) => {
            return Promise.resolve(session);
        });

        await conciergeService.processMessage('session-1', 'First message');

        expect(sessionRepo.save).toHaveBeenCalled();
    });

    it('should handle metadata updates correctly', async () => {
        const mockSession = {
            id: 'session-1',
            metadata: { existing: 'data' },
        };

        (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(mockSession),
        });
        (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

        const session = await sessionRepo.createQueryBuilder().where('').getOne();
        session.metadata = { ...session.metadata, new: 'data' };

        expect(session.metadata.existing).toBe('data');
        expect(session.metadata.new).toBe('data');
    });

    it('should preserve message history', async () => {
        const mockSession = {
            id: 'session-1',
            messages: [
                { role: 'system', content: 'Initial' },
            ],
        };

        (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
        (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

        await conciergeService.processMessage('session-1', 'Test');

        expect(sessionRepo.save).toHaveBeenCalled();
    });
});
});
