import { Test, TestingModule } from '@nestjs/testing';
import { DecisionRuleController } from './decision-rule.controller';
import { DecisionRuleService } from '../services/decision-rule.service';
import { TestFixtures } from '../../tests/fixtures';

describe('DecisionRuleController', () => {
    let controller: DecisionRuleController;
    let service: Partial<DecisionRuleService>;

    beforeEach(async () => {
        service = {
            getRules: jest.fn(),
            getRule: jest.fn(),
            createRule: jest.fn(),
            updateRule: jest.fn(),
            deleteRule: jest.fn(),
            activateRule: jest.fn(),
            deactivateRule: jest.fn(),
            testRule: jest.fn(),
            getRuleMetrics: jest.fn(),
            cloneRule: jest.fn(),
            exportRules: jest.fn(),
            importRules: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [DecisionRuleController],
            providers: [{ provide: DecisionRuleService, useValue: service }],
        }).compile();

        controller = module.get<DecisionRuleController>(DecisionRuleController);
    });

    describe('GET /rules', () => {
        it('should retrieve all rules with filters', async () => {
            const mockRules = [
                TestFixtures.createMockDecisionRule({ status: 'ACTIVE' as any }),
                TestFixtures.createMockDecisionRule({ status: 'ACTIVE' as any }),
            ];

            (service.getRules as jest.Mock).mockResolvedValue(mockRules);

            const result = await controller.getRules({ status: 'ACTIVE' as any });

            expect(result).toHaveLength(2);
            expect(service.getRules).toHaveBeenCalledWith({ status: 'ACTIVE' });
        });

        it('should filter by rule type and category', async () => {
            const mockRules = [
                TestFixtures.createMockDecisionRule({
                    ruleType: 'SCORING' as any,
                    category: 'CREDIT',
                }),
            ];

            (service.getRules as jest.Mock).mockResolvedValue(mockRules);

            await controller.getRules({
                ruleType: 'SCORING' as any,
                category: 'CREDIT',
            });

            expect(service.getRules).toHaveBeenCalledWith({
                ruleType: 'SCORING',
                category: 'CREDIT',
            });
        });
    });

    describe('GET /rules/:id', () => {
        it('should retrieve rule by ID', async () => {
            const mockRule = TestFixtures.createMockDecisionRule({ id: 'rule-1' });
            (service.getRule as jest.Mock).mockResolvedValue(mockRule);

            const result = await controller.getRule('rule-1');

            expect(result.id).toBe('rule-1');
            expect(service.getRule).toHaveBeenCalledWith('rule-1');
        });

        it('should return 404 when rule not found', async () => {
            (service.getRule as jest.Mock).mockRejectedValue(
                new Error('Rule not found')
            );

            await expect(controller.getRule('non-existent')).rejects.toThrow(
                'Rule not found'
            );
        });
    });

    describe('POST /rules', () => {
        it('should create new rule', async () => {
            const createDto = {
                name: 'High Amount Rule',
                ruleType: 'SCORING' as any,
                entityTypes: ['invoice'],
                decisionTypes: ['credit_approval'],
                conditions: [{ field: 'amount', operator: 'gt' as any, value: 50000 }],
                actions: [{ type: 'APPROVE' as any, parameters: {} }],
            };

            const mockCreated = TestFixtures.createMockDecisionRule({
                ...createDto,
                id: 'rule-1',
            });

            (service.createRule as jest.Mock).mockResolvedValue(mockCreated);

            const result = await controller.createRule(createDto);

            expect(result.id).toBe('rule-1');
            expect(service.createRule).toHaveBeenCalledWith(createDto, undefined);
        });
    });

    describe('PATCH /rules/:id', () => {
        it('should update rule', async () => {
            const updateDto = {
                name: 'Updated Rule Name',
                priority: 100,
            };

            const mockUpdated = TestFixtures.createMockDecisionRule({
                id: 'rule-1',
                ...updateDto,
            });

            (service.updateRule as jest.Mock).mockResolvedValue(mockUpdated);

            const result = await controller.updateRule('rule-1', updateDto);

            expect(result.name).toBe('Updated Rule Name');
            expect(service.updateRule).toHaveBeenCalledWith(
                'rule-1',
                updateDto,
                undefined
            );
        });
    });

    describe('DELETE /rules/:id', () => {
        it('should delete rule', async () => {
            (service.deleteRule as jest.Mock).mockResolvedValue(undefined);

            await controller.deleteRule('rule-1');

            expect(service.deleteRule).toHaveBeenCalledWith('rule-1', undefined);
        });
    });

    describe('POST /rules/:id/activate', () => {
        it('should activate rule', async () => {
            const mockActivated = TestFixtures.createMockDecisionRule({
                id: 'rule-1',
                status: 'ACTIVE' as any,
            });

            (service.activateRule as jest.Mock).mockResolvedValue(mockActivated);

            const result = await controller.activateRule('rule-1');

            expect(result.status).toBe('ACTIVE');
            expect(service.activateRule).toHaveBeenCalledWith('rule-1', undefined);
        });
    });

    describe('POST /rules/:id/deactivate', () => {
        it('should deactivate rule', async () => {
            const mockDeactivated = TestFixtures.createMockDecisionRule({
                id: 'rule-1',
                status: 'INACTIVE' as any,
            });

            (service.deactivateRule as jest.Mock).mockResolvedValue(mockDeactivated);

            const result = await controller.deactivateRule('rule-1');

            expect(result.status).toBe('INACTIVE');
            expect(service.deactivateRule).toHaveBeenCalledWith('rule-1', undefined);
        });
    });

    describe('POST /rules/:id/test', () => {
        it('should execute rule test cases', async () => {
            const mockTestResults = [
                {
                    ruleId: 'rule-1',
                    testCase: 'High amount',
                    passed: true,
                    actualOutput: { approved: true },
                    expectedOutput: { approved: true },
                },
                {
                    ruleId: 'rule-1',
                    testCase: 'Low amount',
                    passed: false,
                    actualOutput: { approved: false },
                    expectedOutput: { approved: true },
                },
            ];

            (service.testRule as jest.Mock).mockResolvedValue(mockTestResults);

            const result = await controller.testRule('rule-1');

            expect(result).toHaveLength(2);
            expect(result[0].passed).toBe(true);
            expect(result[1].passed).toBe(false);
        });
    });

    describe('GET /rules/:id/metrics', () => {
        it('should retrieve rule performance metrics', async () => {
            const mockMetrics = {
                totalExecutions: 100,
                approvalRate: 75,
                averageExecutionTime: 25,
                successRate: 98,
            };

            (service.getRuleMetrics as jest.Mock).mockResolvedValue(mockMetrics);

            const result = await controller.getRuleMetrics('rule-1');

            expect(result.totalExecutions).toBe(100);
            expect(result.approvalRate).toBe(75);
            expect(service.getRuleMetrics).toHaveBeenCalledWith(
                'rule-1',
                undefined,
                undefined
            );
        });

        it('should support date range filtering', async () => {
            const startDate = '2024-01-01';
            const endDate = '2024-01-31';

            (service.getRuleMetrics as jest.Mock).mockResolvedValue({});

            await controller.getRuleMetrics('rule-1', startDate, endDate);

            expect(service.getRuleMetrics).toHaveBeenCalledWith(
                'rule-1',
                new Date(startDate),
                new Date(endDate)
            );
        });
    });

    describe('POST /rules/:id/clone', () => {
        it('should clone existing rule', async () => {
            const cloneDto = {
                newName: 'Cloned Rule',
            };

            const mockCloned = TestFixtures.createMockDecisionRule({
                id: 'rule-2',
                name: 'Cloned Rule',
                status: 'DRAFT' as any,
            });

            (service.cloneRule as jest.Mock).mockResolvedValue(mockCloned);

            const result = await controller.cloneRule('rule-1', cloneDto);

            expect(result.id).toBe('rule-2');
            expect(result.name).toBe('Cloned Rule');
            expect(result.status).toBe('DRAFT');
        });
    });

    describe('GET /rules/export', () => {
        it('should export rules to JSON', async () => {
            const mockExport = [
                { name: 'Rule 1', conditions: [], actions: [] },
                { name: 'Rule 2', conditions: [], actions: [] },
            ];

            (service.exportRules as jest.Mock).mockResolvedValue(mockExport);

            const result = await controller.exportRules(['rule-1', 'rule-2']);

            expect(result).toHaveLength(2);
            expect(service.exportRules).toHaveBeenCalledWith(['rule-1', 'rule-2']);
        });
    });

    describe('POST /rules/import', () => {
        it('should import rules from JSON', async () => {
            const importDto = {
                rules: [
                    {
                        name: 'Imported Rule',
                        ruleType: 'SCORING',
                        entityTypes: ['invoice'],
                        decisionTypes: ['credit_approval'],
                        conditions: [],
                        actions: [],
                    },
                ],
            };

            const mockImported = [
                TestFixtures.createMockDecisionRule({
                    id: 'rule-new',
                    name: 'Imported Rule',
                }),
            ];

            (service.importRules as jest.Mock).mockResolvedValue(mockImported);

            const result = await controller.importRules(importDto);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Imported Rule');
        });
    });

    describe('error handling', () => {
        it('should handle service errors', async () => {
            (service.getRules as jest.Mock).mockRejectedValue(
                new Error('Database error')
            );

            await expect(controller.getRules({})).rejects.toThrow('Database error');
        });
    });
});
