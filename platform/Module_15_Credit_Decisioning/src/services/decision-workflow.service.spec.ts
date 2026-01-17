import { Test, TestingModule } from '@nestjs/testing';
import { DecisionWorkflowService } from './decision-workflow.service';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DecisionWorkflow } from '../entities/decision-workflow.entity';
import { TestFixtures } from '../../tests/fixtures';

describe('DecisionWorkflowService', () => {
    let service: DecisionWorkflowService;
    let workflowRepo: any;

    beforeEach(async () => {
        workflowRepo = createMockRepository<DecisionWorkflow>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DecisionWorkflowService,
                { provide: getRepositoryToken(DecisionWorkflow), useValue: workflowRepo },
            ],
        }).compile();

        service = module.get<DecisionWorkflowService>(DecisionWorkflowService);
    });

    describe('createWorkflow', () => {
        it('should create a new workflow with steps', async () => {
            const createDto = {
                name: 'Credit Approval Workflow',
                decisionType: 'credit_approval' as any,
                steps: [
                    { name: 'Initial Review', order: 1, type: 'AUTOMATED' as any },
                    { name: 'Manual Review', order: 2, type: 'MANUAL' as any },
                    { name: 'Final Approval', order: 3, type: 'AUTOMATED' as any },
                ],
                slaMinutes: 60,
            };

            const savedWorkflow = TestFixtures.createMockDecisionWorkflow({
                ...createDto,
                id: 'workflow-1',
                status: 'DRAFT' as any,
            });

            workflowRepo.create.mockReturnValue(savedWorkflow);
            workflowRepo.save.mockResolvedValue(savedWorkflow);

            const result = await service.createWorkflow(createDto, 'user-1');

            expect(result.id).toBe('workflow-1');
            expect(result.steps).toHaveLength(3);
            expect(result.slaMinutes).toBe(60);
        });

        it('should validate step order uniqueness', async () => {
            const invalidDto = {
                name: 'Invalid Workflow',
                decisionType: 'credit_approval' as any,
                steps: [
                    { name: 'Step 1', order: 1, type: 'AUTOMATED' as any },
                    { name: 'Step 2', order: 1, type: 'MANUAL' as any }, // Duplicate order
                ],
            };

            await expect(
                service.createWorkflow(invalidDto, 'user-1')
            ).rejects.toThrow('Duplicate step order');
        });

        it('should set default SLA if not provided', async () => {
            const createDto = {
                name: 'Test Workflow',
                decisionType: 'credit_approval' as any,
                steps: [{ name: 'Step 1', order: 1, type: 'AUTOMATED' as any }],
            };

            const saved = TestFixtures.createMockDecisionWorkflow({
                ...createDto,
                slaMinutes: 120, // default
            });

            workflowRepo.create.mockReturnValue(saved);
            workflowRepo.save.mockResolvedValue(saved);

            const result = await service.createWorkflow(createDto, 'user-1');

            expect(result.slaMinutes).toBe(120);
        });
    });

    describe('executeWorkflowStep', () => {
        it('should execute automated step successfully', async () => {
            const workflow = TestFixtures.createMockDecisionWorkflow({
                id: 'workflow-1',
                currentStep: 1,
                steps: [
                    { name: 'Auto Review', order: 1, type: 'AUTOMATED' as any, action: 'approve' },
                ],
            });

            workflowRepo.findOne.mockResolvedValue(workflow);
            workflowRepo.save.mockResolvedValue({
                ...workflow,
                currentStep: 2,
                status: 'IN_PROGRESS' as any,
            });

            const result = await service.executeWorkflowStep(
                'workflow-1',
                'decision-1',
                { approved: true }
            );

            expect(result.currentStep).toBe(2);
            expect(result.status).toBe('IN_PROGRESS');
        });

        it('should wait for manual step completion', async () => {
            const workflow = TestFixtures.createMockDecisionWorkflow({
                currentStep: 1,
                steps: [
                    { name: 'Manual Review', order: 1, type: 'MANUAL' as any },
                ],
            });

            workflowRepo.findOne.mockResolvedValue(workflow);
            workflowRepo.save.mockResolvedValue({
                ...workflow,
                status: 'PENDING_REVIEW' as any,
            });

            const result = await service.executeWorkflowStep(
                'workflow-1',
                'decision-1',
                {}
            );

            expect(result.status).toBe('PENDING_REVIEW');
            expect(result.currentStep).toBe(1); // Stays on same step
        });

        it('should complete workflow when all steps done', async () => {
            const workflow = TestFixtures.createMockDecisionWorkflow({
                currentStep: 3,
                steps: [
                    { name: 'Step 1', order: 1, type: 'AUTOMATED' as any },
                    { name: 'Step 2', order: 2, type: 'AUTOMATED' as any },
                    { name: 'Step 3', order: 3, type: 'AUTOMATED' as any },
                ],
            });

            workflowRepo.findOne.mockResolvedValue(workflow);
            workflowRepo.save.mockResolvedValue({
                ...workflow,
                status: 'COMPLETED' as any,
                completedAt: new Date(),
            });

            const result = await service.executeWorkflowStep(
                'workflow-1',
                'decision-1',
                {}
            );

            expect(result.status).toBe('COMPLETED');
            expect(result.completedAt).toBeDefined();
        });

        it('should handle step execution errors', async () => {
            const workflow = TestFixtures.createMockDecisionWorkflow({
                currentStep: 1,
                steps: [
                    { name: 'Faulty Step', order: 1, type: 'AUTOMATED' as any },
                ],
            });

            workflowRepo.findOne.mockResolvedValue(workflow);

            // Simulate step execution failure
            jest.spyOn(service as any, 'executeStepAction').mockRejectedValue(
                new Error('Step execution failed')
            );

            await expect(
                service.executeWorkflowStep('workflow-1', 'decision-1', {})
            ).rejects.toThrow('Step execution failed');
        });
    });

    describe('getWorkflow', () => {
        it('should retrieve workflow by ID', async () => {
            const mockWorkflow = TestFixtures.createMockDecisionWorkflow({
                id: 'workflow-1',
            });

            workflowRepo.findOne.mockResolvedValue(mockWorkflow);

            const result = await service.getWorkflow('workflow-1');

            expect(result.id).toBe('workflow-1');
        });

        it('should throw error when workflow not found', async () => {
            workflowRepo.findOne.mockResolvedValue(null);

            await expect(service.getWorkflow('non-existent')).rejects.toThrow(
                'Workflow not found'
            );
        });
    });

    describe('updateWorkflow', () => {
        it('should update workflow configuration', async () => {
            const existing = TestFixtures.createMockDecisionWorkflow({
                id: 'workflow-1',
                slaMinutes: 60,
            });

            const updateDto = {
                slaMinutes: 120,
                escalationMinutes: 90,
            };

            workflowRepo.findOne.mockResolvedValue(existing);
            workflowRepo.save.mockResolvedValue({ ...existing, ...updateDto });

            const result = await service.updateWorkflow('workflow-1', updateDto, 'user-1');

            expect(result.slaMinutes).toBe(120);
            expect(result.escalationMinutes).toBe(90);
        });

        it('should prevent updates to active workflows', async () => {
            const activeWorkflow = TestFixtures.createMockDecisionWorkflow({
                status: 'IN_PROGRESS' as any,
            });

            workflowRepo.findOne.mockResolvedValue(activeWorkflow);

            await expect(
                service.updateWorkflow('workflow-1', { name: 'New' }, 'user-1')
            ).rejects.toThrow('Cannot update active workflow');
        });
    });

    describe('SLA management', () => {
        it('should check if workflow is within SLA', async () => {
            const workflow = TestFixtures.createMockDecisionWorkflow({
                slaMinutes: 60,
                createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
            });

            const isWithinSLA = await service.checkSLA(workflow);

            expect(isWithinSLA).toBe(true);
        });

        it('should detect SLA breach', async () => {
            const workflow = TestFixtures.createMockDecisionWorkflow({
                slaMinutes: 60,
                createdAt: new Date(Date.now() - 90 * 60 * 1000), // 90 mins ago
            });

            const isWithinSLA = await service.checkSLA(workflow);

            expect(isWithinSLA).toBe(false);
        });

        it('should trigger escalation when SLA breached', async () => {
            const workflow = TestFixtures.createMockDecisionWorkflow({
                id: 'workflow-1',
                slaMinutes: 60,
                escalationMinutes: 45,
                createdAt: new Date(Date.now() - 50 * 60 * 1000), // 50 mins ago
            });

            workflowRepo.findOne.mockResolvedValue(workflow);
            workflowRepo.save.mockResolvedValue({
                ...workflow,
                escalated: true,
                escalatedAt: new Date(),
            });

            const result = await service.checkAndEscalate('workflow-1');

            expect(result.escalated).toBe(true);
            expect(result.escalatedAt).toBeDefined();
        });

        it('should calculate time remaining until SLA breach', async () => {
            const workflow = TestFixtures.createMockDecisionWorkflow({
                slaMinutes: 60,
                createdAt: new Date(Date.now() - 40 * 60 * 1000), // 40 mins ago
            });

            const remaining = await service.getTimeRemaining(workflow);

            expect(remaining).toBeCloseTo(20, 0); // ~20 minutes remaining
        });
    });

    describe('workflow state transitions', () => {
        it('should transition from DRAFT to ACTIVE', async () => {
            const draft = TestFixtures.createMockDecisionWorkflow({
                status: 'DRAFT' as any,
            });

            workflowRepo.findOne.mockResolvedValue(draft);
            workflowRepo.save.mockResolvedValue({
                ...draft,
                status: 'ACTIVE' as any,
            });

            const result = await service.activateWorkflow('workflow-1', 'user-1');

            expect(result.status).toBe('ACTIVE');
        });

        it('should validate workflow before activation', async () => {
            const invalidWorkflow = TestFixtures.createMockDecisionWorkflow({
                status: 'DRAFT' as any,
                steps: [], // No steps
            });

            workflowRepo.findOne.mockResolvedValue(invalidWorkflow);

            await expect(
                service.activateWorkflow('workflow-1', 'user-1')
            ).rejects.toThrow('Workflow must have at least one step');
        });

        it('should pause active workflow', async () => {
            const active = TestFixtures.createMockDecisionWorkflow({
                status: 'IN_PROGRESS' as any,
            });

            workflowRepo.findOne.mockResolvedValue(active);
            workflowRepo.save.mockResolvedValue({
                ...active,
                status: 'PAUSED' as any,
            });

            const result = await service.pauseWorkflow('workflow-1', 'user-1');

            expect(result.status).toBe('PAUSED');
        });

        it('should resume paused workflow', async () => {
            const paused = TestFixtures.createMockDecisionWorkflow({
                status: 'PAUSED' as any,
                currentStep: 2,
            });

            workflowRepo.findOne.mockResolvedValue(paused);
            workflowRepo.save.mockResolvedValue({
                ...paused,
                status: 'IN_PROGRESS' as any,
            });

            const result = await service.resumeWorkflow('workflow-1', 'user-1');

            expect(result.status).toBe('IN_PROGRESS');
            expect(result.currentStep).toBe(2); // Resumes from same step
        });
    });

    describe('workflow analytics', () => {
        it('should calculate average completion time', async () => {
            const completedWorkflows = [
                TestFixtures.createMockDecisionWorkflow({
                    createdAt: new Date('2024-01-01T10:00:00'),
                    completedAt: new Date('2024-01-01T11:00:00'), // 60 mins
                }),
                TestFixtures.createMockDecisionWorkflow({
                    createdAt: new Date('2024-01-01T10:00:00'),
                    completedAt: new Date('2024-01-01T11:30:00'), // 90 mins
                }),
            ];

            workflowRepo.find.mockResolvedValue(completedWorkflows);

            const analytics = await service.getWorkflowAnalytics();

            expect(analytics.averageCompletionTimeMinutes).toBe(75);
        });

        it('should track SLA compliance rate', async () => {
            const workflows = [
                TestFixtures.createMockDecisionWorkflow({
                    slaMinutes: 60,
                    createdAt: new Date(Date.now() - 50 * 60 * 1000),
                    completedAt: new Date(),
                }),
                TestFixtures.createMockDecisionWorkflow({
                    slaMinutes: 60,
                    createdAt: new Date(Date.now() - 90 * 60 * 1000),
                    completedAt: new Date(),
                }),
            ];

            workflowRepo.find.mockResolvedValue(workflows);

            const analytics = await service.getWorkflowAnalytics();

            expect(analytics.slaComplianceRate).toBe(50); // 1 of 2 within SLA
        });

        it('should calculate bottleneck analysis', async () => {
            const workflows = [
                TestFixtures.createMockDecisionWorkflow({
                    steps: [
                        { name: 'Step 1', order: 1, averageTimeMinutes: 10 },
                        { name: 'Step 2', order: 2, averageTimeMinutes: 45 }, // Bottleneck
                        { name: 'Step 3', order: 3, averageTimeMinutes: 5 },
                    ],
                }),
            ];

            workflowRepo.find.mockResolvedValue(workflows);

            const analytics = await service.getWorkflowAnalytics();

            expect(analytics.bottleneckStep).toBe('Step 2');
            expect(analytics.bottleneckTimeMinutes).toBe(45);
        });
    });

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            workflowRepo.findOne.mockRejectedValue(new Error('Database error'));

            await expect(service.getWorkflow('workflow-1')).rejects.toThrow(
                'Database error'
            );
        });

        it('should handle invalid state transitions', async () => {
            const completed = TestFixtures.createMockDecisionWorkflow({
                status: 'COMPLETED' as any,
            });

            workflowRepo.findOne.mockResolvedValue(completed);

            await expect(
                service.executeWorkflowStep('workflow-1', 'decision-1', {})
            ).rejects.toThrow('Cannot execute steps on completed workflow');
        });
    });
});
