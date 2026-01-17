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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationController = void 0;
const common_1 = require("@nestjs/common");
const integration_service_1 = require("../services/integration.service");
let IntegrationController = class IntegrationController {
    constructor(integrationService) {
        this.integrationService = integrationService;
    }
    async getIntegrations() {
        return { status: 'active', integrations: [] };
    }
    async syncIntegration(type, data) {
        return { success: true, message: `Sync started for ${type}` };
    }
};
exports.IntegrationController = IntegrationController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "getIntegrations", null);
__decorate([
    (0, common_1.Post)(':type/sync'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "syncIntegration", null);
exports.IntegrationController = IntegrationController = __decorate([
    (0, common_1.Controller)('payment/integrations'),
    __metadata("design:paramtypes", [integration_service_1.IntegrationService])
], IntegrationController);
//# sourceMappingURL=integration.controller.js.map