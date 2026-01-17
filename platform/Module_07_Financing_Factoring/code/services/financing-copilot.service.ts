import { Injectable, Logger, Optional } from '@nestjs/common';
import { PreQualificationService } from './pre-qualification.service';
import { ApplicationOrchestratorService } from './application-orchestrator.service';
import {
    FinancingOpportunity,
    CashFlowPrediction,
    CashFlowWeek,
    CashFlowShortfall,
    TimingSuggestion,
    AutoApplyResult,
    CopilotInsight,
    OpportunityScore,
} from '../interfaces/financing-opportunity.interfaces';

/**
 * Financing Copilot Service
 * 
 * Proactive AI assistant for financing recommendations
 * Analyzes cash flow, detects opportunities, suggests optimal timing
 */
@Injectable()
export class FinancingCopilotService {
    private readonly logger = new Logger(FinancingCopilotService.name);

    constructor(
        private readonly preQualificationService: PreQualificationService,
        private readonly applicationOrchestrator: ApplicationOrchestratorService,
        // TODO: Inject Module 01 invoice service when available
        // @Optional() private readonly invoiceService?: IInvoiceService,
    ) { }

    /**
     * Analyze and detect financing opportunities
     */
    async analyzeOpportunities(
        tenantId: string,
        userId: string,
    ): Promise<FinancingOpportunity[]> {
        this.logger.log(`Analyzing financing opportunities for tenant ${tenantId}`);

        const opportunities: FinancingOpportunity[] = [];

        try {
            // 1. Get cash flow prediction
            const cashFlow = await this.predictCashFlow(tenantId, 8); // 8 weeks

            // 2. Detect shortfall opportunities
            const shortfallOpps = await this.detectShortfallOpportunities(
                cashFlow,
                tenantId,
                userId,
            );
            opportunities.push(...shortfallOpps);

            // 3. Detect invoice financing opportunities
            const invoiceOpps = await this.detectInvoiceOpportunities(
                tenantId,
                userId,
            );
            opportunities.push(...invoiceOpps);

            // 4. Detect growth opportunities
            const growthOpps = await this.detectGrowthOpportunities(
                tenantId,
                userId,
                cashFlow,
            );
            opportunities.push(...growthOpps);

            // 5. Score and rank opportunities
            for (const opp of opportunities) {
                opp.score = await this.scoreOpportunity(opp, tenantId, userId);
            }

            opportunities.sort((a, b) => b.score - a.score);

            this.logger.log(`Found ${opportunities.length} financing opportunities`);

            return opportunities;
        } catch (error: any) {
            this.logger.error(`Failed to analyze opportunities: ${error?.message || error}`);
            return [];
        }
    }

    /**
     * Predict cash flow for coming weeks
     */
    async predictCashFlow(
        tenantId: string,
        weeks: number = 8,
    ): Promise<CashFlowPrediction> {
        this.logger.log(`Predicting cash flow for ${weeks} weeks`);

        // TODO: Get real data from Module 01
        // For now, generate mock prediction

        const startDate = new Date();
        const weeklyData: CashFlowWeek[] = [];
        const shortfalls: CashFlowShortfall[] = [];

        let cumulativeBalance = 500000; // Starting balance

        for (let i = 0; i < weeks; i++) {
            const weekStart = new Date(startDate);
            weekStart.setDate(weekStart.getDate() + i * 7);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            // Simulate cash flow
            const inflow = 300000 + Math.random() * 200000;
            const outflow = 250000 + Math.random() * 300000;
            const netFlow = inflow - outflow;
            cumulativeBalance += netFlow;

            const week: CashFlowWeek = {
                weekNumber: i + 1,
                startDate: weekStart,
                endDate: weekEnd,
                expectedInflow: inflow,
                expectedOutflow: outflow,
                netFlow,
                cumulativeBalance,
                receivables: inflow * 0.8,
                payables: outflow * 0.9,
                other: inflow * 0.2 - outflow * 0.1,
                confidence: 90 - i * 5, // Decreases with time
                riskLevel: cumulativeBalance < 100000 ? 'high' : cumulativeBalance < 300000 ? 'medium' : 'low',
            };

            weeklyData.push(week);

            // Detect shortfalls
            if (cumulativeBalance < 100000) {
                shortfalls.push({
                    weekNumber: i + 1,
                    date: weekStart,
                    amount: 100000 - cumulativeBalance,
                    severity: cumulativeBalance < 50000 ? 'critical' : cumulativeBalance < 80000 ? 'severe' : 'moderate',
                    recommendedActions: [
                        'Apply for working capital financing',
                        'Accelerate receivables collection',
                        'Defer non-essential payments',
                    ],
                    affectedPayments: ['Vendor payments', 'Employee salaries'],
                    potentialPenalties: (100000 - cumulativeBalance) * 0.02,
                });
            }
        }

        const totalInflow = weeklyData.reduce((sum, w) => sum + w.expectedInflow, 0);
        const totalOutflow = weeklyData.reduce((sum, w) => sum + w.expectedOutflow, 0);

        return {
            tenantId,
            weeks: weeklyData,
            totalInflow,
            totalOutflow,
            netCashFlow: totalInflow - totalOutflow,
            shortfalls,
            surpluses: [], // TODO: Detect surpluses
            confidence: 80,
            basedOn: 'Historical transactions and pending invoices',
            predictedAt: new Date(),
            predictedFor: {
                startDate,
                endDate: new Date(startDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000),
            },
        };
    }

