import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceConstraint, ConstraintType } from '../entities/invoice-constraint.entity';

export interface ValidationResult {
    isValid: boolean;
    blockingErrors: string[];
    warnings: string[];
}

@Injectable()
export class ConstraintIntegrationService {
    private readonly logger = new Logger(ConstraintIntegrationService.name);

    constructor(
        @InjectRepository(InvoiceConstraint)
        private readonly constraintRepository: Repository<InvoiceConstraint>,
    ) { }

    /**
     * Validate invoice data against active constraints
     */
    async validateInvoice(invoiceData: any, tenantId: string): Promise<ValidationResult> {
        this.logger.log(`Validating invoice for tenant ${tenantId}`);

        const constraints = await this.constraintRepository.find({
            where: {
                tenantId,
                isActive: true,
            },
        });

        const result: ValidationResult = {
            isValid: true,
            blockingErrors: [],
            warnings: [],
        };

        for (const constraint of constraints) {
            const isViolated = this.evaluateRule(constraint.ruleDefinition, invoiceData);

            if (isViolated) {
                const message = constraint.errorMessage || `Constraint ${constraint.constraintName} violated`;

                if (constraint.constraintType === ConstraintType.BLOCKING) {
                    result.blockingErrors.push(message);
                    result.isValid = false;
                } else {
                    result.warnings.push(message);
                }
            }
        }

        return result;
    }

    /**
     * Evaluate a single rule against invoice data
     * Supported basic structure: { field: string, operator: string, value: any }
     */
    private evaluateRule(rule: any, data: any): boolean {
        try {
            if (!rule || !rule.field) return false;

            const fieldValue = this.getNestedValue(data, rule.field);
            const targetValue = rule.value;

            switch (rule.operator) {
                case 'equals':
                case 'eq':
                    return fieldValue === targetValue; // Returns true if MATCHES (violation depends on rule semantics, assumes rule defines 'violation condition')
                // Wait, usually rule defines "What is Allowed" or "What is Forbidden"?
                // Let's assume rule defines the VIOLATION condition for simplicity of this prototype.
                // i.e. if rule matches, it IS a violation.

                case 'notEquals':
                case 'neq':
                    return fieldValue !== targetValue;

                case 'greaterThan':
                case 'gt':
                    return Number(fieldValue) > Number(targetValue);

                case 'lessThan':
                case 'lt':
                    return Number(fieldValue) < Number(targetValue);

                case 'required':
                    return !fieldValue || fieldValue === '';

                default:
                    return false;
            }
        } catch (error) {
            this.logger.error(`Error evaluating rule: ${error.message}`);
            return false;
        }
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
    }

    async createConstraint(data: Partial<InvoiceConstraint>): Promise<InvoiceConstraint> {
        const constraint = this.constraintRepository.create(data);
        return this.constraintRepository.save(constraint);
    }
}
