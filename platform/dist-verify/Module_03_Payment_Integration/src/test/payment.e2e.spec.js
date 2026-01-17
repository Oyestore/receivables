"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const request = __importStar(require("supertest"));
const app_module_1 = require("../src/app.module");
describe('Payment Integration API E2E Tests', () => {
    let app;
    let authToken;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        // Get auth token for protected endpoints
        const response = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({
            email: 'admin@smeplatform.com',
            password: 'admin123',
        });
        authToken = response.body.data.token;
    });
    afterAll(async () => {
        await app.close();
    });
    describe('Authentication', () => {
        it('should reject requests without API key', () => {
            return request(app.getHttpServer())
                .get('/api/v1/payments')
                .expect(401);
        });
        it('should accept requests with valid API key', () => {
            return request(app.getHttpServer())
                .get('/api/v1/payments')
                .set('X-API-Key', 'sk-test-key')
                .expect(200);
        });
        it('should reject requests with invalid API key', () => {
            return request(app.getHttpServer())
                .get('/api/v1/payments')
                .set('X-API-Key', 'invalid-key')
                .expect(401);
        });
    });
    describe('Payment Transactions API', () => {
        let createdTransactionId;
        it('should create a new payment transaction', () => {
            return request(app.getHttpServer())
                .post('/api/v1/payments/transactions')
                .set('X-API-Key', 'sk-test-key')
                .send({
                amount: 15000,
                currency: 'INR',
                method: 'CREDIT_CARD',
                customer_id: 'CUST_001',
                invoice_id: 'INV_001',
                description: 'Test payment transaction',
            })
                .expect(201)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.amount).toBe(15000);
                expect(res.body.data.status).toBe('PENDING');
                createdTransactionId = res.body.data.id;
            });
        });
        it('should get all payment transactions', () => {
            return request(app.getHttpServer())
                .get('/api/v1/payments/transactions')
                .set('X-API-Key', 'sk-test-key')
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(Array.isArray(res.body.data)).toBe(true);
                expect(res.body.data.length).toBeGreaterThan(0);
            });
        });
        it('should get a specific payment transaction', () => {
            return request(app.getHttpServer())
                .get(`/api/v1/payments/transactions/${createdTransactionId}`)
                .set('X-API-Key', 'sk-test-key')
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.id).toBe(createdTransactionId);
            });
        });
        it('should update payment transaction status', () => {
            return request(app.getHttpServer())
                .patch(`/api/v1/payments/transactions/${createdTransactionId}/status`)
                .set('X-API-Key', 'sk-test-key')
                .send({
                status: 'COMPLETED',
                gateway_transaction_id: 'GATEWAY_TXN_001',
            })
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.status).toBe('COMPLETED');
            });
        });
        it('should refund a payment transaction', () => {
            return request(app.getHttpServer())
                .post(`/api/v1/payments/transactions/${createdTransactionId}/refund`)
                .set('X-API-Key', 'sk-test-key')
                .send({
                refund_amount: 5000,
                reason: 'Customer requested refund',
            })
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.refund_amount).toBe(5000);
            });
        });
    });
    describe('Payment Gateways API', () => {
        let createdGatewayId;
        it('should create a new payment gateway', () => {
            return request(app.getHttpServer())
                .post('/api/v1/payments/gateways')
                .set('X-API-Key', 'sk-test-key')
                .send({
                name: 'Test Gateway',
                provider: 'RAZORPAY',
                environment: 'sandbox',
                is_active: true,
                priority: 1,
            })
                .expect(201)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.name).toBe('Test Gateway');
                createdGatewayId = res.body.data.id;
            });
        });
        it('should get all payment gateways', () => {
            return request(app.getHttpServer())
                .get('/api/v1/payments/gateways')
                .set('X-API-Key', 'sk-test-key')
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(Array.isArray(res.body.data)).toBe(true);
            });
        });
        it('should update a payment gateway', () => {
            return request(app.getHttpServer())
                .patch(`/api/v1/payments/gateways/${createdGatewayId}`)
                .set('X-API-Key', 'sk-test-key')
                .send({
                is_active: false,
            })
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.is_active).toBe(false);
            });
        });
    });
    describe('Voice Payments API', () => {
        let createdVoicePaymentId;
        it('should create a voice payment', () => {
            return request(app.getHttpServer())
                .post('/api/v1/payments/voice')
                .set('X-API-Key', 'sk-test-key')
                .send({
                customer_phone: '+919876543210',
                amount: 5000,
                language: 'en',
                description: 'Voice payment test',
            })
                .expect(201)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.customer_phone).toBe('+919876543210');
                createdVoicePaymentId = res.body.data.id;
            });
        });
        it('should get voice payment by transaction ID', () => {
            return request(app.getHttpServer())
                .get(`/api/v1/payments/voice/transaction/${createdVoicePaymentId}`)
                .set('X-API-Key', 'sk-test-key')
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.id).toBe(createdVoicePaymentId);
            });
        });
        it('should verify voice payment', () => {
            return request(app.getHttpServer())
                .post(`/api/v1/payments/voice/${createdVoicePaymentId}/verify`)
                .set('X-API-Key', 'sk-test-key')
                .send({
                verification_method: 'voice_biometric',
                confidence_score: 95.5,
            })
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.verified_at).toBeDefined();
            });
        });
    });
    describe('SMS Payments API', () => {
        let createdSmsPaymentId;
        it('should create an SMS payment', () => {
            return request(app.getHttpServer())
                .post('/api/v1/payments/sms')
                .set('X-API-Key', 'sk-test-key')
                .send({
                customer_phone: '+919876543211',
                amount: 2500,
                description: 'SMS payment test',
            })
                .expect(201)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.customer_phone).toBe('+919876543211');
                createdSmsPaymentId = res.body.data.id;
            });
        });
        it('should confirm SMS payment', () => {
            return request(app.getHttpServer())
                .post(`/api/v1/payments/sms/${createdSmsPaymentId}/confirm`)
                .set('X-API-Key', 'sk-test-key')
                .send({
                otp: '123456',
            })
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.status).toBe('COMPLETED');
            });
        });
    });
    describe('Installment Plans API', () => {
        let createdPlanId;
        it('should create an installment plan', () => {
            return request(app.getHttpServer())
                .post('/api/v1/payments/installments')
                .set('X-API-Key', 'sk-test-key')
                .send({
                total_amount: 60000,
                number_of_installments: 6,
                installment_amount: 10000,
                frequency: 'monthly',
                customer_id: 'CUST_001',
            })
                .expect(201)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.total_amount).toBe(60000);
                createdPlanId = res.body.data.id;
            });
        });
        it('should get installment plan details', () => {
            return request(app.getHttpServer())
                .get(`/api/v1/payments/installments/${createdPlanId}`)
                .set('X-API-Key', 'sk-test-key')
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.id).toBe(createdPlanId);
            });
        });
        it('should pay an installment', () => {
            return request(app.getHttpServer())
                .post(`/api/v1/payments/installments/${createdPlanId}/pay`)
                .set('X-API-Key', 'sk-test-key')
                .send({
                installment_number: 1,
                payment_method: 'UPI',
            })
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.status).toBe('paid');
            });
        });
    });
    describe('Analytics API', () => {
        it('should get payment analytics', () => {
            return request(app.getHttpServer())
                .get('/api/v1/payments/analytics')
                .query({
                start_date: '2025-01-01',
                end_date: '2025-01-31',
            })
                .set('X-API-Key', 'sk-test-key')
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.total_transactions).toBeDefined();
                expect(res.body.data.success_rate).toBeDefined();
            });
        });
        it('should get gateway performance metrics', () => {
            return request(app.getHttpServer())
                .get('/api/v1/payments/analytics/gateways')
                .set('X-API-Key', 'sk-test-key')
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(Array.isArray(res.body.data)).toBe(true);
            });
        });
        it('should get method performance metrics', () => {
            return request(app.getHttpServer())
                .get('/api/v1/payments/analytics/methods')
                .set('X-API-Key', 'sk-test-key')
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(Array.isArray(res.body.data)).toBe(true);
            });
        });
    });
    describe('Accounting Integration API', () => {
        let createdSystemId;
        it('should create accounting system configuration', () => {
            return request(app.getHttpServer())
                .post('/api/v1/accounting/systems')
                .set('X-API-Key', 'sk-test-key')
                .send({
                name: 'Test Accounting System',
                type: 'zoho',
                api_endpoint: 'https://books.zoho.in/api/v3',
                company_id: '12345678901',
                is_active: true,
            })
                .expect(201)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.name).toBe('Test Accounting System');
                createdSystemId = res.body.data.id;
            });
        });
        it('should sync data with accounting system', () => {
            return request(app.getHttpServer())
                .post(`/api/v1/accounting/systems/${createdSystemId}/sync`)
                .set('X-API-Key', 'sk-test-key')
                .send({
                sync_type: 'incremental',
                entity_type: 'payment_transaction',
            })
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.status).toBe('success');
            });
        });
        it('should get sync logs', () => {
            return request(app.getHttpServer())
                .get(`/api/v1/accounting/systems/${createdSystemId}/logs`)
                .set('X-API-Key', 'sk-test-key')
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(Array.isArray(res.body.data)).toBe(true);
            });
        });
    });
    describe('AI Intelligence API', () => {
        it('should get fraud prediction', () => {
            return request(app.getHttpServer())
                .post('/api/v1/ai/fraud-prediction')
                .set('X-API-Key', 'sk-test-key')
                .send({
                transaction_data: {
                    amount: 50000,
                    customer_id: 'CUST_001',
                    method: 'CREDIT_CARD',
                },
            })
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.risk_score).toBeDefined();
                expect(res.body.data.risk_level).toBeDefined();
            });
        });
        it('should get payment forecast', () => {
            return request(app.getHttpServer())
                .post('/api/v1/ai/payment-forecast')
                .set('X-API-Key', 'sk-test-key')
                .send({
                customer_id: 'CUST_001',
                forecast_period: 30,
            })
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.next_payment_date).toBeDefined();
                expect(res.body.data.predicted_amount).toBeDefined();
            });
        });
        it('should get payment recommendations', () => {
            return request(app.getHttpServer())
                .post('/api/v1/ai/recommendations')
                .set('X-API-Key', 'sk-test-key')
                .send({
                customer_id: 'CUST_001',
                context: 'payment_optimization',
            })
                .expect(200)
                .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(Array.isArray(res.body.data.recommendations)).toBe(true);
            });
        });
    });
    describe('Health Check API', () => {
        it('should return comprehensive health status', () => {
            return request(app.getHttpServer())
                .get('/health')
                .expect(200)
                .expect((res) => {
                expect(res.body.status).toBeDefined();
                expect(res.body.services).toBeDefined();
                expect(res.body.metrics).toBeDefined();
            });
        });
        it('should return liveness status', () => {
            return request(app.getHttpServer())
                .get('/health/liveness')
                .expect(200)
                .expect((res) => {
                expect(res.body.status).toBe('ok');
            });
        });
        it('should return readiness status', () => {
            return request(app.getHttpServer())
                .get('/health/readiness')
                .expect(200)
                .expect((res) => {
                expect(res.body.status).toBeDefined();
                expect(res.body.checks).toBeDefined();
            });
        });
        it('should return provider status', () => {
            return request(app.getHttpServer())
                .get('/health/providers')
                .expect(200)
                .expect((res) => {
                expect(res.body.razorpay).toBeDefined();
                expect(res.body.payu).toBeDefined();
                expect(res.body.ccavenue).toBeDefined();
            });
        });
        it('should return system metrics', () => {
            return request(app.getHttpServer())
                .get('/health/metrics')
                .expect(200)
                .expect((res) => {
                expect(res.body.memory).toBeDefined();
                expect(res.body.cpu).toBeDefined();
                expect(res.body.uptime).toBeDefined();
            });
        });
    });
    describe('Error Handling', () => {
        it('should handle validation errors properly', () => {
            return request(app.getHttpServer())
                .post('/api/v1/payments/transactions')
                .set('X-API-Key', 'sk-test-key')
                .send({
                // Missing required fields
                amount: 'invalid_amount',
            })
                .expect(400)
                .expect((res) => {
                expect(res.body.success).toBe(false);
                expect(res.body.error.code).toBe('VALIDATION_FAILED');
            });
        });
        it('should handle not found errors properly', () => {
            return request(app.getHttpServer())
                .get('/api/v1/payments/transactions/non-existent-id')
                .set('X-API-Key', 'sk-test-key')
                .expect(404)
                .expect((res) => {
                expect(res.body.success).toBe(false);
                expect(res.body.error.code).toBe('NOT_FOUND');
            });
        });
        it('should handle rate limiting', async () => {
            // Make multiple requests to trigger rate limiting
            const promises = Array(101).fill(null).map(() => request(app.getHttpServer())
                .get('/api/v1/payments/transactions')
                .set('X-API-Key', 'sk-test-key'));
            const results = await Promise.allSettled(promises);
            const rateLimitedRequests = results.filter(result => result.status === 'fulfilled' && result.value.status === 429);
            expect(rateLimitedRequests.length).toBeGreaterThan(0);
        });
    });
    describe('Data Integrity', () => {
        it('should maintain data consistency across operations', async () => {
            // Create a transaction
            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/payments/transactions')
                .set('X-API-Key', 'sk-test-key')
                .send({
                amount: 10000,
                currency: 'INR',
                method: 'UPI',
                customer_id: 'CUST_001',
                invoice_id: 'INV_CONSISTENCY',
            });
            const transactionId = createResponse.body.data.id;
            // Create a voice payment linked to the transaction
            const voiceResponse = await request(app.getHttpServer())
                .post('/api/v1/payments/voice')
                .set('X-API-Key', 'sk-test-key')
                .send({
                transaction_id: transactionId,
                customer_phone: '+919876543210',
                amount: 10000,
            });
            const voicePaymentId = voiceResponse.body.data.id;
            // Verify the voice payment references the correct transaction
            const getVoiceResponse = await request(app.getHttpServer())
                .get(`/api/v1/payments/voice/${voicePaymentId}`)
                .set('X-API-Key', 'sk-test-key');
            expect(getVoiceResponse.body.data.transaction_id).toBe(transactionId);
            // Update transaction status
            await request(app.getHttpServer())
                .patch(`/api/v1/payments/transactions/${transactionId}/status`)
                .set('X-API-Key', 'sk-test-key')
                .send({
                status: 'COMPLETED',
            });
            // Verify voice payment is also updated
            const updatedVoiceResponse = await request(app.getHttpServer())
                .get(`/api/v1/payments/voice/${voicePaymentId}`)
                .set('X-API-Key', 'sk-test-key');
            expect(updatedVoiceResponse.body.data.transaction_status).toBe('COMPLETED');
        });
    });
    describe('Performance', () => {
        it('should handle concurrent requests', async () => {
            const concurrentRequests = 50;
            const promises = Array(concurrentRequests).fill(null).map(() => request(app.getHttpServer())
                .get('/api/v1/payments/transactions')
                .set('X-API-Key', 'sk-test-key'));
            const results = await Promise.allSettled(promises);
            const successfulRequests = results.filter(result => result.status === 'fulfilled' && result.value.status === 200);
            expect(successfulRequests.length).toBe(concurrentRequests);
        });
        it('should respond within acceptable time limits', async () => {
            const startTime = Date.now();
            await request(app.getHttpServer())
                .get('/api/v1/payments/transactions')
                .set('X-API-Key', 'sk-test-key')
                .expect(200);
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
        });
    });
});
//# sourceMappingURL=payment.e2e.spec.js.map