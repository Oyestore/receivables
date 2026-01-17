import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('Integration Tests - Cross-Module Workflows', () => {
    let app: INestApplication;

    beforeAll(async () => {
        // Setup test application with all required modules
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                // Import all required modules for integration testing
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Dispute Resolution → Invoice Module Integration', () => {
        it('should create dispute from unpaid invoice', async () => {
            const token = generateToken({ tenantId: 'tenant1' });

            // 1. Create invoice (Module 01)
            const invoice = await request(app.getHttpServer())
                .post('/api/invoices')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    customerId: 'cust-123',
                    amount: 50000,
                    dueDate: '2025-01-15',
                })
                .expect(201);

            // 2. Create dispute for invoice (Module 08)
            const dispute = await request(app.getHttpServer())
                .post('/api/disputes')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    invoiceId: invoice.body.id,
                    category: 'PAYMENT_DISPUTE',
                    description: 'Payment not received',
                })
                .expect(201);

            expect(dispute.body.invoiceId).toBe(invoice.body.id);
            expect(dispute.body.amount).toBe(50000);
        });
    });

    describe('Dispute Resolution → Payment Module Integration', () => {
        it('should process payment after dispute resolution', async () => {
            const token = generateToken({ tenantId: 'tenant1' });

            // 1. Resolve dispute
            const resolvedDispute = await request(app.getHttpServer())
                .patch('/api/disputes/dispute-123/status')
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'RESOLVED' })
                .expect(200);

            // 2. Trigger payment (Module 03)
            const payment = await request(app.getHttpServer())
                .post('/api/payments')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    invoiceId: resolvedDispute.body.invoiceId,
                    amount: resolvedDispute.body.amount,
                    method: 'UPI',
                })
                .expect(201);

            expect(payment.body.status).toBe('SUCCESS');
        });
    });

    describe('MSME Portal → Credit Scoring Integration', () => {
        it('should fetch credit score for MSME loan application', async () => {
            const token = generateToken({ tenantId: 'tenant1' });

            // 1. Create MSME application
            const application = await request(app.getHttpServer())
                .post('/api/msme/applications')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    schemeId: 'MUDRA',
                    businessId: 'biz-123',
                    loanAmount: 5000000,
                })
                .expect(201);

            // 2. Get credit score (Module 06)
            const creditScore = await request(app.getHttpServer())
                .get(`/api/credit-scoring/business/${application.body.businessId}`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(creditScore.body.score).toBeDefined();
            expect(creditScore.body.score).toBeGreaterThanOrEqual(300);
        });
    });

    describe('UPI Payment → GST Compliance Integration', () => {
        it('should validate GST compliance for UPI payment', async () => {
            const token = generateToken({ tenantId: 'tenant1' });

            // 1. Process UPI payment
            const upiPayment = await request(app.getHttpServer())
                .post('/api/india-market/upi/pay')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: 10000,
                    vpa: 'customer@paytm',
                    invoiceId: 'inv-123',
                })
                .expect(201);

            // 2. Validate GST compliance
            const gstValidation = await request(app.getHttpServer())
                .post('/api/compliance/gst/validate')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    invoiceId: upiPayment.body.invoiceId,
                    amount: 10000,
                    gstRate: 18,
                })
                .expect(200);

            expect(gstValidation.body.compliant).toBe(true);
        });
    });

    describe('Legal Network → Notification Module Integration', () => {
        it('should send notification when legal provider assigned', async () => {
            const token = generateToken({ tenantId: 'tenant1' });

            // 1. Assign legal provider
            const assignment = await request(app.getHttpServer())
                .post('/api/legal-network/assign')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    caseId: 'case-123',
                    providerId: 'provider-1',
                })
                .expect(201);

            // 2. Verify notification sent (Module 11)
            const notifications = await request(app.getHttpServer())
                .get('/api/notifications/recent')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            const assignmentNotif = notifications.body.find(n =>
                n.type === 'LEGAL_PROVIDER_ASSIGNED' &&
                n.metadata.caseId === 'case-123'
            );

            expect(assignmentNotif).toBeDefined();
        });
    });

    describe('End-to-End: Dispute to Resolution Flow', () => {
        it('should complete full dispute resolution workflow', async () => {
            const token = generateToken({ tenantId: 'tenant1' });

            // 1. Create dispute
            const dispute = await request(app.getHttpServer())
                .post('/api/disputes')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    customerId: 'cust-123',
                    invoiceId: 'inv-456',
                    category: 'PAYMENT_DISPUTE',
                    amount: 100000,
                })
                .expect(201);

            // 2. Generate legal notice
            const document = await request(app.getHttpServer())
                .post('/api/documents/legal-notice')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    caseNumber: dispute.body.caseNumber,
                    defendant: 'Customer Name',
                    amount: 100000,
                })
                .expect(201);

            // 3. Assign legal provider
            const assignment = await request(app.getHttpServer())
                .post('/api/legal-network/assign')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    caseId: dispute.body.id,
                    providerId: 'provider-1',
                })
                .expect(201);

            // 4. Resolve dispute
            const resolution = await request(app.getHttpServer())
                .patch(`/api/disputes/${dispute.body.id}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'RESOLVED' })
                .expect(200);

            expect(resolution.body.status).toBe('RESOLVED');
            expect(resolution.body.id).toBe(dispute.body.id);
        });
    });
});

function generateToken(payload: any): string {
    return 'mock-token-' + JSON.stringify(payload);
}
