/**
 * Strategic Recommendation Service
 * 
 * Generates strategic recommendations based on constraint analysis
 * Implements Dr. Barnard's "One Thing to Focus On" principle
 * 
 * Features:
 * - Dynamic recommendation generation (not static templates)
 * - Multi-factor impact calculation
 * - Resource requirement estimation
 * - Implementation timeline modeling
 * - Expected outcome projection
 * - Trade-off analysis
 */

import { Injectable, Logger } from '@nestjs/common';
import {
    IStrategicRecommendation,
    IConstraint,
    IActionItem,
    RecommendationType,
    RecommendationStatus,
    ConstraintType,
    ConstraintSeverity,
} from '../types/orchestration.types';

interface ImpactProjection {
    estimated_roi_percentage: number;
    implementation_timeline_days: number;
    risk_score: number;
    complexity_score: number;
}

@Injectable()
export class StrategicRecommendationService {
    private readonly logger = new Logger(StrategicRecommendationService.name);

    /**
     * Generate strategic recommendation for a constraint
     * Applies Dr. Barnard's Theory of Constraints principle
     */
    async generateRecommendation(
        tenantId: string,
        constraint: IConstraint
    ): Promise<IStrategicRecommendation> {
        this.logger.log(
            `Generating strategic recommendation for constraint: ${constraint.constraint_type} (Impact: ${constraint.impact_score.toFixed(2)})`
        );

        // Calculate impact projection
        const impactProjection = this.projectImpact(constraint);

        // Generate dynamic action items based on constraint specifics
        const actionItems = this.generateActionItems(constraint);

        // Calculate priority based on Dr. Barnard's principles
        const priority = this.calculateStrategicPriority(constraint, impactProjection);

        // Generate recommendation based on constraint type
        const recommendation = this.createRecommendation(
            tenantId,
            constraint,
            actionItems,
            impactProjection,
            priority
        );

        this.logger.log(
            `Recommendation generated: ${recommendation.title} (Priority: ${priority}/10, ROI: ${impactProjection.estimated_roi_percentage}%)`
        );

        return recommendation;
    }

    /**
     * Generate multiple recommendations with prioritization
     */
    async generateRecommendations(
        tenantId: string,
        constraints: IConstraint[]
    ): Promise<IStrategicRecommendation[]> {
        this.logger.log(`Generating recommendations for ${constraints.length} constraints`);

        const recommendations = await Promise.all(
            constraints.map(constraint => this.generateRecommendation(tenantId, constraint))
        );

        // Sort by priority (highest first)
        recommendations.sort((a, b) => b.priority - a.priority);

        // Mark top recommendation as "THE ONE THING" per Dr. Barnard
        if (recommendations.length > 0) {
            recommendations[0].description =
                `[PRIMARY FOCUS - Dr. Barnard's "One Thing"] ${recommendations[0].description}`;
        }

        return recommendations;
    }

    // ============================================================================
    // Impact Projection Methods
    // ============================================================================

    private projectImpact(constraint: IConstraint): ImpactProjection {
        const baseROI = this.calculateBaseROI(constraint);
        const timeline = this.estimateTimeline(constraint);
        const riskScore = this.assessRisk(constraint);
        const complexityScore = this.assessComplexity(constraint);

        // Adjust ROI based on risk and complexity
        const adjustedROI = baseROI * (1 - riskScore / 200) * (1 - complexityScore / 200);

        return {
            estimated_roi_percentage: Math.round(adjustedROI),
            implementation_timeline_days: timeline,
            risk_score: riskScore,
            complexity_score: complexityScore,
        };
    }

