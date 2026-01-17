
import { AppDataSource } from './data-source';
import { WorkflowDesignService } from './Module_05_Milestone_Workflows/src/services/workflow-design.service';
import { WorkflowDesignController } from './Module_05_Milestone_Workflows/src/controllers/workflow-design.controller';
import { WorkflowDesign, WorkflowDesignStatus } from './Module_05_Milestone_Workflows/src/entities/workflow-design.entity';

async function verifyDesigner() {
    console.log('🚀 Starting Module 05 Designer Verification...');

    try {
        // Step 0: Clean up
        AppDataSource.setOptions({ synchronize: false, logging: false, entities: [] });
        await AppDataSource.initialize();
        console.log('🧹 Cleaning schema...');
        await AppDataSource.query(`DROP TABLE IF EXISTS "workflow_designs" CASCADE`);
        await AppDataSource.destroy();

        // Step 1: Initialize with sync
        // Re-read options or just set them
        const { dataSourceOptions } = require('./data-source');
        AppDataSource.setOptions({
            ...dataSourceOptions,
            synchronize: true,
            logging: false,
            entities: [WorkflowDesign, ...dataSourceOptions.entities]
        });
        await AppDataSource.initialize();
        console.log('✅ Database connected & synced');

        // Create Repository
        const workflowRepo = AppDataSource.getRepository(WorkflowDesign);

        // Initialize Service & Controller
        // Note: nesting dependencies manually for test
        // @ts-ignore
        const designService = new WorkflowDesignService(workflowRepo);
        // @ts-ignore
        const designController = new WorkflowDesignController(designService);

        const tenantId = '123e4567-e89b-12d3-a456-426614174000';
        const userId = '123e4567-e89b-12d3-a456-426614174001';

        // 1. Create a Workflow Design
        console.log('\nTesting Create Workflow...');
        const newWorkflow = await designController.create({
            tenantId,
            name: 'Test Workflow Design',
            description: 'Created by verification script',
            nodes: [
                { id: '1', type: 'start', data: { label: 'Start' }, position: { x: 0, y: 0 } },
                { id: '2', type: 'milestone', data: { label: 'Phase 1' }, position: { x: 100, y: 100 } },
                { id: '3', type: 'end', data: { label: 'End' }, position: { x: 200, y: 200 } }
            ],
            edges: [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3' }
            ],
            createdBy: userId
        });

        if (newWorkflow && newWorkflow.id) {
            console.log(`✅ Workflow Created: ${newWorkflow.id}`);
        } else {
            throw new Error('Failed to create workflow');
        }

        // 2. Validate Workflow (Mock Check)
        console.log('\nTesting Save Validation...');
        const validated = await designController.saveValidation(newWorkflow.id, tenantId, {
            isValid: true,
            errors: [],
            warnings: []
        });

        if (validated.isValid) {
            console.log('✅ Validation Saved');
        } else {
            throw new Error('Validation save failed');
        }

        // 3. Activate Workflow
        console.log('\nTesting Activate Workflow...');
        const activated = await designController.activate(newWorkflow.id, tenantId, { userId });

        if (activated.status === WorkflowDesignStatus.ACTIVE && activated.orchestrationWorkflow) {
            console.log('✅ Workflow Activated');
            console.log('Orchestration Output:', JSON.stringify(activated.orchestrationWorkflow, null, 2));
        } else {
            throw new Error('Activation failed');
        }

        console.log('\n🎉 Module 05 Designer Logic Verified Successfully!');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

verifyDesigner();
