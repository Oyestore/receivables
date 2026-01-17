import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import axios from 'axios';

interface Referral {
    id: string;
    referrerId: string;
    refereeId: string;
    referralCode: string;
    status: 'pending' | 'converted' | 'rewarded';
    rewardAmount: number;
    createdAt: Date;
    convertedAt?: Date;
}

@Injectable()
export class ReferralIntegrationService {
    private readonly logger = new Logger(ReferralIntegrationService.name);

    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
    ) { }

    /**
     * Generate referral link for customer
     * Integrates with Module 09 (Referral Engine)
     */
    async generateReferralLink(sessionId: string): Promise<{
        referralCode: string;
        referralLink: string;
        rewardAmount: number;
    }> {
        this.logger.log(`Generating referral link for session: ${sessionId}`);

        try {
            const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
            if (!session) {
                throw new Error('Session not found');
            }

            // 1. Create referral in Module 09
            const response = await axios.post('/api/referrals/create', {
                referrerId: session.tenantId, // Customer becomes referrer
                source: 'concierge_viral_share',
                campaign: 'b2b_network_growth',
                rewardAmount: 500, // ₹500 per successful referral
            });

            const referral = response.data;

            // 2. Generate magic link with referral code
            const baseUrl = process.env.FRONTEND_URL || 'https://platform.example.com';
            const referralLink = `${baseUrl}/signup?ref=${referral.referralCode}`;

            // 3. Update session with referral
            session.metadata = {
                ...session.metadata,
                referralCode: referral.referralCode,
                referralLinkGenerated: true,
                referralGeneratedAt: new Date(),
            };
            await this.sessionRepo.save(session);

            // 4. Trigger orchestration event (Module 10)
            await this.triggerOrchestrationEvent('referral_link_generated', {
                sessionId,
                referrerId: session.tenantId,
                referralCode: referral.referralCode,
            });

            this.logger.log(`Referral link generated: ${referralLink}`);

            return {
                referralCode: referral.referralCode,
                referralLink,
                rewardAmount: 500,
            };
        } catch (error) {
            this.logger.error(`Failed to generate referral link: ${error.message}`);
            throw error;
        }
    }

    /**
     * Track referral share event
     * Called when customer shares via WhatsApp/LinkedIn/Twitter/Email
     */
    async trackReferralShare(
        sessionId: string,
        channel: 'whatsapp' | 'linkedin' | 'twitter' | 'email',
    ): Promise<void> {
        this.logger.log(`Tracking referral share: ${sessionId} via ${channel}`);

        try {
            const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
            if (!session) return;

            // Track share event in Module 09
            await axios.post('/api/referrals/track-share', {
                referralCode: session.metadata?.referralCode,
                channel,
                timestamp: new Date(),
            });

            // Trigger orchestration event
            await this.triggerOrchestrationEvent('referral_shared', {
                sessionId,
                channel,
                referralCode: session.metadata?.referralCode,
            });

            this.logger.log(`Referral share tracked: ${channel}`);
        } catch (error) {
            this.logger.error(`Failed to track referral share: ${error.message}`);
        }
    }

    /**
     * Handle referral conversion (when referee signs up)
     * Called from Module 09 webhook
     */
    async handleReferralConversion(
        referralCode: string,
        refereeData: {
            id: string;
            email: string;
            name: string;
        },
    ): Promise<void> {
        this.logger.log(`Processing referral conversion: ${referralCode}`);

        try {
            // PERFORMANCE: Optimized query instead of loading all sessions
            const session = await this.sessionRepo
                .createQueryBuilder('session')
                .where("session.metadata->>'referralCode' = :referralCode", { referralCode })
                .getOne();

            if (session) {
                // Update session with conversion
                session.metadata = {
                    ...(session.metadata || {}), // Safe spread
                    referralConverted: true,
                    referralConvertedAt: new Date(),
                    refereeId: refereeData.id,
                    refereeName: refereeData.name,
                };
                await this.sessionRepo.save(session);

                // Trigger orchestration event
                await this.triggerOrchestrationEvent('referral_converted', {
                    sessionId: session.id,
                    referrerId: session.tenantId,
                    refereeId: refereeData.id,
                    referralCode,
                });

                // Send conversion notification (Module 11)
                await this.sendConversionNotification(session, refereeData);
            }

            this.logger.log(`Referral conversion processed: ${referralCode}`);
        } catch (error) {
            this.logger.error(`Failed to handle referral conversion: ${error.message}`);
        }
    }

    /**
     * Handle reward credit (when referee makes first payment)
     * Called from Module 09 webhook
     */
    async handleRewardCredit(
        referralCode: string,
        rewardAmount: number,
    ): Promise<void> {
        this.logger.log(`Processing reward credit: ${referralCode} - ₹${rewardAmount}`);

        try {
            // PERFORMANCE: Optimized query instead of second table scan
            const session = await this.sessionRepo
                .createQueryBuilder('session')
                .where("session.metadata->>'referralCode' = :referralCode", { referralCode })
                .getOne();

            if (session) {
                // Update session with reward
                session.metadata = {
                    ...(session.metadata || {}), // Safe spread
                    referralRewarded: true,
                    rewardAmount,
                    rewardCreditedAt: new Date(),
                };
                await this.sessionRepo.save(session);

                // Trigger orchestration event
                await this.triggerOrchestrationEvent('referral_rewarded', {
                    sessionId: session.id,
                    referrerId: session.tenantId,
                    rewardAmount,
                    referralCode,
                });

                // Send reward notification (Module 11)
                await this.sendRewardNotification(session, rewardAmount);
            }

            this.logger.log(`Reward credited: ₹${rewardAmount}`);
        } catch (error) {
            this.logger.error(`Failed to handle reward credit: ${error.message}`);
        }
    }

    /**
     * Get referral stats for customer dashboard
     */
    async getReferralStats(customerId: string): Promise<{
        totalReferrals: number;
        convertedReferrals: number;
        totalRewards: number;
        pendingRewards: number;
    }> {
        try {
            const response = await axios.get(`/api/referrals/stats/${customerId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to get referral stats: ${error.message}`);
            return {
                totalReferrals: 0,
                convertedReferrals: 0,
                totalRewards: 0,
                pendingRewards: 0,
            };
        }
    }

    /**
     * Trigger Module 10 (Orchestration) event
     */
    private async triggerOrchestrationEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
        try {
            await axios.post('/api/orchestration/events', {
                type: eventType,
                source: 'module_16_concierge',
                data,
                timestamp: new Date().toISOString(),
            });

            this.logger.log(`Orchestration event triggered: ${eventType}`);
        } catch (error) {
            this.logger.error(`Failed to trigger orchestration event: ${error.message}`);
        }
    }

    /**
     * Send conversion notification via Module 11
     */
    private async sendConversionNotification(session: ChatSession, refereeData: { id: string; email: string; name: string }): Promise<void> {
        try {
            // WhatsApp notification
            await axios.post('/api/notifications/whatsapp', {
                to: session.metadata?.customerPhone,
                template: 'referral_conversion',
                variables: {
                    refereeName: refereeData.name,
                    nextStep: 'Complete first payment to earn ₹500',
                },
            });

            // Email notification
            await axios.post('/api/notifications/email', {
                to: session.metadata?.customerEmail,
                subject: 'Your Referral Signed Up!',
                template: 'referral_conversion',
                variables: {
                    refereeName: refereeData.name,
                    potentialReward: 500,
                },
            });

            this.logger.log(`Conversion notification sent to referrer`);
        } catch (error) {
            this.logger.error(`Failed to send conversion notification: ${error.message}`);
        }
    }

    /**
     * Send reward notification via Module 11
     */
    private async sendRewardNotification(session: ChatSession, rewardAmount: number): Promise<void> {
        try {
            // WhatsApp notification with confetti
            await axios.post('/api/notifications/whatsapp', {
                to: session.metadata?.customerPhone,
                template: 'referral_reward',
                variables: {
                    rewardAmount: `₹${rewardAmount}`,
                },
            });

            // Email notification
            await axios.post('/api/notifications/email', {
                to: session.metadata?.customerEmail,
                subject: `🎉 You Earned ₹${rewardAmount} Referral Reward!`,
                template: 'referral_reward',
                variables: {
                    rewardAmount,
                    walletBalance: session.metadata?.walletBalance || 0,
                },
            });

            this.logger.log(`Reward notification sent: ₹${rewardAmount}`);
        } catch (error) {
            this.logger.error(`Failed to send reward notification: ${error.message}`);
        }
    }
}
