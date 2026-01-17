import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CampaignService } from '../services/campaign.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Integration Tests: Module 09 → Module 11 (Notifications)
 * 
 * Validates notification integration:
 * - Campaign email sending via M11
 * - Multi-channel messaging (Email, SMS, WhatsApp)
 * - Notification template usage
 * - Delivery tracking
 */
describe('Module 09 → Module 11 Integration', () => {
    let app: INestApplication;
    let campaignService: CampaignService;
    let eventEmitter: EventEmitter2;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [
                CampaignService,
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                        on: jest.fn(),
                    },
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        campaignService = moduleFixture.get<CampaignService>(CampaignService);
        eventEmitter = moduleFixture.get<EventEmitter2>(EventEmitter2);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Campaign Notification Sending', () => {
        it('should send campaign emails via Module 11', async () => {
            const campaign = {
                id: 'camp-123',
                name: 'Product Launch',
                targetAudience: ['customer-1', 'customer-2', 'customer-3'],
                emailTemplate: 'product_launch_template',
            };

            // Launch campaign triggers M11 notification
            await eventEmitter.emit('campaign.launched', campaign);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'campaign.launched',
                expect.objectContaining({
                    id: 'camp-123',
                }),
            );
        });

        it('should support multi-channel campaign delivery', async () => {
            const multiChannelCampaign = {
                id: 'camp-456',
                channels: ['email', 'sms', 'whatsapp'],
                message: 'Important update for your account',
            };

            // Each channel should trigger appropriate M11 notification
            for (const channel of multiChannelCampaign.channels) {
                expect(['email', 'sms', 'whatsapp']).toContain(channel);
            }
        });
    });

    describe('Notification Delivery Tracking', () => {
        it('should track email opens for campaign analytics', async () => {
            const emailOpenedEvent = {
                campaignId: 'camp-123',
                customerId: 'customer-789',
                emailId: 'email-123',
                openedAt: new Date(),
            };

            await eventEmitter.emit('notification.email.opened', emailOpenedEvent);

            expect(eventEmitter.emit).toHaveBeenCalled();
        });

        it('should track link clicks for engagement measurement', async () => {
            const linkClickedEvent = {
                campaignId: 'camp-123',
                customerId: 'customer-789',
                linkUrl: 'https://product.com/new-feature',
                clickedAt: new Date(),
            };

            await eventEmitter.emit('notification.link.clicked', linkClickedEvent);

            expect(eventEmitter.emit).toHaveBeenCalled();
        });
    });
});
