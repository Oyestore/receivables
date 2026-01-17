import { Injectable, Logger } from '@nestjs/common';
import { DeepSeekAIService } from './deepseek-ai.service';

/**
 * Predictive Analytics Service
 * 
 * Machine learning-powered predictions for:
 * - Cash flow forecasting
 * - Payment timing prediction
 * - Customer churn risk
 * - Revenue forecasting
 */
@Injectable()
export class PredictiveAnalyticsService {
    private readonly logger = new Logger(PredictiveAnalyticsService.name);

    constructor(
        private readonly aiService: DeepSeekAIService,
    ) { }

    /**
     * Predict cash flow for next N days
     */
    async predictCashFlow(
        tenantId: string,
        days: number = 30
    ): Promise<{
        predictions: Array<{
            date: string;
            amount: number;
            confidence: number;
            breakdown: {
                expected_in: number;
                expected_out: number;
            };
        }>;
        total_expected: number;
        risk_level: 'low' | 'medium' | 'high';
        recommendations: string[];
    }> {
        try {
            // Gather cash flow data
            const historical = await this.getHistoricalCashFlow(tenantId, 30);
            const pending = await this.getPendingInvoices(tenantId);
            const expenses = await this.getExpectedExpenses(tenantId);

            // Call AI for prediction
            const aiPrediction = await this.aiService.analyzeCashFlow({
                historical,
                pending,
                expenses,
            });

            // Calculate risk level
            const risk_level = this.calculateRiskLevel(aiPrediction.prediction);

            return {
                predictions: aiPrediction.prediction.map(p => ({
                    date: p.date,
                    amount: p.amount,
                    confidence: p.confidence,
                    breakdown: {
                        expected_in: p.amount * 0.7, // Mock breakdown
                        expected_out: p.amount * 0.3,
                    },
                })),
                total_expected: aiPrediction.prediction.reduce((sum, p) => sum + p.amount, 0),
                risk_level,
                recommendations: aiPrediction.recommendations,
            };
        } catch (error) {
            this.logger.error(`Cash flow prediction failed: ${error.message}`);
            return this.getFallbackCashFlowPrediction(days);
        }
    }

    /**
     * Predict when invoice will be paid
     */
    async predictInvoicePayment(
        invoiceId: string
    ): Promise<{
        invoice_id: string;
        predicted_payment_date: Date;
        confidence: number;
        probability_on_time: number;
        factors: string[];
        recommendation: string;
    }> {
        try {
            const invoice = await this.getInvoiceDetails(invoiceId);
            const customerHistory = await this.getCustomerPaymentHistory(invoice.customer_id);

            const prediction = await this.aiService.predictPaymentTiming({
                invoiceId: invoice.id,
                customerId: invoice.customer_id,
                amount: invoice.amount,
                dueDate: invoice.due_date,
                customerHistory,
            });

            const on_time_probability = this.calculateOnTimeProbability(
                prediction.predictedDate,
                invoice.due_date
            );

            return {
                invoice_id: invoiceId,
                predicted_payment_date: prediction.predictedDate,
                confidence: prediction.confidence,
                probability_on_time: on_time_probability,
                factors: prediction.factors,
                recommendation: prediction.recommendation,
            };
        } catch (error) {
            this.logger.error(`Payment prediction failed: ${error.message}`);
            return this.getFallbackPaymentPrediction(invoiceId);
        }
    }

