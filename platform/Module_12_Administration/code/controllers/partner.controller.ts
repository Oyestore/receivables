import { Request, Response, NextFunction } from 'express';
import { partnerManagementService } from '../services/partner-management.service';
import { auditService } from '../services/audit.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('PartnerController');

export class PartnerController {
    /**
     * POST /api/v1/partners
     * Register a new partner
     */
    async registerPartner(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { partnerName, partnerType, contactEmail, contactPhone, contactPerson, companyDetails } = req.body;

            if (!partnerName || !partnerType || !contactEmail) {
                throw new ValidationError('Missing required fields: partner Name, partnerType, contactEmail');
            }

            const partner = await partnerManagementService.registerPartner({
                partnerName,
                partnerType,
                contactEmail,
                contactPhone,
                contactPerson,
                companyDetails,
            });

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId: req.user?.id,
                action: 'partner.register',
                resourceType: 'partner',
                resourceId: partner.id,
                changes: { partnerName, partnerType },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Partner registered successfully',
                data: partner,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/partners/:id/contracts
     * Create partner contract
     */
    async createContract(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: partnerId } = req.params;
            const {
                contractType,
                commissionRate,
                revenueShareRate,
                flatFeePerReferral,
                minimumCommitment,
                contractStart,
                contractEnd,
                paymentTerms,
                terms,
            } = req.body;

            if (!contractType || !contractStart) {
                throw new ValidationError('Missing required fields: contractType, contractStart');
            }

            const contract = await partnerManagementService.createContract(
                {
                    partnerId,
                    contractType,
                    commissionRate,
                    revenueShareRate,
                    flatFeePerReferral,
                    minimumCommitment,
                    contractStart: new Date(contractStart),
                    contractEnd: contractEnd ? new Date(contractEnd) : undefined,
                    paymentTerms,
                    terms,
                },
                req.user?.id
            );

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId: req.user?.id,
                action: 'partner.contract_create',
                resourceType: 'partner_contract',
                resourceId: contract.id,
                changes: { partnerId, contractType },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Contract created successfully',
                data: contract,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/partners/:id/referrals
     * Track referral
     */
    async trackReferral(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: partnerId } = req.params;
            const { referredEmail, referredCompany, metadata } = req.body;

            if (!referredEmail) {
                throw new ValidationError('Referred email is required');
            }

            const referral = await partnerManagementService.trackReferral({
                partnerId,
                referredEmail,
                referredCompany,
                metadata,
            });

            res.status(201).json({
                message: 'Referral tracked successfully',
                data: referral,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/referrals/:id/convert
     *Convert referral to customer
     */
    async convertReferral(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: referralId } = req.params;
            const { tenantId } = req.body;

            if (!tenantId) {
                throw new ValidationError('Tenant ID is required');
            }

            const referral = await partnerManagementService.convertReferral(referralId, tenantId);

            await auditService.log({
                tenantId,
                userId: req.user?.id,
                action: 'partner.referral_converted',
                resourceType: 'partner_referral',
                resourceId: referralId,
                changes: { tenantId },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(200).json({
                message: 'Referral converted successfully',
                data: referral,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/partners/:id/commissions
     * Calculate commission
     */
    async calculateCommission(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: partnerId } = req.params;
            const { referralId, tenantId, baseAmount, commissionType, periodStart, periodEnd } = req.body;

            if (!baseAmount || !commissionType) {
                throw new ValidationError('Missing required fields: baseAmount, commissionType');
            }

            const commission = await partnerManagementService.calculateCommission({
                partnerId,
                referralId,
                tenantId,
                baseAmount,
                commissionType,
                periodStart: periodStart ? new Date(periodStart) : undefined,
                periodEnd: periodEnd ? new Date(periodEnd) : undefined,
            });

            res.status(201).json({
                message: 'Commission calculated',
                data: commission,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/partners/:id/payouts
     * Process payout
     */
    async processPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: partnerId } = req.params;
            const { periodStart, periodEnd, payoutMethod, payoutDetails } = req.body;

            if (!periodStart || !periodEnd) {
                throw new ValidationError('Period start and end dates are required');
            }

            const payout = await partnerManagementService.processPayout(
                {
                    partnerId,
                    periodStart: new Date(periodStart),
                    periodEnd: new Date(periodEnd),
                    payoutMethod,
                    payoutDetails,
                },
                req.user?.id
            );

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId: req.user?.id,
                action: 'partner.payout_process',
                resourceType: 'partner_payout',
                resourceId: payout.id,
                changes: { partnerId, totalAmount: payout.totalAmount },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Payout processed',
                data: payout,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/partners/:id/performance
     * Get partner performance
     */
    async getPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: partnerId } = req.params;
            const { startDate, endDate } = req.query;

            const performance = await partnerManagementService.getPartnerPerformance(
                partnerId,
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined
            );

            res.status(200).json({
                data: performance,
                total: performance.length,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const partnerController = new PartnerController();
