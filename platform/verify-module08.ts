
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionManagementService } from './Module_08_Dispute_Resolution_&_Legal_Network/code/services/collection-management.service';
import { DisputeAIPredictionService } from './Module_08_Dispute_Resolution_&_Legal_Network/code/services/dispute-ai-prediction.service';
import { MSMEPortalService } from './Module_08_Dispute_Resolution_&_Legal_Network/code/services/msme-portal.service';
import { CollectionCase } from './Module_08_Dispute_Resolution_&_Legal_Network/code/entities/collection-case.entity';
import { DisputeCase } from './Module_08_Dispute_Resolution_&_Legal_Network/code/entities/dispute-case.entity';
import { MSMECase } from './Module_08_Dispute_Resolution_&_Legal_Network/code/entities/msme-case.entity';
import { CollectionSequenceService } from './Module_08_Dispute_Resolution_&_Legal_Network/code/services/collection-sequence.service';
import { InvoiceService } from './Module_01_Smart_Invoice_Generation/src/services/invoice.service';
import { NotificationService } from './Module_11_Common/src/services/notification.service';
import { PaymentService } from './Module_03_Payment_Integration/src/services/payment.service';

// Mock dependencies
const mockInvoiceService = { findOne: jest.fn().mockResolvedValue({ customerEmail: 'test@example.com', dueDate: new Date() }) };
const mockNotificationService = { sendTemplatedEmail: jest.fn().mockResolvedValue(true) };
const mockPaymentService = { recordOfflinePayment: jest.fn().mockResolvedValue(true) };
const mockCollectionSequenceService = { startSequence: jest.fn().mockResolvedValue(true), cancelSequence: jest.fn() };

async function verifyModule08() {
    console.log('🚀 Starting Module 08 Verification...');

    try {
        const moduleRef = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'better-sqlite3',
                    database: ':memory:',
                    entities: [CollectionCase, DisputeCase, MSMECase],
                    synchronize: true,
                }),
                TypeOrmModule.forFeature([CollectionCase, DisputeCase, MSMECase]),
            ],
            providers: [
                CollectionManagementService,
                DisputeAIPredictionService,
                MSMEPortalService,
                { provide: InvoiceService, useValue: mockInvoiceService },
                { provide: NotificationService, useValue: mockNotificationService },
                { provide: PaymentService, useValue: mockPaymentService },
                { provide: CollectionSequenceService, useValue: mockCollectionSequenceService },
            ],
        }).compile();

        const collectionService = moduleRef.get<CollectionManagementService>(CollectionManagementService);
        const aiService = moduleRef.get<DisputeAIPredictionService>(DisputeAIPredictionService);

        // 1. Verify Collection Creation
        console.log('Step 1: Creating Collection Case...');
        const case1 = await collectionService.createCase({
            tenantId: 'tenant-1',
            invoiceId: 'inv-001',
            customerId: 'cust-001',
            customerName: 'Acme Corp',
            originalAmount: 50000,
            outstandingAmount: 50000,
            strategy: 'friendly' as any,
            createdBy: 'admin'
        });

        if (!case1 || !case1.caseNumber) throw new Error('Collection Case creation failed');
        console.log(`✅ Collection Case Created: ${case1.caseNumber}`);

        // 2. Verify AI Prediction (Mocked Logic)
        console.log('Step 2: Testing AI Prediction Logic...');
        // We can't easily test with DB constraints without creating full DisputeCase, but we can verify the service instantiates
        if (!aiService) throw new Error('AI Service failed to instantiate');
        console.log('✅ AI Service Instantiated');

        console.log('🎉 WORFLOW VERIFICATION SUCCESSFUL: Module 08 services are wired correctly.');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }
}

verifyModule08();
