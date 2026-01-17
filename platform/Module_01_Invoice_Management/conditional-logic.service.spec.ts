import { Test, TestingModule } from '@nestjs/testing';
import { ConditionalLogicService } from '../conditional-logic.service';
import { Condition, ConditionGroup } from '../../conditional-logic/interfaces/condition.interface';

describe('ConditionalLogicService', () => {
  let service: ConditionalLogicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConditionalLogicService],
    }).compile();

    service = module.get<ConditionalLogicService>(ConditionalLogicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluateCondition', () => {
    const dataContext = {
      invoice: {
        total: 500,
        status: 'pending',
        items: [
          { name: 'Item A', quantity: 2, price: 50 },
          { name: 'Item B', quantity: 1, price: 400 },
        ],
        due_date: '2024-12-31',
        is_recurring: true,
      },
      customer: {
        name: 'Acme Corp',
        country: 'USA',
        rating: 5,
      },
    };

    // Basic field checks
    it('should evaluate simple equality for numbers', () => {
      const condition: Condition = { field: 'invoice.total', operator: '==', value: 500 };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    it('should evaluate simple equality for strings', () => {
      const condition: Condition = { field: 'invoice.status', operator: '==', value: 'pending' };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    it('should evaluate simple inequality for numbers', () => {
      const condition: Condition = { field: 'invoice.total', operator: '!=', value: 100 };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    // Numeric comparisons
    it('should evaluate greater than', () => {
      const condition: Condition = { field: 'invoice.total', operator: '>', value: 499 };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    it('should evaluate greater than or equal to', () => {
      const condition: Condition = { field: 'invoice.total', operator: '>=', value: 500 };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    it('should evaluate less than', () => {
      const condition: Condition = { field: 'invoice.total', operator: '<', value: 501 };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    it('should evaluate less than or equal to', () => {
      const condition: Condition = { field: 'invoice.total', operator: '<=', value: 500 };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    // String comparisons
    it('should evaluate string contains', () => {
      const condition: Condition = { field: 'customer.name', operator: 'contains', value: 'Acme' };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    it('should evaluate string does not contain', () => {
      const condition: Condition = { field: 'customer.name', operator: 'not_contains', value: 'Beta' };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    it('should evaluate string starts with', () => {
      const condition: Condition = { field: 'customer.name', operator: 'starts_with', value: 'Acm' };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    it('should evaluate string ends with', () => {
      const condition: Condition = { field: 'customer.name', operator: 'ends_with', value: 'Corp' };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    // Boolean checks
    it('should evaluate boolean true', () => {
      const condition: Condition = { field: 'invoice.is_recurring', operator: '==', value: true };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    it('should evaluate boolean false', () => {
      const condition: Condition = { field: 'invoice.is_recurring', operator: '!=', value: false }; // true != false is true
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    // Empty/Not Empty checks
    it('should evaluate is_empty for a non-empty field as false', () => {
      const condition: Condition = { field: 'customer.name', operator: 'is_empty' };
      expect(service.evaluateCondition(condition, dataContext)).toBe(false);
    });

    it('should evaluate is_not_empty for a non-empty field as true', () => {
      const condition: Condition = { field: 'customer.name', operator: 'is_not_empty' };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    it('should evaluate is_empty for a missing field as true', () => {
      const condition: Condition = { field: 'customer.non_existent_field', operator: 'is_empty' };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    // Nested field access
    it('should evaluate nested field access', () => {
      const condition: Condition = { field: 'invoice.items[0].name', operator: '==', value: 'Item A' };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    it('should evaluate nested field access with number', () => {
      const condition: Condition = { field: 'invoice.items[1].price', operator: '==', value: 400 };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    // Date comparisons (conceptual - assuming string comparison for simplicity here, real date logic would be more complex)
    it('should evaluate date string equality', () => {
      const condition: Condition = { field: 'invoice.due_date', operator: '==', value: '2024-12-31' };
      expect(service.evaluateCondition(condition, dataContext)).toBe(true);
    });

    // Handling of missing fields
    it('should return false for most operators if field is missing (except is_empty/is_not_empty)', () => {
      const condition: Condition = { field: 'customer.non_existent_field', operator: '==', value: 'some_value' };
      expect(service.evaluateCondition(condition, dataContext)).toBe(false);
    });
  });

  describe('evaluateConditionGroup', () => {
    const dataContext = {
      invoice: { total: 600, status: 'paid' },
      customer: { country: 'Canada' },
    };

    it('should evaluate AND logic correctly (all true)', () => {
      const group: ConditionGroup = {
        groupLogic: 'AND',
        rules: [
          { field: 'invoice.total', operator: '>', value: 500 },
          { field: 'invoice.status', operator: '==', value: 'paid' },
        ],
      };
      expect(service.evaluateConditionGroup(group, dataContext)).toBe(true);
    });

    it('should evaluate AND logic correctly (one false)', () => {
      const group: ConditionGroup = {
        groupLogic: 'AND',
        rules: [
          { field: 'invoice.total', operator: '>', value: 500 },
          { field: 'invoice.status', operator: '==', value: 'pending' }, // this is false
        ],
      };
      expect(service.evaluateConditionGroup(group, dataContext)).toBe(false);
    });

    it('should evaluate OR logic correctly (one true)', () => {
      const group: ConditionGroup = {
        groupLogic: 'OR',
        rules: [
          { field: 'invoice.total', operator: '<', value: 500 }, // false
          { field: 'invoice.status', operator: '==', value: 'paid' }, // true
        ],
      };
      expect(service.evaluateConditionGroup(group, dataContext)).toBe(true);
    });

    it('should evaluate OR logic correctly (all false)', () => {
      const group: ConditionGroup = {
        groupLogic: 'OR',
        rules: [
          { field: 'invoice.total', operator: '<', value: 500 }, // false
          { field: 'invoice.status', operator: '==', value: 'pending' }, // false
        ],
      };
      expect(service.evaluateConditionGroup(group, dataContext)).toBe(false);
    });

    it('should return true for an empty rule set in an AND group', () => {
        const group: ConditionGroup = { groupLogic: 'AND', rules: [] };
        expect(service.evaluateConditionGroup(group, dataContext)).toBe(true);
    });

    it('should return false for an empty rule set in an OR group', () => {
        const group: ConditionGroup = { groupLogic: 'OR', rules: [] };
        expect(service.evaluateConditionGroup(group, dataContext)).toBe(false);
    });
  });

  describe('evaluateAllConditionGroups', () => {
    const dataContext = {
      invoice: { total: 700, status: 'draft' },
      customer: { country: 'USA', is_premium: true },
    };

    it('should evaluate multiple AND groups correctly (all true)', () => {
      const groups: ConditionGroup[] = [
        {
          groupLogic: 'AND',
          rules: [{ field: 'invoice.total', operator: '>', value: 600 }],
        },
        {
          groupLogic: 'AND',
          rules: [{ field: 'customer.country', operator: '==', value: 'USA' }],
        },
      ];
      expect(service.evaluateAllConditionGroups(groups, dataContext)).toBe(true);
    });

    it('should evaluate multiple AND groups correctly (one group false)', () => {
      const groups: ConditionGroup[] = [
        {
          groupLogic: 'AND',
          rules: [{ field: 'invoice.total', operator: '>', value: 600 }], // true
        },
        {
          groupLogic: 'AND',
          rules: [{ field: 'invoice.status', operator: '==', value: 'paid' }], // false
        },
      ];
      expect(service.evaluateAllConditionGroups(groups, dataContext)).toBe(false);
    });

    // Note: The current `evaluateAllConditionGroups` implies an overall AND between groups.
    // If an OR between groups was intended, the logic in the service would need to change.
    // For now, testing as if it's an AND of group results.

    it('should return true if no condition groups are provided', () => {
      const groups: ConditionGroup[] = [];
      expect(service.evaluateAllConditionGroups(groups, dataContext)).toBe(true);
    });

    it('should handle a mix of AND and OR groups (assuming overall AND)', () => {
        const groups: ConditionGroup[] = [
          {
            groupLogic: 'OR', // This group is true
            rules: [
                { field: 'invoice.total', operator: '>', value: 600 }, // true
                { field: 'invoice.status', operator: '==', value: 'paid' } // false
            ],
          },
          {
            groupLogic: 'AND', // This group is true
            rules: [{ field: 'customer.is_premium', operator: '==', value: true }],
          },
        ];
        expect(service.evaluateAllConditionGroups(groups, dataContext)).toBe(true);
      });

      it('should handle a mix of AND and OR groups where one group result is false (assuming overall AND)', () => {
        const groups: ConditionGroup[] = [
          {
            groupLogic: 'OR', // This group is true
            rules: [
                { field: 'invoice.total', operator: '>', value: 600 }, // true
                { field: 'invoice.status', operator: '==', value: 'paid' } // false
            ],
          },
          {
            groupLogic: 'AND', // This group is false
            rules: [{ field: 'customer.is_premium', operator: '==', value: false }], // customer.is_premium is true
          },
        ];
        expect(service.evaluateAllConditionGroups(groups, dataContext)).toBe(false);
      });
  });
});

