import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskRule } from '../entities/risk-rule.entity';
import { RiskLevel } from '../enums/risk-level.enum';
import { RiskIndicator } from '../entities/risk-indicator.entity';

/**
 * Service for managing and executing customizable risk rules
 * Provides functionality for creating, updating, and executing risk rules
 */
@Injectable()
export class RiskRuleService {
  private readonly logger = new Logger(RiskRuleService.name);

  constructor(
    @InjectRepository(RiskRule)
    private riskRuleRepository: Repository<RiskRule>,
    @InjectRepository(RiskIndicator)
    private riskIndicatorRepository: Repository<RiskIndicator>,
  ) {
    this.logger.log('Risk Rule Service initialized');
  }

  /**
   * Create a new risk rule
   * @param ruleData The risk rule data
   * @param userId The ID of the user creating the rule
   * @returns The created risk rule
   */
  async createRule(ruleData: Partial<RiskRule>, userId: string): Promise<RiskRule> {
    this.logger.log(`Creating new risk rule: ${ruleData.name}`);
    
    try {
      // Validate rule data
      this.validateRuleData(ruleData);
      
      // Create new rule entity
      const rule = this.riskRuleRepository.create({
        ...ruleData,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
        executionCount: 0,
        triggerCount: 0,
        averageExecutionTimeMs: 0,
      });
      
      // Save the rule
      const savedRule = await this.riskRuleRepository.save(rule);
      
      this.logger.log(`Created risk rule with ID ${savedRule.id}`);
      return savedRule;
    } catch (error) {
      this.logger.error(`Error creating risk rule: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update an existing risk rule
   * @param id The ID of the rule to update
   * @param updates The updates to apply
   * @param userId The ID of the user updating the rule
   * @returns The updated risk rule
   */
  async updateRule(id: string, updates: Partial<RiskRule>, userId: string): Promise<RiskRule> {
    this.logger.log(`Updating risk rule with ID ${id}`);
    
    try {
      // Get the existing rule
      const rule = await this.riskRuleRepository.findOne({ where: { id } });
      
      if (!rule) {
        throw new Error(`Risk rule with ID ${id} not found`);
      }
      
      // Check if this is a system rule
      if (rule.isSystem && (updates.conditions || updates.actions)) {
        throw new Error('Cannot modify conditions or actions of system rules');
      }
      
      // Create a new version if conditions or actions are changed
      if (updates.conditions || updates.actions) {
        // Create a new version
        const newVersion = this.riskRuleRepository.create({
          ...rule,
          ...updates,
          id: undefined, // Generate new ID
          version: rule.version + 1,
          updatedBy: userId,
          executionCount: 0,
          triggerCount: 0,
          averageExecutionTimeMs: 0,
        });
        
        // Save the new version
        const savedRule = await this.riskRuleRepository.save(newVersion);
        
        // Deactivate the old version
        rule.isActive = false;
        await this.riskRuleRepository.save(rule);
        
        this.logger.log(`Created new version ${savedRule.version} of risk rule ${rule.name}`);
        return savedRule;
      } else {
        // Apply updates without creating a new version
        Object.assign(rule, updates);
        rule.updatedBy = userId;
        
        // Save the updated rule
        const savedRule = await this.riskRuleRepository.save(rule);
        
        this.logger.log(`Updated risk rule ${rule.name} without creating a new version`);
        return savedRule;
      }
    } catch (error) {
      this.logger.error(`Error updating risk rule: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a risk rule
   * @param id The ID of the rule to delete
   */
  async deleteRule(id: string): Promise<void> {
    this.logger.log(`Deleting risk rule with ID ${id}`);
    
    try {
      // Get the rule
      const rule = await this.riskRuleRepository.findOne({ where: { id } });
      
      if (!rule) {
        throw new Error(`Risk rule with ID ${id} not found`);
      }
      
      // Check if this is a system rule
      if (rule.isSystem) {
        throw new Error('Cannot delete system rules');
      }
      
      // Delete the rule
      await this.riskRuleRepository.remove(rule);
      
      this.logger.log(`Deleted risk rule ${rule.name}`);
    } catch (error) {
      this.logger.error(`Error deleting risk rule: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a risk rule by ID
   * @param id The ID of the rule
   * @returns The risk rule
   */
  async getRule(id: string): Promise<RiskRule> {
    this.logger.debug(`Getting risk rule with ID ${id}`);
    
    try {
      const rule = await this.riskRuleRepository.findOne({ where: { id } });
      
      if (!rule) {
        throw new Error(`Risk rule with ID ${id} not found`);
      }
      
      return rule;
    } catch (error) {
      this.logger.error(`Error getting risk rule: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all risk rules for a tenant
   * @param tenantId The tenant ID
   * @param includeInactive Whether to include inactive rules
   * @returns Array of risk rules
   */
  async getRules(tenantId: string, includeInactive = false): Promise<RiskRule[]> {
    this.logger.debug(`Getting risk rules for tenant ${tenantId}`);
    
    try {
      const query: any = { tenantId };
      
      if (!includeInactive) {
        query.isActive = true;
      }
      
      const rules = await this.riskRuleRepository.find({
        where: query,
        order: {
          priority: 'ASC',
          updatedAt: 'DESC',
        },
      });
      
      return rules;
    } catch (error) {
      this.logger.error(`Error getting risk rules: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get rule templates
   * @param category Optional category filter
   * @param industry Optional industry filter
   * @returns Array of rule templates
   */
  async getRuleTemplates(category?: string, industry?: string): Promise<RiskRule[]> {
    this.logger.debug(`Getting rule templates${category ? ` for category ${category}` : ''}${industry ? ` and industry ${industry}` : ''}`);
    
    try {
      const query: any = { isTemplate: true };
      
      if (category) {
        query.category = category;
      }
      
      if (industry) {
        query.industry = industry;
      }
      
      const templates = await this.riskRuleRepository.find({
        where: query,
        order: {
          category: 'ASC',
          industry: 'ASC',
          name: 'ASC',
        },
      });
      
      return templates;
    } catch (error) {
      this.logger.error(`Error getting rule templates: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a rule from a template
   * @param templateId The ID of the template
   * @param tenantId The tenant ID
   * @param userId The ID of the user creating the rule
   * @param customizations Optional customizations to apply
   * @returns The created rule
   */
  async createRuleFromTemplate(
    templateId: string,
    tenantId: string,
    userId: string,
    customizations?: Partial<RiskRule>,
  ): Promise<RiskRule> {
    this.logger.log(`Creating rule from template ${templateId} for tenant ${tenantId}`);
    
    try {
      // Get the template
      const template = await this.riskRuleRepository.findOne({ where: { id: templateId, isTemplate: true } });
      
      if (!template) {
        throw new Error(`Rule template with ID ${templateId} not found`);
      }
      
      // Create new rule from template
      const rule = this.riskRuleRepository.create({
        ...template,
        id: undefined, // Generate new ID
        tenantId,
        isTemplate: false,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
        executionCount: 0,
        triggerCount: 0,
        averageExecutionTimeMs: 0,
        ...customizations,
      });
      
      // Save the rule
      const savedRule = await this.riskRuleRepository.save(rule);
      
      this.logger.log(`Created rule ${savedRule.name} from template for tenant ${tenantId}`);
      return savedRule;
    } catch (error) {
      this.logger.error(`Error creating rule from template: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Execute risk rules for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @param context Additional context data
   * @returns Array of risk indicators generated by the rules
   */
  async executeRules(buyerId: string, tenantId: string, context: any = {}): Promise<RiskIndicator[]> {
    this.logger.log(`Executing risk rules for buyer ${buyerId} in tenant ${tenantId}`);
    
    try {
      // Get active rules for the tenant
      const rules = await this.getRules(tenantId);
      
      if (rules.length === 0) {
        this.logger.debug(`No active rules found for tenant ${tenantId}`);
        return [];
      }
      
      this.logger.debug(`Found ${rules.length} active rules to execute`);
      
      // Execute rules in priority order
      const riskIndicators: RiskIndicator[] = [];
      
      for (const rule of rules) {
        const startTime = Date.now();
        
        try {
          // Execute the rule
          const matched = await this.evaluateRuleConditions(rule, buyerId, context);
          
          // Update execution metrics
          rule.executionCount += 1;
          rule.lastExecutedAt = new Date();
          const executionTime = Date.now() - startTime;
          rule.averageExecutionTimeMs = 
            (rule.averageExecutionTimeMs * (rule.executionCount - 1) + executionTime) / rule.executionCount;
          
          // Save updated metrics
          await this.riskRuleRepository.save(rule);
          
          if (matched) {
            this.logger.debug(`Rule ${rule.name} matched for buyer ${buyerId}`);
            
            // Update trigger count
            rule.triggerCount += 1;
            await this.riskRuleRepository.save(rule);
            
            // Execute actions
            const indicators = await this.executeRuleActions(rule, buyerId, tenantId, context);
            riskIndicators.push(...indicators);
            
            // Stop if rule has stopOnMatch flag
            if (rule.stopOnMatch) {
              this.logger.debug(`Stopping rule execution due to stopOnMatch flag on rule ${rule.name}`);
              break;
            }
          }
        } catch (error) {
          this.logger.error(`Error executing rule ${rule.name}: ${error.message}`, error.stack);
          // Continue with next rule
        }
      }
      
      this.logger.log(`Generated ${riskIndicators.length} risk indicators from rules for buyer ${buyerId}`);
      return riskIndicators;
    } catch (error) {
      this.logger.error(`Error executing risk rules: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Evaluate rule conditions
   * @param rule The risk rule
   * @param buyerId The ID of the buyer
   * @param context Additional context data
   * @returns Whether the conditions match
   */
  private async evaluateRuleConditions(rule: RiskRule, buyerId: string, context: any): Promise<boolean> {
    this.logger.debug(`Evaluating conditions for rule ${rule.name}`);
    
    try {
      const conditions = rule.conditions;
      
      // Handle different condition types
      switch (conditions.type) {
        case 'AND':
          return this.evaluateAndCondition(conditions, buyerId, context);
        case 'OR':
          return this.evaluateOrCondition(conditions, buyerId, context);
        case 'NOT':
          return this.evaluateNotCondition(conditions, buyerId, context);
        case 'SIMPLE':
          return this.evaluateSimpleCondition(conditions, buyerId, context);
        default:
          throw new Error(`Unknown condition type: ${conditions.type}`);
      }
    } catch (error) {
      this.logger.error(`Error evaluating rule conditions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Evaluate AND condition
   * @param condition The condition
   * @param buyerId The ID of the buyer
   * @param context Additional context data
   * @returns Whether the condition matches
   */
  private async evaluateAndCondition(condition: any, buyerId: string, context: any): Promise<boolean> {
    if (!condition.conditions || !Array.isArray(condition.conditions) || condition.conditions.length === 0) {
      return false;
    }
    
    for (const subCondition of condition.conditions) {
      const result = await this.evaluateRuleConditions({ conditions: subCondition } as RiskRule, buyerId, context);
      if (!result) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Evaluate OR condition
   * @param condition The condition
   * @param buyerId The ID of the buyer
   * @param context Additional context data
   * @returns Whether the condition matches
   */
  private async evaluateOrCondition(condition: any, buyerId: string, context: any): Promise<boolean> {
    if (!condition.conditions || !Array.isArray(condition.conditions) || condition.conditions.length === 0) {
      return false;
    }
    
    for (const subCondition of condition.conditions) {
      const result = await this.evaluateRuleConditions({ conditions: subCondition } as RiskRule, buyerId, context);
      if (result) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Evaluate NOT condition
   * @param condition The condition
   * @param buyerId The ID of the buyer
   * @param context Additional context data
   * @returns Whether the condition matches
   */
  private async evaluateNotCondition(condition: any, buyerId: string, context: any): Promise<boolean> {
    if (!condition.condition) {
      return false;
    }
    
    const result = await this.evaluateRuleConditions({ conditions: condition.condition } as RiskRule, buyerId, context);
    return !result;
  }

  /**
   * Evaluate simple condition
   * @param condition The condition
   * @param buyerId The ID of the buyer
   * @param context Additional context data
   * @returns Whether the condition matches
   */
  private async evaluateSimpleCondition(condition: any, buyerId: string, context: any): Promise<boolean> {
    const { field, operator, value } = condition;
    
    if (!field || !operator) {
      return false;
    }
    
    // Get field value from context
    const fieldValue = this.getFieldValue(field, context);
    
    // Evaluate based on operator
    switch (operator) {
      case 'EQUALS':
        return fieldValue === value;
      case 'NOT_EQUALS':
        return fieldValue !== value;
      case 'GREATER_THAN':
        return fieldValue > value;
      case 'LESS_THAN':
        return fieldValue < value;
      case 'GREATER_THAN_OR_EQUALS':
        return fieldValue >= value;
      case 'LESS_THAN_OR_EQUALS':
        return fieldValue <= value;
      case 'CONTAINS':
        return typeof fieldValue === 'string' && fieldValue.includes(value);
      case 'NOT_CONTAINS':
        return typeof fieldValue === 'string' && !fieldValue.includes(value);
      case 'IN':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'NOT_IN':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'IS_NULL':
        return fieldValue === null || fieldValue === undefined;
      case 'IS_NOT_NULL':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Get field value from context
   * @param field The field path
   * @param context The context object
   * @returns The field value
   */
  private getFieldValue(field: string, context: any): any {
    // Handle special fields
    if (field.startsWith('$')) {
      return this.getSpecialFieldValue(field, context);
    }
    
    // Handle nested fields
    const parts = field.split('.');
    let value = context;
    
    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      
      value = value[part];
    }
    
    return value;
  }

  /**
   * Get special field value
   * @param field The special field
   * @param context The context object
   * @returns The field value
   */
  private getSpecialFieldValue(field: string, context: any): any {
    switch (field) {
      case '$now':
        return new Date();
      case '$today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
      case '$random':
        return Math.random();
      default:
        return undefined;
    }
  }

  /**
   * Execute rule actions
   * @param rule The risk rule
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @param context Additional context data
   * @returns Array of risk indicators generated by the actions
   */
  private async executeRuleActions(rule: RiskRule, buyerId: string, tenantId: string, context: any): Promise<RiskIndicator[]> {
    this.logger.debug(`Executing actions for rule ${rule.name}`);
    
    try {
      const actions = rule.actions;
      const riskIndicators: RiskIndicator[] = [];
      
      if (!actions || !Array.isArray(actions)) {
        return [];
      }
      
      for (const action of actions) {
        try {
          switch (action.type) {
            case 'CREATE_RISK_INDICATOR':
              const indicator = await this.createRiskIndicator(rule, action, buyerId, tenantId, context);
              riskIndicators.push(indicator);
              break;
            // Add more action types as needed
            default:
              this.logger.warn(`Unknown action type: ${action.type}`);
          }
        } catch (error) {
          this.logger.error(`Error executing action: ${error.message}`, error.stack);
          // Continue with next action
        }
      }
      
      return riskIndicators;
    } catch (error) {
      this.logger.error(`Error executing rule actions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a risk indicator
   * @param rule The risk rule
   * @param action The action
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @param context Additional context data
   * @returns The created risk indicator
   */
  private async createRiskIndicator(
    rule: RiskRule,
    action: any,
    buyerId: string,
    tenantId: string,
    context: any,
  ): Promise<RiskIndicator> {
    this.logger.debug(`Creating risk indicator from rule ${rule.name}`);
    
    // Create indicator entity
    const indicator = new RiskIndicator();
    indicator.buyerId = buyerId;
    indicator.tenantId = tenantId;
    indicator.type = action.indicatorType || 'RULE_BASED';
    indicator.description = this.formatTemplate(action.description || rule.name, context);
    indicator.riskLevel = action.riskLevel || rule.riskLevel;
    indicator.details = {
      ruleId: rule.id,
      ruleName: rule.name,
      ...action.details,
    };
    indicator.confidence = action.confidence || 1.0;
    indicator.detectionMethod = 'RULE';
    indicator.detectedAt = new Date();
    
    // Save the indicator
    return this.riskIndicatorRepository.save(indicator);
  }

  /**
   * Format a template string with context values
   * @param template The template string
   * @param context The context object
   * @returns The formatted string
   */
  private formatTemplate(template: string, context: any): string {
    return template.replace(/\${([^}]+)}/g, (match, field) => {
      const value = this.getFieldValue(field, context);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Validate rule data
   * @param ruleData The rule data to validate
   */
  private validateRuleData(ruleData: Partial<RiskRule>): void {
    if (!ruleData.name) {
      throw new Error('Rule name is required');
    }
    
    if (!ruleData.conditions) {
      throw new Error('Rule conditions are required');
    }
    
    if (!ruleData.actions) {
      throw new Error('Rule actions are required');
    }
    
    if (!ruleData.tenantId) {
      throw new Error('Tenant ID is required');
    }
    
    // Validate conditions structure
    this.validateConditionsStructure(ruleData.conditions);
    
    // Validate actions structure
    this.validateActionsStructure(ruleData.actions);
  }

  /**
   * Validate conditions structure
   * @param conditions The conditions to validate
   */
  private validateConditionsStructure(conditions: any): void {
    if (!conditions.type) {
      throw new Error('Condition type is required');
    }
    
    switch (conditions.type) {
      case 'AND':
      case 'OR':
        if (!conditions.conditions || !Array.isArray(conditions.conditions) || conditions.conditions.length === 0) {
          throw new Error(`${conditions.type} condition must have at least one sub-condition`);
        }
        
        for (const subCondition of conditions.conditions) {
          this.validateConditionsStructure(subCondition);
        }
        break;
      
      case 'NOT':
        if (!conditions.condition) {
          throw new Error('NOT condition must have a sub-condition');
        }
        
        this.validateConditionsStructure(conditions.condition);
        break;
      
      case 'SIMPLE':
        if (!conditions.field) {
          throw new Error('Simple condition must have a field');
        }
        
        if (!conditions.operator) {
          throw new Error('Simple condition must have an operator');
        }
        
        // Value can be undefined for some operators like IS_NULL
        break;
      
      default:
        throw new Error(`Unknown condition type: ${conditions.type}`);
    }
  }

  /**
   * Validate actions structure
   * @param actions The actions to validate
   */
  private validateActionsStructure(actions: any): void {
    if (!Array.isArray(actions)) {
      throw new Error('Actions must be an array');
    }
    
    if (actions.length === 0) {
      throw new Error('At least one action is required');
    }
    
    for (const action of actions) {
      if (!action.type) {
        throw new Error('Action type is required');
      }
      
      switch (action.type) {
        case 'CREATE_RISK_INDICATOR':
          // Description is optional, will use rule name if not provided
          break;
        
        // Add more action types as needed
        
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    }
  }

  /**
   * Get rule analytics
   * @param tenantId The tenant ID
   * @returns Rule analytics data
   */
  async getRuleAnalytics(tenantId: string): Promise<any> {
    this.logger.log(`Getting rule analytics for tenant ${tenantId}`);
    
    try {
      // Get all active rules for the tenant
      const rules = await this.getRules(tenantId, true);
      
      // Calculate analytics
      const totalRules = rules.length;
      const activeRules = rules.filter(rule => rule.isActive).length;
      const totalExecutions = rules.reduce((sum, rule) => sum + rule.executionCount, 0);
      const totalTriggers = rules.reduce((sum, rule) => sum + rule.triggerCount, 0);
      const triggerRate = totalExecutions > 0 ? (totalTriggers / totalExecutions) * 100 : 0;
      
      // Get top triggered rules
      const topTriggeredRules = [...rules]
        .sort((a, b) => b.triggerCount - a.triggerCount)
        .slice(0, 5)
        .map(rule => ({
          id: rule.id,
          name: rule.name,
          triggerCount: rule.triggerCount,
          executionCount: rule.executionCount,
          triggerRate: rule.executionCount > 0 ? (rule.triggerCount / rule.executionCount) * 100 : 0,
        }));
      
      // Get rules by risk level
      const rulesByRiskLevel = Object.values(RiskLevel).reduce((acc, level) => {
        acc[level] = rules.filter(rule => rule.riskLevel === level).length;
        return acc;
      }, {});
      
      return {
        totalRules,
        activeRules,
        totalExecutions,
        totalTriggers,
        triggerRate,
        topTriggeredRules,
        rulesByRiskLevel,
      };
    } catch (error) {
      this.logger.error(`Error getting rule analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Test a rule against sample data
   * @param rule The rule to test
   * @param sampleData The sample data
   * @returns Test result
   */
  async testRule(rule: RiskRule, sampleData: any): Promise<any> {
    this.logger.log(`Testing rule ${rule.name}`);
    
    try {
      // Validate rule data
      this.validateRuleData(rule);
      
      // Execute the rule against sample data
      const startTime = Date.now();
      const matched = await this.evaluateRuleConditions(rule, 'sample-buyer-id', sampleData);
      const executionTime = Date.now() - startTime;
      
      let indicators: RiskIndicator[] = [];
      
      if (matched) {
        // Execute actions with dry run
        indicators = await this.executeRuleActions(
          rule,
          'sample-buyer-id',
          'sample-tenant-id',
          sampleData,
        );
      }
      
      return {
        matched,
        executionTime,
        indicators,
      };
    } catch (error) {
      this.logger.error(`Error testing rule: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Import rules from JSON
   * @param rulesJson The rules JSON
   * @param tenantId The tenant ID
   * @param userId The ID of the user importing the rules
   * @returns The imported rules
   */
  async importRules(rulesJson: string, tenantId: string, userId: string): Promise<RiskRule[]> {
    this.logger.log(`Importing rules for tenant ${tenantId}`);
    
    try {
      // Parse JSON
      const rules = JSON.parse(rulesJson);
      
      if (!Array.isArray(rules)) {
        throw new Error('Rules JSON must be an array');
      }
      
      // Import each rule
      const importedRules: RiskRule[] = [];
      
      for (const ruleData of rules) {
        try {
          // Set tenant ID and user ID
          ruleData.tenantId = tenantId;
          
          // Create the rule
          const rule = await this.createRule(ruleData, userId);
          importedRules.push(rule);
        } catch (error) {
          this.logger.error(`Error importing rule: ${error.message}`, error.stack);
          // Continue with next rule
        }
      }
      
      this.logger.log(`Imported ${importedRules.length} rules for tenant ${tenantId}`);
      return importedRules;
    } catch (error) {
      this.logger.error(`Error importing rules: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Export rules to JSON
   * @param tenantId The tenant ID
   * @param ruleIds Optional array of rule IDs to export
   * @returns The rules JSON
   */
  async exportRules(tenantId: string, ruleIds?: string[]): Promise<string> {
    this.logger.log(`Exporting rules for tenant ${tenantId}`);
    
    try {
      // Get rules to export
      let rules: RiskRule[];
      
      if (ruleIds && ruleIds.length > 0) {
        // Get specific rules
        rules = await Promise.all(
          ruleIds.map(id => this.getRule(id))
        );
        
        // Filter out rules from other tenants
        rules = rules.filter(rule => rule.tenantId === tenantId);
      } else {
        // Get all rules for the tenant
        rules = await this.getRules(tenantId, true);
      }
      
      // Prepare rules for export
      const exportRules = rules.map(rule => ({
        name: rule.name,
        description: rule.description,
        conditions: rule.conditions,
        actions: rule.actions,
        riskLevel: rule.riskLevel,
        isActive: rule.isActive,
        category: rule.category,
        industry: rule.industry,
        priority: rule.priority,
        stopOnMatch: rule.stopOnMatch,
        metadata: rule.metadata,
      }));
      
      // Convert to JSON
      return JSON.stringify(exportRules, null, 2);
    } catch (error) {
      this.logger.error(`Error exporting rules: ${error.message}`, error.stack);
      throw error;
    }
  }
}
