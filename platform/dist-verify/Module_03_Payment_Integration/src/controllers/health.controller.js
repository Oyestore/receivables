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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const health_check_service_1 = require("../services/health-check.service");
let HealthController = class HealthController {
    constructor(healthCheckService) {
        this.healthCheckService = healthCheckService;
    }
    async getHealth() {
        return this.healthCheckService.performHealthCheck();
    }
    async getLiveness() {
        return this.healthCheckService.performLivenessCheck();
    }
    async getReadiness() {
        return this.healthCheckService.performReadinessCheck();
    }
    async getProviders() {
        return this.healthCheckService.checkPaymentGateways();
    }
    async getMetrics() {
        return this.healthCheckService.getSystemMetrics();
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Comprehensive health check' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Health check results' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('liveness'),
    (0, swagger_1.ApiOperation)({ summary: 'Liveness probe for Kubernetes' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service is alive' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getLiveness", null);
__decorate([
    (0, common_1.Get)('readiness'),
    (0, swagger_1.ApiOperation)({ summary: 'Readiness probe for Kubernetes' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service is ready to accept traffic' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getReadiness", null);
__decorate([
    (0, common_1.Get)('providers'),
    (0, swagger_1.ApiOperation)({ summary: 'Check payment provider status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment provider health status' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getProviders", null);
__decorate([
    (0, common_1.Get)('metrics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get system metrics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'System performance metrics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getMetrics", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('Health Check'),
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [health_check_service_1.HealthCheckService])
], HealthController);
//# sourceMappingURL=health.controller.js.map