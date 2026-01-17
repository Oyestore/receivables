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
var CashFlowOptimizationService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashFlowOptimizationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const financial_insight_entity_1 = require("../entities/financial-insight.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
const payment_transaction_entity_1 = require("../../entities/payment-transaction.entity");
const financing_request_entity_1 = require("../../financing/entities/financing-request.entity");
const organization_entity_1 = require("../../../organizations/entities/organization.entity");
const financial_intelligence_service_1 = require("./financial-intelligence.service");
/**
 * Service for generating data-driven cash flow optimization recommendations
 */
let CashFlowOptimizationService = CashFlowOptimizationService_1 = class CashFlowOptimizationService {
    constructor(insightRepository, invoiceRepository, paymentTransactionRepository, financingRequestRepository, organizationRepository, financialIntelligenceService, eventEmitter) {
        this.insightRepository = insightRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.financingRequestRepository = financingRequestRepository;
        this.organizationRepository = organizationRepository;
        this.financialIntelligenceService = financialIntelligenceService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(CashFlowOptimizationService_1.name);
    }
    /**
     * Generate cash flow optimization recommendations
     */
    async generateRecommendations(organizationId) {
        try {
            this.logger.log(`Generating cash flow optimization recommendations for organization: ${organizationId}`);
            // Get organization
            const organization = await this.organizationRepository.findOne({
                where: { id: organizationId },
            });
            if (!organization) {
                throw new Error('Organization not found');
            }
            // Get real-time financial intelligence
            const intelligence = await this.financialIntelligenceService.generateRealTimeIntelligence(organizationId);
            // Initialize recommendations array
            const recommendations = [];
            // Generate recommendations based on financial intelligence
            await this.analyzeReceivablesHealth(organizationId, intelligence, recommendations);
            await this.analyzePaymentTerms(organizationId, intelligence, recommendations);
            await this.analyzeFinancingOptions(organizationId, intelligence, recommendations);
            await this.analyzeInvoicingStrategies(organizationId, intelligence, recommendations);
            await this.analyzeCustomerSegmentation(organizationId, intelligence, recommendations);
            // Sort recommendations by impact (high to low)
            recommendations.sort((a, b) => {
                const impactOrder = { high: 0, medium: 1, low: 2 };
                return impactOrder[a.impact] - impactOrder[b.impact];
            });
            return recommendations;
        }
        catch (error) {
            this.logger.error(`Error generating cash flow optimization recommendations: ${error.message}`, error.stack);
            throw error;
        }
    }
    /**
     * Analyze receivables health and generate recommendations
     */
    async analyzeReceivablesHealth(organizationId, intelligence, recommendations) {
        try {
            const { receivablesHealth } = intelligence;
            // Check DSO (Days Sales Outstanding)
            if (receivablesHealth.averageDSO > 45) {
                recommendations.push({
                    id: this.generateUniqueId(),
                    title: 'Reduce Days Sales Outstanding (DSO)',
                    description: `Your average DSO of ${Math.round(receivablesHealth.averageDSO)} days is higher than the recommended 30-45 days. Reducing DSO can significantly improve your cash flow.`,
                    impact: receivablesHealth.averageDSO > 60 ? 'high' : 'medium',
                    timeframe: 'short_term',
                    category: 'receivables_management',
                    actionSteps: [
                        'Implement early payment incentives (1-2% discount for payments within 10 days)',
                        'Review and optimize your invoicing process to eliminate delays',
                        'Set up automated payment reminders at 7, 3, and 1 days before due date',
                        'Consider offering multiple payment methods to make it easier for customers to pay',
                    ],
                    expectedBenefit: `Reducing DSO by 15 days could free up approximately ₹${this.formatCurrency(this.calculateDSOImpact(receivablesHealth))} in cash flow.`,
                    metrics: {
                        currentDSO: receivablesHealth.averageDSO,
                        targetDSO: Math.min(30, receivablesHealth.averageDSO * 0.7),
                        potentialCashFlowImprovement: this.calculateDSOImpact(receivablesHealth),
                    },
                });
            }
            // Check overdue percentage
            if (receivablesHealth.overduePercentage > 20) {
                recommendations.push({
                    id: this.generateUniqueId(),
                    title: 'Reduce Overdue Receivables',
                    description: `${Math.round(receivablesHealth.overduePercentage)}% of your receivables are currently overdue. Reducing this percentage can improve cash flow predictability and reduce bad debt risk.`,
                    impact: receivablesHealth.overduePercentage > 30 ? 'high' : 'medium',
                    timeframe: 'immediate',
                    category: 'collections_management',
                    actionSteps: [
                        'Implement a structured follow-up process for overdue invoices',
                        'Prioritize collection efforts on oldest and largest overdue invoices',
                        'Consider offering payment plans for customers with large overdue balances',
                        'Review credit terms for customers with consistent late payment history',
                    ],
                    expectedBenefit: `Converting half of your overdue receivables to on-time payments could provide immediate access to ₹${this.formatCurrency(receivablesHealth.overdueAmount / 2)}.`,
                    metrics: {
                        currentOverduePercentage: receivablesHealth.overduePercentage,
                        targetOverduePercentage: 15,
                        currentOverdueAmount: receivablesHealth.overdueAmount,
                        potentialCashFlowImprovement: receivablesHealth.overdueAmount / 2,
                    },
                });
            }
            // Check if there are enough invoices to implement a structured approach
            if (receivablesHealth.invoiceCount > 20) {
                recommendations.push({
                    id: this.generateUniqueId(),
                    title: 'Implement Structured Receivables Management',
                    description: 'With your invoice volume, a structured approach to receivables management could significantly improve cash flow predictability and reduce collection efforts.',
                    impact: 'medium',
                    timeframe: 'short_term',
                    category: 'process_optimization',
                    actionSteps: [
                        'Segment customers based on payment behavior and invoice size',
                        'Implement differentiated collection strategies for each segment',
                        'Set up automated workflows for invoice delivery, reminders, and follow-ups',
                        'Establish clear escalation procedures for severely overdue accounts',
                    ],
                    expectedBenefit: 'A structured approach typically reduces DSO by 20% and overdue receivables by 30% within 3 months.',
                    metrics: {
                        currentInvoiceCount: receivablesHealth.invoiceCount,
                        currentOverdueCount: receivablesHealth.overdueInvoiceCount,
                        potentialDSOReduction: receivablesHealth.averageDSO * 0.2,
                        potentialOverdueReduction: receivablesHealth.overdueAmount * 0.3,
                    },
                });
            }
        }
        catch (error) {
            this.logger.error(`Error analyzing receivables health: ${error.message}`, error.stack);
        }
    }
    /**
     * Analyze payment terms and generate recommendations
     */
    async analyzePaymentTerms(organizationId, intelligence, recommendations) {
        try {
            // Get recent invoices
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentInvoices = await this.invoiceRepository.find({
                where: {
                    organizationId,
                    createdAt: (0, typeorm_2.MoreThan)(thirtyDaysAgo),
                },
            });
            // Analyze payment terms
            const paymentTermsMap = {};
            let totalInvoices = 0;
            for (const invoice of recentInvoices) {
                if (invoice.paymentTerms) {
                    const days = invoice.paymentTerms;
                    paymentTermsMap[days] = (paymentTermsMap[days] || 0) + 1;
                    totalInvoices++;
                }
            }
            // Check if payment terms are too long
            const longTermsCount = Object.entries(paymentTermsMap)
                .filter(([days, count]) => Number(days) > 30)
                .reduce((sum, [days, count]) => sum + count, 0);
            const longTermsPercentage = totalInvoices > 0 ? (longTermsCount / totalInvoices) * 100 : 0;
            if (longTermsPercentage > 50) {
                recommendations.push({
                    id: this.generateUniqueId(),
                    title: 'Optimize Payment Terms',
                    description: `${Math.round(longTermsPercentage)}% of your invoices have payment terms longer than 30 days. Shortening payment terms can significantly improve cash flow.`,
                    impact: 'high',
                    timeframe: 'short_term',
                    category: 'payment_terms',
                    actionSteps: [
                        'Gradually reduce payment terms for new customers to 30 days or less',
                        'Negotiate shorter payment terms with existing customers',
                        'Offer early payment incentives to encourage faster payments',
                        'Consider differentiated payment terms based on customer segments',
                    ],
                    expectedBenefit: 'Reducing payment terms by 15 days across your customer base could improve cash flow cycle by two weeks.',
                    metrics: {
                        currentLongTermsPercentage: longTermsPercentage,
                        targetLongTermsPercentage: 20,
                        averageCurrentTerms: this.calculateAveragePaymentTerms(paymentTermsMap, totalInvoices),
                        recommendedTerms: 30,
                    },
                });
            }
            // Check if payment terms are inconsistent
            if (Object.keys(paymentTermsMap).length > 3 && totalInvoices > 10) {
                recommendations.push({
                    id: this.generateUniqueId(),
                    title: 'Standardize Payment Terms',
                    description: `You're currently using ${Object.keys(paymentTermsMap).length} different payment terms across your invoices. Standardizing terms can simplify receivables management and improve cash flow predictability.`,
                    impact: 'medium',
                    timeframe: 'immediate',
                    category: 'payment_terms',
                    actionSteps: [
                        'Define 2-3 standard payment terms for different customer segments',
                        'Update your invoicing templates to use standardized terms',
                        'Communicate changes to customers with sufficient notice',
                        'Monitor the impact on payment behavior after standardization',
                    ],
                    expectedBenefit: 'Standardized payment terms typically improve payment compliance by 15-20% and reduce administrative overhead.',
                    metrics: {
                        currentTermsVariations: Object.keys(paymentTermsMap).length,
                        recommendedVariations: 3,
                        mostCommonTerms: this.findMostCommonPaymentTerms(paymentTermsMap),
                    },
                });
            }
            // Check if early payment discounts are being used
            const discountedInvoices = recentInvoices.filter(invoice => invoice.metadata &&
                invoice.metadata.earlyPaymentDiscount &&
                invoice.metadata.earlyPaymentDiscount.percentage > 0);
            const discountPercentage = totalInvoices > 0 ? (discountedInvoices.length / totalInvoices) * 100 : 0;
            if (discountPercentage < 20 && intelligence.receivablesHealth.averageDSO > 40) {
                recommendations.push({
                    id: this.generateUniqueId(),
                    title: 'Implement Early Payment Discounts',
                    description: 'Only a small percentage of your invoices include early payment incentives. Implementing strategic discounts can accelerate collections and improve cash flow.',
                    impact: 'medium',
                    timeframe: 'immediate',
                    category: 'payment_incentives',
                    actionSteps: [
                        'Implement a standard early payment discount (e.g., 2% if paid within 10 days)',
                        'Clearly communicate discount terms on invoices',
                        'Track the adoption rate and impact on payment timing',
                        'Adjust discount percentages based on results',
                    ],
                    expectedBenefit: `If 30% of customers take advantage of early payment discounts, you could reduce DSO by approximately ${Math.round(intelligence.receivablesHealth.averageDSO * 0.3)} days.`,
                    metrics: {
                        currentDiscountedPercentage: discountPercentage,
                        recommendedDiscountedPercentage: 50,
                        suggestedDiscountRate: '2%',
                        suggestedDiscountWindow: '10 days',
                        potentialDSOReduction: intelligence.receivablesHealth.averageDSO * 0.3,
                    },
                });
            }
        }
        catch (error) {
            this.logger.error(`Error analyzing payment terms: ${error.message}`, error.stack);
        }
    }
    /**
     * Analyze financing options and generate recommendations
     */
    async analyzeFinancingOptions(organizationId, intelligence, recommendations) {
        try {
            const { receivablesHealth, financingStatus } = intelligence;
            // Check if organization is using financing
            const isUsingFinancing = financingStatus.activeFinancingCount > 0;
            // Check if organization has significant overdue receivables
            if (receivablesHealth.overdueAmount > 100000 && !isUsingFinancing) {
                recommendations.push({
                    id: this.generateUniqueId(),
                    title: 'Consider Invoice Financing for Overdue Receivables',
                    description: `You have ₹${this.formatCurrency(receivablesHealth.overdueAmount)} in overdue receivables that could be converted to immediate cash flow through invoice financing.`,
                    impact: 'high',
                    timeframe: 'immediate',
                    category: 'financing_strategy',
                    actionSteps: [
                        'Identify high-value, overdue invoices from creditworthy customers',
                        'Explore invoice financing options through the platform',
                        'Compare financing costs against the benefits of immediate cash flow',
                        'Implement a selective financing strategy for suitable invoices',
                    ],
                    expectedBenefit: `Converting 70% of overdue receivables to cash could provide immediate access to approximately ₹${this.formatCurrency(receivablesHealth.overdueAmount * 0.7)}.`,
                    metrics: {
                        eligibleOverdueAmount: receivablesHealth.overdueAmount,
                        potentialFinancingAmount: receivablesHealth.overdueAmount * 0.7,
                        estimatedFinancingCost: receivablesHealth.overdueAmount * 0.7 * 0.015, // Assuming 1.5% fee
                        netBenefit: receivablesHealth.overdueAmount * 0.7 * 0.985,
                    },
                }(Content, truncated, due, to, size, limit.Use, line, ranges, to, read in chunks));
            }
        }
        finally { }
    }
};
exports.CashFlowOptimizationService = CashFlowOptimizationService;
exports.CashFlowOptimizationService = CashFlowOptimizationService = CashFlowOptimizationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(financial_insight_entity_1.FinancialInsight)),
    __param(1, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __param(2, (0, typeorm_1.InjectRepository)(payment_transaction_entity_1.PaymentTransaction)),
    __param(3, (0, typeorm_1.InjectRepository)(financing_request_entity_1.FinancingRequest)),
    __param(4, (0, typeorm_1.InjectRepository)(organization_entity_1.Organization)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        financial_intelligence_service_1.FinancialIntelligenceService, typeof (_a = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _a : Object])
], CashFlowOptimizationService);
//# sourceMappingURL=cash-flow-optimization.service.js.map