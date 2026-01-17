import { faker } from '@faker-js/faker';
import { WorkflowState } from '../../code/entities/workflow-state.entity';

export class WorkflowStateFactory {
    static create(overrides?: Partial<WorkflowState>): WorkflowState {
        const state = new WorkflowState();

        state.id = faker.string.uuid();
        state.tenantId = faker.string.uuid();
        state.disputeId = faker.string.uuid();
        state.stateType = 'Draft';
        state.metadata = {};
        state.enteredAt = faker.date.recent();
        state.enteredBy = 'test-user';

        return Object.assign(state, overrides);
    }

    static createMany(count: number, overrides?: Partial<WorkflowState>): WorkflowState[] {
        return Array.from({ length: count }, () => this.create(overrides));
    }
}
