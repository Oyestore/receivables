import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ApprovalService } from '../../services/approval.service';
import { ApprovalWorkflow } from '../../entities/approval-workflow.entity';
import { ApprovalHistory } from '../../entities/approval-history.entity';
import { DisputeCase } from '../../entities/dispute-case.entity';

import { ApprovalWorkflowFactory } from '../../../test/factories/approval-workflow.factory';
import { DisputeCaseFactory } from '../../../test/factories/dispute-case.factory';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('ApprovalService', () => {
    let service: ApprovalService;
    let approvalWorkflowRepo: Repository<ApprovalWorkflow>;
    let approvalHistoryRepo: Repository<ApprovalHistory>;
    let disputeCaseRepo: Repository<DisputeCase>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApprovalService,
                {
                    provide: getRepositoryToken(ApprovalWorkflow),
                    useValue: createMockRepository(),
                },
                {
                    provide: getRepositoryToken(ApprovalHistory),
                    useValue: createMockRepository(),
                },
                {
                    provide: getRepositoryToken(DisputeCase),
                    useValue: createMockRepository(),
                },
            ],
        }).compile();

        service = module.get<ApprovalService>(ApprovalService);
        approvalWorkflowRepo = module.get(getRepositoryToken(ApprovalWorkflow));
        approvalHistoryRepo = module.get(getRepositoryToken(ApprovalHistory));
        disputeCaseRepo = module.get(getRepositoryToken(DisputeCase));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initializeWorkflow', () => {
        it('should initialize L1 workflow for amounts under 100k', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                amount: 50000,
                requiredLevel: 'L1',
            });

            jest.spyOn(service, 'determineRequiredLevel' as any).mockReturnValue('L1');
            jest.spyOn(approvalWorkflowRepo, 'save').mockResolvedValue(workflow);

            const result = await service.initializeWorkflow(
                'dispute-123',
                'tenant-456',
                50000,
                'Payment dispute',
                'user1'
            );

            expect(result.requiredLevel).toBe('L1');
            expect(result.currentLevel).toBe('L1');
            expect(result.status).toBe('pending');
        });

        it('should initialize L2 workflow for amounts 100k-500k', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                amount: 250000,
                requiredLevel: 'L2',
            });

            jest.spyOn(service, 'determineRequiredLevel' as any).mockReturnValue('L2');
            jest.spyOn(approvalWorkflowRepo, 'save').mockResolvedValue(workflow);

            const result = await service.initializeWorkflow(
                'dispute-123',
                'tenant-456',
                250000,
                'Large dispute',
                'user1'
            );

            expect(result.requiredLevel).toBe('L2');
        });

        it('should initialize L3 workflow for amounts over 500k', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                amount: 750000,
                requiredLevel: 'L3',
            });

            jest.spyOn(service, 'determineRequiredLevel' as any).mockReturnValue('L3');
            jest.spyOn(approvalWorkflowRepo, 'save').mockResolvedValue(workflow);

            const result = await service.initializeWorkflow(
                'dispute-123',
                'tenant-456',
                750000,
                'Critical dispute',
                'user1'
            );

            expect(result.requiredLevel).toBe('L3');
        });
    });

    describe('approve', () => {
        it('should approve L1 workflow and mark complete', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                requiredLevel: 'L1',
                currentLevel: 'L1',
                status: 'pending',
            });

            jest.spyOn(approvalWorkflowRepo, 'findOne').mockResolvedValue(workflow);
            jest.spyOn(approvalWorkflowRepo, 'save').mockResolvedValue({
                ...workflow,
                status: 'approved',
            });
            jest.spyOn(approvalHistoryRepo, 'save').mockResolvedValue({} as any);

            const result = await service.approve(
                'workflow-123',
                'tenant-456',
                'approver1',
                'Approved'
            );

            expect(result.status).toBe('approved');
            expect(approvalHistoryRepo.save).toHaveBeenCalled();
        });

        it('should advance to L2 after L1 approval for L2 workflows', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                requiredLevel: 'L2',
                currentLevel: 'L1',
                status: 'pending',
            });

            jest.spyOn(approvalWorkflowRepo, 'findOne').mockResolvedValue(workflow);
            jest.spyOn(approvalWorkflowRepo, 'save').mockResolvedValue({
                ...workflow,
                currentLevel: 'L2',
            });
            jest.spyOn(approvalHistoryRepo, 'save').mockResolvedValue({} as any);

            const result = await service.approve(
                'workflow-123',
                'tenant-456',
                'approver1',
                'Approved'
            );

            expect(result.currentLevel).toBe('L2');
            expect(result.status).toBe('pending');
        });

        it('should not allow approval if already approved', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                status: 'approved',
            });

            jest.spyOn(approvalWorkflowRepo, 'findOne').mockResolvedValue(workflow);

            await expect(
                service.approve('workflow-123', 'tenant-456', 'approver1', 'Notes')
            ).rejects.toThrow();
        });
    });

    describe('reject', () => {
        it('should reject workflow and mark as rejected', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                status: 'pending',
            });

            jest.spyOn(approvalWorkflowRepo, 'findOne').mockResolvedValue(workflow);
            jest.spyOn(approvalWorkflowRepo, 'save').mockResolvedValue({
                ...workflow,
                status: 'rejected',
            });
            jest.spyOn(approvalHistoryRepo, 'save').mockResolvedValue({} as any);

            const result = await service.reject(
                'workflow-123',
                'tenant-456',
                'approver1',
                'Not valid'
            );

            expect(result.status).toBe('rejected');
            expect(approvalHistoryRepo.save).toHaveBeenCalled();
        });

        it('should require reason for rejection', async () => {
            const workflow = ApprovalWorkflowFactory.create();
            jest.spyOn(approvalWorkflowRepo, 'findOne').mockResolvedValue(workflow);

            await expect(
                service.reject('workflow-123', 'tenant-456', 'approver1', '')
            ).rejects.toThrow();
        });
    });

    describe('delegate', () => {
        it('should delegate workflow to another approver', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                status: 'pending',
            });

            jest.spyOn(approvalWorkflowRepo, 'findOne').mockResolvedValue(workflow);
            jest.spyOn(approvalWorkflowRepo, 'save').mockResolvedValue(workflow);
            jest.spyOn(approvalHistoryRepo, 'save').mockResolvedValue({} as any);

            await service.delegate(
                'workflow-123',
                'tenant-456',
                'approver2',
                'delegator1',
                'Delegating to senior approver'
            );

            expect(approvalHistoryRepo.save).toHaveBeenCalled();
        });

        it('should not allow delegation of completed workflows', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                status: 'approved',
            });

            jest.spyOn(approvalWorkflowRepo, 'findOne').mockResolvedValue(workflow);

            await expect(
                service.delegate('workflow-123', 'tenant-456', 'approver2', 'delegator1', 'Reason')
            ).rejects.toThrow();
        });
    });

    describe('determineRequiredLevel', () => {
        it('should return L1 for amounts under 100k', () => {
            const level = service['determineRequiredLevel'](50000);
            expect(level).toBe('L1');
        });

        it('should return L2 for amounts 100k-500k', () => {
            const level = service['determineRequiredLevel'](250000);
            expect(level).toBe('L2');
        });

        it('should return L3 for amounts over 500k', () => {
            const level = service['determineRequiredLevel'](750000);
            expect(level).toBe('L3');
        });

        it('should handle edge case at 100k exactly', () => {
            const level = service['determineRequiredLevel'](100000);
            expect(level).toBe('L1');
        });

        it('should handle edge case at 500k exactly', () => {
            const level = service['determineRequiredLevel'](500000);
            expect(level).toBe('L2');
        });
    });

    describe('isApprovalComplete', () => {
        it('should return true when current level equals required level and approved', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                requiredLevel: 'L2',
                currentLevel: 'L2',
                status: 'approved',
            });

            const result = await service['isApprovalComplete'](workflow);
            expect(result).toBe(true);
        });

        it('should return false when levels match but status is pending', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                requiredLevel: 'L2',
                currentLevel: 'L2',
                status: 'pending',
            });

            const result = await service['isApprovalComplete'](workflow);
            expect(result).toBe(false);
        });

        it('should return false when current level is below required', async () => {
            const workflow = ApprovalWorkflowFactory.create({
                requiredLevel: 'L3',
                currentLevel: 'L2',
                status: 'approved',
            });

            const result = await service['isApprovalComplete'](workflow);
            expect(result).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should handle missing workflow gracefully', async () => {
            jest.spyOn(approvalWorkflowRepo, 'findOne').mockResolvedValue(null);

            await expect(
                service.approve('non-existent', 'tenant-456', 'approver1', 'Notes')
            ).rejects.toThrow();
        });

        it('should handle negative amounts', async () => {
            await expect(
                service.initializeWorkflow('dispute-123', 'tenant-456', -1000, 'Reason', 'user1')
            ).rejects.toThrow();
        });

        it('should handle zero amounts', async () => {
            await expect(
                service.initializeWorkflow('dispute-123', 'tenant-456', 0, 'Reason', 'user1')
            ).rejects.toThrow();
        });
    });
});
