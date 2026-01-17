import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Campaign, CampaignStatus, CampaignType } from '../entities/campaign.entity';
export { CampaignType };
import { EnhancedEmailService } from '../../../Module_02_Intelligent_Distribution/code/services/enhanced-email.service';
import { NotificationService } from '../../../Module_11_Common/src/services/notification.service';

@Injectable()
export class CampaignService {
    private readonly logger = new Logger(CampaignService.name);

    constructor(
        @InjectRepository(Campaign)
        private readonly campaignRepository: Repository<Campaign>,
        private readonly emailService: EnhancedEmailService,
        private readonly notificationService: NotificationService,
    ) { }

    async createCampaign(tenantId: string, userId: string, campaignData: Partial<Campaign>): Promise<Campaign> {
        const campaign = this.campaignRepository.create({
            ...campaignData,
            tenantId,
            createdBy: userId,
        });
        return this.campaignRepository.save(campaign);
    }

    async findAll(tenantId: string): Promise<Campaign[]> {
        return this.campaignRepository.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(tenantId: string, id: string): Promise<Campaign> {
        const campaign = await this.campaignRepository.findOne({ where: { id, tenantId } });
        if (!campaign) {
            throw new NotFoundException(`Campaign with ID ${id} not found`);
        }
        return campaign;
    }

    async update(tenantId: string, id: string, updateData: Partial<Campaign>): Promise<Campaign> {
        const campaign = await this.findOne(tenantId, id);
        Object.assign(campaign, updateData);
        return this.campaignRepository.save(campaign);
    }

    async launchCampaign(tenantId: string, id: string): Promise<Campaign> {
        const campaign = await this.findOne(tenantId, id);

        if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
            throw new BadRequestException('Campaign must be in DRAFT or SCHEDULED state to launch');
        }

        campaign.status = CampaignStatus.RUNNING;
        campaign.startedAt = new Date();

        this.logger.log(`Launching campaign ${id} for tenant ${tenantId}`);

        // Execute campaign immediately
        await this.executeCampaign(campaign);

        return this.campaignRepository.save(campaign);
    }

    /**
     * Execute campaign by sending notifications
     */
    private async executeCampaign(campaign: Campaign): Promise<void> {
        const { targetAudience, content, type } = campaign;

        // Mock: In real implementation, fetch recipients from targetAudience criteria
        const recipients = targetAudience?.recipientIds || [];

        this.logger.log(`Executing campaign ${campaign.id} for ${recipients.length} recipients`);

        let sentCount = 0;

        for (const recipientId of recipients) {
            try {
                switch (type) {
                    case CampaignType.EMAIL:
                        await this.notificationService.sendEmail({
                            to: recipientId, // In reality, this would be the resolved email address
                            subject: content.subject,
                            html: content.body,
                        });
                        break;

                    case CampaignType.SMS:
                        await this.notificationService.sendSMS({
                            to: recipientId,
                            message: content.message,
                        });
                        break;

                    case CampaignType.WHATSAPP:
                        await this.notificationService.sendWhatsApp({
                            to: recipientId,
                            message: content.message,
                        });
                        break;
                }

                sentCount++;
            } catch (error) {
                this.logger.error(`Failed to send to ${recipientId}: ${error.message}`);
            }
        }

        // Update campaign stats
        campaign.totalSent = sentCount;
        await this.campaignRepository.save(campaign);
    }

    /**
     * Scheduled task to launch scheduled campaigns
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async processScheduledCampaigns() {
        const now = new Date();

        const scheduled = await this.campaignRepository.find({
            where: {
                status: CampaignStatus.SCHEDULED,
            },
        });

        for (const campaign of scheduled) {
            if (campaign.scheduledAt && campaign.scheduledAt <= now) {
                this.logger.log(`Auto-launching scheduled campaign ${campaign.id}`);
                campaign.status = CampaignStatus.RUNNING;
                campaign.startedAt = new Date();
                await this.campaignRepository.save(campaign);
                await this.executeCampaign(campaign);
            }
        }
    }

    async getCampaignAnalytics(tenantId: string, id: string): Promise<any> {
        const campaign = await this.findOne(tenantId, id);

        const openRate = campaign.totalSent > 0 ? campaign.totalOpened / campaign.totalSent : 0;
        const clickRate = campaign.totalSent > 0 ? campaign.totalClicked / campaign.totalSent : 0;
        const conversionRate = campaign.totalSent > 0 ? campaign.totalConverted / campaign.totalSent : 0;

        return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            stats: {
                sent: campaign.totalSent,
                opened: campaign.totalOpened,
                clicked: campaign.totalClicked,
                converted: campaign.totalConverted,
                rates: {
                    open: openRate,
                    click: clickRate,
                    conversion: conversionRate
                }
            }
        };
    }

    async segmentAudience(tenantId: string, criteria: any): Promise<any> {
        // Mock segmentation logic
        return {
            segmentId: 'seg-' + Date.now(),
            count: 100,
            criteria
        };
    }
}
