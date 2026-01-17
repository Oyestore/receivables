import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceService } from '../services/compliance.service';
import { TradeCompliance } from '../entities/trade-compliance.entity';
import { TestFixtures } from '../../test/fixtures';
import { createMockRepository } from '../../test/setup';

describe('ComplianceService', () => {
    let service: ComplianceService;
    let complianceRepo: Partial<Repository<TradeCompliance>>;

    beforeEach(async () => {
        complianceRepo = createMockRepository<TradeCompliance>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ComplianceService,
                {
                    provide: getRepositoryToken(TradeCompliance),
                    useValue: complianceRepo,
                },
            ],
        }).compile();

        service = module.get<ComplianceService>(ComplianceService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createComplianceCheck', () => {
        it('should create compliance check successfully', async () => {
            const request = {
                transactionId: 'TXN-001',
                buyerCountry: 'AE',
                sellerCountry: 'US',
                goodsDescription: 'Electronics',
                hsCode: '123456',
            };

            const mockCompliance = TestFixtures.createMockTradeCompliance({
                ...request,
                checkStatus: 'pending',
            });

            (complianceRepo.create as jest.Mock).mockReturnValue(mockCompliance);
            (complianceRepo.save as jest.Mock).mockResolvedValue(mockCompliance);

            const result = await service.createComplianceCheck(request);

            expect(result.transactionId).toBe('TXN-001');
            expect(result.checkStatus).toBe('pending');
        });
    });

    describe('performComplianceCheck', () => {
        it('should perform all compliance checks and approve', async () => {
            const pendingCheck = TestFixtures.createMockTradeCompliance({
                checkStatus: 'pending',
                buyerCountry: 'AE',
                sellerCountry: 'US',
            });

            const approvedCheck = {
                ...pendingCheck,
                checkStatus: 'approved',
                sanctionsCheck: { passed: true },
                amlCheck: { passed: true },
                vatCompliance: { passed: true },
                restrictionsCheck: { passed: true },
                riskScore: 10,
                approvedAt: new Date(),
            };

            (complianceRepo.findOneBy as jest.Mock).mockResolvedValue(pendingCheck);
            (complianceRepo.save as jest.Mock).mockResolvedValue(approvedCheck);

            const result = await service.performComplianceCheck('1');

            expect(result.checkStatus).toBe('approved');
            expect(result.sanctionsCheck).toBeDefined();
            expect(result.amlCheck).toBeDefined();
            expect(result.approvedAt).toBeDefined();
        });

        it('should reject if sanctions check fails', async () => {
            const pendingCheck = TestFixtures.createMockTradeCompliance({
                checkStatus: 'pending',
                buyerCountry: 'XX', // Sanctioned country
                sellerCountry: 'US',
            });

            const rejectedCheck = {
                ...pendingCheck,
                checkStatus: 'rejected',
                sanctionsCheck: { passed: false, reason: 'Sanctioned country' },
                rejectedAt: new Date(),
                rejectionReason: 'Sanctions violation',
            };

            (complianceRepo.findOneBy as jest.Mock).mockResolvedValue(pendingCheck);
            (complianceRepo.save as jest.Mock).mockResolvedValue(rejectedCheck);

            const result = await service.performComplianceCheck('1');

            expect(result.checkStatus).toBe('rejected');
            expect(result.rejectionReason).toBeDefined();
        });
    });

    describe('checkUAEVATCompliance', () => {
        it('should pass VAT compliance for UAE transactions above threshold', async () => {
            const result = await service.checkUAEVATCompliance(
                'AE',
                'US',
                400000, // Above AED 375,000 threshold
                'AED'
            );

            expect(result.passed).toBe(true);
            expect(result.requiresVATRegistration).toBe(true);
        });

        it('should not require VAT for amounts below threshold', async () => {
            const result = await service.checkUAEVATCompliance(
                'AE',
                'US',
                300000, // Below threshold
                'AED'
            );

            expect(result.requiresVATRegistration).toBe(false);
        });

        it('should handle non-AED currencies', async () => {
            const result = await service.checkUAEVATCompliance(
                'AE',
                'US',
                100000,
                'USD'
            );

            expect(result.passed).toBeDefined();
            expect(result.currency).toBe('USD');
        });
    });

    describe('checkSanctions', () => {
        it('should pass for non-sanctioned countries', async () => {
            const result = await service.checkSanctions('AE', 'US');

            expect(result.passed).toBe(true);
        });

        it('should fail for sanctioned countries', async () => {
            const result = await service.checkSanctions('XX', 'US');

            expect(result.passed).toBe(false);
            expect(result.reason).toBeDefined();
        });
    });

    describe('getPendingChecks', () => {
        it('should return all pending checks', async () => {
            const mockPending = [
                TestFixtures.createMockTradeCompliance({ checkStatus: 'pending' }),
                TestFixtures.createMockTradeCompliance({ checkStatus: 'pending' }),
            ];

            (complianceRepo.find as jest.Mock).mockResolvedValue(mockPending);

            const result = await service.getPendingChecks();

            expect(result).toHaveLength(2);
            expect(result[0].checkStatus).toBe('pending');
        });
    });

    describe('getComplianceAnalytics', () => {
        it('should return compliance analytics', async () => {
            const mockChecks = [
                TestFixtures.createMockTradeCompliance({ checkStatus: 'approved' }),
                TestFixtures.createMockTradeCompliance({ checkStatus: 'rejected' }),
                TestFixtures.createMockTradeCompliance({ checkStatus: 'pending' }),
            ];

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockChecks),
            };

            (complianceRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            const result = await service.getComplianceAnalytics();

            expect(result).toBeDefined();
            expect(result.totalChecks).toBe(3);
        });
    });
});