    private calculateBaseROI(constraint: IConstraint): number {
        const { constraint_type, severity, impact_score } = constraint;

        // Base ROI calculation by constraint type
        const baseROIMap: Record<ConstraintType, number> = {
            [ConstraintType.CASH_FLOW]: 150, // High ROI - direct revenue impact
            [ConstraintType.COLLECTION_EFFICIENCY]: 120,
            [ConstraintType.CREDIT_RISK]: 100, // Risk reduction ROI
            [ConstraintType.OPERATIONAL]: 80,
            [ConstraintType.CUSTOMER_SEGMENT]: 70,
            [ConstraintType.PROCESS]: 90,
            [ConstraintType.MARKET]: 60,
            [ConstraintType.RESOURCE]: 75,
        };

        let roi = baseROIMap[constraint_type] || 50;

        // Severity multiplier
        const severityMultiplier = {
            [ConstraintSeverity.CRITICAL]: 1.5,
            [ConstraintSeverity.HIGH]: 1.3,
            [ConstraintSeverity.MEDIUM]: 1.1,
            [ConstraintSeverity.LOW]: 1.0,
        };

        roi *= severityMultiplier[severity];

        // Impact score adjustment
        roi *= 1 + (impact_score / 200);

        return Math.min(300, roi); // Cap at 300%
    }

    private estimateTimeline(constraint: IConstraint): number {
        const { constraint_type, severity } = constraint;

        // Base timeline by constraint type (days)
        const baseTimelineMap: Record<ConstraintType, number> = {
            [ConstraintType.CASH_FLOW]: 30, // Can see quick wins
            [ConstraintType.COLLECTION_EFFICIENCY]: 45,
            [ConstraintType.CREDIT_RISK]: 60, // Takes time to improve credit quality
            [ConstraintType.OPERATIONAL]: 40,
            [ConstraintType.CUSTOMER_SEGMENT]: 90, // Strategic change
            [ConstraintType.PROCESS]: 50,
            [ConstraintType.MARKET]: 120, // Long-term strategic
            [ConstraintType.RESOURCE]: 60,
        };

        let timeline = baseTimelineMap[constraint_type] || 60;

        // Severity affects urgency, not timeline
        // But critical issues might get more focused resources
        if (severity === ConstraintSeverity.CRITICAL) {
            timeline *= 0.8; // Accelerated timeline for critical issues
        }

        return Math.round(timeline);
    }

    private assessRisk(constraint: IConstraint): number {
        // Risk score 0-100
        let riskScore = 30; // Base risk

        // Higher severity = lower implementation risk (clear priority)
        if (constraint.severity === ConstraintSeverity.CRITICAL) {
            riskScore -= 10;
        } else if (constraint.severity === ConstraintSeverity.LOW) {
            riskScore += 10;
        }

        // Multiple affected modules = higher coordination risk
        const moduleCount = constraint.affected_modules?.length || 1;
        riskScore += Math.min(20, moduleCount * 5);

        // Complex constraints have higher risk
        if (constraint.constraint_type === ConstraintType.PROCESS) {
            riskScore += 15;
        }

        return Math.min(100, Math.max(0, riskScore));
    }

    private assessComplexity(constraint: IConstraint): number {
        // Complexity score 0-100
        let complexityScore = 40; // Base complexity

        // Constraint type complexity
        const complexityMap: Record<ConstraintType, number> = {
            [ConstraintType.CASH_FLOW]: 30, // Straightforward - process optimization
            [ConstraintType.COLLECTION_EFFICIENCY]: 40,
            [ConstraintType.CREDIT_RISK]: 60, // Complex - requires risk modeling
            [ConstraintType.OPERATIONAL]: 50,
            [ConstraintType.CUSTOMER_SEGMENT]: 70, // Strategic complexity
            [ConstraintType.PROCESS]: 65,
            [ConstraintType.MARKET]: 80, // Highest complexity
            [ConstraintType.RESOURCE]: 45,
        };

        complexityScore = complexityMap[constraint.constraint_type] || 50;

        // More affected modules = higher complexity
        const moduleCount = constraint.affected_modules?.length || 1;
        complexityScore += Math.min(20, (moduleCount - 1) * 10);

        return Math.min(100, complexityScore);
    }

    // ============================================================================
    // Action Item Generation Methods
    // ============================================================================

    private generateActionItems(constraint: IConstraint): IActionItem[] {
        const { constraint_type, identified_data } = constraint;

        switch (constraint_type) {
            case ConstraintType.CASH_FLOW:
                return this.generateCashFlowActions(identified_data);
            case ConstraintType.COLLECTION_EFFICIENCY:
                return this.generateCollectionEfficiencyActions(identified_data);
            case ConstraintType.CREDIT_RISK:
                return this.generateCreditRiskActions(identified_data);
            case ConstraintType.OPERATIONAL:
                return this.generateOperationalActions(identified_data);
            case ConstraintType.CUSTOMER_SEGMENT:
                return this.generateCustomerSegmentActions(identified_data);
            case ConstraintType.PROCESS:
                return this.generateProcessActions(identified_data);
            default:
                return this.generateGenericActions();
        }
    }

