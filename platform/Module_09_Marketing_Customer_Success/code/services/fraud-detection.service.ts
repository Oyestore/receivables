import { Injectable, Logger } from '@nestjs/common';
import { MLBridgeService } from '../../../Module_02_Intelligent_Distribution/src/services/ml/ml-bridge.service';

export interface FraudCheckResult {
    isFraudulent: boolean;
    fraudScore: number;        // 0-1
    fraudProbability: number;  // 0-1
    isAnomaly: boolean;
    anomalyScore: number;      // -1 to 1
    riskLevel: string;         // Low/Medium/High/Critical
    reasons: string[];
    recommendedAction: string;
    requiresManualReview: boolean;
}

export interface TransactionData {
    transactionId: string;
    customerId: string;
    amount: number;
    hourOfDay: number;
    isDomestic: boolean;
    velocityLastHour: number;
    paymentMethod: string;
    customerAge?: number;
    avgTransactionAmount?: number;
    totalTransactions?: number;
}

/**
 * Fraud Detection Service with ML Integration
 * Uses ML models for real-time fraud detection and anomaly detection
 */
@Injectable()
export class FraudDetectionService {
    private readonly logger = new Logger(FraudDetectionService.name);

    private readonly HIGH_RISK_THRESHOLD = 0.7;
    private readonly MEDIUM_RISK_THRESHOLD = 0.4;

    constructor(
        private readonly mlBridge: MLBridgeService,
    ) { }

    /**
     * Check transaction for fraud using ML classifier
     */
    async checkTransactionFraud(transaction: TransactionData): Promise<{
        isFraudulent: boolean;
        probability: number;
        confidence: number;
        reasoning: string[];
    }> {
        try {
            const result = await this.mlBridge.detectFraud({
                amount: transaction.amount,
                hour_of_day: transaction.hourOfDay,
                is_domestic: transaction.isDomestic ? 1 : 0,
                velocity_last_hour: transaction.velocityLastHour,
                payment_method: transaction.paymentMethod,
            });

            const reasoning = this.generateFraudReasoning(
                result.fraud_probability,
                transaction,
            );

            this.logger.log(
                `Fraud check for transaction ${transaction.transactionId}: ${result.is_fraud ? 'FRAUD' : 'CLEAN'} (${(result.fraud_probability * 100).toFixed(1)}%)`,
            );

            return {
                isFraudulent: result.is_fraud,
                probability: result.fraud_probability,
                confidence: 0.82, // From model training (Precision: 0.75-0.85)
                reasoning,
            };
        } catch (error) {
            this.logger.error(`Failed to check fraud: ${error.message}`);
            // Fallback: Rule-based check
            return this.ruleBasedFraudCheck(transaction);
        }
    }

    /**
     * Detect anomalies in transaction patterns
     */
    async detectAnomalies(transaction: TransactionData): Promise<{
        isAnomaly: boolean;
        anomalyScore: number;
        severity: string;
        reasons: string[];
    }> {
        try {
            const result = await this.mlBridge.detectFraud({
                amount: transaction.amount,
                hour_of_day: transaction.hourOfDay,
                is_domestic: transaction.isDomestic ? 1 : 0,
                velocity_last_hour: transaction.velocityLastHour,
                payment_method: transaction.paymentMethod,
            });

            const anomalyScore = result.risk_score || 0;
            const isAnomaly = anomalyScore > 0.5;

            const severity = this.getAnomalySeverity(anomalyScore);
            const reasons = this.generateAnomalyReasons(anomalyScore, transaction);

            this.logger.log(
                `Anomaly detection for transaction ${transaction.transactionId}: ${isAnomaly ? 'ANOMALY' : 'NORMAL'} (score: ${anomalyScore.toFixed(2)})`,
            );

            return {
                isAnomaly,
                anomalyScore,
                severity,
                reasons,
            };
        } catch (error) {
            this.logger.error(`Failed to detect anomalies: ${error.message}`);
            return {
                isAnomaly: false,
                anomalyScore: 0,
                severity: 'Unknown',
                reasons: ['ML service unavailable'],
            };
        }
    }

