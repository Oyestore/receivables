import {
    CreditDecisionEntity,
    DecisionRuleEntity,
    DecisionWorkflowEntity,
    ManualReviewEntity,
} from '../src/entities';

/**
 * Test fixtures and mock data for Module 15 Credit Decisioning
 */

export class TestFixtures {
    /**
     * Create mock CreditDecision
     */
    static createMockCreditDecision(overrides?: Partial<CreditDecisionEntity>): CreditDecisionEntity {
        const decision = new CreditDecisionEntity();
        decision.id = overrides?.id || '1';
        decision.tenantId = overrides?.tenantId || 'tenant-1';
        decision.entityId = overrides?.entityId || 'entity-1';
        decision.entityType = overrides?.entityType || 'invoice';
        decision.decisionType = overrides?.decisionType || 'credit_approval';
        decision.status = overrides?.status || 'approved';
        decision.amount = overrides?.amount || 10000;
        decision.currency = overrides?.currency || 'USD';
        decision.riskScore = overrides?.riskScore || 75;
        decision.confidenceScore = overrides?.confidenceScore || 85;
        decision.autoDecision = overrides?.autoDecision ?? true;
        decision.decidedAt = overrides?.decidedAt || new Date();
        decision.createdAt = overrides?.createdAt || new Date();
        decision.updatedAt = overrides?.updatedAt || new Date();
        return decision;
    }

    /**
     * Create mock DecisionRule
     */
    static createMockDecisionRule(overrides?: Partial<DecisionRuleEntity>): DecisionRuleEntity {
        const rule = new DecisionRuleEntity();
        rule.id = overrides?.id || '1';
        rule.tenantId = overrides?.tenantId || 'tenant-1';
        rule.name = overrides?.name || 'Test Rule';
        rule.description = overrides?.description || 'Test rule description';
        rule.ruleType = overrides?.ruleType || 'approval';
        rule.priority = overrides?.priority || 100;
        rule.conditions = overrides?.conditions || [{ field: 'amount', operator: 'lte', value: 10000 }];
        rule.action = overrides?.action || 'approve';
        rule.isActive = overrides?.isActive ?? true;
        rule.version = overrides?.version || 1;
        rule.createdAt = overrides?.createdAt || new Date();
        rule.updatedAt = overrides?.updatedAt || new Date();
        return rule;
    }

    /**
     * Create mock DecisionWorkflow
     */
    static createMockDecisionWorkflow(overrides?: Partial<DecisionWorkflowEntity>): DecisionWorkflowEntity {
        const workflow = new DecisionWorkflowEntity();
        workflow.id = overrides?.id || '1';
        workflow.tenantId = overrides?.tenantId || 'tenant-1';
        workflow.name = overrides?.name || 'Standard Approval Workflow';
        workflow.description = overrides?.description || 'Standard workflow description';
        workflow.decisionType = overrides?.decisionType || 'credit_approval';
        workflow.steps = overrides?.steps || [
            { id: 'step1', name: 'Initial Review', action: 'review' },
            { id: 'step2', name: 'Final Approval', action: 'approve' },
        ];
        workflow.isActive = overrides?.isActive ?? true;
        workflow.isDefault = overrides?.isDefault ?? false;
        workflow.createdAt = overrides?.createdAt || new Date();
        workflow.updatedAt = overrides?.updatedAt || new Date();
        return workflow;
    }

    /**
     * Create mock ManualReview
     */
    static createMockManualReview(overrides?: Partial<ManualReviewEntity>): ManualReviewEntity {
        const review = new ManualReviewEntity();
        review.id = overrides?.id || '1';
        review.tenantId = overrides?.tenantId || 'tenant-1';
        review.decisionId = overrides?.decisionId || 'decision-1';
        review.reviewerId = overrides?.reviewerId || 'reviewer-1';
        review.status = overrides?.status || 'pending';
        review.priority = overrides?.priority || 'normal';
        review.assignedAt = overrides?.assignedAt || new Date();
        review.dueDate = overrides?.dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000);
        review.comments = overrides?.comments || [];
        review.createdAt = overrides?.createdAt || new Date();
        review.updatedAt = overrides?.updatedAt || new Date();
        return review;
    }

    /**
     * Create mock decision with rules applied
     */
    static createMockDecisionWithRules(): { decision: CreditDecisionEntity; rules: DecisionRuleEntity[] } {
        const decision = this.createMockCreditDecision({
            amount: 5000,
            status: 'pending',
        });

        const rules = [
            this.createMockDecisionRule({
                name: 'Auto-approve small amounts',
                conditions: [{ field: 'amount', operator: 'lte', value: 10000 }],
                action: 'approve',
            }),
            this.createMockDecisionRule({
                name: 'Manual review large amounts',
                conditions: [{ field: 'amount', operator: 'gt', value: 10000 }],
                action: 'manual_review',
            }),
        ];

        return { decision, rules };
    }

    /**
     * Create mock workflow with steps
     */
    static createMockWorkflowWithSteps(): DecisionWorkflowEntity {
        return this.createMockDecisionWorkflow({
            steps: [
                { id: 'step1', name: 'Automated Check', action: 'auto_decide', slaMinutes: 5 },
                { id: 'step2', name: 'Manual Review', action: 'manual_review', slaMinutes: 1440 },
                { id: 'step3', name: 'Final Approval', action: 'approve', slaMinutes: 60 },
            ],
        });
    }

    /**
     * Create mock review with escalation
     */
    static createMockReviewWithEscalation(): ManualReviewEntity {
        return this.createMockManualReview({
            status: 'escalated',
            priority: 'high',
            dueDate: new Date(Date.now() - 60 * 60 * 1000), // Overdue
        });
    }
}
