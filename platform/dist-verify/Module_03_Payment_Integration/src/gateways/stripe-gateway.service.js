"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeGatewayService = void 0;
// import { PaymentTransaction } from '../entities/payment-transaction.entity';
class StripeGatewayService {
    async initialize(config) {
        return true;
    }
    async initiatePayment(request) {
        return { success: true, transactionId: 'stripe-txn-123' };
    }
    async verifyPayment(request) {
        return { success: true, transactionId: request.transactionId, status: 'completed' };
    }
    async processRefund(request) {
        return { success: true, status: 'processed' };
    }
    async processWebhook(payload) {
        return null;
    }
    async checkHealth() {
        return true;
    }
    getGatewayName() {
        return 'Stripe';
    }
    getSupportedPaymentMethods() {
        return ['credit_card', 'debit_card', 'wallet'];
    }
    getSupportedCurrencies() {
        return ['USD', 'EUR', 'GBP'];
    }
    getTransactionFees(amount, currency, paymentMethod) {
        return { percentage: 2.9, fixed: 0.3 };
    }
}
exports.StripeGatewayService = StripeGatewayService;
//# sourceMappingURL=stripe-gateway.service.js.map