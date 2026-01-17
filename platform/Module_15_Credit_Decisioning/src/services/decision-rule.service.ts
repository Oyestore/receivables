import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DecisionRule } from '../entities/decision-rule.entity';
import { RuleType, RuleStatus, Operator, ActionType } from '../entities/decision-rule.entity';

export interface CreateRuleDto {
  name: string;
  description?: string;
  ruleType: RuleType;
  category?: string;
  entityTypes: string[];
  decisionTypes: string[];
  conditions: Array<{
    field: string;
    operator: Operator;
    value: any;
    weight?: number;
    description?: string;
  }>;
  actions: Array<{
    type: ActionType;
    parameters: Record<string, any>;
    conditions?: Record<string, any>;
  }>;
  priority?: number;
  isMandatory?: boolean;
  canBeOverridden?: boolean;
  tags?: string[];
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface UpdateRuleDto {
  name?: string;
  description?: string;
  status?: RuleStatus;
  priority?: number;
  conditions?: Array<{
    field: string;
    operator: Operator;
    value: any;
    weight?: number;
    description?: string;
  }>;
  actions?: Array<{
    type: ActionType;
    parameters: Record<string, any>;
    conditions?: Record<string, any>;
  }>;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface RuleTestResult {
  ruleId: string;
  ruleName: string;
  testCase: string;
  passed: boolean;
  actualOutput: any;
  expectedOutput: any;
  error?: string;
}

@Injectable()
export class DecisionRuleService {
  private readonly logger = new Logger(DecisionRuleService.name);

  constructor(
    @InjectRepository(DecisionRule)
    private decisionRuleRepo: Repository<DecisionRule>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new decision rule
   */
  async createRule(createRuleDto: CreateRuleDto, createdBy: string): Promise<DecisionRule> {
    this.logger.log(`Creating decision rule: ${createRuleDto.name}`);

    try {
      const rule = this.decisionRuleRepo.create({
        ...createRuleDto,
        status: RuleStatus.DRAFT,
        version: 1,
        executionOrder: 0,
        createdBy,
      });

      return await this.decisionRuleRepo.save(rule);
    } catch (error) {
      this.logger.error(`Error creating rule: ${error.message}`);
      throw new BadRequestException(`Failed to create rule: ${error.message}`);
    }
  }

  /**
   * Get all rules with optional filtering
   */
  async getRules(filters?: {
    status?: RuleStatus;
    ruleType?: RuleType;
    category?: string;
    entityType?: string;
    decisionType?: string;
  }): Promise<DecisionRule[]> {
    const query = this.decisionRuleRepo.createQueryBuilder('rule');

    if (filters?.status) {
      query.andWhere('rule.status = :status', { status: filters.status });
    }
    if (filters?.ruleType) {
      query.andWhere('rule.ruleType = :ruleType', { ruleType: filters.ruleType });
    }
    if (filters?.category) {
      query.andWhere('rule.category = :category', { category: filters.category });
    }
    if (filters?.entityType) {
      query.andWhere(':entityType = ANY(rule.entityTypes)', { entityType: filters.entityType });
    }
    if (filters?.decisionType) {
      query.andWhere(':decisionType = ANY(rule.decisionTypes)', { decisionType: filters.decisionType });
    }

    return await query
      .orderBy('rule.priority', 'DESC')
      .addOrderBy('rule.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get rule by ID
   */
  async getRule(id: string): Promise<DecisionRule> {
    const rule = await this.decisionRuleRepo.findOne({ where: { id } });
    
    if (!rule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }

    return rule;
  }

  /**
   * Update a decision rule
   */
  async updateRule(id: string, updateRuleDto: UpdateRuleDto, updatedBy: string): Promise<DecisionRule> {
    const rule = await this.getRule(id);

    try {
      // If updating conditions or actions, increment version
      if (updateRuleDto.conditions || updateRuleDto.actions) {
        rule.version = (rule.version || 1) + 1;
      }

      Object.assign(rule, updateRuleDto, { updatedBy });

      return await this.decisionRuleRepo.save(rule);
    } catch (error) {
      this.logger.error(`Error updating rule: ${error.message}`);
      throw new BadRequestException(`Failed to update rule: ${error.message}`);
    }
  }

  /**
   * Delete a rule (soft delete by archiving)
   */
  async deleteRule(id: string, deletedBy: string): Promise<void> {
    const rule = await this.getRule(id);

    rule.status = RuleStatus.ARCHIVED;
    rule.updatedBy = deletedBy;

    await this.decisionRuleRepo.save(rule);
    this.logger.log(`Rule ${id} archived by ${deletedBy}`);
  }

  /**
   * Activate a rule
   */
  async activateRule(id: string, activatedBy: string): Promise<DecisionRule> {
    const rule = await this.getRule(id);

    // Validate rule before activation
    const validation = await this.validateRule(rule);
    if (!validation.isValid) {
      throw new BadRequestException(`Rule validation failed: ${validation.errors.join(', ')}`);
    }

    rule.status = RuleStatus.ACTIVE;
    rule.updatedBy = activatedBy;

    return await this.decisionRuleRepo.save(rule);
  }

  /**
   * Deactivate a rule
   */
  async deactivateRule(id: string, deactivatedBy: string): Promise<DecisionRule> {
    const rule = await this.getRule(id);

    rule.status = RuleStatus.INACTIVE;
    rule.updatedBy = deactivatedBy;

    return await this.decisionRuleRepo.save(rule);
  }

  /**
   * Test a rule with provided test cases
   */
  async testRule(id: string): Promise<RuleTestResult[]> {
    const rule = await this.getRule(id);
    const results: RuleTestResult[] = [];

    if (!rule.testCases || rule.testCases.length === 0) {
      throw new BadRequestException('No test cases defined for this rule');
    }

    for (const testCase of rule.testCases) {
      try {
        const result = await this.evaluateRuleConditions(rule.conditions, testCase.input);
        const passed = this.compareResults(result, testCase.expectedOutput);

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          testCase: testCase.name,
          passed,
          actualOutput: result,
          expectedOutput: testCase.expectedOutput,
        });
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          testCase: testCase.name,
          passed: false,
          actualOutput: null,
          expectedOutput: testCase.expectedOutput,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Validate rule configuration
   */
  async validateRule(rule: DecisionRule): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check required fields
    if (!rule.name || rule.name.trim().length === 0) {
      errors.push('Rule name is required');
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    if (!rule.actions || rule.actions.length === 0) {
      errors.push('At least one action is required');
    }

    if (!rule.entityTypes || rule.entityTypes.length === 0) {
      errors.push('At least one entity type is required');
    }

    if (!rule.decisionTypes || rule.decisionTypes.length === 0) {
      errors.push('At least one decision type is required');
    }

    // Validate conditions
    if (rule.conditions) {
      for (let i = 0; i < rule.conditions.length; i++) {
        const condition = rule.conditions[i];
        if (!condition.field || condition.field.trim().length === 0) {
          errors.push(`Condition ${i + 1}: Field is required`);
        }
        if (!condition.operator) {
          errors.push(`Condition ${i + 1}: Operator is required`);
        }
        if (condition.value === undefined || condition.value === null) {
          errors.push(`Condition ${i + 1}: Value is required`);
        }
      }
    }

    // Validate actions
    if (rule.actions) {
      for (let i = 0; i < rule.actions.length; i++) {
        const action = rule.actions[i];
        if (!action.type) {
          errors.push(`Action ${i + 1}: Type is required`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get rule performance metrics
   */
  async getRuleMetrics(id: string, startDate?: Date, endDate?: Date): Promise<any> {
    const rule = await this.getRule(id);

    // In a real implementation, this would query actual usage data
    // For now, return mock data based on stored performance metrics
    const metrics = rule.performanceMetrics || {
      executionCount: 0,
      averageExecutionTime: 0,
      successRate: 0,
      lastExecuted: null,
    };

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: rule.status,
      ...metrics,
      testResults: rule.testCases ? rule.testCases.length : 0,
      lastUpdated: rule.updatedAt,
    };
  }

  /**
   * Clone a rule
   */
  async cloneRule(id: string, newName: string, clonedBy: string): Promise<DecisionRule> {
    const originalRule = await this.getRule(id);

    const clonedRule = this.decisionRuleRepo.create({
      ...originalRule,
      id: undefined, // Let DB generate new ID
      name: newName,
      status: RuleStatus.DRAFT,
      version: 1,
      createdBy: clonedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.decisionRuleRepo.save(clonedRule);
  }

  /**
   * Export rules to JSON
   */
  async exportRules(ruleIds?: string[]): Promise<any[]> {
    let rules: DecisionRule[];

    if (ruleIds && ruleIds.length > 0) {
      rules = await this.decisionRuleRepo.findByIds(ruleIds);
    } else {
      rules = await this.decisionRuleRepo.find();
    }

    return rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      ruleType: rule.ruleType,
      category: rule.category,
      entityTypes: rule.entityTypes,
      decisionTypes: rule.decisionTypes,
      conditions: rule.conditions,
      actions: rule.actions,
      priority: rule.priority,
      isMandatory: rule.isMandatory,
      canBeOverridden: rule.canBeOverridden,
      tags: rule.tags,
      metadata: rule.metadata,
    }));
  }

  /**
   * Import rules from JSON
   */
  async importRules(rulesData: any[], importedBy: string): Promise<DecisionRule[]> {
    const importedRules: DecisionRule[] = [];

    for (const ruleData of rulesData) {
      try {
        const rule = this.decisionRuleRepo.create({
          ...ruleData,
          status: RuleStatus.DRAFT,
          version: 1,
          createdBy: importedBy,
        });

        const savedRule = await this.decisionRuleRepo.save(rule);
        importedRules.push(savedRule);
      } catch (error) {
        this.logger.error(`Error importing rule ${ruleData.name}: ${error.message}`);
      }
    }

    return importedRules;
  }

  /**
   * Private helper methods
   */

  private async evaluateRuleConditions(conditions: any[], input: Record<string, any>): Promise<any> {
    // Simplified condition evaluation for testing
    const results: any = {};

    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(input, condition.field);
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value);
      results[condition.field] = {
        value: fieldValue,
        expected: condition.value,
        operator: condition.operator,
        passed: conditionMet,
      };
    }

    return results;
  }

  private getFieldValue(context: Record<string, any>, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      case 'greater_equal':
        return Number(fieldValue) >= Number(expectedValue);
      case 'less_equal':
        return Number(fieldValue) <= Number(expectedValue);
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(expectedValue));
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'not_in':
        return !Array.isArray(expectedValue) || !expectedValue.includes(fieldValue);
      case 'between':
        return Array.isArray(expectedValue) && 
               Number(fieldValue) >= Number(expectedValue[0]) && 
               Number(fieldValue) <= Number(expectedValue[1]);
      default:
        return false;
    }
  }

  private compareResults(actual: any, expected: any): boolean {
    // Simple comparison - in real implementation would be more sophisticated
    return JSON.stringify(actual) === JSON.stringify(expected);
  }
}