    private generateCashFlowActions(data: Record<string, any>): IActionItem[] {
        const actions: IActionItem[] = [];

        // Priority 1: Address top overdue invoices
        if (data.overdue_count > 0) {
            const topCount = Math.min(10, Math.ceil(data.overdue_count * 0.2));
            actions.push({
                title: `Prioritize Collection of Top ${topCount} Overdue Invoices`,
                description: `Focus immediate collection efforts on the highest-value overdue invoices representing the largest portion of outstanding receivables. Use automated workflows for systematic follow-up.`,
                estimated_effort_hours: topCount * 2,
                required_resources: ['Collections Team', 'Workflow Automation'],
                expected_completion_days: 7,
            });
        }

        // Priority 2: Implement automated payment reminders
        actions.push({
            title: 'Activate Automated Payment Reminder Workflows',
            description: 'Set up multi-channel automated reminders (Email, SMS, WhatsApp) for all overdue invoices with escalation based on aging and customer risk profile.',
            estimated_effort_hours: 16,
            required_resources: ['Orchestration Module', 'Communication Module'],
            expected_completion_days: 5,
        });

        // Priority 3: Early payment incentives
        if (data.total_outstanding > 100000) {
            actions.push({
                title: 'Introduce Early Payment Discount Program',
                description: 'Offer 2-3% discount for payments within 7 days to accelerate cash collection from creditworthy customers.',
                estimated_effort_hours: 8,
                required_resources: ['Finance Team', 'Payment Module Configuration'],
                expected_completion_days: 3,
            });
        }

        // Priority 4: Tighten credit terms for high-risk customers
        if (data.avg_overdue_days > 45) {
            actions.push({
                title: 'Review and Tighten Credit Terms',
                description: 'Implement stricter payment terms (advance payment, shorter Net terms) for customers with poor payment history.',
                estimated_effort_hours: 12,
                required_resources: ['Credit Team', 'Customer Success'],
                dependencies: ['Credit risk assessment'],
                expected_completion_days: 10,
            });
        }

        return actions;
    }

    private generateCollectionEfficiencyActions(data: Record<string, any>): IActionItem[] {
        const actions: IActionItem[] = [];

        // Priority 1: Optimize communication channels
        if (data.failure_rate > 5) {
            actions.push({
                title: 'Optimize Payment Communication Channels',
                description: 'Analyze customer preferences and payment success rates by channel. Prioritize high-success channels (WhatsApp, SMS) over low-performing ones.',
                estimated_effort_hours: 20,
                required_resources: ['Analytics Module', 'Communication Module'],
                expected_completion_days: 14,
            });
        }

        // Priority 2: Streamline payment methods
        actions.push({
            title: 'Expand and Promote Easy Payment Methods',
            description: 'Ensure UPI, card, and bank transfer options are prominently displayed. Reduce payment friction by pre-filling payment details.',
            estimated_effort_hours: 16,
            required_resources: ['Payment Module', 'UI/UX Team'],
            expected_completion_days: 10,
        });

        // Priority 3: Implement follow-up SOP
        if (data.avg_collection_days > 45) {
            actions.push({
                title: 'Standardize Collection Follow-up Procedures',
                description: 'Create and enforce standard operating procedures for follow-up timing, escalation triggers, and communication templates.',
                estimated_effort_hours: 24,
                required_resources: ['Collections Team', 'Process Documentation'],
                expected_completion_days: 15,
            });
        }

        return actions;
    }

