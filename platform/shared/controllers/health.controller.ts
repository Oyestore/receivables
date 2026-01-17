import { Controller, Get } from '@nestjs/common';
import { checkDatabaseHealth } from '../data-source';

interface HealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version?: string;
    checks: {
        database: {
            connected: boolean;
            responseTime: number;
            error?: string;
        };
        redis?: {
            connected: boolean;
            responseTime?: number;
        };
        application: {
            status: string;
            memoryUsage: NodeJS.MemoryUsage;
        };
    };
}

/**
 * Health Check Controller
 * 
 * Provides health check endpoints for monitoring and load balancers
 */
@Controller('health')
export class HealthController {
    private startTime: number;

    constructor() {
        this.startTime = Date.now();
    }

    /**
     * Simple health check endpoint
     * Returns 200 if application is responsive
     */
    @Get()
    async getHealth(): Promise<{ status: string }> {
        return {
            status: 'ok',
        };
    }

    /**
     * Liveness probe
     * Checks if application is alive (for Kubernetes/container orchestration)
     */
    @Get('live')
    async getLiveness(): Promise<{ status: string }> {
        return {
            status: 'alive',
        };
    }

    /**
     * Readiness probe
     * Checks if application is ready to accept traffic
     * Includes database connectivity check
     */
    @Get('ready')
    async getReadiness(): Promise<{ status: string; ready: boolean }> {
        const dbHealth = await checkDatabaseHealth();

        return {
            status: dbHealth.connected ? 'ready' : 'not_ready',
            ready: dbHealth.connected,
        };
    }

    /**
     * Detailed health check
     * Comprehensive health information for monitoring
     */
    @Get('detailed')
    async getDetailedHealth(): Promise<HealthResponse> {
        // Check database
        const dbHealth = await checkDatabaseHealth();

        // Check Redis (if applicable)
        // const redisHealth = await checkRedisHealth();

        // Overall status determination
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

        if (!dbHealth.connected) {
            status = 'unhealthy';
        } else if (dbHealth.responseTime > 1000) {
            // Slow database response
            status = 'degraded';
        }

        return {
            status,
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000), // seconds
            version: process.env.npm_package_version || '1.0.0',
            checks: {
                database: dbHealth,
                application: {
                    status: 'running',
                    memoryUsage: process.memoryUsage(),
                },
            },
        };
    }

    /**
     * Database health check endpoint
     * Dedicated database connectivity check
     */
    @Get('database')
    async getDatabaseHealth(): Promise<{
        connected: boolean;
        responseTime: number;
        error?: string;
    }> {
        return await checkDatabaseHealth();
    }
}
