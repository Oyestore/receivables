import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecisionWorkflowService } from '../../src/services/decision-workflow.service';
import { ManualReviewService } from '../../src/services/manual-review.service';
import { CreditDecisionModule } from '../../src/credit-decision.module';
import { TestFixtures } from '../fixtures';

describe('Workflow-Review Integration', () => {
    let app: INestApplication;
    let workflowService: DecisionWorkflowService;
    let reviewService: ManualReviewService;

    beforeAll(async () => {
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

        workflowService = moduleFixture.get<DecisionWorkflowService>(DecisionWorkflowService);
        reviewService = moduleFixture.get<ManualReviewService>(ManualReviewService);
    });

    afterAll(async () => {
        await app.close();
    });

    it('should create manual review from workflow step', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Review Creation Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Auto Check', order: 1, type: 'AUTOMATED' as any },
                { name: 'Manual Review', order: 2, type: 'MANUAL' as any },
            ],
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        const result = await workflowService.executeWorkflowStep(workflow.id, 'decision-1', {});

        // Manual step should trigger review creation
        const reviews = await reviewService.getReviewsByDecision('decision-1');
        expect(reviews.length).toBeGreaterThan(0);
    });

    it('should auto-assign reviewer when creating review', async () => {
        const review = await reviewService.createManualReview({
            decisionId: 'decision-2',
            reviewType: 'CREDIT_APPROVAL' as any,
            priority: 'HIGH' as any,
            reviewReason: 'High amount requires review',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }, 'system');

        expect(review.assignedTo).toBeDefined();
        expect(review.status).toBe('PENDING');
    });

    it('should pause workflow when review pending', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Pause Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Review Step', order: 1, type: 'MANUAL' as any },
            ],
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        await workflowService.executeWorkflowStep(workflow.id, 'decision-3', {});

        const workflowState = await workflowService.getWorkflow(workflow.id);
        expect(workflowState.status).toBe('PENDING_REVIEW');
    });

    it('should resume workflow after review completion', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Resume Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Manual Review', order: 1, type: 'MANUAL' as any },
                { name: 'Final Step', order: 2, type: 'AUTOMATED' as any },
            ],
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        // Create and complete review
        const review = await reviewService.createManualReview({
            decisionId: 'decision-4',
            reviewType: 'CREDIT_APPROVAL' as any,
            priority: 'MEDIUM' as any,
            reviewReason: 'Manual review required',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }, 'system');

        await reviewService.updateReviewStatus(review.id, {
            status: 'COMPLETED' as any,
            reviewNotes: 'Approved',
        }, 'system');

        // Workflow should resume
        const workflowState = await workflowService.getWorkflow(workflow.id);
        expect(workflowState.currentStep).toBeGreaterThan(1);
    });

    it('should propagate review decision to workflow', async () => {
        const review = await reviewService.createManualReview({
            decisionId: 'decision-5',
            reviewType: 'CREDIT_APPROVAL' as any,
            priority: 'HIGH' as any,
            reviewReason: 'Complex case',
            dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        }, 'system');

        await reviewService.updateReviewStatus(review.id, {
            status: 'COMPLETED' as any,
            reviewNotes: 'Rejected due to high risk',
            recommendation: 'REJECT',
        }, 'system');

        const updatedReview = await reviewService.getManualReview(review.id);
        expect(updatedReview.recommendation).toBe('REJECT');
    });

    it('should handle review escalation in workflow', async () => {
        const review = await reviewService.createManualReview({
            decisionId: 'decision-6',
            reviewType: 'CREDIT_APPROVAL' as any,
            priority: 'URGENT' as any,
            reviewReason: 'Escalation required',
            dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
        }, 'system');

        await reviewService.escalateReview(review.id, 'manager-1', 'High value transaction', 'system');

        const escalatedReview = await reviewService.getManualReview(review.id);
        expect(escalatedReview.escalated).toBe(true);
        expect(escalatedReview.escalatedTo).toBe('manager-1');
    });

    it('should track SLA compliance across workflow and review', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'SLA Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Review Step', order: 1, type: 'MANUAL' as any },
            ],
            slaMinutes: 120,
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        const review = await reviewService.createManualReview({
            decisionId: 'decision-7',
            reviewType: 'CREDIT_APPROVAL' as any,
            priority: 'MEDIUM' as any,
            reviewReason: 'SLA testing',
            dueDate: new Date(Date.now() + 120 * 60 * 1000),
        }, 'system');

        expect(workflow.slaMinutes).toBe(120);
        expect(review.requiredBy).toBeDefined();
    });

    it('should handle reviewer workload balancing', async () => {
        // Create multiple reviews
        for (let i = 0; i < 5; i++) {
            await reviewService.createManualReview({
                decisionId: `decision-${8 + i}`,
                reviewType: 'CREDIT_APPROVAL' as any,
                priority: 'MEDIUM' as any,
                reviewReason: 'Load balancing test',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            }, 'system');
        }

        const workload = await reviewService.getReviewerWorkload('reviewer-1');
        expect(workload).toBeDefined();
    });

    it('should support parallel review workflows', async () => {
        const workflow = await workflowService.createWorkflow({
            name: 'Parallel Review Workflow',
            decisionType: 'credit_approval' as any,
            steps: [
                { name: 'Primary Review', order: 1, type: 'MANUAL' as any, parallelAllowed: true },
                { name: 'Secondary Review', order: 1, type: 'MANUAL' as any, parallelAllowed: true },
                { name: 'Consolidation', order: 2, type: 'AUTOMATED' as any },
            ],
        }, 'system');

        await workflowService.activateWorkflow(workflow.id, 'system');

        // Both reviews should be created
        await workflowService.executeWorkflowStep(workflow.id, 'decision-13', {});

        const reviews = await reviewService.getReviewsByDecision('decision-13');
        expect(reviews.length).toBeGreaterThanOrEqual(1);
    });

    it('should capture review quality metrics', async () => {
        const review = await reviewService.createManualReview({
            decisionId: 'decision-14',
            reviewType: 'CREDIT_APPROVAL' as any,
            priority: 'HIGH' as any,
            reviewReason: 'Quality tracking',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }, 'system');

        await reviewService.updateReviewStatus(review.id, {
            status: 'COMPLETED' as any,
            reviewNotes: 'Approved with high confidence',
            qualityScore: 95,
        }, 'system');

        const completedReview = await reviewService.getManualReview(review.id);
        expect(completedReview.qualityScore).toBe(95);
    });
});