    private generateCreditRiskActions(data: Record<string, any>): IActionItem[] {
        const actions: IActionItem[] = [];

        // Priority 1: Enhance credit screening
        if (data.avg_score < 650) {
            actions.push({
                title: 'Strengthen Pre-Transaction Credit Assessment',
                description: 'Implement mandatory credit checks for new customers and periodic reviews for existing customers. Use Credit Module AI scoring.',
                estimated_effort_hours: 20,
                required_resources: ['Credit Scoring Module', 'Onboarding Team'],
                expected_completion_days: 12,
            });
        }

        // Priority 2: Review high-risk account limits
        if (data.high_risk_count > 5) {
            actions.push({
                title: `Review Credit Limits for ${data.high_risk_count} High-Risk Customers`,
                description: 'Conduct immediate review of credit limits for all high-risk customers. Consider reducing limits or requiring deposits/guarantees.',
                estimated_effort_hours: data.high_risk_count * 1.5,
                required_resources: ['Credit Team', 'Finance Team'],
                expected_completion_days: 7,
            });
        }

        // Priority 3: Diversify customer base
        if (data.concentration_risk_percentage > 50) {
            actions.push({
                title: 'Diversify Customer Portfolio',
                description: 'Develop strategy to reduce reliance on top customers. Target new customer segments to spread risk.',
                estimated_effort_hours: 40,
                required_resources: ['Sales Team', 'Marketing Module'],
                expected_completion_days: 90,
            });
        }

        return actions;
    }

    private generateOperationalActions(data: Record<string, any>): IActionItem[] {
        const actions: IActionItem[] = [];

        // Priority 1: Clear draft invoice backlog
        if (data.draft_invoices > 10) {
            actions.push({
                title: `Process ${data.draft_invoices} Draft Invoices`,
                description: 'Immediate push to review, approve, and send all draft invoices. Identify and resolve bottlenecks in approval workflow.',
                estimated_effort_hours: data.draft_invoices * 0.5,
                required_resources: ['Billing Team', 'Approvers'],
                expected_completion_days: 5,
            });
        }

        // Priority 2: Automate invoice generation
        if (data.avg_send_delay_days > 2) {
            actions.push({
                title: 'Implement Automated Invoice Generation',
                description: 'Set up invoice templates and automated generation triggers (milestone completion, delivery confirmation) to eliminate manual delays.',
                estimated_effort_hours: 32,
                required_resources: ['Invoice Module', 'Development Team'],
                expected_completion_days: 14,
            });
        }

        // Priority 3: Streamline approval workflow
        actions.push({
            title: 'Optimize Invoice Approval Workflow',
            description: 'Review and streamline approval process. Implement auto-approval for low-value invoices and parallel approval for high-value ones.',
            estimated_effort_hours: 20,
            required_resources: ['Workflow Module', 'Management'],
            expected_completion_days: 10,
        });

        return actions;
    }

    private generateCustomerSegmentActions(data: Record<string, any>): IActionItem[] {
        return [
            {
                title: 'Diversify Customer Base',
                description: `Reduce reliance on top customers (currently ${data.top5_concentration_percentage}% of receivables). Target new customer segments and industries.`,
                estimated_effort_hours: 80,
                required_resources: ['Sales Team', 'Marketing', 'Business Development'],
                expected_completion_days: 90,
            },
            {
                title: 'Establish Credit Limits for Top Customers',
                description: 'Set appropriate credit limits for largest customers to manage concentration risk while maintaining relationships.',
                estimated_effort_hours: 16,
                required_resources: ['Credit Team', 'Senior Management'],
                expected_completion_days: 14,
            },
        ];
    }

    private generateProcessActions(data: Record<string, any>): IActionItem[] {
        return [
            {
                title: 'Map and Optimize Invoice-to-Payment Process',
                description: `Current average of ${data.avg_invoice_to_payment_days} days can be reduced through process optimization and automation.`,
                estimated_effort_hours: 40,
                required_resources: ['Process Team', 'All Modules'],
                expected_completion_days: 20,
            },
            {
                title: 'Implement Workflow Automation',
                description: 'Use Orchestration Module to automate routine coordination tasks across Invoice, Communication, and Payment modules.',
                estimated_effort_hours: 60,
                required_resources: ['Orchestration Module', 'Development Team'],
                expected_completion_days: 30,
            },
        ];
    }

    private generateGenericActions(): IActionItem[] {
        return [
            {
                title: 'Conduct Detailed Root Cause Analysis',
                description: 'Perform comprehensive analysis to identify specific actions.',
                estimated_effort_hours: 16,
                required_resources: ['Analytics Team'],
                expected_completion_days: 7,
            },
        ];
    }

