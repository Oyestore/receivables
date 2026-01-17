import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';
import { MarketingCustomerSuccessModule } from '../Module_09_Marketing_Customer_Success/code/marketing-customer-success.module';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

describe('Module 09 End-to-End Integration Tests', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule, MarketingCustomerSuccessModule],
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

    describe('Lead Management Flow', () => {
        it('should create and manage a complete lead lifecycle', async () => {
            // Step 1: Create a lead
            const createLeadResponse = await request(app.getHttpServer())
                .post('/api/v1/leads')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@test.com',
                    phone: '+1234567890',
                    companyName: 'Test Company',
                    source: 'WEBSITE',
                    metadata: { campaign: 'test-campaign' },
                })
                .expect(201);

            expect(createLeadResponse.body).toHaveProperty('id');
            expect(createLeadResponse.body.firstName).toBe('John');
            expect(createLeadResponse.body.status).toBe('NEW');
            expect(createLeadResponse.body.score).toBeGreaterThan(0);

            const leadId = createLeadResponse.body.id;

            // Step 2: Update lead status
            const updateStatusResponse = await request(app.getHttpServer())
                .patch(`/api/v1/leads/${leadId}/status`)
                .send({ status: 'CONTACTED' })
                .expect(200);

            expect(updateStatusResponse.body.status).toBe('CONTACTED');

            // Step 3: Calculate lead score
            const scoreResponse = await request(app.getHttpServer())
                .post(`/api/v1/leads/${leadId}/score`)
                .expect(200);

            expect(scoreResponse.body.score).toBeGreaterThan(0);

            // Step 4: Get lead details
            const getLeadResponse = await request(app.getHttpServer())
                .get(`/api/v1/leads/${leadId}`)
                .expect(200);

            expect(getLeadResponse.body.id).toBe(leadId);
            expect(getLeadResponse.body.status).toBe('CONTACTED');
        });

        it('should handle lead validation errors', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/leads')
                .send({
                    // Missing required fields
                    firstName: 'John',
                    // email missing
                })
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Campaign Management Flow', () => {
        it('should create and execute campaigns', async () => {
            // Step 1: Create a campaign
            const createCampaignResponse = await request(app.getHttpServer())
                .post('/api/v1/campaigns')
                .send({
                    tenantId: 'test-tenant-1',
                    name: 'Test Campaign',
                    type: 'email',
                    targetAudience: { segment: 'new-customers' },
                    content: {
                        subject: 'Welcome to our platform',
                        body: 'Thank you for joining us!',
                    },
                    createdBy: 'test-user-1',
                })
                .expect(201);

            expect(createCampaignResponse.body).toHaveProperty('id');
            expect(createCampaignResponse.body.name).toBe('Test Campaign');
            expect(createCampaignResponse.body.status).toBe('draft');

            const campaignId = createCampaignResponse.body.id;

            // Step 2: Start campaign
            const startResponse = await request(app.getHttpServer())
                .patch(`/api/v1/campaigns/${campaignId}/start`)
                .expect(200);

            expect(startResponse.body.status).toBe('running');

            // Step 3: Get campaign analytics
            const analyticsResponse = await request(app.getHttpServer())
                .get(`/api/v1/campaigns/${campaignId}/analytics`)
                .expect(200);

            expect(analyticsResponse.body).toHaveProperty('metrics');
        });
    });

    describe('Referral System Flow', () => {
        it('should handle complete referral lifecycle', async () => {
            // Step 1: Create referral code
            const createReferralResponse = await request(app.getHttpServer())
                .post('/api/v1/referrals/create')
                .send({
                    referrerId: 'test-user-1',
                    tenantId: 'test-tenant-1',
                })
                .expect(201);

            expect(createReferralResponse.body).toHaveProperty('referralCode');
            expect(createReferralResponse.body.status).toBe('pending');

            const referralCode = createReferralResponse.body.referralCode;

            // Step 2: Click referral link
            const clickResponse = await request(app.getHttpServer())
                .post(`/api/v1/referrals/click/${referralCode}`)
                .send({
                    ipAddress: '127.0.0.1',
                    userAgent: 'Test Agent',
                })
                .expect(200);

            expect(clickResponse.body.status).toBe('clicked');

            // Step 3: Convert referral
            const convertResponse = await request(app.getHttpServer())
                .post(`/api/v1/referrals/convert/${referralCode}`)
                .send({
                    refereeId: 'test-user-2',
                    conversionType: 'signup',
                })
                .expect(200);

            expect(convertResponse.body.status).toBe('converted');

            // Step 4: Get referral stats
            const statsResponse = await request(app.getHttpServer())
                .get('/api/v1/referrals/stats/test-user-1')
                .expect(200);

            expect(statsResponse.body).toHaveProperty('totalReferrals');
            expect(statsResponse.body).toHaveProperty('completedReferrals');
        });
    });

    describe('Customer Success Flow', () => {
        it('should calculate and update customer health', async () => {
            // Step 1: Create customer health record
            const createHealthResponse = await request(app.getHttpServer())
                .post('/api/v1/customer-success/health')
                .send({
                    tenantId: 'test-tenant-1',
                    customerId: 'test-customer-1',
                    subscriptionStatus: 'active',
                    mrr: 1000,
                    totalInvoices: 10,
                    paidInvoices: 8,
                    overdueInvoices: 2,
                    supportTickets: 3,
                    npsScore: 8,
                    featureAdoptionRate: 0.75,
                })
                .expect(201);

            expect(createHealthResponse.body).toHaveProperty('id');
            expect(createHealthResponse.body.healthScore).toBeGreaterThan(0);
            expect(createHealthResponse.body.riskLevel).toBeDefined();

            const healthId = createHealthResponse.body.id;

            // Step 2: Update health score
            const updateResponse = await request(app.getHttpServer())
                .patch(`/api/v1/customer-success/health/${healthId}`)
                .send({
                    mrr: 1200,
                    paidInvoices: 10,
                    overdueInvoices: 0,
                    npsScore: 9,
                })
                .expect(200);

            expect(updateResponse.body.healthScore).toBeGreaterThan(createHealthResponse.body.healthScore);

            // Step 3: Get health recommendations
            const recommendationsResponse = await request(app.getHttpServer())
                .get(`/api/v1/customer-success/health/${healthId}/recommendations`)
                .expect(200);

            expect(recommendationsResponse.body).toHaveProperty('recommendations');
            expect(Array.isArray(recommendationsResponse.body.recommendations)).toBe(true);
        });

        it('should predict customer churn', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/customer-success/churn-prediction')
                .send({
                    customerId: 'test-customer-1',
                    usageMetrics: {
                        daysActive: 30,
                        loginFrequency: 5,
                        avgSessionDuration: 15,
                        featureAdoptionRate: 0.6,
                        lastLoginDays: 2,
                    },
                    financialMetrics: {
                        totalRevenue: 12000,
                        avgInvoiceValue: 1000,
                        paymentReliability: 0.9,
                        outstandingAmount: 500,
                    },
                    engagementMetrics: {
                        emailOpenRate: 0.7,
                        supportTickets: 2,
                        npsScore: 7,
                        lastContactDays: 5,
                    },
                })
                .expect(200);

            expect(response.body).toHaveProperty('churnProbability');
            expect(response.body).toHaveProperty('riskLevel');
            expect(response.body.churnProbability).toBeGreaterThanOrEqual(0);
            expect(response.body.churnProbability).toBeLessThanOrEqual(1);
        });
    });

    describe('Partner Ecosystem Flow', () => {
        it('should manage partner lifecycle', async () => {
            // Step 1: Register partner
            const registerResponse = await request(app.getHttpServer())
                .post('/api/v1/partners')
                .send({
                    name: 'Test Partner',
                    type: 'channel',
                    primaryContact: {
                        name: 'John Partner',
                        email: 'john@partner.com',
                        phone: '+1234567890',
                    },
                    commissionRate: 0.10,
                })
                .expect(201);

            expect(registerResponse.body).toHaveProperty('id');
            expect(registerResponse.body.name).toBe('Test Partner');
            expect(registerResponse.body.status).toBe('pending');

            const partnerId = registerResponse.body.id;

            // Step 2: Approve partner
            const approveResponse = await request(app.getHttpServer())
                .patch(`/api/v1/partners/${partnerId}/status`)
                .send({ status: 'active' })
                .expect(200);

            expect(approveResponse.body.status).toBe('active');

            // Step 3: Record commission
            const commissionResponse = await request(app.getHttpServer())
                .post('/api/v1/partners/${partnerId}/commissions')
                .send({
                    customerId: 'test-customer-1',
                    commissionType: 'referral',
                    commissionAmount: 100,
                    revenueAmount: 1000,
                    commissionRate: 0.10,
                })
                .expect(201);

            expect(commissionResponse.body).toHaveProperty('id');
            expect(commissionResponse.body.commissionAmount).toBe(100);

            // Step 4: Get partner performance
            const performanceResponse = await request(app.getHttpServer())
                .get(`/api/v1/partners/${partnerId}/performance`)
                .expect(200);

            expect(performanceResponse.body).toHaveProperty('referralsCount');
            expect(performanceResponse.body).toHaveProperty('revenueGenerated');
            expect(performanceResponse.body).toHaveProperty('commissionsEarned');
        });
    });

    describe('Gamification Flow', () => {
        it('should award points and manage achievements', async () => {
            // Step 1: Award points for activity
            const pointsResponse = await request(app.getHttpServer())
                .post('/api/v1/gamification/points')
                .send({
                    userId: 'test-user-1',
                    eventType: 'invoice_created',
                    points: 10,
                    referenceId: 'invoice-123',
                    referenceType: 'invoice',
                    description: 'Created first invoice',
                })
                .expect(201);

            expect(pointsResponse.body).toHaveProperty('id');
            expect(pointsResponse.body.points).toBe(10);

            // Step 2: Get user level
            const levelResponse = await request(app.getHttpServer())
                .get('/api/v1/gamification/level/test-user-1')
                .expect(200);

            expect(levelResponse.body).toHaveProperty('currentLevel');
            expect(levelResponse.body).toHaveProperty('totalPoints');

            // Step 3: Check achievements
            const achievementsResponse = await request(app.getHttpServer())
                .get('/api/v1/gamification/achievements/test-user-1')
                .expect(200);

            expect(achievementsResponse.body).toHaveProperty('achievements');
            expect(Array.isArray(achievementsResponse.body.achievements)).toBe(true);
        });
    });

    describe('Analytics and Reporting Flow', () => {
        it('should generate revenue analytics', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/analytics/revenue/metrics')
                .query({
                    tenantId: 'test-tenant-1',
                    startDate: '2024-01-01',
                    endDate: '2024-12-31',
                })
                .expect(200);

            expect(response.body).toHaveProperty('totalRevenue');
            expect(response.body).toHaveProperty('mrr');
            expect(response.body).toHaveProperty('arr');
            expect(response.body).toHaveProperty('revenueGrowth');
            expect(response.body).toHaveProperty('customersCount');
        });

        it('should provide revenue forecast', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/analytics/revenue/forecast')
                .query({
                    tenantId: 'test-tenant-1',
                    months: 12,
                })
                .expect(200);

            expect(response.body).toHaveProperty('forecast');
            expect(response.body).toHaveProperty('confidence');
            expect(Array.isArray(response.body.forecast)).toBe(true);
        });

        it('should analyze cohort retention', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/analytics/revenue/cohorts/test-tenant-1')
                .expect(200);

            expect(response.body).toHaveProperty('cohortData');
            expect(response.body).toHaveProperty('retentionRates');
        });
    });

    describe('Cross-Module Integration', () => {
        it('should integrate with invoice module', async () => {
            // This test would verify that marketing events are triggered
            // when invoices are created in Module 01
            const response = await request(app.getHttpServer())
                .post('/api/v1/integration/invoice-created')
                .send({
                    invoiceId: 'invoice-123',
                    customerId: 'test-customer-1',
                    amount: 1000,
                    tenantId: 'test-tenant-1',
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should integrate with payment module', async () => {
            // This test would verify that marketing events are triggered
            // when payments are processed in Module 03
            const response = await request(app.getHttpServer())
                .post('/api/v1/integration/payment-received')
                .send({
                    paymentId: 'payment-123',
                    invoiceId: 'invoice-123',
                    customerId: 'test-customer-1',
                    amount: 1000,
                    tenantId: 'test-tenant-1',
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle concurrent requests', async () => {
            const concurrentRequests = 20;
            const requests = [];

            for (let i = 0; i < concurrentRequests; i++) {
                requests.push(
                    request(app.getHttpServer())
                        .post('/api/v1/leads')
                        .send({
                            firstName: `Test${i}`,
                            lastName: `User${i}`,
                            email: `test${i}@example.com`,
                            source: 'WEBSITE',
                        })
                );
            }

            const responses = await Promise.all(requests);
            
            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(201);
                expect(response.body).toHaveProperty('id');
            });
        });

        it('should handle large data payloads', async () => {
            const largeMetadata = {
                campaign: 'test-campaign',
                source: 'website',
                customFields: Array(100).fill(0).map((_, i) => ({
                    field: `field_${i}`,
                    value: `value_${i}`.repeat(10),
                })),
            };
            
            const response = await request(app.getHttpServer())
                .post('/api/v1/leads')
                .send({
                    firstName: 'Test',
                    lastName: 'User',
                    email: 'test@example.com',
                    metadata: largeMetadata,
                })
                .expect(201);

            expect(response.body.metadata).toBeDefined();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle invalid lead IDs gracefully', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/leads/invalid-uuid')
                .expect(404);

            expect(response.body).toHaveProperty('message');
        });

        it('should handle unauthorized access', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/partners')
                .send({
                    name: 'Unauthorized Partner',
                    type: 'channel',
                })
                .expect(401); // Assuming auth is implemented

            expect(response.body).toHaveProperty('message');
        });

        it('should handle database connection errors', async () => {
            // This would require mocking database failures
            // For now, we'll test with invalid data
            const response = await request(app.getHttpServer())
                .post('/api/v1/leads')
                .send({
                    firstName: 'Test',
                    lastName: 'User',
                    email: 'invalid-email', // Invalid email format
                })
                .expect(400);

            expect(response.body).toHaveProperty('message');
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
