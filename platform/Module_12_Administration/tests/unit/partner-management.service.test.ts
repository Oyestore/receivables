import { PartnerManagementService } from '../code/services/partner-management.service';

describe('PartnerManagementService', () => {
    let partnerService: PartnerManagementService;
    let mockPool: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPool = {
            query: jest.fn(),
            connect: jest.fn(() => ({
                query: jest.fn(),
                release: jest.fn(),
            })),
        };

        jest.spyOn(require('../../../Module_11_Common/code/database/database.service'), 'databaseService').mock ReturnValue({
            getPool: () => mockPool,
        });

        partnerService = new PartnerManagementService();
    });

    describe('registerPartner', () => {
        it('should register a new partner', async () => {
            const partnerData = {
                partnerName: 'TechCorp Reseller',
                partnerType: 'reseller' as const,
                contactEmail: 'contact@techcorp.com',
                contactPhone: '555-0123',
                contactPerson: 'John Doe',
            };

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: 'partner-123',
                    partner_code: 'TEC-123456-ABC',
                    partner_name: partnerData.partnerName,
                    partner_type: partnerData.partnerType,
                    contact_email: partnerData.contactEmail,
                    contact_phone: partnerData.contactPhone,
                    contact_person: partnerData.contactPerson,
                    status: 'pending',
                    created_at: new Date(),
                }],
            });

            const result = await partnerService.registerPartner(partnerData);

            expect(result.partnerName).toBe('TechCorp Reseller');
            expect(result.status).toBe('pending');
            expect(result.partnerCode).toMatch(/^TEC-/);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO partners'),
                expect.arrayContaining([
                    expect.stringMatching(/^TEC-/),
                    partnerData.partnerName,
                    partnerData.partnerType,
                ])
            );
        });
    });

    describe('createContract', () => {
        it('should create partner contract with commission rate', async () => {
            const contractData = {
                partnerId: 'partner-123',
                contractType: 'reseller' as const,
                commissionRate: 15,
                minimumCommitment: 10,
                contractStart: new Date('2024-01-01'),
                contractEnd: new Date('2024-12-31'),
            };

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ id: 'partner-123', status: 'active' }],
                })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'contract-123',
                        partner_id: contractData.partnerId,
                        contract_number: 'CONTRACT-2024-0001',
                        contract_type: contractData.contractType,
                        commission_rate: contractData.commissionRate,
                        minimum_commitment: contractData.minimumCommitment,
                        contract_start: contractData.contractStart,
                        contract_end: contractData.contractEnd,
                        status: 'active',
                    }],
                });

            const result = await partnerService.createContract(contractData, 'user-123');

            expect(result.contractNumber).toBe('CONTRACT-2024-0001');
            expect(result.commissionRate).toBe(15);
            expect(result.status).toBe('active');
        });

        it('should throw error if no commission structure provided', async () => {
            const contractData = {
                partnerId: 'partner-123',
                contractType: 'referral' as const,
                contractStart: new Date(),
            };

            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 'partner-123' }],
            });

            await expect(
                partnerService.createContract(contractData, 'user-123')
            ).rejects.toThrow('At least one commission structure must be provided');
        });
    });

    describe('trackReferral', () => {
        it('should track a referral', async () => {
            const referralData = {
                partnerId: 'partner-123',
                referredEmail: 'prospect@company.com',
                referredCompany: 'ProspectCo',
            };

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'partner-123',
                        partner_code: 'TEC-123',
                        status: 'active',
                    }],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'referral-123',
                        partner_id: referralData.partnerId,
                        referral_code: 'TEC-ABCD12',
                        referred_email: referralData.referredEmail,
                        referred_company: referralData.referredCompany,
                        status: 'pending',
                        referral_date: new Date(),
                    }],
                });

            const result = await partnerService.trackReferral(referralData);

            expect(result.referredEmail).toBe('prospect@company.com');
            expect(result.status).toBe('pending');
            expect(result.referralCode).toMatch(/^TEC-/);
        });

        it('should throw error if partner is not active', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 'partner-123', status: 'suspended' }],
            });

            await expect(
                partnerService.trackReferral({
                    partnerId: 'partner-123',
                    referredEmail: 'test@test.com',
                })
            ).rejects.toThrow('Partner is not active');
        });
    });

    describe('convertReferral', () => {
        it('should convert referral to customer', async () => {
            const referralId = 'referral-123';
            const tenantId = 'tenant-456';

            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({
                    rows: [{ id: referralId, partner_id: 'partner-123' }],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        id: referralId,
                        referred_tenant_id: tenantId,
                        status: 'converted',
                        conversion_date: new Date(),
                    }],
                })
                .mockResolvedValueOnce(); // COMMIT

            const result = await partnerService.convertReferral(referralId, tenantId);

            expect(result.referredTenantId).toBe(tenantId);
            expect(result.status).toBe('converted');
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });
    });

    describe('calculateCommission', () => {
        it('should calculate commission based on percentage', async () => {
            const data = {
                partnerId: 'partner-123',
                referralId: 'referral-456',
                baseAmount: 1000,
                commissionType: 'referral' as const,
            };

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'contract-123',
                        partner_id: data.partnerId,
                        commission_rate: 20,
                        status: 'active',
                    }],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'commission-123',
                        partner_id: data.partnerId,
                        contract_id: 'contract-123',
                        base_amount: data.baseAmount,
                        commission_rate: 20,
                        commission_amount: 200,
                        commission_type: data.commissionType,
                        payout_status: 'pending',
                    }],
                });

            const result = await partnerService.calculateCommission(data);

            expect(result.commissionAmount).toBe(200);
            expect(result.commissionRate).toBe(20);
            expect(result.payoutStatus).toBe('pending');
        });

        it('should calculate flat fee commission', async () => {
            const data = {
                partnerId: 'partner-123',
                baseAmount: 1000,
                commissionType: 'flat_fee' as const,
            };

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'contract-123',
                        flat_fee_per_referral: 50,
                        status: 'active',
                    }],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        commission_amount: 50,
                        commission_type: 'flat_fee',
                    }],
                });

            const result = await partnerService.calculateCommission(data);

            expect(result.commissionAmount).toBe(50);
        });

        it('should throw error if no active contract found', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await expect(
                partnerService.calculateCommission({
                    partnerId: 'partner-123',
                    baseAmount: 1000,
                    commissionType: 'referral',
                })
            ).rejects.toThrow('No active contract found for partner');
        });
    });

    describe('processPayout', () => {
        it('should process payout for pending commissions', async () => {
            const data = {
                partnerId: 'partner-123',
                periodStart: new Date('2024-01-01'),
                periodEnd: new Date('2024-01-31'),
            };

            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({
                    rows: [
                        { commission_amount: 100 },
                        { commission_amount: 150 },
                        { commission_amount: 75 },
                    ],
                })
                .mockResolvedValueOnce({ rows: [{ count: '10' }] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'payout-123',
                        partner_id: data.partnerId,
                        payout_batch_number: 'PAYOUT-202401-0011',
                        total_amount: 325,
                        commission_count: 3,
                        status: 'pending',
                    }],
                })
                .mockResolvedValueOnce() // Update commissions
                .mockResolvedValueOnce(); // COMMIT

            const result = await partnerService.processPayout(data, 'user-123');

            expect(result.totalAmount).toBe(325);
            expect(result.commissionCount).toBe(3);
            expect(result.status).toBe('pending');
        });

        it('should throw error if no pending commissions', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({ rows: [] }); // No commissions

            await expect(
                partnerService.processPayout({
                    partnerId: 'partner-123',
                    periodStart: new Date(),
                    periodEnd: new Date(),
                }, 'user-123')
            ).rejects.toThrow('No pending commissions found');
        });
    });

    describe('getPartnerPerformance', () => {
        it('should return performance metrics', async () => {
            const partnerId = 'partner-123';

            mockPool.query.mockResolvedValue({
                rows: [
                    {
                        partner_id: partnerId,
                        metric_date: new Date('2024-01-01'),
                        referrals_count: 10,
                        conversions_count: 5,
                        conversion_rate: 50.00,
                        total_revenue: 5000,
                        total_commissions: 500,
                        active_customers: 5,
                        churned_customers: 0,
                        average_customer_value: 1000,
                    },
                ],
            });

            const result = await partnerService.getPartnerPerformance(partnerId);

            expect(result).toHaveLength(1);
            expect(result[0].referralsCount).toBe(10);
            expect(result[0].conversionRate).toBe(50);
            expect(result[0].totalRevenue).toBe(5000);
        });
    });
});
