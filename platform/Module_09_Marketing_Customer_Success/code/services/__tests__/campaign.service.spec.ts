import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignService } from '../campaign.service';
import { Campaign } from '../../entities/campaign.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('CampaignService', () => {
    let service: CampaignService;
    let repository: Repository<Campaign>;
    let eventEmitter: EventEmitter2;

    const mockCampaign = {
        id: 'campaign-123',
        tenantId: 'tenant-123',
        name: 'Test Campaign',
        type: 'email',
        status: 'draft',
        targetAudience: 'all',
        startDate: new Date('2026-01-20'),
        endDate: new Date('2026-02-20'),
        budget: 50000,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CampaignService,
                {
                    provide: getRepositoryToken(Campaign),
                    useValue: mockRepository,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<CampaignService>(CampaignService);
        repository = module.get<Repository<Campaign>>(getRepositoryToken(Campaign));
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);

        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Service Initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should have repository injected', () => {
            expect(repository).toBeDefined();
        });

        it('should have event emitter injected', () => {
            expect(eventEmitter).toBeDefined();
        });
    });

    describe('createCampaign', () => {
        const createDto = {
            tenantId: 'tenant-123',
            name: 'Test Campaign',
            type: 'email' as const,
            targetAudience: 'all',
            startDate: new Date('2026-01-20'),
            endDate: new Date('2026-02-20'),
            budget: 50000,
            createdBy: 'user-123',
        };

        it('should create a campaign successfully', async () => {
            mockRepository.create.mockReturnValue(mockCampaign);
            mockRepository.save.mockResolvedValue(mockCampaign);

            const result = await service.createCampaign(createDto);

            expect(repository.create).toHaveBeenCalledWith({
                ...createDto,
                status: 'draft',
            });
            expect(repository.save).toHaveBeenCalledWith(mockCampaign);
            expect(eventEmitter.emit).toHaveBeenCalledWith('campaign.created', {
                campaignId: mockCampaign.id,
                tenantId: mockCampaign.tenantId,
                name: mockCampaign.name,
            });
            expect(result).toEqual(mockCampaign);
        });

        it('should validate start date is before end date', async () => {
            const invalidDto = {
                ...createDto,
                startDate: new Date('2026-02-20'),
                endDate: new Date('2026-01-20'),
            };

            await expect(service.createCampaign(invalidDto)).rejects.toThrow(
                BadRequestException,
            );
            expect(repository.save).not.toHaveBeenCalled();
        });

        it('should validate budget is positive', async () => {
            const invalidDto = {
                ...createDto,
                budget: -1000,
            };

            await expect(service.createCampaign(invalidDto)).rejects.toThrow(
                BadRequestException,
            );
            expect(repository.save).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            mockRepository.create.mockReturnValue(mockCampaign);
            mockRepository.save.mockRejectedValue(new Error('Database error'));

            await expect(service.createCampaign(createDto)).rejects.toThrow(
                'Database error',
            );
        });

        it('should set default values correctly', async () => {
            const minimalDto = {
                tenantId: 'tenant-123',
                name: 'Minimal Campaign',
                type: 'email' as const,
                createdBy: 'user-123',
            };

            mockRepository.create.mockReturnValue({
                ...minimalDto,
                status: 'draft',
                targetAudience: 'all',
            });
            mockRepository.save.mockResolvedValue({
                ...minimalDto,
                status: 'draft',
                targetAudience: 'all',
                id: 'campaign-456',
            });

            const result = await service.createCampaign(minimalDto);

            expect(result.status).toBe('draft');
        });
    });

    describe('getCampaigns', () => {
        const campaigns = [mockCampaign, { ...mockCampaign, id: 'campaign-456' }];

        it('should return all campaigns for a tenant', async () => {
            mockRepository.find.mockResolvedValue(campaigns);

            const result = await service.getCampaigns('tenant-123');

            expect(repository.find).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-123' },
                order: { createdAt: 'DESC' },
            });
            expect(result).toEqual(campaigns);
        });

        it('should filter campaigns by status', async () => {
            const activeCampaigns = [mockCampaign];
            mockRepository.find.mockResolvedValue(activeCampaigns);

            const result = await service.getCampaigns('tenant-123', { status: 'draft' });

            expect(repository.find).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-123', status: 'draft' },
                order: { createdAt: 'DESC' },
            });
            expect(result).toEqual(activeCampaigns);
        });

        it('should filter campaigns by type', async () => {
            mockRepository.find.mockResolvedValue([mockCampaign]);

            const result = await service.getCampaigns('tenant-123', { type: 'email' });

            expect(repository.find).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-123', type: 'email' },
                order: { createdAt: 'DESC' },
            });
        });

        it('should return empty array when no campaigns exist', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await service.getCampaigns('tenant-123');

            expect(result).toEqual([]);
        });

        it('should handle database errors', async () => {
            mockRepository.find.mockRejectedValue(new Error('Database error'));

            await expect(service.getCampaigns('tenant-123')).rejects.toThrow(
                'Database error',
            );
        });
    });

    describe('getCampaignById', () => {
        it('should return a campaign by id', async () => {
            mockRepository.findOne.mockResolvedValue(mockCampaign);

            const result = await service.getCampaignById('campaign-123', 'tenant-123');

            expect(repository.findOne).toHaveBeenCalledWith({
                where: { id: 'campaign-123', tenantId: 'tenant-123' },
            });
            expect(result).toEqual(mockCampaign);
        });

        it('should throw NotFoundException when campaign not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.getCampaignById('non-existent', 'tenant-123'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should enforce tenant isolation', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.getCampaignById('campaign-123', 'wrong-tenant'),
            ).rejects.toThrow(NotFoundException);

            expect(repository.findOne).toHaveBeenCalledWith({
                where: { id: 'campaign-123', tenantId: 'wrong-tenant' },
            });
        });
    });

    describe('updateCampaign', () => {
        const updateDto = {
            name: 'Updated Campaign',
            budget: 60000,
        };

        it('should update a campaign successfully', async () => {
            const updatedCampaign = { ...mockCampaign, ...updateDto };
            mockRepository.findOne.mockResolvedValue(mockCampaign);
            mockRepository.save.mockResolvedValue(updatedCampaign);

            const result = await service.updateCampaign(
                'campaign-123',
                'tenant-123',
                updateDto,
                'user-123',
            );

            expect(repository.findOne).toHaveBeenCalled();
            expect(repository.save).toHaveBeenCalled();
            expect(eventEmitter.emit).toHaveBeenCalledWith('campaign.updated', {
                campaignId: 'campaign-123',
                tenantId: 'tenant-123',
                changes: updateDto,
            });
            expect(result).toEqual(updatedCampaign);
        });

        it('should throw NotFoundException when campaign not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.updateCampaign('non-existent', 'tenant-123', updateDto, 'user-123'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should prevent updating active campaigns to invalid states', async () => {
            const activeCampaign = { ...mockCampaign, status: 'active' };
            mockRepository.findOne.mockResolvedValue(activeCampaign);

            await expect(
                service.updateCampaign(
                    'campaign-123',
                    'tenant-123',
                    { startDate: new Date('2025-01-01') },
                    'user-123',
                ),
            ).rejects.toThrow(BadRequestException);
        });

        it('should validate date changes', async () => {
            mockRepository.findOne.mockResolvedValue(mockCampaign);

            const invalidUpdate = {
                startDate: new Date('2026-02-20'),
                endDate: new Date('2026-01-20'),
            };

            await expect(
                service.updateCampaign('campaign-123', 'tenant-123', invalidUpdate, 'user-123'),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('deleteCampaign', () => {
        it('should delete a draft campaign successfully', async () => {
            mockRepository.findOne.mockResolvedValue(mockCampaign);
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

            await service.deleteCampaign('campaign-123', 'tenant-123');

            expect(repository.delete).toHaveBeenCalledWith({
                id: 'campaign-123',
                tenantId: 'tenant-123',
            });
            expect(eventEmitter.emit).toHaveBeenCalledWith('campaign.deleted', {
                campaignId: 'campaign-123',
                tenantId: 'tenant-123',
            });
        });

        it('should throw NotFoundException when campaign not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.deleteCampaign('non-existent', 'tenant-123'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should prevent deleting active campaigns', async () => {
            const activeCampaign = { ...mockCampaign, status: 'active' };
            mockRepository.findOne.mockResolvedValue(activeCampaign);

            await expect(
                service.deleteCampaign('campaign-123', 'tenant-123'),
            ).rejects.toThrow(BadRequestException);

            expect(repository.delete).not.toHaveBeenCalled();
        });

        it('should prevent deleting completed campaigns', async () => {
            const completedCampaign = { ...mockCampaign, status: 'completed' };
            mockRepository.findOne.mockResolvedValue(completedCampaign);

            await expect(
                service.deleteCampaign('campaign-123', 'tenant-123'),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('launchCampaign', () => {
        it('should launch a draft campaign successfully', async () => {
            mockRepository.findOne.mockResolvedValue(mockCampaign);
            const launchedCampaign = { ...mockCampaign, status: 'active' };
            mockRepository.save.mockResolvedValue(launchedCampaign);

            const result = await service.launchCampaign('campaign-123', 'tenant-123', 'user-123');

            expect(repository.save).toHaveBeenCalled();
            expect(eventEmitter.emit).toHaveBeenCalledWith('campaign.launched', {
                campaignId: 'campaign-123',
                tenantId: 'tenant-123',
                launchedBy: 'user-123',
            });
            expect(result.status).toBe('active');
        });

        it('should throw if campaign not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.launchCampaign('non-existent', 'tenant-123', 'user-123'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw if campaign already active', async () => {
            const activeCampaign = { ...mockCampaign, status: 'active' };
            mockRepository.findOne.mockResolvedValue(activeCampaign);

            await expect(
                service.launchCampaign('campaign-123', 'tenant-123', 'user-123'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should validate campaign has required fields', async () => {
            const incompleteCampaign = { ...mockCampaign, targetAudience: null };
            mockRepository.findOne.mockResolvedValue(incompleteCampaign);

            await expect(
                service.launchCampaign('campaign-123', 'tenant-123', 'user-123'),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('pauseCampaign', () => {
        const activeCampaign = { ...mockCampaign, status: 'active' };

        it('should pause an active campaign successfully', async () => {
            mockRepository.findOne.mockResolvedValue(activeCampaign);
            const pausedCampaign = { ...activeCampaign, status: 'paused' };
            mockRepository.save.mockResolvedValue(pausedCampaign);

            const result = await service.pauseCampaign('campaign-123', 'tenant-123', 'user-123');

            expect(result.status).toBe('paused');
            expect(eventEmitter.emit).toHaveBeenCalledWith('campaign.paused', {
                campaignId: 'campaign-123',
                tenantId: 'tenant-123',
                pausedBy: 'user-123',
            });
        });

        it('should throw if campaign not active', async () => {
            mockRepository.findOne.mockResolvedValue(mockCampaign);

            await expect(
                service.pauseCampaign('campaign-123', 'tenant-123', 'user-123'),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('getCampaignStatistics', () => {
        it('should return campaign statistics', async () => {
            mockRepository.count.mockResolvedValue(10);
            mockRepository.find.mockResolvedValue([
                { ...mockCampaign, status: 'active' },
                { ...mockCampaign, status: 'draft' },
            ]);

            const result = await service.getCampaignStatistics('tenant-123');

            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('active');
            expect(result).toHaveProperty('draft');
            expect(result).toHaveProperty('completed');
        });

        it('should handle empty statistics', async () => {
            mockRepository.count.mockResolvedValue(0);
            mockRepository.find.mockResolvedValue([]);

            const result = await service.getCampaignStatistics('tenant-123');

            expect(result.total).toBe(0);
            expect(result.active).toBe(0);
        });
    });

    describe('Edge Cases & Error Handling', () => {
        it('should handle null tenantId', async () => {
            await expect(service.getCampaigns(null as any)).rejects.toThrow();
        });

        it('should handle undefined campaignId', async () => {
            await expect(
                service.getCampaignById(undefined as any, 'tenant-123'),
            ).rejects.toThrow();
        });

        it('should handle concurrent updates gracefully', async () => {
            mockRepository.findOne.mockResolvedValue(mockCampaign);
            mockRepository.save.mockRejectedValue(new Error('Optimistic lock failed'));

            await expect(
                service.updateCampaign('campaign-123', 'tenant-123', { name: 'New' }, 'user-123'),
            ).rejects.toThrow();
        });

        it('should validate campaign name length', async () => {
            const longName = 'a'.repeat(256);
            const invalidDto = {
                tenantId: 'tenant-123',
                name: longName,
                type: 'email' as const,
                createdBy: 'user-123',
            };

            await expect(service.createCampaign(invalidDto)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should handle special characters in campaign name', async () => {
            const specialCharDto = {
                tenantId: 'tenant-123',
                name: 'Test<script>alert("xss")</script>',
                type: 'email' as const,
                createdBy: 'user-123',
            };

            mockRepository.create.mockReturnValue({ ...mockCampaign, name: specialCharDto.name });
            mockRepository.save.mockResolvedValue({ ...mockCampaign, name: specialCharDto.name });

            const result = await service.createCampaign(specialCharDto);

            // Should sanitize or escape special characters
            expect(result.name).toBeDefined();
        });
    });

    describe('Performance & Scalability', () => {
        it('should handle large number of campaigns efficiently', async () => {
            const largeCampaignList = Array.from({ length: 1000 }, (_, i) => ({
                ...mockCampaign,
                id: `campaign-${i}`,
            }));

            mockRepository.find.mockResolvedValue(largeCampaignList);

            const startTime = Date.now();
            const result = await service.getCampaigns('tenant-123');
            const endTime = Date.now();

            expect(result.length).toBe(1000);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
        });
    });
});
