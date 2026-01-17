"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RuralPaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuralPaymentService = void 0;
const common_1 = require("@nestjs/common");
let RuralPaymentService = RuralPaymentService_1 = class RuralPaymentService {
    constructor() {
        this.logger = new common_1.Logger(RuralPaymentService_1.name);
    }
    /**
     * Generate an SMS Payment Link (Offline/Low-Bandwidth friendly)
     */
    generateSMSPaymentLink(invoiceId, amount) {
        // Logic to generate a short link
        const baseUrl = process.env.PAYMENT_LINK_BASE_URL || 'https://pay.sme.io';
        return `${baseUrl}/i/${invoiceId}?amt=${amount}`;
    }
    /**
     * Mock processing of a USSD payment request
     * In reality, this would integrate with a telecom provider's USSD gateway
     */
    async processUSSDRequest(phoneNumber, shortCode, input) {
        this.logger.log(`Processing USSD request from ${phoneNumber}: ${input}`);
        // Simple menu logic for demonstration
        if (input === '*123#') {
            return 'Welcome to SME Pay\n1. Pay Invoice\n2. Check Balance';
        }
        else if (input === '1') {
            return 'Enter Invoice ID:';
        }
        else {
            return 'Invalid option';
        }
    }
    /**
     * Send Payment Reminder via SMS (Integration stub)
     */
    async sendOfflineReminder(phoneNumber, message) {
        this.logger.log(`Sending SMS to ${phoneNumber}: ${message}`);
        // Integration with SMS Provider would go here
        return true;
    }
};
exports.RuralPaymentService = RuralPaymentService;
exports.RuralPaymentService = RuralPaymentService = RuralPaymentService_1 = __decorate([
    (0, common_1.Injectable)()
], RuralPaymentService);
//# sourceMappingURL=rural-payment.service.js.map