import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceRuleEntity } from '../entities/intelligence.entity';

@Injectable()
export class ComplianceIntelligenceService {
    private readonly logger = new Logger(ComplianceIntelligenceService.name);

    constructor(
        @InjectRepository(ComplianceRuleEntity)
        private complianceRepo: Repository<ComplianceRuleEntity>
    ) { }

    /**
     * Get validated invoice requirements for a specific country
     */
    async getInvoiceRequirements(countryCode: string) {
        let rules = await this.complianceRepo.findOne({ where: { countryCode } });

        if (!rules) {
            rules = await this.seedDefaultCompliance(countryCode);
        }

        return {
            mandatoryFields: rules.invoiceRequirements.mandatoryFields,
            taxName: rules.taxRules.type,
            taxRate: rules.taxRules.standardRate,
            legalStatements: rules.legalRequirements?.requiredStatements || [],
            validationRegex: {
                taxId: rules.taxRules.taxIdFormat
            }
        };
    }

    /**
     * Validate an invoice against country-specific rules
     */
    async validateInvoiceCompliance(invoice: any, countryCode: string) {
        const requirements = await this.getInvoiceRequirements(countryCode);
        const missingFields: string[] = [];

        // 1. Check Mandatory Fields
        for (const field of requirements.mandatoryFields) {
            // Simplified check - in real app would verify nested objects
            if (!invoice[field] && !invoice.metadata?.[field]) {
                missingFields.push(field);
            }
        }

        // 2. Validate Tax ID Format
        let taxIdValid = true;
        if (invoice.taxId && requirements.validationRegex.taxId) {
            const regex = new RegExp(requirements.validationRegex.taxId);
            if (!regex.test(invoice.taxId)) {
                taxIdValid = false;
            }
        }

        return {
            isCompliant: missingFields.length === 0 && taxIdValid,
            issues: [
                ...missingFields.map(f => `Missing mandatory field: ${f}`),
                !taxIdValid ? 'Invalid Tax ID format' : null
            ].filter(Boolean),
            requiredActions: missingFields.length > 0 ? 'Update invoice details' : 'None'
        };
    }

    private async seedDefaultCompliance(countryCode: string): Promise<ComplianceRuleEntity> {
        // Basic fallback seeding
        const isEU = ['DE', 'FR', 'ES', 'IT', 'NL', 'BE'].includes(countryCode);

        const defaults: Partial<ComplianceRuleEntity> = {
            countryCode,
            invoiceRequirements: {
                mandatoryFields: ['invoiceNumber', 'issueDate', 'supplierName', 'customerName', 'vatNumber', 'totalAmount', 'currency'],
                fieldValidations: {},
                numberingFormat: 'sequential',
                maxInvoiceAge: 180
            },
            taxRules: {
                type: isEU ? 'VAT' : 'GST', // Simplification
                standardRate: isEU ? 20 : 18,
                taxIdFormat: '^[A-Z0-9]{8,15}$',
                reverseCharge: isEU, // Intra-EU usually applies reverse charge
                specialRates: [],
                taxIdLabel: isEU ? 'VAT ID' : 'Tax ID'
            },
            legalRequirements: {
                requiredStatements: isEU ? ['Reverse Charge applies'] : [],
                retentionPeriod: 7,
                disclaimers: [],
                invoiceCopies: 1
            },
            documentRequirements: []
        };

        // Specific overrides
        if (countryCode === 'IN') {
            defaults.taxRules = {
                type: 'GST',
                standardRate: 18,
                taxIdFormat: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
                reverseCharge: false,
                specialRates: [],
                taxIdLabel: 'GSTIN'
            };
            defaults.invoiceRequirements.mandatoryFields.push('hsnCode');
        } else if (countryCode === 'AE') {
            defaults.taxRules = {
                type: 'VAT',
                standardRate: 5,
                taxIdFormat: '^[0-9]{15}$',
                reverseCharge: false,
                specialRates: [],
                taxIdLabel: 'TRN'
            };
            defaults.invoiceRequirements.mandatoryFields.push('amountsInAED'); // Using base currency total
        }

        const entity = this.complianceRepo.create(defaults);
        return await this.complianceRepo.save(entity);
    }
}
