"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FinancingProviderIntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancingProviderIntegrationService = void 0;
const common_1 = require("@nestjs/common");
let FinancingProviderIntegrationService = FinancingProviderIntegrationService_1 = class FinancingProviderIntegrationService {
    constructor() {
        this.logger = new common_1.Logger(FinancingProviderIntegrationService_1.name);
    }
    /**
     * Handle Webhook from Financing Partner (e.g. Loan Approval, Disbursement)
     */
    async handleWebhook(providerId, payload) {
        this.logger.log(`Received webhook from ${providerId}: ${JSON.stringify(payload)}`);
        switch (payload.eventType) {
            case 'LOAN_APPROVED':
                await this.handleLoanApproval(payload.data);
                break;
            case 'DISBURSEMENT_COMPLETED':
                await this.handleDisbursement(payload.data);
                break;
            default:
                this.logger.warn(`Unknown event type: ${payload.eventType}`);
        }
    }
    async handleLoanApproval(data) {
        this.logger.log(`Processing Loan Approval for Application ${data.applicationId}`);
        // Logic to update local financing application status
    }
    async handleDisbursement(data) {
        this.logger.log(`Processing Disbursement for Invoice ${data.invoiceId}`);
        // Logic to mark invoice as paid via financing
    }
};
exports.FinancingProviderIntegrationService = FinancingProviderIntegrationService;
exports.FinancingProviderIntegrationService = FinancingProviderIntegrationService = FinancingProviderIntegrationService_1 = __decorate([
    (0, common_1.Injectable)()
], FinancingProviderIntegrationService);
//# sourceMappingURL=financing-provider-integration.service.js.map