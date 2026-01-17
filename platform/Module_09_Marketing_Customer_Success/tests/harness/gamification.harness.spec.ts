
import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from '../../code/services/gamification.service';
import { GamificationPoints, UserLevel, Achievement, UserAchievement, PointEventType } from '../../code/entities/gamification.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Deterministic Harness for Gamification Service (Module 09)
 * 
 * Scenarios:
 * 1. Award Points & Level Up
 * 2. Streak Maintenance
 * 3. Achievement Unlocking
 */
describe('Gamification Service Harness', () => {
    let service: GamificationService;
    
    // Repositories
    let pointsRepo: Repository<GamificationPoints>;
    let userLevelRepo: Repository<UserLevel>;
    let achievementRepo: Repository<Achievement>;
    let userAchievementRepo: Repository<UserAchievement>;

    const mockPointsRepo = {
        create: jest.fn(dto => dto),
        save: jest.fn(dto => Promise.resolve({ id: 'pt-1', ...dto })),
        count: jest.fn().mockResolvedValue(0),
    };

    const mockUserLevelRepo = {
        findOne: jest.fn(),
        create: jest.fn(dto => dto),
        save: jest.fn(dto => Promise.resolve({ id: 'ul-1', ...dto })),
    };

    const mockAchievementRepo = {
        find: jest.fn().mockResolvedValue([]),
    };

    const mockUserAchievementRepo = {
        findOne: jest.fn(),
        create: jest.fn(dto => dto),
        save: jest.fn(dto => Promise.resolve({ id: 'ua-1', ...dto })),
    };

    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            providers: [
                GamificationService,
                { provide: getRepositoryToken(GamificationPoints), useValue: mockPointsRepo },
                { provide: getRepositoryToken(UserLevel), useValue: mockUserLevelRepo },
                { provide: getRepositoryToken(Achievement), useValue: mockAchievementRepo },
                { provide: getRepositoryToken(UserAchievement), useValue: mockUserAchievementRepo },
            ],
        }).compile();

        service = module.get<GamificationService>(GamificationService);
    });

    afterAll(async () => {
        if (module) {
            await module.close();
        }
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should award points and create user level if not exists', async () => {
        mockUserLevelRepo.findOne.mockResolvedValue(null);

        await service.awardPoints('user-1', PointEventType.INVOICE_CREATED); // 10 points

        expect(mockPointsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            points: 10,
            eventType: PointEventType.INVOICE_CREATED
        }));

        expect(mockUserLevelRepo.create).toHaveBeenCalled();
        expect(mockUserLevelRepo.save).toHaveBeenCalled();
    });

    it('should level up user when threshold reached', async () => {
        // Stateful mock for user level
        let dbUserLevel = {
            userId: 'user-1',
            currentLevel: 1,
            totalPoints: 90,
            pointsToNextLevel: 10,
            currentStreak: 0,
            longestStreak: 0
        };

        mockUserLevelRepo.findOne.mockImplementation(() => Promise.resolve({ ...dbUserLevel }));
        
        mockUserLevelRepo.save.mockImplementation((entity) => {
            Object.assign(dbUserLevel, entity);
            return Promise.resolve(entity);
        });

        // Award 20 points -> Total 110 -> Level 2 -> Bonus 100 -> Total 210
        await service.awardPoints('user-1', PointEventType.INVOICE_CREATED, undefined, undefined, 20);

        // Final state check
        expect(dbUserLevel.totalPoints).toBe(210);
        expect(dbUserLevel.currentLevel).toBe(2);
    });

    it('should maintain streak if active yesterday', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const userLevel = {
            userId: 'user-streak',
            lastActivityDate: yesterday,
            currentStreak: 5,
            longestStreak: 5
        };
        mockUserLevelRepo.findOne.mockResolvedValue(userLevel);

        await service.awardPoints('user-streak', PointEventType.INVOICE_CREATED);

        expect(mockUserLevelRepo.save).toHaveBeenCalledWith(expect.objectContaining({
            currentStreak: 6,
            longestStreak: 6
        }));
    });

    it('should reset streak if missed a day', async () => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const userLevel = {
            userId: 'user-broken',
            lastActivityDate: twoDaysAgo,
            currentStreak: 10,
            longestStreak: 10
        };
        mockUserLevelRepo.findOne.mockResolvedValue(userLevel);

        await service.awardPoints('user-broken', PointEventType.INVOICE_CREATED);

        expect(mockUserLevelRepo.save).toHaveBeenCalledWith(expect.objectContaining({
            currentStreak: 1, // Reset
            longestStreak: 10 // Preserved
        }));
    });
});
