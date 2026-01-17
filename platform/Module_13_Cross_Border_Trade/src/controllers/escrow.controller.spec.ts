import { Test, TestingModule } from '@nestjs/testing';
import { EscrowController } from '../controllers/escrow.controller';
import { EscrowService } from '../services/escrow.service';
import { TestFixtures } from '../../test/fixtures';

describe('EscrowController', () => {
    let controller: EscrowController;
    let escrowService: Partial<EscrowService>;

    beforeEach(async () => {
        escrowService = {
            createEscrow: jest.fn(),
            fundEscrow: jest.fn(),
            releaseEscrow: jest.fn(),
            disputeEscrow: jest.fn(),
            getEscrowById: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [EscrowController],
            providers: [
                {
                    provide: EscrowService,
                    useValue: escrowService,
                },
            ],
        }).compile();

        controller = module.get<EscrowController>(EscrowController);
    });

    describe('POST /escrow', () => {
        it('should create escrow successfully', async () => {
            const request = TestFixtures.createMockEscrowRequest();
            const mockEscrow = TestFixtures.createMockEscrowTransaction(request);

            (escrowService.createEscrow as jest.Mock).mockResolvedValue(mockEscrow);

            const result = await controller.createEscrow(request, { user: { id: 'user-1' } } as any);

            expect(result.transactionId).toBe(request.transactionId);
            expect(escrowService.createEscrow).toHaveBeenCalledWith(request, 'user-1');
        });
    });

    describe('POST /escrow/:id/fund', () => {
        it('should fund escrow successfully', async () => {
            const fundedEscrow = TestFixtures.createMockEscrowTransaction({ status: 'funded' as any });

            (escrowService.fundEscrow as jest.Mock).mockResolvedValue(fundedEscrow);

            const result = await controller.fundEscrow('1', { blockchainHash: '0xabc' });

            expect(result.status).toBe('funded');
        });
    });

    describe('POST /escrow/:id/release', () => {
        it('should release escrow successfully', async () => {
            const releasedEscrow = TestFixtures.createMockEscrowTransaction({ status: 'released' as any });

            (escrowService.releaseEscrow as jest.Mock).mockResolvedValue(releasedEscrow);

            const result = await controller.releaseEscrow('1', { releaseNotes: 'Approved' });

            expect(result.status).toBe('released');
        });
    });

    describe('POST /escrow/:id/dispute', () => {
        it('should create dispute successfully', async () => {
            const disputedEscrow = TestFixtures.createMockEscrowTransaction({ status: 'disputed' as any });

            (escrowService.disputeEscrow as jest.Mock).mockResolvedValue(disputedEscrow);

            const result = await controller.disputeEscrow('1', { disputeReason: 'Issue' });

            expect(result.status).toBe('disputed');
        });
    });

    describe('GET /escrow/:id', () => {
        it('should return escrow details', async () => {
            const mockEscrow = TestFixtures.createMockEscrowTransaction();

            (escrowService.getEscrowById as jest.Mock).mockResolvedValue(mockEscrow);

            const result = await controller.getEscrowById('1');

            expect(result).toEqual(mockEscrow);
        });
    });
});
