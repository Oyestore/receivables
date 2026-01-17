import { Test, TestingModule } from '@nestjs/testing';
import { ManualReviewService } from './manual-review.service';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ManualReview } from '../entities/manual-review.entity';
import { TestFixtures } from '../../tests/fixtures';

describe('ManualReviewService', () => {
    let service: ManualReviewService;
    let reviewRepo: any;

    beforeEach(async () => {
        reviewRepo = createMockRepository<ManualReview>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ManualReviewService,
                { provide: getRepositoryToken(ManualReview), useValue: reviewRepo },
            ],
        }).compile();

        service = module.get<ManualReviewService>(ManualReviewService);
    });

    describe('createReview', () => {
        it('should create manual review with auto-assignment', async () => {
            const createDto = {
                decisionId: 'decision-1',
                priority: 'HIGH' as any,
                category: 'CREDIT_APPROVAL',
                reason: 'High amount requires manual review',
                requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000),
            };

            const savedReview = TestFixtures.createMockManualReview({
                ...createDto,
                id: 'review-1',
                status: 'PENDING' as any,
                assignedTo: 'reviewer-1', // Auto-assigned
            });

            reviewRepo.create.mockReturnValue(savedReview);
            reviewRepo.save.mockResolvedValue(savedReview);

            jest.spyOn(service as any, 'autoAssignReviewer').mockResolvedValue('reviewer-1');

            const result = await service.createReview(createDto, 'user-1');

            expect(result.id).toBe('review-1');
            expect(result.assignedTo).toBe('reviewer-1');
            expect(result.status).toBe('PENDING');
        });

        it('should set priority based on decision amount', async () => {
            const highAmountDto = {
                decisionId: 'decision-1',
                category: 'CREDIT_APPROVAL',
                decisionAmount: 100000, // High amount
            };

            const savedReview = TestFixtures.createMockManualReview({
                ...highAmountDto,
                priority: 'HIGH', // Auto-set based on amount
            });

            reviewRepo.create.mockReturnValue(savedReview);
            reviewRepo.save.mockResolvedValue(savedReview);

            const result = await service.createReview(highAmountDto, 'user-1');

            expect(result.priority).toBe('HIGH');
        });

        it('should calculate due date based on priority', async () => {
            const urgentDto = {
                decisionId: 'decision-1',
                priority: 'URGENT' as any,
                category: 'CREDIT_APPROVAL',
            };

            const savedReview = TestFixtures.createMockManualReview({
                ...urgentDto,
                requiredBy: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours for URGENT
            });

            reviewRepo.create.mockReturnValue(savedReview);
            reviewRepo.save.mockResolvedValue(savedReview);

            const result = await service.createReview(urgentDto, 'user-1');

            const hoursUntilDue = (result.requiredBy.getTime() - Date.now()) / (1000 * 60 * 60);
            expect(hoursUntilDue).toBeLessThan(5); // Should be ~4 hours
        });
    });

    describe('assignReview', () => {
        it('should assign review to specific reviewer', async () => {
            const pendingReview = TestFixtures.createMockManualReview({
                id: 'review-1',
                status: 'PENDING' as any,
                assignedTo: null,
            });

            reviewRepo.findOne.mockResolvedValue(pendingReview);
            reviewRepo.save.mockResolvedValue({
                ...pendingReview,
                assignedTo: 'reviewer-2',
                assignedAt: new Date(),
            });

            const result = await service.assignReview('review-1', 'reviewer-2', 'manager-1');

            expect(result.assignedTo).toBe('reviewer-2');
            expect(result.assignedAt).toBeDefined();
        });

        it('should prevent reassignment of completed reviews', async () => {
            const completedReview = TestFixtures.createMockManualReview({
                status: 'COMPLETED' as any,
            });

            reviewRepo.findOne.mockResolvedValue(completedReview);

            await expect(
                service.assignReview('review-1', 'reviewer-2', 'manager-1')
            ).rejects.toThrow('Cannot reassign completed review');
        });

        it('should check reviewer workload before assignment', async () => {
            const pendingReview = TestFixtures.createMockManualReview({
                status: 'PENDING' as any,
            });

            reviewRepo.findOne.mockResolvedValue(pendingReview);

            jest.spyOn(service as any, 'getReviewerWorkload').mockResolvedValue(15); // High workload

            await expect(
                service.assignReview('review-1', 'overloaded-reviewer', 'manager-1')
            ).rejects.toThrow('Reviewer workload exceeds limit');
        });
    });

    describe('autoAssignment', () => {
        it('should assign to reviewer with lowest workload', async () => {
            jest.spyOn(service as any, 'getAvailableReviewers').mockResolvedValue([
                { id: 'reviewer-1', workload: 5 },
                { id: 'reviewer-2', workload: 2 },
                { id: 'reviewer-3', workload: 8 },
            ]);

            const assignedTo = await service['autoAssignReviewer']('CREDIT_APPROVAL');

            expect(assignedTo).toBe('reviewer-2'); // Lowest workload
        });

        it('should consider reviewer specialization', async () => {
            jest.spyOn(service as any, 'getAvailableReviewers').mockResolvedValue([
                { id: 'reviewer-1', workload: 3, specialization: 'GENERAL' },
                { id: 'reviewer-2', workload: 4, specialization: 'CREDIT_APPROVAL' },
            ]);

            const assignedTo = await service['autoAssignReviewer']('CREDIT_APPROVAL');

            expect(assignedTo).toBe('reviewer-2'); // Specialist gets priority
        });

        it('should handle no available reviewers', async () => {
            jest.spyOn(service as any, 'getAvailableReviewers').mockResolvedValue([]);

            const assignedTo = await service['autoAssignReviewer']('CREDIT_APPROVAL');

            expect(assignedTo).toBeNull();
        });
    });

    describe('completeReview', () => {
        it('should record review decision', async () => {
            const activeReview = TestFixtures.createMockManualReview({
                id: 'review-1',
                status: 'IN_PROGRESS' as any,
                assignedTo: 'reviewer-1',
            });

            reviewRepo.findOne.mockResolvedValue(activeReview);
            reviewRepo.save.mockResolvedValue({
                ...activeReview,
                status: 'COMPLETED' as any,
                decision: 'APPROVED',
                completedAt: new Date(),
                reviewNotes: 'All checks passed',
            });

            const result = await service.completeReview(
                'review-1',
                {
                    decision: 'APPROVED',
                    notes: 'All checks passed',
                },
                'reviewer-1'
            );

            expect(result.status).toBe('COMPLETED');
            expect(result.decision).toBe('APPROVED');
            expect(result.completedAt).toBeDefined();
        });

        it('should calculate review duration', async () => {
            const startTime = new Date('2024-01-01T10:00:00');
            const activeReview = TestFixtures.createMockManualReview({
                status: 'IN_PROGRESS' as any,
                assignedAt: startTime,
            });

            reviewRepo.findOne.mockResolvedValue(activeReview);
            reviewRepo.save.mockResolvedValue({
                ...activeReview,
                status: 'COMPLETED' as any,
                completedAt: new Date('2024-01-01T11:30:00'),
                durationMinutes: 90,
            });

            const result = await service.completeReview(
                'review-1',
                { decision: 'APPROVED' },
                'reviewer-1'
            );

            expect(result.durationMinutes).toBe(90);
        });

        it('should prevent completion by non-assigned reviewer', async () => {
            const activeReview = TestFixtures.createMockManualReview({
                status: 'IN_PROGRESS' as any,
                assignedTo: 'reviewer-1',
            });

            reviewRepo.findOne.mockResolvedValue(activeReview);

            await expect(
                service.completeReview(
                    'review-1',
                    { decision: 'APPROVED' },
                    'reviewer-2' // Different reviewer
                )
            ).rejects.toThrow('Only assigned reviewer can complete');
        });
    });

    describe('escalation', () => {
        it('should escalate overdue reviews', async () => {
            const overdueReview = TestFixtures.createMockManualReview({
                id: 'review-1',
                status: 'PENDING' as any,
                requiredBy: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            });

            reviewRepo.findOne.mockResolvedValue(overdueReview);
            reviewRepo.save.mockResolvedValue({
                ...overdueReview,
                escalated: true,
                escalatedAt: new Date(),
                escalatedTo: 'manager-1',
            });

            const result = await service.escalateReview('review-1', 'manager-1');

            expect(result.escalated).toBe(true);
            expect(result.escalatedTo).toBe('manager-1');
        });

        it('should auto-escalate based on SLA breach', async () => {
            const reviews = [
                TestFixtures.createMockManualReview({
                    id: 'review-1',
                    status: 'PENDING' as any,
                    requiredBy: new Date(Date.now() - 60 * 60 * 1000), // 1 hour overdue
                    escalated: false,
                }),
            ];

            reviewRepo.find.mockResolvedValue(reviews);
            reviewRepo.save.mockImplementation((review) => ({
                ...review,
                escalated: true,
            }));

            const escalated = await service.autoEscalateOverdue();

            expect(escalated).toHaveLength(1);
            expect(escalated[0].escalated).toBe(true);
        });

        it('should notify on escalation', async () => {
            const review = TestFixtures.createMockManualReview({
                status: 'PENDING' as any,
            });

            reviewRepo.findOne.mockResolvedValue(review);
            reviewRepo.save.mockResolvedValue({ ...review, escalated: true });

            const notifySpy = jest.spyOn(service as any, 'sendEscalationNotification').mockResolvedValue(true);

            await service.escalateReview('review-1', 'manager-1');

            expect(notifySpy).toHaveBeenCalled();
        });
    });

    describe('workload management', () => {
        it('should calculate reviewer current workload', async () => {
            const activeReviews = [
                TestFixtures.createMockManualReview({ status: 'PENDING' as any }),
                TestFixtures.createMockManualReview({ status: 'IN_PROGRESS' as any }),
                TestFixtures.createMockManualReview({ status: 'IN_PROGRESS' as any }),
            ];

            reviewRepo.find.mockResolvedValue(activeReviews);

            const workload = await service.getReviewerWorkload('reviewer-1');

            expect(workload).toBe(3);
        });

        it('should balance workload across reviewers', async () => {
            const reviewers = [
                { id: 'reviewer-1', workload: 8 },
                { id: 'reviewer-2', workload: 3 },
                { id: 'reviewer-3', workload: 5 },
            ];

            jest.spyOn(service as any, 'getAllReviewers').mockResolvedValue(reviewers);

            const balanced = await service.balanceWorkload();

            expect(balanced.rebalanced).toBeGreaterThan(0);
        });

        it('should respect max workload per reviewer', async () => {
            const review = TestFixtures.createMockManualReview();
            reviewRepo.create.mockReturnValue(review);

            jest.spyOn(service as any, 'getReviewerWorkload').mockResolvedValue(10); // At limit

            const assignedTo = await service['autoAssignReviewer']('CREDIT_APPROVAL');

            expect(assignedTo).toBeNull(); // Cannot assign to overloaded reviewer
        });
    });

    describe('quality scoring', () => {
        it('should calculate reviewer quality score', async () => {
            const reviews = [
                TestFixtures.createMockManualReview({
                    decision: 'APPROVED',
                    accuracyScore: 95,
                }),
                TestFixtures.createMockManualReview({
                    decision: 'REJECTED',
                    accuracyScore: 90,
                }),
                TestFixtures.createMockManualReview({
                    decision: 'APPROVED',
                    accuracyScore: 88,
                }),
            ];

            reviewRepo.find.mockResolvedValue(reviews);

            const quality = await service.getReviewerQualityScore('reviewer-1');

            expect(quality.averageAccuracy).toBeCloseTo(91, 0);
            expect(quality.totalReviews).toBe(3);
        });

        it('should track decision accuracy', async () => {
            const review = TestFixtures.createMockManualReview({
                decision: 'APPROVED',
                actualOutcome: 'APPROVED', // Correct
            });

            const accuracy = await service.calculateAccuracy(review);

            expect(accuracy).toBe(100);
        });

        it('should identify low-performing reviewers', async () => {
            jest.spyOn(service, 'getReviewerQualityScore').mockResolvedValue({
                averageAccuracy: 65, // Below threshold
                totalReviews: 20,
            });

            const needsTraining = await service.identifyLowPerformers();

            expect(needsTraining).toContain('reviewer-1');
        });
    });

    describe('analytics', () => {
        it('should calculate average review time', async () => {
            const reviews = [
                TestFixtures.createMockManualReview({ durationMinutes: 30 }),
                TestFixtures.createMockManualReview({ durationMinutes: 45 }),
                TestFixtures.createMockManualReview({ durationMinutes: 60 }),
            ];

            reviewRepo.find.mockResolvedValue(reviews);

            const analytics = await service.getReviewAnalytics();

            expect(analytics.averageReviewTimeMinutes).toBe(45);
        });

        it('should track SLA compliance rate', async () => {
            const reviews = [
                TestFixtures.createMockManualReview({
                    requiredBy: new Date(Date.now() + 60 * 60 * 1000),
                    completedAt: new Date(), // Completed on time
                }),
                TestFixtures.createMockManualReview({
                    requiredBy: new Date(Date.now() - 60 * 60 * 1000),
                    completedAt: new Date(), // Completed late
                }),
            ];

            reviewRepo.find.mockResolvedValue(reviews);

            const analytics = await service.getReviewAnalytics();

            expect(analytics.slaComplianceRate).toBe(50);
        });

        it('should group by category', async () => {
            const reviews = [
                TestFixtures.createMockManualReview({ category: 'CREDIT_APPROVAL' }),
                TestFixtures.createMockManualReview({ category: 'CREDIT_APPROVAL' }),
                TestFixtures.createMockManualReview({ category: 'LIMIT_INCREASE' }),
            ];

            reviewRepo.find.mockResolvedValue(reviews);

            const analytics = await service.getReviewAnalytics();

            expect(analytics.byCategory['CREDIT_APPROVAL']).toBe(2);
            expect(analytics.byCategory['LIMIT_INCREASE']).toBe(1);
        });

        it('should calculate approval rate', async () => {
            const reviews = [
                TestFixtures.createMockManualReview({ decision: 'APPROVED' }),
                TestFixtures.createMockManualReview({ decision: 'APPROVED' }),
                TestFixtures.createMockManualReview({ decision: 'REJECTED' }),
            ];

            reviewRepo.find.mockResolvedValue(reviews);

            const analytics = await service.getReviewAnalytics();

            expect(analytics.approvalRate).toBeCloseTo(66.67, 1);
        });
    });

    describe('getReview', () => {
        it('should retrieve review by ID', async () => {
            const mockReview = TestFixtures.createMockManualReview({ id: 'review-1' });
            reviewRepo.findOne.mockResolvedValue(mockReview);

            const result = await service.getReview('review-1');

            expect(result.id).toBe('review-1');
        });

        it('should throw error when review not found', async () => {
            reviewRepo.findOne.mockResolvedValue(null);

            await expect(service.getReview('non-existent')).rejects.toThrow(
                'Review not found'
            );
        });
    });

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            reviewRepo.find.mockRejectedValue(new Error('Database error'));

            await expect(service.getReviewerWorkload('reviewer-1')).rejects.toThrow(
                'Database error'
            );
        });

        it('should handle invalid reviewer assignments', async () => {
            const review = TestFixtures.createMockManualReview();
            reviewRepo.findOne.mockResolvedValue(review);

            await expect(
                service.assignReview('review-1', 'invalid-reviewer', 'manager-1')
            ).rejects.toThrow();
        });
    });
});
