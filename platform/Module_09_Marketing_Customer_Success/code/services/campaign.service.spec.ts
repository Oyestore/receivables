import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CampaignService } from './campaign.service';
import { Campaign, CampaignStatus, CampaignType } from '../entities/campaign.entity';
import { Repository } from 'typeorm';
import { EnhancedEmailService } from '../../../Module_02_Intelligent_Distribution/code/services/enhanced-email.service';

jest.mock('../../../Module_02_Intelligent_Distribution/code/services/enhanced-email.service', () => ({
    EnhancedEmailService: class MockEnhancedEmailService { }
}));

const mockCampaignRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
};

const mockEmailService = {
    getOptimalSendTime: jest.fn(),
};

describe('CampaignService', () => {
    let service: CampaignService;
    let repository: Repository<Campaign>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CampaignService,
                {
                    provide: getRepositoryToken(Campaign),
                    useValue: mockCampaignRepository,
                },
                {
                    provide: EnhancedEmailService,
                    useValue: mockEmailService,
                },
            ],
        }).compile();

        service = module.get<CampaignService>(CampaignService);
        repository = module.get<Repository<Campaign>>(getRepositoryToken(Campaign));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createCampaign', () => {
        it('should create a new campaign', async () => {
            const campaignData = {
                name: 'Test Campaign',
                type: CampaignType.EMAIL,
                targetAudience: {},
                content: {},
                createdBy: 'user-1',
            };

            const savedCampaign = { ...campaignData, id: '1', status: CampaignStatus.DRAFT };
            mockCampaignRepository.create.mockReturnValue(savedCampaign);
            mockCampaignRepository.save.mockResolvedValue(savedCampaign);

            const result = await service.createCampaign('tenant-1', 'user-1', campaignData);

            expect(repository.create).toHaveBeenCalled();
            expect(result.status).toBe(CampaignStatus.DRAFT);
        });
    });

    describe('launchCampaign', () => {
        it('should launch a draft campaign', async () => {
            const campaign = { id: '1', status: CampaignStatus.DRAFT };
            mockCampaignRepository.findOne.mockResolvedValue(campaign);
            mockCampaignRepository.save.mockResolvedValue({ ...campaign, status: CampaignStatus.RUNNING });

            const result = await service.launchCampaign('tenant-1', '1');

            expect(result.status).toBe(CampaignStatus.RUNNING);
        });

        it('should throw error if campaign is not draft/scheduled', async () => {
            const campaign = { id: '1', status: CampaignStatus.COMPLETED };
            mockCampaignRepository.findOne.mockResolvedValue(campaign);

            await expect(service.launchCampaign('tenant-1', '1')).rejects.toThrow();
        });
    });
});
