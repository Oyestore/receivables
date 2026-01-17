/**
 * Base Module Adapter
 * 
 * Abstract base class for all module adapters
 * Provides common HTTP client functionality and error handling
 */

import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { ModuleName, IModuleAdapter, IHealthCheckResult } from '../types/orchestration.types';

@Injectable()
export abstract class BaseModuleAdapter implements IModuleAdapter {
    protected readonly logger: Logger;
    protected readonly httpClient: AxiosInstance;

    abstract readonly moduleName: ModuleName;
    abstract readonly baseUrl: string;
    abstract readonly version: string;
    abstract readonly capabilities: string[];

    constructor(moduleName: string) {
        this.logger = new Logger(`${moduleName}Adapter`);
    }

    /**
     * Initialize HTTP client with module-specific configuration
     */
    protected initializeHttpClient(baseUrl: string): AxiosInstance {
        const client = axios.create({
            baseURL: baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Module-10-Orchestration-Hub/1.0',
            },
        });

        // Request interceptor for logging
        client.interceptors.request.use(
            (config) => {
                this.logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                this.logger.error('Request error', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor for logging and error handling
        client.interceptors.response.use(
            (response) => {
                this.logger.debug(`Response: ${response.status} ${response.config.url}`);
                return response;
            },
            (error: AxiosError) => {
                this.handleHttpError(error);
                return Promise.reject(error);
            }
        );

        return client;
    }

    /**
     * Handle HTTP errors with detailed logging
     */
    protected handleHttpError(error: AxiosError): void {
        if (error.response) {
            // Server responded with error
            this.logger.error(
                `HTTP ${error.response.status}: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
                {
                    status: error.response.status,
                    data: error.response.data,
                }
            );
        } else if (error.request) {
            // Request made but no response
            this.logger.error('No response received from module', {
                url: error.config?.url,
                method: error.config?.method,
            });
        } else {
            // Error in request setup
            this.logger.error('Request setup error', error.message);
        }
    }

    /**
     * Default health check implementation
     */
    async healthCheck(): Promise<IHealthCheckResult> {
        const startTime = Date.now();

        try {
            // Try to ping health endpoint
            await this.httpClient.get('/health', { timeout: 5000 });

            return {
                module: this.moduleName,
                status: 'healthy',
                response_time_ms: Date.now() - startTime,
                last_check: new Date(),
            };
        } catch (error) {
            return {
                module: this.moduleName,
                status: 'unhealthy',
                response_time_ms: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Health check failed',
                last_check: new Date(),
            };
        }
    }

    /**
     * Execute action on module - to be implemented by concrete adapters
     */
    abstract executeAction(action: string, params: Record<string, any>): Promise<any>;

    /**
     * Helper method to add tenant header
     */
    protected addTenantHeader(params: Record<string, any>): Record<string, string> {
        return {
            'X-Tenant-ID': params.tenantId || '',
        };
    }
}
