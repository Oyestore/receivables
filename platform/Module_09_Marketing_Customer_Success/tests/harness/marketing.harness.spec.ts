
import { Test, TestingModule } from '@nestjs/testing';
import { CampaignService, CampaignType } from '../../code/services/campaign.service';
import { GamificationService } from '../../code/services/gamification.service';
import { Campaign, CampaignStatus } from '../../code/entities/campaign.entity';
import { GamificationPoints, UserLevel, Achievement, UserAchievement, PointEventType } from '../../code/entities/gamification.entity';
import { EnhancedEmailService } from '../../../Module_02_Intelligent_Distribution/code/services/enhanced-email.service';
import { NotificationService } from '../../../Module_11_Common/src/services/notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Deterministic Harness for Marketing & Customer Success (Module 09)
 * 
 * Scenarios:
 * 1. Campaign Lifecycle (Create -> Launch -> Execute)
 * 2. Gamification (Points -> Level Up -> Achievements)
 */
describe('Marketing Module Harness', () => {
    let campaignService: CampaignService;
    let gamificationService: GamificationService;
    
    // Repos
    let campaignRepo: Repository<Campaign>;
    let pointsRepo: Repository<GamificationPoints>;
    let userLevelRepo: Repository<UserLevel>;

    // Mocks
    const mockCampaignRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
    };

    const mockPointsRepo = {
        create: jest.fn(),
        save: jest.fn(),
        count: jest.fn(),
    };

    const mockUserLevelRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
    };

    const mockAchievementRepo = {
        find: jest.fn().mockResolvedValue([]),
    };

    const mockUserAchievementRepo = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockEmailService = {};
    const mockNotificationService = {
        sendEmail: jest.fn(),
        sendSMS: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CampaignService,
                GamificationService,
                { provide: getRepositoryToken(Campaign), useValue: mockCampaignRepo },
                { provide: getRepositoryToken(GamificationPoints), useValue: mockPointsRepo },
                { provide: getRepositoryToken(UserLevel), useValue: mockUserLevelRepo },
                { provide: getRepositoryToken(Achievement), useValue: mockAchievementRepo },
                { provide: getRepositoryToken(UserAchievement), useValue: mockUserAchievementRepo },
                { provide: EnhancedEmailService, useValue: mockEmailService },
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compile();

        campaignService = module.get<CampaignService>(CampaignService);
        gamificationService = module.get<GamificationService>(GamificationService);
        campaignRepo = module.get<Repository<Campaign>>(getRepositoryToken(Campaign));
        userLevelRepo = module.get<Repository<UserLevel>>(getRepositoryToken(UserLevel));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Campaign Service', () => {
        it('should create and launch campaign', async () => {
            const tenantId = 'tenant-1';
            const campaignData = {
                name: 'Test Campaign',
                type: CampaignType.EMAIL,
                targetAudience: { recipientIds: ['user-1', 'user-2'] },
                content: { subject: 'Hi', body: 'Hello' },
                status: CampaignStatus.DRAFT,
            };

            const mockCampaign = { id: 'camp-1', ...campaignData, tenantId };
            
            mockCampaignRepo.create.mockReturnValue(mockCampaign);
            mockCampaignRepo.save.mockResolvedValue(mockCampaign);
            mockCampaignRepo.findOne.mockResolvedValue(mockCampaign);

            // Create
            await campaignService.createCampaign(tenantId, 'user-admin', campaignData);

            // Launch
            const launched = await campaignService.launchCampaign(tenantId, 'camp-1');
            
            expect(launched.status).toBe(CampaignStatus.RUNNING);
            expect(mockNotificationService.sendEmail).toHaveBeenCalledTimes(2); // 2 recipients
        });
    });

    describe('Gamification Service', () => {
        it('should award points and level up user', async () => {
            const userId = 'user-1';
            const pointsToAdd = 150; // Enough for Level 2 (100 pts)

            // Initial state: Level 1, 0 points
            const initialLevel = {
                userId,
                currentLevel: 1,
                totalPoints: 0,
                pointsToNextLevel: 100,
            };

            mockPointsRepo.create.mockImplementation(dto => dto);
            mockPointsRepo.save.mockResolvedValue({});
            
            mockUserLevelRepo.findOne.mockResolvedValue(initialLevel);
            mockUserLevelRepo.save.mockImplementation(level => Promise.resolve(level));

            // Award points
            await gamificationService.awardPoints(
                userId, 
                PointEventType.INVOICE_PAID, 
                'inv-1', 
                'invoice', 
                pointsToAdd
            );

            // Verify points saved
            expect(mockPointsRepo.save).toHaveBeenCalled();

            // Verify level update
            // logic: 0 + 150 = 150. Level 2 req is 100.
            // Level 2 triggers "Level Up" bonus (100 pts). Total = 250.
            // 250 >= 250 (Level 3).
            // Level 3 triggers "Level Up" bonus (100 pts). Total = 350.
            // 350 < 500 (Level 4).
            // So final level should be 3.
            expect(initialLevel.currentLevel).toBe(3);
            expect(initialLevel.totalPoints).toBe(350);
        });
    });
});
