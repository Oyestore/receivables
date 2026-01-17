import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service for evaluating business rules in the Financing Module
 * 
 * This service provides the core rules engine functionality, including
 * rule evaluation, condition checking, and decision support for
 * financing operations.
 */
@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);

  constructor(
    private readonly configService: ConfigService,
  ) {}

  /**
   * Evaluates a set of rules against provided data
   * 
   * @param rules The rules to evaluate
   * @param data The data to evaluate against
   * @returns Result of the evaluation including matched rules
   */
  evaluateRules(
    rules: Array<{
      id: string;
      name: string;
      description?: string;
      priority: number;
      conditions: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
      actions: Array<{
        type: string;
        params: Record<string, any>;
      }>;
      enabled: boolean;
    }>,
    data: Record<string, any>,
  ): {
    matched: boolean;
    matchedRules: string[];
    actions: Array<{
      type: string;
      params: Record<string, any>;
    }>;
  } {
    this.logger.log(`Evaluating ${rules.length} rules`);
    
    // Sort rules by priority (higher number = higher priority)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
    
    const result = {
      matched: false,
      matchedRules: [],
      actions: [],
    };
    
    // Evaluate each rule
    for (const rule of sortedRules) {
      // Skip disabled rules
      if (!rule.enabled) {
        continue;
      }
      
      // Check if all conditions are met
      const conditionsMet = this.evaluateConditions(rule.conditions, data);
      
      if (conditionsMet) {
        result.matched = true;
        result.matchedRules.push(rule.id);
        result.actions.push(...rule.actions);
        
        this.logger.debug(`Rule ${rule.id} matched`);
      }
    }
    
    return result;
  }

  /**
   * Evaluates a set of conditions against provided data
   * 
   * @param conditions The conditions to evaluate
   * @param data The data to evaluate against
   * @returns Boolean indicating if all conditions are met
   */
  evaluateConditions(
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>,
    data: Record<string, any>,
  ): boolean {
    // If no conditions, return true
    if (!conditions || conditions.length === 0) {
      return true;
    }
    
    // Check if all conditions are met
    return conditions.every(condition => {
      return this.evaluateCondition(condition, data);
    });
  }

  /**
   * Evaluates a single condition against provided data
   * 
   * @param condition The condition to evaluate
   * @param data The data to evaluate against
   * @returns Boolean indicating if the condition is met
   */
  evaluateCondition(
    condition: {
      field: string;
      operator: string;
      value: any;
    },
    data: Record<string, any>,
  ): boolean {
    try {
      const { field, operator, value } = condition;
      const fieldValue = this.getNestedValue(data, field);
      
      switch (operator) {
        case 'equals':
          return fieldValue === value;
        case 'notEquals':
          return fieldValue !== value;
        case 'greaterThan':
          return fieldValue > value;
        case 'lessThan':
          return fieldValue < value;
        case 'greaterThanOrEquals':
          return fieldValue >= value;
        case 'lessThanOrEquals':
          return fieldValue <= value;
        case 'contains':
          return String(fieldValue).includes(String(value));
        case 'notContains':
          return !String(fieldValue).includes(String(value));
        case 'in':
          return Array.isArray(value) && value.includes(fieldValue);
        case 'notIn':
          return Array.isArray(value) && !value.includes(fieldValue);
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        case 'notExists':
          return fieldValue === undefined || fieldValue === null;
        case 'empty':
          return fieldValue === '' || fieldValue === null || fieldValue === undefined || 
                 (Array.isArray(fieldValue) && fieldValue.length === 0) ||
                 (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0);
        case 'notEmpty':
          return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined && 
                 !(Array.isArray(fieldValue) && fieldValue.length === 0) &&
                 !(typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0);
        case 'startsWith':
          return String(fieldValue).startsWith(String(value));
        case 'endsWith':
          return String(fieldValue).endsWith(String(value));
        case 'regex':
          return new RegExp(value).test(String(fieldValue));
        default:
          this.logger.warn(`Unknown operator: ${operator}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${error.message}`);
      return false;
    }
  }

  /**
   * Gets a nested value from an object using dot notation
   * 
   * @param obj The object to get the value from
   * @param path The path to the value using dot notation
   * @returns The value at the specified path
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : undefined;
    }, obj);
  }

  /**
   * Evaluates eligibility rules for a financing request
   * 
   * @param financingRequestData The financing request data
   * @param eligibilityRules The eligibility rules to evaluate
   * @returns Eligibility result with decision and reasons
   */
  evaluateEligibility(
    financingRequestData: Record<string, any>,
    eligibilityRules: Array<{
      id: string;
      name: string;
      description?: string;
      priority: number;
      conditions: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
      result: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_REQUIRED';
      reason: string;
      enabled: boolean;
    }>,
  ): {
    decision: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_REQUIRED';
    reasons: string[];
    matchedRules: string[];
  } {
    this.logger.log(`Evaluating eligibility for financing request`);
    
    // Sort rules by priority (higher number = higher priority)
    const sortedRules = [...eligibilityRules].sort((a, b) => b.priority - a.priority);
    
    const result = {
      decision: 'ELIGIBLE' as 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_REQUIRED',
      reasons: [],
      matchedRules: [],
    };
    
    // Evaluate each rule
    for (const rule of sortedRules) {
      // Skip disabled rules
      if (!rule.enabled) {
        continue;
      }
      
      // Check if all conditions are met
      const conditionsMet = this.evaluateConditions(rule.conditions, financingRequestData);
      
      if (conditionsMet) {
        result.matchedRules.push(rule.id);
        
        // If any rule results in INELIGIBLE, the overall decision is INELIGIBLE
        if (rule.result === 'INELIGIBLE') {
          result.decision = 'INELIGIBLE';
          result.reasons.push(rule.reason);
        }
        // If any rule results in REVIEW_REQUIRED and we're not already INELIGIBLE,
        // the overall decision is REVIEW_REQUIRED
        else if (rule.result === 'REVIEW_REQUIRED' && result.decision !== 'INELIGIBLE') {
          result.decision = 'REVIEW_REQUIRED';
          result.reasons.push(rule.reason);
        }
        // If the rule results in ELIGIBLE and we don't have a decision yet,
        // the overall decision is ELIGIBLE
        else if (rule.result === 'ELIGIBLE' && result.decision === 'ELIGIBLE') {
          result.reasons.push(rule.reason);
        }
        
        this.logger.debug(`Rule ${rule.id} matched with result ${rule.result}`);
      }
    }
    
    return result;
  }

  /**
   * Calculates pricing for a financing request based on rules
   * 
   * @param financingRequestData The financing request data
   * @param pricingRules The pricing rules to evaluate
   * @returns Calculated pricing details
   */
  calculatePricing(
    financingRequestData: Record<string, any>,
    pricingRules: Array<{
      id: string;
      name: string;
      description?: string;
      priority: number;
      conditions: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
      interestRateAdjustment: number;
      processingFeeAdjustment: number;
      otherChargesAdjustment: number;
      enabled: boolean;
    }>,
  ): {
    baseInterestRate: number;
    adjustedInterestRate: number;
    processingFee: number;
    otherCharges: number;
    totalCharges: number;
    appliedRules: string[];
  } {
    this.logger.log(`Calculating pricing for financing request`);
    
    // Sort rules by priority (higher number = higher priority)
    const sortedRules = [...pricingRules].sort((a, b) => b.priority - a.priority);
    
    // Get base rates from configuration or default values
    const baseInterestRate = this.configService.get<number>('FINANCING_BASE_INTEREST_RATE', 10);
    const baseProcessingFee = this.configService.get<number>('FINANCING_BASE_PROCESSING_FEE', 1);
    const baseOtherCharges = this.configService.get<number>('FINANCING_BASE_OTHER_CHARGES', 0);
    
    const result = {
      baseInterestRate,
      adjustedInterestRate: baseInterestRate,
      processingFee: baseProcessingFee,
      otherCharges: baseOtherCharges,
      totalCharges: 0,
      appliedRules: [],
    };
    
    // Evaluate each rule
    for (const rule of sortedRules) {
      // Skip disabled rules
      if (!rule.enabled) {
        continue;
      }
      
      // Check if all conditions are met
      const conditionsMet = this.evaluateConditions(rule.conditions, financingRequestData);
      
      if (conditionsMet) {
        result.appliedRules.push(rule.id);
        
        // Apply adjustments
        result.adjustedInterestRate += rule.interestRateAdjustment;
        result.processingFee += rule.processingFeeAdjustment;
        result.otherCharges += rule.otherChargesAdjustment;
        
        this.logger.debug(`Rule ${rule.id} applied with interest rate adjustment ${rule.interestRateAdjustment}`);
      }
    }
    
    // Ensure rates are not negative
    result.adjustedInterestRate = Math.max(0, result.adjustedInterestRate);
    result.processingFee = Math.max(0, result.processingFee);
    result.otherCharges = Math.max(0, result.otherCharges);
    
    // Calculate total charges
    const financingAmount = financingRequestData.financingAmount || 0;
    const tenorDays = financingRequestData.financingTermDays || 30;
    
    // Simple interest calculation for demonstration
    const interestAmount = (financingAmount * result.adjustedInterestRate * tenorDays) / (100 * 365);
    const processingFeeAmount = (financingAmount * result.processingFee) / 100;
    
    result.totalCharges = interestAmount + processingFeeAmount + result.otherCharges;
    
    return result;
  }
}
