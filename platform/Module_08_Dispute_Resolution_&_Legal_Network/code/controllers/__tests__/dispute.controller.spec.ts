import { Test, TestingModule } from '@nestjs/testing';
import { DisputeController } from '../dispute.controller';
import { DisputeManagementService } from '../../services/dispute-management.service';

describe('DisputeController', () => {
    let controller: DisputeController;
    let service: DisputeManagementService;

    const mockDisputeService = {
        createDispute: jest.fn(),
        findAllDisputes: jest.fn(),
        findDisputeById: jest.fn(),
        updateDisputeStatus: jest.fn(),
        assignDispute: jest.fn(),
        getDisputeStatistics: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DisputeController],
            providers: [
                {
                    provide: DisputeManagementService,
                    useValue: mockDisputeService,
                },
            ],
        }).compile();

        controller = module.get<DisputeController>(DisputeController);
        service = module.get<DisputeManagementService>(DisputeManagementService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /disputes', () => {
        it('should create new dispute', async () => {
            const createDto = {
                customerId: 'cust-123',
                invoiceId: 'inv-456',
                category: 'PAYMENT_DISPUTE',
                description: 'Payment not received',
            };

            const mockDispute = { id: '1', ...createDto, status: 'OPEN' };
            mockDisputeService.createDispute.mockResolvedValue(mockDispute);

            const result = await controller.createDispute(createDto as any, { user: { tenantId: 'tenant-1' } } as any);

            expect(result).toEqual(mockDispute);
            expect(service.createDispute).toHaveBeenCalledWith(createDto);
        });
    });

    describe('GET /disputes', () => {
        it('should return all disputes for tenant', async () => {
            const mockDisputes = [
                { id: '1', status: 'OPEN' },
                { id: '2', status: 'RESOLVED' },
            ];

            mockDisputeService.findAllDisputes.mockResolvedValue(mockDisputes);

            const result = await controller.getAllDisputes({ user: { tenantId: 'tenant-1' } } as any);

            expect(result).toEqual(mockDisputes);
            expect(service.findAllDisputes).toHaveBeenCalledWith('tenant-1', undefined);
        });

        it('should filter disputes by status', async () => {
            mockDisputeService.findAllDisputes.mockResolvedValue([{ id: '1', status: 'OPEN' }]);

            await controller.getAllDisputes({ user: { tenantId: 'tenant-1' } } as any, 'OPEN');

            expect(service.findAllDisputes).toHaveBeenCalledWith('tenant-1', { status: 'OPEN' });
        });
    });

    describe('GET /disputes/:id', () => {
        it('should return dispute by ID', async () => {
            const mockDispute = { id: '1', status: 'OPEN' };
            mockDisputeService.findDisputeById.mockResolvedValue(mockDispute);

            const result = await controller.getDisputeById('1', { user: { tenantId: 'tenant-1' } } as any);

            expect(result).toEqual(mockDispute);
        });

        it('should throw error if dispute not found', async () => {
            mockDisputeService.findDisputeById.mockResolvedValue(null);

            await expect(
                controller.getDisputeById('999', { user: { tenantId: 'tenant-1' } } as any),
            ).rejects.toThrow();
        });
    });

    describe('PATCH /disputes/:id/status', () => {
        it('should update dispute status', async () => {
            const mockDispute = { id: '1', status: 'RESOLVED' };
            mockDisputeService.updateDisputeStatus.mockResolvedValue(mockDispute);

            const result = await controller.updateStatus(
                '1',
                { status: 'RESOLVED' },
                { user: { tenantId: 'tenant-1' } } as any,
            );

            expect(result).toEqual(mockDispute);
            expect(service.updateDisputeStatus).toHaveBeenCalledWith('1', 'RESOLVED', 'tenant-1');
        });
    });

    describe('POST /disputes/:id/assign', () => {
        it('should assign dispute to agent', async () => {
            const mockDispute = { id: '1', assignedTo: 'agent-2' };
            mockDisputeService.assignDispute.mockResolvedValue(mockDispute);

            const result = await controller.assignDispute(
                '1',
                { agentId: 'agent-2' },
                { user: { tenantId: 'tenant-1' } } as any,
            );

            expect(result.assignedTo).toBe('agent-2');
        });
    });

    describe('GET /disputes/statistics', () => {
        it('should return dispute statistics', async () => {
            const mockStats = {
                total: 100,
                byStatus: { OPEN: 30, RESOLVED: 70 },
            };

            mockDisputeService.getDisputeStatistics.mockResolvedValue(mockStats);

            const result = await controller.getStatistics({ user: { tenantId: 'tenant-1' } } as any);

            expect(result).toEqual(mockStats);
        });
    });
});