    //============================================================================
    // Recommendation Creation Methods
    // ============================================================================

    private createRecommendation(
        tenantId: string,
        constraint: IConstraint,
        actionItems: IActionItem[],
        impactProjection: ImpactProjection,
        priority: number
    ): IStrategicRecommendation {
        const recommendationType = this.determineRecommendationType(constraint, impactProjection);

        const title = this.generateRecommendationTitle(constraint);
        const description = this.generateRecommendationDescription(constraint, impactProjection);
        const expectedImpact = this.generateExpectedImpact(constraint, impactProjection);
        const riskFactors = this.identifyRiskFactors(impactProjection, constraint);
        const successMetrics = this.defineSuccessMetrics(constraint);

        return {
            tenant_id: tenantId,
            constraint_id: constraint.id,
            recommendation_type: recommendationType,
            title,
            description,
            expected_impact: expectedImpact,
            priority,
            action_items: actionItems,
            status: RecommendationStatus.PENDING,
            implementation_timeline_days: impactProjection.implementation_timeline_days,
            estimated_roi_percentage: impactProjection.estimated_roi_percentage,
            risk_factors: riskFactors,
            success_metrics: successMetrics,
            created_at: new Date(),
        };
    }

    private calculateStrategicPriority(
        constraint: IConstraint,
        projection: ImpactProjection
    ): number {
        // Priority scoring: 1-10 scale
        let priority = 5; // Base priority

        // Severity impact
        const severityScore = {
            [ConstraintSeverity.CRITICAL]: 4,
            [ConstraintSeverity.HIGH]: 3,
            [ConstraintSeverity.MEDIUM]: 1.5,
            [ConstraintSeverity.LOW]: 0,
        };
        priority += severityScore[constraint.severity];

        // ROI impact (higher ROI = higher priority)
        priority += (projection.estimated_roi_percentage / 100) * 2;

        // Risk adjustment (lower risk = slightly higher priority)
        priority -= (projection.risk_score / 100) * 0.5;

        // Timeline adjustment (faster results = higher priority)
        if (projection.implementation_timeline_days < 30) {
            priority += 0.5;
        }

        return Math.min(10, Math.max(1, Math.round(priority)));
    }

    private determineRecommendationType(
        constraint: IConstraint,
        projection: ImpactProjection
    ): RecommendationType {
        if (projection.implementation_timeline_days < 14) {
            return RecommendationType.IMMEDIATE_ACTION;
        } else if (projection.implementation_timeline_days < 60) {
            return RecommendationType.SHORT_TERM;
        } else if (constraint.constraint_type === ConstraintType.PROCESS) {
            return RecommendationType.PROCESS_IMPROVEMENT;
        } else if (constraint.constraint_type === ConstraintType.OPERATIONAL) {
            return RecommendationType.TECHNOLOGY_UPGRADE;
        } else {
            return RecommendationType.LONG_TERM;
        }
    }

    private generateRecommendationTitle(constraint: IConstraint): string {
        const titleMap: Record<ConstraintType, string> = {
            [ConstraintType.CASH_FLOW]: 'Improve Cash Flow Through Accelerated Collections',
            [ConstraintType.COLLECTION_EFFICIENCY]: 'Optimize Collection Process Efficiency',
            [ConstraintType.CREDIT_RISK]: 'Mitigate Credit Risk Exposure',
            [ConstraintType.OPERATIONAL]: 'Eliminate Operational Bottlenecks',
            [ConstraintType.CUSTOMER_SEGMENT]: 'Diversify Customer Portfolio',
            [ConstraintType.PROCESS]: 'Streamline Invoice-to-Payment Process',
            [ConstraintType.MARKET]: 'Adapt to Market Conditions',
            [ConstraintType.RESOURCE]: 'Optimize Resource Allocation',
        };

        return titleMap[constraint.constraint_type] || 'Address Business Constraint';
    }

    private generateRecommendationDescription(
        constraint: IConstraint,
        projection: ImpactProjection
    ): string {
        return (
            `Focus on resolving ${constraint.constraint_type} constraint to unlock significant business value. ` +
            `Based on Dr. Barnard's Theory of Constraints, addressing this bottleneck will yield ` +
            `${projection.estimated_roi_percentage}% ROI within ${projection.implementation_timeline_days} days. ` +
            `${constraint.description}`
        );
    }

