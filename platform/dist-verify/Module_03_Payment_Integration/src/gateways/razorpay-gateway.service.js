"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayGatewayService = void 0;
// import { PaymentTransaction } from '../entities/payment-transaction.entity';
class RazorpayGatewayService {
    async initialize(config) {
        return true;
    }
    async initiatePayment(request) {
        return { success: true, transactionId: 'razorpay-txn-123' };
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
        return 'Razorpay';
    }
    getSupportedPaymentMethods() {
        return ['credit_card', 'debit_card', 'upi', 'netbanking'];
    }
    getSupportedCurrencies() {
        return ['INR'];
    }
    getTransactionFees(amount, currency, paymentMethod) {
        return { percentage: 2, fixed: 0 };
    }
}
exports.RazorpayGatewayService = RazorpayGatewayService;
//# sourceMappingURL=razorpay-gateway.service.js.map