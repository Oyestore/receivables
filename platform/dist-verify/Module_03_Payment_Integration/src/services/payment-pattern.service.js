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
var PaymentPatternService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentPatternService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_pattern_entity_1 = require("../entities/payment-pattern.entity");
const payment_history_entity_1 = require("../entities/payment-history.entity");
const buyer_profile_entity_1 = require("../entities/buyer-profile.entity");
/**
 * Service responsible for detecting and analyzing payment patterns.
 * This service identifies recurring behaviors and trends in payment data.
 */
let PaymentPatternService = PaymentPatternService_1 = class PaymentPatternService {
    constructor(paymentPatternRepository, paymentHistoryRepository, buyerProfileRepository) {
        this.paymentPatternRepository = paymentPatternRepository;
        this.paymentHistoryRepository = paymentHistoryRepository;
        this.buyerProfileRepository = buyerProfileRepository;
        this.logger = new common_1.Logger(PaymentPatternService_1.name);
    }
    /**
     * Detect payment patterns for a buyer
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @returns Array of detected payment patterns
     */
    async detectPatterns(buyerId, tenantId) {
        this.logger.log(`Detecting payment patterns for buyer ${buyerId}`);
        // Get payment history for the buyer
        const paymentRecords = await this.paymentHistoryRepository.find({
            where: { buyerId, tenantId },
            order: { dueDate: 'ASC' },
        });
        if (paymentRecords.length < 5) {
            this.logger.warn(`Insufficient payment history for buyer ${buyerId} to detect patterns`);
            return [];
        }
        const patterns = [];
        // Detect seasonal patterns
        const seasonalPattern = await this.detectSeasonalPattern(buyerId, tenantId, paymentRecords);
        if (seasonalPattern) {
            patterns.push(seasonalPattern);
        }
        // Detect cyclical patterns
        const cyclicalPattern = await this.detectCyclicalPattern(buyerId, tenantId, paymentRecords);
        if (cyclicalPattern) {
            patterns.push(cyclicalPattern);
        }
        // Detect trend patterns
        const trendPattern = await this.detectTrendPattern(buyerId, tenantId, paymentRecords);
        if (trendPattern) {
            patterns.push(trendPattern);
        }
        // Detect amount-based patterns
        const amountPattern = await this.detectAmountPattern(buyerId, tenantId, paymentRecords);
        if (amountPattern) {
            patterns.push(amountPattern);
        }
        // Save all detected patterns
        if (patterns.length > 0) {
            return await this.paymentPatternRepository.save(patterns);
        }
        return patterns;
    }
    /**
     * Detect seasonal patterns in payment behavior
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @param paymentRecords - Payment history records
     * @returns Seasonal pattern or null if none detected
     */
    async detectSeasonalPattern(buyerId, tenantId, paymentRecords) {
        // Need at least a year of data for seasonal patterns
        if (paymentRecords.length < 12) {
            return null;
        }
        // Group payments by month
        const paymentsByMonth = new Array(12).fill(0).map(() => []);
        paymentRecords.forEach(payment => {
            const month = new Date(payment.dueDate).getMonth();
            paymentsByMonth[month].push(payment);
        });
        // Calculate average days past due for each month
        const monthlyAvgDaysPastDue = paymentsByMonth.map((monthPayments, index) => {
            if (monthPayments.length === 0)
                return { month: index, avg: null };
            const sum = monthPayments.reduce((acc, payment) => acc + (payment.daysPastDue || 0), 0);
            return {
                month: index,
                avg: sum / monthPayments.length,
                count: monthPayments.length
            };
        });
        // Filter out months with no data
        const validMonthlyData = monthlyAvgDaysPastDue.filter(data => data.avg !== null && data.count >= 2);
        if (validMonthlyData.length < 6) {
            return null;
        }
        // Find months with significantly worse payment behavior
        const overallAvg = validMonthlyData.reduce((sum, data) => sum + data.avg, 0) / validMonthlyData.length;
        const significantThreshold = 5; // 5 days worse than average
        const problematicMonths = validMonthlyData
            .filter(data => data.avg > overallAvg + significantThreshold)
            .sort((a, b) => b.avg - a.avg); // Sort by most problematic first
        const goodMonths = validMonthlyData
            .filter(data => data.avg < overallAvg - significantThreshold)
            .sort((a, b) => a.avg - b.avg); // Sort by best first
        // If we have clear problematic or good months, create a seasonal pattern
        if (problematicMonths.length >= 2 || goodMonths.length >= 2) {
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            let description;
            let riskImplication;
            let patternData;
            if (problematicMonths.length >= 2) {
                const monthsList = problematicMonths.map(m => monthNames[m.month]).join(', ');
                description = `Consistently delayed payments during ${monthsList}`;
                riskImplication = 'negative';
                patternData = {
                    problematicMonths: problematicMonths.map(m => ({
                        month: m.month,
                        name: monthNames[m.month],
                        avgDaysPastDue: m.avg,
                        deviation: m.avg - overallAvg
                    })),
                    overallAvgDaysPastDue: overallAvg
                };
            }
            else {
                const monthsList = goodMonths.map(m => monthNames[m.month]).join(', ');
                description = `Consistently timely payments during ${monthsList}`;
                riskImplication = 'positive';
                patternData = {
                    goodMonths: goodMonths.map(m => ({
                        month: m.month,
                        name: monthNames[m.month],
                        avgDaysPastDue: m.avg,
                        deviation: overallAvg - m.avg
                    })),
                    overallAvgDaysPastDue: overallAvg
                };
            }
            // Calculate confidence level based on data consistency
            const deviations = validMonthlyData.map(data => Math.abs(data.avg - overallAvg));
            const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
            const confidenceLevel = Math.min(100, Math.max(50, 50 + (avgDeviation * 5)));
            // Create the pattern
            return this.paymentPatternRepository.create({
                tenantId,
                buyerId,
                name: 'Seasonal Payment Pattern',
                description,
                patternType: 'seasonal',
                confidenceLevel,
                frequencyDays: 365, // Annual pattern
                avgDaysPastDue: overallAvg,
                patternData,
                identifiedAt: new Date(),
                lastObservedAt: new Date(),
                isActive: true,
                riskImplication,
            });
        }
        return null;
    }
    /**
     * Detect cyclical patterns in payment behavior
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @param paymentRecords - Payment history records
     * @returns Cyclical pattern or null if none detected
     */
    async detectCyclicalPattern(buyerId, tenantId, paymentRecords) {
        if (paymentRecords.length < 10) {
            return null;
        }
        // Sort by due date
        const sortedRecords = [...paymentRecords].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        // Calculate intervals between payments
        const intervals = [];
        for (let i = 1; i < sortedRecords.length; i++) {
            const interval = Math.floor((new Date(sortedRecords[i].dueDate).getTime() - new Date(sortedRecords[i - 1].dueDate).getTime())
                / (1000 * 60 * 60 * 24));
            intervals.push(interval);
        }
        // Find common intervals (potential cycles)
        const intervalCounts = {};
        intervals.forEach(interval => {
            // Group similar intervals (within 2 days)
            const key = Math.round(interval / 2) * 2;
            intervalCounts[key] = (intervalCounts[key] || 0) + 1;
        });
        // Find the most common interval
        let mostCommonInterval = 0;
        let highestCount = 0;
        Object.entries(intervalCounts).forEach(([interval, count]) => {
            if (Number(count) > highestCount) {
                mostCommonInterval = Number(interval);
                highestCount = Number(count);
            }
        });
        // If we have a clear cycle (at least 30% of payments follow it)
        if (highestCount >= intervals.length * 0.3 && mostCommonInterval > 0) {
            // Calculate average days past due for payments in this cycle
            const cycleDaysPastDue = [];
            for (let i = 0; i < sortedRecords.length; i++) {
                if (i > 0) {
                    const interval = Math.floor((new Date(sortedRecords[i].dueDate).getTime() - new Date(sortedRecords[i - 1].dueDate).getTime())
                        / (1000 * 60 * 60 * 24));
                    // If this payment is part of the cycle
                    if (Math.abs(interval - mostCommonInterval) <= 2) {
                        cycleDaysPastDue.push(sortedRecords[i].daysPastDue || 0);
                    }
                }
            }
            const avgDaysPastDue = cycleDaysPastDue.reduce((sum, days) => sum + days, 0) / cycleDaysPastDue.length;
            const stdDevDaysPastDue = this.calculateStandardDeviation(cycleDaysPastDue);
            // Determine if this is a positive or negative pattern
            const riskImplication = avgDaysPastDue <= 0 ? 'positive' :
                (avgDaysPastDue > 10 ? 'negative' : 'neutral');
            // Calculate confidence based on consistency of the cycle
            const confidenceLevel = Math.min(100, Math.max(50, (highestCount / intervals.length) * 100));
            // Create the pattern
            return this.paymentPatternRepository.create({
                tenantId,
                buyerId,
                name: `${mostCommonInterval}-Day Payment Cycle`,
                description: `Regular payment cycle occurring approximately every ${mostCommonInterval} days`,
                patternType: 'cyclical',
                confidenceLevel,
                frequencyDays: mostCommonInterval,
                avgDaysPastDue,
                stdDevDaysPastDue,
                patternData: {
                    cycleInterval: mostCommonInterval,
                    cycleFrequency: highestCount,
                    totalIntervals: intervals.length,
                    intervalDistribution: intervalCounts,
                },
                identifiedAt: new Date(),
                lastObservedAt: new Date(),
                isActive: true,
                riskImplication,
            });
        }
        return null;
    }
    /**
     * Detect trend patterns in payment behavior
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @param paymentRecords - Payment history records
     * @returns Trend pattern or null if none detected
     */
    async detectTrendPattern(buyerId, tenantId, paymentRecords) {
        if (paymentRecords.length < 5) {
            return null;
        }
        // Sort by due date
        const sortedRecords = [...paymentRecords].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        // Split into quarters
        const quarters = [];
        const quarterSize = Math.max(3, Math.floor(sortedRecords.length / 4));
        for (let i = 0; i < 4; i++) {
            const start = i * quarterSize;
            const end = Math.min(start + quarterSize, sortedRecords.length);
            if (start < sortedRecords.length) {
                quarters.push(sortedRecords.slice(start, end));
            }
        }
        // Calculate average days past due for each quarter
        const quarterAvgs = quarters.map(quarter => {
            const sum = quarter.reduce((acc, record) => acc + (record.daysPastDue || 0), 0);
            return sum / quarter.length;
        });
        // Check if there's a consistent trend
        let trendDirection = 0;
        let consistentTrend = true;
        for (let i = 1; i < quarterAvgs.length; i++) {
            const diff = quarterAvgs[i] - quarterAvgs[i - 1];
            if (i === 1) {
                // Set initial trend direction
                trendDirection = Math.sign(diff);
            }
            else if (Math.sign(diff) !== trendDirection) {
                // If direction changes, trend is not consistent
                consistentTrend = false;
                break;
            }
        }
        // If we have a consistent trend and it's significant
        const firstQuarterAvg = quarterAvgs[0];
        const lastQuarterAvg = quarterAvgs[quarterAvgs.length - 1];
        const totalChange = lastQuarterAvg - firstQuarterAvg;
        // Significant change is at least 5 days difference between first and last quarter
        if (consistentTrend && Math.abs(totalChange) >= 5) {
            const improving = totalChange < 0; // Negative change means fewer days past due (improvement)
            // Calculate confidence based on consistency and magnitude of change
            const confidenceLevel = Math.min(100, Math.max(50, 50 + Math.abs(totalChange) * 2));
            // Create the pattern
            return this.paymentPatternRepository.create({
                tenantId,
                buyerId,
                name: `${improving ? 'Improving' : 'Deteriorating'} Payment Trend`,
                description: `Payment timeliness is ${improving ? 'improving' : 'deteriorating'} over time`,
                patternType: 'trend',
                confidenceLevel,
                avgDaysPastDue: quarterAvgs.reduce((sum, avg) => sum + avg, 0) / quarterAvgs.length,
                patternData: {
                    quarterlyAverages: quarterAvgs,
                    totalChange,
                    changePerQuarter: totalChange / (quarterAvgs.length - 1),
                    improving,
                },
                identifiedAt: new Date(),
                lastObservedAt: new Date(),
                isActive: true,
                riskImplication: improving ? 'positive' : 'negative',
            });
        }
        return null;
    }
    /**
     * Detect amount-based patterns in payment behavior
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @param paymentRecords - Payment history records
     * @returns Amount pattern or null if none detected
     */
    async detectAmountPattern(buyerId, tenantId, paymentRecords) {
        if (paymentRecords.length < 5) {
            return null;
        }
        // Group payments by amount range
        const amountRanges = {};
        paymentRecords.forEach(payment => {
            // Round to nearest 1000
            const amountKey = Math.round(Number(payment.invoiceAmount) / 1000) * 1000;
            if (!amountRanges[amountKey]) {
                amountRanges[amountKey] = [];
            }
            amountRanges[amountKey].push(payment);
        });
        // Find amount ranges with significant number of payments
        const significantRanges = [];
        Object.entries(amountRanges).forEach(([amount, payments]) => {
            const paymentArray = payments;
            if (paymentArray.length >= 3 && paymentArray.length >= paymentRecords.length * 0.2) {
                // Calculate average days past due for this amount range
                const daysPastDue = paymentArray.map(p => p.daysPastDue || 0);
                const avgDaysPastDue = daysPastDue.reduce((sum, days) => sum + days, 0) / daysPastDue.length;
                const stdDevDaysPastDue = this.calculateStandardDeviation(daysPastDue);
                significantRanges.push({
                    amount: Number(amount),
                    count: paymentArray.length,
                    percentage: (paymentArray.length / paymentRecords.length) * 100,
                    avgDaysPastDue,
                    stdDevDaysPastDue,
                });
            }
        });
        // If we have significant amount-based patterns
        if (significantRanges.length > 0) {
            // Sort by most significant (highest count) first
            significantRanges.sort((a, b) => b.count - a.count);
            // Find if there's a correlation between amount and payment timeliness
            const correlation = this.calculateAmountTimelinesCorrelation(significantRanges);
            // If there's a strong correlation, create a pattern
            if (Math.abs(correlation) >= 0.5) {
                const smallerPaymentsOnTime = correlation < 0;
                // Create the pattern
                return this.paymentPatternRepository.create({
                    tenantId,
                    buyerId,
                    name: 'Amount-Based Payment Pattern',
                    description: smallerPaymentsOnTime
                        ? 'Smaller invoices are paid more promptly than larger ones'
                        : 'Larger invoices are paid more promptly than smaller ones',
                    patternType: 'amount-based',
                    confidenceLevel: Math.min(100, Math.max(50, 50 + Math.abs(correlation) * 50)),
                    avgDaysPastDue: significantRanges.reduce((sum, range) => sum + range.avgDaysPastDue, 0) / significantRanges.length,
                    patternData: {
                        amountRanges: significantRanges,
                        correlation,
                        smallerPaymentsOnTime,
                    },
                    identifiedAt: new Date(),
                    lastObservedAt: new Date(),
                    isActive: true,
                    riskImplication: 'neutral',
                });
            }
        }
        return null;
    }
    /**
     * Calculate correlation between payment amount and timeliness
     * @param ranges - Array of amount ranges with payment data
     * @returns Correlation coefficient (-1 to 1)
     */
    calculateAmountTimelinesCorrelation(ranges) {
        const n = ranges.length;
        if (n <= 1) {
            return 0;
        }
        const amounts = ranges.map(r => r.amount);
        const daysPastDue = ranges.map(r => r.avgDaysPastDue);
        const sumX = amounts.reduce((sum, x) => sum + x, 0);
        const sumY = daysPastDue.reduce((sum, y) => sum + y, 0);
        const sumXY = amounts.reduce((sum, x, i) => sum + x * daysPastDue[i], 0);
        const sumX2 = amounts.reduce((sum, x) => sum + x * x, 0);
        const sumY2 = daysPastDue.reduce((sum, y) => sum + y * y, 0);
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        if (denominator === 0) {
            return 0;
        }
        return numerator / denominator;
    }
    /**
     * Get all active payment patterns for a buyer
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @returns Array of active payment patterns
     */
    async getActivePatterns(buyerId, tenantId) {
        return this.paymentPatternRepository.find({
            where: { buyerId, tenantId, isActive: true },
        });
    }
    /**
     * Get payment patterns by type for a buyer
     * @param buyerId - ID of the buyer
     * @param tenantId - Tenant ID
     * @param patternType - Type of pattern to retrieve
     * @returns Array of payment patterns of the specified type
     */
    async getPatternsByType(buyerId, tenantId, patternType) {
        return this.paymentPatternRepository.find({
            where: { buyerId, tenantId, patternType },
        });
    }
    /**
     * Calculate the standard deviation of an array of numbers
     * @param values - Array of numbers
     * @returns Standard deviation
     */
    calculateStandardDeviation(values) {
        if (values.length <= 1)
            return 0;
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }
};
exports.PaymentPatternService = PaymentPatternService;
exports.PaymentPatternService = PaymentPatternService = PaymentPatternService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_pattern_entity_1.PaymentPattern)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_history_entity_1.PaymentHistory)),
    __param(2, (0, typeorm_1.InjectRepository)(buyer_profile_entity_1.BuyerProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PaymentPatternService);
//# sourceMappingURL=payment-pattern.service.js.map