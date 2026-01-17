import { Test, TestingModule } from '@nestjs/testing';
import { MarketingService } from '../marketing.service';
import { Pool, PoolClient } from 'pg';
import { NotFoundError, ValidationError, DatabaseError } from '../../../../Module_11_Common/code/errors/app-error';

describe('MarketingService', () => {
    let service: MarketingService;
    let mockPool: jest.Mocked<Pool>;
    let mockClient: jest.Mocked<PoolClient>;

    const mockCampaign = {
        id: 'camp-123',
        tenant_id: 'tenant-123',
        name: 'Test Campaign',
        campaign_type: 'email',
        status: 'draft',
        message_template: 'Hello {{company_name}}',
        created_by: 'user-123',
    };

    beforeEach(() => {
        // Mock client
        mockClient = {
            query: jest.fn(),
            release: jest.fn(),
        } as any;

        // Mock pool
        mockPool = {
            connect: jest.fn().mockResolvedValue(mockClient),
            query: jest.fn(),
        } as any;

        //service = new MarketingService();
        // Inject mock pool
        //(service as any).pool = mockPool;

        jest.clearAllMocks();
    });

    describe('createCampaign', () => {
        it('should create campaign successfully', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [mockCampaign] }) // INSERT
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            const service = new MarketingService();
            (service as any).pool = mockPool;

            const result = await service.createCampaign(
                'tenant-123',
                {
                    name: 'Test Campaign',
                    campaign_type: 'email',
                    start_date: new Date('2026-02-01'),
                    message_template: 'Test message',
                },
                'user-123',
            );

            expect(result).toEqual(mockCampaign);
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should rollback on error', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockRejectedValueOnce(new Error('DB Error')); // INSERT fails

            const service = new MarketingService();
            (service as any).pool = mockPool;

            await expect(
                service.createCampaign(
                    'tenant-123',
                    {
                        name: 'Test',
                        campaign_type: 'email',
                        start_date: new Date(),
                        message_template: 'Test',
                    },
                    'user-123',
                ),
            ).rejects.toThrow(DatabaseError);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('launchCampaign', () => {
        it('should launch draft campaign', async () => {
            const draftCampaign = { ...mockCampaign, status: 'draft' };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [draftCampaign] }) // SELECT campaign
                .mockResolvedValueOnce({ rows: [{ customer_ids: ['cust-1', 'cust-2'] }] }) // SELECT segment
                .mockResolvedValueOnce({ rows: [] }) // INSERT communication 1
                .mockResolvedValueOnce({ rows: [{ id: 'cust-1' }] }) // SELECT customer 1
                .mockResolvedValueOnce({ rows: [] }) // INSERT communication 2
                .mockResolvedValueOnce({ rows: [{ id: 'cust-2' }] }) // SELECT customer 2
                .mockResolvedValueOnce({ rows: [] }) // UPDATE campaign
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            const service = new MarketingService();
            (service as any).pool = mockPool;

            const result = await service.launchCampaign('tenant-123', 'camp-123', 'user-123');

            expect(result.status).toBe('active');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should throw NotFoundError if campaign not found', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [] }); // SELECT - no campaign

            const service = new MarketingService();
            (service as any).pool = mockPool;

            await expect(
                service.launchCampaign('tenant-123', 'non-existent', 'user-123'),
            ).rejects.toThrow(NotFoundError);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should throw ValidationError if not draft', async () => {
            const activeCampaign = { ...mockCampaign, status: 'active' };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [activeCampaign] }); // SELECT

            const service = new MarketingService();
            (service as any).pool = mockPool;

            await expect(
                service.launchCampaign('tenant-123', 'camp-123', 'user-123'),
            ).rejects.toThrow(ValidationError);
        });
    });

    describe('createCustomerSegment', () => {
        it('should create segment with matching customers', async () => {
            const mockSegment = {
                id: 'seg-123',
                name: 'High Value',
                customer_count: 5,
            };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({
                    rows: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }, { id: 'c5' }],
                }) // applySegmentCriteria
                .mockResolvedValueOnce({ rows: [mockSegment] }) // INSERT segment
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            const service = new MarketingService();
            (service as any).pool = mockPool;

            const result = await service.createCustomerSegment(
                'tenant-123',
                {
                    name: 'High Value',
                    criteria: { min_revenue: 100000 },
                },
                'user-123',
            );

            expect(result).toEqual(mockSegment);
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });
    });

    describe('calculateLeadScore', () => {
        it('should calculate score for customer', async () => {
            const mockScore = {
                customer_id: 'cust-123',
                score: 75,
                tier: 'warm',
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'cust-123', company_name: 'Test' }] }) // customer
                .mockResolvedValueOnce({ rows: [{ invoice_count: 10, total_revenue: 50000 }] }) // invoices
                .mockResolvedValueOnce({ rows: [{ avg_payment_days: 15 }] }) // payments
                .mockResolvedValueOnce({ rows: [mockScore] }); // INSERT score

            const service = new MarketingService();
            (service as any).pool = mockPool;

            const result = await service.calculateLeadScore('tenant-123', 'cust-123');

            expect(result.tier).toBeDefined();
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);
        });

        it('should throw NotFoundError if customer not found', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const service = new MarketingService();
            (service as any).pool = mockPool;

            await expect(
                service.calculateLeadScore('tenant-123', 'non-existent'),
            ).rejects.toThrow(NotFoundError);
        });

        it('should categorize as hot for high scores', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'cust-123' }] })
                .mockResolvedValueOnce({ rows: [{ invoice_count: 30, total_revenue: 200000 }] })
                .mockResolvedValueOnce({ rows: [{ avg_payment_days: 5 }] })
                .mockResolvedValueOnce({ rows: [{ score: 95, tier: 'hot' }] });

            const service = new MarketingService();
            (service as any).pool = mockPool;

            const result = await service.calculateLeadScore('tenant-123', 'cust-123');

            expect(result.tier).toBe('hot');
        });
    });

    describe('sendCommunication', () => {
        it('should send communication and create record', async () => {
            const mockComm = {
                id: 'comm-123',
                customer_id: 'cust-123',
                status: 'sent',
            };

            mockPool.query.mockResolvedValueOnce({ rows: [mockComm] });

            const service = new MarketingService();
            (service as any).pool = mockPool;

            const result = await service.sendCommunication(
                'tenant-123',
                {
                    customer_id: 'cust-123',
                    communication_type: 'promotional' as any,
                    message: 'Test message',
                    channel: 'email',
                },
                'user-123',
            );

            expect(result).toEqual(mockComm);
            expect(mockPool.query).toHaveBeenCalled();
        });
    });

    describe('getCampaignAnalytics', () => {
        it('should return campaign analytics', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [mockCampaign] }) // campaign
                .mockResolvedValueOnce({
                    rows: [{ sent_count: '100', opened_count: '60', clicked_count: '20' }],
                }); // stats

            const service = new MarketingService();
            (service as any).pool = mockPool;

            const result = await service.getCampaignAnalytics('tenant-123', 'camp-123');

            expect(result.sent_count).toBe(100);
            expect(result.open_rate).toBe(60);
            expect(result.click_rate).toBe(20);
        });

        it('should throw NotFoundError if campaign not found', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const service = new MarketingService();
            (service as any).pool = mockPool;

            await expect(
                service.getCampaignAnalytics('tenant-123', 'non-existent'),
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty segment criteria', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ id: 'c1' }] }) // customers
                .mockResolvedValueOnce({ rows: [{ id: 'seg-1' }] }) // INSERT
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            const service = new MarketingService();
            (service as any).pool = mockPool;

            const result = await service.createCustomerSegment(
                'tenant-123',
                { name: 'All', criteria: {} },
                'user-123',
            );

            expect(result).toBeDefined();
        });

        it('should handle database connection errors', async () => {
            mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));

            const service = new MarketingService();
            (service as any).pool = mockPool;

            await expect(
                service.createCampaign(
                    'tenant-123',
                    { name: 'Test', campaign_type: 'email', start_date: new Date(), message_template: 'Test' },
                    'user-123',
                ),
            ).rejects.toThrow();
        });
    });
});
