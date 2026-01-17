export interface ConditionRule {
  field: string;
  operator: string;
  value: any;
}

export interface ConditionGroup {
  groupLogic: 'AND' | 'OR';
  rules: ConditionRule[];
}

export type Conditions = ConditionGroup[];

