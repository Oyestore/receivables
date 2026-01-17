import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DynamicTermsManagementService } from '../../payment/reputation/services/dynamic-terms-management.service';
import { TemplateService } from '../../templates/services/template.service';
import { ConditionalLogicService } from '../../conditional-logic/services/conditional-logic.service';

/**
 * Service for integrating reputation-based payment terms with T&C module
 */
@Injectable()
export class TermsIntegrationService {
  private readonly logger = new Logger(TermsIntegrationService.name);

  constructor(
    private readonly dynamicTermsService: DynamicTermsManagementService,
    private readonly templateService: TemplateService,
    private readonly conditionalLogicService: ConditionalLogicService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Listen for payment terms updates to trigger document regeneration if needed
    this.eventEmitter.on('payment.terms.updated', (terms) => {
      this.handleTermsUpdate(terms);
    });
  }

  /**
   * Enrich template context with dynamic payment terms
   */
  async enrichTemplateContext(
    organizationId: string,
    customerId: string,
    context: Record<string, any>,
  ): Promise<Record<string, any>> {
    try {
      this.logger.log(`Enriching template context with dynamic payment terms for customer: ${customerId}`);
      
      // Get formatted terms for document generation
      const paymentTerms = await this.dynamicTermsService.getTermsForDocument(
        organizationId,
        customerId,
      );
      
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
    } catch (error) {
      this.logger.error(`Error enriching template context with payment terms: ${error.message}`, error.stack);
      // Return original context if there's an error
      return context;
    }
  }

  /**
   * Register payment terms conditional logic variables
   */
  async registerPaymentTermsConditionalVariables(): Promise<void> {
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
    } catch (error) {
      this.logger.error(`Error registering payment terms conditional variables: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate payment terms section for T&C document
   */
  async generatePaymentTermsSection(
    organizationId: string,
    customerId: string,
    templateId?: string,
  ): Promise<string> {
    try {
      this.logger.log(`Generating payment terms section for customer: ${customerId}`);
      
      // Get formatted terms for document generation
      const paymentTerms = await this.dynamicTermsService.getTermsForDocument(
        organizationId,
        customerId,
      );
      
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
          } else if (typeof value !== 'boolean') {
            termsSection += `- ${this.formatTermKey(key)}: ${value}\n`;
          }
        }
      }
      
      return termsSection;
    } catch (error) {
      this.logger.error(`Error generating payment terms section: ${error.message}`, error.stack);
      // Return basic payment terms if there's an error
      return '## Payment Terms\n\nStandard payment terms apply.';
    }
  }

  /**
   * Format term key for display
   */
  private formatTermKey(key: string): string {
    return key
      .split(/(?=[A-Z])/)
      .join(' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  /**
   * Handle payment terms update event
   */
  private async handleTermsUpdate(terms: any): Promise<void> {
    try {
      this.logger.log(`Handling payment terms update for customer: ${terms.customerId}`);
      
      // Emit event for document regeneration if needed
      this.eventEmitter.emit('document.terms.updated', {
        organizationId: terms.organizationId,
        customerId: terms.customerId,
        termsId: terms.id,
        updateType: 'payment_terms',
      });
    } catch (error) {
      this.logger.error(`Error handling payment terms update: ${error.message}`, error.stack);
    }
  }

  /**
   * Apply payment terms to document
   */
  async applyPaymentTermsToDocument(
    organizationId: string,
    customerId: string,
    documentContent: string,
    placeholderTag: string = '{{PAYMENT_TERMS}}',
  ): Promise<string> {
    try {
      this.logger.log(`Applying payment terms to document for customer: ${customerId}`);
      
      // Generate payment terms section
      const paymentTermsSection = await this.generatePaymentTermsSection(
        organizationId,
        customerId,
      );
      
      // Replace placeholder with generated section
      return documentContent.replace(placeholderTag, paymentTermsSection);
    } catch (error) {
      this.logger.error(`Error applying payment terms to document: ${error.message}`, error.stack);
      // Return original content if there's an error
      return documentContent;
    }
  }
}
