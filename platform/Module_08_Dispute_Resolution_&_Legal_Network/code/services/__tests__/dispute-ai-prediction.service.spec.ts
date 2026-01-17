import { Test, TestingModule } from '@nestjs/testing';
import { DisputeAIPredictionService } from '../dispute-ai-prediction.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DisputeCase, DisputeStatus, DisputeType } from '../../entities/dispute-case.entity';
import { CollectionCase } from '../../entities/collection-case.entity';

describe('DisputeAIPredictionService', () => {
    let service: DisputeAIPredictionService;

    const mockDisputeRepo = {
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        })),
        find: jest.fn(),
    };

    const mockCollectionRepo = {
        find: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DisputeAIPredictionService,
                {
                    provide: getRepositoryToken(DisputeCase),
                    useValue: mockDisputeRepo,
                },
                {
                    provide: getRepositoryToken(CollectionCase),
                    useValue: mockCollectionRepo,
                },
            ],
        }).compile();

        service = module.get<DisputeAIPredictionService>(DisputeAIPredictionService);
    });

    describe('predictOutcome', () => {
        it('should predict win for strong cases', async () => {
            const dispute = {
                id: 'd1',
                tenantId: 't1',
                disputedAmount: 10000,
                status: DisputeStatus.OPEN,
                evidence: { documents: [1, 2, 3, 4] },
                caseNumber: 'CASE-001',
                type: DisputeType.NON_PAYMENT,
                createdAt: new Date(),
                customerId: 'c1'
            } as any;

            mockDisputeRepo.findOne.mockResolvedValue(dispute);
            // Mock historical data: mostly wins
            mockDisputeRepo.createQueryBuilder().getMany.mockResolvedValue([
                { status: DisputeStatus.RESOLVED },
                { status: DisputeStatus.RESOLVED },
                { status: DisputeStatus.CLOSED }
            ]);

            const result = await service.predictOutcome('d1', 't1');
            expect(result.predictedOutcome).toBe('win');
            expect(result.confidence).toBeGreaterThan(50);
        });

        it('should predict lose for weak cases', async () => {
            const dispute = {
                id: 'd2',
                tenantId: 't1',
                disputedAmount: 10000,
                status: DisputeStatus.OPEN,
                evidence: { documents: [] }, // No evidence
                caseNumber: 'CASE-002',
                type: DisputeType.NON_PAYMENT,
                createdAt: new Date(),
                customerId: 'c1'
            } as any;

            mockDisputeRepo.findOne.mockResolvedValue(dispute);
            // Mock historical data: mostly losses
            mockDisputeRepo.createQueryBuilder().getMany.mockResolvedValue([
                { status: DisputeStatus.CLOSED },
                { status: DisputeStatus.CLOSED },
                { status: DisputeStatus.RESOLVED }
            ]);

            const result = await service.predictOutcome('d2', 't1');
            expect(result.predictedOutcome).toBe('lose');
        });
    });

    describe('assessRisk', () => {
        it('should identify high risk for large amounts', async () => {
            const dispute = {
                id: 'd3',
                tenantId: 't1',
                disputedAmount: 1000000, // High amount
                status: DisputeStatus.OPEN,
                evidence: { documents: [] },
                createdAt: new Date(),
                customerId: 'c1',
                type: DisputeType.QUALITY_DISPUTE
            } as any;

            mockDisputeRepo.findOne.mockResolvedValue(dispute);
            mockDisputeRepo.find.mockResolvedValue([]); // No history

            const result = await service.assessRisk('d3', 't1');
            expect(result.riskLevel).toMatch(/high|critical/);
            expect(result.factors.some(f => f.category === 'Amount Risk')).toBe(true);
        });
    });
});
