import { faker } from '@faker-js/faker';
import { ApprovalWorkflow } from '../../code/entities/approval-workflow.entity';

export class ApprovalWorkflowFactory {
    static create(overrides?: Partial<ApprovalWorkflow>): ApprovalWorkflow {
        const workflow = new ApprovalWorkflow();

        workflow.id = faker.string.uuid();
        workflow.tenantId = faker.string.uuid();
        workflow.disputeId = faker.string.uuid();
        workflow.requiredLevel = faker.helpers.arrayElement(['L1', 'L2', 'L3']);
        workflow.currentLevel = 'L1';
        workflow.status = 'pending';
        workflow.amount = faker.number.int({ min: 50000, max: 1000000 });
        workflow.reason = faker.lorem.sentence();
        workflow.requestedBy = 'test-user';
        workflow.requestedAt = faker.date.recent();

        return Object.assign(workflow, overrides);
    }

    static createMany(count: number, overrides?: Partial<ApprovalWorkflow>): ApprovalWorkflow[] {
        return Array.from({ length: count }, () => this.create(overrides));
    }
}
