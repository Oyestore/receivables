"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SMSPaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSPaymentService = void 0;
const common_1 = require("@nestjs/common");
let SMSPaymentService = SMSPaymentService_1 = class SMSPaymentService {
    constructor() {
        this.logger = new common_1.Logger(SMSPaymentService_1.name);
    }
    /**
     * Send a Payment Link via SMS
     */
    async sendPaymentLink(phoneNumber, invoiceId, amount, paymentLink) {
        if (!this.validatePhoneNumber(phoneNumber)) {
            throw new Error('Invalid phone number format');
        }
        const message = `Please pay INR ${amount} for Invoice ${invoiceId}. Link: ${paymentLink}`;
        // Integration stub for SMS Gateway (e.g. Twilio, Gupshup)
        this.logger.log(`Sending SMS to ${phoneNumber}: "${message}"`);
        return true; // Simulate success
    }
    validatePhoneNumber(phone) {
        return /^\+?[1-9]\d{1,14}$/.test(phone);
    }
};
exports.SMSPaymentService = SMSPaymentService;
exports.SMSPaymentService = SMSPaymentService = SMSPaymentService_1 = __decorate([
    (0, common_1.Injectable)()
], SMSPaymentService);
//# sourceMappingURL=sms-payment.service.js.map