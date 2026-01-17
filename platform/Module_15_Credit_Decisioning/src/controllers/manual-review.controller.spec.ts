import { Test, TestingModule } from '@nestjs/testing';
import { ManualReviewController } from './manual-review.controller';
import { ManualReviewService } from '../services/manual-review.service';
import { TestFixtures } from '../../tests/fixtures';

describe('ManualReviewController', () => {
    let controller: ManualReviewController;
    let service: Partial<ManualReviewService>;

    beforeEach(async () => {
        service = {
            createManualReview: jest.fn(),
            getManualReview: jest.fn(),
            getReviewsByReviewer: jest.fn(),
            updateReviewStatus: jest.fn(),
            assignReviewer: jest.fn(),
            escalateReview: jest.fn(),
            getOverdueReviews: jest.fn(),
            getReviewStats: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ManualReviewController],
            providers: [{ provide: ManualReviewService, useValue: service }],
        }).compile();

        controller = module.get<ManualReviewController>(ManualReviewController);
    });

    describe('POST /manual-reviews', () => {
        it('should create manual review', async () => {
            const createDto = {
                decisionId: 'decision-1',
                reviewType: 'CREDIT_APPROVAL' as any,
                priority: 'HIGH' as any,
                reviewReason: 'High amount requires review',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            };

            const mockCreated = TestFixtures.createMockManualReview({
                ...createDto,
                id: 'review-1',
                status: 'PENDING' as any,
            });

            (service.createManualReview as jest.Mock).mockResolvedValue(mockCreated);

            const result = await controller.createReview(createDto);

            expect(result.id).toBe('review-1');
            expect(result.status).toBe('PENDING');
            expect(service.createManualReview).toHaveBeenCalledWith(createDto, undefined);
        });
    });

    describe('GET /manual-reviews/:id', () => {
        it('should retrieve review by ID', async () => {
            const mockReview = TestFixtures.createMockManualReview({
                id: 'review-1',
            });

            (service.getManualReview as jest.Mock).mockResolvedValue(mockReview);

            const result = await controller.getReview('review-1');

            expect(result.id).toBe('review-1');
            expect(service.getManualReview).toHaveBeenCalledWith('review-1');
        });

        it('should handle review not found', async () => {
            (service.getManualReview as jest.Mock).mockRejectedValue(
                new Error('Review not found')
            );

            await expect(controller.getReview('non-existent')).rejects.toThrow(
                'Review not found'
            );
        });
    });

    describe('GET /manual-reviews/reviewer/:reviewerId', () => {
        it('should retrieve reviews for reviewer', async () => {
            const mockReviews = [
                TestFixtures.createMockManualReview({
                    assignedTo: 'reviewer-1',
                    status: 'PENDING' as any,
                }),
                TestFixtures.createMockManualReview({
                    assignedTo: 'reviewer-1',
                    status: 'IN_PROGRESS' as any,
                }),
            ];

            (service.getReviewsByReviewer as jest.Mock).mockResolvedValue(mockReviews);

            const result = await controller.getReviewsByReviewer('reviewer-1', {});

            expect(result).toHaveLength(2);
            expect(service.getReviewsByReviewer).toHaveBeenCalledWith('reviewer-1', {});
        });

        it('should filter by status', async () => {
            const mockReviews = [
                TestFixtures.createMockManualReview({ status: 'PENDING' as any }),
            ];

            (service.getReviewsByReviewer as jest.Mock).mockResolvedValue(mockReviews);

            await controller.getReviewsByReviewer('reviewer-1', {
                status: 'PENDING' as any,
            });

            expect(service.getReviewsByReviewer).toHaveBeenCalledWith('reviewer-1', {
                status: 'PENDING',
            });
        });
    });

    describe('PATCH /manual-reviews/:id/status', () => {
        it('should update review status', async () => {
            const updateDto = {
                status: 'COMPLETED' as any,
                reviewNotes: 'Approved after thorough review',
                recommendation: 'APPROVE',
            };

            const mockUpdated = TestFixtures.createMockManualReview({
                id: 'review-1',
                status: 'COMPLETED' as any,
                reviewNotes: 'Approved after thorough review',
            });

            (service.updateReviewStatus as jest.Mock).mockResolvedValue(mockUpdated);

            const result = await controller.updateReviewStatus('review-1', updateDto);

            expect(result.status).toBe('COMPLETED');
            expect(service.updateReviewStatus).toHaveBeenCalledWith(
                'review-1',
                updateDto,
                undefined
            );
        });
    });

    describe('POST /manual-reviews/:id/assign', () => {
        it('should assign review to reviewer', async () => {
            const assignDto = {
                reviewerId: 'reviewer-2',
                reviewerRole: 'senior_analyst',
                reviewerName: 'John Doe',
            };

            const mockAssigned = TestFixtures.createMockManualReview({
                id: 'review-1',
                assignedTo: 'reviewer-2',
                status: 'ASSIGNED' as any,
            });

            (service.assignReviewer as jest.Mock).mockResolvedValue(mockAssigned);

            const result = await controller.assignReview('review-1', assignDto);

            expect(result.assignedTo).toBe('reviewer-2');
            expect(result.status).toBe('ASSIGNED');
        });
    });

    describe('POST /manual-reviews/:id/escalate', () => {
        it('should escalate review', async () => {
            const escalateDto = {
                escalateTo: 'manager-1',
                reason: 'Exceeds reviewer authority limit',
            };

            const mockEscalated = TestFixtures.createMockManualReview({
                id: 'review-1',
                escalated: true,
                escalatedTo: 'manager-1',
                escalationReason: 'Exceeds reviewer authority limit',
            });

            (service.escalateReview as jest.Mock).mockResolvedValue(mockEscalated);

            const result = await controller.escalateReview('review-1', escalateDto);

            expect(result.escalated).toBe(true);
            expect(result.escalatedTo).toBe('manager-1');
        });
    });

    describe('GET /manual-reviews/overdue', () => {
        it('should retrieve overdue reviews', async () => {
            const mockOverdue = [
                TestFixtures.createMockManualReview({
                    id: 'review-1',
                    requiredBy: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day overdue
                    status: 'PENDING' as any,
                }),
                TestFixtures.createMockManualReview({
                    id: 'review-2',
                    requiredBy: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days overdue
                    status: 'IN_PROGRESS' as any,
                }),
            ];

            (service.getOverdueReviews as jest.Mock).mockResolvedValue(mockOverdue);

            const result = await controller.getOverdueReviews();

            expect(result).toHaveLength(2);
            expect(service.getOverdueReviews).toHaveBeenCalled();
        });
    });

    describe('GET /manual-reviews/stats', () => {
        it('should retrieve review statistics', async () => {
            const mockStats = {
                total: 100,
                pending: 20,
                inProgress: 15,
                completed: 60,
                escalated: 5,
                averageProcessingTime: 45,
                slaComplianceRate: 88,
                byPriority: {
                    URGENT: 10,
                    HIGH: 30,
                    MEDIUM: 40,
                    LOW: 20,
                },
            };

            (service.getReviewStats as jest.Mock).mockResolvedValue(mockStats);

            const result = await controller.getReviewStats();

            expect(result.total).toBe(100);
            expect(result.slaComplianceRate).toBe(88);
            expect(service.getReviewStats).toHaveBeenCalled();
        });

        it('should support date range filtering', async () => {
            const startDate = '2024-01-01';
            const endDate = '2024-01-31';

            (service.getReviewStats as jest.Mock).mockResolvedValue({});

            await controller.getReviewStats(startDate, endDate);

            expect(service.getReviewStats).toHaveBeenCalledWith(
                new Date(startDate),
                new Date(endDate)
            );
        });
    });

    describe('error handling', () => {
        it('should handle service errors', async () => {
            (service.getManualReview as jest.Mock).mockRejectedValue(
                new Error('Database error')
            );

            await expect(controller.getReview('review-1')).rejects.toThrow(
                'Database error'
            );
        });
    });
});
