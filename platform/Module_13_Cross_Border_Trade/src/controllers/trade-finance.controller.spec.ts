import { Test, TestingModule } from '@nestjs/testing';
import { TradeFinanceController } from '../controllers/trade-finance.controller';
import { TradeFinanceService } from '../services/trade-finance.service';
import { TestFixtures } from '../../test/fixtures';

describe('TradeFinanceController', () => {
    let controller: TradeFinanceController;
    let tradeFinanceService: Partial<TradeFinanceService>;

    beforeEach(async () => {
        tradeFinanceService = {
            createLetterOfCredit: jest.fn(),
            issueLetterOfCredit: jest.fn(),
            utilizeLetterOfCredit: jest.fn(),
            getExpiringLettersOfCredit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [TradeFinanceController],
            providers: [{ provide: TradeFinanceService, useValue: tradeFinanceService }],
        }).compile();

        controller = module.get<TradeFinanceController>(TradeFinanceController);
    });

    describe('POST /trade-finance/letter-of-credit', () => {
        it('should create letter of credit', async () => {
            const mockLC = TestFixtures.createMockLetterOfCredit({ status: 'draft' });
            (tradeFinanceService.createLetterOfCredit as jest.Mock).mockResolvedValue(mockLC);

            const result = await controller.createLetterOfCredit(
                {
                    applicantId: 'app',
                    beneficiaryId: 'ben',
                    amount: 100000,
                    currency: 'USD',
                    issuingBank: 'Bank',
                    advisingBank: 'Bank2',
                    expiryDate: new Date(),
                    terms: {},
                },
                { user: { id: 'user-1' } } as any
            );

            expect(result.status).toBe('draft');
        });
    });

    describe('POST /trade-finance/letter-of-credit/:id/issue', () => {
        it('should issue letter of credit', async () => {
            const mockLC = TestFixtures.createMockLetterOfCredit({ status: 'issued' });
            (tradeFinanceService.issueLetterOfCredit as jest.Mock).mockResolvedValue(mockLC);

            const result = await controller.issueLetterOfCredit('1');

            expect(result.status).toBe('issued');
        });
    });

    describe('POST /trade-finance/letter-of-credit/:id/utilize', () => {
        it('should utilize letter of credit', async () => {
            const mockLC = TestFixtures.createMockLetterOfCredit({ utilizedAmount: 50000 });
            (tradeFinanceService.utilizeLetterOfCredit as jest.Mock).mockResolvedValue(mockLC);

            const result = await controller.utilizeLetterOfCredit('1', { amount: 50000, documents: [] });

            expect(result.utilizedAmount).toBe(50000);
        });
    });

    describe('GET /trade-finance/letter-of-credit/expiring', () => {
        it('should get expiring letters of credit', async () => {
            const mockExpiring = [TestFixtures.createMockLetterOfCredit()];
            (tradeFinanceService.getExpiringLettersOfCredit as jest.Mock).mockResolvedValue(mockExpiring);

            const result = await controller.getExpiringLCs({ days: 30 });

            expect(result).toHaveLength(1);
        });
    });
});
