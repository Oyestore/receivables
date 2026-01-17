import { Test, TestingModule } from '@nestjs/testing';
import { DecisionRuleService } from './decision-rule.service';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DecisionRule } from '../entities/decision-rule.entity';
import { TestFixtures } from '../../tests/fixtures';
import { DataSource } from 'typeorm';

describe('DecisionRuleService', () => {
    let service: DecisionRuleService;
    let ruleRepo: any;
    let dataSource: any;

    beforeEach(async () => {
        ruleRepo = createMockRepository<DecisionRule>();
        dataSource = {
            createQueryRunner: jest.fn().mockReturnValue({
                connect: jest.fn(),
                startTransaction: jest.fn(),
                commitTransaction: jest.fn(),
                rollbackTransaction: jest.fn(),
                release: jest.fn(),
                manager: {
                    save: jest.fn(),
                },
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DecisionRuleService,
                { provide: getRepositoryToken(DecisionRule), useValue: ruleRepo },
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        service = module.get<DecisionRuleService>(DecisionRuleService);
    });

    describe('createRule', () => {
        it('should create a new decision rule', async () => {
            const createDto = {
                name: 'High Amount Auto-Reject',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [
                    { field: 'amount', operator: 'gt' as any, value: 100000 },
                ],
                actions: [
                    { type: 'REJECT' as any, parameters: {}, conditions: {} },
                ],
                priority: 100,
            };

            const savedRule = TestFixtures.createMockDecisionRule({
                ...createDto,
                id: 'rule-1',
                status: 'DRAFT' as any,
            });

            ruleRepo.create.mockReturnValue(savedRule);
            ruleRepo.save.mockResolvedValue(savedRule);

            const result = await service.createRule(createDto, 'user-1');

            expect(result.id).toBe('rule-1');
            expect(result.name).toBe(createDto.name);
            expect(ruleRepo.save).toHaveBeenCalled();
        });

        it('should validate rule conditions on creation', async () => {
            const invalidDto = {
                name: 'Invalid Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [
                    { field: 'amount', operator: 'invalid_op' as any, value: 1000 },
                ],
                actions: [],
            };

            await expect(
                service.createRule(invalidDto, 'user-1')
            ).rejects.toThrow();
        });

        it('should set default priority if not provided', async () => {
            const createDto = {
                name: 'Test Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [],
                actions: [],
            };

            const savedRule = TestFixtures.createMockDecisionRule({
                ...createDto,
                priority: 50, // default
            });

            ruleRepo.create.mockReturnValue(savedRule);
            ruleRepo.save.mockResolvedValue(savedRule);

            const result = await service.createRule(createDto, 'user-1');

            expect(result.priority).toBe(50);
        });
    });

    describe('getRules', () => {
        it('should retrieve all active rules', async () => {
            const mockRules = [
                TestFixtures.createMockDecisionRule({ status: 'ACTIVE' as any }),
                TestFixtures.createMockDecisionRule({ status: 'ACTIVE' as any }),
            ];

            ruleRepo.find.mockResolvedValue(mockRules);

            const result = await service.getRules({ status: 'ACTIVE' as any });

            expect(result).toHaveLength(2);
            expect(result.every(r => r.status === 'ACTIVE')).toBe(true);
        });

        it('should filter by rule type', async () => {
            const mockRules = [
                TestFixtures.createMockDecisionRule({ ruleType: 'SCORING' as any }),
            ];

            ruleRepo.find.mockResolvedValue(mockRules);

            const result = await service.getRules({ ruleType: 'SCORING' as any });

            expect(result).toHaveLength(1);
            expect(result[0].ruleType).toBe('SCORING');
        });

        it('should filter by entity type', async () => {
            const mockRules = [
                TestFixtures.createMockDecisionRule({
                    entityTypes: ['invoice', 'customer']
                }),
            ];

            ruleRepo.find.mockResolvedValue(mockRules);

            const result = await service.getRules({ entityType: 'invoice' });

            expect(result).toHaveLength(1);
            expect(result[0].entityTypes).toContain('invoice');
        });

        it('should return empty array when no rules match', async () => {
            ruleRepo.find.mockResolvedValue([]);

            const result = await service.getRules({ status: 'ARCHIVED' as any });

            expect(result).toHaveLength(0);
        });
    });

    describe('getRule', () => {
        it('should retrieve rule by ID', async () => {
            const mockRule = TestFixtures.createMockDecisionRule({ id: 'rule-1' });
            ruleRepo.findOne.mockResolvedValue(mockRule);

            const result = await service.getRule('rule-1');

            expect(result.id).toBe('rule-1');
            expect(ruleRepo.findOne).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
        });

        it('should throw error when rule not found', async () => {
            ruleRepo.findOne.mockResolvedValue(null);

            await expect(service.getRule('non-existent')).rejects.toThrow(
                'Rule not found'
            );
        });
    });

    describe('updateRule', () => {
        it('should update rule properties', async () => {
            const existingRule = TestFixtures.createMockDecisionRule({
                id: 'rule-1',
                name: 'Old Name',
                priority: 50,
            });

            const updateDto = {
                name: 'New Name',
                priority: 100,
            };

            ruleRepo.findOne.mockResolvedValue(existingRule);
            ruleRepo.save.mockResolvedValue({ ...existingRule, ...updateDto });

            const result = await service.updateRule('rule-1', updateDto, 'user-1');

            expect(result.name).toBe('New Name');
            expect(result.priority).toBe(100);
        });

        it('should create new version when updating active rule', async () => {
            const activeRule = TestFixtures.createMockDecisionRule({
                id: 'rule-1',
                status: 'ACTIVE' as any,
                version: 1,
            });

            ruleRepo.findOne.mockResolvedValue(activeRule);
            ruleRepo.save.mockResolvedValue({ ...activeRule, version: 2 });

            const result = await service.updateRule(
                'rule-1',
                { description: 'Updated' },
                'user-1'
            );

            expect(result.version).toBeGreaterThan(activeRule.version);
        });

        it('should prevent updates to archived rules', async () => {
            const archivedRule = TestFixtures.createMockDecisionRule({
                status: 'ARCHIVED' as any,
            });

            ruleRepo.findOne.mockResolvedValue(archivedRule);

            await expect(
                service.updateRule('rule-1', { name: 'New' }, 'user-1')
            ).rejects.toThrow('Cannot update archived rule');
        });
    });

    describe('deleteRule', () => {
        it('should soft delete rule by archiving', async () => {
            const mockRule = TestFixtures.createMockDecisionRule({
                id: 'rule-1',
                status: 'INACTIVE' as any,
            });

            ruleRepo.findOne.mockResolvedValue(mockRule);
            ruleRepo.save.mockResolvedValue({ ...mockRule, status: 'ARCHIVED' });

            await service.deleteRule('rule-1', 'user-1');

            expect(ruleRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'ARCHIVED' })
            );
        });

        it('should prevent deletion of active rules', async () => {
            const activeRule = TestFixtures.createMockDecisionRule({
                status: 'ACTIVE' as any,
            });

            ruleRepo.findOne.mockResolvedValue(activeRule);

            await expect(
                service.deleteRule('rule-1', 'user-1')
            ).rejects.toThrow('Cannot delete active rule');
        });
    });

    describe('activateRule', () => {
        it('should activate a draft rule', async () => {
            const draftRule = TestFixtures.createMockDecisionRule({
                id: 'rule-1',
                status: 'DRAFT' as any,
            });

            ruleRepo.findOne.mockResolvedValue(draftRule);
            ruleRepo.save.mockResolvedValue({ ...draftRule, status: 'ACTIVE' });

            const result = await service.activateRule('rule-1', 'user-1');

            expect(result.status).toBe('ACTIVE');
            expect(result.activatedAt).toBeDefined();
        });

        it('should validate rule before activation', async () => {
            const invalidRule = TestFixtures.createMockDecisionRule({
                status: 'DRAFT' as any,
                conditions: [], // No conditions
                actions: [], // No actions
            });

            ruleRepo.findOne.mockResolvedValue(invalidRule);

            await expect(
                service.activateRule('rule-1', 'user-1')
            ).rejects.toThrow('Rule validation failed');
        });
    });

    describe('deactivateRule', () => {
        it('should deactivate an active rule', async () => {
            const activeRule = TestFixtures.createMockDecisionRule({
                status: 'ACTIVE' as any,
            });

            ruleRepo.findOne.mockResolvedValue(activeRule);
            ruleRepo.save.mockResolvedValue({ ...activeRule, status: 'INACTIVE' });

            const result = await service.deactivateRule('rule-1', 'user-1');

            expect(result.status).toBe('INACTIVE');
        });
    });

    describe('testRule', () => {
        it('should execute test cases against rule', async () => {
            const mockRule = TestFixtures.createMockDecisionRule({
                conditions: [
                    { field: 'amount', operator: 'gt' as any, value: 1000 },
                ],
                testCases: [
                    {
                        name: 'High amount',
                        input: { amount: 5000 },
                        expectedOutput: { passed: true },
                    },
                    {
                        name: 'Low amount',
                        input: { amount: 500 },
                        expectedOutput: { passed: false },
                    },
                ],
            });

            ruleRepo.findOne.mockResolvedValue(mockRule);

            const results = await service.testRule('rule-1');

            expect(results).toHaveLength(2);
            expect(results[0].passed).toBe(true);
            expect(results[1].passed).toBe(false);
        });

        it('should handle test cases with no expectations', async () => {
            const mockRule = TestFixtures.createMockDecisionRule({
                testCases: [
                    { name: 'Test', input: { amount: 1000 }, expectedOutput: null },
                ],
            });

            ruleRepo.findOne.mockResolvedValue(mockRule);

            const results = await service.testRule('rule-1');

            expect(results).toHaveLength(1);
            expect(results[0].actualOutput).toBeDefined();
        });
    });

    describe('validateRule', () => {
        it('should validate complete rule configuration', async () => {
            const validRule = TestFixtures.createMockDecisionRule({
                name: 'Valid Rule',
                conditions: [{ field: 'amount', operator: 'gt' as any, value: 0 }],
                actions: [{ type: 'APPROVE' as any, parameters: {}, conditions: {} }],
            });

            const result = await service.validateRule(validRule);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing required fields', async () => {
            const invalidRule = TestFixtures.createMockDecisionRule({
                name: '',
                conditions: [],
                actions: [],
            });

            const result = await service.validateRule(invalidRule);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Name is required');
            expect(result.errors).toContain('At least one condition required');
            expect(result.errors).toContain('At least one action required');
        });

        it('should validate condition operators', async () => {
            const invalidRule = TestFixtures.createMockDecisionRule({
                conditions: [
                    { field: 'amount', operator: 'invalid' as any, value: 100 },
                ],
            });

            const result = await service.validateRule(invalidRule);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid operator: invalid');
        });

        it('should validate circular dependencies', async () => {
            const ruleWithCircular = TestFixtures.createMockDecisionRule({
                id: 'rule-1',
                conditions: [
                    { field: 'ruleResult.rule-1', operator: 'eq' as any, value: true },
                ],
            });

            const result = await service.validateRule(ruleWithCircular);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Circular dependency detected');
        });
    });

    describe('getRuleMetrics', () => {
        it('should calculate rule execution metrics', async () => {
            const mockRule = TestFixtures.createMockDecisionRule({ id: 'rule-1' });
            ruleRepo.findOne.mockResolvedValue(mockRule);

            // Mock execution data
            jest.spyOn(service as any, 'getExecutionData').mockResolvedValue([
                { result: 'approve', executionTime: 50 },
                { result: 'approve', executionTime: 45 },
                { result: 'reject', executionTime: 55 },
            ]);

            const metrics = await service.getRuleMetrics('rule-1');

            expect(metrics.totalExecutions).toBe(3);
            expect(metrics.approvalRate).toBeCloseTo(66.67, 1);
            expect(metrics.averageExecutionTime).toBe(50);
        });

        it('should handle rules with no execution history', async () => {
            const mockRule = TestFixtures.createMockDecisionRule();
            ruleRepo.findOne.mockResolvedValue(mockRule);
            jest.spyOn(service as any, 'getExecutionData').mockResolvedValue([]);

            const metrics = await service.getRuleMetrics('rule-1');

            expect(metrics.totalExecutions).toBe(0);
            expect(metrics.approvalRate).toBe(0);
        });
    });

    describe('cloneRule', () => {
        it('should create a copy of existing rule', async () => {
            const originalRule = TestFixtures.createMockDecisionRule({
                id: 'rule-1',
                name: 'Original Rule',
            });

            ruleRepo.findOne.mockResolvedValue(originalRule);
            ruleRepo.create.mockImplementation((data) => data);
            ruleRepo.save.mockResolvedValue({
                ...originalRule,
                id: 'rule-2',
                name: 'Cloned Rule',
            });

            const result = await service.cloneRule('rule-1', 'Cloned Rule', 'user-1');

            expect(result.id).not.toBe('rule-1');
            expect(result.name).toBe('Cloned Rule');
            expect(result.status).toBe('DRAFT');
        });
    });

    describe('exportRules', () => {
        it('should export rules to JSON format', async () => {
            const mockRules = [
                TestFixtures.createMockDecisionRule({ id: 'rule-1' }),
                TestFixtures.createMockDecisionRule({ id: 'rule-2' }),
            ];

            ruleRepo.find.mockResolvedValue(mockRules);

            const exported = await service.exportRules(['rule-1', 'rule-2']);

            expect(exported).toHaveLength(2);
            expect(exported[0]).toHaveProperty('name');
            expect(exported[0]).toHaveProperty('conditions');
            expect(exported[0]).not.toHaveProperty('id'); // IDs stripped for import
        });

        it('should export all rules when no IDs specified', async () => {
            const mockRules = [
                TestFixtures.createMockDecisionRule(),
                TestFixtures.createMockDecisionRule(),
                TestFixtures.createMockDecisionRule(),
            ];

            ruleRepo.find.mockResolvedValue(mockRules);

            const exported = await service.exportRules();

            expect(exported).toHaveLength(3);
        });
    });

    describe('importRules', () => {
        it('should import rules from JSON', async () => {
            const rulesData = [
                {
                    name: 'Imported Rule 1',
                    ruleType: 'SCORING',
                    entityTypes: ['invoice'],
                    decisionTypes: ['credit_approval'],
                    conditions: [],
                    actions: [],
                },
                {
                    name: 'Imported Rule 2',
                    ruleType: 'VALIDATION',
                    entityTypes: ['customer'],
                    decisionTypes: ['credit_approval'],
                    conditions: [],
                    actions: [],
                },
            ];

            ruleRepo.create.mockImplementation((data) => data);
            ruleRepo.save.mockImplementation((data) => ({
                ...data,
                id: `rule-${Date.now()}`,
            }));

            const imported = await service.importRules(rulesData, 'user-1');

            expect(imported).toHaveLength(2);
            expect(imported[0].name).toBe('Imported Rule 1');
            expect(imported[1].name).toBe('Imported Rule 2');
        });

        it('should validate imported rules', async () => {
            const invalidData = [
                {
                    name: '',
                    conditions: [],
                    actions: [],
                },
            ];

            await expect(
                service.importRules(invalidData as any, 'user-1')
            ).rejects.toThrow('Validation failed');
        });
    });

    describe('condition evaluation', () => {
        it('should evaluate GT (greater than) operator', async () => {
            const result = await service['evaluateCondition'](100, 'gt', 50);
            expect(result).toBe(true);

            const result2 = await service['evaluateCondition'](30, 'gt', 50);
            expect(result2).toBe(false);
        });

        it('should evaluate LT (less than) operator', async () => {
            const result = await service['evaluateCondition'](30, 'lt', 50);
            expect(result).toBe(true);

            const result2 = await service['evaluateCondition'](100, 'lt', 50);
            expect(result2).toBe(false);
        });

        it('should evaluate EQ (equals) operator', async () => {
            const result = await service['evaluateCondition'](50, 'eq', 50);
            expect(result).toBe(true);

            const result2 = await service['evaluateCondition'](30, 'eq', 50);
            expect(result2).toBe(false);
        });

        it('should evaluate IN operator with arrays', async () => {
            const result = await service['evaluateCondition']('active', 'in', [
                'active',
                'pending',
            ]);
            expect(result).toBe(true);

            const result2 = await service['evaluateCondition']('inactive', 'in', [
                'active',
                'pending',
            ]);
            expect(result2).toBe(false);
        });

        it('should evaluate CONTAINS operator for strings', async () => {
            const result = await service['evaluateCondition'](
                'test@example.com',
                'contains',
                'example'
            );
            expect(result).toBe(true);
        });

        it('should handle nested field paths', async () => {
            const context = {
                customer: {
                    profile: {
                        creditScore: 750,
                    },
                },
            };

            const value = service['getFieldValue'](context, 'customer.profile.creditScore');
            expect(value).toBe(750);
        });
    });

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            ruleRepo.find.mockRejectedValue(new Error('Database connection failed'));

            await expect(service.getRules()).rejects.toThrow(
                'Database connection failed'
            );
        });

        it('should handle invalid rule configurations', async () => {
            const invalidRule = {
                name: 'Test',
                conditions: [{ field: null, operator: 'eq' as any, value: 100 }],
            };

            await expect(
                service.createRule(invalidRule as any, 'user-1')
            ).rejects.toThrow();
        });
    });
});
