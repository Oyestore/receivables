import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeFinanceService } from '../services/trade-finance.service';
import { LetterOfCredit } from '../entities/letter-of-credit.entity';
import { TestFixtures } from '../../test/fixtures';
import { createMockRepository } from '../../test/setup';

describe('TradeFinanceService', () => {
    let service: TradeFinanceService;
    let lcRepo: Partial<Repository<LetterOfCredit>>;

    beforeEach(async () => {
        lcRepo = createMockRepository<LetterOfCredit>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TradeFinanceService,
                {
                    provide: getRepositoryToken(LetterOfCredit),
                    useValue: lcRepo,
                },
            ],
        }).compile();

        service = module.get<TradeFinanceService>(TradeFinanceService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createLetterOfCredit', () => {
        it('should create LC successfully', async () => {
            const request = {
                applicantId: 'applicant-1',
                beneficiaryId: 'beneficiary-1',
                amount: 100000,
                currency: 'USD',
                issuingBank: 'Test Bank',
                advisingBank: 'Advising Bank',
                expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                terms: {},
            };

            const mockLC = TestFixtures.createMockLetterOfCredit({
                ...request,
                lcNumber: 'LC-001',
                status: 'draft',
            });

            (lcRepo.create as jest.Mock).mockReturnValue(mockLC);
            (lcRepo.save as jest.Mock).mockResolvedValue(mockLC);

            const result = await service.createLetterOfCredit(request, 'test-user');

            expect(result.lcNumber).toBeDefined();
            expect(result.status).toBe('draft');
            expect(result.amount).toBe(100000);
        });

        it('should generate unique LC number', async () => {
            const mockLC = TestFixtures.createMockLetterOfCredit();

            (lcRepo.create as jest.Mock).mockReturnValue(mockLC);
            (lcRepo.save as jest.Mock).mockResolvedValue(mockLC);

            const result = await service.createLetterOfCredit({
                applicantId: 'app',
                beneficiaryId: 'ben',
                amount: 50000,
                currency: 'USD',
                issuingBank: 'Bank',
                advisingBank: 'Bank2',
                expiryDate: new Date(),
                terms: {},
            }, 'user');

            expect(result.lcNumber).toMatch(/^LC-/);
        });
    });

    describe('issueLetterOfCredit', () => {
        it('should issue LC from draft status', async () => {
            const draftLC = TestFixtures.createMockLetterOfCredit({
                status: 'draft',
            });

            const issuedLC = {
                ...draftLC,
                status: 'issued',
                issueDate: new Date(),
            };

            (lcRepo.findOneBy as jest.Mock).mockResolvedValue(draftLC);
            (lcRepo.save as jest.Mock).mockResolvedValue(issuedLC);

            const result = await service.issueLetterOfCredit('1');

            expect(result.status).toBe('issued');
            expect(result.issueDate).toBeDefined();
        });

        it('should throw error if LC not in draft status', async () => {
            const issuedLC = TestFixtures.createMockLetterOfCredit({
                status: 'issued',
            });

            (lcRepo.findOneBy as jest.Mock).mockResolvedValue(issuedLC);

            await expect(service.issueLetterOfCredit('1')).rejects.toThrow();
        });
    });

    describe('utilizeLetterOfCredit', () => {
        it('should utilize LC successfully', async () => {
            const issuedLC = TestFixtures.createMockLetterOfCredit({
                status: 'issued',
                amount: 100000,
                utilizedAmount: 0,
                availableAmount: 100000,
            });

            const utilizedLC = {
                ...issuedLC,
                utilizedAmount: 50000,
                availableAmount: 50000,
            };

            (lcRepo.findOneBy as jest.Mock).mockResolvedValue(issuedLC);
            (lcRepo.save as jest.Mock).mockResolvedValue(utilizedLC);

            const result = await service.utilizeLetterOfCredit('1', 50000, []);

            expect(result.utilizedAmount).toBe(50000);
            expect(result.availableAmount).toBe(50000);
        });

        it('should throw error if utilization exceeds available amount', async () => {
            const issuedLC = TestFixtures.createMockLetterOfCredit({
                status: 'issued',
                availableAmount: 10000,
            });

            (lcRepo.findOneBy as jest.Mock).mockResolvedValue(issuedLC);

            await expect(service.utilizeLetterOfCredit('1', 20000, [])).rejects.toThrow();
        });

        it('should handle partial utilization', async () => {
            const issuedLC = TestFixtures.createMockLetterOfCredit({
                status: 'issued',
                amount: 100000,
                utilizedAmount: 30000,
                availableAmount: 70000,
            });

            const updatedLC = {
                ...issuedLC,
                utilizedAmount: 50000,
                availableAmount: 50000,
            };

            (lcRepo.findOneBy as jest.Mock).mockResolvedValue(issuedLC);
            (lcRepo.save as jest.Mock).mockResolvedValue(updatedLC);

            const result = await service.utilizeLetterOfCredit('1', 20000, []);

            expect(result.utilizedAmount).toBe(50000);
        });
    });

    describe('getExpiringLettersOfCredit', () => {
        it('should return LCs expiring within specified days', async () => {
            const expiringDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
            const mockExpiringLCs = [
                TestFixtures.createMockLetterOfCredit({
                    expiryDate: expiringDate,
                    status: 'issued',
                }),
            ];

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockExpiringLCs),
            };

            (lcRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            const result = await service.getExpiringLettersOfCredit(30);

            expect(result).toHaveLength(1);
        });
    });

    describe('getLCById', () => {
        it('should return LC by ID', async () => {
            const mockLC = TestFixtures.createMockLetterOfCredit();

            (lcRepo.findOneBy as jest.Mock).mockResolvedValue(mockLC);

            const result = await service.getLCById('1');

            expect(result).toEqual(mockLC);
        });

        it('should throw error if LC not found', async () => {
            (lcRepo.findOneBy as jest.Mock).mockResolvedValue(null);

            await expect(service.getLCById('999')).rejects.toThrow();
        });
    });
});
