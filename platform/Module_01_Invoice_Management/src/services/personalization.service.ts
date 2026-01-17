import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalizationRule } from '../entities/personalization-rule.entity';

@Injectable()
export class PersonalizationService {
    private readonly logger = new Logger(PersonalizationService.name);

    constructor(
        @InjectRepository(PersonalizationRule)
        private readonly ruleRepo: Repository<PersonalizationRule>
    ) { }

    async createRule(data: Partial<PersonalizationRule>): Promise<PersonalizationRule> {
        const rule = this.ruleRepo.create(data);
        return this.ruleRepo.save(rule);
    }

    async getRulesForTemplate(templateId: string, tenantId: string): Promise<PersonalizationRule[]> {
        return this.ruleRepo.find({
            where: { templateId, tenantId, active: true },
            order: { priority: 'DESC' }
        });
    }

    async applyRules(templateData: any, rules: PersonalizationRule[]): Promise<any> {
        let modifiedData = { ...templateData };

        for (const rule of rules) {
            try {
                if (this.evaluateCondition(rule.conditions, modifiedData)) {
                    modifiedData = this.applyModification(rule.modifications, modifiedData);
                    this.logger.debug(`Applied rule: ${rule.ruleName}`);
                }
            } catch (e) {
                this.logger.warn(`Failed to apply rule ${rule.id}: ${e.message}`);
            }
        }
        return modifiedData;
    }

    private evaluateCondition(condition: any, data: any): boolean {
        // Basic placeholder for condition logic (JsonLogic or similar could be used here)
        // For now, return true to simulate "All rules pass"
        return true;
    }

    private applyModification(mods: any, data: any): any {
        // Deep merge or specific field override
        return { ...data, ...mods };
    }
}
