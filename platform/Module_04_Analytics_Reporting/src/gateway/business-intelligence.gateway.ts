import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InsightGenerationService } from '../services/insight-generation.service';

/**
 * Real-Time WebSocket Gateway
 * 
 * Provides real-time updates for:
 * - Business metrics
 * - New insights
 * - Dashboard data
 * 
 * Clients subscribe to tenant-specific channels
 */
@WebSocketGateway({
    cors: {
        origin: '*', // Configure properly in production
    },
    namespace: '/intelligence',
})
export class BusinessIntelligenceGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(BusinessIntelligenceGateway.name);
    private connectedClients = new Map<string, Set<string>>(); // tenantId -> Set of socketIds

    constructor(
        private readonly insightService: InsightGenerationService,
    ) { }

    /**
     * Handle client connection
     */
    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    /**
     * Handle client disconnection
     */
    handleDisconnect(client: Socket) {
        // Remove from all tenant subscriptions
        for (const [tenantId, clients] of this.connectedClients.entries()) {
            clients.delete(client.id);
            if (clients.size === 0) {
                this.connectedClients.delete(tenantId);
            }
        }

        this.logger.log(`Client disconnected: ${client.id}`);
    }

    /**
     * Subscribe to tenant updates
     */
    @SubscribeMessage('subscribe')
    handleSubscribe(client: Socket, tenantId: string) {
        if (!this.connectedClients.has(tenantId)) {
            this.connectedClients.set(tenantId, new Set());
        }

        this.connectedClients.get(tenantId).add(client.id);
        client.join(`tenant:${tenantId}`);

        this.logger.log(`Client ${client.id} subscribed to tenant ${tenantId}`);

        // Send initial data
        this.sendInitialData(client, tenantId);

        return { success: true, message: 'Subscribed to updates' };
    }

    /**
     * Unsubscribe from tenant updates
     */
    @SubscribeMessage('unsubscribe')
    handleUnsubscribe(client: Socket, tenantId: string) {
        const clients = this.connectedClients.get(tenantId);
        if (clients) {
            clients.delete(client.id);
            if (clients.size === 0) {
                this.connectedClients.delete(tenantId);
            }
        }

        client.leave(`tenant:${tenantId}`);

        this.logger.log(`Client ${client.id} unsubscribed from tenant ${tenantId}`);

        return { success: true };
    }

    /**
     * Send initial dashboard data to new subscriber
     */
    private async sendInitialData(client: Socket, tenantId: string) {
        try {
            const insights = await this.insightService.generateInsights(tenantId);

            client.emit('initial-data', {
                insights,
                metrics: this.getMockMetrics(),
                timestamp: new Date(),
            });
        } catch (error) {
            this.logger.error(`Failed to send initial data: ${error.message}`);
        }
    }

    /**
     * Broadcast new insight to tenant subscribers
     */
    broadcastInsight(tenantId: string, insight: any) {
        this.server.to(`tenant:${tenantId}`).emit('new-insight', {
            insight,
            timestamp: new Date(),
        });
    }

    /**
     * Broadcast metric update
     */
    broadcastMetricUpdate(tenantId: string, metric: string, value: any) {
        this.server.to(`tenant:${tenantId}`).emit('metric-update', {
            metric,
            value,
            timestamp: new Date(),
        });
    }

    /**
     * Broadcast event to tenant
     */
    broadcastEvent(tenantId: string, eventType: string, data: any) {
        this.server.to(`tenant:${tenantId}`).emit('event', {
            type: eventType,
            data,
            timestamp: new Date(),
        });
    }

    /**
     * Get mock metrics (will be replaced with real data)
     */
    private getMockMetrics() {
        return {
            cashFlow: {
                current: 1250000,
                change: 15,
                trend: 'up',
            },
            pendingActions: {
                count: 5,
                urgent: 2,
            },
            goalProgress: {
                percentage: 92,
                target: 5000000,
                current: 4600000,
            },
        };
    }

    /**
     * Get connected client count for tenant
     */
    getConnectedClientCount(tenantId: string): number {
        return this.connectedClients.get(tenantId)?.size || 0;
    }
}
