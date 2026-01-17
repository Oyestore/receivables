import { Test, TestingModule } from '@nestjs/testing';
import { ReferralIntegrationService } from '../referral-integration.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatSession } from '../../entities/chat-session.entity';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ReferralIntegrationService', () => {
    let service: ReferralIntegrationService;
    let sessionRepo: Partial<Repository<ChatSession>>;

    const mockReferral = {
        referralCode: 'REF123',
        id: 'ref-1',
        referrerId: 'tenant-1',
        rewardAmount: 500,
    };

    beforeEach(async () => {
        sessionRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
            })) as any,
        };

        mockedAxios.post.mockResolvedValue({ data: mockReferral });
        mockedAxios.get.mockResolvedValue({ data: {} });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReferralIntegrationService,
                {
                    provide: getRepositoryToken(ChatSession),
                    useValue: sessionRepo,
                },
            ],
        }).compile();

        service = module.get<ReferralIntegrationService>(ReferralIntegrationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateReferralLink', () => {
        it('should generate referral link via Module 09', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const result = await service.generateReferralLink('session-1');

            expect(result).toEqual({
                referralCode: 'REF123',
                referralLink: expect.stringContaining('REF123'),
                rewardAmount: 500,
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/referrals/create',
                expect.objectContaining({
                    referrerId: 'tenant-1',
                    source: 'concierge_viral_share',
                })
            );
        });

        it('should update session with referral code', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.generateReferralLink('session-1');

            expect(sessionRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        referralCode: 'REF123',
                        referralLinkGenerated: true,
                    }),
                })
            );
        });

        it('should trigger orchestration event', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.generateReferralLink('session-1');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/orchestration/events',
                expect.objectContaining({
                    type: 'referral_link_generated',
                })
            );
        });

        it('should throw error if session not found', async () => {
            (sessionRepo.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.generateReferralLink('invalid-session')).rejects.toThrow(
                'Session not found'
            );
        });
    });

    describe('trackReferralShare', () => {
        it('should track WhatsApp share', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { referralCode: 'REF123' },
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);

            await service.trackReferralShare('session-1', 'whatsapp');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/referrals/track-share',
                expect.objectContaining({
                    referralCode: 'REF123',
                    channel: 'whatsapp',
                })
            );
        });

        it('should handle all share channels', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { referralCode: 'REF123' },
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);

            const channels = ['whatsapp', 'linkedin', 'twitter', 'email'] as const;

            for (const channel of channels) {
                await service.trackReferralShare('session-1', channel);

                expect(mockedAxios.post).toHaveBeenCalledWith(
                    '/api/referrals/track-share',
                    expect.objectContaining({ channel })
                );
            }
        });

        it('should not throw if session not found', async () => {
            (sessionRepo.findOne as jest.Mock).mockResolvedValue(null);

            await expect(
                service.trackReferralShare('invalid-session', 'whatsapp')
            ).resolves.not.toThrow();
        });
    });

    describe('handleReferralConversion', () => {
        it('should process referral conversion', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: { referralCode: 'REF123' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const refereeData = {
                id: 'referee-1',
                email: 'referee@example.com',
                name: 'John Doe',
            };

            await service.handleReferralConversion('REF123', refereeData);

            expect(sessionRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        referralConverted: true,
                        refereeId: 'referee-1',
                        refereeName: 'John Doe',
                    }),
                })
            );
        });

        it('should trigger conversion event', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: { referralCode: 'REF123' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.handleReferralConversion('REF123', {
                id: 'referee-1',
                email: 'referee@example.com',
                name: 'John Doe',
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/orchestration/events',
                expect.objectContaining({
                    type: 'referral_converted',
                })
            );
        });

        it('should send conversion notifications', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: {
                    referralCode: 'REF123',
                    customerPhone: '+919876543210',
                    customerEmail: 'customer@example.com',
                },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.handleReferralConversion('REF123', {
                id: 'referee-1',
                email: 'referee@example.com',
                name: 'John Doe',
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    template: 'referral_conversion',
                })
            );
        });
    });

    describe('handleRewardCredit', () => {
        it('should process reward credit', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: { referralCode: 'REF123' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.handleRewardCredit('REF123', 500);

            expect(sessionRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        referralRewarded: true,
                        rewardAmount: 500,
                    }),
                })
            );
        });

        it('should trigger reward event', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: { referralCode: 'REF123' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.handleRewardCredit('REF123', 500);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/orchestration/events',
                expect.objectContaining({
                    type: 'referral_rewarded',
                    data: expect.objectContaining({
                        rewardAmount: 500,
                    }),
                })
            );
        });

        it('should send reward notifications', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: {
                    referralCode: 'REF123',
                    customerPhone: '+919876543210',
                    customerEmail: 'customer@example.com',
                },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.handleRewardCredit('REF123', 500);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    template: 'referral_reward',
                    variables: expect.objectContaining({
                        rewardAmount: '₹500',
                    }),
                })
            );
        });
    });

    describe('getReferralStats', () => {
        it('should retrieve referral stats from Module 09', async () => {
            const mockStats = {
                totalReferrals: 5,
                convertedReferrals: 3,
                totalRewards: 1500,
                pendingRewards: 500,
            };

            mockedAxios.get.mockResolvedValueOnce({ data: mockStats });

            const result = await service.getReferralStats('customer-1');

            expect(result).toEqual(mockStats);
            expect(mockedAxios.get).toHaveBeenCalledWith('/api/referrals/stats/customer-1');
        });

        it('should return zero stats on API failure', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('API unavailable'));

            const result = await service.getReferralStats('customer-1');

            expect(result).toEqual({
                totalReferrals: 0,
                convertedReferrals: 0,
                totalRewards: 0,
                pendingRewards: 0,
            });
        });
    });

    describe('error handling', () => {
        it('should handle Module 09 API failures', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            mockedAxios.post.mockRejectedValueOnce(new Error('Module 09 unavailable'));

            await expect(service.generateReferralLink('session-1')).rejects.toThrow();
        });

        it('should handle notification failures gracefully', async () => {
            const mockSession = {
                id: 'session-1',
                tenantId: 'tenant-1',
                metadata: { referralCode: 'REF123' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            mockedAxios.post.mockImplementation((url) => {
                if (url.includes('notifications')) {
                    return Promise.reject(new Error('Notification failed'));
                }
                return Promise.resolve({ data: {} });
            });

            // Should not throw
            await expect(
                service.handleRewardCredit('REF123', 500)
            ).resolves.not.toThrow();
        });
    });
});
