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
var TermsIntegrationService_1;
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TermsIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const dynamic_terms_management_service_1 = require("../../payment/reputation/services/dynamic-terms-management.service");
const template_service_1 = require("../../templates/services/template.service");
const conditional_logic_service_1 = require("../../conditional-logic/services/conditional-logic.service");
/**
 * Service for integrating reputation-based payment terms with T&C module
 */
let TermsIntegrationService = TermsIntegrationService_1 = class TermsIntegrationService {
    constructor(dynamicTermsService, templateService, conditionalLogicService, eventEmitter) {
        this.dynamicTermsService = dynamicTermsService;
        this.templateService = templateService;
        this.conditionalLogicService = conditionalLogicService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(TermsIntegrationService_1.name);
        // Listen for payment terms updates to trigger document regeneration if needed
        this.eventEmitter.on('payment.terms.updated', (terms) => {
            this.handleTermsUpdate(terms);
        });
    }
    /**
     * Enrich template context with dynamic payment terms
     */
    async enrichTemplateContext(organizationId, customerId, context) {
        try {
            this.logger.log(`Enriching template context with dynamic payment terms for customer: ${customerId}`);
            // Get formatted terms for document generation
            const paymentTerms = await this.dynamicTermsService.getTermsForDocument(organizationId, customerId);
            // Add payment terms to context
            const enrichedContext = {
                ...context,
                paymentTerms,
            };
            // Add conditional variables for template logic
            enrichedContext.paymentTermDays = paymentTerms.paymentTermDays;
            enrichedContext.hasEarlyPaymentDiscount = paymentTerms.earlyPaymentDiscount.available;
            enrichedContext.hasLatePaymentFee = paymentTerms.latePaymentFee.applicable;
            enrichedContext.requiresDeposit = paymentTerms.depositRequirement.required;
            enrichedContext.allowsInstallments = paymentTerms.installmentOptions.available;
            // Add risk category if available
            if (paymentTerms.riskCategory) {
                enrichedContext.customerRiskCategory = paymentTerms.riskCategory;
            }
            return enrichedContext;
        }
        catch (error) {
            this.logger.error(`Error enriching template context with payment terms: ${error.message}`, error.stack);
            // Return original context if there's an error
            return context;
        }
    }
    /**
     * Register payment terms conditional logic variables
     */
    async registerPaymentTermsConditionalVariables() {
        try {
            this.logger.log('Registering payment terms conditional variables');
            // Register variables for conditional logic
            await this.conditionalLogicService.registerVariables([
                {
                    name: 'paymentTermDays',
                    description: 'Number of days for payment terms',
                    type: 'number',
                    scope: 'invoice',
                },
                {
                    name: 'hasEarlyPaymentDiscount',
                    description: 'Whether early payment discount is available',
                    type: 'boolean',
                    scope: 'invoice',
                },
                {
                    name: 'hasLatePaymentFee',
                    description: 'Whether late payment fee is applicable',
                    type: 'boolean',
                    scope: 'invoice',
                },
                {
                    name: 'requiresDeposit',
                    description: 'Whether deposit is required',
                    type: 'boolean',
                    scope: 'invoice',
                },
                {
                    name: 'allowsInstallments',
                    description: 'Whether installment payments are allowed',
                    type: 'boolean',
                    scope: 'invoice',
                },
                {
                    name: 'customerRiskCategory',
                    description: 'Risk category of the customer',
                    type: 'string',
                    scope: 'customer',
                },
            ]);
            // Register predefined conditions
            await this.conditionalLogicService.registerPredefinedConditions([
                {
                    name: 'isPremiumCustomer',
                    description: 'Checks if customer is in premium risk category',
                    condition: 'customerRiskCategory === "premium"',
                    scope: 'customer',
                },
                {
                    name: 'isHighRiskCustomer',
                    description: 'Checks if customer is in high or severe risk category',
                    condition: 'customerRiskCategory === "high_risk" || customerRiskCategory === "severe_risk"',
                    scope: 'customer',
                },
                {
                    name: 'hasLongPaymentTerms',
                    description: 'Checks if payment terms are longer than 30 days',
                    condition: 'paymentTermDays > 30',
                    scope: 'invoice',
                },
            ]);
        }
        catch (error) {
            this.logger.error(`Error registering payment terms conditional variables: ${error.message}`, error.stack);
            throw error;
        }
    }
    /**
     * Generate payment terms section for T&C document
     */
    async generatePaymentTermsSection(organizationId, customerId, templateId) {
        try {
            this.logger.log(`Generating payment terms section for customer: ${customerId}`);
            // Get formatted terms for document generation
            const paymentTerms = await this.dynamicTermsService.getTermsForDocument(organizationId, customerId);
            // If template ID is provided, use template service to generate section
            if (templateId) {
                const context = { paymentTerms };
                return this.templateService.renderTemplate(templateId, context);
            }
            // Otherwise, generate default payment terms section
            let termsSection = '## Payment Terms\n\n';
            // Add payment terms text
            termsSection += paymentTerms.paymentTermsText + '\n\n';
            // Add early payment discount if available
            if (paymentTerms.earlyPaymentDiscount.available) {
                termsSection += paymentTerms.earlyPaymentDiscount.text + '\n\n';
            }
            // Add late payment fee if applicable
            if (paymentTerms.latePaymentFee.applicable) {
                termsSection += paymentTerms.latePaymentFee.text + '\n\n';
            }
            // Add deposit requirement if required
            if (paymentTerms.depositRequirement.required) {
                termsSection += paymentTerms.depositRequirement.text + '\n\n';
            }
            // Add installment options if available
            if (paymentTerms.installmentOptions.available) {
                termsSection += paymentTerms.installmentOptions.text + '\n\n';
            }
            // Add additional terms if any
            if (paymentTerms.additionalTerms && Object.keys(paymentTerms.additionalTerms).length > 0) {
                termsSection += '### Additional Terms\n\n';
                for (const [key, value] of Object.entries(paymentTerms.additionalTerms)) {
                    if (typeof value === 'boolean' && value) {
                        termsSection += `- ${this.formatTermKey(key)}\n`;
                    }
                    else if (typeof value !== 'boolean') {
                        termsSection += `- ${this.formatTermKey(key)}: ${value}\n`;
                    }
                }
            }
            return termsSection;
        }
        catch (error) {
            this.logger.error(`Error generating payment terms section: ${error.message}`, error.stack);
            // Return basic payment terms if there's an error
            return '## Payment Terms\n\nStandard payment terms apply.';
        }
    }
    /**
     * Format term key for display
     */
    formatTermKey(key) {
        return key
            .split(/(?=[A-Z])/)
            .join(' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }
    /**
     * Handle payment terms update event
     */
    async handleTermsUpdate(terms) {
        try {
            this.logger.log(`Handling payment terms update for customer: ${terms.customerId}`);
            // Emit event for document regeneration if needed
            this.eventEmitter.emit('document.terms.updated', {
                organizationId: terms.organizationId,
                customerId: terms.customerId,
                termsId: terms.id,
                updateType: 'payment_terms',
            });
        }
        catch (error) {
            this.logger.error(`Error handling payment terms update: ${error.message}`, error.stack);
        }
    }
    /**
     * Apply payment terms to document
     */
    async applyPaymentTermsToDocument(organizationId, customerId, documentContent, placeholderTag = '{{PAYMENT_TERMS}}') {
        try {
            this.logger.log(`Applying payment terms to document for customer: ${customerId}`);
            // Generate payment terms section
            const paymentTermsSection = await this.generatePaymentTermsSection(organizationId, customerId);
            // Replace placeholder with generated section
            return documentContent.replace(placeholderTag, paymentTermsSection);
        }
        catch (error) {
            this.logger.error(`Error applying payment terms to document: ${error.message}`, error.stack);
            // Return original content if there's an error
            return documentContent;
        }
    }
};
exports.TermsIntegrationService = TermsIntegrationService;
exports.TermsIntegrationService = TermsIntegrationService = TermsIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof dynamic_terms_management_service_1.DynamicTermsManagementService !== "undefined" && dynamic_terms_management_service_1.DynamicTermsManagementService) === "function" ? _a : Object, typeof (_b = typeof template_service_1.TemplateService !== "undefined" && template_service_1.TemplateService) === "function" ? _b : Object, typeof (_c = typeof conditional_logic_service_1.ConditionalLogicService !== "undefined" && conditional_logic_service_1.ConditionalLogicService) === "function" ? _c : Object, typeof (_d = typeof event_emitter_1.EventEmitter2 !== "undefined" && event_emitter_1.EventEmitter2) === "function" ? _d : Object])
], TermsIntegrationService);
//# sourceMappingURL=terms-integration.service.js.map