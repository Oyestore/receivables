import { Test, TestingModule } from '@nestjs/testing';
import { ConciergeService } from '../concierge.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatSession, ChatPersona } from '../../entities/chat-session.entity';
import { PrivacyGatewayService } from '../privacy-gateway.service';
import { ModuleRef } from '@nestjs/core';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ConciergeService', () => {
    let service: ConciergeService;
    let sessionRepo: Partial<Repository<ChatSession>>;
    let privacyGateway: Partial<PrivacyGatewayService>;
    let moduleRef: Partial<ModuleRef>;
    let deepSeekService: any;

    beforeEach(async () => {
        // Mock DeepSeek service
        deepSeekService = {
            generate: jest.fn().mockResolvedValue({ text: 'AI generated response' }),
        };

        // Mock repositories and services
        sessionRepo = {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
        };

        privacyGateway = {
            sanitizePrompt: jest.fn((prompt) => prompt),
        };

        moduleRef = {
            get: jest.fn((service, options) => {
                if (service.name === 'DeepSeekService') return deepSeekService;
                if (service.name === 'DynamicTermsManagementService') return {};
                if (service.name === 'TenantService') return {};
                if (service.name === 'InvoiceFinancingService') return {};
                return null;
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConciergeService,
                {
                    provide: getRepositoryToken(ChatSession),
                    useValue: sessionRepo,
                },
                { provide: PrivacyGatewayService, useValue: privacyGateway },
                { provide: ModuleRef, useValue: moduleRef },
            ],
        }).compile();

        service = module.get<ConciergeService>(ConciergeService);

        // Trigger onModuleInit
        service.onModuleInit();
    });

    describe('startSession', () => {
        it('should create new chat session for CFO persona', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                persona: ChatPersona.CFO,
                startedAt: new Date(),
                messages: [{ role: 'system', content: 'You are acting as CFO_AGENT' }],
            };

            (sessionRepo.create as jest.Mock).mockReturnValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const result = await service.startSession('tenant-1', ChatPersona.CFO);

            expect(result).toBeDefined();
            expect(result.tenantId).toBe('tenant-1');
            expect(result.persona).toBe(ChatPersona.CFO);
            expect(sessionRepo.create).toHaveBeenCalled();
            expect(sessionRepo.save).toHaveBeenCalled();
        });

        it('should create session for PAYER persona', async () => {
            const mockSession = {
                id: 'session-2',
                tenantId: 'tenant-1',
                persona: ChatPersona.PAYER,
                externalReferenceId: 'invoice-1',
                startedAt: new Date(),
                messages: [{ role: 'system', content: 'You are acting as PAYER' }],
            };

            (sessionRepo.create as jest.Mock).mockReturnValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const result = await service.startSession(
                'tenant-1',
                ChatPersona.PAYER,
                'invoice-1'
            );

            expect(result.persona).toBe(ChatPersona.PAYER);
            expect(result.externalReferenceId).toBe('invoice-1');
        });

        it('should include system message in initial messages', async () => {
            const mockSession = {
                id: 'session-3',
                messages: [],
            };

            (sessionRepo.create as jest.Mock).mockImplementation((data) => ({
                ...mockSession,
                ...data,
            }));
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.startSession('tenant-1', ChatPersona.CFO);

            const createCall = (sessionRepo.create as jest.Mock).mock.calls[0][0];
            expect(createCall.messages).toHaveLength(1);
            expect(createCall.messages[0].role).toBe('system');
        });
    });

    describe('processMessage', () => {
        it('should throw error if session not found', async () => {
            (sessionRepo.findOne as jest.Mock).mockResolvedValue(null);

            await expect(
                service.processMessage('invalid-session', 'Hello')
            ).rejects.toThrow(HttpException);

            await expect(
                service.processMessage('invalid-session', 'Hello')
            ).rejects.toThrow('Session not found');
        });

        it('should sanitize prompt via privacy gateway', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.CFO,
                tenantId: 'tenant-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.processMessage('session-1', 'My email is test@example.com');

            expect(privacyGateway.sanitizePrompt).toHaveBeenCalledWith(
                'My email is test@example.com'
            );
        });

        it('should use internal reasoning for CFO persona', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.CFO,
                tenantId: 'tenant-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const result = await service.processMessage(
                'session-1',
                'Analyze cash flow'
            );

            expect(deepSeekService.generate).toHaveBeenCalled();
            expect(result.response).toBe('AI generated response');
        });

        it('should use external reasoning for PAYER persona', async () => {
            const mockSession = {
                id: 'session-2',
                persona: ChatPersona.PAYER,
                tenantId: 'tenant-1',
                externalReferenceId: 'invoice-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const result = await service.processMessage('session-2', 'Payment question');

            expect(deepSeekService.generate).toHaveBeenCalled();
            expect(result.response).toBeDefined();
        });

        it('should update session message history', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.CFO,
                tenantId: 'tenant-1',
                messages: [{ role: 'system', content: 'Initial' }],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockImplementation((session) => {
                expect(session.messages).toHaveLength(3); // system + user + assistant
                return Promise.resolve(session);
            });

            await service.processMessage('session-1', 'Test message');

            expect(sessionRepo.save).toHaveBeenCalled();
        });

        it('should return suggested actions based on persona', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.CFO,
                tenantId: 'tenant-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const result = await service.processMessage('session-1', 'Test');

            expect(result.suggestedActions).toBeDefined();
            expect(Array.isArray(result.suggestedActions)).toBe(true);
        });

        it('should support multiple languages', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.PAYER,
                tenantId: 'tenant-1',
                externalReferenceId: 'invoice-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.processMessage('session-1', 'Bonjour', 'fr');

            expect(deepSeekService.generate).toHaveBeenCalled();
        });

        it('should handle AI service failures gracefully', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.CFO,
                tenantId: 'tenant-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);
            (deepSeekService.generate as jest.Mock).mockRejectedValue(
                new Error('AI service unavailable')
            );

            const result = await service.processMessage('session-1', 'Test');

            expect(result.response).toContain('unable to process');
        });
    });

    describe('getSession', () => {
        it('should retrieve existing session', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);

            const result = await service.getSession('session-1');

            expect(result).toEqual(mockSession);
            expect(sessionRepo.findOne).toHaveBeenCalledWith({
                where: { id: 'session-1' },
            });
        });

        it('should throw error if session not found', async () => {
            (sessionRepo.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.getSession('invalid-session')).rejects.toThrow(
                HttpException
            );
        });

        it('should throw 404 status for missing session', async () => {
            (sessionRepo.findOne as jest.Mock).mockResolvedValue(null);

            try {
                await service.getSession('invalid-session');
                fail('Should have thrown error');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpException);
                expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
            }
        });
    });

    describe('getSuggestedActions', () => {
        it('should return CFO actions for CFO persona', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.CFO,
                tenantId: 'tenant-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const result = await service.processMessage('session-1', 'Test');

            expect(result.suggestedActions).toContain('Analyze Margins');
            expect(result.suggestedActions).toContain('Check Compliance');
        });

        it('should return payer actions for PAYER persona', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.PAYER,
                tenantId: 'tenant-1',
                externalReferenceId: 'invoice-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const result = await service.processMessage('session-1', 'Test');

            expect(result.suggestedActions).toContain('Pay Now');
            expect(result.suggestedActions).toContain('Download PDF');
        });
    });

    describe('internal reasoning', () => {
        it('should use low temperature for CFO queries', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.CFO,
                tenantId: 'tenant-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.processMessage('session-1', 'Financial analysis');

            const generateCall = (deepSeekService.generate as jest.Mock).mock.calls[0][0];
            expect(generateCall.temperature).toBeLessThan(0.5);
        });

        it('should include system prompt for CFO persona', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.CFO,
                tenantId: 'tenant-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.processMessage('session-1', 'Cash flow question');

            const generateCall = (deepSeekService.generate as jest.Mock).mock.calls[0][0];
            expect(generateCall.systemPrompt).toContain('Virtual CFO');
        });
    });

    describe('external reasoning', () => {
        it('should handle draft approval intent', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.PAYER,
                tenantId: 'tenant-1',
                externalReferenceId: 'DRAFT-001',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const result = await service.processMessage(
                'session-1',
                'This looks good, approve it'
            );

            // Should detect draft approval intent
            expect(result.response).toBeDefined();
        });

        it('should use higher temperature for payer queries', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.PAYER,
                tenantId: 'tenant-1',
                externalReferenceId: 'invoice-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.processMessage('session-1', 'Question about invoice');

            const generateCall = (deepSeekService.generate as jest.Mock).mock.calls[0][0];
            expect(generateCall.temperature).toBeGreaterThanOrEqual(0.5);
        });

        it('should include invoice context when available', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.PAYER,
                tenantId: 'tenant-1',
                externalReferenceId: 'invoice-123',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.processMessage('session-1', 'Tell me about my invoice');

            const generateCall = (deepSeekService.generate as jest.Mock).mock.calls[0][0];
            expect(generateCall.prompt).toContain('invoice-123');
        });
    });

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            (sessionRepo.findOne as jest.Mock).mockRejectedValue(
                new Error('Database error')
            );

            await expect(service.processMessage('session-1', 'Test')).rejects.toThrow();
        });

        it('should preserve session on AI failure', async () => {
            const mockSession = {
                id: 'session-1',
                persona: ChatPersona.CFO,
                tenantId: 'tenant-1',
                messages: [],
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);
            (deepSeekService.generate as jest.Mock).mockRejectedValue(
                new Error('AI error')
            );

            const result = await service.processMessage('session-1', 'Test');

            expect(sessionRepo.save).toHaveBeenCalled();
            expect(result.response).toBeDefined();
        });
    });
});
