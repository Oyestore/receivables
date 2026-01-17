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
var ABTestingService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABTestingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ab_test_experiment_entity_1 = require("../entities/ab-test-experiment.entity");
const payment_discount_rule_entity_1 = require("../entities/payment-discount-rule.entity");
const payment_late_fee_rule_entity_1 = require("../entities/payment-late-fee-rule.entity");
const invoice_entity_1 = require("../../../invoices/entities/invoice.entity");
const event_emitter_1 = require("@nestjs/event-emitter");
let ABTestingService = ABTestingService_1 = class ABTestingService {
    constructor(experimentRepository, discountRuleRepository, lateFeeRuleRepository, invoiceRepository, eventEmitter) {
        this.experimentRepository = experimentRepository;
        this.discountRuleRepository = discountRuleRepository;
        this.lateFeeRuleRepository = lateFeeRuleRepository;
        this.invoiceRepository = invoiceRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(ABTestingService_1.name);
    }
    /**
     * Create a new A/B test experiment
     */
    async createExperiment(organizationId, experimentData) {
        // Validate experiment data
        this.validateExperimentData(experimentData);
        // Create the experiment
        const experiment = this.experimentRepository.create({
            ...experimentData,
            organizationId,
        });
        // Save the experiment
        return this.experimentRepository.save(experiment);
    }
    /**
     * Update an existing experiment
     */
    async updateExperiment(id, experimentData) {
        const experiment = await this.experimentRepository.findOne({
            where: { id },
        });
        if (!experiment) {
            throw new Error('Experiment not found');
        }
        // Prevent updates to active experiments except for status changes
        if (experiment.status === ab_test_experiment_entity_1.ExperimentStatus.ACTIVE) {
            const allowedUpdates = ['status', 'endDate'];
            const attemptedUpdates = Object.keys(experimentData);
            const invalidUpdates = attemptedUpdates.filter(key => !allowedUpdates.includes(key));
            if (invalidUpdates.length > 0) {
                throw new Error(`Cannot update ${invalidUpdates.join(', ')} for an active experiment`);
            }
        }
        // Update the experiment
        await this.experimentRepository.update(id, experimentData);
        return this.experimentRepository.findOne({
            where: { id },
        });
    }
    /**
     * Start an experiment
     */
    async startExperiment(id) {
        const experiment = await this.experimentRepository.findOne({
            where: { id },
        });
        if (!experiment) {
            throw new Error('Experiment not found');
        }
        if (experiment.status !== ab_test_experiment_entity_1.ExperimentStatus.DRAFT && experiment.status !== ab_test_experiment_entity_1.ExperimentStatus.PAUSED) {
            throw new Error('Only draft or paused experiments can be started');
        }
        // Validate experiment is ready to start
        this.validateExperimentData(experiment);
        // Update experiment status
        experiment.status = ab_test_experiment_entity_1.ExperimentStatus.ACTIVE;
        experiment.startDate = new Date();
        // Save the experiment
        await this.experimentRepository.save(experiment);
        // Emit event for experiment start
        this.eventEmitter.emit('experiment.started', {
            experimentId: experiment.id,
            experimentType: experiment.experimentType,
            startDate: experiment.startDate,
        });
        return experiment;
    }
    /**
     * Pause an experiment
     */
    async pauseExperiment(id) {
        const experiment = await this.experimentRepository.findOne({
            where: { id },
        });
        if (!experiment) {
            throw new Error('Experiment not found');
        }
        if (experiment.status !== ab_test_experiment_entity_1.ExperimentStatus.ACTIVE) {
            throw new Error('Only active experiments can be paused');
        }
        // Update experiment status
        experiment.status = ab_test_experiment_entity_1.ExperimentStatus.PAUSED;
        // Save the experiment
        await this.experimentRepository.save(experiment);
        // Emit event for experiment pause
        this.eventEmitter.emit('experiment.paused', {
            experimentId: experiment.id,
            experimentType: experiment.experimentType,
        });
        return experiment;
    }
    /**
     * Complete an experiment
     */
    async completeExperiment(id, winnerVariantId) {
        const experiment = await this.experimentRepository.findOne({
            where: { id },
        });
        if (!experiment) {
            throw new Error('Experiment not found');
        }
        if (experiment.status !== ab_test_experiment_entity_1.ExperimentStatus.ACTIVE && experiment.status !== ab_test_experiment_entity_1.ExperimentStatus.PAUSED) {
            throw new Error('Only active or paused experiments can be completed');
        }
        // If winner variant is provided, validate it exists
        if (winnerVariantId) {
            const variantExists = experiment.variants.some(v => v.id === winnerVariantId);
            if (!variantExists) {
                throw new Error('Winner variant not found in experiment');
            }
            experiment.winnerVariantId = winnerVariantId;
        }
        else if (experiment.isAutomaticWinnerSelection && experiment.results) {
            // Automatic winner selection based on primary metric
            const primaryMetric = experiment.metrics?.primary;
            if (primaryMetric && experiment.results[primaryMetric]) {
                const metricResults = experiment.results[primaryMetric];
                let bestVariantId = null;
                let bestValue = null;
                for (const [variantId, value] of Object.entries(metricResults)) {
                    if (bestValue === null || value > bestValue) {
                        bestValue = value;
                        bestVariantId = variantId;
                    }
                }
                if (bestVariantId) {
                    experiment.winnerVariantId = bestVariantId;
                }
            }
        }
        // Update experiment status
        experiment.status = ab_test_experiment_entity_1.ExperimentStatus.COMPLETED;
        experiment.endDate = new Date();
        // Save the experiment
        await this.experimentRepository.save(experiment);
        // Emit event for experiment completion
        this.eventEmitter.emit('experiment.completed', {
            experimentId: experiment.id,
            experimentType: experiment.experimentType,
            endDate: experiment.endDate,
            winnerVariantId: experiment.winnerVariantId,
        });
        return experiment;
    }
    /**
     * Archive an experiment
     */
    async archiveExperiment(id) {
        const experiment = await this.experimentRepository.findOne({
            where: { id },
        });
        if (!experiment) {
            throw new Error('Experiment not found');
        }
        if (experiment.status === ab_test_experiment_entity_1.ExperimentStatus.ACTIVE) {
            throw new Error('Cannot archive an active experiment');
        }
        // Update experiment status
        experiment.status = ab_test_experiment_entity_1.ExperimentStatus.ARCHIVED;
        // Save the experiment
        await this.experimentRepository.save(experiment);
        return experiment;
    }
    /**
     * Get experiments for an organization
     */
    async getExperiments(organizationId, filters) {
        const whereClause = { organizationId };
        if (filters) {
            if (filters.status)
                whereClause.status = filters.status;
            if (filters.experimentType)
                whereClause.experimentType = filters.experimentType;
        }
        return this.experimentRepository.find({
            where: whereClause,
            order: {
                createdAt: 'DESC',
            },
        });
    }
    /**
     * Get experiment by ID
     */
    async getExperimentById(id) {
        const experiment = await this.experimentRepository.findOne({
            where: { id },
        });
        if (!experiment) {
            throw new Error('Experiment not found');
        }
        return experiment;
    }
    /**
     * Record experiment event
     */
    async recordExperimentEvent(experimentId, variantId, eventType, eventData) {
        const experiment = await this.experimentRepository.findOne({
            where: { id: experimentId },
        });
        if (!experiment) {
            throw new Error('Experiment not found');
        }
        if (experiment.status !== ab_test_experiment_entity_1.ExperimentStatus.ACTIVE) {
            this.logger.warn(`Attempted to record event for non-active experiment ${experimentId}`);
            return;
        }
        // Validate variant exists
        const variantExists = experiment.variants.some(v => v.id === variantId);
        if (!variantExists) {
            throw new Error('Variant not found in experiment');
        }
        // Initialize results object if needed
        if (!experiment.results) {
            experiment.results = {};
        }
        // Initialize event type in results if needed
        if (!experiment.results[eventType]) {
            experiment.results[eventType] = {};
        }
        // Initialize variant in event type if needed
        if (!experiment.results[eventType][variantId]) {
            experiment.results[eventType][variantId] = {
                count: 0,
                sum: 0,
                values: [],
            };
        }
        // Update metrics
        const variantMetrics = experiment.results[eventType][variantId];
        variantMetrics.count += 1;
        if (eventData.value !== undefined) {
            variantMetrics.sum += eventData.value;
            variantMetrics.values.push(eventData.value);
        }
        // Save the experiment
        await this.experimentRepository.save(experiment);
        // Emit event for experiment data recording
        this.eventEmitter.emit('experiment.data_recorded', {
            experimentId,
            variantId,
            eventType,
            eventData,
        });
    }
    /**
     * Get variant for an invoice based on active experiments
     */
    async getVariantForInvoice(invoiceId, experimentType) {
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
        });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        // Get active experiments for the organization and type
        const activeExperiments = await this.experimentRepository.find({
            where: {
                organizationId: invoice.organizationId,
                status: ab_test_experiment_entity_1.ExperimentStatus.ACTIVE,
                experimentType,
            },
        });
        if (!activeExperiments.length) {
            return null;
        }
        // Find applicable experiment based on targeting criteria
        let applicableExperiment = null;
        for (const experiment of activeExperiments) {
            if (this.isInvoiceEligibleForExperiment(invoice, experiment)) {
                applicableExperiment = experiment;
                break;
            }
        }
        if (!applicableExperiment) {
            return null;
        }
        // Determine variant based on consistent hashing of invoice ID
        const variantId = this.determineVariantForInvoice(invoice.id, applicableExperiment);
        if (!variantId) {
            return null;
        }
        // Find variant configuration
        const variant = applicableExperiment.variants.find(v => v.id === variantId);
        return {
            experimentId: applicableExperiment.id,
            variantId,
            configuration: variant.configuration,
        };
    }
    /**
     * Apply experiment variant for discount rules
     */
    async applyDiscountExperimentVariant(invoiceId) {
        const variant = await this.getVariantForInvoice(invoiceId, ab_test_experiment_entity_1.ExperimentType.DISCOUNT_STRATEGY);
        if (!variant) {
            return null;
        }
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
        });
        // Create a temporary discount rule based on variant configuration
        const discountRule = this.discountRuleRepository.create({
            name: `Experiment ${variant.experimentId} - Variant ${variant.variantId}`,
            organizationId: invoice.organizationId,
            ...variant.configuration,
        });
        // Record experiment exposure
        await this.recordExperimentEvent(variant.experimentId, variant.variantId, 'exposure', { invoiceId });
        return discountRule;
    }
    /**
     * Apply experiment variant for late fee rules
     */
    async applyLateFeeExperimentVariant(invoiceId) {
        const variant = await this.getVariantForInvoice(invoiceId, ab_test_experiment_entity_1.ExperimentType.LATE_FEE_STRATEGY);
        if (!variant) {
            return null;
        }
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
        });
        // Create a temporary late fee rule based on variant configuration
        const lateFeeRule = this.lateFeeRuleRepository.create({
            name: `Experiment ${variant.experimentId} - Variant ${variant.variantId}`,
            organizationId: invoice.organizationId,
            ...variant.configuration,
        });
        // Record experiment exposure
        await this.recordExperimentEvent(variant.experimentId, variant.variantId, 'exposure', { invoiceId });
        return lateFeeRule;
    }
    /**
     * Record payment conversion for experiment
     */
    async recordPaymentConversion(invoiceId, experimentType, paymentData) {
        const variant = await this.getVariantForInvoice(invoiceId, experimentType);
        if (!variant) {
            return;
        }
        // Record conversion event
        await this.recordExperimentEvent(variant.experimentId, variant.variantId, 'conversion', {
            invoiceId,
            value: paymentData.amount,
            daysBeforeDueDate: paymentData.daysBeforeDueDate,
        });
    }
    /**
     * Private helper methods
     */
    validateExperimentData(experimentData) {
        // Check variants
        if (!experimentData.variants || !Array.isArray(experimentData.variants) || experimentData.variants.length < 2) {
            throw new Error('Experiment must have at least 2 variants');
        }
        // Check traffic allocation
        const totalAllocation = experimentData.variants.reduce((sum, variant) => sum + (variant.trafficAllocation || 0), 0);
        if (Math.abs(totalAllocation - 100) > 0.01) {
            throw new Error('Total traffic allocation must be 100%');
        }
        // Check experiment type
        if (!Object.values(ab_test_experiment_entity_1.ExperimentType).includes(experimentData.experimentType)) {
            throw new Error('Invalid experiment type');
        }
        // Check metrics
        if (!experimentData.metrics || !experimentData.metrics.primary) {
            throw new Error('Experiment must have a primary metric');
        }
    }
    isInvoiceEligibleForExperiment(invoice, experiment) {
        if (!experiment.targetCriteria) {
            return true;
        }
        const criteria = experiment.targetCriteria;
        // Check amount range
        if (criteria.minAmount && invoice.totalAmount < criteria.minAmount) {
            return false;
        }
        if (criteria.maxAmount && invoice.totalAmount > criteria.maxAmount) {
            return false;
        }
        // Check currency
        if (criteria.currency && invoice.currency !== criteria.currency) {
            return false;
        }
        // Check customer type
        if (criteria.customerType && invoice.customerType !== criteria.customerType) {
            return false;
        }
        // Add more criteria checks as needed
        return true;
    }
    determineVariantForInvoice(invoiceId, experiment) {
        // Use a hash of the invoice ID to ensure consistent variant assignment
        const hash = this.h(Content, truncated, due, to, size, limit.Use, line, ranges, to, read in chunks);
    }
};
exports.ABTestingService = ABTestingService;
exports.ABTestingService = ABTestingService = ABTestingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ab_test_experiment_entity_1.ABTestExperiment)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_discount_rule_entity_1.PaymentDiscountRule)),
    __param(2, (0, typeorm_1.InjectRepository)(payment_late_fee_rule_entity_1.PaymentLateFeeRule)),
    __param(3, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _a : Object])
], ABTestingService);
//# sourceMappingURL=ab-testing.service.js.map