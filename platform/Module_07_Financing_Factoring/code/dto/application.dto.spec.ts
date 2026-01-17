import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
    CreateApplicationDto,
    SubmitApplicationDto,
    ApplicationQueryDto,
    CompareOffersDto,
    FinancingPurpose,
} from '../dto/application.dto';

describe('Application DTOs Validation', () => {
    describe('CreateApplicationDto', () => {
        it('should pass validation with valid data', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: 'invoice_financing',
                requestedAmount: 500000,
                urgency: 'flexible',
                businessDetails: {
                    businessName: 'Test Corp',
                    businessPan: 'ABCDE1234F',
                    annualRevenue: 10000000,
                    yearsInBusiness: 3,
                    industry: 'Technology',
                },
                preferences: {},
            });

            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('should fail when requestedAmount is missing', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: 'invoice_financing',
                urgency: 'flexible',
                businessDetails: {},
            });

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            const amountError = errors.find(e => e.property === 'requestedAmount');
            expect(amountError).toBeDefined();
        });

        it('should fail when requestedAmount is negative', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: 'invoice_financing',
                requestedAmount: -100000,
                urgency: 'flexible',
                businessDetails: {},
            });

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail when requestedAmount is zero', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: 'invoice_financing',
                requestedAmount: 0,
                urgency: 'flexible',
                businessDetails: {},
            });

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should validate enum for financingType', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: 'invalid_type',
                requestedAmount: 500000,
                urgency: 'flexible',
                businessDetails: {},
            });

            const errors = await validate(dto);

            const typeError = errors.find(e => e.property === 'financingType');
            expect(typeError).toBeDefined();
        });

        it('should validate nested businessDetails', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: 'invoice_financing',
                requestedAmount: 500000,
                urgency: 'flexible',
                businessDetails: {
                    // Missing required fields
                    businessName: '',
                },
            });

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should accept valid invoice IDs', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: 'invoice_financing',
                requestedAmount: 500000,
                urgency: 'flexible',
                businessDetails: {
                    businessName: 'Test Corp',
                    businessPan: 'ABCDE1234F',
                },
                invoiceIds: ['inv-1', 'inv-2', 'inv-3'],
            });

            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('should handle large requested amounts', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: 'working_capital',
                requestedAmount: 100000000, // ₹10 Cr
                urgency: 'flexible',
                businessDetails: {
                    businessName: 'Large Corp',
                    businessPan: 'ABCDE1234F',
                },
            });

            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });
    });

    describe('SubmitApplicationDto', () => {
        it('should pass validation with valid data', async () => {
            const dto = plainToInstance(SubmitApplicationDto, {
                partnerIds: ['lendingkart', 'capital_float'],
                mode: 'auction',
            });

            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('should fail when partnerIds is empty', async () => {
            const dto = plainToInstance(SubmitApplicationDto, {
                partnerIds: [],
                mode: 'single',
            });

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            const partnerError = errors.find(e => e.property === 'partnerIds');
            expect(partnerError).toBeDefined();
        });

        it('should fail when partnerIds is missing', async () => {
            const dto = plainToInstance(SubmitApplicationDto, {
                mode: 'single',
            });

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should accept single partner', async () => {
            const dto = plainToInstance(SubmitApplicationDto, {
                partnerIds: ['lendingkart'],
                mode: 'single',
            });

            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('should validate mode enum', async () => {
            const dto = plainToInstance(SubmitApplicationDto, {
                partnerIds: ['lendingkart'],
                mode: 'invalid_mode',
            });

            const errors = await validate(dto);

            const modeError = errors.find(e => e.property === 'mode');
            expect(modeError).toBeDefined();
        });
    });

    describe('ApplicationQueryDto', () => {
        it('should pass validation with valid filters', async () => {
            const dto = plainToInstance(ApplicationQueryDto, {
                status: 'approved',
                financingType: 'invoice_financing',
                page: 1,
                limit: 20,
            });

            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('should handle date filters', async () => {
            const dto = plainToInstance(ApplicationQueryDto, {
                dateFrom: new Date('2026-01-01'),
                dateTo: new Date('2026-01-31'),
            });

            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('should fail on invalid page number', async () => {
            const dto = plainToInstance(ApplicationQueryDto, {
                page: 0, // Should be >= 1
                limit: 20,
            });

            const errors = await validate(dto);

            const pageError = errors.find(e => e.property === 'page');
            expect(pageError).toBeDefined();
        });

        it('should fail on invalid limit', async () => {
            const dto = plainToInstance(ApplicationQueryDto, {
                page: 1,
                limit: 0, // Should be >= 1
            });

            const errors = await validate(dto);

            const limitError = errors.find(e => e.property === 'limit');
            expect(limitError).toBeDefined();
        });

        it('should enforce maximum limit', async () => {
            const dto = plainToInstance(ApplicationQueryDto, {
                page: 1,
                limit: 1000, // Too high
            });

            const errors = await validate(dto);

            const limitError = errors.find(e => e.property === 'limit');
            expect(limitError).toBeDefined();
        });
    });

    describe('CompareOffersDto', () => {
        it('should pass validation with valid data', async () => {
            const dto = plainToInstance(CompareOffersDto, {
                requestedAmount: 500000,
                urgency: 'flexible',
                prioritize: 'lowest_rate',
                partnerIds: ['lendingkart', 'capital_float'],
            });

            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('should fail when requestedAmount is missing', async () => {
            const dto = plainToInstance(CompareOffersDto, {
                urgency: 'flexible',
            });

            const errors = await validate(dto);

            const amountError = errors.find(e => e.property === 'requestedAmount');
            expect(amountError).toBeDefined();
        });

        it('should validate urgency enum', async () => {
            const dto = plainToInstance(CompareOffersDto, {
                requestedAmount: 500000,
                urgency: 'invalid_urgency',
            });

            const errors = await validate(dto);

            const urgencyError = errors.find(e => e.property === 'urgency');
            expect(urgencyError).toBeDefined();
        });

        it('should validate prioritize enum', async () => {
            const dto = plainToInstance(CompareOffersDto, {
                requestedAmount: 500000,
                urgency: 'flexible',
                prioritize: 'invalid_priority',
            });

            const errors = await validate(dto);

            const priorityError = errors.find(e => e.property === 'prioritize');
            expect(priorityError).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty strings', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: '',
                requestedAmount: 500000,
                urgency: 'flexible',
                businessDetails: {
                    businessName: '',
                },
            });

            const errors = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
        });

        it('should handle special characters in business name', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: 'invoice_financing',
                requestedAmount: 500000,
                urgency: 'flexible',
                businessDetails: {
                    businessName: 'Test Corp & Co. (Pvt.) Ltd.',
                    businessPan: 'ABCDE1234F',
                },
            });

            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('should handle very long arrays', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: 'invoice_financing',
                requestedAmount: 500000,
                urgency: 'flexible',
                businessDetails: {
                    businessName: 'Test',
                    businessPan: 'ABCDE1234F',
                },
                invoiceIds: Array(1000).fill('inv-'),
            });

            const errors = await validate(dto);

            // Should allow large arrays
            expect(errors).toHaveLength(0);
        });

        it('should handle decimal amounts', async () => {
            const dto = plainToInstance(CreateApplicationDto, {
                financingType: 'invoice_financing',
                requestedAmount: 500000.50,
                urgency: 'flexible',
                businessDetails: {
                    businessName: 'Test',
                    businessPan: 'ABCDE1234F',
                },
            });

            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });
    });
});
