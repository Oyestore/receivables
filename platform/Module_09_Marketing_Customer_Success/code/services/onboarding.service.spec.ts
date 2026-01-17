import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OnboardingService } from './onboarding.service';
import { OnboardingWorkflow, OnboardingStatus } from '../entities/onboarding-workflow.entity';
import { OnboardingStep, StepStatus } from '../entities/onboarding-step.entity';
import { Repository } from 'typeorm';

const mockWorkflowRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
};

const mockStepRepository = {
    create: jest.fn(),
    save: jest.fn(),
};

describe('OnboardingService', () => {
    let service: OnboardingService;
    let workflowRepo: Repository<OnboardingWorkflow>;
    let stepRepo: Repository<OnboardingStep>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OnboardingService,
                {
                    provide: getRepositoryToken(OnboardingWorkflow),
                    useValue: mockWorkflowRepository,
                },
                {
                    provide: getRepositoryToken(OnboardingStep),
                    useValue: mockStepRepository,
                },
            ],
        }).compile();

        service = module.get<OnboardingService>(OnboardingService);
        workflowRepo = module.get<Repository<OnboardingWorkflow>>(getRepositoryToken(OnboardingWorkflow));
        stepRepo = module.get<Repository<OnboardingStep>>(getRepositoryToken(OnboardingStep));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('startOnboarding', () => {
        it('should start a new onboarding workflow', async () => {
            const customerId = 'cust-1';
            mockWorkflowRepository.findOne.mockResolvedValue(null);

            const newWorkflow = { customerId, status: OnboardingStatus.IN_PROGRESS, steps: [] };
            mockWorkflowRepository.create.mockReturnValue(newWorkflow);
            mockWorkflowRepository.save.mockResolvedValue(newWorkflow);
            mockStepRepository.create.mockReturnValue({});

            const result = await service.startOnboarding(customerId);

            expect(workflowRepo.create).toHaveBeenCalled();
            expect(workflowRepo.save).toHaveBeenCalled();
            expect(result.customerId).toBe(customerId);
        });
    });

    describe('completeStep', () => {
        it('should complete a step and update progress', async () => {
            const workflowId = 'wf-1';
            const stepId = 'step-1';

            const step = { id: stepId, status: StepStatus.PENDING };
            const workflow = {
                id: workflowId,
                steps: [step],
                progress: 0
            };

            mockWorkflowRepository.findOne.mockResolvedValue(workflow);
            mockStepRepository.save.mockResolvedValue({ ...step, status: StepStatus.COMPLETED });
            mockWorkflowRepository.save.mockResolvedValue({ ...workflow, progress: 100, status: OnboardingStatus.COMPLETED });

            const result = await service.completeStep(workflowId, stepId);

            expect(stepRepo.save).toHaveBeenCalled();
            expect(result.progress).toBe(100);
        });
    });
});
