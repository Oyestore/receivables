import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AccountingConfig } from '../entities/accounting-config.entity';

/**
 * Connection instance tracking
 */
interface ConnectionInstance {
    id: string;
    system: string;
    tenantId: string;
    connection: any;
    createdAt: Date;
    lastUsedAt: Date;
    isHealthy: boolean;
    useCount: number;
}

/**
 * Connection pool statistics
 */
export interface PoolStatistics {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    unhealthyConnections: number;
    poolUtilization: number; // Percentage
    averageConnectionAge: number; // Milliseconds
}

/**
 * Connection pool configuration
 */
export interface PoolConfig {
    maxPoolSize: number;
    minPoolSize: number;
    maxIdleTime: number; // Milliseconds
    healthCheckInterval: number; // Milliseconds
    connectionTimeout: number; // Milliseconds
    retryAttempts: number;
}

/**
 * Connection pool service for managing accounting system connections
 * 
 * Implements connection pooling to:
 * - Reuse expensive connections
 * - Limit concurrent connections
 * - Perform health checks
 * - Auto-reconnect on failures
 * 
 * @example
 * ```typescript
 * const connection = await connectionPool.acquire(config);
 * try {
 *   await connection.query('SELECT ...');
 * } finally {
 *   await connectionPool.release(connection.id);
 * }
 * ```
 */
@Injectable()
export class ConnectionPoolService implements OnModuleDestroy {
    private readonly logger = new Logger(ConnectionPoolService.name);
    private readonly pool: Map<string, ConnectionInstance> = new Map();
    private readonly waitQueue: Array<{
        config: AccountingConfig;
        resolve: (connection: ConnectionInstance) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }> = [];

    private healthCheckInterval: NodeJS.Timeout;
    private cleanupInterval: NodeJS.Timeout;

    private readonly config: PoolConfig = {
        maxPoolSize: parseInt(process.env.ACCOUNTING_POOL_MAX_SIZE || '10', 10),
        minPoolSize: parseInt(process.env.ACCOUNTING_POOL_MIN_SIZE || '2', 10),
        maxIdleTime: parseInt(process.env.ACCOUNTING_POOL_MAX_IDLE || '300000', 10), // 5 minutes
        healthCheckInterval: parseInt(process.env.ACCOUNTING_POOL_HEALTH_CHECK || '60000', 10), // 1 minute
        connectionTimeout: parseInt(process.env.ACCOUNTING_POOL_TIMEOUT || '30000', 10), // 30 seconds
        retryAttempts: parseInt(process.env.ACCOUNTING_POOL_RETRY || '3', 10),
    };

    constructor() {
        this.startHealthChecks();
        this.startCleanup();
        this.logger.log(`Connection pool initialized with max size: ${this.config.maxPoolSize}`);
    }

    /**
     * Acquire a connection from the pool
     * 
     * @param config - Accounting configuration
     * @returns Connection instance
     * @throws Error if unable to acquire connection within timeout
     */
    async acquire(config: AccountingConfig): Promise<ConnectionInstance> {
        const connectionKey = this.getConnectionKey(config);

        // Try to find existing healthy connection
        const existing = this.findHealthyConnection(connectionKey);
        if (existing) {
            existing.lastUsedAt = new Date();
            existing.useCount++;
            this.logger.debug(`Reusing connection ${existing.id} for ${connectionKey}`);
            return existing;
        }

        // Check if pool is at capacity
        if (this.pool.size >= this.config.maxPoolSize) {
            this.logger.warn(`Pool at capacity (${this.pool.size}/${this.config.maxPoolSize}), queuing request`);
            return this.waitForAvailableConnection(config);
        }

        // Create new connection
        return this.createConnection(config);
    }

    /**
     * Release a connection back to the pool
     * 
     * @param connectionId - Connection instance ID
     */
    async release(connectionId: string): Promise<void> {
        const connection = this.pool.get(connectionId);

        if (!connection) {
            this.logger.warn(`Attempted to release unknown connection: ${connectionId}`);
            return;
        }

        connection.lastUsedAt = new Date();
        this.logger.debug(`Released connection ${connectionId}`);

        // Process wait queue if any
        this.processWaitQueue();
    }

    /**
     * Remove a connection from the pool
     * 
     * @param connectionId - Connection instance ID
     */
    async remove(connectionId: string): Promise<void> {
        const connection = this.pool.get(connectionId);

        if (!connection) {
            return;
        }

        try {
            // Clean up connection (system-specific)
            if (connection.connection && typeof connection.connection.close === 'function') {
                await connection.connection.close();
            }
        } catch (error) {
            this.logger.error(`Error closing connection ${connectionId}:`, error.message);
        }

        this.pool.delete(connectionId);
        this.logger.debug(`Removed connection ${connectionId} from pool`);

        // Process wait queue
        this.processWaitQueue();
    }

    /**
     * Get pool statistics
     * 
     * @returns Current pool statistics
     */
    getStatistics(): PoolStatistics {
        const connections = Array.from(this.pool.values());
        const now = Date.now();

        const activeConnections = connections.filter(c =>
            now - c.lastUsedAt.getTime() < this.config.maxIdleTime
        ).length;

        const unhealthyConnections = connections.filter(c => !c.isHealthy).length;

        const totalAge = connections.reduce((sum, c) =>
            sum + (now - c.createdAt.getTime()), 0
        );

        return {
            totalConnections: this.pool.size,
            activeConnections,
            idleConnections: this.pool.size - activeConnections,
            unhealthyConnections,
            poolUtilization: (this.pool.size / this.config.maxPoolSize) * 100,
            averageConnectionAge: connections.length > 0 ? totalAge / connections.length : 0,
        };
    }

