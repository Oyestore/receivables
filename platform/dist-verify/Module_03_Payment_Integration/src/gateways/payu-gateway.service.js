"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayUGatewayService = void 0;
// import { PaymentTransaction } from '../entities/payment-transaction.entity';
class PayUGatewayService {
    async initialize(config) {
        return true;
    }
    async initiatePayment(request) {
        return { success: true, transactionId: 'payu-txn-123' };
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
        return 'PayU';
    }
    getSupportedPaymentMethods() {
        return ['credit_card', 'debit_card', 'netbanking'];
    }
    getSupportedCurrencies() {
        return ['INR'];
    }
    getTransactionFees(amount, currency, paymentMethod) {
        return { percentage: 2, fixed: 0 };
    }
}
exports.PayUGatewayService = PayUGatewayService;
//# sourceMappingURL=payu-gateway.service.js.map