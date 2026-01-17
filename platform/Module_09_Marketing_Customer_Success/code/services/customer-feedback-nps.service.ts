import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Customer Feedback & NPS Service
 * 
 * Gap Resolution: Phase 9.2 - Missing customer feedback collection and NPS tracking
 * 
 * Provides systematic customer feedback collection, NPS (Net Promoter Score) tracking,
 * CSAT (Customer Satisfaction) measurement, and sentiment analysis.
 */

export enum SurveyType {
    NPS = 'nps',
    CSAT = 'csat',
    CES = 'ces',                      // Customer Effort Score
    GENERAL_FEEDBACK = 'general_feedback',
    FEATURE_FEEDBACK = 'feature_feedback',
    ONBOARDING_FEEDBACK = 'onboarding_feedback',
}

export enum SurveyTrigger {
    TIME_BASED = 'time_based',        // e.g., 30 days after signup
    EVENT_BASED = 'event_based',      // e.g., after support ticket resolution
    MILESTONE_BASED = 'milestone_based', // e.g., 100th invoice
    HEALTH_SCORE = 'health_score',    // e.g., when score drops
    MANUAL = 'manual',
}

export interface SurveyDefinition {
    id: string;
    type: SurveyType;
    name: string;
    description: string;

    // Trigger configuration
    trigger: SurveyTrigger;
    triggerConditions?: {
        daysAfterEvent?: number;
        eventType?: string;
        healthScoreThreshold?: number;
        milestoneType?: string;
    };

    // Survey content
    questions: SurveyQuestion[];

    // Configuration
    active: boolean;
    frequency?: {
        maxPerCustomer: number;       // Max surveys per customer
        cooldownDays: number;         // Days between surveys
    };

    // Targeting
    targetSegment?: string;           // Optional customer segment
}

export interface SurveyQuestion {
    id: string;
    text: string;
    type: 'rating' | 'scale' | 'text' | 'multiple_choice' | 'yes_no';
    required: boolean;
    options?: string[];               // For multiple choice
    scaleMin?: number;                // For scale (e.g., 0-10 for NPS)
    scaleMax?: number;
}

export interface SurveyResponse {
    id: string;
    surveyId: string;
    customerId: string;
    userId: string;
    tenantId: string;

    // Response data
    responses: Array<{
        questionId: string;
        answer: string | number;
    }>;

    // Scores (calculated)
    npsScore?: number;                // 0-10
    npsCategory?: 'promoter' | 'passive' | 'detractor';
    csatScore?: number;               // 1-5
    cesScore?: number;                // 1-7

    // Analysis
    sentiment?: 'positive' | 'neutral' | 'negative';
    sentimentScore?: number;          // -1 to 1
    keywords?: string[];              // Extracted topics

    // Metadata
    submittedAt: Date;
    responseTimeSeconds: number;
}

export interface NPSMetrics {
    period: 'week' | 'month' | 'quarter' | 'year';
    startDate: Date;
    endDate: Date;

    // NPS calculation
    totalResponses: number;
    promoters: number;                // Score 9-10
    passives: number;                 // Score 7-8
    detractors: number;               // Score 0-6
    npsScore: number;                 // -100 to 100

    // Trends
    trend: 'improving' | 'stable' | 'declining';
    previousPeriodNPS: number;
    change: number;

    // Segmentation
    bySegment?: Map<string, number>;
    byIndustry?: Map<string, number>;
}

export interface FeedbackInsight {
    type: 'urgent_issue' | 'feature_request' | 'positive_feedback' | 'complaint';
    priority: 'critical' | 'high' | 'medium' | 'low';
    topic: string;
    description: string;
    frequency: number;                // How many customers mentioned this
    sentiment: number;                // -1 to 1
    affectedCustomers: string[];
    suggestedAction?: string;
}

@Injectable()
export class CustomerFeedbackNPSService {
    private readonly logger = new Logger(CustomerFeedbackNPSService.name);
    private readonly surveys: Map<string, SurveyDefinition> = new Map();

    constructor(
        private eventEmitter: EventEmitter2,
    ) {
        this.initializeDefaultSurveys();
    }

