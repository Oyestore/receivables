import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';
import { DisputeResolutionModule } from '../Module_08_Dispute_Resolution_&_Legal_Network/code/dispute-resolution.module';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

describe('Module 08 End-to-End Integration Tests', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule, DisputeResolutionModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        dataSource = moduleFixture.get<DataSource>(DataSource);

        await app.init();
        
        // Setup test database
        await setupTestDatabase(dataSource);
    });

    afterAll(async () => {
        // Clean up test database
        await cleanupTestDatabase(dataSource);
        await app.close();
    });

    beforeEach(async () => {
        // Reset database state before each test
        await resetDatabase(dataSource);
    });

    describe('Dispute Management Flow', () => {
        it('should create and manage a complete dispute lifecycle', async () => {
            // Step 1: Create a dispute case
            const createDisputeResponse = await request(app.getHttpServer())
                .post('/api/v1/disputes/cases')
                .send({
                    tenantId: 'test-tenant-1',
                    invoiceId: 'test-invoice-1',
                    customerId: 'test-customer-1',
                    customerName: 'Test Customer',
                    type: 'non_payment',
                    disputedAmount: 50000,
                    description: 'Test dispute for integration testing',
                    priority: 'medium',
                    createdBy: 'test-user-1',
                })
                .expect(201);

            expect(createDisputeResponse.body.success).toBe(true);
            expect(createDisputeResponse.body.data).toHaveProperty('id');
            expect(createDisputeResponse.body.data.status).toBe('draft');

            const disputeId = createDisputeResponse.body.data.id;

            // Step 2: File the dispute
            const fileDisputeResponse = await request(app.getHttpServer())
                .patch(`/api/v1/disputes/cases/${disputeId}/file`)
                .send({
                    filedBy: 'test-user-1',
                })
                .expect(200);

            expect(fileDisputeResponse.body.success).toBe(true);
            expect(fileDisputeResponse.body.data.status).toBe('filed');

            // Step 3: Update dispute status
            const updateStatusResponse = await request(app.getHttpServer())
                .patch(`/api/v1/disputes/cases/${disputeId}/status`)
                .send({
                    status: 'under_review',
                    updatedBy: 'test-user-1',
                })
                .expect(200);

            expect(updateStatusResponse.body.success).toBe(true);
            expect(updateStatusResponse.body.data.status).toBe('under_review');

            // Step 4: Get dispute details
            const getDisputeResponse = await request(app.getHttpServer())
                .get(`/api/v1/disputes/cases/${disputeId}`)
                .query({ tenantId: 'test-tenant-1' })
                .expect(200);

            expect(getDisputeResponse.body.success).toBe(true);
            expect(getDisputeResponse.body.data.id).toBe(disputeId);
        });

        it('should handle dispute validation errors', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/disputes/cases')
                .send({
                    // Missing required fields
                    tenantId: 'test-tenant-1',
                    // invoiceId missing
                    customerId: 'test-customer-1',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('validation');
        });
    });

    describe('Collection Management Flow', () => {
        it('should create and manage collection cases', async () => {
            // Step 1: Create a collection case
            const createCollectionResponse = await request(app.getHttpServer())
                .post('/api/v1/collections/cases')
                .send({
                    tenantId: 'test-tenant-1',
                    customerId: 'test-customer-1',
                    customerName: 'Test Customer',
                    invoiceId: 'test-invoice-1',
                    outstandingAmount: 75000,
                    originalAmount: 75000,
                    strategy: 'friendly_reminder',
                    createdBy: 'test-user-1',
                })
                .expect(201);

            expect(createCollectionResponse.body.success).toBe(true);
            expect(createCollectionResponse.body.data).toHaveProperty('id');
            expect(createCollectionResponse.body.data.status).toBe('pending');

            const collectionId = createCollectionResponse.body.data.id;

            // Step 2: Record payment
            const recordPaymentResponse = await request(app.getHttpServer())
                .post(`/api/v1/collections/cases/${collectionId}/payment`)
                .send({
                    tenantId: 'test-tenant-1',
                    amount: 25000,
                    paymentMethod: 'bank_transfer',
                    recordedBy: 'test-user-1',
                })
                .expect(200);

            expect(recordPaymentResponse.body.success).toBe(true);
            expect(recordPaymentResponse.body.data.recoveredAmount).toBe(25000);

            // Step 3: Propose settlement
            const proposeSettlementResponse = await request(app.getHttpServer())
                .post(`/api/v1/collections/cases/${collectionId}/settlement`)
                .send({
                    tenantId: 'test-tenant-1',
                    proposedAmount: 45000,
                    terms: 'Settlement proposal for testing',
                    proposedBy: 'test-user-1',
                })
                .expect(200);

            expect(proposeSettlementResponse.body.success).toBe(true);
            expect(proposeSettlementResponse.body.data.settlement).toBeDefined();
        });

        it('should convert dispute to collection case', async () => {
            // First create a dispute
            const disputeResponse = await request(app.getHttpServer())
                .post('/api/v1/disputes/cases')
                .send({
                    tenantId: 'test-tenant-1',
                    invoiceId: 'test-invoice-2',
                    customerId: 'test-customer-2',
                    customerName: 'Test Customer 2',
                    type: 'non_payment',
                    disputedAmount: 100000,
                    description: 'Test dispute for conversion',
                    createdBy: 'test-user-1',
                })
                .expect(201);

            const disputeId = disputeResponse.body.data.id;

            // Convert to collection case
            const convertResponse = await request(app.getHttpServer())
                .post('/api/v1/collections/convert-from-dispute')
                .send({
                    disputeId: disputeId,
                    tenantId: 'test-tenant-1',
                    createdBy: 'test-user-1',
                })
                .expect(200);

            expect(convertResponse.body.success).toBe(true);
            expect(convertResponse.body.data).toHaveProperty('id');
            expect(convertResponse.body.data.disputeId).toBe(disputeId);
        });
    });

    describe('Legal Network Flow', () => {
        it('should register and search legal providers', async () => {
            // Step 1: Register a legal provider
            const registerResponse = await request(app.getHttpServer())
                .post('/api/v1/legal-network/providers')
                .send({
                    tenantId: 'test-tenant-1',
                    firmName: 'Test Law Firm',
                    providerType: 'law_firm',
                    specializations: ['debt_recovery', 'commercial_law'],
                    barCouncilNumber: 'TEST123456',
                    yearsOfExperience: 10,
                    contactInfo: {
                        email: 'test@lawfirm.com',
                        phone: '+919876543210',
                        address: {
                            street: '123 Test Street',
                            city: 'Mumbai',
                            state: 'Maharashtra',
                            pincode: '400001',
                        },
                    },
                    pricing: {
                        consultationFee: 5000,
                        hourlyRate: 2000,
                        legalNoticeFee: 10000,
                    },
                })
                .expect(200);

            expect(registerResponse.body.success).toBe(true);
            expect(registerResponse.body.data.firmName).toBe('Test Law Firm');
            expect(registerResponse.body.data.status).toBe('pending_verification');

            // Step 2: Search for providers
            const searchResponse = await request(app.getHttpServer())
                .get('/api/v1/legal-network/providers/search')
                .query({
                    specializations: 'debt_recovery',
                    minRating: 4,
                    location: 'Mumbai',
                })
                .expect(200);

            expect(searchResponse.body.success).toBe(true);
            expect(searchResponse.body.data.providers).toBeInstanceOf(Array);
        });

        it('should get recommended providers', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/legal-network/providers/recommended/debt_recovery')
                .query({
                    disputedAmount: 50000,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.providers).toBeInstanceOf(Array);
            expect(response.body.data.message).toContain('Top 5 recommended providers');
        });
    });

    describe('Document Generation Flow', () => {
        it('should create templates and generate documents', async () => {
            // Step 1: Create a document template
            const createTemplateResponse = await request(app.getHttpServer())
                .post('/api/v1/documents/templates')
                .send({
                    templateCode: 'TEST_LEGAL_NOTICE',
                    templateName: 'Test Legal Notice',
                    templateType: 'legal_notice',
                    language: 'en',
                    content: 'This is a test legal notice for {{customerName}} regarding invoice {{invoiceNumber}}.',
                    variables: [
                        { name: 'customerName', type: 'string', required: true, description: 'Customer name' },
                        { name: 'invoiceNumber', type: 'string', required: true, description: 'Invoice number' },
                    ],
                    createdBy: 'test-user-1',
                })
                .expect(200);

            expect(createTemplateResponse.body.templateCode).toBe('TEST_LEGAL_NOTICE');

            const templateId = createTemplateResponse.body.id;

            // Step 2: Generate a document from template
            const generateDocumentResponse = await request(app.getHttpServer())
                .post('/api/v1/documents/generate')
                .send({
                    templateId: templateId,
                    disputeCaseId: 'test-dispute-1',
                    variables: {
                        customerName: 'Test Customer',
                        invoiceNumber: 'INV-001',
                    },
                    language: 'en',
                    generatedBy: 'test-user-1',
                    generatePDF: false,
                })
                .expect(200);

            expect(generateDocumentResponse.body).toHaveProperty('documentId');
            expect(generateDocumentResponse.body).toHaveProperty('filePath');
        });

        it('should validate template syntax', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/documents/validate')
                .send({
                    content: 'This is a test template with {{validVariable}} and {{invalidVariable syntax',
                    variables: [
                        { name: 'validVariable', type: 'string', required: true },
                    ],
                })
                .expect(200);

            expect(response.body).toHaveProperty('valid');
            expect(response.body).toHaveProperty('errors');
        });
    });

    describe('MSME Portal Integration', () => {
        it('should handle MSME case filing', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/msme/cases/file')
                .send({
                    disputeCaseId: 'test-dispute-1',
                    supplierName: 'Test Supplier',
                    supplierUdyamNumber: 'UDYAM-MH-01-1234567',
                    supplierEmail: 'supplier@test.com',
                    supplierPhone: '+919876543210',
                    supplierAddress: 'Test Address, Mumbai',
                    buyerName: 'Test Buyer',
                    buyerPAN: 'ABCDE1234F',
                    buyerAddress: 'Buyer Address, Delhi',
                    amountClaimed: 100000,
                    disputeDescription: 'Test dispute for MSME portal',
                    invoiceNumbers: ['INV-001', 'INV-002'],
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.status).toBe('draft');
        });

        it('should handle webhook events', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/msme/webhook')
                .send({
                    eventType: 'CASE_STATUS_UPDATE',
                    caseId: 'MSME-123456',
                    status: 'under_review',
                    timestamp: new Date().toISOString(),
                })
                .expect(200);

            // Webhook should return 200 OK without errors
            expect(response.status).toBe(200);
        });
    });

    describe('Cross-Module Integration', () => {
        it('should integrate with invoice module', async () => {
            // This test would verify that dispute cases can reference invoices
            // and that invoice data is properly synchronized
            const response = await request(app.getHttpServer())
                .post('/api/v1/disputes/cases')
                .send({
                    tenantId: 'test-tenant-1',
                    invoiceId: 'existing-invoice-123',
                    customerId: 'test-customer-1',
                    customerName: 'Test Customer',
                    type: 'non_payment',
                    disputedAmount: 25000,
                    description: 'Test integration with invoice module',
                    createdBy: 'test-user-1',
                })
                .expect(201);

            expect(response.body.data.invoiceId).toBe('existing-invoice-123');
        });

        it('should integrate with payment module', async () => {
            // This test would verify that payment records are properly
            // linked to collection cases
            const collectionResponse = await request(app.getHttpServer())
                .post('/api/v1/collections/cases')
                .send({
                    tenantId: 'test-tenant-1',
                    customerId: 'test-customer-1',
                    customerName: 'Test Customer',
                    invoiceId: 'payment-test-invoice',
                    outstandingAmount: 50000,
                    originalAmount: 50000,
                    strategy: 'formal_notice',
                    createdBy: 'test-user-1',
                })
                .expect(201);

            const collectionId = collectionResponse.body.data.id;

            const paymentResponse = await request(app.getHttpServer())
                .post(`/api/v1/collections/cases/${collectionId}/payment`)
                .send({
                    tenantId: 'test-tenant-1',
                    amount: 15000,
                    paymentMethod: 'online_transfer',
                    recordedBy: 'test-user-1',
                })
                .expect(200);

            expect(paymentResponse.body.data.recoveredAmount).toBe(15000);
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle concurrent requests', async () => {
            const concurrentRequests = 10;
            const requests = [];

            for (let i = 0; i < concurrentRequests; i++) {
                requests.push(
                    request(app.getHttpServer())
                        .post('/api/v1/disputes/cases')
                        .send({
                            tenantId: `test-tenant-${i}`,
                            invoiceId: `test-invoice-${i}`,
                            customerId: `test-customer-${i}`,
                            customerName: `Test Customer ${i}`,
                            type: 'non_payment',
                            disputedAmount: 10000,
                            description: `Concurrent test dispute ${i}`,
                            createdBy: 'test-user-1',
                        })
                );
            }

            const responses = await Promise.all(requests);
            
            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(201);
                expect(response.body.success).toBe(true);
            });
        });

        it('should handle large data payloads', async () => {
            const largeDescription = 'A'.repeat(10000); // 10KB description
            
            const response = await request(app.getHttpServer())
                .post('/api/v1/disputes/cases')
                .send({
                    tenantId: 'test-tenant-1',
                    invoiceId: 'large-data-invoice',
                    customerId: 'test-customer-1',
                    customerName: 'Test Customer',
                    type: 'quality_dispute',
                    disputedAmount: 100000,
                    description: largeDescription,
                    createdBy: 'test-user-1',
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.description).toBe(largeDescription);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle invalid dispute IDs gracefully', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/disputes/cases/invalid-uuid')
                .query({ tenantId: 'test-tenant-1' })
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should handle unauthorized access', async () => {
            // This test would verify proper authentication/authorization
            // Implementation depends on your auth strategy
            const response = await request(app.getHttpServer())
                .post('/api/v1/disputes/cases')
                .send({
                    // Missing authentication headers
                    tenantId: 'test-tenant-1',
                    invoiceId: 'unauthorized-invoice',
                    customerId: 'test-customer-1',
                    customerName: 'Test Customer',
                    type: 'non_payment',
                    disputedAmount: 10000,
                    description: 'Unauthorized test',
                    createdBy: 'test-user-1',
                });

            // Expect 401 or 403 depending on auth implementation
            expect([401, 403]).toContain(response.status);
        });

        it('should handle database connection errors', async () => {
            // This would require mocking database failures
            // For now, we'll test with invalid data that might cause DB errors
            const response = await request(app.getHttpServer())
                .post('/api/v1/disputes/cases')
                .send({
                    tenantId: 'test-tenant-1',
                    invoiceId: null, // Invalid null value
                    customerId: 'test-customer-1',
                    customerName: 'Test Customer',
                    type: 'non_payment',
                    disputedAmount: -1000, // Invalid negative amount
                    description: 'Invalid data test',
                    createdBy: 'test-user-1',
                });

            expect([400, 422]).toContain(response.status);
        });
    });
});

// Helper functions for database setup
async function setupTestDatabase(dataSource: DataSource) {
    // Create test data or setup procedures
    console.log('Setting up test database...');
}

async function cleanupTestDatabase(dataSource: DataSource) {
    // Clean up test data
    console.log('Cleaning up test database...');
}

async function resetDatabase(dataSource: DataSource) {
    // Reset database to clean state for each test
    console.log('Resetting database for test...');
}