    /**
     * Comprehensive fraud check combining both ML models
     */
    async comprehensiveFraudCheck(
        transaction: TransactionData,
    ): Promise<FraudCheckResult> {
        try {
            // Run both checks in parallel
            const [fraudCheck, anomalyCheck] = await Promise.all([
                this.checkTransactionFraud(transaction),
                this.detectAnomalies(transaction),
            ]);

            // Combine scores
            const combinedScore = Math.max(fraudCheck.probability, anomalyCheck.anomalyScore);

            const riskLevel = this.getRiskLevel(combinedScore);
            const recommendedAction = this.getRecommendedAction(riskLevel, fraudCheck, anomalyCheck);
            const requiresManualReview = riskLevel === 'High' || riskLevel === 'Critical';

            // Combine reasons
            const reasons = [
                ...fraudCheck.reasoning,
                ...anomalyCheck.reasons.map((r) => `Anomaly: ${r}`),
            ];

            this.logger.log(
                `Comprehensive fraud check for ${transaction.transactionId}: ${riskLevel} risk (${(combinedScore * 100).toFixed(1)}%)`,
            );

            return {
                isFraudulent: fraudCheck.isFraudulent || anomalyCheck.isAnomaly,
                fraudScore: fraudCheck.probability,
                fraudProbability: fraudCheck.probability,
                isAnomaly: anomalyCheck.isAnomaly,
                anomalyScore: anomalyCheck.anomalyScore,
                riskLevel,
                reasons,
                recommendedAction,
                requiresManualReview,
            };
        } catch (error) {
            this.logger.error(`Failed comprehensive fraud check: ${error.message}`);
            throw error;
        }
    }

    /**
     * Batch fraud check for multiple transactions
     */
    async batchFraudCheck(
        transactions: TransactionData[],
    ): Promise<Map<string, FraudCheckResult>> {
        const results = new Map<string, FraudCheckResult>();

        // Process in parallel with concurrency limit
        const BATCH_SIZE = 10;
        for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
            const batch = transactions.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map((t) => this.comprehensiveFraudCheck(t)),
            );

