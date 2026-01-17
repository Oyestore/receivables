import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GamificationService } from '../gamification.service';
import {
    GamificationPoints,
    UserLevel,
    Achievement,
    UserAchievement,
    PointEventType,
} from '../../entities/gamification.entity';

describe('GamificationService', () => {
    let service: GamificationService;
    let pointsRepo: Repository<GamificationPoints>;
    let userLevelRepo: Repository<UserLevel>;
    let achievementRepo: Repository<Achievement>;
    let userAchievementRepo: Repository<UserAchievement>;

    const mockUserLevel = {
        userId: 'user-123',
        totalPoints: 500,
        currentLevel: 3,
        pointsToNextLevel: 250,
        currentStreak: 5,
        longestStreak: 10,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GamificationService,
                {
                    provide: getRepositoryToken(GamificationPoints),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        find: jest.fn(),
                        count: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(UserLevel),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        find: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Achievement),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        find: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(UserAchievement),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        find: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<GamificationService>(GamificationService);
        pointsRepo = module.get(getRepositoryToken(GamificationPoints));
        userLevelRepo = module.get(getRepositoryToken(UserLevel));
        achievementRepo = module.get(getRepositoryToken(Achievement));
        userAchievementRepo = module.get(getRepositoryToken(UserAchievement));

        jest.clearAllMocks();
    });

    describe('awardPoints', () => {
        it('should award points for invoice creation', async () => {
            (pointsRepo.create as jest.Mock).mockReturnValue({ points: 10 });
            (pointsRepo.save as jest.Mock).mockResolvedValue({ points: 10 });
            (userLevelRepo.findOne as jest.Mock).mockResolvedValue(mockUserLevel);
            (userLevelRepo.save as jest.Mock).mockResolvedValue(mockUserLevel);
            (achievementRepo.find as jest.Mock).mockResolvedValue([]);

            const result = await service.awardPoints('user-123', PointEventType.INVOICE_CREATED);

            expect(result.points).toBe(10);
            expect(pointsRepo.save).toHaveBeenCalled();
        });

        it('should update user level after points awarded', async () => {
            (pointsRepo.create as jest.Mock).mockReturnValue({ points: 50 });
            (pointsRepo.save as jest.Mock).mockResolvedValue({ points: 50 });
            (userLevelRepo.findOne as jest.Mock).mockResolvedValue(mockUserLevel);
            (userLevelRepo.save as jest.Mock).mockResolvedValue(mockUserLevel);
            (achievementRepo.find as jest.Mock).mockResolvedValue([]);

            await service.awardPoints('user-123', PointEventType.INVOICE_PAID);

            expect(userLevelRepo.save).toHaveBeenCalled();
        });
    });

    describe('getUserStats', () => {
        it('should return user gamification stats', async () => {
            (userLevelRepo.findOne as jest.Mock).mockResolvedValue(mockUserLevel);
            (pointsRepo.find as jest.Mock).mockResolvedValue([]);
            (userAchievementRepo.find as jest.Mock).mockResolvedValue([]);

            const result = await service.getUserStats('user-123');

            expect(result.level).toBe(3);
            expect(result.totalPoints).toBe(500);
            expect(result.currentStreak).toBe(5);
        });
    });

    describe('getLeaderboard', () => {
        it('should return top users by points', async () => {
            const leaderboard = [
                { ...mockUserLevel, userId: 'user-1', totalPoints: 1000 },
                { ...mockUserLevel, userId: 'user-2', totalPoints: 800 },
            ];

            (userLevelRepo.find as jest.Mock).mockResolvedValue(leaderboard);

            const result = await service.getLeaderboard(10);

            expect(result.length).toBe(2);
            expect(result[0].totalPoints).toBeGreaterThanOrEqual(result[1].totalPoints);
        });
    });
});
