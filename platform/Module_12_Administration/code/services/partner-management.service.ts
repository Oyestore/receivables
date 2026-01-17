import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';
import {
    IPartner,
    IPartnerContract,
    IPartnerReferral,
    IPartnerCommission,
    IPartnerPayout,
    IPartnerPerformance,
} from '../interfaces/partner.interface';

const logger = new Logger('PartnerManagementService');

/**
 * Partner Management Service
 * Handles partner ecosystem, referrals, commissions, and payouts
 */
export class PartnerManagementService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Register a new partner
     */
    async registerPartner(partnerData: {
        partnerName: string;
        partnerType: 'reseller' | 'referral' | 'integration' | 'affiliate';
        contactEmail: string;
        contactPhone?: string;
        contactPerson?: string;
        companyDetails?: any;
    }): Promise<IPartner> {
        try {
            // Generate unique partner code
            const partnerCode = await this.generatePartnerCode(partnerData.partnerName);

            const result = await this.pool.query(
                `INSERT INTO partners (
          partner_code, partner_name, partner_type, contact_email,
          contact_phone, contact_person, company_details, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING *`,
                [
                    partnerCode,
                    partnerData.partnerName,
                    partnerData.partnerType,
                    partnerData.contactEmail,
                    partnerData.contactPhone || null,
                    partnerData.contactPerson || null,
                    partnerData.companyDetails ? JSON.stringify(partnerData.companyDetails) : null,
                ]
            );

            logger.info('Partner registered', {
                partnerId: result.rows[0].id,
                partnerCode,
                partnerName: partnerData.partnerName,
            });

            return this.mapPartnerFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to register partner', { error, partnerData });
            throw error;
        }
    }

    /**
     * Create partner contract
     */
    async createContract(contractData: {
        partnerId: string;
        contractType: 'reseller' | 'referral' | 'revenue_share' | 'affiliate';
        commissionRate?: number;
        revenueShareRate?: number;
        flatFeePerReferral?: number;
        minimumCommitment?: number;
        contractStart: Date;
        contractEnd?: Date;
        paymentTerms?: 'net-15' | 'net-30' | 'net-45' | 'net-60';
        terms?: any;
    }, createdBy: string): Promise<IPartnerContract> {
        try {
            // Verify partner exists
            const partner = await this.getPartner(contractData.partnerId);
            if (!partner) {
                throw new NotFoundError('Partner not found');
            }

            // Validate at least one commission structure
            if (!contractData.commissionRate && !contractData.revenueShareRate && !contractData.flatFeePerReferral) {
                throw new ValidationError('At least one commission structure must be provided');
            }

            // Generate contract number
            const contractNumber = await this.generateContractNumber(contractData.partnerId);

            const result = await this.pool.query(
                `INSERT INTO partner_contracts (
          partner_id, contract_number, contract_type, commission_rate,
          revenue_share_rate, flat_fee_per_referral, minimum_commitment,
          contract_start, contract_end, terms, payment_terms, created_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
        RETURNING *`,
                [
                    contractData.partnerId,
                    contractNumber,
                    contractData.contractType,
                    contractData.commissionRate || null,
                    contractData.revenueShareRate || null,
                    contractData.flatFeePerReferral || null,
                    contractData.minimumCommitment || 0,
                    contractData.contractStart,
                    contractData.contractEnd || null,
                    contractData.terms ? JSON.stringify(contractData.terms) : null,
                    contractData.paymentTerms || 'net-30',
                    createdBy,
                ]
            );

            logger.info('Partner contract created', {
                contractId: result.rows[0].id,
                partnerId: contractData.partnerId,
                contractNumber,
            });

            return this.mapContractFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create contract', { error, contractData });
            throw error;
        }
    }

    /**
     * Track referral
     */
    async trackReferral(referralData: {
        partnerId: string;
        referredEmail: string;
        referredCompany?: string;
        metadata?: any;
    }): Promise<IPartnerReferral> {
        try {
            // Verify partner exists and is active
            const partner = await this.getPartner(referralData.partnerId);
            if (!partner) {
                throw new NotFoundError('Partner not found');
            }

            if (partner.status !== 'active') {
                throw new ValidationError('Partner is not active');
            }

            // Generate unique referral code
            const referralCode = await this.generateReferralCode(referralData.partnerId);

            const result = await this.pool.query(
                `INSERT INTO partner_referrals (
          partner_id, referral_code, referred_email, referred_company, metadata, status
        ) VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING *`,
                [
                    referralData.partnerId,
                    referralCode,
                    referralData.referredEmail,
                    referralData.referredCompany || null,
                    referralData.metadata ? JSON.stringify(referralData.metadata) : null,
                ]
            );

            logger.info('Referral tracked', {
                referralId: result.rows[0].id,
                partnerId: referralData.partnerId,
                referralCode,
            });

            return this.mapReferralFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to track referral', { error, referralData });
            throw error;
        }
    }

    /**
     * Convert referral to customer
     */
    async convertReferral(referralId: string, tenantId: string): Promise<IPartnerReferral> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get referral
            const referralResult = await client.query(
                'SELECT * FROM partner_referrals WHERE id = $1',
                [referralId]
            );

            if (referralResult.rows.length === 0) {
                throw new NotFoundError('Referral not found');
            }

            // Update referral status
            const updated = await client.query(
                `UPDATE partner_referrals
         SET referred_tenant_id = $1,
             conversion_date = CURRENT_TIMESTAMP,
             status = 'converted',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
                [tenantId, referralId]
            );

            await client.query('COMMIT');

            logger.info('Referral converted', { referralId, tenantId });

            return this.mapReferralFromDb(updated.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to convert referral', { error, referralId });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Calculate and create commission
     */
    async calculateCommission(data: {
        partnerId: string;
        referralId?: string;
        tenantId?: string;
        baseAmount: number;
        commissionType: 'referral' | 'revenue_share' | 'flat_fee' | 'recurring';
        periodStart?: Date;
        periodEnd?: Date;
    }): Promise<IPartnerCommission> {
        try {
            // Get active contract for partner
            const contractsResult = await this.pool.query(
                `SELECT * FROM partner_contracts
         WHERE partner_id = $1 AND status = 'active'
         ORDER BY contract_start DESC
         LIMIT 1`,
                [data.partnerId]
            );

            if (contractsResult.rows.length === 0) {
                throw new NotFoundError('No active contract found for partner');
            }

            const contract = contractsResult.rows[0];
            let commissionRate = 0;
            let commissionAmount = 0;

            // Calculate commission based on type
            switch (data.commissionType) {
                case 'referral':
                case 'revenue_share':
                    if (contract.commission_rate) {
                        commissionRate = parseFloat(contract.commission_rate);
                        commissionAmount = (data.baseAmount * commissionRate) / 100;
                    } else if (contract.revenue_share_rate) {
                        commissionRate = parseFloat(contract.revenue_share_rate);
                        commissionAmount = (data.baseAmount * commissionRate) / 100;
                    }
                    break;

                case 'flat_fee':
                    if (contract.flat_fee_per_referral) {
                        commissionAmount = parseFloat(contract.flat_fee_per_referral);
                    }
                    break;

                case 'recurring':
                    if (contract.revenue_share_rate) {
                        commissionRate = parseFloat(contract.revenue_share_rate);
                        commissionAmount = (data.baseAmount * commissionRate) / 100;
                    }
                    break;
            }

            if (commissionAmount === 0) {
                throw new ValidationError('Unable to calculate commission - no valid commission structure');
            }

            // create commission record
            const result = await this.pool.query(
                `INSERT INTO partner_commissions (
          partner_id, contract_id, referral_id, tenant_id,
          commission_type, base_amount, commission_rate, commission_amount,
          period_start, period_end, commission_date, payout_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, 'pending')
        RETURNING *`,
                [
                    data.partnerId,
                    contract.id,
                    data.referralId || null,
                    data.tenantId || null,
                    data.commissionType,
                    data.baseAmount,
                    commissionRate || null,
                    commissionAmount,
                    data.periodStart || null,
                    data.periodEnd || null,
                ]
            );

            logger.info('Commission calculated', {
                commissionId: result.rows[0].id,
                partnerId: data.partnerId,
                commissionAmount,
            });

            return this.mapCommissionFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to calculate commission', { error, data });
            throw error;
        }
    }

    /**
     * Process partner payout
     */
    async processPayout(data: {
        partnerId: string;
        periodStart: Date;
        periodEnd: Date;
        payoutMethod?: 'bank_transfer' | 'paypal' | 'stripe' | 'check' | 'wire';
        payoutDetails?: any;
    }, processedBy: string): Promise<IPartnerPayout> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get all pending commissions for the partner in the period
            const commissionsResult = await client.query(
                `SELECT * FROM partner_commissions
         WHERE partner_id = $1
           AND payout_status = 'pending'
           AND commission_date >= $2
           AND commission_date <= $3`,
                [data.partnerId, data.periodStart, data.periodEnd]
            );

            if (commissionsResult.rows.length === 0) {
                throw new ValidationError('No pending commissions found for this partner in the specified period');
            }

            // Calculate total
            const totalAmount = commissionsResult.rows.reduce(
                (sum, comm) => sum + parseFloat(comm.commission_amount),
                0
            );

            // Generate payout batch number
            const batchNumber = await this.generatePayoutBatchNumber();

            // Create payout record
            const payoutResult = await client.query(
                `INSERT INTO partner_payouts (
          partner_id, payout_batch_number, total_amount, commission_count,
          period_start, period_end, payout_method, payout_details,
          status, processed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
        RETURNING *`,
                [
                    data.partnerId,
                    batchNumber,
                    totalAmount,
                    commissionsResult.rows.length,
                    data.periodStart,
                    data.periodEnd,
                    data.payoutMethod || 'bank_transfer',
                    data.payoutDetails ? JSON.stringify(data.payoutDetails) : null,
                    processedBy,
                ]
            );

            // Update commissions to reference this payout
            await client.query(
                `UPDATE partner_commissions
         SET payout_status = 'approved',
             updated_at = CURRENT_TIMESTAMP
         WHERE partner_id = $1
           AND payout_status = 'pending'
           AND commission_date >= $2
           AND commission_date <= $3`,
                [data.partnerId, data.periodStart, data.periodEnd]
            );

            await client.query('COMMIT');

            logger.info('Payout processed', {
                payoutId: payoutResult.rows[0].id,
                partnerId: data.partnerId,
                totalAmount,
                commissionCount: commissionsResult.rows.length,
            });

            return this.mapPayoutFromDb(payoutResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to process payout', { error, data });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get partner performance metrics
     */
    async getPartnerPerformance(
        partnerId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IPartnerPerformance[]> {
        try {
            let query = `
        SELECT * FROM partner_performance
        WHERE partner_id = $1
      `;
            const params: any[] = [partnerId];

            if (startDate) {
                params.push(startDate);
                query += ` AND metric_date >= $${params.length}`;
            }

            if (endDate) {
                params.push(endDate);
                query += ` AND metric_date <= $${params.length}`;
            }

            query += ' ORDER BY metric_date DESC';

            const result = await this.pool.query(query, params);

            return result.rows.map(row => this.mapPerformanceFromDb(row));
        } catch (error) {
            logger.error('Failed to get partner performance', { error, partnerId });
            throw error;
        }
    }

    /**
     * Update daily performance metrics
     */
    async updatePerformanceMetrics(partnerId: string, date: Date): Promise<void> {
        try {
            // Get referral metrics
            const referralsResult = await this.pool.query(
                `SELECT
           COUNT(*) FILTER (WHERE status != 'cancelled') as referrals_count,
           COUNT(*) FILTER (WHERE status = 'converted' OR status = 'paid') as conversions_count
         FROM partner_referrals
         WHERE partner_id = $1 AND DATE(referral_date) = $2`,
                [partnerId, date]
            );

            // Get revenue metrics
            const revenueResult = await this.pool.query(
                `SELECT
           SUM(base_amount) as total_revenue,
           SUM(commission_amount) as total_commissions,
           COUNT(DISTINCT tenant_id) as active_customers
         FROM partner_commissions
         WHERE partner_id = $1 AND commission_date = $2`,
                [partnerId, date]
            );

            const referrals = parseInt(referralsResult.rows[0].referrals_count, 10) || 0;
            const conversions = parseInt(referralsResult.rows[0].conversions_count, 10) || 0;
            const conversionRate = referrals > 0 ? (conversions / referrals) * 100 : 0;

            const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;
            const totalCommissions = parseFloat(revenueResult.rows[0].total_commissions) || 0;
            const activeCustomers = parseInt(revenueResult.rows[0].active_customers, 10) || 0;
            const avgCustomerValue = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

            // Upsert performance metrics
            await this.pool.query(
                `INSERT INTO partner_performance (
          partner_id, metric_date, referrals_count, conversions_count,
          conversion_rate, total_revenue, total_commissions, active_customers,
          average_customer_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (partner_id, metric_date)
        DO UPDATE SET
          referrals_count = EXCLUDED.referrals_count,
          conversions_count = EXCLUDED.conversions_count,
          conversion_rate = EXCLUDED.conversion_rate,
          total_revenue = EXCLUDED.total_revenue,
          total_commissions = EXCLUDED.total_commissions,
          active_customers = EXCLUDED.active_customers,
          average_customer_value = EXCLUDED.average_customer_value`,
                [
                    partnerId,
                    date,
                    referrals,
                    conversions,
                    conversionRate,
                    totalRevenue,
                    totalCommissions,
                    activeCustomers,
                    avgCustomerValue,
                ]
            );

            logger.info('Performance metrics updated', { partnerId, date });
        } catch (error) {
            logger.error('Failed to update performance metrics', { error, partnerId });
            throw error;
        }
    }

    /**
     * Get partner by ID
     */
    private async getPartner(partnerId: string): Promise<IPartner | null> {
        const result = await this.pool.query(
            'SELECT * FROM partners WHERE id = $1',
            [partnerId]
        );

        return result.rows.length > 0 ? this.mapPartnerFromDb(result.rows[0]) : null;
    }

    /**
     * Generate unique partner code
     */
    private async generatePartnerCode(partnerName: string): Promise<string> {
        const prefix = partnerName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 3);

        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();

        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Generate contract number
     */
    private async generateContractNumber(partnerId: string): Promise<string> {
        const year = new Date().getFullYear();
        const count = await this.pool.query(
            'SELECT COUNT(*) FROM partner_contracts WHERE partner_id = $1',
            [partnerId]
        );

        const seq = (parseInt(count.rows[0].count, 10) + 1).toString().padStart(4, '0');
        return `CONTRACT-${year}-${seq}`;
    }

    /**
     * Generate referral code
     */
    private async generateReferralCode(partnerId: string): Promise<string> {
        const partner = await this.getPartner(partnerId);
        const partnerCode = partner?.partnerCode.substring(0, 3) || 'REF';
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();

        return `${partnerCode}-${random}`;
    }

    /**
     * Generate payout batch number
     */
    private async generatePayoutBatchNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const count = await this.pool.query(
            `SELECT COUNT(*) FROM partner_payouts
       WHERE EXTRACT(YEAR FROM initiated_at) = $1
         AND EXTRACT(MONTH FROM initiated_at) = $2`,
            [year, new Date().getMonth() + 1]
        );

        const seq = (parseInt(count.rows[0].count, 10) + 1).toString().padStart(4, '0');
        return `PAYOUT-${year}${month}-${seq}`;
    }

    /**
     * Map partner from database
     */
    private mapPartnerFromDb(row: any): IPartner {
        return {
            id: row.id,
            partnerCode: row.partner_code,
            partnerName: row.partner_name,
            partnerType: row.partner_type,
            contactEmail: row.contact_email,
            contactPhone: row.contact_phone,
            contactPerson: row.contact_person,
            companyDetails: row.company_details,
            status: row.status,
            onboardedAt: row.onboarded_at,
            createdAt: row.created_at,
        };
    }

    /**
     * Map contract from database
     */
    private mapContractFromDb(row: any): IPartnerContract {
        return {
            id: row.id,
            partnerId: row.partner_id,
            contractNumber: row.contract_number,
            contractType: row.contract_type,
            commissionRate: row.commission_rate ? parseFloat(row.commission_rate) : undefined,
            revenueShareRate: row.revenue_share_rate ? parseFloat(row.revenue_share_rate) : undefined,
            flatFeePerReferral: row.flat_fee_per_referral ? parseFloat(row.flat_fee_per_referral) : undefined,
            minimumCommitment: row.minimum_commitment,
            contractStart: row.contract_start,
            contractEnd: row.contract_end,
            terms: row.terms,
            paymentTerms: row.payment_terms,
            status: row.status,
        };
    }

    /**
     * Map referral from database
     */
    private mapReferralFromDb(row: any): IPartnerReferral {
        return {
            id: row.id,
            partnerId: row.partner_id,
            referralCode: row.referral_code,
            referredTenantId: row.referred_tenant_id,
            referredEmail: row.referred_email,
            referredCompany: row.referred_company,
            referralDate: row.referral_date,
            conversionDate: row.conversion_date,
            firstPaymentDate: row.first_payment_date,
            firstPaymentAmount: row.first_payment_amount ? parseFloat(row.first_payment_amount) : undefined,
            status: row.status,
            rejectionReason: row.rejection_reason,
            metadata: row.metadata,
        };
    }

    /**
     * Map commission from database
     */
    private mapCommissionFromDb(row: any): IPartnerCommission {
        return {
            id: row.id,
            partnerId: row.partner_id,
            contractId: row.contract_id,
            referralId: row.referral_id,
            tenantId: row.tenant_id,
            commissionType: row.commission_type,
            baseAmount: parseFloat(row.base_amount),
            commissionRate: row.commission_rate ? parseFloat(row.commission_rate) : undefined,
            commissionAmount: parseFloat(row.commission_amount),
            currency: row.currency,
            periodStart: row.period_start,
            periodEnd: row.period_end,
            commissionDate: row.commission_date,
            payoutDate: row.payout_date,
            payoutStatus: row.payout_status,
            payoutReference: row.payout_reference,
        };
    }

    /**
     * Map payout from database
     */
    private mapPayoutFromDb(row: any): IPartnerPayout {
        return {
            id: row.id,
            partnerId: row.partner_id,
            payoutBatchNumber: row.payout_batch_number,
            totalAmount: parseFloat(row.total_amount),
            currency: row.currency,
            commissionCount: row.commission_count,
            periodStart: row.period_start,
            periodEnd: row.period_end,
            payoutMethod: row.payout_method,
            payoutDetails: row.payout_details,
            status: row.status,
            initiatedAt: row.initiated_at,
            completedAt: row.completed_at,
            failureReason: row.failure_reason,
        };
    }

    /**
     * Map performance from database
     */
    private mapPerformanceFromDb(row: any): IPartnerPerformance {
        return {
            partnerId: row.partner_id,
            metricDate: row.metric_date,
            referralsCount: row.referrals_count,
            conversionsCount: row.conversions_count,
            conversionRate: parseFloat(row.conversion_rate),
            totalRevenue: parseFloat(row.total_revenue),
            totalCommissions: parseFloat(row.total_commissions),
            activeCustomers: row.active_customers,
            churnedCustomers: row.churned_customers,
            averageCustomerValue: parseFloat(row.average_customer_value),
        };
    }
}

export const partnerManagementService = new PartnerManagementService();
