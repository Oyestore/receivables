import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { Campaign } from '../entities/campaign.entity';
import { Referral } from '../entities/referral.entity';
import { CustomerHealth } from '../entities/customer-health.entity';

/**
 * GDPR Compliance Service
 * 
 * Implements GDPR requirements:
 * - Right to access (data export)
 * - Right to erasure (data deletion)
 * - Data portability
 * - Consent management
 */

export interface GDPRDataExport {
    customerId: string;
    exportedAt: Date;
    data: {
        personalInfo: any;
        campaigns: any[];
        referrals: any[];
        healthRecords: any[];
        communications: any[];
    };
}

@Injectable()
export class GDPRComplianceService {
    private readonly logger = new Logger(GDPRComplianceService.name);

    constructor(
        @InjectRepository(Customer)
        private customerRepo: Repository<Customer>,
        @InjectRepository(Campaign)
        private campaignRepo: Repository<Campaign>,
        @InjectRepository(Referral)
        private referralRepo: Repository<Referral>,
        @InjectRepository(CustomerHealth)
        private healthRepo: Repository<CustomerHealth>,
    ) { }

    /**
     * Right to Access - Export all customer data
     */
    async exportCustomerData(customerId: string, tenantId: string): Promise<GDPRDataExport> {
        this.logger.log(`GDPR data export requested for customer: ${customerId}`);

        // Gather all customer data from various tables
        const customer = await this.customerRepo.findOne({
            where: { id: customerId, tenantId },
        });

        if (!customer) {
            throw new Error('Customer not found');
        }

        // Get all related campaign data
        const campaigns = await this.campaignRepo
            .createQueryBuilder('campaign')
            .where('campaign.tenantId = :tenantId', { tenantId })
            .getMany();

        // Get referral data
        const referrals = await this.referralRepo.find({
            where: [
                { referrerId: customerId, tenantId },
                { referredId: customerId, tenantId },
            ],
        });

        // Get health records
        const healthRecords = await this.healthRepo.find({
            where: { customerId, tenantId },
        });

        const exportData: GDPRDataExport = {
            customerId,
            exportedAt: new Date(),
            data: {
                personalInfo: {
                    id: customer.id,
                    email: customer.email,
                    companyName: customer.companyName,
                    contactName: customer.contactName,
                    phone: customer.phone,
                    // Exclude sensitive internal fields
                },
                campaigns: campaigns.map(c => ({
                    id: c.id,
                    name: c.name,
                    status: c.status,
                    createdAt: c.createdAt,
                })),
                referrals: referrals.map(r => ({
                    id: r.id,
                    code: r.referralCode,
                    status: r.status,
                    createdAt: r.createdAt,
                })),
                healthRecords: healthRecords.map(h => ({
                    overallScore: h.overallScore,
                    engagementScore: h.engagementScore,
                    lastAssessmentDate: h.lastAssessmentDate,
                })),
                communications: [], // Would include email/SMS history
            },
        };

        // Log the export for audit trail
        this.logger.log(`GDPR data export completed for customer: ${customerId}`);

        return exportData;
    }

    /**
     * Right to Erasure - Delete all customer data
     */
    async deleteCustomerData(
        customerId: string,
        tenantId: string,
        options: { keepFinancialRecords?: boolean } = {},
    ): Promise<{
        deleted: boolean;
        itemsDeleted: number;
        retainedRecords?: string[];
    }> {
        this.logger.warn(`GDPR data deletion requested for customer: ${customerId}`);

        const retainedRecords: string[] = [];
        let itemsDeleted = 0;

        // Delete health records
        const healthDeleted = await this.healthRepo.delete({
            customerId,
            tenantId,
        });
        itemsDeleted += healthDeleted.affected || 0;

        // Delete or anonymize referrals
        const referrals = await this.referralRepo.find({
            where: [
                { referrerId: customerId, tenantId },
                { referredId: customerId, tenantId },
            ],
        });

        for (const referral of referrals) {
            if (options.keepFinancialRecords && referral.rewardAmount > 0) {
                // Anonymize instead of delete
                referral.referrerId = 'DELETED_USER';
                await this.referralRepo.save(referral);
                retainedRecords.push(`Referral ${referral.id} (anonymized)`);
            } else {
                await this.referralRepo.remove(referral);
                itemsDeleted++;
            }
        }

        // Anonymize customer record (don't delete for audit trail)
        const customer = await this.customerRepo.findOne({
            where: { id: customerId, tenantId },
        });

        if (customer) {
            customer.email = `deleted_${customerId}@deleted.local`;
            customer.companyName = 'DELETED';
            customer.contactName = 'DELETED';
            customer.phone = null;
            customer.gdprDeletedAt = new Date();
            await this.customerRepo.save(customer);
            itemsDeleted++;
        }

        this.logger.warn(
            `GDPR data deletion completed for customer: ${customerId}, items deleted: ${itemsDeleted}`,
        );

        return {
            deleted: true,
            itemsDeleted,
            retainedRecords: retainedRecords.length > 0 ? retainedRecords : undefined,
        };
    }

    /**
     * Check if customer has given consent for data processing
     */
    async checkConsent(customerId: string, tenantId: string, purpose: string): Promise<boolean> {
        // In full implementation, this would check a consent record
        this.logger.log(`Checking consent for customer ${customerId}, purpose: ${purpose}`);

        const customer = await this.customerRepo.findOne({
            where: { id: customerId, tenantId },
        });

        // Placeholder: check if customer has consent record
        return customer?.marketingConsent || false;
    }

    /**
     * Record customer consent
     */
    async recordConsent(
        customerId: string,
        tenantId: string,
        purpose: string,
        granted: boolean,
    ): Promise<void> {
        this.logger.log(
            `Recording consent for customer ${customerId}, purpose: ${purpose}, granted: ${granted}`,
        );

        const customer = await this.customerRepo.findOne({
            where: { id: customerId, tenantId },
        });

        if (customer) {
            customer.marketingConsent = granted;
            customer.consentRecordedAt = new Date();
            await this.customerRepo.save(customer);
        }
    }
}
