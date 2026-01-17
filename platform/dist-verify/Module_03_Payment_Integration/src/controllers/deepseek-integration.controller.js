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
exports.DeepSeekIntegrationController = void 0;
const common_1 = require("@nestjs/common");
const payment_prediction_service_1 = require("../services/payment-prediction.service");
let DeepSeekIntegrationController = class DeepSeekIntegrationController {
    constructor(predictionService) {
        this.predictionService = predictionService;
    }
    async predictSuccess(data) {
        try {
            const result = await this.predictionService.generatePaymentPrediction(data.customerId, data.tenantId, data.customerProfile, data.behaviorAnalysis, data.options);
            return result;
        }
        catch (error) {
            throw new common_1.HttpException(error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.DeepSeekIntegrationController = DeepSeekIntegrationController;
__decorate([
    (0, common_1.Post)('predict-success'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeepSeekIntegrationController.prototype, "predictSuccess", null);
exports.DeepSeekIntegrationController = DeepSeekIntegrationController = __decorate([
    (0, common_1.Controller)('payment/ai'),
    __metadata("design:paramtypes", [payment_prediction_service_1.PaymentPredictionService])
], DeepSeekIntegrationController);
//# sourceMappingURL=deepseek-integration.controller.js.map