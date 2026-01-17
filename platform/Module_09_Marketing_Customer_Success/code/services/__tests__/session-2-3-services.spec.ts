import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomerFeedbackNPSService, SurveyType } from '../customer-feedback-nps.service';
import { ExpansionOpportunityService, OpportunityType } from '../expansion-opportunity.service';
import { CommunicationHubService, CommunicationType, MessagePriority, CommunicationChannel } from '../communication-hub.service';
import { CommunityIntelligenceService } from '../community-intelligence.service';
import { SuperReferralEngine2Service } from '../super-referral-engine-2.service';

/**
 * Comprehensive Test Suite for Module 09 Session 2 & 3 Services
 * 
 * Tests all newly implemented services from the gap analysis implementation
 */

describe('Module 09 - Session 2 & 3 Services', () => {
    let feedbackService: CustomerFeedbackNPSService;
    let expansionService: ExpansionOpportunityService;
    let communicationService: CommunicationHubService;
    let communityService: CommunityIntelligenceService;
    let referralService: SuperReferralEngine2Service;
    let eventEmitter: EventEmitter2;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerFeedbackNPSService,
                ExpansionOpportunityService,
                CommunicationHubService,
                CommunityIntelligenceService,
                SuperReferralEngine2Service,
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
            ],
        }).compile();

        feedbackService = module.get<CustomerFeedbackNPSService>(CustomerFeedbackNPSService);
        expansionService = module.get<ExpansionOpportunityService>(ExpansionOpportunityService);
        communicationService = module.get<CommunicationHubService>(CommunicationHubService);
        communityService = module.get<CommunityIntelligenceService>(CommunityIntelligenceService);
        referralService = module.get<SuperReferralEngine2Service>(SuperReferralEngine2Service);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    // ========================================================================
    // CUSTOMER FEEDBACK & NPS TESTS
    // ========================================================================

    describe('CustomerFeedbackNPSService', () => {
        it('should be defined', () => {
            expect(feedbackService).toBeDefined();
        });

        it('should send NPS survey', async () => {
            const result = await feedbackService.sendSurvey(
                'tenant_001',
                'cust_001',
                SurveyType.NPS,
            );

            expect(result).toBeDefined();
            expect(result.surveyId).toBeDefined();
            expect(result.sentAt).toBeInstanceOf(Date);
            expect(result.expiresAt).toBeInstanceOf(Date);
        });

        it('should calculate NPS metrics', async () => {
            const metrics = await feedbackService.calculateNPSMetrics('tenant_001', 'month');

            expect(metrics).toBeDefined();
            expect(metrics.npsScore).toBeGreaterThanOrEqual(-100);
            expect(metrics.npsScore).toBeLessThanOrEqual(100);
            expect(['improving', 'stable', 'declining']).toContain(metrics.trend);
            expect(metrics.totalResponses).toBeGreaterThan(0);
        });

        it('should get feedback insights', async () => {
            const insights = await feedbackService.getFeedbackInsights('tenant_001');

            expect(Array.isArray(insights)).toBe(true);
            insights.forEach(insight => {
                expect(insight).toHaveProperty('type');
                expect(insight).toHaveProperty('priority');
                expect(insight).toHaveProperty('topic');
                expect(['critical', 'high', 'medium', 'low']).toContain(insight.priority);
            });
        });

        it('should get CSAT trends', async () => {
            const trends = await feedbackService.getCSATTrends('tenant_001', 6);

            expect(Array.isArray(trends)).toBe(true);
            expect(trends.length).toBe(6);
            trends.forEach(trend => {
                expect(trend).toHaveProperty('month');
                expect(trend).toHaveProperty('averageScore');
                expect(trend.averageScore).toBeGreaterThan(0);
                expect(trend.averageScore).toBeLessThanOrEqual(5);
            });
        });
    });

    // ========================================================================
    // EXPANSION OPPORTUNITY TESTS
    // ========================================================================

    describe('ExpansionOpportunityService', () => {
        it('should be defined', () => {
            expect(expansionService).toBeDefined();
        });

        it('should identify expansion opportunities', async () => {
            const opportunities = await expansionService.identifyOpportunities(
                'tenant_001',
                'cust_001',
                {
                    currentMRR: 10000,
                    currentPlan: 'standard',
                    usageMetrics: { currentUsage: 850, limit: 1000 },
                    healthScore: 85,
                    tenure: 12,
                    engagementLevel: 'high',
                },
            );

            expect(Array.isArray(opportunities)).toBe(true);
            opportunities.forEach(opp => {
                expect(opp).toHaveProperty('type');
                expect(opp).toHaveProperty('priority');
                expect(opp).toHaveProperty('estimatedMRR');
                expect(opp).toHaveProperty('probability');
                expect(opp.probability).toBeGreaterThanOrEqual(0);
                expect(opp.probability).toBeLessThanOrEqual(1);
            });
        });

        it('should calculate expansion score', async () => {
            const score = await expansionService.calculateExpansionScore('cust_001', {
                healthScore: 80,
                npsScore: 60,
                usageGrowth: 30,
                productAdoption: 75,
                supportSatisfaction: 4.5,
                paymentHistory: 'excellent',
            });

            expect(score).toBeDefined();
            expect(score.overallScore).toBeGreaterThanOrEqual(0);
            expect(score.overallScore).toBeLessThanOrEqual(100);
            expect(score).toHaveProperty('readinessScore');
            expect(score).toHaveProperty('valueScore');
            expect(score).toHaveProperty('urgencyScore');
            expect(score).toHaveProperty('bestOpportunityType');
        });

        it('should forecast renewal', async () => {
            const forecast = await expansionService.getRenewalForecast('cust_001', {
                renewalDate: new Date(Date.now() + 90 * 24 * 3600000),
                currentMRR: 5000,
                contractLength: 12,
                healthScore: 75,
                churnRisk: 0.2,
            });

            expect(forecast).toBeDefined();
            expect(forecast.renewalProbability).toBeGreaterThanOrEqual(0);
            expect(forecast.renewalProbability).toBeLessThanOrEqual(1);
            expect(forecast.expansionProbability).toBeGreaterThanOrEqual(0);
            expect(Array.isArray(forecast.actions)).toBe(true);
        });

        it('should get expansion pipeline', async () => {
            const pipeline = await expansionService.getExpansionPipeline('tenant_001');

            expect(pipeline).toBeDefined();
            expect(pipeline.totalOpportunities).toBeGreaterThan(0);
            expect(pipeline.totalValue).toBeGreaterThan(0);
            expect(pipeline).toHaveProperty('byStage');
            expect(pipeline).toHaveProperty('byType');
            expect(pipeline.conversionRate).toBeGreaterThan(0);
        });
    });

    // ========================================================================
    // COMMUNICATION HUB TESTS
    // ========================================================================

    describe('CommunicationHubService', () => {
        it('should be defined', () => {
            expect(communicationService).toBeDefined();
        });

        it('should send message with intelligent routing', async () => {
            const message = await communicationService.sendMessage('cust_001', {
                type: CommunicationType.CUSTOMER_SUCCESS,
                priority: MessagePriority.MEDIUM,
                subject: 'Test Message',
                content: 'This is a test message',
            });

            expect(message).toBeDefined();
            expect(message.id).toBeDefined();
            expect(message.customerId).toBe('cust_001');
            expect(message.type).toBe(CommunicationType.CUSTOMER_SUCCESS);
            expect(Array.isArray(message.channels)).toBe(true);
        });

        it('should get customer preferences', async () => {
            const prefs = await communicationService.getCustomerPreferences('cust_001');

            expect(prefs).toBeDefined();
            expect(prefs.customerId).toBe('cust_001');
            expect(Array.isArray(prefs.preferredChannels)).toBe(true);
            expect(Array.isArray(prefs.allowedTypes)).toBe(true);
            expect(typeof prefs.unsubscribedFromMarketing).toBe('boolean');
        });

        it('should update customer preferences', async () => {
            const updated = await communicationService.updateCustomerPreferences('cust_001', {
                preferredChannels: [CommunicationChannel.EMAIL],
                maxMessagesPerDay: 3,
            });

            expect(updated).toBeDefined();
            expect(updated.preferredChannels).toContain(CommunicationChannel.EMAIL);
            expect(updated.maxMessagesPerDay).toBe(3);
        });

        it('should get conversation history', async () => {
            const history = await communicationService.getConversationHistory('cust_001');

            expect(Array.isArray(history)).toBe(true);
            history.forEach(thread => {
                expect(thread).toHaveProperty('id');
                expect(thread).toHaveProperty('messages');
                expect(Array.isArray(thread.messages)).toBe(true);
            });
        });

        it('should get communication analytics', async () => {
            const analytics = await communicationService.getCommunicationAnalytics('tenant_001');

            expect(analytics).toBeDefined();
            expect(analytics.totalMessages).toBeGreaterThan(0);
            expect(analytics.deliveryRate).toBeGreaterThan(0);
            expect(analytics.deliveryRate).toBeLessThanOrEqual(1);
            expect(analytics).toHaveProperty('byChannel');
            expect(analytics).toHaveProperty('byType');
        });

        it('should orchestrate multi-touch campaign', async () => {
            const campaign = await communicationService.orchestrateCampaign({
                name: 'Test Campaign',
                type: CommunicationType.MARKETING,
                audience: ['cust_001', 'cust_002'],
                steps: [
                    {
                        delay: 0,
                        channel: CommunicationChannel.EMAIL,
                        templateId: 'template_001',
                    },
                    {
                        delay: 86400000, // 1 day
                        channel: CommunicationChannel.SMS,
                        templateId: 'template_002',
                    },
                ],
            });

            expect(campaign).toBeDefined();
            expect(campaign.campaignId).toBeDefined();
            expect(campaign.scheduledMessages).toBe(4); // 2 customers × 2 steps
        });
    });

    // ========================================================================
    // COMMUNITY INTELLIGENCE TESTS
    // ========================================================================

    describe('CommunityIntelligenceService', () => {
        it('should be defined', () => {
            expect(communityService).toBeDefined();
        });

        it('should create discussion post', async () => {
            const post = await communityService.createPost('tenant_001', {
                authorId: 'user_001',
                title: 'Test Discussion',
                content: 'This is a test discussion post with some content for testing.',
                category: 'best_practices',
                tags: ['invoice', 'automation'],
            });

            expect(post).toBeDefined();
            expect(post.id).toBeDefined();
            expect(post.title).toBe('Test Discussion');
            expect(post.aiSummary).toBeDefined();
            expect(post.category).toBe('best_practices');
        });

        it('should submit template to marketplace', async () => {
            const template = await communityService.submitTemplate({
                creatorId: 'user_001',
                name: 'Test Template',
                description: 'A test template',
                category: 'invoice',
                templateData: { content: 'Template content here' },
            });

            expect(template).toBeDefined();
            expect(template.id).toBeDefined();
            expect(template.name).toBe('Test Template');
            expect(template.downloadCount).toBe(0);
            expect(template.isCertified).toBe(false);
        });

        it('should find peer matches', async () => {
            const matches = await communityService.findPeerMatches('user_001', {
                lookingFor: 'mentoring',
                expertiseAreas: ['invoice_management'],
            });

            expect(Array.isArray(matches)).toBe(true);
            matches.forEach(match => {
                expect(match).toHaveProperty('matchScore');
                expect(match.matchScore).toBeGreaterThan(0);
                expect(match.matchScore).toBeLessThanOrEqual(100);
                expect(match).toHaveProperty('connectionType');
            });
        });

        it('should get trending topics', async () => {
            const trending = await communityService.getTrendingTopics('week');

            expect(Array.isArray(trending)).toBe(true);
            trending.forEach(topic => {
                expect(topic).toHaveProperty('topic');
                expect(topic).toHaveProperty('trendScore');
                expect(topic.trendScore).toBeGreaterThan(0);
            });
        });

        it('should get top contributors', async () => {
            const contributors = await communityService.getTopContributors('month', 10);

            expect(Array.isArray(contributors)).toBe(true);
            expect(contributors.length).toBeLessThanOrEqual(10);
            contributors.forEach(profile => {
                expect(profile).toHaveProperty('expertiseScore');
                expect(profile).toHaveProperty('contributionCount');
                expect(profile.expertiseScore).toBeGreaterThan(0);
            });
        });

        it('should get community analytics', async () => {
            const analytics = await communityService.getCommunityAnalytics();

            expect(analytics).toBeDefined();
            expect(analytics.totalPosts).toBeGreaterThan(0);
            expect(analytics.totalTemplates).toBeGreaterThan(0);
            expect(analytics.avgEngagement).toBeGreaterThan(0);
            expect(analytics.avgEngagement).toBeLessThanOrEqual(1);
        });
    });

    // ========================================================================
    // SUPER REFERRAL ENGINE 2.0 TESTS
    // ========================================================================

    describe('SuperReferralEngine2Service', () => {
        it('should be defined', () => {
            expect(referralService).toBeDefined();
        });

        it('should send referral with dynamic incentives', async () => {
            const invite = await referralService.sendReferral(
                'user_001',
                {
                    email: 'referred@example.com',
                    name: 'Test User',
                    company: 'Test Corp',
                },
                {
                    referrerLTV: 150000,
                    referredCompanySize: 'medium',
                    industryMatch: true,
                    timeUrgency: 'high',
                },
            );

            expect(invite).toBeDefined();
            expect(invite.id).toBeDefined();
            expect(invite.referrerId).toBe('user_001');
            expect(invite.referredEmail).toBe('referred@example.com');
            expect(invite.potentialReward).toBeGreaterThan(0);
            expect(invite.status).toBe('sent');
        });

        it('should calculate dynamic rewards', async () => {
            const reward = await referralService.calculateDynamicReward('user_001', {
                referrerLTV: 200000,
                referredCompanySize: 'large',
                industryMatch: true,
                timeUrgency: 'high',
                competitiveThreat: true,
            });

            expect(reward).toBeDefined();
            expect(reward.baseReward).toBe(500);
            expect(reward.totalReward).toBeGreaterThan(reward.baseReward);
            expect(Array.isArray(reward.bonuses)).toBe(true);
            expect(reward.bonuses.length).toBeGreaterThan(0);
        });

        it('should get ambassador dashboard', async () => {
            const dashboard = await referralService.getAmbassadorDashboard('user_001');

            expect(dashboard).toBeDefined();
            expect(dashboard.userId).toBe('user_001');
            expect(dashboard.totalReferrals).toBeGreaterThan(0);
            expect(dashboard.performanceScore).toBeGreaterThanOrEqual(0);
            expect(dashboard.performanceScore).toBeLessThanOrEqual(100);
            expect(['standard', 'ambassador', 'enterprise']).toContain(dashboard.currentTier);
        });

        it('should get AI-powered referral suggestions', async () => {
            const suggestions = await referralService.getSuggestedReferrals('user_001');

            expect(Array.isArray(suggestions)).toBe(true);
            suggestions.forEach(suggestion => {
                expect(suggestion).toHaveProperty('contact');
                expect(suggestion).toHaveProperty('matchScore');
                expect(suggestion).toHaveProperty('potentialReward');
                expect(suggestion).toHaveProperty('reasoning');
                expect(suggestion.matchScore).toBeGreaterThan(0);
                expect(suggestion.matchScore).toBeLessThanOrEqual(100);
            });
        });

        it('should generate social share content', async () => {
            const share = await referralService.generateSocialShare('user_001', 'linkedin');

            expect(share).toBeDefined();
            expect(share.platform).toBe('linkedin');
            expect(share.message).toBeDefined();
            expect(share.shareLink).toContain('user_001');
        });

        it('should get referral leaderboard', async () => {
            const leaderboard = await referralService.getLeaderboard('month', 10);

            expect(Array.isArray(leaderboard)).toBe(true);
            expect(leaderboard.length).toBeLessThanOrEqual(10);
            leaderboard.forEach((leader, index) => {
                expect(leader.rank).toBe(index + 1);
                expect(leader).toHaveProperty('referrals');
                expect(leader).toHaveProperty('earnings');
            });
        });
    });

    // ========================================================================
    // INTEGRATION TESTS
    // ========================================================================

    describe('Cross-Service Integration', () => {
        it('should integrate feedback with expansion opportunities', async () => {
            // High NPS customer should be good expansion candidate
            const feedback = await feedbackService.calculateNPSMetrics('tenant_001', 'month');

            if (feedback.npsScore > 50) {
                const opportunities = await expansionService.identifyOpportunities(
                    'tenant_001',
                    'cust_001',
                    {
                        currentMRR: 10000,
                        currentPlan: 'standard',
                        usageMetrics: {},
                        healthScore: 85,
                        tenure: 12,
                        engagementLevel: 'high',
                    },
                );

                expect(opportunities.length).toBeGreaterThan(0);
            }
        });

        it('should use communication hub for expansion campaigns', async () => {
            const opportunities = await expansionService.identifyOpportunities(
                'tenant_001',
                'cust_001',
                {
                    currentMRR: 10000,
                    currentPlan: 'standard',
                    usageMetrics: { currentUsage: 900, limit: 1000 },
                    healthScore: 80,
                    tenure: 6,
                    engagementLevel: 'high',
                },
            );

            if (opportunities.length > 0) {
                const message = await communicationService.sendMessage('cust_001', {
                    type: CommunicationType.EXPANSION,
                    priority: MessagePriority.HIGH,
                    subject: 'Upgrade Opportunity',
                    content: `We noticed you're at ${(900 / 1000 * 100)}% capacity...`,
                });

                expect(message).toBeDefined();
            }
        });

        it('should integrate community contributions with referral bonuses', async () => {
            // Create community post
            const post = await communityService.createPost('tenant_001', {
                authorId: 'user_001',
                title: 'How I Reduced DSO by 30%',
                content: 'Sharing my experience with automated reminders...',
                category: 'best_practices',
            });

            // Active community member should get referral bonus
            const reward = await referralService.calculateDynamicReward('user_001', {
                referrerLTV: 100000,
            });

            expect(post).toBeDefined();
            expect(reward.totalReward).toBeGreaterThan(0);
        });
    });
});