    /**
     * Detect shortfall-based opportunities
     */
    private async detectShortfallOpportunities(
        cashFlow: CashFlowPrediction,
        tenantId: string,
        userId: string,
    ): Promise<FinancingOpportunity[]> {
        const opportunities: FinancingOpportunity[] = [];

        for (const shortfall of cashFlow.shortfalls) {
            if (shortfall.severity === 'minor') continue;

            const amount = Math.ceil(shortfall.amount / 100000) * 100000; // Round up to nearest 1L

            opportunities.push({
                id: `opp-shortfall-${shortfall.weekNumber}`,
                type: 'preventive_financing',
                score: 0, // Will be calculated
                approvalProbability: 0, // Will be calculated
                roi: ((shortfall.potentialPenalties || 0) / amount) * 100,
                urgency: shortfall.severity === 'critical' ? 'immediate' : shortfall.severity === 'severe' ? 'within_week' : 'within_month',
                recommendedAmount: amount,
                estimatedRate: 16,
                estimatedTenure: 3, // months
                recommendation: `Avoid cash shortfall in week ${shortfall.weekNumber}`,
                reasoning: [
                    `Cash balance projected to fall to ₹${(cashFlow.weeks[shortfall.weekNumber - 1]?.cumulativeBalance || 0).toFixed(0)}`,
                    `Potential late payment penalties: ₹${(shortfall.potentialPenalties || 0).toFixed(0)}`,
                    `${shortfall.affectedPayments.length} critical payments at risk`,
                ],
                benefits: [
                    'Avoid late payment penalties',
                    'Maintain vendor relationships',
                    'Ensure business continuity',
                ],
                risks: [
                    'Interest cost',
                    'Repayment obligation',
                ],
                optimalApplicationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week before
                canAutoApply: shortfall.severity !== 'critical', // Don't auto-apply critical cases
                oneClickApply: true,
                requiresDocuments: false,
                triggeredBy: 'cash_flow_analysis',
                detectedAt: new Date(),
                createdBy: 'copilot_ai',
            });
        }

        return opportunities;
    }

    /**
     * Detect invoice financing opportunities
     */
    private async detectInvoiceOpportunities(
        tenantId: string,
        userId: string,
    ): Promise<FinancingOpportunity[]> {
        // TODO: Get pending invoices from Module 01

        // Mock: No invoice opportunities for now
        return [];
    }

    /**
     * Detect growth capital opportunities
     */
    private async detectGrowthOpportunities(
        tenantId: string,
        userId: string,
        cashFlow: CashFlowPrediction,
    ): Promise<FinancingOpportunity[]> {
        const opportunities: FinancingOpportunity[] = [];

        // If strong positive cash flow, suggest growth capital
        if (cashFlow.netCashFlow > 1000000 && cashFlow.surpluses.length > 3) {
            opportunities.push({
                id: 'opp-growth-1',
                type: 'growth_capital',
                score: 0,
                approvalProbability: 0,
                roi: 15, // Estimated ROI from growth
                urgency: 'flexible',
                recommendedAmount: 2000000,
                estimatedRate: 14,
                estimatedTenure: 12,
                recommendation: 'Consider growth financing for expansion',
                reasoning: [
                    'Strong positive cash flow indicates capacity for growth investment',
                    'Current financial health supports additional financing',
                ],
                benefits: [
                    'Accelerate business growth',
                    'Invest in new opportunities',
                    'Competitive advantage',
                ],
                risks: [
                    'Higher debt load',
                    'Market conditions may change',
                ],
                optimalApplicationDate: new Date(),
                canAutoApply: false, // Growth decisions should be manual
                oneClickApply: true,
                requiresDocuments: true,
                triggeredBy: 'cash_flow_surplus',
                detectedAt: new Date(),
                createdBy: 'copilot_ai',
            });
        }

        return opportunities;
    }

