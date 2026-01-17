import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditDecisionService } from '../../src/services/credit-decision.service';
import { DecisionWorkflowService } from '../../src/services/decision-workflow.service';
import { CreditDecisionModule } from '../../src/credit-decision.module';
import { TestFixtures } from '../fixtures';

describe('Decision-Workflow Integration', () => {
    let app: INestApplication;
    let decisionService: CreditDecisionService;
    let workflowService: DecisionWorkflowService;

    beforeall(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [__dirname + '/../../src/entities/*.entity{.ts,.js}'],
                    synchronize: true,
                    dropSchema: true,
                }),
                CreditDecisionModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        decisionService = moduleFixture.get<CreditDecisionService>(CreditDecisionService);
        workflowService = moduleFixture.get<DecisionWorkflowService>(DecisionWorkflowService);
    });

    afterAll(async () => {
        await app.close();
    });

    it('should initiate workflow for pending decisions', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'High Risk Review',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Initial Review', order: 1, type: 'AUTOMATED' as any },
                { name: 'Manager Approval', order: 2, type: 'MANUAL' as any },
            ],
            slaMinutes: 60,
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-1',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 100000, // High amount triggers workflow
            context: { initiateWorkflow: true },
        });

        expect(decision.workflowId).toBe(workflow.id);
        expect(decision.status).toBe('pending_review');
    });

    it('should execute workflow steps sequentially', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Sequential Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Step 1', order: 1, type: 'AUTOMATED' as any },
                { name: 'Step 2', order: 2, type: 'AUTOMATED' as any },
                { name: 'Step 3', order: 3, type: 'AUTOMATED' as any },
            ],
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-2',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 50000,
            context: { workflowId: workflow.id },
        });

        const workflowState = await workflowService.getWorkflow(workflow.id);
        expect(workflowState.currentStep).toBeGreaterThan(0);
    });

    it('should pause workflow for manual steps', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Manual Pause Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Auto Step', order: 1, type: 'AUTOMATED' as any },
                { name: 'Manual Step', order: 2, type: 'MANUAL' as any },
            ],
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-3',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 75000,
            context: { workflowId: workflow.id },
        });

        const workflowState = await workflowService.getWorkflow(decision.workflowId);
        expect(workflowState.status).toBe('PENDING_REVIEW');
    });

    it('should track SLA during workflow execution', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'SLA Tracked Workflow',
            decisionType: 'credit_approval' as any,
            steps: [{ name: 'Step 1', order: 1, type: 'AUTOMATED' as any }],
            slaMinutes: 30,
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-4',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 60000,
            context: { workflowId: workflow.id },
        });

        const workflowState = await workflowService.getWorkflow(decision.workflowId);
        expect(workflowState.slaMinutes).toBe(30);
        expect(workflowState.createdAt).toBeDefined();
    });

    it('should complete workflow and update decision', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Completion Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Final Step', order: 1, type: 'AUTOMATED' as any },
            ],
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-5',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 25000,
            context: { workflowId: workflow.id },
        });

        // Workflow completes
        const finalDecision = await decisionService.getDecision(decision.id);
        expect(finalDecision.status).toBe('completed');
    });

    it('should handle workflow errors gracefully', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Error Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Faulty Step', order: 1, type: 'AUTOMATED' as any },
            ],
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-6',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 30000,
            context: { workflowId: workflow.id, simulateError: true },
        });

        expect(decision).toBeDefined();
        expect(decision.status).toBeDefined();
    });

    it('should support conditional workflow routing', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Conditional Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Check Amount', order: 1, type: 'AUTOMATED' as any },
                { name: 'Low Amount Path', order: 2, type: 'AUTOMATED' as any, condition: 'amount < 50000' },
                { name: 'High Amount Path', order: 3, type: 'MANUAL' as any, condition: 'amount >= 50000' },
            ],
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        const lowAmountDecision = await decisionService.evaluateDecision({
            entityId: 'invoice-7',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requested Amount: 30000,
            context: { workflowId: workflow.id },
        });

        expect(lowAmountDecision.workflowstep).toBe(2);
    });

    it('should allow workflow escalation', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Escalation Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Initial Review', order: 1, type: 'MANUAL' as any },
            ],
            slaMinutes: 60,
            escalationMinutes: 45,
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        // Simulate SLA approaching
        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-8',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 80000,
            context: { workflowId: workflow.id },
        });

        expect(decision.escalationTime).toBeDefined();
    });

    it('should track workflow analytics', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Analytics Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Step 1', order: 1, type: 'AUTOMATED' as any },
            ],
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        // Execute multiple times
        for (let i = 0; i < 3; i++) {
            await decisionService.evaluateDecision({
                entityId: `invoice-${9 + i}`,
                entityType: 'invoice',
                decisionType: 'credit_approval' as any,
                requestedAmount: 40000 + i * 10000,
                context: { workflowId: workflow.id },
            });
        }

        const stats = await workflowService.getWorkflowStats();
        expect(stats.totalWorkflows).toBeGreaterThan(0);
    });

    it('should support parallel workflow execution', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Parallel Workflow',
            decision Type: 'credit_approval' as any,
            steps: [
                { name: 'Parallel Step 1', order: 1, type: 'AUTOMATED' as any, parallelAllowed: true },
                { name: 'Parallel Step 2', order: 1, type: 'AUTOMATED' as any, parallelAllowed: true },
                { name: 'Merge Step', order: 2, type: 'AUTOMATED' as any },
            ],
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        const decision = await decisionService.evaluateDecision({
            entityId: 'invoice-12',
            entityType: 'invoice',
            decisionType: 'credit_approval' as any,
            requestedAmount: 55000,
            context: { workflowId: workflow.id },
        });

        expect(decision.workflowId).toBe(workflow.id);
    });
});
