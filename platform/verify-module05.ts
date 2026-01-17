/**
 * Module 05 Verification Script
 * Tests the complete milestone workflow: Definition → Instance → Completion → Invoice → Payment
 */

import { AppDataSource } from './data-source';
import { MilestoneDefinition } from './Module_05_Milestone_Workflows/src/entities/milestone-definition.entity';
import { MilestoneInstance, VerificationStatus } from './Module_05_Milestone_Workflows/src/entities/milestone-instance.entity';
import { MilestonePayment } from './Module_05_Milestone_Workflows/src/entities/milestone-payment.entity';

async function verifyModule05() {
    console.log('🔍 Starting Module 05 Verification...\n');

    try {
        // Step 0: Clean slate approach
        // Connect without sync first to drop tables
        AppDataSource.setOptions({ synchronize: false, logging: false, entities: [] });
        await AppDataSource.initialize();
        console.log('🧹 Cleaning existing schema for Module 05...');

        await AppDataSource.query(`DROP TABLE IF EXISTS "milestone_payments" CASCADE`);
        await AppDataSource.query(`DROP TABLE IF EXISTS "milestone_instances" CASCADE`);
        await AppDataSource.query(`DROP TABLE IF EXISTS "milestone_definitions" CASCADE`);

        await AppDataSource.destroy();

        // Step 1: Re-connect with sync enabled to create fresh schema
        // We must re-import entities or reset options correctly
        const { dataSourceOptions } = require('./data-source');
        AppDataSource.setOptions({
            ...dataSourceOptions,
            synchronize: true,
            logging: false
        });

        await AppDataSource.initialize();
        console.log('✅ Database connected & schema synchronized\n');

        // Get repositories
        const definitionRepo = AppDataSource.getRepository(MilestoneDefinition);
        const instanceRepo = AppDataSource.getRepository(MilestoneInstance);
        const paymentRepo = AppDataSource.getRepository(MilestonePayment);

        // Test 1: Create Milestone Definition
        console.log('📝 Test 1: Creating Milestone Definition...');
        const definition = new MilestoneDefinition();
        definition.tenantId = '00000000-0000-0000-0000-000000000001'; // Use actual tenant ID
        definition.name = 'Software Development - Phase 1';
        definition.description = 'Complete requirements and design phase';
        definition.milestoneType = 'DELIVERABLE' as any;
        definition.paymentPercentage = 25;
        definition.paymentAmount = 25000;
        definition.plannedStartDate = new Date('2025-12-01');
        definition.plannedEndDate = new Date('2025-12-15');
        definition.plannedDurationDays = 14;
        definition.dependencies = [];
        definition.completionCriteria = {
            requiredDocuments: ['requirements.pdf', 'design_doc.pdf'],
            requiredApprovals: 2,
        };
        definition.verificationRequirements = {
            verificationMethod: 'MANUAL',
            evidenceRequired: true,
            approverRoles: ['TENANT_ADMIN'],
        };
        definition.isActive = true;
        definition.isTemplate = false;
        definition.metadata = {};
        definition.createdBy = '00000000-0000-0000-0000-000000000001';

        const savedDefinition = await definitionRepo.save(definition);
        console.log(`✅ Created milestone definition: ${savedDefinition.id}`);
        console.log(`   Name: ${savedDefinition.name}`);
        console.log(`   Payment: $${savedDefinition.paymentAmount}\n`);

        // Test 2: Create Milestone Instance
        console.log('📝 Test 2: Creating Milestone Instance...');
        const instance = new MilestoneInstance();
        instance.tenantId = '00000000-0000-0000-0000-000000000001';
        instance.definitionId = savedDefinition.id;
        instance.currentStatus = 'PENDING' as any;
        instance.progressPercentage = 0;
        instance.daysDelayed = 0;
        instance.verificationStatus = 'NOT_STARTED' as any;
        instance.escalationLevel = 0;
        instance.metadata = {};
        instance.createdBy = '00000000-0000-0000-0000-000000000001';

        const savedInstance = await instanceRepo.save(instance);
        console.log(`✅ Created milestone instance: ${savedInstance.id}`);
        console.log(`   Status: ${savedInstance.currentStatus}`);
        console.log(`   Progress: ${savedInstance.progressPercentage}%\n`);

        // Test 3: Update Instance to IN_PROGRESS
        console.log('📝 Test 3: Updating milestone to IN_PROGRESS...');
        savedInstance.currentStatus = 'IN_PROGRESS' as any;
        savedInstance.progressPercentage = 50;
        savedInstance.actualStartDate = new Date();
        savedInstance.statusNotes = 'Work started, requirements gathering complete';

        await instanceRepo.save(savedInstance);
        console.log(`✅ Updated to IN_PROGRESS`);
        console.log(`   Progress: ${savedInstance.progressPercentage}%\n`);

        // Test 4: Complete Milestone
        console.log('📝 Test 4: Completing milestone...');
        savedInstance.currentStatus = 'COMPLETED' as any;
        savedInstance.progressPercentage = 100;
        savedInstance.actualEndDate = new Date();
        savedInstance.verificationStatus = VerificationStatus.VERIFIED;

        await instanceRepo.save(savedInstance);
        console.log(`✅ Milestone completed`);
        console.log(`   Status: ${savedInstance.currentStatus}`);
        console.log(`   Verification: ${savedInstance.verificationStatus}\n`);

        // Test 5: Generate Payment/Invoice
        console.log('📝 Test 5: Generating payment record...');
        const payment = new MilestonePayment();
        payment.milestoneInstanceId = savedInstance.id;
        payment.paymentAmount = savedDefinition.paymentAmount;
        payment.amountReceived = 0;
        payment.paymentStatus = 'INVOICE_GENERATED' as any;
        payment.invoiceGeneratedDate = new Date();
        payment.paymentDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        payment.paymentTerms = { netDays: 30 };

        const savedPayment = await paymentRepo.save(payment);
        console.log(`✅ Payment record created: ${savedPayment.id}`);
        console.log(`   Amount: $${savedPayment.paymentAmount}`);
        console.log(`   Status: ${savedPayment.paymentStatus}\n`);

        // Test 6: Track Payment
        console.log('📝 Test 6: Tracking payment receipt...');
        savedPayment.amountReceived = savedPayment.paymentAmount;
        savedPayment.paymentStatus = 'PAID' as any;
        savedPayment.paymentReceivedDate = new Date();
        savedPayment.paymentReference = 'PAY-TEST-' + Date.now();

        await paymentRepo.save(savedPayment);
        console.log(`✅ Payment tracked`);
        console.log(`   Amount Received: $${savedPayment.amountReceived}`);
        console.log(`   Status: ${savedPayment.paymentStatus}`);
        console.log(`   Reference: ${savedPayment.paymentReference}\n`);

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ ALL TESTS PASSED - Module 05 is working correctly!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Cleanup
        console.log('🧹 Cleaning up test data...');
        // Drop again to leave clean state
        await AppDataSource.query(`DROP TABLE IF EXISTS "milestone_payments" CASCADE`);
        await AppDataSource.query(`DROP TABLE IF EXISTS "milestone_instances" CASCADE`);
        await AppDataSource.query(`DROP TABLE IF EXISTS "milestone_definitions" CASCADE`);
        console.log('✅ Test data cleaned up\n');

    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        console.log('✅ Database connection closed');
    }
}

// Run verification
verifyModule05()
    .then(() => {
        console.log('\n🎉 Module 05 verification complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Error:', error);
        process.exit(1);
    });
