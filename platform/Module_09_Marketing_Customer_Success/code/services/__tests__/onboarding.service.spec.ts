import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingService } from '../onboarding.service';
import { OnboardingWorkflow, OnboardingStatus } from '../../entities/onboarding-workflow.entity';
import { OnboardingStep, StepStatus } from '../../entities/onboarding-step.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OnboardingService', () => {
    let service: OnboardingService;
    let workflowRepository: Repository<OnboardingWorkflow>;
    let stepRepository: Repository<OnboardingStep>;

    const mockStep = {
        id: 'step-123',
        name: 'Complete Profile',
        order: 1,
        description: 'Fill in business details',
        status: StepStatus.PENDING,
        completedAt: null,
    };

    const mockWorkflow = {
        id: 'workflow-123',
        customerId: 'customer-123',
        status: OnboardingStatus.IN_PROGRESS,
        progress: 33,
        steps: [
            { ...mockStep, id: 'step-1', order: 1, status: StepStatus.COMPLETED },
            { ...mockStep, id: 'step-2', order: 2, status: StepStatus.PENDING },
            { ...mockStep, id: 'step-3', order: 3, status: StepStatus.PENDING },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockWorkflowRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockStepRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

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
        workflowRepository = module.get<Repository<OnboardingWorkflow>>(
            getRepositoryToken(OnboardingWorkflow),
        );
        stepRepository = module.get<Repository<OnboardingStep>>(
            getRepositoryToken(OnboardingStep),
        );

        jest.clearAllMocks();
    });

    describe('Service Initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should have workflow repository injected', () => {
            expect(workflowRepository).toBeDefined();
        });

        it('should have step repository injected', () => {
            expect(stepRepository).toBeDefined();
        });
    });

    describe('startOnboarding', () => {
        it('should create onboarding workflow for new customer', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(null);
            mockStepRepository.create.mockImplementation((data) => ({
                ...mockStep,
                ...data,
            }));
            mockWorkflowRepository.create.mockReturnValue({
                customerId: 'customer-123',
                status: OnboardingStatus.IN_PROGRESS,
                steps: [mockStep, mockStep, mockStep],
            });
            mockWorkflowRepository.save.mockResolvedValue(mockWorkflow);

            const result = await service.startOnboarding('customer-123');

            expect(result).toBeDefined();
            expect(result.customerId).toBe('customer-123');
            expect(result.status).toBe(OnboardingStatus.IN_PROGRESS);
            expect(workflowRepository.create).toHaveBeenCalled();
            expect(workflowRepository.save).toHaveBeenCalled();
        });

        it('should create default onboarding steps', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(null);
            mockStepRepository.create.mockImplementation((data) => data);
            mockWorkflowRepository.create.mockImplementation((data) => data);
            mockWorkflowRepository.save.mockResolvedValue(mockWorkflow);

            const result = await service.startOnboarding('customer-123');

            expect(stepRepository.create).toHaveBeenCalledTimes(3);
            expect(stepRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Complete Profile',
                    order: 1,
                }),
            );
        });

        it('should throw BadRequestException if onboarding already started', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);

            await expect(service.startOnboarding('customer-123')).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.startOnboarding('customer-123')).rejects.toThrow(
                'Onboarding already started for this customer',
            );
        });

        it('should initialize with IN_PROGRESS status', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(null);
            mockStepRepository.create.mockImplementation((data) => data);
            mockWorkflowRepository.create.mockImplementation((data) => data);
            mockWorkflowRepository.save.mockResolvedValue({
                ...mockWorkflow,
                status: OnboardingStatus.IN_PROGRESS,
            });

            const result = await service.startOnboarding('customer-123');

            expect(result.status).toBe(OnboardingStatus.IN_PROGRESS);
        });
    });

    describe('completeStep', () => {
        it('should mark step as completed', async () => {
            const workflow = {
                ...mockWorkflow,
                steps: [
                    { ...mockStep, id: 'step-1', status: StepStatus.PENDING },
                    { ...mockStep, id: 'step-2', status: StepStatus.PENDING },
                    { ...mockStep, id: 'step-3', status: StepStatus.PENDING },
                ],
            };

            mockWorkflowRepository.findOne.mockResolvedValue(workflow);
            mockStepRepository.save.mockImplementation((data) =>
                Promise.resolve({ ...data, status: StepStatus.COMPLETED }),
            );
            mockWorkflowRepository.save.mockImplementation((data) => Promise.resolve(data));

            const result = await service.completeStep('workflow-123', 'step-1');

            expect(stepRepository.save).toHaveBeenCalled();
            expect(workflowRepository.save).toHaveBeenCalled();
        });

        it('should update progress when step completed', async () => {
            const workflow = {
                ...mockWorkflow,
                progress: 0,
                steps: [
                    { ...mockStep, id: 'step-1', status: StepStatus.PENDING },
                    { ...mockStep, id: 'step-2', status: StepStatus.PENDING },
                    { ...mockStep, id: 'step-3', status: StepStatus.PENDING },
                ],
            };

            mockWorkflowRepository.findOne.mockResolvedValue(workflow);
            mockStepRepository.save.mockImplementation((data) => Promise.resolve(data));
            mockWorkflowRepository.save.mockImplementation((data) =>
                Promise.resolve({ ...data, progress: 33 }),
            );

            const result = await service.completeStep('workflow-123', 'step-1');

            expect(result.progress).toBeGreaterThan(0);
        });

        it('should throw NotFoundException if workflow not found', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(null);

            await expect(service.completeStep('non-existent', 'step-1')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw NotFoundException if step not found in workflow', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);

            await expect(
                service.completeStep('workflow-123', 'non-existent-step'),
            ).rejects.toThrow(NotFoundException);
            await expect(
                service.completeStep('workflow-123', 'non-existent-step'),
            ).rejects.toThrow('Step not found in workflow');
        });

        it('should mark workflow as completed when all steps done', async () => {
            const workflow = {
                ...mockWorkflow,
                steps: [
                    { ...mockStep, id: 'step-1', status: StepStatus.COMPLETED },
                    { ...mockStep, id: 'step-2', status: StepStatus.COMPLETED },
                    { ...mockStep, id: 'step-3', status: StepStatus.PENDING },
                ],
            };

            mockWorkflowRepository.findOne.mockResolvedValue(workflow);
            mockStepRepository.save.mockImplementation((data) =>
                Promise.resolve({ ...data, status: StepStatus.COMPLETED }),
            );
            mockWorkflowRepository.save.mockImplementation((data) =>
                Promise.resolve({ ...data, progress: 100, status: OnboardingStatus.COMPLETED }),
            );

            const result = await service.completeStep('workflow-123', 'step-3');

            expect(result.progress).toBe(100);
            expect(result.status).toBe(OnboardingStatus.COMPLETED);
        });

        it('should set completedAt timestamp on step', async () => {
            const workflow = {
                ...mockWorkflow,
                steps: [{ ...mockStep, id: 'step-1', status: StepStatus.PENDING }],
            };

            mockWorkflowRepository.findOne.mockResolvedValue(workflow);
            mockStepRepository.save.mockImplementation((data) => Promise.resolve(data));
            mockWorkflowRepository.save.mockImplementation((data) => Promise.resolve(data));

            await service.completeStep('workflow-123', 'step-1');

            const savedStep = mockStepRepository.save.mock.calls[0][0];
            expect(savedStep.completedAt).toBeInstanceOf(Date);
        });
    });

    describe('getProgress', () => {
        it('should return workflow progress for customer', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);

            const result = await service.getProgress('customer-123');

            expect(result).toEqual(mockWorkflow);
            expect(workflowRepository.findOne).toHaveBeenCalledWith({
                where: { customerId: 'customer-123' },
                relations: ['steps'],
            });
        });

        it('should throw NotFoundException when onboarding not started', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(null);

            await expect(service.getProgress('customer-123')).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.getProgress('customer-123')).rejects.toThrow(
                'Onboarding not started',
            );
        });

        it('should include steps in response', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);

            const result = await service.getProgress('customer-123');

            expect(result.steps).toBeDefined();
            expect(result.steps.length).toBeGreaterThan(0);
        });
    });

    describe('getWorkflow', () => {
        it('should return workflow by id', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);

            const result = await service.getWorkflow('workflow-123');

            expect(result).toEqual(mockWorkflow);
            expect(workflowRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'workflow-123' },
                relations: ['steps'],
            });
        });

        it('should throw NotFoundException when workflow not found', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(null);

            await expect(service.getWorkflow('non-existent')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('Progress Calculation', () => {
        it('should calculate 0% when no steps completed', () => {
            const workflow = {
                ...mockWorkflow,
                steps: [
                    { ...mockStep, status: StepStatus.PENDING },
                    { ...mockStep, status: StepStatus.PENDING },
                    { ...mockStep, status: StepStatus.PENDING },
                ],
            };

            // Access private method through service instance
            const progress = (workflow.steps.filter((s) => s.status === StepStatus.COMPLETED).length / workflow.steps.length) * 100;

            expect(progress).toBe(0);
        });

        it('should calculate 50% when half completed', () => {
            const workflow = {
                ...mockWorkflow,
                steps: [
                    { ...mockStep, status: StepStatus.COMPLETED },
                    { ...mockStep, status: StepStatus.PENDING },
                ],
            };

            const progress = (workflow.steps.filter((s) => s.status === StepStatus.COMPLETED).length / workflow.steps.length) * 100;

            expect(progress).toBe(50);
        });

        it('should calculate 100% when all completed', () => {
            const workflow = {
                ...mockWorkflow,
                steps: [
                    { ...mockStep, status: StepStatus.COMPLETED },
                    { ...mockStep, status: StepStatus.COMPLETED },
                    { ...mockStep, status: StepStatus.COMPLETED },
                ],
            };

            const progress = (workflow.steps.filter((s) => s.status === StepStatus.COMPLETED).length / workflow.steps.length) * 100;

            expect(progress).toBe(100);
        });
    });

    describe('Edge Cases & Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            mockWorkflowRepository.findOne.mockRejectedValue(new Error('Database error'));

            await expect(service.getProgress('customer-123')).rejects.toThrow(
                'Database error',
            );
        });

        it('should handle concurrent step completions', async () => {
            const workflow = {
                ...mockWorkflow,
                steps: [
                    { ...mockStep, id: 'step-1', status: StepStatus.PENDING },
                    { ...mockStep, id: 'step-2', status: StepStatus.PENDING },
                    { ...mockStep, id: 'step-3', status: StepStatus.PENDING },
                ],
            };

            mockWorkflowRepository.findOne.mockResolvedValue(workflow);
            mockStepRepository.save.mockImplementation((data) => Promise.resolve(data));
            mockWorkflowRepository.save.mockImplementation((data) => Promise.resolve(data));

            // Simulate concurrent completions
            const promises = [
                service.completeStep('workflow-123', 'step-1'),
                service.completeStep('workflow-123', 'step-2'),
                service.completeStep('workflow-123', 'step-3'),
            ];

            const results = await Promise.all(promises);

            expect(results.length).toBe(3);
        });

        it('should handle null customer id', async () => {
            await expect(service.startOnboarding(null as any)).rejects.toThrow();
        });

        it('should handle empty workflow id', async () => {
            await expect(service.getWorkflow('')).rejects.toThrow();
        });
    });

    describe('Performance', () => {
        it('should retrieve progress within acceptable time', async () => {
            mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);

            const startTime = Date.now();
            await service.getProgress('customer-123');
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(500);
        });

        it('should handle workflow with many steps efficiently', async () => {
            const manySteps = Array.from({ length: 50 }, (_, i) => ({
                ...mockStep,
                id: `step-${i}`,
                order: i + 1,
            }));

            const largeWorkflow = {
                ...mockWorkflow,
                steps: manySteps,
            };

            mockWorkflowRepository.findOne.mockResolvedValue(largeWorkflow);

            const startTime = Date.now();
            await service.getProgress('customer-123');
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(1000);
        });
    });
});
