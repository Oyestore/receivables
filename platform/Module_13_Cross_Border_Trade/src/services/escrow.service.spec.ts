import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EscrowService } from '../services/escrow.service';
import { EscrowTransaction, EscrowStatus, EscrowType } from '../entities/escrow-transaction.entity';
import { TestFixtures } from '../../test/fixtures';
import { createMockRepository } from '../../test/setup';

describe('EscrowService', () => {
    let service: EscrowService;
    let escrowRepo: Partial<Repository<EscrowTransaction>>;
    let dataSource: Partial<DataSource>;

    beforeEach(async () => {
        escrowRepo = createMockRepository<EscrowTransaction>();
        dataSource = {
            createQueryRunner: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EscrowService,
                {
                    provide: getRepositoryToken(EscrowTransaction),
                    useValue: escrowRepo,
                },
                {
                    provide: DataSource,
                    useValue: dataSource,
                },
            ],
        }).compile();

        service = module.get<EscrowService>(EscrowService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createEscrow', () => {
        it('should create escrow transaction successfully', async () => {
            const request = TestFixtures.createMockEscrowRequest();
            const mockEscrow = TestFixtures.createMockEscrowTransaction({
                transactionId: request.transactionId,
                amount: request.amount,
            });

            (escrowRepo.create as jest.Mock).mockReturnValue(mockEscrow);
            (escrowRepo.save as jest.Mock).mockResolvedValue(mockEscrow);

            const result = await service.createEscrow(request, 'test-user');

            expect(result.transactionId).toBe(request.transactionId);
            expect(result.amount).toBe(request.amount);
            expect(result.status).toBe(EscrowStatus.CREATED);
            expect(escrowRepo.save).toHaveBeenCalled();
        });

        it('should set blockchain hash when smart contract address provided', async () => {
            const request = {
                ...TestFixtures.createMockEscrowRequest(),
                smartContractAddress: '0x123456',
            };

            const mockEscrow = TestFixtures.createMockEscrowTransaction();

            (escrowRepo.create as jest.Mock).mockReturnValue(mockEscrow);
            (escrowRepo.save as jest.Mock).mockResolvedValue(mockEscrow);

            const result = await service.createEscrow(request, 'test-user');

            expect(result.smartContractAddress).toBeDefined();
        });

        it('should throw error for negative amount', async () => {
            const request = {
                ...TestFixtures.createMockEscrowRequest(),
                amount: -1000,
            };

            await expect(service.createEscrow(request, 'test-user')).rejects.toThrow();
        });
    });

    describe('fundEscrow', () => {
        it('should fund escrow successfully', async () => {
            const mockEscrow = TestFixtures.createMockEscrowTransaction({
                status: EscrowStatus.CREATED,
            });

            const fundedEscrow = {
                ...mockEscrow,
                status: EscrowStatus.FUNDED,
                fundedAt: new Date(),
            };

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(mockEscrow);
            (escrowRepo.save as jest.Mock).mockResolvedValue(fundedEscrow);

            const result = await service.fundEscrow({
                escrowId: '1',
                blockchainHash: '0xabcdef',
            });

            expect(result.status).toBe(EscrowStatus.FUNDED);
            expect(result.fundedAt).toBeDefined();
            expect(result.blockchainHash).toBe('0xabcdef');
        });

        it('should throw error if escrow not found', async () => {
            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(null);

            await expect(service.fundEscrow({ escrowId: '999' })).rejects.toThrow();
        });

        it('should throw error if escrow already funded', async () => {
            const fundedEscrow = TestFixtures.createMockEscrowTransaction({
                status: EscrowStatus.FUNDED,
            });

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(fundedEscrow);

            await expect(service.fundEscrow({ escrowId: '1' })).rejects.toThrow();
        });
    });

    describe('releaseEscrow', () => {
        it('should release escrow funds successfully', async () => {
            const mockEscrow = TestFixtures.createMockEscrowTransaction({
                status: EscrowStatus.FUNDED,
            });

            const releasedEscrow = {
                ...mockEscrow,
                status: EscrowStatus.RELEASED,
                releasedAt: new Date(),
            };

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(mockEscrow);
            (escrowRepo.save as jest.Mock).mockResolvedValue(releasedEscrow);

            const result = await service.releaseEscrow({
                escrowId: '1',
                releaseNotes: 'Goods received',
            });

            expect(result.status).toBe(EscrowStatus.RELEASED);
            expect(result.releasedAt).toBeDefined();
        });

        it('should throw error if escrow not funded', async () => {
            const createdEscrow = TestFixtures.createMockEscrowTransaction({
                status: EscrowStatus.CREATED,
            });

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(createdEscrow);

            await expect(service.releaseEscrow({
                escrowId: '1',
                releaseNotes: 'Test',
            })).rejects.toThrow();
        });

        it('should throw error if escrow in dispute', async () => {
            const disputedEscrow = TestFixtures.createMockEscrowTransaction({
                status: EscrowStatus.DISPUTED,
            });

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(disputedEscrow);

            await expect(service.releaseEscrow({
                escrowId: '1',
                releaseNotes: 'Test',
            })).rejects.toThrow();
        });
    });

    describe('disputeEscrow', () => {
        it('should create dispute successfully', async () => {
            const mockEscrow = TestFixtures.createMockEscrowTransaction({
                status: EscrowStatus.FUNDED,
            });

            const disputedEscrow = {
                ...mockEscrow,
                status: EscrowStatus.DISPUTED,
                disputeReason: 'Goods not as described',
                disputedAt: new Date(),
            };

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(mockEscrow);
            (escrowRepo.save as jest.Mock).mockResolvedValue(disputedEscrow);

            const result = await service.disputeEscrow({
                escrowId: '1',
                disputeReason: 'Goods not as described',
            });

            expect(result.status).toBe(EscrowStatus.DISPUTED);
            expect(result.disputeReason).toBe('Goods not as described');
            expect(result.disputedAt).toBeDefined();
        });

        it('should throw error if escrow cannot be disputed', async () => {
            const releasedEscrow = TestFixtures.createMockEscrowTransaction({
                status: EscrowStatus.RELEASED,
            });

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(releasedEscrow);

            await expect(service.disputeEscrow({
                escrowId: '1',
                disputeReason: 'Test',
            })).rejects.toThrow();
        });
    });

    describe('resolveDispute', () => {
        it('should resolve dispute and release funds', async () => {
            const disputedEscrow = TestFixtures.createMockEscrowTransaction({
                status: EscrowStatus.DISPUTED,
            });

            const resolvedEscrow = {
                ...disputedEscrow,
                status: EscrowStatus.RELEASED,
                resolvedAt: new Date(),
                resolution: 'Resolved in favor of buyer',
                releasedAt: new Date(),
            };

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(disputedEscrow);
            (escrowRepo.save as jest.Mock).mockResolvedValue(resolvedEscrow);

            const result = await service.resolveDispute('1', 'Resolved in favor of buyer', 'Funds released');

            expect(result.status).toBe(EscrowStatus.RELEASED);
            expect(result.resolvedAt).toBeDefined();
            expect(result.resolution).toBeDefined();
        });

        it('should throw error if escrow not disputed', async () => {
            const fundedEscrow = TestFixtures.createMockEscrowTransaction({
                status: EscrowStatus.FUNDED,
            });

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(fundedEscrow);

            await expect(service.resolveDispute('1', 'Resolution', 'Notes')).rejects.toThrow();
        });
    });

    describe('cancelEscrow', () => {
        it('should cancel escrow successfully', async () => {
            const createdEscrow = TestFixtures.createMockEscrowTransaction({
                status: EscrowStatus.CREATED,
            });

            const cancelledEscrow = {
                ...createdEscrow,
                status: EscrowStatus.CANCELLED,
            };

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(createdEscrow);
            (escrowRepo.save as jest.Mock).mockResolvedValue(cancelledEscrow);

            const result = await service.cancelEscrow('1', 'Buyer request');

            expect(result.status).toBe(EscrowStatus.CANCELLED);
        });

        it('should throw error if escrow already funded', async () => {
            const fundedEscrow = TestFixtures.createMockEscrowTransaction({
                status: EscrowStatus.FUNDED,
            });

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(fundedEscrow);

            await expect(service.cancelEscrow('1', 'Test')).rejects.toThrow();
        });
    });

    describe('getEscrowById', () => {
        it('should return escrow by ID', async () => {
            const mockEscrow = TestFixtures.createMockEscrowTransaction();

            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(mockEscrow);

            const result = await service.getEscrowById('1');

            expect(result).toEqual(mockEscrow);
        });

        it('should throw error if escrow not found', async () => {
            (escrowRepo.findOneBy as jest.Mock).mockResolvedValue(null);

            await expect(service.getEscrowById('999')).rejects.toThrow();
        });
    });

    describe('getEscrowsByBuyer', () => {
        it('should return all escrows for buyer', async () => {
            const mockEscrows = [
                TestFixtures.createMockEscrowTransaction({ buyerId: 'buyer-1' }),
                TestFixtures.createMockEscrowTransaction({ buyerId: 'buyer-1' }),
            ];

            (escrowRepo.find as jest.Mock).mockResolvedValue(mockEscrows);

            const result = await service.getEscrowsByBuyer('buyer-1');

            expect(result).toHaveLength(2);
            expect(result[0].buyerId).toBe('buyer-1');
        });

        it('should filter by status when provided', async () => {
            const mockEscrows = [
                TestFixtures.createMockEscrowTransaction({
                    buyerId: 'buyer-1',
                    status: EscrowStatus.FUNDED,
                }),
            ];

            (escrowRepo.find as jest.Mock).mockResolvedValue(mockEscrows);

            const result = await service.getEscrowsByBuyer('buyer-1', EscrowStatus.FUNDED);

            expect(result).toHaveLength(1);
            expect(result[0].status).toBe(EscrowStatus.FUNDED);
        });
    });

    describe('getEscrowsBySeller', () => {
        it('should return all escrows for seller', async () => {
            const mockEscrows = [
                TestFixtures.createMockEscrowTransaction({ sellerId: 'seller-1' }),
                TestFixtures.createMockEscrowTransaction({ sellerId: 'seller-1' }),
            ];

            (escrowRepo.find as jest.Mock).mockResolvedValue(mockEscrows);

            const result = await service.getEscrowsBySeller('seller-1');

            expect(result).toHaveLength(2);
            expect(result[0].sellerId).toBe('seller-1');
        });
    });

    describe('getEscrowAnalytics', () => {
        it('should return escrow analytics', async () => {
            const mockEscrows = [
                TestFixtures.createMockEscrowTransaction({ amount: 10000, status: EscrowStatus.RELEASED }),
                TestFixtures.createMockEscrowTransaction({ amount: 20000, status: EscrowStatus.RELEASED }),
                TestFixtures.createMockEscrowTransaction({ amount: 30000, status: EscrowStatus.FUNDED }),
            ];

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockEscrows),
            };

            (escrowRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            const result = await service.getEscrowAnalytics();

            expect(result).toBeDefined();
            expect(result.totalEscrows).toBe(3);
        });
    });

    describe('getEscrowMetrics', () => {
        it('should return performance metrics', async () => {
            const mockEscrows = [
                TestFixtures.createMockEscrowTransaction({
                    status: EscrowStatus.RELEASED,
                    createdAt: new Date('2024-01-01'),
                    releasedAt: new Date('2024-01-10'),
                }),
            ];

            (escrowRepo.find as jest.Mock).mockResolvedValue(mockEscrows);

            const result = await service.getEscrowMetrics();

            expect(result).toBeDefined();
            expect(result.averageProcessingTime).toBeGreaterThan(0);
        });
    });
});
