import { validate } from 'class-validator';
import { CreateEscrowTransactionDto } from '../dto/create-escrow-transaction.dto';
import { CreateShippingOrderDto } from '../dto/create-shipping-order.dto';
import { CreateLetterOfCreditDto } from '../dto/create-letter-of-credit.dto';
import { ForexRateDto } from '../dto/forex-rate.dto';

describe('DTO Validation Tests', () => {
    describe('CreateEscrowTransactionDto', () => {
        it('should pass validation with valid data', async () => {
            const dto = new CreateEscrowTransactionDto();
            dto.transactionId = 'TXN-001';
            dto.escrowType = 'trade' as any;
            dto.amount = 10000;
            dto.currency = 'USD';
            dto.buyerId = 'buyer-1';
            dto.sellerId = 'seller-1';

            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail validation with missing required fields', async () => {
            const dto = new CreateEscrowTransactionDto();

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation with invalid amount', async () => {
            const dto = new CreateEscrowTransactionDto();
            dto.transactionId = 'TXN-001';
            dto.escrowType = 'trade' as any;
            dto.amount = -1000; // Negative
            dto.currency = 'USD';
            dto.buyerId = 'buyer-1';
            dto.sellerId = 'seller-1';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation with invalid currency', async () => {
            const dto = new CreateEscrowTransactionDto();
            dto.transactionId = 'TXN-001';
            dto.escrowType = 'trade' as any;
            dto.amount = 10000;
            dto.currency = 'INVALID';
            dto.buyerId = 'buyer-1';
            dto.sellerId = 'seller-1';

            const errors = await validate(dto);
            expect(errors.some(e => e.property === 'currency')).toBe(true);
        });
    });

    describe('CreateShippingOrderDto', () => {
        it('should pass validation with valid data', async () => {
            const dto = new CreateShippingOrderDto();
            dto.carrier = 'DHL';
            dto.origin = 'Dubai, UAE';
            dto.destination = 'New York, USA';
            dto.packageDetails = { weight: 10 };
            dto.estimatedDelivery = new Date();

            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail validation with missing required fields', async () => {
            const dto = new CreateShippingOrderDto();

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail validation with invalid carrier', async () => {
            const dto = new CreateShippingOrderDto();
            dto.carrier = ''; // Empty string
            dto.origin = 'Dubai';
            dto.destination = 'NYC';
            dto.packageDetails = {};
            dto.estimatedDelivery = new Date();

            const errors = await validate(dto);
            expect(errors.some(e => e.property === 'carrier')).toBe(true);
        });
    });

    describe('CreateLetterOfCreditDto', () => {
        it('should pass validation with valid data', async () => {
            const dto = new CreateLetterOfCreditDto();
            dto.applicantId = 'app-1';
            dto.beneficiaryId = 'ben-1';
            dto.amount = 100000;
            dto.currency = 'USD';
            dto.issuingBank = 'Test Bank';
            dto.advisingBank = 'Advising Bank';
            dto.expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
            dto.terms = {};

            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail validation with past expiry date', async () => {
            const dto = new CreateLetterOfCreditDto();
            dto.applicantId = 'app-1';
            dto.beneficiaryId = 'ben-1';
            dto.amount = 100000;
            dto.currency = 'USD';
            dto.issuingBank = 'Bank';
            dto.advisingBank = 'Bank2';
            dto.expiryDate = new Date(Date.now() - 1000); // Past date
            dto.terms = {};

            const errors = await validate(dto);
            expect(errors.some(e => e.property === 'expiryDate')).toBe(true);
        });

        it('should fail validation with negative amount', async () => {
            const dto = new CreateLetterOfCreditDto();
            dto.applicantId = 'app-1';
            dto.beneficiaryId = 'ben-1';
            dto.amount = -1000;
            dto.currency = 'USD';
            dto.issuingBank = 'Bank';
            dto.advisingBank = 'Bank2';
            dto.expiryDate = new Date();
            dto.terms = {};

            const errors = await validate(dto);
            expect(errors.some(e => e.property === 'amount')).toBe(true);
        });
    });

    describe('ForexRateDto', () => {
        it('should pass validation with valid data', async () => {
            const dto = new ForexRateDto();
            dto.currencyPair = 'USD/AED' as any;
            dto.rate = 3.67;

            const errors = await validate(dto);
            expect(errors.length).toBe(0);
        });

        it('should fail validation with invalid rate', async () => {
            const dto = new ForexRateDto();
            dto.currencyPair = 'USD/AED' as any;
            dto.rate = -1; // Negative rate

            const errors = await validate(dto);
            expect(errors.some(e => e.property === 'rate')).toBe(true);
        });

        it('should fail validation with missing currency pair', async () => {
            const dto = new ForexRateDto();
            dto.rate = 3.67;

            const errors = await validate(dto);
            expect(errors.some(e => e.property === 'currencyPair')).toBe(true);
        });
    });
});
