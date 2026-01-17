/**
 * Enhanced Constraint Analysis Service
 * 
 * Implements Dr. Barnard's Theory of Constraints for SME receivables management
 * 
 * Key Features:
 * - Multi-dimensional constraint identification
 * - Weighted impact scoring algorithm
 * - Root cause analysis
 * - Constraint prioritization framework
 * - Historical trend analysis
 * - Comparative benchmarking
 * 
 * Replaces the basic SQL-only implementation with sophisticated analysis algorithms
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    IConstraint,
    IConstraintAnalysisResult,
    ConstraintType,
    ConstraintSeverity,
    ConstraintStatus,
} from '../types/orchestration.types';

// Import entities from other modules (assuming they're available)
import { Invoice } from '../../../Module_01_Invoice_Management/code/entities/invoice.entity';
import { Payment } from '../../../Module_03_Payment_Integration/code/entities/payment.entity';
import { CreditProfile } from '../../../Module_06_Credit_Scoring/code/entities/credit-profile.entity';

interface ConstraintMetrics {
    totalImpactScore: number;
    urgencyScore: number;
    trendScore: number;
    breadthScore: number;
}

interface RootCauseAnalysis {
    primaryCause: string;
    contributingFactors: string[];
    evidencePoints: string[];
}

@Injectable()
export class ConstraintAnalysisService {
    private readonly logger = new Logger(ConstraintAnalysisService.name);

    constructor(
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        @InjectRepository(CreditProfile)
        private readonly creditProfileRepository: Repository<CreditProfile>
    ) { }

    /**
     * Perform comprehensive constraint analysis for a tenant
     * Returns prioritized list of constraints with "One Thing to Focus On"
     */
    async analyzeConstraints(tenantId: string): Promise<IConstraintAnalysisResult> {
        this.logger.log(`Starting comprehensive constraint analysis for tenant: ${tenantId}`);

        const startTime = Date.now();
        const constraints: IConstraint[] = [];

        try {
            // Run all constraint analyses in parallel for performance
            const [
                cashFlowConstraints,
                collectionEfficiencyConstraints,
                creditRiskConstraints,
                operationalConstraints,
                customerSegmentConstraints,
                processConstraints,
            ] = await Promise.all([
                this.analyzeCashFlowConstraints(tenantId),
                this.analyzeCollectionEfficiencyConstraints(tenantId),
                this.analyzeCreditRiskConstraints(tenantId),
                this.analyzeOperationalConstraints(tenantId),
                this.analyzeCustomerSegmentConstraints(tenantId),
                this.analyzeProcessConstraints(tenantId),
            ]);

            // Combine all identified constraints
            constraints.push(...cashFlowConstraints);
            constraints.push(...collectionEfficiencyConstraints);
            constraints.push(...creditRiskConstraints);
            constraints.push(...operationalConstraints);
            constraints.push(...customerSegmentConstraints);
            constraints.push(...processConstraints);

            // Calculate composite impact scores with multi-dimensional weighting
            const enhancedConstraints = await this.calculateEnhancedImpactScores(tenantId, constraints);

            // Sort by composite impact score to identify primary constraint
            enhancedConstraints.sort((a, b) => b.impact_score - a.impact_score);

            // Apply Dr. Barnard's principle: Identify THE constraint (the one thing)
            const primaryConstraint = enhancedConstraints.length > 0 ? enhancedConstraints[0] : null;

            if (primaryConstraint) {
                this.logger.log(
                    `Primary constraint identified: ${primaryConstraint.constraint_type} ` +
                    `(Impact Score: ${primaryConstraint.impact_score.toFixed(2)})`
                );
            }

            const totalImpactScore = enhancedConstraints.reduce((sum, c) => sum + c.impact_score, 0);
            const analysisTime = Date.now() - startTime;

            this.logger.log(
                `Constraint analysis completed in ${analysisTime}ms. ` +
                `Found ${enhancedConstraints.length} constraints with total impact score: ${totalImpactScore.toFixed(2)}`
            );

            return {
                constraints: enhancedConstraints,
                primary_constraint: primaryConstraint,
                total_impact_score: totalImpactScore,
                analysis_timestamp: new Date(),
                data_sources: [
                    'invoices',
                    'payments',
                    'credit_profiles',
                    'customer_data',
                    'operational_metrics',
                ],
                confidence_score: this.calculateConfidenceScore(enhancedConstraints.length, analysisTime),
            };
        } catch (error) {
            this.logger.error('Constraint analysis failed', error);
            throw error;
        }
    }

    // ============================================================================
    // Cash Flow Constraint Analysis
    // ============================================================================

    private async analyzeCashFlowConstraints(tenantId: string): Promise<IConstraint[]> {
        const constraints: IConstraint[] = [];

        // Multi-dimensional cash flow analysis
        const cashFlowMetrics = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select([
                'SUM(CASE WHEN status IN (\'sent\', \'overdue\', \'partially_paid\') THEN amount_due ELSE 0 END) as total_outstanding',
                'COUNT(CASE WHEN status = \'overdue\' THEN 1 END) as overdue_count',
                'AVG(CASE WHEN status = \'overdue\' THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - due_date))/86400 ELSE 0 END) as avg_overdue_days',
                'SUM(CASE WHEN status = \'overdue\' THEN amount_due ELSE 0 END) as total_overdue_amount',
                'COUNT(DISTINCT customer_id) as affected_customers',
                'MAX(amount_due) as largest_outstanding',
                'PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY amount_due) as p90_outstanding',
            ])
            .where('invoice.tenant_id = :tenantId', { tenantId })
            .getRawOne();

        // Calculate 30-day trend
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const historicalMetrics = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(amount_due) as total_outstanding_30d_ago')
            .where('invoice.tenant_id = :tenantId', { tenantId })
            .andWhere('invoice.created_at < :thirtyDaysAgo', { thirtyDaysAgo })
            .andWhere('invoice.status IN (:...statuses)', {
                statuses: ['sent', 'overdue', 'partially_paid'],
            })
            .getRawOne();

        const currentOutstanding = parseFloat(cashFlowMetrics.total_outstanding) || 0;
        const historicalOutstanding = parseFloat(historicalMetrics.total_outstanding_30d_ago) || 0;
        const trendPercentage =
            historicalOutstanding > 0
                ? ((currentOutstanding - historicalOutstanding) / historicalOutstanding) * 100
                : 0;

        // Severity thresholds with dynamic adjustment
        const criticalThreshold = 500000;
        const highThreshold = 200000;
        const mediumThreshold = 100000;

        if (currentOutstanding > mediumThreshold || cashFlowMetrics.overdue_count > 10) {
            const severity = this.determineSeverity(
                currentOutstanding,
                criticalThreshold,
                highThreshold,
                mediumThreshold
            );

            // Calculate weighted impact score
            const impactMetrics = this.calculateConstraintMetrics({
                baseAmount: currentOutstanding,
                affectedCount: cashFlowMetrics.overdue_count,
                avgDelay: cashFlowMetrics.avg_overdue_days,
                trendPercentage,
                concentrationRisk: cashFlowMetrics.largest_outstanding / (currentOutstanding || 1),
            });

            // Root cause analysis
            const rootCauses = await this.identifyCashFlowRootCauses(
                tenantId,
                cashFlowMetrics,
                trendPercentage
            );

            constraints.push({
                tenant_id: tenantId,
                constraint_type: ConstraintType.CASH_FLOW,
                severity,
                description: this.generateCashFlowDescription(cashFlowMetrics, trendPercentage),
                impact_score: impactMetrics.totalImpactScore,
                identified_data: {
                    total_outstanding: currentOutstanding,
                    overdue_count: cashFlowMetrics.overdue_count,
                    avg_overdue_days: Math.round(cashFlowMetrics.avg_overdue_days),
                    total_overdue_amount: parseFloat(cashFlowMetrics.total_overdue_amount) || 0,
                    affected_customers: cashFlowMetrics.affected_customers,
                    largest_outstanding: cashFlowMetrics.largest_outstanding,
                    p90_outstanding: cashFlowMetrics.p90_outstanding,
                    trend_percentage: trendPercentage.toFixed(2),
                    urgency_score: impactMetrics.urgencyScore,
                    trend_score: impactMetrics.trendScore,
                },
                status: ConstraintStatus.ACTIVE,
                root_causes: rootCauses.primaryCause ? [rootCauses.primaryCause, ...rootCauses.contributingFactors] : [],
                affected_modules: ['module_01', 'module_03', 'module_06'],
                created_at: new Date(),
            });
        }

        return constraints;
    }

    // ============================================================================
    // Collection Efficiency Constraint Analysis
    // ============================================================================

    private async analyzeCollectionEfficiencyConstraints(tenantId: string): Promise<IConstraint[]> {
        const constraints: IConstraint[] = [];

        const collectionMetrics = await this.paymentRepository
            .createQueryBuilder('payment')
            .select([
                'AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400) as avg_collection_days',
                'COUNT(CASE WHEN status = \'failed\' THEN 1 END)::float * 100.0 / NULLIF(COUNT(*), 0) as failure_rate',
                'COUNT(*) as total_payments',
                'COUNT(CASE WHEN status = \'completed\' THEN 1 END) as successful_payments',
                'STDDEV(EXTRACT(EPOCH FROM (completed_at - created_at))/86400) as collection_days_std',
                'PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))/86400) as median_collection_days',
                'PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))/86400) as p90_collection_days',
            ])
            .where('payment.tenant_id = :tenantId', { tenantId })
            .andWhere('payment.created_at > CURRENT_TIMESTAMP - INTERVAL \'90 days\'')
            .getRawOne();

        const avgDays = parseFloat(collectionMetrics.avg_collection_days) || 0;
        const failureRate = parseFloat(collectionMetrics.failure_rate) || 0;
        const variability = parseFloat(collectionMetrics.collection_days_std) || 0;

        // Industry benchmark: 30 days average collection time
        const benchmarkDays = 30;
        const benchmarkExceedance = ((avgDays - benchmarkDays) / benchmarkDays) * 100;

        if (avgDays > 45 || failureRate > 5 || variability > 20) {
            const severity =
                avgDays > 60 || failureRate > 10
                    ? Constraint Severity.HIGH
                    : avgDays > 50 || failureRate > 7
                        ? ConstraintSeverity.MEDIUM
                        : ConstraintSeverity.LOW;

            const impactMetrics = this.calculateConstraintMetrics({
                baseAmount: avgDays * 1000, // Normalize to impact score scale
                affectedCount: collectionMetrics.total_payments,
                avgDelay: avgDays,
                trendPercentage: benchmarkExceedance,
                concentrationRisk: variability / avgDays,
            });

            const rootCauses = await this.identifyCollectionEfficiencyRootCauses(
                tenantId,
                collectionMetrics
            );

            constraints.push({
                tenant_id: tenantId,
                constraint_type: ConstraintType.COLLECTION_EFFICIENCY,
                severity,
                description: this.generateCollectionEfficiencyDescription(collectionMetrics, benchmarkExceedance),
                impact_score: impactMetrics.totalImpactScore,
                identified_data: {
                    avg_collection_days: Math.round(avgDays * 10) / 10,
                    median_collection_days: Math.round(collectionMetrics.median_collection_days * 10) / 10,
                    p90_collection_days: Math.round(collectionMetrics.p90_collection_days * 10) / 10,
                    failure_rate: Math.round(failureRate * 10) / 10,
                    total_payments: collectionMetrics.total_payments,
                    successful_payments: collectionMetrics.successful_payments,
                    variability: Math.round(variability * 10) / 10,
                    benchmark_exceedance_percentage: Math.round(benchmarkExceedance * 10) / 10,
                    urgency_score: impactMetrics.urgencyScore,
                },
                status: ConstraintStatus.ACTIVE,
                root_causes: rootCauses.primaryCause ? [rootCauses.primaryCause, ...rootCauses.contributingFactors] : [],
                affected_modules: ['module_02', 'module_03', 'module_05'],
                created_at: new Date(),
            });
        }

        return constraints;
    }

    // ============================================================================
    // Credit Risk Constraint Analysis
    // ============================================================================

    private async analyzeCreditRiskConstraints(tenantId: string): Promise<IConstraint[]> {
        const constraints: IConstraint[] = [];

        const creditMetrics = await this.creditProfileRepository
            .createQueryBuilder('credit')
            .select([
                'COUNT(CASE WHEN risk_level IN (\'high\', \'critical\') THEN 1 END) as high_risk_count',
                'AVG(current_score) as avg_score',
                'MIN(current_score) as min_score',
                'PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY current_score) as p25_score',
                'COUNT(*) as total_customers',
                'SUM(CASE WHEN risk_level = \'critical\' THEN credit_limit ELSE 0 END) as critical_exposure',
                'SUM(credit_limit) as total_credit_limit',
            ])
            .where('credit.tenant_id = :tenantId', { tenantId })
            .getRawOne();

        const highRiskCount = parseInt(creditMetrics.high_risk_count) || 0;
        const avgScore = parseFloat(creditMetrics.avg_score) || 700;
        const concentrationRisk =
            parseFloat(creditMetrics.critical_exposure) / (parseFloat(creditMetrics.total_credit_limit) || 1);

        // Risk thresholds
        const highRiskThreshold = 10;
        const avgScoreThreshold = 650;
        const concentrationThreshold = 0.25; // 25% of exposure in critical accounts

        if (
            highRiskCount > 5 ||
            avgScore < avgScoreThreshold ||
            concentrationRisk > concentrationThreshold
        ) {
            const severity =
                highRiskCount > highRiskThreshold || avgScore < 600 || concentrationRisk > 0.4
                    ? ConstraintSeverity.CRITICAL
                    : highRiskCount > 7 || avgScore < 620 || concentrationRisk > 0.3
                        ? ConstraintSeverity.HIGH
                        : ConstraintSeverity.MEDIUM;

            const impactMetrics = this.calculateConstraintMetrics({
                baseAmount: highRiskCount * 10000, // Proxy for risk exposure
                affectedCount: highRiskCount,
                avgDelay: 700 - avgScore, // Score gap from ideal
                trendPercentage: concentrationRisk * 100,
                concentrationRisk,
            });

            const rootCauses = await this.identifyCreditRiskRootCauses(tenantId, creditMetrics);

            constraints.push({
                tenant_id: tenantId,
                constraint_type: ConstraintType.CREDIT_RISK,
                severity,
                description: this.generateCreditRiskDescription(creditMetrics, concentrationRisk),
                impact_score: impactMetrics.totalImpactScore,
                identified_data: {
                    high_risk_count: highRiskCount,
                    avg_score: Math.round(avgScore),
                    min_score: Math.round(creditMetrics.min_score),
                    p25_score: Math.round(creditMetrics.p25_score),
                    total_customers: creditMetrics.total_customers,
                    concentration_risk_percentage: Math.round(concentrationRisk * 1000) / 10,
                    critical_exposure: parseFloat(creditMetrics.critical_exposure),
                    urgency_score: impactMetrics.urgencyScore,
                },
                status: ConstraintStatus.ACTIVE,
                root_causes: rootCauses.primaryCause ? [rootCauses.primaryCause, ...rootCauses.contributingFactors] : [],
                affected_modules: ['module_06', 'module_07', 'module_09'],
                created_at: new Date(),
            });
        }

        return constraints;
    }

    // ============================================================================
    // Operational Constraint Analysis
    // ============================================================================

    private async analyzeOperationalConstraints(tenantId: string): Promise<IConstraint[]> {
        const constraints: IConstraint[] = [];

        const operationalMetrics = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select([
                'COUNT(CASE WHEN status = \'draft\' THEN 1 END) as draft_invoices',
                'AVG(CASE WHEN sent_at IS NOT NULL THEN EXTRACT(EPOCH FROM (sent_at - created_at))/86400 ELSE NULL END) as avg_send_delay',
                'MAX(EXTRACT(EPOCH FROM (sent_at - created_at))/86400) as max_send_delay',
                'COUNT(*) as total_invoices_30d',
            ])
            .where('invoice.tenant_id = :tenantId', { tenantId })
            .andWhere('invoice.created_at > CURRENT_TIMESTAMP - INTERVAL \'30 days\'')
            .getRawOne();

        const draftCount = parseInt(operationalMetrics.draft_invoices) || 0;
        const avgDelay = parseFloat(operationalMetrics.avg_senddelay) || 0;
        const totalInvoices = parseInt(operationalMetrics.total_invoices_30d) || 1;
        const draftPercentage = (draftCount / totalInvoices) * 100;

        if (draftCount > 20 || avgDelay > 3 || draftPercentage > 15) {
            const severity =
                draftCount > 50 || avgDelay > 5
                    ? ConstraintSeverity.HIGH
                    : draftCount > 30 || avgDelay > 4
                        ? ConstraintSeverity.MEDIUM
                        : ConstraintSeverity.LOW;

            const impactMetrics = this.calculateConstraintMetrics({
                baseAmount: draftCount * 500, // Proxy for operational impact
                affectedCount: draftCount,
                avgDelay,
                trendPercentage: draftPercentage,
                concentrationRisk: 0.1,
            });

            const rootCauses = await this.identifyOperationalRootCauses(tenantId, operationalMetrics);

            constraints.push({
                tenant_id: tenantId,
                constraint_type: ConstraintType.OPERATIONAL,
                severity,
                description: this.generateOperationalDescription(operationalMetrics, draftPercentage),
                impact_score: impactMetrics.totalImpactScore,
                identified_data: {
                    draft_invoices: draftCount,
                    avg_send_delay_days: Math.round(avgDelay * 10) / 10,
                    max_send_delay_days: Math.round(operationalMetrics.max_send_delay * 10) / 10,
                    draft_percentage: Math.round(draftPercentage * 10) / 10,
                    total_invoices_30d: totalInvoices,
                    urgency_score: impactMetrics.urgencyScore,
                },
                status: ConstraintStatus.ACTIVE,
                root_causes: rootCauses.primaryCause ? [rootCauses.primaryCause, ...rootCauses.contributingFactors] : [],
                affected_modules: ['module_01', 'module_05'],
                created_at: new Date(),
            });
        }

        return constraints;
    }

    // ============================================================================
    // Customer Segment Constraint Analysis
    // ============================================================================

    private async analyzeCustomerSegmentConstraints(tenantId: string): Promise<IConstraint[]> {
        const constraints: IConstraint[] = [];

        // Analyze customer concentration risk
        const concentrationMetrics = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select([
                'customer_id',
                'SUM(amount_due) as customer_outstanding',
                'COUNT(*) as invoice_count',
            ])
            .where('invoice.tenant_id = :tenantId', { tenantId })
            .andWhere('invoice.status IN (:...statuses)', {
                statuses: ['sent', 'overdue', 'partially_paid'],
            })
            .groupBy('customer_id')
            .orderBy('customer_outstanding', 'DESC')
            .limit(10)
            .getRawMany();

        if (concentrationMetrics.length > 0) {
            const totalOutstanding = await this.invoiceRepository
                .createQueryBuilder('invoice')
                .select('SUM(amount_due) as total')
                .where('invoice.tenant_id = :tenantId', { tenantId })
                .andWhere('invoice.status IN (:...statuses)', {
                    statuses: ['sent', 'overdue', 'partially_paid'],
                })
                .getRawOne();

            const top5Concentration =
                concentrationMetrics
                    .slice(0, 5)
                    .reduce((sum, c) => sum + parseFloat(c.customer_outstanding), 0) /
                (parseFloat(totalOutstanding.total) || 1);

            // High concentration risk if top 5 customers represent > 50% of outstanding
            if (top5Concentration > 0.5) {
                const severity =
                    top5Concentration > 0.7
                        ? ConstraintSeverity.CRITICAL
                        : top5Concentration > 0.6
                            ? ConstraintSeverity.HIGH
                            : ConstraintSeverity.MEDIUM;

                const impactMetrics = this.calculateConstraintMetrics({
                    baseAmount: parseFloat(totalOutstanding.total) * top5Concentration,
                    affectedCount: 5,
                    avgDelay: 0,
                    trendPercentage: top5Concentration * 100,
                    concentrationRisk: top5Concentration,
                });

                constraints.push({
                    tenant_id: tenantId,
                    constraint_type: ConstraintType.CUSTOMER_SEGMENT,
                    severity,
                    description: `High customer concentration risk: Top 5 customers represent ${(top5Concentration * 100).toFixed(1)}% of outstanding receivables`,
                    impact_score: impactMetrics.totalImpactScore,
                    identified_data: {
                        top5_concentration_percentage: Math.round(top5Concentration * 1000) / 10,
                        top_customer_outstanding: concentrationMetrics[0].customer_outstanding,
                        total_outstanding: totalOutstanding.total,
                        urgency_score: impactMetrics.urgencyScore,
                    },
                    status: ConstraintStatus.ACTIVE,
                    root_causes: ['Customer diversification insufficient', 'Over-reliance on key accounts'],
                    affected_modules: ['module_06', 'module_09'],
                    created_at: new Date(),
                });
            }
        }

        return constraints;
    }

    // ============================================================================
    // Process Constraint Analysis
    // ============================================================================

    private async analyzeProcessConstraints(tenantId: string): Promise<IConstraint[]> {
        const constraints: IConstraint[] = [];

        // Analyze invoice-to-payment process efficiency
        const processMetrics = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .leftJoin('invoice.payments', 'payment')
            .select([
                'AVG(EXTRACT(EPOCH FROM (payment.completed_at - invoice.sent_at))/86400) as avg_invoice_to_payment_days',
                'COUNT(DISTINCT invoice.id) as invoices_with_payments',
                'COUNT(DISTINCT CASE WHEN payment.id IS NULL THEN invoice.id END) as invoices_without_payments',
            ])
            .where('invoice.tenant_id = :tenantId', { tenantId })
            .andWhere('invoice.sent_at IS NOT NULL')
            .andWhere('invoice.created_at > CURRENT_TIMESTAMP - INTERVAL \'90 days\'')
            .getRawOne();

        const avgProcessDays = parseFloat(processMetrics.avg_invoice_to_payment_days) || 0;
        const paymentRate =
            parseInt(processMetrics.invoices_with_payments) /
            (parseInt(processMetrics.invoices_with_payments) +
                parseInt(processMetrics.invoices_without_payments) || 1);

        // Industry benchmark: 45 days invoice-to-payment
        if (avgProcessDays > 60 || paymentRate < 0.7) {
            const severity =
                avgProcessDays > 90 || paymentRate < 0.5
                    ? ConstraintSeverity.HIGH
                    : avgProcessDays > 75 || paymentRate < 0.6
                        ? ConstraintSeverity.MEDIUM
                        : ConstraintSeverity.LOW;

            const impactMetrics = this.calculateConstraintMetrics({
                baseAmount: avgProcessDays * 1000,
                affectedCount: parseInt(processMetrics.invoices_without_payments),
                avgDelay: avgProcessDays,
                trendPercentage: ((1 - paymentRate) * 100),
                concentrationRisk: 0.1,
            });

            constraints.push({
                tenant_id: tenantId,
                constraint_type: ConstraintType.PROCESS,
                severity,
                description: `Inefficient invoice-to-payment process: ${Math.round(avgProcessDays)} days average, ${Math.round(paymentRate * 100)}% payment rate`,
                impact_score: impactMetrics.totalImpactScore,
                identified_data: {
                    avg_invoice_to_payment_days: Math.round(avgProcessDays * 10) / 10,
                    payment_rate_percentage: Math.round(paymentRate * 1000) / 10,
                    invoices_with_payments: processMetrics.invoices_with_payments,
                    invoices_without_payments: processMetrics.invoices_without_payments,
                    urgency_score: impactMetrics.urgencyScore,
                },
                status: ConstraintStatus.ACTIVE,
                root_causes: ['Inefficient follow-up process', 'Poor payment term optimization'],
                affected_modules: ['module_02', 'module_03', 'module_05'],
                created_at: new Date(),
            });
        }

        return constraints;
    }

    // ============================================================================
    // Helper Methods
    // ============================================================================

    /**
     * Calculate multi-dimensional impact score with sophisticated weighting
     */
    private calculateConstraintMetrics(params: {
        baseAmount: number;
        affectedCount: number;
        avgDelay: number;
        trendPercentage: number;
        concentrationRisk: number;
    }): ConstraintMetrics {
        // Normalize inputs to 0-100 scale
        const amountScore = Math.min(100, (params.baseAmount / 100000) * 20);
        const volumeScore = Math.min(100, params.affectedCount * 2);
        const urgencyScore = Math.min(100, params.avgDelay * 2);
        const trendScore = Math.min(100, Math.abs(params.trendPercentage));
        const breadthScore = Math.min(100, params.concentrationRisk * 100);

        // Weighted calculation (Theory of Constraints weighting)
        const totalImpactScore =
            amountScore * 0.30 + // Financial impact: 30%
            volumeScore * 0.20 + // Scope: 20%
            urgencyScore * 0.25 + // Time sensitivity: 25%
            trendScore * 0.15 + // Trend deterioration: 15%
            breadthScore * 0.10; // Risk concentration: 10%

        return {
            totalImpactScore,
            urgencyScore,
            trendScore,
            breadthScore,
        };
    }

    /**
     * Calculate enhanced impact scores with cross-constraint analysis
     */
    private async calculateEnhancedImpactScores(
        tenantId: string,
        constraints: IConstraint[]
    ): Promise<IConstraint[]> {
        // Apply cross-constraint multipliers (constraints that reinforce each other)
        const hasCashFlowIssue = constraints.some(c => c.constraint_type === ConstraintType.CASH_FLOW);
        const hasCreditRiskIssue = constraints.some(c => c.constraint_type === ConstraintType.CREDIT_RISK);
        const hasCollectionIssue = constraints.some(
            c => c.constraint_type === ConstraintType.COLLECTION_EFFICIENCY
        );

        return constraints.map(constraint => {
            let multiplier = 1.0;

            // Compound effect: Cash flow + Credit risk = higher overall impact
            if (constraint.constraint_type === ConstraintType.CASH_FLOW && hasCreditRiskIssue) {
                multiplier *= 1.3;
            }

            // Collection efficiency issues amplify cash flow constraints
            if (constraint.constraint_type === ConstraintType.CASH_FLOW && hasCollectionIssue) {
                multiplier *= 1.2;
            }

            // Credit risk + Collection issues = severe risk
            if (constraint.constraint_type === ConstraintType.CREDIT_RISK && hasCollectionIssue) {
                multiplier *= 1.25;
            }

            return {
                ...constraint,
                impact_score: constraint.impact_score * multiplier,
            };
        });
    }

    /**
     * Determine severity based on magnitude and thresholds
     */
    private determineSeverity(
        value: number,
        criticalThreshold: number,
        highThreshold: number,
        mediumThreshold: number
    ): ConstraintSeverity {
        if (value >= criticalThreshold) return ConstraintSeverity.CRITICAL;
        if (value >= highThreshold) return ConstraintSeverity.HIGH;
        if (value >= mediumThreshold) return ConstraintSeverity.MEDIUM;
        return ConstraintSeverity.LOW;
    }

    /**
     * Calculate confidence score based on data quality and completeness
     */
    private calculateConfidenceScore(constraintCount: number, analysisTime: number): number {
        let confidence = 100;

        // Reduce confidence if analysis was too fast (likely incomplete data)
        if (analysisTime < 1000) {
            confidence -= 20;
        }

        // Reduce confidence if no constraints found (possible data issues)
        if (constraintCount === 0) {
            confidence -= 30;
        }

        // Reduce confidence if too many constraints (may indicate noisy data)
        if (constraintCount > 10) {
            confidence -= 15;
        }

        return Math.max(0, Math.min(100, confidence));
    }

    // ============================================================================
    // Root Cause Analysis Methods
    // ============================================================================

    private async identifyCashFlowRootCauses(
        tenantId: string,
        metrics: any,
        trendPercentage: number
    ): Promise<RootCauseAnalysis> {
        const causes: string[] = [];

        if (metrics.avg_overdue_days > 45) {
            causes.push('Extended payment delays beyond industry norms');
        }

        if (trendPercentage > 20) {
            causes.push('Rapidly deteriorating collection performance');
        }

        const concentrationRisk = metrics.largest_outstanding / (metrics.total_outstanding || 1);
        if (concentrationRisk > 0.25) {
            causes.push('High concentration in largest receivable accounts');
        }

        return {
            primaryCause: causes[0] || 'Multiple small delays accumulating into cash flow pressure',
            contributingFactors: causes.slice(1),
            evidencePoints: [
                `${metrics.overdue_count} overdue invoices`,
                `Average ${Math.round(metrics.avg_overdue_days)} days overdue`,
                `${trendPercentage.toFixed(1)}% trend change`,
            ],
        };
    }

    private async identifyCollectionEfficiencyRootCauses(
        tenantId: string,
        metrics: any
    ): Promise<RootCauseAnalysis> {
        const causes: string[] = [];

        if (metrics.failure_rate > 10) {
            causes.push('High payment failure rate indicating process or system issues');
        }

        if (metrics.collection_days_std > 20) {
            causes.push('High variability in collection times suggesting inconsistent processes');
        }

        if (metrics.avg_collection_days > 60) {
            causes.push('Ineffective follow-up procedures');
        }

        return {
            primaryCause: causes[0] || 'Suboptimal collection process efficiency',
            contributingFactors: causes.slice(1),
            evidencePoints: [
                `${Math.round(metrics.failure_rate)}% failure rate`,
                `${Math.round(metrics.avg_collection_days)} days average collection time`,
            ],
        };
    }

    private async identifyCreditRiskRootCauses(
        tenantId: string,
        metrics: any
    ): Promise<RootCauseAnalysis> {
        const causes: string[] = [];

        if (metrics.avg_score < 620) {
            causes.push('Below-average customer credit quality');
        }

        if (metrics.high_risk_count > 10) {
            causes.push('Insufficient credit screening or risk management');
        }

        return {
            primaryCause: causes[0] || 'Elevated credit risk exposure',
            contributingFactors: causes.slice(1),
            evidencePoints: [
                `${metrics.high_risk_count} high-risk customers`,
                `${Math.round(metrics.avg_score)} average credit score`,
            ],
        };
    }

    private async identifyOperationalRootCauses(
        tenantId: string,
        metrics: any
    ): Promise<RootCauseAnalysis> {
        const causes: string[] = [];

        if (metrics.draft_invoices > 30) {
            causes.push('Invoice approval bottleneck or workflow inefficiency');
        }

        if (metrics.avg_send_delay > 4) {
            causes.push('Excessive delays in invoice processing');
        }

        return {
            primaryCause: causes[0] || 'Operational process bottlenecks',
            contributingFactors: causes.slice(1),
            evidencePoints: [
                `${metrics.draft_invoices} draft invoices`,
                `${Math.round(metrics.avg_send_delay * 10) / 10} days average send delay`,
            ],
        };
    }

    // ============================================================================
    // Description Generation Methods
    // ============================================================================

    private generateCashFlowDescription(metrics: any, trendPercentage: number): string {
        const outstanding = parseFloat(metrics.total_outstanding);
        const trendDirection = trendPercentage > 0 ? 'increasing' : 'decreasing';

        return (
            `Cash flow constraint: ₹${this.formatCurrency(outstanding)} outstanding across ` +
            `${metrics.overdue_count} overdue invoices (${Math.abs(trendPercentage).toFixed(1)}% ${trendDirection}). ` +
            `Average ${Math.round(metrics.avg_overdue_days)} days overdue affecting ${metrics.affected_customers} customers.`
        );
    }

    private generateCollectionEfficiencyDescription(metrics: any, benchmarkExceedance: number): string {
        return (
            `Collection efficiency constraint: ${Math.round(metrics.avg_collection_days)} days average collection time ` +
            `(${Math.round(benchmarkExceedance)}% above industry benchmark) with ${Math.round(metrics.failure_rate)}% failure rate. ` +
            `High variability indicates inconsistent processes.`
        );
    }

    private generateCreditRiskDescription(metrics: any, concentrationRisk: number): string {
        return (
            `Credit risk constraint: ${metrics.high_risk_count} high-risk customers with ` +
            `average score of ${Math.round(metrics.avg_score)}. ` +
            `${Math.round(concentrationRisk * 100)}% exposure concentrated in critical accounts.`
        );
    }

    private generateOperationalDescription(metrics: any, draftPercentage: number): string {
        return (
            `Operational constraint: ${metrics.draft_invoices} draft invoices (${Math.round(draftPercentage)}% of total) ` +
            `with ${Math.round(metrics.avg_send_delay * 10) / 10} days average send delay. ` +
            `Process bottleneck impacting cash flow timeline.`
        );
    }

    private formatCurrency(amount: number): string {
        return amount.toLocaleString('en-IN', {
            maximumFractionDigits: 0,
        });
    }
}