    /**
     * Predict customer churn risk
     */
    async predictChurnRisk(
        tenantId: string
    ): Promise<Array<{
        customer_id: string;
        customer_name: string;
        churn_probability: number;
        risk_level: 'low' | 'medium' | 'high';
        factors: string[];
        retention_actions: string[];
    }>> {
        try {
            const customers = await this.getActiveCustomers(tenantId);
            const predictions: any[] = [];

            for (const customer of customers.slice(0, 10)) { // Top 10 customers
                const behavior = await this.getCustomerBehavior(customer.id);
                const churn_prob = this.calculateChurnProbability(behavior);

                if (churn_prob > 0.3) { // Only return at-risk customers
                    predictions.push({
                        customer_id: customer.id,
                        customer_name: customer.name,
                        churn_probability: churn_prob,
                        risk_level: churn_prob > 0.7 ? 'high' : churn_prob > 0.5 ? 'medium' : 'low',
                        factors: this.identifyChurnFactors(behavior),
                        retention_actions: this.suggestRetentionActions(behavior, churn_prob),
                    });
                }
            }

            return predictions.sort((a, b) => b.churn_probability - a.churn_probability);
        } catch (error) {
            this.logger.error(`Churn prediction failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Forecast revenue for next period
     */
    async forecastRevenue(
        tenantId: string,
        period: 'week' | 'month' | 'quarter'
    ): Promise<{
        forecast: number;
        confidence: number;
        breakdown: {
            existing_customers: number;
            new_customers: number;
            upsells: number;
        };
        comparison_to_last_period: number;
        insights: string[];
    }> {
        try {
            const historical = await this.getHistoricalRevenue(tenantId, period);
            const pipeline = await this.getRevenuePipeline(tenantId);

            // Simple forecast based on trend
            const trend = this.calculateTrend(historical);
            const last_period_revenue = historical[historical.length - 1]?.amount || 0;
            const forecast = last_period_revenue * (1 + trend);

            return {
                forecast,
                confidence: 75,
                breakdown: {
                    existing_customers: forecast * 0.7,
                    new_customers: forecast * 0.2,
                    upsells: forecast * 0.1,
                },
                comparison_to_last_period: (trend * 100),
                insights: [
                    `Revenue trending ${trend > 0 ? 'up' : 'down'} by ${Math.abs(trend * 100).toFixed(1)}%`,
                    `${pipeline.length} opportunities in pipeline`,
                ],
            };
        } catch (error) {
            this.logger.error(`Revenue forecast failed: ${error.message}`);
            return {
                forecast: 0,
                confidence: 0,
                breakdown: { existing_customers: 0, new_customers: 0, upsells: 0 },
                comparison_to_last_period: 0,
                insights: [],
            };
        }
    }

    // ==========================================
    // PRIVATE HELPER METHODS
    // ==========================================

    private async getHistoricalCashFlow(tenantId: string, days: number) {
        // Mock implementation
        const data: Array<{ date: string; amount: number }> = [];
        const today = new Date();

        for (let i = days; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            data.push({
                date: date.toISOString().split('T')[0],
                amount: 1000000 + Math.random() * 500000, // ₹10-15L
            });
        }

        return data;
    }

    private async getPendingInvoices(tenantId: string) {
        // Mock implementation
        return [
            { dueDate: '2026-01-20', amount: 250000, probability: 85 },
            { dueDate: '2026-01-25', amount: 150000, probability: 70 },
            { dueDate: '2026-02-01', amount: 300000, probability: 60 },
        ];
    }

    private async getExpectedExpenses(tenantId: string) {
        // Mock implementation
        return [
            { date: '2026-01-20', amount: 100000 },
            { date: '2026-01-30', amount: 150000 },
        ];
    }

    private async getInvoiceDetails(invoiceId: string) {
        // Mock implementation
        return {
            id: invoiceId,
            customer_id: 'cust-123',
            amount: 100000,
            due_date: new Date('2026-02-01'),
        };
    }

    private async getCustomerPaymentHistory(customerId: string) {
        // Mock implementation
        return [
            { invoiceAmount: 100000, daysToPayment: 25 },
            { invoiceAmount: 150000, daysToPayment: 30 },
            { invoiceAmount: 80000, daysToPayment: 20 },
        ];
    }

    private async getActiveCustomers(tenantId: string) {
        // Mock implementation
        return [
            { id: 'cust-1', name: 'ABC Corp' },
            { id: 'cust-2', name: 'XYZ Ltd' },
        ];
    }

    private async getCustomerBehavior(customerId: string) {
        // Mock implementation
        return {
            invoice_count: 10,
            payment_delay_trend: 5, // days
            dispute_count: 1,
            last_order_days_ago: 45,
            average_order_value_change: -0.15,
        };
    }

    private async getHistoricalRevenue(tenantId: string, period: string) {
        // Mock implementation
        return [
            { period: '2024-Q3', amount: 3000000 },
            { period: '2024-Q4', amount: 3500000 },
            { period: '2025-Q1', amount: 4000000 },
        ];
    }

    private async getRevenuePipeline(tenantId: string) {
        // Mock implementation
        return [
            { opportunity: 'Deal 1', amount: 500000, probability: 0.8 },
            { opportunity: 'Deal 2', amount: 300000, probability: 0.5 },
        ];
    }

    private calculateRiskLevel(predictions: any[]): 'low' | 'medium' | 'high' {
        const negative_days = predictions.filter(p => p.amount < 0).length;
        if (negative_days > 5) return 'high';
        if (negative_days > 2) return 'medium';
        return 'low';
    }

    private calculateOnTimeProbability(predictedDate: Date, dueDate: Date): number {
        const diff = (predictedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff <= 0) return 90;
        if (diff <= 7) return 60;
        return 30;
    }

    private calculateChurnProbability(behavior: any): number {
        let score = 0;

        if (behavior.last_order_days_ago > 60) score += 0.3;
        if (behavior.payment_delay_trend > 10) score += 0.2;
        if (behavior.dispute_count > 0) score += 0.15;
        if (behavior.average_order_value_change < -0.2) score += 0.25;

        return Math.min(score, 0.95);
    }

    private identifyChurnFactors(behavior: any): string[] {
        const factors: string[] = [];

        if (behavior.last_order_days_ago > 60) {
            factors.push(`No orders in ${behavior.last_order_days_ago} days`);
        }
        if (behavior.payment_delay_trend > 10) {
            factors.push(`Payment delays trending up`);
        }
        if (behavior.average_order_value_change < -0.2) {
            factors.push(`Order value decreased ${Math.abs(behavior.average_order_value_change * 100).toFixed(0)}%`);
        }

        return factors;
    }

    private suggestRetentionActions(behavior: any, churn_prob: number): string[] {
        const actions: string[] = [];

        if (churn_prob > 0.7) {
            actions.push('Schedule urgent call with decision maker');
            actions.push('Offer special retention discount');
        }

        if (behavior.last_order_days_ago > 60) {
            actions.push('Send personalized re-engagement email');
            actions.push('Offer free trial of new service');
        }

        if (behavior.payment_delay_trend > 10) {
            actions.push('Review and optimize payment terms');
        }

        return actions;
    }

    private calculateTrend(historical: any[]): number {
        if (historical.length < 2) return 0;

        const last = historical[historical.length - 1].amount;
        const previous = historical[historical.length - 2].amount;

        return (last - previous) / previous;
    }

    private getFallbackCashFlowPrediction(days: number) {
        return {
            predictions: [],
            total_expected: 0,
            risk_level: 'medium' as const,
            recommendations: ['Unable to generate prediction'],
        };
    }

    private getFallbackPaymentPrediction(invoiceId: string) {
        return {
            invoice_id: invoiceId,
            predicted_payment_date: new Date(),
            confidence: 50,
            probability_on_time: 50,
            factors: ['Insufficient data'],
            recommendation: 'Monitor payment status',
        };
    }
}
