import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WorkflowEngineService } from '../../services/workflow-engine.service';
import { WorkflowState } from '../../entities/workflow-state.entity';
import { WorkflowTransition } from '../../entities/workflow-transition.entity';
import { DisputeCase } from '../../entities/dispute-case.entity';

import { WorkflowStateFactory } from '../../../test/factories/workflow-state.factory';
import { DisputeCaseFactory } from '../../../test/factories/dispute-case.factory';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('WorkflowEngineService', () => {
    let service: WorkflowEngineService;
    let workflowStateRepo: Repository<WorkflowState>;
    let workflowTransitionRepo: Repository<WorkflowTransition>;
    let disputeCaseRepo: Repository<DisputeCase>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkflowEngineService,
                {
                    provide: getRepositoryToken(WorkflowState),
                    useValue: createMockRepository(),
                },
                {
                    provide: getRepositoryToken(WorkflowTransition),
                    useValue: createMockRepository(),
                },
                {
                    provide: getRepositoryToken(DisputeCase),
                    useValue: createMockRepository(),
                },
            ],
        }).compile();

        service = module.get<WorkflowEngineService>(WorkflowEngineService);
        workflowStateRepo = module.get(getRepositoryToken(WorkflowState));
        workflowTransitionRepo = module.get(getRepositoryToken(WorkflowTransition));
        disputeCaseRepo = module.get(getRepositoryToken(DisputeCase));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initializeWorkflow', () => {
        it('should create initial workflow state', async () => {
            const disputeId = 'dispute-123';
            const tenantId = 'tenant-456';
            const mockState = WorkflowStateFactory.create({
                disputeId,
                tenantId,
                stateType: 'Draft',
            });

            jest.spyOn(workflowStateRepo, 'findOne').mockResolvedValue(null);
            jest.spyOn(workflowStateRepo, 'save').mockResolvedValue(mockState);

            const result = await service.initializeWorkflow(
                disputeId,
                tenantId,
                'Draft',
                'user1'
            );

            expect(result.stateType).toBe('Draft');
            expect(result.disputeId).toBe(disputeId);
            expect(result.tenantId).toBe(tenantId);
            expect(workflowStateRepo.save).toHaveBeenCalledTimes(1);
        });

        it('should throw error if workflow already exists', async () => {
            const existingState = WorkflowStateFactory.create();
            jest.spyOn(workflowStateRepo, 'findOne').mockResolvedValue(existingState);

            await expect(
                service.initializeWorkflow('dispute-123', 'tenant-456', 'Draft', 'user1')
            ).rejects.toThrow();
        });

        it('should initialize with correct timestamps', async () => {
            const mockState = WorkflowStateFactory.create();
            jest.spyOn(workflowStateRepo, 'findOne').mockResolvedValue(null);
            jest.spyOn(workflowStateRepo, 'save').mockResolvedValue(mockState);

            const result = await service.initializeWorkflow(
                'dispute-123',
                'tenant-456',
                'Draft',
                'user1'
            );

            expect(result.enteredAt).toBeDefined();
            expect(result.enteredBy).toBe('user1');
        });
    });

    describe('transition', () => {
        it('should transition to valid next state', async () => {
            const currentState = WorkflowStateFactory.create({ stateType: 'Draft' });
            const newState = WorkflowStateFactory.create({ stateType: 'Filed' });

            jest.spyOn(workflowStateRepo, 'findOne').mockResolvedValue(currentState);
            jest.spyOn(service, 'validateTransition' as any).mockResolvedValue(true);
            jest.spyOn(workflowStateRepo, 'save').mockResolvedValue(newState);

            const result = await service.transition(
                'dispute-123',
                'tenant-456',
                'Filed',
                'user1'
            );

            expect(result.stateType).toBe('Filed');
            expect(workflowStateRepo.save).toHaveBeenCalled();
        });

        it('should not transition to invalid state', async () => {
            const currentState = WorkflowStateFactory.create({ stateType: 'Draft' });

            jest.spyOn(workflowStateRepo, 'findOne').mockResolvedValue(currentState);
            jest.spyOn(service, 'validateTransition' as any).mockResolvedValue(false);

            await expect(
                service.transition('dispute-123', 'tenant-456', 'InvalidState', 'user1')
            ).rejects.toThrow();
        });

        it('should create transition record in history', async () => {
            const currentState = WorkflowStateFactory.create({ stateType: 'Draft' });
            const newState = WorkflowStateFactory.create({ stateType: 'Filed' });

            jest.spyOn(workflowStateRepo, 'findOne').mockResolvedValue(currentState);
            jest.spyOn(service, 'validateTransition' as any).mockResolvedValue(true);
            jest.spyOn(workflowStateRepo, 'save').mockResolvedValue(newState);
            jest.spyOn(workflowTransitionRepo, 'save').mockResolvedValue({} as any);

            await service.transition('dispute-123', 'tenant-456', 'Filed', 'user1');

            expect(workflowTransitionRepo.save).toHaveBeenCalled();
        });
    });

    describe('getAvailableTransitions', () => {
        it('should return valid transition states', async () => {
            const currentState = WorkflowStateFactory.create({ stateType: 'Draft' });
            jest.spyOn(workflowStateRepo, 'findOne').mockResolvedValue(currentState);

            const result = await service.getAvailableTransitions('dispute-123', 'tenant-456');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return empty array for terminal states', async () => {
            const finalState = WorkflowStateFactory.create({ stateType: 'Resolved' });
            jest.spyOn(workflowStateRepo, 'findOne').mockResolvedValue(finalState);

            const result = await service.getAvailableTransitions('dispute-123', 'tenant-456');

            expect(result).toEqual([]);
        });
    });

    describe('getCurrentState', () => {
        it('should return current workflow state', async () => {
            const mockState = WorkflowStateFactory.create();
            jest.spyOn(workflowStateRepo, 'findOne').mockResolvedValue(mockState);

            const result = await service.getCurrentState('dispute-123', 'tenant-456');

            expect(result).toEqual(mockState);
            expect(workflowStateRepo.findOne).toHaveBeenCalledWith({
                where: { disputeId: 'dispute-123', tenantId: 'tenant-456' },
            });
        });

        it('should return null for non-existent workflow', async () => {
            jest.spyOn(workflowStateRepo, 'findOne').mockResolvedValue(null);

            const result = await service.getCurrentState('non-existent', 'tenant-456');

            expect(result).toBeNull();
        });
    });

    describe('evaluateConditions', () => {
        it('should return true when all conditions are met', async () => {
            const dispute = DisputeCaseFactory.create({
                disputedAmount: 100000,
                status: 'filed',
            });

            jest.spyOn(disputeCaseRepo, 'findOne').mockResolvedValue(dispute);

            const conditions = [
                { field: 'disputedAmount', operator: 'gte', value: 50000 },
                { field: 'status', operator: 'eq', value: 'filed' },
            ];

            const result = await service['evaluateConditions'](
                'dispute-123',
                'tenant-456',
                conditions
            );

            expect(result).toBe(true);
        });

        it('should return false when conditions are not met', async () => {
            const dispute = DisputeCaseFactory.create({
                disputedAmount: 10000,
                status: 'draft',
            });

            jest.spyOn(disputeCaseRepo, 'findOne').mockResolvedValue(dispute);

            const conditions = [
                { field: 'disputedAmount', operator: 'gte', value: 50000 },
            ];

            const result = await service['evaluateConditions'](
                'dispute-123',
                'tenant-456',
                conditions
            );

            expect(result).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should handle missing dispute ID gracefully', async () => {
            await expect(
                service.initializeWorkflow('', 'tenant-456', 'Draft', 'user1')
            ).rejects.toThrow();
        });

        it('should handle missing tenant ID gracefully', async () => {
            await expect(
                service.initializeWorkflow('dispute-123', '', 'Draft', 'user1')
            ).rejects.toThrow();
        });

        it('should handle database errors gracefully', async () => {
            jest.spyOn(workflowStateRepo, 'findOne').mockRejectedValue(new Error('Database error'));

            await expect(
                service.getCurrentState('dispute-123', 'tenant-456')
            ).rejects.toThrow('Database error');
        });
    });
});
