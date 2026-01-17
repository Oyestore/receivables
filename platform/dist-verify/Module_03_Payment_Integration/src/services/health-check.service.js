"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var HealthCheckService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let HealthCheckService = HealthCheckService_1 = class HealthCheckService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(HealthCheckService_1.name);
    }
    async performHealthCheck() {
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '3.0.0',
            environment: this.configService.get('NODE_ENV', 'development'),
            services: await this.checkServices(),
            metrics: this.getSystemMetrics(),
        };
        // Determine overall health status
        const unhealthyServices = Object.values(healthStatus.services).filter((service) => service.status !== 'healthy');
        if (unhealthyServices.length > 0) {
            healthStatus.status = 'degraded';
        }
        return healthStatus;
    }
    async performLivenessCheck() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    }
    async performReadinessCheck() {
        const checks = {
            database: await this.checkDatabase(),
            redis: await this.checkRedis(),
            paymentGateways: await this.checkPaymentGateways(),
        };
        const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
        return {
            status: allHealthy ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
            checks,
        };
    }
    async checkPaymentGateways() {
        const gateways = {
            razorpay: await this.checkRazorpay(),
            payu: await this.checkPayU(),
            ccavenue: await this.checkCCAvenue(),
            upi: await this.checkUPI(),
        };
        return gateways;
    }
    async getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        return {
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                external: Math.round(memUsage.external / 1024 / 1024), // MB
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system,
            },
            uptime: process.uptime(),
            loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null,
            platform: process.platform,
            nodeVersion: process.version,
        };
    }
    async checkServices() {
        return {
            database: await this.checkDatabase(),
            redis: await this.checkRedis(),
            paymentGateways: await this.checkPaymentGateways(),
            queue: await this.checkQueue(),
            externalApis: await this.checkExternalAPIs(),
        };
    }
    async checkDatabase() {
        try {
            // This would be implemented with actual database connection check
            // For now, simulate a healthy database connection
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                details: {
                    host: this.configService.get('DB_HOST', 'localhost'),
                    port: this.configService.get('DB_PORT', '5434'),
                    database: this.configService.get('DB_DATABASE', 'payment_db'),
                },
            };
        }
        catch (error) {
            this.logger.error('Database health check failed', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkRedis() {
        try {
            // This would be implemented with actual Redis connection check
            // For now, simulate a healthy Redis connection
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                details: {
                    host: this.configService.get('REDIS_HOST', 'localhost'),
                    port: this.configService.get('REDIS_PORT', '6379'),
                },
            };
        }
        catch (error) {
            this.logger.error('Redis health check failed', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkQueue() {
        try {
            // This would be implemented with actual BullMQ queue check
            // For now, simulate a healthy queue system
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                details: {
                    activeJobs: 0,
                    waitingJobs: 0,
                    completedJobs: 0,
                    failedJobs: 0,
                },
            };
        }
        catch (error) {
            this.logger.error('Queue health check failed', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkExternalAPIs() {
        const apis = {
            deepseek: await this.checkDeepSeekAPI(),
            accounting: await this.checkAccountingAPIs(),
        };
        return apis;
    }
    async checkRazorpay() {
        try {
            const apiKey = this.configService.get('RAZORPAY_KEY_ID');
            if (!apiKey) {
                return {
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: 'API key not configured',
                };
            }
            // Simulate API health check
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                details: {
                    configured: true,
                    testMode: apiKey.startsWith('rzp_test_'),
                },
            };
        }
        catch (error) {
            this.logger.error('Razorpay health check failed', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkPayU() {
        try {
            const merchantKey = this.configService.get('PAYU_MERCHANT_KEY');
            if (!merchantKey) {
                return {
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: 'Merchant key not configured',
                };
            }
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                details: {
                    configured: true,
                    testMode: merchantKey.includes('test'),
                },
            };
        }
        catch (error) {
            this.logger.error('PayU health check failed', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkCCAvenue() {
        try {
            const merchantId = this.configService.get('CCAVENUE_MERCHANT_ID');
            if (!merchantId) {
                return {
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: 'Merchant ID not configured',
                };
            }
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                details: {
                    configured: true,
                    testMode: merchantId.includes('test'),
                },
            };
        }
        catch (error) {
            this.logger.error('CCAvenue health check failed', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkUPI() {
        try {
            const apiKey = this.configService.get('UPI_PROVIDER_API_KEY');
            if (!apiKey) {
                return {
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: 'UPI provider API key not configured',
                };
            }
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                details: {
                    configured: true,
                },
            };
        }
        catch (error) {
            this.logger.error('UPI health check failed', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkDeepSeekAPI() {
        try {
            // This would be implemented with actual DeepSeek API check
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                details: {
                    configured: true,
                },
            };
        }
        catch (error) {
            this.logger.error('DeepSeek API health check failed', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkAccountingAPIs() {
        const accounting = {
            zoho: await this.checkZohoAPI(),
            busy: await this.checkBusyAPI(),
            quickbooks: await this.checkQuickBooksAPI(),
            marg: await this.checkMargAPI(),
        };
        return accounting;
    }
    async checkZohoAPI() {
        try {
            const clientId = this.configService.get('ZOHO_CLIENT_ID');
            return {
                status: clientId ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                details: {
                    configured: !!clientId,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkBusyAPI() {
        try {
            const dbHost = this.configService.get('BUSY_DATABASE_HOST');
            return {
                status: dbHost ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                details: {
                    configured: !!dbHost,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkQuickBooksAPI() {
        try {
            const clientId = this.configService.get('QUICKBOOKS_CLIENT_ID');
            return {
                status: clientId ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                details: {
                    configured: !!clientId,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkMargAPI() {
        try {
            const apiKey = this.configService.get('MARG_API_KEY');
            return {
                status: apiKey ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                details: {
                    configured: !!apiKey,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
};
exports.HealthCheckService = HealthCheckService;
exports.HealthCheckService = HealthCheckService = HealthCheckService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], HealthCheckService);
//# sourceMappingURL=health-check.service.js.map