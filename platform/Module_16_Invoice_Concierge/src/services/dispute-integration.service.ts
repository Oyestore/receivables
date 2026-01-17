import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import axios from 'axios';

interface DisputeTicket {
    id: string;
    invoiceId: string;
    customerId: string;
    type: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    createdAt: Date;
    resolvedAt?: Date;
}

interface DisputeResolution {
    outcome: string;
    [key: string]: unknown;
}

@Injectable()
export class DisputeIntegrationService {
    private readonly logger = new Logger(DisputeIntegrationService.name);

    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
    ) { }

    /**
     * Create dispute ticket in Module 08
     * Called from DisputeForm submission
     */
    async createDisputeTicket(
        sessionId: string,
        disputeData: {
            type: string;
            description: string;
            contactEmail?: string;
            evidence?: string[];
        },
    ): Promise<DisputeTicket> {
        this.logger.log(`Creating dispute ticket for session: ${sessionId}`);

        try {
            const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
            if (!session) {
                throw new Error('Session not found');
            }

            // 1. Create ticket in Module 08 (Dispute Resolution)
            const response = await axios.post('/api/disputes/tickets', {
                invoiceId: session.externalReferenceId,
                customerId: session.tenantId, // or customer ID from session
                type: disputeData.type,
                description: disputeData.description,
                contactEmail: disputeData.contactEmail,
                evidence: disputeData.evidence || [],
                source: 'concierge_portal',
                priority: this.calculatePriority(disputeData.type),
            });

            const ticket: DisputeTicket = response.data;

            // 2. Update session with dispute reference
            session.metadata = {
                ...session.metadata,
                disputeTicketId: ticket.id,
                disputeStatus: ticket.status,
                disputeCreatedAt: ticket.createdAt,
            };
            await this.sessionRepo.save(session);

            // 3. Trigger orchestration event (Module 10)
            await this.triggerOrchestrationEvent('dispute_created', {
                sessionId,
                ticketId: ticket.id,
                type: disputeData.type,
                priority: ticket.priority,
            });

            // 4. Send notifications (Module 11)
            await this.sendDisputeNotifications(ticket, session);

            this.logger.log(`Dispute ticket created: ${ticket.id}`);
            return ticket;
        } catch (error) {
            this.logger.error(`Failed to create dispute ticket: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get dispute status from Module 08
     */
    async getDisputeStatus(ticketId: string): Promise<DisputeTicket> {
        try {
            const response = await axios.get(`/api/disputes/tickets/${ticketId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to get dispute status: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle dispute resolution webhook from Module 08
     */
    async handleDisputeResolution(ticketId: string, resolution: DisputeResolution): Promise<void> {
        this.logger.log(`Processing dispute resolution: ${ticketId}`);

        try {
            // PERFORMANCE: Optimized database query instead of full table scan
            const session = await this.sessionRepo
                .createQueryBuilder('session')
                .where("session.metadata->>'disputeTicketId' = :ticketId", { ticketId })
                .getOne();

            if (session) {
                // Update session with resolution
                session.metadata = {
                    ...(session.metadata || {}), // Safe spread
                    disputeStatus: 'resolved',
                    disputeResolvedAt: new Date(),
                    disputeResolution: resolution.outcome,
                };
                await this.sessionRepo.save(session);

                // Trigger orchestration event
                await this.triggerOrchestrationEvent('dispute_resolved', {
                    sessionId: session.id,
                    ticketId,
                    outcome: resolution.outcome,
                });

                // Send resolution notification
                await this.sendResolutionNotification(session, resolution);
            }
        } catch (error) {
            this.logger.error(`Failed to handle dispute resolution: ${error.message}`);
            throw error;
        }
    }

    /**
     * Calculate dispute priority based on type
     */
    private calculatePriority(type: string): 'low' | 'medium' | 'high' {
        const highPriorityTypes = ['unauthorized', 'fraud', 'duplicate'];
        const mediumPriorityTypes = ['incorrect_amount', 'wrong_items'];

        if (highPriorityTypes.includes(type)) return 'high';
        if (mediumPriorityTypes.includes(type)) return 'medium';
        return 'low';
    }

    /**
     * Trigger Module 10 (Orchestration) event
     */
    private async triggerOrchestrationEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
        try {
            await axios.post('/api/orchestration/events', {
                type: eventType,
                source: 'module_16_concierge',
                data,
                timestamp: new Date().toISOString(),
            });

            this.logger.log(`Orchestration event triggered: ${eventType}`);
        } catch (error) {
            this.logger.error(`Failed to trigger orchestration event: ${error.message}`);
        }
    }

    /**
     * Send dispute creation notifications via Module 11
     */
    private async sendDisputeNotifications(ticket: DisputeTicket, session: ChatSession): Promise<void> {
        try {
            // Email to customer
            await axios.post('/api/notifications/email', {
                to: session.metadata?.customerEmail,
                subject: `Dispute Ticket Created - ${ticket.id}`,
                template: 'dispute_created',
                variables: {
                    ticketId: ticket.id,
                    type: ticket.type,
                    expectedResolution: '24 hours',
                },
            });

            // WhatsApp to customer
            await axios.post('/api/notifications/whatsapp', {
                to: session.metadata?.customerPhone,
                template: 'dispute_ticket_created',
                variables: {
                    ticketId: ticket.id,
                },
            });

            // Email to tenant (vendor)
            await axios.post('/api/notifications/email', {
                to: session.metadata?.tenantEmail,
                subject: `New Dispute - Ticket ${ticket.id}`,
                template: 'dispute_vendor_alert',
                variables: {
                    ticketId: ticket.id,
                    invoiceId: ticket.invoiceId,
                    priority: ticket.priority,
                },
            });

            this.logger.log(`Dispute notifications sent for ticket: ${ticket.id}`);
        } catch (error) {
            this.logger.error(`Failed to send dispute notifications: ${error.message}`);
        }
    }

    /**
     * Send resolution notification
     */
    private async sendResolutionNotification(session: ChatSession, resolution: DisputeResolution): Promise<void> {
        try {
            await axios.post('/api/notifications/whatsapp', {
                to: session.metadata?.customerPhone,
                template: 'dispute_resolved',
                variables: {
                    ticketId: session.metadata?.disputeTicketId,
                    outcome: resolution.outcome,
                },
            });

            this.logger.log(`Resolution notification sent for session: ${session.id}`);
        } catch (error) {
            this.logger.error(`Failed to send resolution notification: ${error.message}`);
        }
    }
}
