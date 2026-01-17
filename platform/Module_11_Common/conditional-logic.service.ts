import { Injectable } from '@nestjs/common';
import { ConditionGroup, ConditionRule, Conditions } from './interfaces/condition.interface';
import * as _ from 'lodash'; // Using lodash for safe property access

@Injectable()
export class ConditionalLogicService {

  evaluateConditionRule(rule: ConditionRule, data: any): boolean {
    const { field, operator, value: ruleValue } = rule;
    const actualValue = _.get(data, field);

    // Handle cases where the field might not exist in the data
    if (actualValue === undefined && operator !== 'is_empty' && operator !== 'is_not_empty') {
      // If field is not in data, and operator isn't checking for emptiness, it's usually false
      // unless the ruleValue itself is also undefined/null for an equality check.
      // For simplicity here, if field doesn't exist, most conditions (>, <, == specific_value) will fail.
      // This behavior might need refinement based on specific requirements for missing fields.
      if (operator === '==' && (ruleValue === undefined || ruleValue === null)) return true;
      if (operator === '!=' && (ruleValue === undefined || ruleValue === null)) return false;
      return false;
    }

    switch (operator) {
      case '==':
        return actualValue == ruleValue; // Using loose equality to handle string vs number comparison if needed
      case '!=':
        return actualValue != ruleValue;
      case '>':
        return typeof actualValue === 'number' && typeof ruleValue === 'number' ? actualValue > ruleValue : false;
      case '<':
        return typeof actualValue === 'number' && typeof ruleValue === 'number' ? actualValue < ruleValue : false;
      case '>=':
        return typeof actualValue === 'number' && typeof ruleValue === 'number' ? actualValue >= ruleValue : false;
      case '<=':
        return typeof actualValue === 'number' && typeof ruleValue === 'number' ? actualValue <= ruleValue : false;
      case 'contains':
        return typeof actualValue === 'string' && typeof ruleValue === 'string' ? actualValue.includes(ruleValue) : false;
      case 'not_contains':
        return typeof actualValue === 'string' && typeof ruleValue === 'string' ? !actualValue.includes(ruleValue) : false;
      case 'starts_with':
        return typeof actualValue === 'string' && typeof ruleValue === 'string' ? actualValue.startsWith(ruleValue) : false;
      case 'ends_with':
        return typeof actualValue === 'string' && typeof ruleValue === 'string' ? actualValue.endsWith(ruleValue) : false;
      case 'is_empty':
        return actualValue === null || actualValue === undefined || actualValue === '';
      case 'is_not_empty':
        return actualValue !== null && actualValue !== undefined && actualValue !== '';
      // Add more operators as needed (e.g., regex, date comparisons)
      default:
        console.warn(`Unsupported operator: ${operator}`);
        return false;
    }
  }

  evaluateConditionGroup(group: ConditionGroup, data: any): boolean {
    if (!group.rules || group.rules.length === 0) {
      return true; // An empty group of rules is considered true
    }

    if (group.groupLogic === 'AND') {
      for (const rule of group.rules) {
        if (!this.evaluateConditionRule(rule, data)) {
          return false; // If any rule is false in an AND group, the group is false
        }
      }
      return true; // All rules are true
    } else { // OR logic
      for (const rule of group.rules) {
        if (this.evaluateConditionRule(rule, data)) {
          return true; // If any rule is true in an OR group, the group is true
        }
      }
      return false; // No rules are true
    }
  }

  evaluateAllConditions(conditions: Conditions, data: any): boolean {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions means the element should be visible
    }

    // For now, assume top-level conditions are implicitly ANDed.
    // If more complex inter-group logic (e.g., GroupA OR GroupB) is needed at the top level,
    // this part would need adjustment, or the GrapesJS plugin would need to enforce a single top-level group.
    // The current GrapesJS plugin saves an array of groups, implying they are ANDed.
    for (const group of conditions) {
      if (!this.evaluateConditionGroup(group, data)) {
        return false; // If any group is false, the overall conditions are false
      }
    }
    return true; // All groups are true
  }
}