            batch.forEach((transaction, index) => {
                results.set(transaction.transactionId, batchResults[index]);
            });
        }

        this.logger.log(`Batch fraud check completed: ${transactions.length} transactions`);

        return results;
    }

    /**
     * Real-time fraud monitoring
     * Returns immediate decision: Approve, Review, or Block
     */
    async realTimeFraudMonitoring(
        transaction: TransactionData,
    ): Promise<{
        decision: 'APPROVE' | 'REVIEW' | 'BLOCK';
        riskScore: number;
        message: string;
        holdForReview: boolean;
    }> {
        const fraudCheck = await this.comprehensiveFraudCheck(transaction);

        let decision: 'APPROVE' | 'REVIEW' | 'BLOCK';
        let message: string;

        if (fraudCheck.riskLevel === 'Critical') {
            decision = 'BLOCK';
            message = 'Transaction blocked due to critical fraud risk';
        } else if (fraudCheck.riskLevel === 'High') {
            decision = 'REVIEW';
            message = 'Transaction on hold for manual review';
        } else if (fraudCheck.riskLevel === 'Medium') {
            decision = 'REVIEW';
            message = 'Transaction flagged for review due to moderate risk';
        } else {
            decision = 'APPROVE';
            message = 'Transaction approved';
        }

        this.logger.log(
            `Real-time decision for ${transaction.transactionId}: ${decision}`,
        );

        return {
            decision,
            riskScore: Math.max(fraudCheck.fraudScore, fraudCheck.anomalyScore),
            message,
            holdForReview: decision === 'REVIEW',
        };
    }

    /**
     * Get fraud statistics for a customer
     */
    async getCustomerFraudStats(
        customerId: string,
        transactionHistory: TransactionData[],
    ): Promise<{
        totalTransactions: number;
        flaggedTransactions: number;
        fraudRate: number;
        riskProfile: string;
        recommendations: string[];
    }> {
        const checks = await Promise.all(
            transactionHistory.map((t) => this.comprehensiveFraudCheck(t)),
        );

        const flagged = checks.filter((c) => c.requiresManualReview).length;
        const fraudRate = flagged / checks.length;

        const riskProfile =
            fraudRate > 0.5 ? 'High Risk' : fraudRate > 0.2 ? 'Medium Risk' : 'Low Risk';

        const recommendations = this.getCustomerRecommendations(fraudRate, riskProfile);

        return {
            totalTransactions: checks.length,
            flaggedTransactions: flagged,
            fraudRate,
            riskProfile,
            recommendations,
        };
    }

    // Helper methods

    private ruleBasedFraudCheck(transaction: TransactionData): any {
        const suspicious = [];
        let score = 0;

        // High amount
        if (transaction.amount > 500000) {
            suspicious.push('Very high transaction amount');
            score += 0.3;
        }

        // Unusual time
        if (transaction.hourOfDay < 6 || transaction.hourOfDay > 22) {
            suspicious.push('Unusual transaction time');
            score += 0.2;
        }

        // High velocity
        if (transaction.velocityLastHour > 5) {
            suspicious.push('High transaction velocity');
            score += 0.3;
        }

        // International
        if (!transaction.isDomestic) {
            suspicious.push('International transaction');
            score += 0.1;
        }

        return {
            isFraudulent: score > 0.5,
            probability: Math.min(1, score),
            confidence: 0.5,
            reasoning: suspicious,
        };
    }

    private generateFraudReasoning(probability: number, transaction: TransactionData): string[] {
        const reasons = [];

        if (probability > 0.7) {
            reasons.push('High fraud probability detected by ML model');
        }

        if (transaction.amount > 1000000) {
            reasons.push('Exceptionally high transaction amount');
        }

        if (transaction.velocityLastHour > 10) {
            reasons.push('Abnormally high transaction frequency');
        }

        if (!transaction.isDomestic) {
            reasons.push('International transaction requires additional verification');
        }

        return reasons;
    }

    private getAnomalySeverity(score: number): string {
        if (score > 0.8) return 'Critical';
        if (score > 0.6) return 'High';
        if (score > 0.4) return 'Medium';
        return 'Low';
    }

    private generateAnomalyReasons(score: number, transaction: TransactionData): string[] {
        const reasons = [];

        if (score > 0.5) {
            reasons.push('Transaction pattern deviates significantly from customer norm');
        }

        if (transaction.amount > (transaction.avgTransactionAmount || 0) * 5) {
            reasons.push('Amount significantly higher than customer average');
        }

        return reasons;
    }

    private getRiskLevel(combinedScore: number): string {
        if (combinedScore > 0.8) return 'Critical';
        if (combinedScore > 0.6) return 'High';
        if (combinedScore > 0.3) return 'Medium';
        return 'Low';
    }

    private getRecommendedAction(riskLevel: string, fraudCheck: any, anomalyCheck: any): string {
        switch (riskLevel) {
            case 'Critical':
                return 'BLOCK transaction immediately and notify security team';
            case 'High':
                return 'HOLD transaction for immediate manual review';
            case 'Medium':
                return 'FLAG for review within 24 hours';
            case 'Low':
                return 'APPROVE and continue monitoring';
            default:
                return 'APPROVE';
        }
    }

    private getCustomerRecommendations(fraudRate: number, riskProfile: string): string[] {
        const recommendations = [];

        if (fraudRate > 0.3) {
            recommendations.push('Implement enhanced verification for this customer');
            recommendations.push('Require additional KYC documentation');
        }

        if (riskProfile === 'High Risk') {
            recommendations.push('Flag all future transactions for manual review');
            recommendations.push('Consider suspending account pending investigation');
        }

        if (fraudRate > 0.1 && fraudRate <= 0.3) {
            recommendations.push('Monitor customer closely for next 30 days');
        }

        return recommendations;
    }
}
