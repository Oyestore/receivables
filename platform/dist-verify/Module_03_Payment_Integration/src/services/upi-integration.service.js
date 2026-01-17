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
var UPIIntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPIIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const payment_gateway_factory_service_1 = require("./payment-gateway-factory.service");
let UPIIntegrationService = UPIIntegrationService_1 = class UPIIntegrationService {
    constructor(gatewayFactory) {
        this.gatewayFactory = gatewayFactory;
        this.logger = new common_1.Logger(UPIIntegrationService_1.name);
    }
    /**
     * Validate a VPA (Virtual Payment Address)
     */
    validateVPA(vpa) {
        const vpaRegex = /^[\w\.\-]+@[\w\.\-]+$/; // Basic VPA regex
        return vpaRegex.test(vpa);
    }
    /**
     * Initiate a UPI Collect Request
     */
    async initiateCollectRequest(payerVpa, amount, transactionId, description, gatewayId) {
        if (!this.validateVPA(payerVpa)) {
            throw new Error('Invalid VPA format');
        }
        const gateway = await this.gatewayFactory.getGatewayService(gatewayId);
        if (!gateway) {
            throw new Error('Payment Gateway not found');
        }
        this.logger.log(`Initiating UPI Collect for ${payerVpa} via ${gatewayId}`);
        // In a real scenario, we would call gateway.initiateUPI(params)
        // Assuming generic initiatePayment handles type checking or we extend interface
        return {
            success: true,
            message: 'UPI Collect request initiated',
            transactionId,
            status: 'PENDING_PAYER_APPROVAL'
        };
    }
    /**
     * Generate a Dynamic UPI QR Code string
     */
    generateDynamicQR(payeeVpa, payeeName, amount, transactionRef, description) {
        // UPI URL format: upi://pay?pa=...&pn=...&am=...&tr=...&tn=...
        const params = new URLSearchParams({
            pa: payeeVpa,
            pn: payeeName,
            am: amount.toFixed(2),
            tr: transactionRef,
            tn: description,
            cu: 'INR' // Assuming INR for UPI
        });
        return `upi://pay?${params.toString()}`;
    }
};
exports.UPIIntegrationService = UPIIntegrationService;
exports.UPIIntegrationService = UPIIntegrationService = UPIIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payment_gateway_factory_service_1.PaymentGatewayFactory])
], UPIIntegrationService);
//# sourceMappingURL=upi-integration.service.js.map