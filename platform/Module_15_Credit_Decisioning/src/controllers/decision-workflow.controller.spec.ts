import { Test, TestingModule } from '@nestjs/testing';
import { DecisionWorkflowController } from './decision-workflow.controller';
import { DecisionWorkflowService } from '../services/decision-workflow.service';
import { TestFixtures } from '../../tests/fixtures';

describe('DecisionWorkflowController', () => {
    let controller: DecisionWorkflowController;
    let service: Partial<DecisionWorkflowService>;

    beforeEach(async () => {
        service = {
            getWorkflows: jest.fn(),
            getWorkflow: jest.fn(),
            createWorkflow: jest.fn(),
            updateWorkflow: jest.fn(),
            activateWorkflow: jest.fn(),
            deactivateWorkflow: jest.fn(),
            executeWorkflowStep: jest.fn(),
            getWorkflowStats: jest.fn(),
            cloneWorkflow: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [DecisionWorkflowController],
            providers: [{ provide: DecisionWorkflowService, useValue: service }],
        }).compile();

        controller = module.get<DecisionWorkflowController>(
            DecisionWorkflowController
        );
    });

    describe('GET /workflows', () => {
        it('should retrieve all workflows', async () => {
            const mockWorkflows = [
                TestFixtures.createMockDecisionWorkflow({ status: 'ACTIVE' as any }),
                TestFixtures.createMockDecisionWorkflow({ status: 'ACTIVE' as any }),
            ];

            (service.getWorkflows as jest.Mock).mockResolvedValue(mockWorkflows);

            const result = await controller.getWorkflows({});

            expect(result).toHaveLength(2);
            expect(service.getWorkflows).toHaveBeenCalledWith({});
        });

        it('should filter workflows by status and decision type', async () => {
            const mockWorkflows = [
                TestFixtures.createMockDecisionWorkflow({
                    status: 'ACTIVE' as any,
                    decisionType: 'credit_approval',
                }),
            ];

            (service.getWorkflows as jest.Mock).mockResolvedValue(mockWorkflows);

            await controller.getWorkflows({
                status: 'ACTIVE' as any,
                decisionType: 'credit_approval',
            });

            expect(service.getWorkflows).toHaveBeenCalledWith({
                status: 'ACTIVE',
                decisionType: 'credit_approval',
            });
        });
    });

    describe('GET /workflows/:id', () => {
        it('should retrieve workflow by ID', async () => {
            const mockWorkflow = TestFixtures.createMockDecisionWorkflow({
                id: 'workflow-1',
            });

            (service.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);

            const result = await controller.getWorkflow('workflow-1');

            expect(result.id).toBe('workflow-1');
            expect(service.getWorkflow).toHaveBeenCalledWith('workflow-1');
        });

        it('should handle workflow not found', async () => {
            (service.getWorkflow as jest.Mock).mockRejectedValue(
                new Error('Workflow not found')
            );

            await expect(controller.getWorkflow('non-existent')).rejects.toThrow(
                'Workflow not found'
            );
        });
    });

    describe('POST /workflows', () => {
        it('should create new workflow', async () => {
            const createDto = {
                name: 'Credit Approval Workflow',
                decisionType: 'credit_approval' as any,
                steps: [
                    { name: 'Initial Review', order: 1, type: 'AUTOMATED' as any },
                    { name: 'Manual Review', order: 2, type: 'MANUAL' as any },
                ],
                slaMinutes: 120,
            };

            const mockCreated = TestFixtures.createMockDecisionWorkflow({
                ...createDto,
                id: 'workflow-1',
            });

            (service.createWorkflow as jest.Mock).mockResolvedValue(mockCreated);

            const result = await controller.createWorkflow(createDto);

            expect(result.id).toBe('workflow-1');
            expect(result.steps).toHaveLength(2);
            expect(service.createWorkflow).toHaveBeenCalledWith(createDto, undefined);
        });
    });

    describe('PATCH /workflows/:id', () => {
        it('should update workflow', async () => {
            const updateDto = {
                slaMinutes: 180,
                escalationMinutes: 120,
            };

            const mockUpdated = TestFixtures.createMockDecisionWorkflow({
                id: 'workflow-1',
                ...updateDto,
            });

            (service.updateWorkflow as jest.Mock).mockResolvedValue(mockUpdated);

            const result = await controller.updateWorkflow('workflow-1', updateDto);

            expect(result.slaMinutes).toBe(180);
            expect(service.updateWorkflow).toHaveBeenCalledWith(
                'workflow-1',
                updateDto,
                undefined
            );
        });
    });

    describe('POST /workflows/:id/activate', () => {
        it('should activate workflow', async () => {
            const mockActivated = TestFixtures.createMockDecisionWorkflow({
                id: 'workflow-1',
                status: 'ACTIVE' as any,
            });

            (service.activateWorkflow as jest.Mock).mockResolvedValue(mockActivated);

            const result = await controller.activateWorkflow('workflow-1');

            expect(result.status).toBe('ACTIVE');
            expect(service.activateWorkflow).toHaveBeenCalledWith(
                'workflow-1',
                undefined
            );
        });
    });

    describe('POST /workflows/:id/deactivate', () => {
        it('should deactivate workflow', async () => {
            const mockDeactivated = TestFixtures.createMockDecisionWorkflow({
                id: 'workflow-1',
                status: 'INACTIVE' as any,
            });

            (service.deactivateWorkflow as jest.Mock).mockResolvedValue(
                mockDeactivated
            );

            const result = await controller.deactivateWorkflow('workflow-1');

            expect(result.status).toBe('INACTIVE');
            expect(service.deactivateWorkflow).toHaveBeenCalledWith(
                'workflow-1',
                undefined
            );
        });
    });

    describe('POST /workflows/:id/execute', () => {
        it('should execute workflow step', async () => {
            const executeDto = {
                decisionId: 'decision-1',
                context: { approved: true },
            };

            const mockExecuted = TestFixtures.createMockDecisionWorkflow({
                id: 'workflow-1',
                currentStep: 2,
                status: 'IN_PROGRESS' as any,
            });

            (service.executeWorkflowStep as jest.Mock).mockResolvedValue(
                mockExecuted
            );

            const result = await controller.executeWorkflowStep(
                'workflow-1',
                executeDto
            );

            expect(result.currentStep).toBe(2);
            expect(result.status).toBe('IN_PROGRESS');
            expect(service.executeWorkflowStep).toHaveBeenCalledWith(
                'workflow-1',
                'decision-1',
                { approved: true }
            );
        });

        it('should complete workflow when all steps done', async () => {
            const executeDto = {
                decisionId: 'decision-1',
                context: {},
            };

            const mockCompleted = TestFixtures.createMockDecisionWorkflow({
                id: 'workflow-1',
                status: 'COMPLETED' as any,
                completedAt: new Date(),
            });

            (service.executeWorkflowStep as jest.Mock).mockResolvedValue(
                mockCompleted
            );

            const result = await controller.executeWorkflowStep(
                'workflow-1',
                executeDto
            );

            expect(result.status).toBe('COMPLETED');
            expect(result.completedAt).toBeDefined();
        });
    });

    describe('GET /workflows/stats', () => {
        it('should retrieve workflow statistics', async () => {
            const mockStats = {
                totalWorkflows: 50,
                activeWorkflows: 30,
                completedWorkflows: 15,
                averageCompletionTime: 45,
                slaComplianceRate: 92,
                byDecisionType: {
                    credit_approval: 30,
                    limit_increase: 20,
                },
            };

            (service.getWorkflowStats as jest.Mock).mockResolvedValue(mockStats);

            const result = await controller.getWorkflowStats();

            expect(result.totalWorkflows).toBe(50);
            expect(result.slaComplianceRate).toBe(92);
            expect(service.getWorkflowStats).toHaveBeenCalled();
        });
    });

    describe('POST /workflows/:id/clone', () => {
        it('should clone workflow', async () => {
            const cloneDto = {
                newName: 'Cloned Workflow',
            };

            const mockCloned = TestFixtures.createMockDecisionWorkflow({
                id: 'workflow-2',
                name: 'Cloned Workflow',
                status: 'DRAFT' as any,
            });

            (service.cloneWorkflow as jest.Mock).mockResolvedValue(mockCloned);

            const result = await controller.cloneWorkflow('workflow-1', cloneDto);

            expect(result.id).toBe('workflow-2');
            expect(result.name).toBe('Cloned Workflow');
            expect(result.status).toBe('DRAFT');
        });
    });

    describe('error handling', () => {
        it('should handle service errors', async () => {
            (service.getWorkflows as jest.Mock).mockRejectedValue(
                new Error('Service error')
            );

            await expect(controller.getWorkflows({})).rejects.toThrow(
                'Service error'
            );
        });

        it('should handle invalid workflow execution', async () => {
            (service.executeWorkflowStep as jest.Mock).mockRejectedValue(
                new Error('Invalid workflow state')
            );

            await expect(
                controller.executeWorkflowStep('workflow-1', {
                    decisionId: 'decision-1',
                    context: {},
                })
            ).rejects.toThrow('Invalid workflow state');
        });
    });
});
