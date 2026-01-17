
import { Test, TestingModule } from '@nestjs/testing';
import { ConciergeService } from '../../src/services/concierge.service';
import { PrivacyGatewayService } from '../../src/services/privacy-gateway.service';
import { ChatSession, ChatPersona } from '../../src/entities/chat-session.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Deterministic Harness for Invoice Concierge (Module 16)
 * 
 * Scenarios:
 * 1. CFO Persona Reasoning (Internal)
 * 2. External Payer Reasoning (Disputes, Approval)
 * 3. Privacy Sanitization
 */
describe('Concierge Module Harness', () => {
    let conciergeService: ConciergeService;
    let sessionRepo: Repository<ChatSession>;
    
    const mockSessionRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
    };

    const mockPrivacyGateway = {
        sanitizePrompt: jest.fn(msg => msg), // Pass through by default
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConciergeService,
                { provide: getRepositoryToken(ChatSession), useValue: mockSessionRepo },
                { provide: PrivacyGatewayService, useValue: mockPrivacyGateway },
            ],
        }).compile();

        conciergeService = module.get<ConciergeService>(ConciergeService);
        sessionRepo = module.get<Repository<ChatSession>>(getRepositoryToken(ChatSession));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should process CFO message with internal reasoning', async () => {
        const sessionId = 'sess-1';
        const userMessage = 'Can I offer a discount?';
        
        mockSessionRepo.findOne.mockResolvedValue({
            id: sessionId,
            persona: ChatPersona.CFO,
            messages: [],
        });
        mockSessionRepo.save.mockImplementation(s => Promise.resolve(s));

        const result = await conciergeService.processMessage(sessionId, userMessage);

        expect(result.response).toContain('dynamic discount');
        expect(result.suggestedActions).toContain('Analyze Margins');
    });

    it('should detect dispute intent from external payer', async () => {
        const sessionId = 'sess-2';
        const userMessage = 'There is a mistake in this invoice';
        
        mockSessionRepo.findOne.mockResolvedValue({
            id: sessionId,
            persona: ChatPersona.PAYER,
            externalReferenceId: 'inv-123',
            messages: [],
        });
        mockSessionRepo.save.mockImplementation(s => Promise.resolve(s));

        const result = await conciergeService.processMessage(sessionId, userMessage);

        expect(result.response).toContain('Dispute Ticket');
        expect(result.response).toContain('TKT-');
        expect(result.suggestedActions).toContain('Raise Dispute');
    });

    it('should handle draft approval', async () => {
        const sessionId = 'sess-3';
        const userMessage = 'Looks good, go ahead';
        
        mockSessionRepo.findOne.mockResolvedValue({
            id: sessionId,
            persona: ChatPersona.PAYER,
            externalReferenceId: 'INV-DRAFT-1', // Draft ID
            messages: [],
        });

        const result = await conciergeService.processMessage(sessionId, userMessage);

        expect(result.response).toContain('marked this Draft as **APPROVED**');
    });
});