    private generateExpectedImpact(
        constraint: IConstraint,
        projection: ImpactProjection
    ): string {
        const impactMap: Record<ConstraintType, string> = {
            [ConstraintType.CASH_FLOW]: `Reduce outstanding receivables by 30-40% within ${projection.implementation_timeline_days} days. Improve cash flow predictability and working capital availability.`,
            [ConstraintType.COLLECTION_EFFICIENCY]: `Reduce average collection time by 15-20 days. Increase collection success rate by 10-15%.`,
            [ConstraintType.CREDIT_RISK]: `Reduce bad debt by 40-50%. Improve customer credit quality score by 50-75 points.`,
            [ConstraintType.OPERATIONAL]: `Reduce invoice processing time by 50%. Clear draft invoice backlog within 1 week.`,
            [ConstraintType.CUSTOMER_SEGMENT]: `Reduce customer concentration risk by 20-30%. Improve revenue stability and predictability.`,
            [ConstraintType.PROCESS]: `Reduce invoice-to-payment cycle by 25-35%. Improve process reliability and consistency.`,
            [ConstraintType.MARKET]: `Improve market position and customer satisfaction. Increase competitive advantage.`,
            [ConstraintType.RESOURCE]: `Improve resource utilization by 20-30%. Reduce operational costs.`,
        };

        return impactMap[constraint.constraint_type] || 'Measurable business improvement expected.';
    }

    private identifyRiskFactors(
        projection: ImpactProjection,
        constraint: IConstraint
    ): string[] {
        const risks: string[] = [];

        if (projection.risk_score > 60) {
            risks.push('High implementation risk due to complexity');
        }

        if (projection.complexity_score > 70) {
            risks.push('Requires coordination across multiple teams and modules');
        }

        if ((constraint.affected_modules?.length || 0) > 3) {
            risks.push('Multi-module dependencies may cause integration challenges');
        }

        if (constraint.severity === ConstraintSeverity.CRITICAL) {
            risks.push('Business-critical implementation requires careful planning');
        }

        if (projection.implementation_timeline_days > 60) {
            risks.push('Long implementation timeline may reduce sustained focus');
        }

        return risks.length > 0 ? risks : ['Low risk - straightforward implementation'];
    }

    private defineSuccessMetrics(constraint: IConstraint): string[] {
        const metricsMap: Record<ConstraintType, string[]> = {
            [ConstraintType.CASH_FLOW]: [
                'Total outstanding receivables reduced by 30%+',
                'Days Sales Outstanding (DSO) improved by 15%+',
                'Overdue invoice count reduced by 40%+',
            ],
            [ConstraintType.COLLECTION_EFFICIENCY]: [
                'Average collection time reduced to <40 days',
                'Payment failure rate reduced to <5%',
                'Collection success rate increased to >85%',
            ],
            [ConstraintType.CREDIT_RISK]: [
                'High-risk customer count reduced by 50%+',
                'Average credit score improved to >650',
                'Bad debt writeoffs reduced by 40%+',
            ],
            [ConstraintType.OPERATIONAL]: [
                'Draft invoice backlog cleared within 1 week',
                'Average invoice send delay reduced to <1 day',
                'Invoice approval time reduced by 50%+',
            ],
            [ConstraintType.CUSTOMER_SEGMENT]: [
                'Top 5 customer concentration reduced to <40%',
                'New customer segment revenue >20% of total',
                'Customer diversification index improved by 30%+',
            ],
            [ConstraintType.PROCESS]: [
                'Invoice-to-payment cycle reduced to <45 days',
                'Process automation coverage >70%',
                'Manual intervention reduced by 50%+',
            ],
            [ConstraintType.MARKET]: [
                'Market share improvement measured',
                'Customer satisfaction score increased',
            ],
            [ConstraintType.RESOURCE]: [
                'Resource utilization improved by 20%+',
                'Operational cost reduced by 15%+',
            ],
        };

        return metricsMap[constraint.constraint_type] || ['Measurable improvement in relevant KPIs'];
    }
}
