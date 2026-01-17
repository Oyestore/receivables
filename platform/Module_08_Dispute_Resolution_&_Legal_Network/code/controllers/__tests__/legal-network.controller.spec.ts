import { Test, TestingModule } from '@nestjs/testing';
import { LegalNetworkController } from '../legal-network.controller';
import { LegalNetworkService } from '../../services/legal-network.service';

describe('LegalNetworkController', () => {
    let controller: LegalNetworkController;
    let service: LegalNetworkService;

    const mockLegalNetworkService = {
        findLegalProviders: jest.fn(),
        assignLegalProvider: jest.fn(),
        matchOptimalProvider: jest.fn(),
        trackCaseProgress: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [LegalNetworkController],
            providers: [
                {
                    provide: LegalNetworkService,
                    useValue: mockLegalNetworkService,
                },
            ],
        }).compile();

        controller = module.get<LegalNetworkController>(LegalNetworkController);
        service = module.get<LegalNetworkService>(LegalNetworkService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /legal-network/providers', () => {
        it('should return legal providers matching criteria', async () => {
            const mockProviders = [
                { id: '1', name: 'Law Firm A', practiceAreas: ['DEBT_RECOVERY'] },
            ];

            mockLegalNetworkService.findLegalProviders.mockResolvedValue(mockProviders);

            const result = await controller.findProviders({
                practiceArea: 'DEBT_RECOVERY',
                location: 'Mumbai',
            });

            expect(result).toEqual(mockProviders);
            expect(service.findLegalProviders).toHaveBeenCalledWith({
                practiceArea: 'DEBT_RECOVERY',
                location: 'Mumbai',
            });
        });
    });

    describe('POST /legal-network/assign', () => {
        it('should assign legal provider to case', async () => {
            const assignmentDto = {
                caseId: 'case-123',
                providerId: 'provider-1',
            };

            mockLegalNetworkService.assignLegalProvider.mockResolvedValue({
                ...assignmentDto,
                assignedAt: new Date(),
            });

            const result = await controller.assignProvider(assignmentDto);

            expect(result.caseId).toBe('case-123');
            expect(service.assignLegalProvider).toHaveBeenCalledWith('case-123', 'provider-1');
        });
    });

    describe('POST /legal-network/match', () => {
        it('should match optimal provider for case requirements', async () => {
            const requirements = {
                practiceArea: 'DEBT_RECOVERY',
                location: 'Delhi',
                amount: 500000,
            };

            const mockProvider = {
                id: '1',
                name: 'Best Law Firm',
                rating: 4.8,
                matchScore: 95,
            };

            mockLegalNetworkService.matchOptimalProvider.mockResolvedValue(mockProvider);

            const result = await controller.matchProvider(requirements);

            expect(result.matchScore).toBe(95);
            expect(service.matchOptimalProvider).toHaveBeenCalledWith(requirements);
        });
    });

    describe('GET /legal-network/cases/:caseId/progress', () => {
        it('should track legal case progress', async () => {
            const caseId = 'case-123';
            const mockProgress = {
                status: 'IN_PROGRESS',
                milestones: [
                    { name: 'Notice Sent', completed: true },
                    { name: 'Hearing Scheduled', completed: false },
                ],
            };

            mockLegalNetworkService.trackCaseProgress.mockResolvedValue(mockProgress);

            const result = await controller.trackProgress(caseId);

            expect(result.status).toBe('IN_PROGRESS');
            expect(result.milestones).toHaveLength(2);
        });
    });
});
