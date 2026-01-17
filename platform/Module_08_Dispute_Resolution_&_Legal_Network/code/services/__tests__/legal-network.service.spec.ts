import { Test, TestingModule } from '@nestjs/testing';
import { LegalNetworkService } from '../legal-network.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LegalProviderProfile } from '../../entities/legal-provider-profile.entity';

describe('LegalNetworkService', () => {
    let service: LegalNetworkService;

    const mockLegalProvider = {
        id: '1',
        name: 'John Doe & Associates',
        practiceAreas: ['DEBT_RECOVERY', 'COMMERCIAL_DISPUTES'],
        barCouncilNumber: 'BAR-12345',
        location: 'Mumbai',
        rating: 4.5,
        casesHandled: 150,
        successRate: 85,
    };

    const mockRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LegalNetworkService,
                {
                    provide: getRepositoryToken(LegalProviderProfile),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<LegalNetworkService>(LegalNetworkService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findLegalProviders', () => {
        it('should find legal providers by practice area', async () => {
            const practiceArea = 'DEBT_RECOVERY';

            mockRepository.find.mockResolvedValue([mockLegalProvider]);

            const result = await service.findLegalProviders({ practiceArea });

            expect(result).toHaveLength(1);
            expect(result[0].practiceAreas).toContain(practiceArea);
        });

        it('should filter by location', async () => {
            mockRepository.find.mockResolvedValue([mockLegalProvider]);

            const result = await service.findLegalProviders({ location: 'Mumbai' });

            expect(result[0].location).toBe('Mumbai');
        });

        it('should filter by minimum rating', async () => {
            mockRepository.find.mockResolvedValue([mockLegalProvider]);

            const result = await service.findLegalProviders({ minRating: 4.0 });

            expect(result[0].rating).toBeGreaterThanOrEqual(4.0);
        });
    });

    describe('assignLegalProvider', () => {
        it('should assign legal provider to a case', async () => {
            const caseId = 'case-123';
            const providerId = '1';

            mockRepository.findOne.mockResolvedValue(mockLegalProvider);
            mockRepository.save.mockResolvedValue({
                caseId,
                providerId,
                assignedAt: new Date(),
            });

            const result = await service.assignLegalProvider(caseId, providerId);

            expect(result.caseId).toBe(caseId);
            expect(result.providerId).toBe(providerId);
        });

        it('should throw error if provider not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.assignLegalProvider('case-123', '999'),
            ).rejects.toThrow('Legal provider not found');
        });
    });

    describe('matchOptimalProvider', () => {
        it('should match optimal provider based on case requirements', async () => {
            const caseRequirements = {
                practiceArea: 'DEBT_RECOVERY',
                location: 'Mumbai',
                amount: 500000,
            };

            mockRepository.find.mockResolvedValue([
                mockLegalProvider,
                {
                    ...mockLegalProvider,
                    id: '2',
                    rating: 4.8,
                    successRate: 90,
                },
            ]);

            const result = await service.matchOptimalProvider(caseRequirements);

            expect(result).toBeDefined();
            expect(result.rating).toBeGreaterThanOrEqual(4.5);
        });
    });

    describe('trackCaseProgress', () => {
        it('should track legal case progress', async () => {
            const caseId = 'case-123';

            const progress = await service.trackCaseProgress(caseId);

            expect(progress).toBeDefined();
            expect(progress).toHaveProperty('status');
            expect(progress).toHaveProperty('milestones');
        });
    });
});