    /**
     * Clear all connections (for testing or emergency)
     */
    async clearAll(): Promise<void> {
        this.logger.warn('Clearing all connections from pool');

        const connectionIds = Array.from(this.pool.keys());
        await Promise.all(connectionIds.map(id => this.remove(id)));

        // Clear wait queue
        this.waitQueue.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error('Pool cleared'));
        });
        this.waitQueue.length = 0;
    }

    /**
     * Cleanup on module destroy
     */
    async onModuleDestroy(): Promise<void> {
        this.logger.log('Shutting down connection pool');

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        await this.clearAll();
    }

    // ==========================================
    // PRIVATE METHODS
    // ==========================================

    /**
     * Generate unique key for connection
     */
    private getConnectionKey(config: AccountingConfig): string {
        return `${config.tenant_id}:${config.system}`;
    }

    /**
     * Find existing healthy connection
     */
    private findHealthyConnection(key: string): ConnectionInstance | undefined {
        return Array.from(this.pool.values()).find(
            conn => this.getConnectionKey({ tenant_id: conn.tenantId, system: conn.system } as any) === key &&
                conn.isHealthy
        );
    }

    /**
     * Create new connection
     */
    private async createConnection(config: AccountingConfig): Promise<ConnectionInstance> {
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const connectionKey = this.getConnectionKey(config);

        this.logger.log(`Creating new connection ${connectionId} for ${connectionKey}`);

        try {
            // Create connection (system-specific logic would go here)
            // For now, this is a placeholder that would be implemented by the specific connector
            const connection = await this.establishConnection(config);

            const instance: ConnectionInstance = {
                id: connectionId,
                system: config.system,
                tenantId: config.tenant_id,
                connection,
                createdAt: new Date(),
                lastUsedAt: new Date(),
                isHealthy: true,
                useCount: 1,
            };

            this.pool.set(connectionId, instance);
            this.logger.log(`Connection ${connectionId} created successfully`);

            return instance;
        } catch (error) {
            this.logger.error(`Failed to create connection ${connectionId}:`, error.stack);
            throw new Error(`Connection creation failed: ${error.message}`);
        }
    }

    /**
     * Establish connection to accounting system
     * This is a placeholder - actual implementation would be system-specific
     */
    private async establishConnection(config: AccountingConfig): Promise<any> {
        // In production, this would call the appropriate connector
        // For now, return a mock connection object
        return {
            config,
            connected: true,
            close: async () => { /* cleanup */ },
        };
    }

    /**
     * Wait for available connection
     */
    private async waitForAvailableConnection(config: AccountingConfig): Promise<ConnectionInstance> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.waitQueue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                    this.waitQueue.splice(index, 1);
                }
                reject(new Error(`Connection acquisition timeout after ${this.config.connectionTimeout}ms`));
            }, this.config.connectionTimeout);

            this.waitQueue.push({ config, resolve, reject, timeout });
        });
    }

    /**
     * Process wait queue
     */
    private processWaitQueue(): void {
        if (this.waitQueue.length === 0) {
            return;
        }

        if (this.pool.size >= this.config.maxPoolSize) {
            return;
        }

        const item = this.waitQueue.shift();
        if (!item) {
            return;
        }

        clearTimeout(item.timeout);

        this.createConnection(item.config)
            .then(connection => item.resolve(connection))
            .catch(error => item.reject(error));
    }

    /**
     * Start health check interval
     */
    private startHealthChecks(): void {
        this.healthCheckInterval = setInterval(async () => {
            const connections = Array.from(this.pool.values());

            for (const connection of connections) {
                try {
                    const isHealthy = await this.checkConnectionHealth(connection);
                    connection.isHealthy = isHealthy;

                    if (!isHealthy) {
                        this.logger.warn(`Connection ${connection.id} is unhealthy, will attempt reconnection`);
                    }
                } catch (error) {
                    this.logger.error(`Health check failed for ${connection.id}:`, error.message);
                    connection.isHealthy = false;
                }
            }
        }, this.config.healthCheckInterval);
    }

    /**
     * Check connection health
     */
    private async checkConnectionHealth(connection: ConnectionInstance): Promise<boolean> {
        try {
            // Placeholder for actual health check
            // Would ping the accounting system or check connection state
            return connection.connection && connection.connection.connected;
        } catch (error) {
            return false;
        }
    }

    /**
     * Start cleanup interval
     */
    private startCleanup(): void {
        this.cleanupInterval = setInterval(async () => {
            const now = Date.now();
            const connections = Array.from(this.pool.entries());

            for (const [id, connection] of connections) {
                const idleTime = now - connection.lastUsedAt.getTime();

                // Remove idle connections
                if (idleTime > this.config.maxIdleTime && this.pool.size > this.config.minPoolSize) {
                    this.logger.debug(`Removing idle connection ${id} (idle for ${idleTime}ms)`);
                    await this.remove(id);
                }

                // Remove unhealthy connections
                if (!connection.isHealthy) {
                    this.logger.debug(`Removing unhealthy connection ${id}`);
                    await this.remove(id);
                }
            }
        }, this.config.maxIdleTime / 2); // Check at half the idle time
    }
}
