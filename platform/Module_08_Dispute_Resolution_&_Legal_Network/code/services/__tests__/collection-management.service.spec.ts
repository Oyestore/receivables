import { Test, TestingModule } from '@nestjs/testing';
import { CollectionManagementService } from '../collection-management.service';
import { CollectionSequenceService } from '../collection-sequence.service';
import { InvoiceService } from '../../../Module_01_Smart_Invoice_Generation/src/services/invoice.service';
import { NotificationService } from '../../../Module_11_Common/src/services/notification.service';
import { PaymentService } from '../../../Module_03_Payment_Integration/src/services/payment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CollectionCase, CollectionStatus } from '../../entities/collection-case.entity';
import { DisputeCase } from '../../entities/dispute-case.entity';

describe('CollectionManagementService', () => {
    let service: CollectionManagementService;

    const mockCollectionRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        count: jest.fn(),
        find: jest.fn(),
    };

    const mockDisputeRepo = {
        findOne: jest.fn(),
    };

    const mockSequenceService = {
        startSequence: jest.fn(),
        cancelSequence: jest.fn(),
    };

    const mockNotificationService = {
        sendTemplatedEmail: jest.fn(),
    };

    const mockInvoiceService = {
        findOne: jest.fn(),
    };

    const mockPaymentService = {
        recordOfflinePayment: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CollectionManagementService,
                { provide: getRepositoryToken(CollectionCase), useValue: mockCollectionRepo },
                { provide: getRepositoryToken(DisputeCase), useValue: mockDisputeRepo },
                { provide: CollectionSequenceService, useValue: mockSequenceService },
                { provide: NotificationService, useValue: mockNotificationService },
                { provide: InvoiceService, useValue: mockInvoiceService },
                { provide: PaymentService, useValue: mockPaymentService },
            ],
        }).compile();

        service = module.get<CollectionManagementService>(CollectionManagementService);
    });

    describe('createCase', () => {
        it('should create a collection case and start sequence', async () => {
            const dto = {
                tenantId: 't1',
                customerId: 'c1',
                customerName: 'Cust A',
                invoiceId: 'inv1',
                outstandingAmount: 1000,
                originalAmount: 1000,
                strategy: 'friendly' as any,
                createdBy: 'user1'
            };

            mockCollectionRepo.count.mockResolvedValue(0);
            mockInvoiceService.findOne.mockResolvedValue({ dueDate: new Date() });
            mockCollectionRepo.create.mockReturnValue({ ...dto, id: 'case1', caseNumber: 'COL-1' });
            mockCollectionRepo.save.mockImplementation(c => Promise.resolve(c));

            const result = await service.createCase(dto);

            expect(result.id).toBe('case1');
            expect(mockSequenceService.startSequence).toHaveBeenCalled();
        });
    });

    describe('recordPayment', () => {
        it('should update recovered amount and close if full payment', async () => {
            const existingCase = {
                id: 'case1',
                tenantId: 't1',
                outstandingAmount: 1000,
                recoveredAmount: 0,
                status: CollectionStatus.IN_PROGRESS,
                invoiceId: 'inv1'
            };

            mockCollectionRepo.findOne.mockResolvedValue(existingCase);
            mockCollectionRepo.save.mockImplementation(c => Promise.resolve(c));

            await service.recordPayment('case1', 't1', 1000, 'cash', 'user1');

            expect(existingCase.status).toBe(CollectionStatus.PAID);
            expect(mockPaymentService.recordOfflinePayment).toHaveBeenCalled();
        });

        it('should keep open if partial payment', async () => {
            const existingCase = {
                id: 'case1',
                tenantId: 't1',
                outstandingAmount: 1000,
                recoveredAmount: 0,
                status: CollectionStatus.IN_PROGRESS,
                invoiceId: 'inv1'
            };

            mockCollectionRepo.findOne.mockResolvedValue(existingCase);
            mockCollectionRepo.save.mockImplementation(c => Promise.resolve(c));

            await service.recordPayment('case1', 't1', 500, 'cash', 'user1');

            expect(existingCase.status).toBe(CollectionStatus.IN_PROGRESS);
            expect(existingCase.recoveredAmount).toBe(500);
        });
    });
});
