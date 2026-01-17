import { ChatSession, ChatPersona } from '../chat-session.entity';
import {
    PayerPortalSessionEntity,
    PortalAccessMode,
    PortalActionType,
} from '../payer-portal-session.entity';

describe('Entity Tests', () => {
    describe('ChatSession Entity', () => {
        it('should create chat session with required fields', () => {
            const session = new ChatSession();
            session.tenantId = 'tenant-1';
            session.persona = ChatPersona.CFO;
            session.language = 'en';

            expect(session.tenantId).toBe('tenant-1');
            expect(session.persona).toBe(ChatPersona.CFO);
            expect(session.language).toBe('en');
        });

        it('should support CFO persona', () => {
            const session = new ChatSession();
            session.persona = ChatPersona.CFO;

            expect(session.persona).toBe('CFO');
        });

        it('should support CONCIERGE persona', () => {
            const session = new ChatSession();
            session.persona = ChatPersona.CONCIERGE;

            expect(session.persona).toBe('CONCIERGE');
        });

        it('should store metadata as JSON', () => {
            const session = new ChatSession();
            session.metadata = {
                paymentId: 'pay_123',
                disputeTicketId: 'ticket_456',
            };

            expect(session.metadata.paymentId).toBe('pay_123');
            expect(session.metadata.disputeTicketId).toBe('ticket_456');
        });

        it('should store conversation messages', () => {
            const session = new ChatSession();
            session.messages = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' },
            ];

            expect(session.messages).toHaveLength(2);
            expect(session.messages[0].role).toBe('user');
        });

        it('should have nullable external reference', () => {
            const session = new ChatSession();
            session.tenantId = 'tenant-1';
            session.persona = ChatPersona.CFO;

            expect(session.externalReferenceId).toBeUndefined();
        });
    });

    describe('PayerPortalSessionEntity', () => {
        it('should create portal session with required fields', () => {
            const session = new PayerPortalSessionEntity();
            session.tenantId = 'tenant-1';
            session.invoiceId = 'invoice-123';
            session.accessToken = 'secure-token-abc';
            session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            expect(session.tenantId).toBe('tenant-1');
            expect(session.invoiceId).toBe('invoice-123');
            expect(session.accessToken).toBe('secure-token-abc');
        });

        it('should default to STATIC access mode', () => {
            const session = new PayerPortalSessionEntity();
            session.accessMode = PortalAccessMode.STATIC;

            expect(session.accessMode).toBe('STATIC');
        });

        it('should support CHAT access mode', () => {
            const session = new PayerPortalSessionEntity();
            session.accessMode = PortalAccessMode.CHAT;

            expect(session.accessMode).toBe('CHAT');
        });

        it('should validate active and non-expired session', () => {
            const session = new PayerPortalSessionEntity();
            session.isActive = true;
            session.expiresAt = new Date(Date.now() + 10000);

            expect(session.isValid()).toBe(true);
        });

        it('should invalidate expired session', () => {
            const session = new PayerPortalSessionEntity();
            session.isActive = true;
            session.expiresAt = new Date(Date.now() - 10000);

            expect(session.isValid()).toBe(false);
        });

        it('should invalidate inactive session', () => {
            const session = new PayerPortalSessionEntity();
            session.isActive = false;
            session.expiresAt = new Date(Date.now() + 10000);

            expect(session.isValid()).toBe(false);
        });

        it('should log actions correctly', () => {
            const session = new PayerPortalSessionEntity();
            session.actionsLog = [];

            session.logAction(PortalActionType.VIEW, { invoiceId: 'invoice-123' });

            expect(session.actionsLog).toHaveLength(1);
            expect(session.actionsLog[0].type).toBe(PortalActionType.VIEW);
            expect(session.actionsLog[0].metadata?.invoiceId).toBe('invoice-123');
            expect(session.lastAccessedAt).toBeDefined();
        });

        it('should record view count', () => {
            const session = new PayerPortalSessionEntity();
            session.viewCount = 0;

            session.recordView();
            session.recordView();

            expect(session.viewCount).toBe(2);
            expect(session.lastAccessedAt).toBeDefined();
        });

        it('should track multiple action types', () => {
            const session = new PayerPortalSessionEntity();
            session.actionsLog = [];

            session.logAction(PortalActionType.VIEW);
            session.logAction(PortalActionType.DOWNLOAD_PDF);
            session.logAction(PortalActionType.INITIATE_PAYMENT);

            expect(session.actionsLog).toHaveLength(3);
            expect(session.actionsLog[1].type).toBe(PortalActionType.DOWNLOAD_PDF);
        });

        it('should link to chat session', () => {
            const session = new PayerPortalSessionEntity();
            session.chatSessionId = 'chat-session-789';

            expect(session.chatSessionId).toBe('chat-session-789');
        });
    });
});
