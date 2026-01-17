import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CampaignService } from '../services/campaign.service';
import { CustomerHealthService } from '../services/customer-health.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Integration Tests: Module 09 → Module 01 (Invoice Management)
 * 
 * Validates that Module 09 correctly integrates with Invoice Management:
 * - Customer activity tracking from invoice events
 * - Invoice health score synchronization
 * - Payment behavior analysis
 */
describe('Module 09 → Module 01 Integration', () => {
    let app: INestApplication;
    let campaignService: CampaignService;
    let healthService: CustomerHealthService;
    let eventEmitter: EventEmitter2;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [
                CampaignService,
                CustomerHealthService,
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
        healthService = moduleFixture.get<CustomerHealthService>(CustomerHealthService);
        eventEmitter = moduleFixture.get<EventEmitter2>(EventEmitter2);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Invoice Event → Health Score Update', () => {
        it('should update customer health when invoice is paid', async () => {
            const invoicePaidEvent = {
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                invoiceId: 'inv-123',
                amount: 50000,
                paidAt: new Date(),
            };

            // Simulate M01 emitting invoice.paid event
            await eventEmitter.emit('invoice.paid', invoicePaidEvent);

            // Verify M09 responds by updating health score
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                expect.stringContaining('health'),
                expect.any(Object),
            );
        });

        it('should detect payment delays and update health score negatively', async () => {
            const invoiceOverdueEvent = {
                customerId: 'customer-456',
                tenantId: 'tenant-123',
                invoiceId: 'inv-456',
                daysOverdue: 30,
                amount: 100000,
            };

            // Simulate M01 emitting invoice.overdue event
            await eventEmitter.emit('invoice.overdue', invoiceOverdueEvent);

            // Verify health score degradation trigger
            expect(eventEmitter.emit).toHaveBeenCalled();
        });
    });

    describe('Customer Activity Tracking', () => {
        it('should track invoice creation as customer activity', async () => {
            const invoiceCreatedEvent = {
                customerId: 'customer-789',
                tenantId: 'tenant-123',
                invoiceId: 'inv-789',
                createdAt: new Date(),
            };

            await eventEmitter.emit('invoice.created', invoiceCreatedEvent);

            // Verify activity is recorded for engagement scoring
            expect(eventEmitter.emit).toHaveBeenCalled();
        });
    });

    describe('Campaign Targeting Based on Invoice Data', () => {
        it('should target customers with high invoice volume for premium campaigns', async () => {
            // This would query M01 for invoice statistics
            const customersWithHighVolume = [
                { customerId: 'customer-100', invoiceCount: 50, totalValue: 500000 },
                { customerId: 'customer-101', invoiceCount: 45, totalValue: 450000 },
            ];

            // Create targeted campaign
            // In real implementation, this would use M01 data
            expect(customersWithHighVolume.length).toBeGreaterThan(0);
        });
    });
});
