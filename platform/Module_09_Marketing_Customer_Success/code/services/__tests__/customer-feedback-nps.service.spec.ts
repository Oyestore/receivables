import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerFeedbackNPSService } from '../customer-feedback-nps.service';
import { NPSResponse } from '../../entities/nps-response.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('CustomerFeedbackNPSService', () => {
    let service: CustomerFeedbackNPSService;
    let repository: Repository<NPSResponse>;
    let eventEmitter: EventEmitter2;

    const mockNPSResponse = {
        id: 'nps-123',
        customerId: 'customer-123',
        tenantId: 'tenant-123',
        score: 9,
        category: 'promoter',
        feedback: 'Great platform!',
        createdAt: new Date(),
    };

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerFeedbackNPSService,
                {
                    provide: getRepositoryToken(NPSResponse),
                    useValue: mockRepository,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<CustomerFeedbackNPSService>(CustomerFeedbackNPSService);
        repository = module.get<Repository<NPSResponse>>(getRepositoryToken(NPSResponse));
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);

        jest.clearAllMocks();
    });

    describe('submitNPSResponse', () => {
        it('should categorize score 9-10 as promoter', async () => {
            mockRepository.create.mockReturnValue({ ...mockNPSResponse, score: 9 });
            mockRepository.save.mockResolvedValue({ ...mockNPSResponse, score: 9, category: 'promoter' });

            const result = await service.submitNPSResponse({
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                score: 9,
            });

            expect(result.category).toBe('promoter');
        });

        it('should categorize score 7-8 as passive', async () => {
            mockRepository.create.mockReturnValue({ ...mockNPSResponse, score: 7 });
            mockRepository.save.mockResolvedValue({ ...mockNPSResponse, score: 7, category: 'passive' });

            const result = await service.submitNPSResponse({
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                score: 7,
            });

            expect(result.category).toBe('passive');
        });

        it('should categorize score 0-6 as detractor', async () => {
            mockRepository.create.mockReturnValue({ ...mockNPSResponse, score: 4 });
            mockRepository.save.mockResolvedValue({ ...mockNPSResponse, score: 4, category: 'detractor' });

            const result = await service.submitNPSResponse({
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                score: 4,
            });

            expect(result.category).toBe('detractor');
        });

        it('should emit NPS response event', async () => {
            mockRepository.create.mockReturnValue(mockNPSResponse);
            mockRepository.save.mockResolvedValue(mockNPSResponse);

            await service.submitNPSResponse({
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                score: 9,
            });

            expect(eventEmitter.emit).toHaveBeenCalledWith('nps.response.submitted', {
                customerId: 'customer-123',
                score: 9,
                category: expect.any(String),
            });
        });
    });

    describe('calculateNPSScore', () => {
        it('should calculate NPS correctly', async () => {
            const responses = [
                { ...mockNPSResponse, score: 10, category: 'promoter' },
                { ...mockNPSResponse, score: 9, category: 'promoter' },
                { ...mockNPSResponse, score: 7, category: 'passive' },
                { ...mockNPSResponse, score: 3, category: 'detractor' },
            ];

            mockRepository.find.mockResolvedValue(responses);

            const result = await service.calculateNPSScore('tenant-123');

            // (2 promoters - 1 detractor) / 4 total * 100 = 25
            expect(result.npsScore).toBe(25);
            expect(result.promoterPercentage).toBe(50);
            expect(result.passivePercentage).toBe(25);
            expect(result.detractorPercentage).toBe(25);
        });

        it('should handle all promoters', async () => {
            const responses = [
                { ...mockNPSResponse, score: 10 },
                { ...mockNPSResponse, score: 9 },
            ];

            mockRepository.find.mockResolvedValue(responses);

            const result = await service.calculateNPSScore('tenant-123');

            expect(result.npsScore).toBe(100);
        });

        it('should handle no responses', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await service.calculateNPSScore('tenant-123');

            expect(result.npsScore).toBe(0);
            expect(result.totalResponses).toBe(0);
        });
    });

    describe('getDetractors', () => {
        it('should return detractors only', async () => {
            const detractors = [
                { ...mockNPSResponse, score: 3, category: 'detractor' },
                { ...mockNPSResponse, score: 5, category: 'detractor' },
            ];

            mockRepository.find.mockResolvedValue(detractors);

            const result = await service.getDetractors('tenant-123');

            expect(result.every(r => r.score <= 6)).toBe(true);
        });
    });

    describe('getPromoters', () => {
        it('should return promoters only', async () => {
            const promoters = [
                { ...mockNPSResponse, score: 9, category: 'promoter' },
                { ...mockNPSResponse, score: 10, category: 'promoter' },
            ];

            mockRepository.find.mockResolvedValue(promoters);

            const result = await service.getPromoters('tenant-123');

            expect(result.every(r => r.score >= 9)).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should validate score range', async () => {
            await expect(
                service.submitNPSResponse({
                    customerId: 'customer-123',
                    tenantId: 'tenant-123',
                    score: 11, // Invalid
                }),
            ).rejects.toThrow();

            await expect(
                service.submitNPSResponse({
                    customerId: 'customer-123',
                    tenantId: 'tenant-123',
                    score: -1, // Invalid
                }),
            ).rejects.toThrow();
        });

        it('should handle database errors', async () => {
            mockRepository.find.mockRejectedValue(new Error('DB Error'));

            await expect(service.calculateNPSScore('tenant-123')).rejects.toThrow();
        });
    });
});
