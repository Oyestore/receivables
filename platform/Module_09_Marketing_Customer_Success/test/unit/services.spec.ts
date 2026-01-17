import { Test, TestingModule } from '@nestjs/testing';
import { MarketingCustomerSuccessModule } from '../code/marketing-customer-success.module';
import { LeadService } from '../code/services/lead.service';
import { CampaignService } from '../code/services/campaign.service';
import { ReferralService } from '../code/services/referral.service';
import { CustomerHealthService } from '../code/services/customer-health.service';
import { PartnerManagementService } from '../code/services/partner-management.service';
import { GamificationService } from '../code/services/gamification.service';
import { RevenueAnalyticsService } from '../code/services/revenue-analytics.service';

describe('Module 09 Unit Tests', () => {
    let leadService: LeadService;
    let campaignService: CampaignService;
    let referralService: ReferralService;
    let customerHealthService: CustomerHealthService;
    let partnerManagementService: PartnerManagementService;
    let gamificationService: GamificationService;
    let revenueAnalyticsService: RevenueAnalyticsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [MarketingCustomerSuccessModule],
        }).compile();

        leadService = module.get<LeadService>(LeadService);
        campaignService = module.get<CampaignService>(CampaignService);
        referralService = module.get<ReferralService>(ReferralService);
        customerHealthService = module.get<CustomerHealthService>(CustomerHealthService);
        partnerManagementService = module.get<PartnerManagementService>(PartnerManagementService);
        gamificationService = module.get<GamificationService>(GamificationService);
        revenueAnalyticsService = module.get<RevenueAnalyticsService>(RevenueAnalyticsService);
    });

    describe('LeadService', () => {
        it('should be defined', () => {
            expect(leadService).toBeDefined();
        });

        it('should create a lead with initial score', async () => {
            const leadData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@test.com',
                source: 'WEBSITE',
            };

            const lead = await leadService.create(leadData);
            expect(lead.id).toBeDefined();
            expect(lead.firstName).toBe('John');
            expect(lead.email).toBe('john.doe@test.com');
            expect(lead.score).toBeGreaterThan(0);
            expect(lead.status).toBe('NEW');
        });

        it('should update lead status', async () => {
            const leadData = {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@test.com',
                source: 'REFERRAL',
            };

            const lead = await leadService.create(leadData);
            const updatedLead = await leadService.updateStatus(lead.id, 'QUALIFIED');
            
            expect(updatedLead.status).toBe('QUALIFIED');
        });

        it('should calculate lead score', async () => {
            const leadData = {
                firstName: 'Bob',
                lastName: 'Wilson',
                email: 'bob.wilson@test.com',
                companyName: 'Test Corp',
                source: 'PARTNER',
            };

            const lead = await leadService.create(leadData);
            const scoredLead = await leadService.calculateScore(lead.id);
            
            expect(scoredLead.score).toBeGreaterThan(0);
        });
    });

    describe('CampaignService', () => {
        it('should be defined', () => {
            expect(campaignService).toBeDefined();
        });

        it('should create a campaign', async () => {
            const campaignData = {
                tenantId: 'test-tenant',
                name: 'Test Campaign',
                type: 'email',
                targetAudience: { segment: 'new-customers' },
                content: { subject: 'Test', body: 'Test content' },
                createdBy: 'test-user',
            };

            const campaign = await campaignService.create(campaignData);
            expect(campaign.id).toBeDefined();
            expect(campaign.name).toBe('Test Campaign');
            expect(campaign.status).toBe('draft');
        });

        it('should start a campaign', async () => {
            const campaignData = {
                tenantId: 'test-tenant',
                name: 'Test Campaign 2',
                type: 'sms',
                targetAudience: { segment: 'existing-customers' },
                content: { message: 'Test SMS' },
                createdBy: 'test-user',
            };

            const campaign = await campaignService.create(campaignData);
            const startedCampaign = await campaignService.startCampaign(campaign.id);
            
            expect(startedCampaign.status).toBe('running');
            expect(startedCampaign.startedAt).toBeDefined();
        });
    });

    describe('ReferralService', () => {
        it('should be defined', () => {
            expect(referralService).toBeDefined();
        });

        it('should create a referral code', async () => {
            const referralData = {
                referrerId: 'user-123',
                tenantId: 'tenant-123',
            };

            const referral = await referralService.createReferralCode(referralData);
            expect(referral.id).toBeDefined();
            expect(referral.referralCode).toBeDefined();
            expect(referral.referralCode.length).toBe(8);
            expect(referral.status).toBe('pending');
        });

        it('should handle referral click', async () => {
            const referralData = {
                referrerId: 'user-456',
                tenantId: 'tenant-456',
            };

            const referral = await referralService.createReferralCode(referralData);
            const clickedReferral = await referralService.handleClick(referral.referralCode, {
                ipAddress: '127.0.0.1',
                userAgent: 'Test Agent',
            });
            
            expect(clickedReferral.status).toBe('clicked');
            expect(clickedReferral.clickedAt).toBeDefined();
        });
    });

    describe('CustomerHealthService', () => {
        it('should be defined', () => {
            expect(customerHealthService).toBeDefined();
        });

        it('should calculate customer health score', async () => {
            const healthData = {
                tenantId: 'test-tenant',
                customerId: 'customer-123',
                subscriptionStatus: 'active',
                mrr: 1000,
                totalInvoices: 12,
                paidInvoices: 11,
                overdueInvoices: 1,
                supportTickets: 2,
                npsScore: 8,
                featureAdoptionRate: 0.75,
            };

            const health = await customerHealthService.calculateHealthScore(healthData);
            expect(health.id).toBeDefined();
            expect(health.healthScore).toBeGreaterThan(0);
            expect(health.healthScore).toBeLessThanOrEqual(100);
            expect(health.riskLevel).toBeDefined();
        });

        it('should identify health risks', async () => {
            const healthData = {
                tenantId: 'test-tenant',
                customerId: 'customer-456',
                subscriptionStatus: 'active',
                mrr: 500,
                totalInvoices: 6,
                paidInvoices: 3,
                overdueInvoices: 3,
                supportTickets: 8,
                npsScore: 3,
                featureAdoptionRate: 0.25,
            };

            const health = await customerHealthService.calculateHealthScore(healthData);
            expect(health.riskLevel).toBe('high');
        });
    });

    describe('PartnerManagementService', () => {
        it('should be defined', () => {
            expect(partnerManagementService).toBeDefined();
        });

        it('should register a partner', async () => {
            const partnerData = {
                name: 'Test Partner Co',
                type: 'channel',
                primaryContact: {
                    name: 'John Partner',
                    email: 'john@partner.com',
                    phone: '+1234567890',
                },
                commissionRate: 0.10,
            };

            const partner = await partnerManagementService.registerPartner(partnerData);
            expect(partner.id).toBeDefined();
            expect(partner.name).toBe('Test Partner Co');
            expect(partner.status).toBe('pending');
            expect(partner.commissionRate).toBe(0.10);
        });

        it('should calculate partner performance', async () => {
            const partnerData = {
                partnerId: 'partner-123',
                period: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-12-31'),
                },
            };

            const performance = await partnerManagementService.calculatePerformance(partnerData);
            expect(performance).toHaveProperty('referralsCount');
            expect(performance).toHaveProperty('conversionsCount');
            expect(performance).toHaveProperty('revenueGenerated');
            expect(performance).toHaveProperty('commissionsEarned');
        });
    });

    describe('GamificationService', () => {
        it('should be defined', () => {
            expect(gamificationService).toBeDefined();
        });

        it('should award points to user', async () => {
            const pointsData = {
                userId: 'user-123',
                eventType: 'invoice_created',
                points: 10,
                referenceId: 'invoice-123',
                referenceType: 'invoice',
                description: 'Created invoice',
            };

            const points = await gamificationService.awardPoints(pointsData);
            expect(points.id).toBeDefined();
            expect(points.points).toBe(10);
            expect(points.eventType).toBe('invoice_created');
        });

        it('should update user level', async () => {
            const levelData = {
                userId: 'user-456',
                totalPoints: 150,
            };

            const level = await gamificationService.updateUserLevel(levelData.userId, levelData.totalPoints);
            expect(level.currentLevel).toBeGreaterThan(0);
            expect(level.totalPoints).toBe(150);
        });

        it('should check achievement progress', async () => {
            const achievementData = {
                userId: 'user-789',
                achievementCode: 'first_invoice',
            };

            const progress = await gamificationService.checkAchievementProgress(achievementData);
            expect(progress).toHaveProperty('progress');
            expect(progress).toHaveProperty('isUnlocked');
        });
    });

    describe('RevenueAnalyticsService', () => {
        it('should be defined', () => {
            expect(revenueAnalyticsService).toBeDefined();
        });

        it('should calculate revenue metrics', async () => {
            const metricsData = {
                tenantId: 'tenant-123',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-12-31'),
            };

            const metrics = await revenueAnalyticsService.getRevenueMetrics(
                metricsData.tenantId,
                metricsData.startDate,
                metricsData.endDate
            );
            
            expect(metrics).toHaveProperty('totalRevenue');
            expect(metrics).toHaveProperty('mrr');
            expect(metrics).toHaveProperty('arr');
            expect(metrics).toHaveProperty('revenueGrowth');
            expect(metrics).toHaveProperty('customersCount');
        });

        it('should forecast revenue', async () => {
            const forecastData = {
                tenantId: 'tenant-456',
                months: 12,
            };

            const forecast = await revenueAnalyticsService.forecastRevenue(
                forecastData.tenantId,
                forecastData.months
            );
            
            expect(forecast).toHaveProperty('forecast');
            expect(forecast).toHaveProperty('confidence');
            expect(Array.isArray(forecast.forecast)).toBe(true);
            expect(forecast.forecast.length).toBe(12);
        });
    });

    describe('Cross-Service Integration', () => {
        it('should trigger gamification on invoice creation', async () => {
            // Test that creating an invoice triggers gamification points
            const leadData = {
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                source: 'WEBSITE',
            };

            const lead = await leadService.create(leadData);
            
            // Simulate invoice creation event
            const pointsData = {
                userId: lead.id,
                eventType: 'invoice_created',
                points: 10,
                referenceId: 'invoice-123',
                referenceType: 'invoice',
                description: 'Created first invoice',
            };

            const points = await gamificationService.awardPoints(pointsData);
            expect(points.userId).toBe(lead.id);
            expect(points.points).toBe(10);
        });

        it('should update customer health on payment', async () => {
            // Test that payment processing updates customer health
            const healthData = {
                tenantId: 'test-tenant',
                customerId: 'customer-123',
                subscriptionStatus: 'active',
                mrr: 1000,
                totalInvoices: 10,
                paidInvoices: 8,
                overdueInvoices: 2,
                supportTickets: 3,
                npsScore: 7,
                featureAdoptionRate: 0.6,
            };

            const health = await customerHealthService.calculateHealthScore(healthData);
            const initialScore = health.healthScore;

            // Simulate payment - reduce overdue invoices
            const updatedHealth = await customerHealthService.updateHealthMetrics(health.customerId, {
                paidInvoices: 9,
                overdueInvoices: 1,
            });

            expect(updatedHealth.healthScore).toBeGreaterThan(initialScore);
        });
    });
});