    /**
     * Create and send survey to customer
     */
    async sendSurvey(
        tenantId: string,
        customerId: string,
        surveyType: SurveyType,
        context?: Record<string, any>,
    ): Promise<{
        surveyId: string;
        sentAt: Date;
        expiresAt: Date;
    }> {
        const survey = this.getSurveyByType(surveyType);

        if (!survey) {
            throw new Error(`No active survey found for type: ${surveyType}`);
        }

        // Check cooldown period
        const canSend = await this.checkSurveyCooldown(customerId, surveyType);
        if (!canSend) {
            this.logger.warn(
                `Survey cooldown active for customer ${customerId}, skipping`,
            );
            return null;
        }

        // Create survey instance
        const surveyId = this.generateId();

        // Emit event for notification service (Module 11)
        this.eventEmitter.emit('survey.send', {
            surveyId,
            tenantId,
            customerId,
            surveyType,
            survey,
            context,
        });

        this.logger.log(`Survey sent: ${surveyType} to customer ${customerId}`);

        return {
            surveyId,
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 3600000), // 7 days
        };
    }

    /**
     * Process survey response
     */
    async processSurveyResponse(
        surveyId: string,
        customerId: string,
        responses: SurveyResponse['responses'],
    ): Promise<SurveyResponse> {
        const responseId = this.generateId();

        // Calculate scores based on survey type
        const scores = this.calculateScores(responses);

        // Perform sentiment analysis on text responses
        const textResponses = responses.filter(r => typeof r.answer === 'string');
        const sentimentAnalysis = await this.analyzeSentiment(textResponses);

        const surveyResponse: SurveyResponse = {
            id: responseId,
            surveyId,
            customerId,
            userId: customerId, // Simplification
            tenantId: 'tenant_001', // Should come from context
            responses,
            ...scores,
            ...sentimentAnalysis,
            submittedAt: new Date(),
            responseTimeSeconds: Math.random() * 300, // Mock
        };

        // Store response (in production: database)
        this.logger.log(
            `Survey response processed: ${surveyId} from ${customerId}, NPS: ${scores.npsScore}`,
        );

        // Emit event for further processing
        this.eventEmitter.emit('survey.response.received', surveyResponse);

        // Trigger actions based on response
        await this.triggerResponseActions(surveyResponse);

        return surveyResponse;
    }

    /**
     * Calculate NPS metrics for a period
     */
    async calculateNPSMetrics(
        tenantId: string,
        period: NPSMetrics['period'],
    ): Promise<NPSMetrics> {
        // Mock implementation - in production, query database
        const now = new Date();
        const startDate = this.getPeriodStart(period, now);

        // Mock data
        const totalResponses = Math.floor(Math.random() * 100) + 50;
        const promoters = Math.floor(totalResponses * (0.4 + Math.random() * 0.2));
        const detractors = Math.floor(totalResponses * (0.1 + Math.random() * 0.15));
        const passives = totalResponses - promoters - detractors;

        // NPS = (% Promoters) - (% Detractors)
        const npsScore = Math.round(
            ((promoters / totalResponses) * 100) - ((detractors / totalResponses) * 100),
        );

        const previousPeriodNPS = npsScore - (Math.random() * 20 - 10);

        return {
            period,
            startDate,
            endDate: now,
            totalResponses,
            promoters,
            passives,
            detractors,
            npsScore,
            trend: npsScore > previousPeriodNPS ? 'improving' :
                npsScore < previousPeriodNPS - 5 ? 'declining' : 'stable',
            previousPeriodNPS,
            change: npsScore - previousPeriodNPS,
            bySegment: new Map([
                ['enterprise', npsScore + 10],
                ['medium', npsScore],
                ['small', npsScore - 5],
            ]),
        };
    }

    /**
     * Get feedback insights and trends
     */
    async getFeedbackInsights(
        tenantId: string,
        timeframe: number = 30, // days
    ): Promise<FeedbackInsight[]> {
        // Mock implementation - in production, use NLP to analyze feedback
        const insights: FeedbackInsight[] = [
            {
                type: 'feature_request',
                priority: 'high',
                topic: 'Mobile App',
                description: 'Many customers requesting a mobile app for on-the-go invoice management',
                frequency: 23,
                sentiment: 0.6,
                affectedCustomers: ['cust_001', 'cust_002'],
                suggestedAction: 'Prioritize mobile app development in roadmap',
            },
            {
                type: 'complaint',
                priority: 'critical',
                topic: 'Payment Gateway Delays',
                description: 'Customers experiencing delays in payment processing',
                frequency: 12,
                sentiment: -0.7,
                affectedCustomers: ['cust_003', 'cust_004'],
                suggestedAction: 'Investigate payment gateway performance immediately',
            },
            {
                type: 'positive_feedback',
                priority: 'low',
                topic: 'Invoice Templates',
                description: 'Customers love the customizable invoice templates',
                frequency: 45,
                sentiment: 0.85,
                affectedCustomers: [],
                suggestedAction: 'Showcase this feature in marketing materials',
            },
            {
                type: 'urgent_issue',
                priority: 'critical',
                topic: 'Export Functionality',
                description: 'Export to Excel is failing for large datasets',
                frequency: 8,
                sentiment: -0.9,
                affectedCustomers: ['cust_005'],
                suggestedAction: 'Fix export bug immediately, notify affected customers',
            },
        ];

        return insights.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    /**
     * Get CSAT (Customer Satisfaction) trends
     */
    async getCSATTrends(
        tenantId: string,
        months: number = 6,
    ): Promise<Array<{
        month: string;
        averageScore: number;
        responseCount: number;
    }>> {
        // Mock implementation
        const trends = [];
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);

            trends.push({
                month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
                averageScore: 3.8 + Math.random() * 0.8,
                responseCount: Math.floor(Math.random() * 50) + 20,
            });
        }

        return trends;
    }

    /**
     * Trigger automated follow-ups based on feedback
     */
    async triggerFeedbackFollowup(
        surveyResponse: SurveyResponse,
    ): Promise<void> {
        // Detractors (NPS 0-6) - Immediate intervention
        if (surveyResponse.npsCategory === 'detractor') {
            this.eventEmitter.emit('feedback.detractor.detected', {
                customerId: surveyResponse.customerId,
                npsScore: surveyResponse.npsScore,
                responses: surveyResponse.responses,
            });

            this.logger.warn(
                `Detractor detected: ${surveyResponse.customerId} (NPS: ${surveyResponse.npsScore})`,
            );
        }

        // Promoters (NPS 9-10) - Request referral/testimonial
        if (surveyResponse.npsCategory === 'promoter') {
            this.eventEmitter.emit('feedback.promoter.detected', {
                customerId: surveyResponse.customerId,
                npsScore: surveyResponse.npsScore,
            });

            this.logger.log(
                `Promoter detected: ${surveyResponse.customerId} (NPS: ${surveyResponse.npsScore})`,
            );
        }

        // Negative sentiment - Alert customer success team
        if (surveyResponse.sentiment === 'negative') {
            this.eventEmitter.emit('feedback.negative.sentiment', {
                customerId: surveyResponse.customerId,
                sentiment: surveyResponse.sentimentScore,
                keywords: surveyResponse.keywords,
            });
        }
    }

    // Private helper methods

    private calculateScores(responses: SurveyResponse['responses']): {
        npsScore?: number;
        npsCategory?: 'promoter' | 'passive' | 'detractor';
        csatScore?: number;
        cesScore?: number;
    } {
        // Find NPS question (usually "How likely are you to recommend...")
        const npsResponse = responses.find(r => typeof r.answer === 'number' && r.answer >= 0 && r.answer <= 10);

        let result: any = {};

        if (npsResponse && typeof npsResponse.answer === 'number') {
            result.npsScore = npsResponse.answer;
            result.npsCategory = npsResponse.answer >= 9 ? 'promoter' :
                npsResponse.answer >= 7 ? 'passive' : 'detractor';
        }

        // CSAT (1-5 scale)
        const csatResponse = responses.find(r => typeof r.answer === 'number' && r.answer >= 1 && r.answer <= 5);
        if (csatResponse && typeof csatResponse.answer === 'number') {
            result.csatScore = csatResponse.answer;
        }

        return result;
    }

    private async analyzeSentiment(
        textResponses: Array<{ questionId: string; answer: string | number }>,
    ): Promise<{
        sentiment: 'positive' | 'neutral' | 'negative';
        sentimentScore: number;
        keywords: string[];
    }> {
        if (textResponses.length === 0) {
            return {
                sentiment: 'neutral',
                sentimentScore: 0,
                keywords: [],
            };
        }

        // Simple sentiment analysis (in production: use NLP service or Deepseek R1)
        const text = textResponses.map(r => String(r.answer)).join(' ').toLowerCase();

        const positiveWords = ['great', 'excellent', 'love', 'amazing', 'best', 'fantastic', 'helpful'];
        const negativeWords = ['bad', 'poor', 'worst', 'terrible', 'hate', 'frustrating', 'difficult'];

        const positiveCount = positiveWords.filter(word => text.includes(word)).length;
        const negativeCount = negativeWords.filter(word => text.includes(word)).length;

        const sentimentScore = (positiveCount - negativeCount) / (positiveCount + negativeCount + 1);

        // Extract keywords (simple implementation)
        const words = text.split(/\s+/);
        const keywords = [...new Set(words.filter(w => w.length > 5))].slice(0, 5);

        return {
            sentiment: sentimentScore > 0.2 ? 'positive' :
                sentimentScore < -0.2 ? 'negative' : 'neutral',
            sentimentScore,
            keywords,
        };
    }

    private async triggerResponseActions(response: SurveyResponse): Promise<void> {
        // Trigger automated follow-ups
        await this.triggerFeedbackFollowup(response);

        // Update customer health score based on feedback
        this.eventEmitter.emit('feedback.health.update', {
            customerId: response.customerId,
            npsScore: response.npsScore,
            sentiment: response.sentiment,
        });
    }

    private async checkSurveyCooldown(
        customerId: string,
        surveyType: SurveyType,
    ): Promise<boolean> {
        // Mock implementation - in production, check database
        return Math.random() > 0.1; // 90% can send
    }

    private getSurveyByType(type: SurveyType): SurveyDefinition | undefined {
        return Array.from(this.surveys.values()).find(s => s.type === type && s.active);
    }

    private getPeriodStart(period: NPSMetrics['period'], now: Date): Date {
        const start = new Date(now);
        switch (period) {
            case 'week':
                start.setDate(start.getDate() - 7);
                break;
            case 'month':
                start.setMonth(start.getMonth() - 1);
                break;
            case 'quarter':
                start.setMonth(start.getMonth() - 3);
                break;
            case 'year':
                start.setFullYear(start.getFullYear() - 1);
                break;
        }
        return start;
    }

    private generateId(): string {
        return `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Initialize default surveys

    private initializeDefaultSurveys(): void {
        // NPS Survey
        this.surveys.set('nps_default', {
            id: 'nps_default',
            type: SurveyType.NPS,
            name: 'Net Promoter Score',
            description: 'Measure customer loyalty and satisfaction',
            trigger: SurveyTrigger.TIME_BASED,
            triggerConditions: {
                daysAfterEvent: 30,
            },
            questions: [
                {
                    id: 'nps_q1',
                    text: 'How likely are you to recommend our platform to a colleague or friend?',
                    type: 'scale',
                    required: true,
                    scaleMin: 0,
                    scaleMax: 10,
                },
                {
                    id: 'nps_q2',
                    text: 'What is the primary reason for your score?',
                    type: 'text',
                    required: false,
                },
            ],
            active: true,
            frequency: {
                maxPerCustomer: 4,
                cooldownDays: 90,
            },
        });

        // CSAT Survey (Post-interaction)
        this.surveys.set('csat_support', {
            id: 'csat_support',
            type: SurveyType.CSAT,
            name: 'Support Satisfaction',
            description: 'Measure satisfaction with support interactions',
            trigger: SurveyTrigger.EVENT_BASED,
            triggerConditions: {
                eventType: 'support_ticket_closed',
            },
            questions: [
                {
                    id: 'csat_q1',
                    text: 'How satisfied were you with the support you received?',
                    type: 'rating',
                    required: true,
                    scaleMin: 1,
                    scaleMax: 5,
                },
                {
                    id: 'csat_q2',
                    text: 'Any additional feedback about your support experience?',
                    type: 'text',
                    required: false,
                },
            ],
            active: true,
            frequency: {
                maxPerCustomer: 20,
                cooldownDays: 7,
            },
        });

        // Onboarding Feedback
        this.surveys.set('onboarding_feedback', {
            id: 'onboarding_feedback',
            type: SurveyType.ONBOARDING_FEEDBACK,
            name: 'Onboarding Experience',
            description: 'Gather feedback on the onboarding process',
            trigger: SurveyTrigger.MILESTONE_BASED,
            triggerConditions: {
                milestoneType: 'onboarding_complete',
            },
            questions: [
                {
                    id: 'onb_q1',
                    text: 'How easy was it to get started with our platform?',
                    type: 'scale',
                    required: true,
                    scaleMin: 1,
                    scaleMax: 7,
                },
                {
                    id: 'onb_q2',
                    text: 'What could we improve about the onboarding experience?',
                    type: 'text',
                    required: false,
                },
            ],
            active: true,
            frequency: {
                maxPerCustomer: 1,
                cooldownDays: 365,
            },
        });

        this.logger.log(`Initialized ${this.surveys.size} default surveys`);
    }
}
