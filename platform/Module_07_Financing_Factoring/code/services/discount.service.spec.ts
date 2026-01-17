import { Test, TestingModule } from '@nestjs/testing';
import { DiscountService } from './discount.service';
import { InvoiceService } from '../../../Module_01_Invoice_Management/src/services/invoice.service';
import { PaymentProcessingService } from '../../../Module_03_Payment_Integration/src/services/payment-processing.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DiscountOffer } from '../entities/discount-offer.entity';
import { Invoice } from '../../../Module_01_Invoice_Management/src/entities/invoice.entity';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

describe('DiscountService', () => {
    let service: DiscountService;
    let discountRepo: Repository<DiscountOffer>;
    let invoiceRepo: Repository<Invoice>;
    let invoiceService: InvoiceService;
    let paymentService: PaymentProcessingService;

    const mockDiscountRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
    };

    const mockInvoiceRepo = {
        findOne: jest.fn(),
    };

    const mockInvoiceService = {
        applyEarlyPaymentDiscount: jest.fn(),
    };

    const mockPaymentService = {
        initiatePayment: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DiscountService,
                {
                    provide: getRepositoryToken(DiscountOffer),
                    useValue: mockDiscountRepo,
                },
                {
                    provide: getRepositoryToken(Invoice),
                    useValue: mockInvoiceRepo,
                },
                {
                    provide: InvoiceService,
                    useValue: mockInvoiceService,
                },
                {
                    provide: PaymentProcessingService,
                    useValue: mockPaymentService,
                },
            ],
        }).compile();

        service = module.get<DiscountService>(DiscountService);
        discountRepo = module.get<Repository<DiscountOffer>>(getRepositoryToken(DiscountOffer));
        invoiceRepo = module.get<Repository<Invoice>>(getRepositoryToken(Invoice));
        invoiceService = module.get<InvoiceService>(InvoiceService);
        paymentService = module.get<PaymentProcessingService>(PaymentProcessingService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createOffer', () => {
        it('should create an offer if invoice is eligible', async () => {
            const invoiceId = 'inv-1';
            const grandTotal = 10000;
            const today = new Date();
            const dueDate = new Date();
            dueDate.setDate(today.getDate() + 10); // 10 days early

            mockInvoiceRepo.findOne.mockResolvedValue({
                id: invoiceId,
                grandTotal: grandTotal,
                dueDate: dueDate,
                customerId: 'cust-1',
                tenantId: 'org-1'
            });

            const offer = new DiscountOffer();
            mockDiscountRepo.create.mockReturnValue(offer);
            mockDiscountRepo.save.mockResolvedValue(offer);

            const result = await service.createOffer(invoiceId, 18); // 18% APR

            expect(mockDiscountRepo.create).toHaveBeenCalled();
            // Calculations:
            // Discount = (10000 * 0.18 * 10) / 365 = 49.31
            // Expect repo create to be called with calculated values
            const createCall = mockDiscountRepo.create.mock.calls[0][0];
            expect(createCall.discountedAmount).toBeLessThan(10000);
            expect(result).toBe(offer);
        });

        it('should throw error if invoice overdue', async () => {
            const invoiceId = 'inv-overdue';
            const today = new Date();
            const dueDate = new Date();
            dueDate.setDate(today.getDate() - 1); // 1 day late

            mockInvoiceRepo.findOne.mockResolvedValue({
                id: invoiceId,
                dueDate: dueDate,
            });

            await expect(service.createOffer(invoiceId, 18)).rejects.toThrow(BadRequestException);
        });
    });

    describe('acceptOffer', () => {
        it('should accept offer and trigger invoice/payment update', async () => {
            const offerId = 'offer-1';
            const offer = {
                id: offerId,
                status: 'OFFERED',
                invoiceId: 'inv-1',
                originalAmount: 10000,
                discountedAmount: 9500,
                buyerId: 'buyer-1'
            };

            mockDiscountRepo.findOne.mockResolvedValue(offer);
            mockDiscountRepo.save.mockImplementation(o => Promise.resolve(o));
            mockInvoiceService.applyEarlyPaymentDiscount.mockResolvedValue(true);
            mockPaymentService.initiatePayment.mockResolvedValue(true);

            await service.acceptOffer(offerId);

            expect(mockInvoiceService.applyEarlyPaymentDiscount).toHaveBeenCalledWith(
                'inv-1',
                500,
                expect.stringContaining('Early Payment Discount')
            );
            expect(mockPaymentService.initiatePayment).toHaveBeenCalled();
            expect(offer.status).toBe('ACCEPTED');
        });
    });
});
