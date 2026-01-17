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
var EarlyWarningIntegrationService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EarlyWarningIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const risk_indicator_entity_1 = require("../entities/risk-indicator.entity");
const risk_alert_entity_1 = require("../entities/risk-alert.entity");
const credit_limit_entity_1 = require("../entities/credit-limit.entity");
const payment_history_entity_1 = require("../entities/payment-history.entity");
const credit_assessment_entity_1 = require("../entities/credit-assessment.entity");
const risk_indicator_monitoring_service_1 = require("./risk-indicator-monitoring.service");
const risk_alert_service_1 = require("./risk-alert.service");
const risk_level_enum_1 = require("../enums/risk-level.enum");
/**
 * Service responsible for integrating early warning systems with other modules.
 * This service provides functionality for connecting risk monitoring with credit limit and payment analysis.
 */
let EarlyWarningIntegrationService = EarlyWarningIntegrationService_1 = class EarlyWarningIntegrationService {
    constructor(riskIndicatorRepository, riskAlertRepository, creditLimitRepository, paymentHistoryRepository, creditAssessmentRepository, riskIndicatorMonitoringService, riskAlertService) {
        this.riskIndicatorRepository = riskIndicatorRepository;
        this.riskAlertRepository = riskAlertRepository;
        this.creditLimitRepository = creditLimitRepository;
        this.paymentHistoryRepository = paymentHistoryRepository;
        this.creditAssessmentRepository = creditAssessmentRepository;
        this.riskIndicatorMonitoringService = riskIndicatorMonitoringService;
        this.riskAlertService = riskAlertService;
        this.logger = new common_1.Logger(EarlyWarningIntegrationService_1.name);
    }
    /**
     * Process new credit assessment for risk indicators
     * @param creditAssessmentId - Credit assessment ID
     * @param tenantId - Tenant ID
     * @returns Generated risk indicators and alerts
     */
    async processNewCreditAssessment(creditAssessmentId, tenantId) {
        this.logger.log(`Processing new credit assessment ${creditAssessmentId} for risk indicators`);
        // Get credit assessment
        const assessment = await this.creditAssessmentRepository.findOne({
            where: { id: creditAssessmentId, tenantId },
        });
        if (!assessment) {
            throw new Error(`Credit assessment with ID ${creditAssessmentId} not found`);
        }
        const buyerId = assessment.buyerId;
        // Monitor buyer for risk indicators
        const indicators = await this.riskIndicatorMonitoringService.monitorBuyer(buyerId, tenantId);
        // Generate alerts from indicators
        const alerts = await this.riskAlertService.generateAlertsFromIndicators(indicators, tenantId);
        return {
            indicators,
            alerts,
        };
    }
    /**
     * Process new payment history for risk indicators
     * @param paymentHistoryId - Payment history ID
     * @param tenantId - Tenant ID
     * @returns Generated risk indicators and alerts
     */
    async processNewPaymentHistory(paymentHistoryId, tenantId) {
        this.logger.log(`Processing new payment history ${paymentHistoryId} for risk indicators`);
        // Get payment history
        const payment = await this.paymentHistoryRepository.findOne({
            where: { id: paymentHistoryId, tenantId },
        });
        if (!payment) {
            throw new Error(`Payment history with ID ${paymentHistoryId} not found`);
        }
        const buyerId = payment.buyerId;
        // Check for late payment risk indicator
        const indicators = [];
        if (payment.daysPastDue > 0) {
            // Create late payment risk indicator
            const indicator = this.riskIndicatorRepository.create({
                buyerId,
                tenantId,
                indicatorType: 'payment_behavior',
                indicatorName: 'late_payment',
                description: `Payment is ${payment.daysPastDue} days past due`,
                riskLevel: this.determineLatePaymentRiskLevel(payment.daysPastDue),
                indicatorValue: payment.daysPastDue,
                thresholdValue: 0,
                trend: 'increasing',
                confidenceLevel: 95,
                source: 'payment_history',
                sourceReferenceId: paymentHistoryId,
                detectionDate: new Date(),
                status: 'active',
                additionalData: {
                    invoiceId: payment.invoiceId,
                    invoiceAmount: payment.invoiceAmount,
                    dueDate: payment.dueDate,
                    currencyCode: payment.currencyCode,
                },
            });
            await this.riskIndicatorRepository.save(indicator);
            indicators.push(indicator);
        }
        // Monitor buyer for additional risk indicators
        const additionalIndicators = await this.riskIndicatorMonitoringService.monitorBuyer(buyerId, tenantId);
        indicators.push(...additionalIndicators);
        // Generate alerts from indicators
        const alerts = await this.riskAlertService.generateAlertsFromIndicators(indicators, tenantId);
        return {
            indicators,
            alerts,
        };
    }
    /**
     * Process credit limit changes for risk indicators
     * @param creditLimitId - Credit limit ID
     * @param tenantId - Tenant ID
     * @returns Generated risk indicators and alerts
     */
    async processCreditLimitChange(creditLimitId, tenantId) {
        this.logger.log(`Processing credit limit change ${creditLimitId} for risk indicators`);
        // Get credit limit
        const creditLimit = await this.creditLimitRepository.findOne({
            where: { id: creditLimitId, tenantId },
        });
        if (!creditLimit) {
            throw new Error(`Credit limit with ID ${creditLimitId} not found`);
        }
        const buyerId = creditLimit.buyerId;
        // Check for high utilization risk indicator
        const indicators = [];
        if (creditLimit.utilizationPercentage >= 85) {
            // Create high utilization risk indicator
            const indicator = this.riskIndicatorRepository.create({
                buyerId,
                tenantId,
                indicatorType: 'credit_utilization',
                indicatorName: 'high_utilization',
                description: `Credit utilization is at ${creditLimit.utilizationPercentage}%`,
                riskLevel: this.determineUtilizationRiskLevel(creditLimit.utilizationPercentage),
                indicatorValue: creditLimit.utilizationPercentage,
                thresholdValue: 85,
                trend: 'increasing',
                confidenceLevel: 95,
                source: 'credit_limit',
                sourceReferenceId: creditLimitId,
                detectionDate: new Date(),
                status: 'active',
                additionalData: {
                    approvedLimit: creditLimit.approvedLimit,
                    currentUtilization: creditLimit.currentUtilization,
                    availableCredit: creditLimit.availableCredit,
                    currencyCode: creditLimit.currencyCode,
                },
            });
            await this.riskIndicatorRepository.save(indicator);
            indicators.push(indicator);
        }
        // Generate alerts from indicators
        const alerts = await this.riskAlertService.generateAlertsFromIndicators(indicators, tenantId);
        return {
            indicators,
            alerts,
        };
    }
    /**
     * Run scheduled risk monitoring for all buyers
     * @param tenantId - Tenant ID
     * @returns Summary of monitoring results
     */
    async runScheduledRiskMonitoring(tenantId) {
        this.logger.log(`Running scheduled risk monitoring for tenant ${tenantId}`);
        // Get all active credit limits to identify buyers to monitor
        const activeLimits = await this.creditLimitRepository.find({
            where: { tenantId, isActive: true },
        });
        const buyerIds = activeLimits.map(limit => limit.buyerId);
        // Deduplicate buyer IDs
        const uniqueBuyerIds = [...new Set(buyerIds)];
        this.logger.log(`Monitoring ${uniqueBuyerIds.length} buyers for risk indicators`);
        const results = {
            totalBuyers: uniqueBuyerIds.length,
            totalIndicators: 0,
            totalAlerts: 0,
            buyersWithIndicators: 0,
            indicatorsByRiskLevel: {
                critical: 0,
                veryHigh: 0,
                high: 0,
                medium: 0,
                low: 0,
                veryLow: 0,
            },
        };
        // Process each buyer
        for (const buyerId of uniqueBuyerIds) {
            // Monitor buyer for risk indicators
            const indicators = await this.riskIndicatorMonitoringService.monitorBuyer(buyerId, tenantId);
            if (indicators.length > 0) {
                results.buyersWithIndicators++;
                results.totalIndicators += indicators.length;
                // Count indicators by risk level
                indicators.forEach(indicator => {
                    switch (indicator.riskLevel) {
                        case risk_level_enum_1.RiskLevel.CRITICAL:
                            results.indicatorsByRiskLevel.critical++;
                            break;
                        case risk_level_enum_1.RiskLevel.VERY_HIGH:
                            results.indicatorsByRiskLevel.veryHigh++;
                            break;
                        case risk_level_enum_1.RiskLevel.HIGH:
                            results.indicatorsByRiskLevel.high++;
                            break;
                        case risk_level_enum_1.RiskLevel.MEDIUM:
                            results.indicatorsByRiskLevel.medium++;
                            break;
                        case risk_level_enum_1.RiskLevel.LOW:
                            results.indicatorsByRiskLevel.low++;
                            break;
                        case risk_level_enum_1.RiskLevel.VERY_LOW:
                            results.indicatorsByRiskLevel.veryLow++;
                            break;
                    }
                });
                // Generate alerts from indicators
                const alerts = await this.riskAlertService.generateAlertsFromIndicators(indicators, tenantId);
                results.totalAlerts += alerts.length;
            }
        }
        return results;
    }
    /**
     * Get risk summary for buyer
     * @param buyerId - Buyer ID
     * @param tenantId - Tenant ID
     * @returns Risk summary
     */
    async getBuyerRiskSummary(buyerId, tenantId) {
        this.logger.log(`Getting risk summary for buyer ${buyerId}`);
        // Get active risk indicators
        const activeIndicators = await this.riskIndicatorRepository.find({
            where: { buyerId, tenantId, status: 'active' },
            order: { detectionDate: 'DESC' },
        });
        // Get active alerts
        const activeAlerts = await this.riskAlertRepository.find({
            where: { buyerId, tenantId, status: (0, typeorm_2.In)(['new', 'in_progress']) },
            order: { createdAt: 'DESC' },
        });
        // Get credit assessment
        const creditAssessment = await this.creditAssessmentRepository.findOne({
            where: { buyerId, tenantId },
            order: { createdAt: 'DESC' },
        });
        // Get credit limit
        const creditLimit = await this.creditLimitRepository.findOne({
            where: { buyerId, tenantId, isActive: true },
        });
        // Determine overall risk level
        let overallRiskLevel = risk_level_enum_1.RiskLevel.LOW;
        if (activeIndicators.length > 0) {
            // Find highest risk level among active indicators
            activeIndicators.forEach(indicator => {
                if (this.getRiskLevelValue(indicator.riskLevel) > this.getRiskLevelValue(overallRiskLevel)) {
                    overallRiskLevel = indicator.riskLevel;
                }
            });
        }
        // Count indicators by type
        const indicatorsByType = activeIndicators.reduce((acc, indicator) => {
            if (!acc[indicator.indicatorType]) {
                acc[indicator.indicatorType] = 0;
            }
            acc[indicator.indicatorType]++;
            return acc;
        }, {});
        return {
            buyerId,
            overallRiskLevel,
            activeIndicatorsCount: activeIndicators.length,
            activeAlertsCount: activeAlerts.length,
            indicatorsByType,
            creditScore: creditAssessment ? creditAssessment.scoreValue : null,
            creditUtilization: creditLimit ? creditLimit.utilizationPercentage : null,
            recentIndicators: activeIndicators.slice(0, 5),
            recentAlerts: activeAlerts.slice(0, 5),
        };
    }
    /**
     * Get risk level value for comparison
     * @param riskLevel - Risk level
     * @returns Numeric value for comparison
     */
    getRiskLevelValue(riskLevel) {
        switch (riskLevel) {
            case risk_level_enum_1.RiskLevel.VERY_LOW:
                return 1;
            case risk_level_enum_1.RiskLevel.LOW:
                return 2;
            case risk_level_enum_1.RiskLevel.MEDIUM:
                return 3;
            case risk_level_enum_1.RiskLevel.HIGH:
                return 4;
            case risk_level_enum_1.RiskLevel.VERY_HIGH:
                return 5;
            case risk_level_enum_1.RiskLevel.CRITICAL:
                return 6;
            default:
                return 0;
        }
    }
    /**
     * Determine risk level for late payment
     * @param daysPastDue - Days past due
     * @returns Risk level
     */
    determineLatePaymentRiskLevel(daysPastDue) {
        if (daysPastDue >= 90) {
            return risk_level_enum_1.RiskLevel.CRITICAL;
        }
        else if (daysPastDue >= 60) {
            return risk_level_enum_1.RiskLevel.VERY_HIGH;
        }
        else if (daysPastDue >= 30) {
            return risk_level_enum_1.RiskLevel.HIGH;
        }
        else if (daysPastDue >= 15) {
            return risk_level_enum_1.RiskLevel.MEDIUM;
        }
        else if (daysPastDue >= 7) {
            return risk_level_enum_1.RiskLevel.LOW;
        }
        else {
            return risk_level_enum_1.RiskLevel.VERY_LOW;
        }
    }
    /**
     * Determine risk level for utilization percentage
     * @param percentage - Utilization percentage
     * @returns Risk level
     */
    determineUtilizationRiskLevel(percentage) {
        if (percentage >= 95) {
            return risk_level_enum_1.RiskLevel.CRITICAL;
        }
        else if (percentage >= 90) {
            return risk_level_enum_1.RiskLevel.VERY_HIGH;
        }
        else if (percentage >= 85) {
            return risk_level_enum_1.RiskLevel.HIGH;
        }
        else {
            return risk_level_enum_1.RiskLevel.MEDIUM;
        }
    }
};
exports.EarlyWarningIntegrationService = EarlyWarningIntegrationService;
exports.EarlyWarningIntegrationService = EarlyWarningIntegrationService = EarlyWarningIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(risk_indicator_entity_1.RiskIndicator)),
    __param(1, (0, typeorm_1.InjectRepository)(risk_alert_entity_1.RiskAlert)),
    __param(2, (0, typeorm_1.InjectRepository)(credit_limit_entity_1.CreditLimit)),
    __param(3, (0, typeorm_1.InjectRepository)(payment_history_entity_1.PaymentHistory)),
    __param(4, (0, typeorm_1.InjectRepository)(credit_assessment_entity_1.CreditAssessment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof risk_indicator_monitoring_service_1.RiskIndicatorMonitoringService !== "undefined" && risk_indicator_monitoring_service_1.RiskIndicatorMonitoringService) === "function" ? _a : Object, typeof (_b = typeof risk_alert_service_1.RiskAlertService !== "undefined" && risk_alert_service_1.RiskAlertService) === "function" ? _b : Object])
], EarlyWarningIntegrationService);
//# sourceMappingURL=early-warning-integration.service.js.map