    /**
     * Score opportunity quality
     */
    private async scoreOpportunity(
        opportunity: FinancingOpportunity,
        tenantId: string,
        userId: string,
    ): Promise<number> {
        // Scoring formula: weighted average
        const weights = {
            approvalProbability: 0.30,
            roi: 0.25,
            urgency: 0.25,
            termsFavorability: 0.20,
        };

        // Calculate approval probability (0-100)
        // TODO: Use pre-qualification service for real calculation
        const approvalProbability = 75; // Mock
        opportunity.approvalProbability = approvalProbability;

        // ROI score (0-100)
        const roiScore = Math.min(100, opportunity.roi * 5);

        // Urgency score (0-100)
        const urgencyScore =
            opportunity.urgency === 'immediate' ? 100 :
                opportunity.urgency === 'within_week' ? 75 :
                    opportunity.urgency === 'within_month' ? 50 : 25;

        // Terms favorability (0-100)
        const termsScore = Math.max(0, 100 - opportunity.estimatedRate * 5);

        // Weighted average
        const score =
            approvalProbability * weights.approvalProbability +
            roiScore * weights.roi +
            urgencyScore * weights.urgency +
            termsScore * weights.termsFavorability;

        return Math.round(score);
    }

    /**
     * Suggest optimal timing for financing application
     */
    async suggestOptimalTiming(
        amount: number,
        purpose: string,
    ): Promise<TimingSuggestion> {
        // Best timing: Early in month (vendors prefer this)
        const now = new Date();
        const currentDay = now.getDate();

        let optimal: Date;
        if (currentDay <= 5) {
            optimal = now; // Already early in month
        } else {
            // Next month, first week
            optimal = new Date(now.getFullYear(), now.getMonth() + 1, 3);
        }

        // Avoid: End of month, weekends, holidays
        const avoid: Date[] = [];

        return {
            optimal,
            acceptable: {
                start: new Date(optimal.getTime() - 3 * 24 * 60 * 60 * 1000),
                end: new Date(optimal.getTime() + 7 * 24 * 60 * 60 * 1000),
            },
            avoid,
            reasoning: 'Early month applications typically receive faster processing and better rates',
            factors: [
                {
                    factor: 'Time of Month',
                    impact: 'positive',
                    weight: 40,
                    description: 'Lenders process applications faster early in month',
                },
                {
                    factor: 'Cash Flow Timing',
                    impact: 'positive',
                    weight: 30,
                    description: 'Aligns with typical business payment cycles',
                },
            ],
            rateImpact: 0.5, // 0.5% better rate with optimal timing
            approvalImpact: 5, // 5% better approval probability
        };
    }

    /**
     * Auto-apply for opportunity
     */
    async autoApply(
        opportunityId: string,
        userId: string,
        tenantId: string,
    ): Promise<AutoApplyResult> {
        this.logger.log(`Auto-applying for opportunity ${opportunityId}`);

        try {
            // 1. Get opportunity (in real implementation, fetch from database)
            const opportunity = await this.getOpportunity(opportunityId);
            if (!opportunity) {
                return {
                    success: false,
                    error: 'Opportunity not found',
                    nextSteps: [],
                };
            }

            // 2. Check if auto-apply allowed
            if (!opportunity.canAutoApply) {
                return {
                    success: false,
                    error: 'Auto-apply not allowed for this opportunity',
                    nextSteps: ['Please apply manually'],
                };
            }

            // 3. Create application
            const application = await this.applicationOrchestrator.createApplication(
                tenantId,
                userId,
                {
                    financingType: opportunity.type === 'invoice_financing' ? 'invoice_financing' : 'working_capital',
                    requestedAmount: opportunity.recommendedAmount,
                    urgency: opportunity.urgency as any,
                    businessDetails: {} as any, // TODO: Get from user profile
                    preferences: {
                        autoApply: true,
                        opportunityId,
                    },
                },
            );

            // 4. Submit to partners (auction)
            // TODO: Implement auto-submission

            return {
                success: true,
                applicationId: application.id,
                partnersSubmitted: 2,
                estimatedCompletionTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                nextSteps: [
                    'Application submitted to top-rated partners',
                    'You will be notified when offers are received',
                    'Estimated completion: 24 hours',
                ],
            };
        } catch (error: any) {
            this.logger.error(`Auto-apply failed: ${error?.message || error}`);
            return {
                success: false,
                error: error?.message || 'Unknown error',
                nextSteps: ['Please try manual application'],
            };
        }
    }

    /**
     * Get opportunity by ID (mock)
     */
    private async getOpportunity(id: string): Promise<FinancingOpportunity | null> {
        // TODO: Implement real database lookup
        return null;
    }

    /**
     * Generate copilot insights
     */
    async generateInsights(
        tenantId: string,
        userId: string,
    ): Promise<CopilotInsight[]> {
        const insights: CopilotInsight[] = [];

        // Example insights
        insights.push({
            type: 'tip',
            title: 'Improve Approval Chances',
            message: 'Adding 1 more year to business history increases approval probability by 15%',
            actionable: false,
            priority: 'low',
            createdAt: new Date(),
        });

        insights.push({
            type: 'opportunity',
            title: 'Cash Shortfall Alert',
            message: 'Projected ₹1.5L shortfall in 2 weeks. Get financing now to avoid penalties.',
            actionable: true,
            action: {
                label: 'View Opportunities',
                endpoint: '/api/v1/financing/copilot/opportunities',
            },
            priority: 'high',
            createdAt: new Date(),
        });

        return insights;
    }
}
