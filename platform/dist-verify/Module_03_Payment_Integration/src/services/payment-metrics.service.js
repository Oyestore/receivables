"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PaymentMetricsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMetricsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_history_entity_1 = require("../entities/payment-history.entity");
const payment_metrics_entity_1 = require("../entities/payment-metrics.entity");
const buyer_profile_entity_1 = require("../entities/buyer-profile.entity");
/**
 * Service responsible for calculating and analyzing payment metrics.
 * This service provides detailed analysis of payment behavior patterns.
 */
let PaymentMetricsService = PaymentMetricsService_1 = class PaymentMetricsService {
    constructor(paymentHistoryRepository, paymentMetricsRepository, buyerProfileRepository) {
        this.paymentHistoryRepository = paymentHistoryRepository;
        this.paymentMetricsRepository = paymentMetricsRepository;
        this.buyerProfileRepository = buyerProfileRepository;
        this.logger = new common_1.Logger(PaymentMetricsService_1.name);
    }
    /**
     * Calculate payment metrics for a buyer within a specified period
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @param startDate - Start date for the period
     * @param endDate - End date for the period
     * @returns The calculated payment metrics
     */
    async calculateMetrics(buyerId, tenantId, startDate, endDate) {
        this.logger.log(`Calculating payment metrics for buyer ${buyerId} from ${startDate} to ${endDate}`);
        // Get payment history for the period
        const paymentRecords = await this.paymentHistoryRepository.find({
            where: {
                buyerId,
                tenantId,
                dueDate: (0, typeorm_2.Between)(startDate, endDate),
            },
        });
        if (paymentRecords.length === 0) {
            this.logger.warn(`No payment records found for buyer ${buyerId} in the specified period`);
            throw new Error('Insufficient payment history for metrics calculation');
        }
        // Calculate basic metrics
        const paymentCount = paymentRecords.length;
        const totalPaymentValue = paymentRecords.reduce((sum, record) => sum + Number(record.paidAmount), 0);
        const currencyCode = paymentRecords[0].currencyCode; // Assuming all payments are in the same currency
        // Calculate days past due metrics
        const daysPastDueArray = paymentRecords.map(record => record.daysPastDue || 0);
        const avgDaysPastDue = this.calculateAverage(daysPastDueArray);
        const maxDaysPastDue = Math.max(...daysPastDueArray);
        const stdDevDaysPastDue = this.calculateStandardDeviation(daysPastDueArray);
        // Calculate payment status percentages
        const onTimePayments = paymentRecords.filter(record => !record.daysPastDue || record.daysPastDue <= 0).length;
        const latePayments = paymentRecords.filter(record => record.daysPastDue > 0 && record.daysPastDue <= 30).length;
        const veryLatePayments = paymentRecords.filter(record => record.daysPastDue > 30).length;
        const defaultedPayments = paymentRecords.filter(record => record.paymentStatus === 'defaulted').length;
        const onTimePaymentPercentage = (onTimePayments / paymentCount) * 100;
        const latePaymentPercentage = (latePayments / paymentCount) * 100;
        const veryLatePaymentPercentage = (veryLatePayments / paymentCount) * 100;
        const defaultPercentage = (defaultedPayments / paymentCount) * 100;
        // Calculate amount metrics
        const paymentAmounts = paymentRecords.map(record => Number(record.paidAmount));
        const avgPaymentAmount = this.calculateAverage(paymentAmounts);
        // Calculate consistency score
        // Lower standard deviation relative to average means more consistent payments
        const consistencyScore = Math.max(0, Math.min(100, 100 - (stdDevDaysPastDue / Math.max(1, Math.abs(avgDaysPastDue)) * 50)));
        // Calculate payment trend
        const paymentTrend = await this.calculatePaymentTrend(buyerId, tenantId, endDate);
        // Calculate seasonal pattern strength
        const seasonalPatternStrength = await this.detectSeasonalPattern(buyerId, tenantId, endDate);
        // Calculate dispute frequency
        const disputedPayments = paymentRecords.filter(record => record.hadDispute).length;
        const disputeFrequency = (disputedPayments / paymentCount) * 100;
        // Calculate overall score
        // This is a weighted combination of various metrics
        const overallScore = this.calculateOverallScore({
            onTimePaymentPercentage,
            latePaymentPercentage,
            veryLatePaymentPercentage,
            defaultPercentage,
            avgDaysPastDue,
            consistencyScore,
            paymentTrend,
            disputeFrequency,
        });
        // Create and save the metrics
        const metrics = this.paymentMetricsRepository.create({
            tenantId,
            buyerId,
            periodStart: startDate,
            periodEnd: endDate,
            paymentCount,
            totalPaymentValue,
            currencyCode,
            avgDaysPastDue,
            maxDaysPastDue,
            stdDevDaysPastDue,
            onTimePaymentPercentage,
            latePaymentPercentage,
            veryLatePaymentPercentage,
            defaultPercentage,
            avgPaymentAmount,
            paymentConsistencyScore: consistencyScore,
            paymentTrend,
            seasonalPatternStrength,
            disputeFrequency,
            overallScore,
            additionalMetrics: {
                medianDaysPastDue: this.calculateMedian(daysPastDueArray),
                paymentVelocity: paymentCount / (Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
                averagePaymentDelay: avgDaysPastDue > 0 ? avgDaysPastDue : 0,
                averageEarlyPayment: avgDaysPastDue < 0 ? Math.abs(avgDaysPastDue) : 0,
            },
            calculatedAt: new Date(),
        });
        return await this.paymentMetricsRepository.save(metrics);
    }
    /**
     * Get the latest payment metrics for a buyer
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @returns The latest payment metrics or null if none exist
     */
    async getLatestMetrics(buyerId, tenantId) {
        return this.paymentMetricsRepository.findOne({
            where: { buyerId, tenantId },
            order: { calculatedAt: 'DESC' },
        });
    }
    /**
     * Get payment metrics for a buyer within a specified period
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @param startDate - Start date for the period
     * @param endDate - End date for the period
     * @returns The payment metrics for the period or null if none exist
     */
    async getMetricsForPeriod(buyerId, tenantId, startDate, endDate) {
        return this.paymentMetricsRepository.findOne({
            where: {
                buyerId,
                tenantId,
                periodStart: startDate,
                periodEnd: endDate,
            },
        });
    }
    /**
     * Calculate payment trend by comparing recent metrics with historical metrics
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @param currentDate - Current date for trend calculation
     * @returns Payment trend value (-100 to 100, positive means improving)
     */
    async calculatePaymentTrend(buyerId, tenantId, currentDate) {
        // Get recent payment history (last 3 months)
        const threeMonthsAgo = new Date(currentDate);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const recentPayments = await this.paymentHistoryRepository.find({
            where: {
                buyerId,
                tenantId,
                dueDate: (0, typeorm_2.Between)(threeMonthsAgo, currentDate),
            },
        });
        // Get older payment history (3-6 months ago)
        const sixMonthsAgo = new Date(currentDate);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const olderPayments = await this.paymentHistoryRepository.find({
            where: {
                buyerId,
                tenantId,
                dueDate: (0, typeorm_2.Between)(sixMonthsAgo, threeMonthsAgo),
            },
        });
        // If insufficient history, return neutral trend
        if (recentPayments.length < 3 || olderPayments.length < 3) {
            return 0;
        }
        // Calculate average days past due for both periods
        const recentDaysPastDue = recentPayments.map(record => record.daysPastDue || 0);
        const olderDaysPastDue = olderPayments.map(record => record.daysPastDue || 0);
        const recentAvg = this.calculateAverage(recentDaysPastDue);
        const olderAvg = this.calculateAverage(olderDaysPastDue);
        // Calculate on-time payment percentages for both periods
        const recentOnTimePercentage = (recentPayments.filter(record => !record.daysPastDue || record.daysPastDue <= 0).length / recentPayments.length) * 100;
        const olderOnTimePercentage = (olderPayments.filter(record => !record.daysPastDue || record.daysPastDue <= 0).length / olderPayments.length) * 100;
        // Calculate trend based on both metrics
        // Lower days past due and higher on-time percentage are positive trends
        const daysPastDueTrend = olderAvg - recentAvg; // Positive if recent is lower (better)
        const onTimePercentageTrend = recentOnTimePercentage - olderOnTimePercentage; // Positive if recent is higher (better)
        // Combine trends with weights
        const combinedTrend = (daysPastDueTrend * 3) + (onTimePercentageTrend * 2);
        // Scale to -100 to 100 range
        return Math.max(-100, Math.min(100, combinedTrend * 5));
    }
    /**
     * Detect seasonal patterns in payment behavior
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @param currentDate - Current date for pattern detection
     * @returns Seasonal pattern strength (0-100)
     */
    async detectSeasonalPattern(buyerId, tenantId, currentDate) {
        // Get payment history for the past year
        const oneYearAgo = new Date(currentDate);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const payments = await this.paymentHistoryRepository.find({
            where: {
                buyerId,
                tenantId,
                dueDate: (0, typeorm_2.Between)(oneYearAgo, currentDate),
            },
            order: { dueDate: 'ASC' },
        });
        // If insufficient history, return zero pattern strength
        if (payments.length < 12) {
            return 0;
        }
        // Group payments by month
        const paymentsByMonth = new Array(12).fill(0).map(() => []);
        payments.forEach(payment => {
            const month = new Date(payment.dueDate).getMonth();
            paymentsByMonth[month].push(payment);
        });
        // Calculate average days past due for each month
        const monthlyAvgDaysPastDue = paymentsByMonth.map(monthPayments => {
            if (monthPayments.length === 0)
                return null;
            return this.calculateAverage(monthPayments.map(payment => payment.daysPastDue || 0));
        });
        // Filter out months with no data
        const validMonthlyData = monthlyAvgDaysPastDue.filter(avg => avg !== null);
        if (validMonthlyData.length < 6) {
            return 0;
        }
        // Calculate overall average and standard deviation
        const overallAvg = this.calculateAverage(validMonthlyData);
        const overallStdDev = this.calculateStandardDeviation(validMonthlyData);
        if (overallStdDev === 0) {
            return 0; // No variation means no seasonal pattern
        }
        // Calculate how much each month deviates from the overall average
        const monthlyDeviations = validMonthlyData.map(avg => Math.abs(avg - overallAvg) / overallStdDev);
        // Calculate average deviation
        const avgDeviation = this.calculateAverage(monthlyDeviations);
        // Convert to pattern strength (0-100)
        // Higher deviation indicates stronger seasonal pattern
        return Math.min(100, avgDeviation * 25);
    }
    /**
     * Calculate overall payment behavior score
     * @param metrics - Object containing various payment metrics
     * @returns Overall score (0-100)
     */
    calculateOverallScore(metrics) {
        // Define weights for each metric
        const weights = {
            onTimePaymentPercentage: 0.35,
            latePaymentPercentage: -0.15,
            veryLatePaymentPercentage: -0.25,
            defaultPercentage: -0.35,
            avgDaysPastDue: -0.20,
            consistencyScore: 0.15,
            paymentTrend: 0.10,
            disputeFrequency: -0.10,
        };
        // Calculate weighted sum
        let score = 50; // Start with neutral score
        // Add weighted contributions
        score += metrics.onTimePaymentPercentage * weights.onTimePaymentPercentage;
        score += metrics.latePaymentPercentage * weights.latePaymentPercentage;
        score += metrics.veryLatePaymentPercentage * weights.veryLatePaymentPercentage;
        score += metrics.defaultPercentage * weights.defaultPercentage;
        score += Math.min(30, Math.max(-30, metrics.avgDaysPastDue)) * weights.avgDaysPastDue;
        score += metrics.consistencyScore * weights.consistencyScore;
        score += (metrics.paymentTrend / 100) * 10 * weights.paymentTrend;
        score += metrics.disputeFrequency * weights.disputeFrequency;
        // Ensure score is within 0-100 range
        return Math.max(0, Math.min(100, score));
    }
    /**
     * Calculate the average of an array of numbers
     * @param values - Array of numbers
     * @returns Average value
     */
    calculateAverage(values) {
        if (values.length === 0)
            return 0;
        const sum = values.reduce((acc, val) => acc + val, 0);
        return sum / values.length;
    }
    /**
     * Calculate the median of an array of numbers
     * @param values - Array of numbers
     * @returns Median value
     */
    calculateMedian(values) {
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
        else {
            return sorted[middle];
        }
    }
    /**
     * Calculate the standard deviation of an array of numbers
     * @param values - Array of numbers
     * @returns Standard deviation
     */
    calculateStandardDeviation(values) {
        if (values.length <= 1)
            return 0;
        const avg = this.calculateAverage(values);
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = this.calculateAverage(squareDiffs);
        return Math.sqrt(avgSquareDiff);
    }
};
exports.PaymentMetricsService = PaymentMetricsService;
exports.PaymentMetricsService = PaymentMetricsService = PaymentMetricsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_history_entity_1.PaymentHistory)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_metrics_entity_1.PaymentMetrics)),
    __param(2, (0, typeorm_1.InjectRepository)(buyer_profile_entity_1.BuyerProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PaymentMetricsService);
//# sourceMappingURL=payment-metrics.service.js.map