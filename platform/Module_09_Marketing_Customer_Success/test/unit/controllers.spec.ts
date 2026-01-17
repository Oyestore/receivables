import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { LeadController } from '../code/controllers/lead.controller';
import { CampaignController } from '../code/controllers/campaign.controller';
import { ReferralController } from '../code/controllers/referral.controller';
import { CustomerSuccessController } from '../code/controllers/customer-success.controller';
import { PartnerApiController } from '../code/controllers/partner-api.controller';
import { GamificationController } from '../code/controllers/gamification.controller';
import { RevenueAnalyticsController } from '../code/controllers/revenue-analytics.controller';

describe('Module 09 Controller Tests', () => {
    let app: INestApplication;
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            controllers: [
                LeadController,
                CampaignController,
                ReferralController,
                CustomerSuccessController,
                PartnerApiController,
                GamificationController,
                RevenueAnalyticsController,
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('LeadController', () => {
        it('should create a new lead', async () => {
            const createLeadDto = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@test.com',
                phone: '+1234567890',
                companyName: 'Test Company',
                source: 'WEBSITE',
            };

            const response = await request(app.getHttpServer())
                .post('/api/v1/leads')
                .send(createLeadDto)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.firstName).toBe('John');
            expect(response.body.email).toBe('john.doe@test.com');
            expect(response.body.status).toBe('NEW');
        });

        it('should get all leads', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/leads')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should get a specific lead', async () => {
            // First create a lead
            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/leads')
                .send({
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane.smith@test.com',
                    source: 'REFERRAL',
                })
                .expect(201);

            const leadId = createResponse.body.id;

            // Then get the lead
            const response = await request(app.getHttpServer())
                .get(`/api/v1/leads/${leadId}`)
                .expect(200);

            expect(response.body.id).toBe(leadId);
            expect(response.body.firstName).toBe('Jane');
        });

        it('should update lead status', async () => {
            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/leads')
                .send({
                    firstName: 'Bob',
                    lastName: 'Wilson',
                    email: 'bob.wilson@test.com',
                    source: 'PARTNER',
                })
                .expect(201);

            const leadId = createResponse.body.id;

            const response = await request(app.getHttpServer())
                .patch(`/api/v1/leads/${leadId}/status`)
                .send({ status: 'QUALIFIED' })
                .expect(200);

            expect(response.body.status).toBe('QUALIFIED');
        });

        it('should calculate lead score', async () => {
            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/leads')
                .send({
                    firstName: 'Alice',
                    lastName: 'Brown',
                    email: 'alice.brown@test.com',
                    companyName: 'Big Corp',
                    source: 'CAMPAIGN',
                })
                .expect(201);

            const leadId = createResponse.body.id;

            const response = await request(app.getHttpServer())
                .post(`/api/v1/leads/${leadId}/score`)
                .expect(200);

            expect(response.body.score).toBeGreaterThan(0);
        });

        it('should handle invalid lead data', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/leads')
                .send({
                    firstName: 'Invalid',
                    // Missing required fields
                })
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('CampaignController', () => {
        it('should create a new campaign', async () => {
            const createCampaignDto = {
                tenantId: 'test-tenant-1',
                name: 'Test Campaign',
                type: 'email',
                targetAudience: { segment: 'new-customers' },
                content: {
                    subject: 'Welcome to our platform',
                    body: 'Thank you for joining us!',
                },
                createdBy: 'test-user-1',
            };

            const response = await request(app.getHttpServer())
                .post('/api/v1/campaigns')
                .send(createCampaignDto)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe('Test Campaign');
            expect(response.body.type).toBe('email');
            expect(response.body.status).toBe('draft');
        });

        it('should get campaign analytics', async () => {
            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/campaigns')
                .send({
                    tenantId: 'test-tenant-1',
                    name: 'Analytics Campaign',
                    type: 'sms',
                    targetAudience: { segment: 'existing-customers' },
                    content: { message: 'Test message' },
                    createdBy: 'test-user-1',
                })
                .expect(201);

            const campaignId = createResponse.body.id;

            const response = await request(app.getHttpServer())
                .get(`/api/v1/campaigns/${campaignId}/analytics`)
                .expect(200);

            expect(response.body).toHaveProperty('metrics');
            expect(response.body.metrics).toHaveProperty('totalSent');
            expect(response.body.metrics).toHaveProperty('totalOpened');
        });

        it('should start a campaign', async () => {
            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/campaigns')
                .send({
                    tenantId: 'test-tenant-1',
                    name: 'Start Campaign',
                    type: 'multi_channel',
                    targetAudience: { segment: 'all-customers' },
                    content: { subject: 'Test', body: 'Test' },
                    createdBy: 'test-user-1',
                })
                .expect(201);

            const campaignId = createResponse.body.id;

            const response = await request(app.getHttpServer())
                .patch(`/api/v1/campaigns/${campaignId}/start`)
                .expect(200);

            expect(response.body.status).toBe('running');
        });
    });

    describe('ReferralController', () => {
        it('should create a referral code', async () => {
            const createReferralDto = {
                referrerId: 'test-user-1',
                tenantId: 'test-tenant-1',
            };

            const response = await request(app.getHttpServer())
                .post('/api/v1/referrals/create')
                .send(createReferralDto)
                .expect(201);

            expect(response.body).toHaveProperty('referralCode');
            expect(response.body.referralCode.length).toBe(8);
            expect(response.body.status).toBe('pending');
        });

        it('should handle referral click', async () => {
            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/referrals/create')
                .send({
                    referrerId: 'test-user-2',
                    tenantId: 'test-tenant-1',
                })
                .expect(201);

            const referralCode = createResponse.body.referralCode;

            const response = await request(app.getHttpServer())
                .post(`/api/v1/referrals/click/${referralCode}`)
                .send({
                    ipAddress: '127.0.0.1',
                    userAgent: 'Test Agent',
                })
                .expect(200);

            expect(response.body.status).toBe('clicked');
        });

        it('should convert a referral', async () => {
            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/referrals/create')
                .send({
                    referrerId: 'test-user-3',
                    tenantId: 'test-tenant-1',
                })
                .expect(201);

            const referralCode = createResponse.body.referralCode;

            const response = await request(app.getHttpServer())
                .post(`/api/v1/referrals/convert/${referralCode}`)
                .send({
                    refereeId: 'test-user-4',
                    conversionType: 'signup',
                })
                .expect(200);

            expect(response.body.status).toBe('converted');
        });

        it('should get referral stats', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/referrals/stats/test-user-1')
                .expect(200);

            expect(response.body).toHaveProperty('totalReferrals');
            expect(response.body).toHaveProperty('completedReferrals');
            expect(response.body).toHaveProperty('currentTier');
        });
    });

    describe('CustomerSuccessController', () => {
        it('should calculate customer health', async () => {
            const healthDto = {
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
            };

            const response = await request(app.getHttpServer())
                .post('/api/v1/customer-success/health')
                .send(healthDto)
                .expect(201);

            expect(response.body).toHaveProperty('healthScore');
            expect(response.body).toHaveProperty('riskLevel');
            expect(response.body.healthScore).toBeGreaterThan(0);
        });

        it('should predict customer churn', async () => {
            const churnDto = {
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
            };

            const response = await request(app.getHttpServer())
                .post('/api/v1/customer-success/churn-prediction')
                .send(churnDto)
                .expect(200);

            expect(response.body).toHaveProperty('churnProbability');
            expect(response.body).toHaveProperty('riskLevel');
            expect(response.body.churnProbability).toBeGreaterThanOrEqual(0);
            expect(response.body.churnProbability).toBeLessThanOrEqual(1);
        });

        it('should get health recommendations', async () => {
            const healthResponse = await request(app.getHttpServer())
                .post('/api/v1/customer-success/health')
                .send({
                    tenantId: 'test-tenant-1',
                    customerId: 'test-customer-2',
                    subscriptionStatus: 'active',
                    mrr: 800,
                    totalInvoices: 8,
                    paidInvoices: 6,
                    overdueInvoices: 2,
                    supportTickets: 5,
                    npsScore: 5,
                    featureAdoptionRate: 0.4,
                })
                .expect(201);

            const response = await request(app.getHttpServer())
                .get(`/api/v1/customer-success/health/${healthResponse.body.id}/recommendations`)
                .expect(200);

            expect(response.body).toHaveProperty('recommendations');
            expect(Array.isArray(response.body.recommendations)).toBe(true);
        });
    });

    describe('PartnerApiController', () => {
        it('should register a new partner', async () => {
            const partnerDto = {
                name: 'Test Partner Co',
                type: 'channel',
                primaryContact: {
                    name: 'John Partner',
                    email: 'john@partner.com',
                    phone: '+1234567890',
                },
                commissionRate: 0.10,
            };

            const response = await request(app.getHttpServer())
                .post('/api/v1/partners')
                .send(partnerDto)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe('Test Partner Co');
            expect(response.body.type).toBe('channel');
            expect(response.body.status).toBe('pending');
        });

        it('should get partner performance', async () => {
            const registerResponse = await request(app.getHttpServer())
                .post('/api/v1/partners')
                .send({
                    name: 'Performance Partner',
                    type: 'affiliate',
                    primaryContact: {
                        name: 'Jane Partner',
                        email: 'jane@partner.com',
                        phone: '+1234567890',
                    },
                    commissionRate: 0.15,
                })
                .expect(201);

            const partnerId = registerResponse.body.id;

            const response = await request(app.getHttpServer())
                .get(`/api/v1/partners/${partnerId}/performance`)
                .expect(200);

            expect(response.body).toHaveProperty('referralsCount');
            expect(response.body).toHaveProperty('revenueGenerated');
            expect(response.body).toHaveProperty('commissionsEarned');
        });

        it('should record partner commission', async () => {
            const registerResponse = await request(app.getHttpServer())
                .post('/api/v1/partners')
                .send({
                    name: 'Commission Partner',
                    type: 'integration',
                    primaryContact: {
                        name: 'Bob Partner',
                        email: 'bob@partner.com',
                        phone: '+1234567890',
                    },
                    commissionRate: 0.12,
                })
                .expect(201);

            const partnerId = registerResponse.body.id;

            const commissionDto = {
                customerId: 'test-customer-1',
                commissionType: 'referral',
                commissionAmount: 100,
                revenueAmount: 1000,
                commissionRate: 0.10,
            };

            const response = await request(app.getHttpServer())
                .post(`/api/v1/partners/${partnerId}/commissions`)
                .send(commissionDto)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.commissionAmount).toBe(100);
            expect(response.body.status).toBe('pending');
        });
    });

    describe('GamificationController', () => {
        it('should award points to user', async () => {
            const pointsDto = {
                userId: 'test-user-1',
                eventType: 'invoice_created',
                points: 10,
                referenceId: 'invoice-123',
                referenceType: 'invoice',
                description: 'Created first invoice',
            };

            const response = await request(app.getHttpServer())
                .post('/api/v1/gamification/points')
                .send(pointsDto)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.points).toBe(10);
            expect(response.body.eventType).toBe('invoice_created');
        });

        it('should get user level', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/gamification/level/test-user-1')
                .expect(200);

            expect(response.body).toHaveProperty('currentLevel');
            expect(response.body).toHaveProperty('totalPoints');
            expect(response.body).toHaveProperty('pointsToNextLevel');
        });

        it('should get user achievements', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/gamification/achievements/test-user-1')
                .expect(200);

            expect(response.body).toHaveProperty('achievements');
            expect(Array.isArray(response.body.achievements)).toBe(true);
        });

        it('should get leaderboard', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/gamification/leaderboard')
                .query({ limit: 10, period: 'monthly' })
                .expect(200);

            expect(response.body).toHaveProperty('leaderboard');
            expect(Array.isArray(response.body.leaderboard)).toBe(true);
        });
    });

    describe('RevenueAnalyticsController', () => {
        it('should get revenue metrics', async () => {
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
        });

        it('should get revenue forecast', async () => {
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

        it('should get cohort analysis', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/analytics/revenue/cohorts/test-tenant-1')
                .expect(200);

            expect(response.body).toHaveProperty('cohortData');
            expect(response.body).toHaveProperty('retentionRates');
        });

        it('should get optimization opportunities', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/analytics/revenue/opportunities/test-tenant-1')
                .expect(200);

            expect(response.body).toHaveProperty('opportunities');
            expect(Array.isArray(response.body.opportunities)).toBe(true);
        });

        it('should get executive dashboard', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/analytics/revenue/dashboard/test-tenant-1')
                .expect(200);

            expect(response.body).toHaveProperty('metrics');
            expect(response.body).toHaveProperty('trends');
            expect(response.body).toHaveProperty('alerts');
        });
    });

    describe('Error Handling', () => {
        it('should handle 404 for non-existent leads', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/leads/non-existent-id')
                .expect(404);

            expect(response.body).toHaveProperty('message');
        });

        it('should handle invalid UUID format', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/leads/invalid-uuid')
                .expect(404);

            expect(response.body).toHaveProperty('message');
        });

        it('should handle validation errors', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/leads')
                .send({
                    firstName: 'Test',
                    // Missing required email field
                })
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });
    });
});
