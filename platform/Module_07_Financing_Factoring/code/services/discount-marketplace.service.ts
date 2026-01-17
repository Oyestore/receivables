import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DiscountOffer } from '../entities/discount-offer.entity';

/**
 * Discount offer details for marketplace
 */
export interface MarketplaceDiscountOffer {
    id: string;
    invoiceId: string;
    invoiceAmount: number;
    discountRate: number; // percentage
    discountAmount: number; // absolute
    netPayment: number; // amount after discount

    // Parties
    buyerId: string;
    buyerName: string;
    supplierId: string;
    supplierName: string;

    // Status
    status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'completed';
    acceptedAt?: Date;
    acceptanceMethod?: 'own_funds' | 'platform_financing';

    // Terms
    expiresAt: Date;
    paymentDueDate: Date; // Original due date
    daysEarly: number; // How many days early

    // Analytics
    estimatedRoi: number; // For supplier
  financing Cost ?: number; // If financed

createdAt: Date;
updatedAt: Date;
}

/**
 * Marketplace analytics
 */
export interface MarketplaceAnalytics {
    // Volume
    totalOffersCreated: number;
    totalOffersAccepted: number;
    totalOffersRejected: number;
    acceptanceRate: number; // percentage

    // Value
    totalDiscountValue: number;
    totalFinancingVolume: number;
    averageDiscountRate: number;

    // Participation
    activeBuyers: number;
    activeSuppliers: number;

    // Period
    periodStart: Date;
    periodEnd: Date;
}

/**
 * Discount Marketplace Service
 * 
 * Buyer-side marketplace for early payment discounts
 * Suppliers can accept with own funds or platform financing
 */
@Injectable()
export class DiscountMarketplaceService {
    private readonly logger = new Logger(DiscountMarketplaceService.name);

    constructor(
        @InjectRepository(DiscountOffer)
        private readonly discountOfferRepository: Repository<DiscountOffer>,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * Buyer creates discount offer
     */
    async createDiscountOffer(
        invoiceId: string,
        buyerId: string,
        discountRate: number,
        expiryDays: number = 7,
    ): Promise<MarketplaceDiscountOffer> {
        this.logger.log(`Creating discount offer for invoice ${invoiceId}`);

        // Validate discount rate
        if (discountRate < 0.5 || discountRate > 10) {
            throw new BadRequestException('Discount rate must be between 0.5% and 10%');
        }

        // TODO: Get invoice details from Module 01
        const invoiceAmount = 500000; // Mock
        const supplierId = 'supplier-123'; // Mock
        const paymentDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); //Mock

        const discountAmount = (invoiceAmount * discountRate) / 100;
        const netPayment = invoiceAmount - discountAmount;

        const offer = this.discountOfferRepository.create({
            invoiceId,
            tenantId: 'tenant-123', // TODO: Get from context
            buyerId,
            sellerId: supplierId,
            offerAmount: netPayment,
            discountPercentage: discountRate,
            discountAmount,
            originalAmount: invoiceAmount,
            status: 'pending',
            expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
            createdBy: buyerId,
        });

        const saved = await this.discountOfferRepository.save(offer);

        // Emit event
        this.eventEmitter.emit('marketplace.offer_created', {
            offerId: saved.id,
            invoiceId,
            buyerId,
            supplierId,
            discountRate,
        });

        return this.toMarketplaceOffer(saved);
    }

    /**
     * Get available offers for supplier
     */
    async getAvailableOffers(supplierId: string): Promise<MarketplaceDiscountOffer[]> {
        const offers = await this.discountOfferRepository.find({
            where: {
                sellerId: supplierId,
                status: 'pending',
            },
            order: {
                createdAt: 'DESC',
            },
        });

        return offers.map(o => this.toMarketplaceOffer(o));
    }

    /**
     * Supplier accepts offer
     */
    async acceptOffer(
        offerId: string,
        supplierId: string,
        method: 'own_funds' | 'platform_financing',
    ): Promise<{ success: boolean; financingApplicationId?: string }> {
        const offer = await this.discountOfferRepository.findOne({
            where: { id: offerId },
        });

        if (!offer) {
            throw new NotFoundException('Offer not found');
        }

        if (offer.sellerId !== supplierId) {
            throw new BadRequestException('Not authorized');
        }

        if (offer.status !== 'pending') {
            throw new BadRequestException(`Offer is ${offer.status}`);
        }

        if (new Date() > offer.expiresAt) {
            offer.status = 'expired';
            await this.discountOfferRepository.save(offer);
            throw new BadRequestException('Offer expired');
        }

        // Update offer
        offer.status = 'accepted';
        offer.acceptedAt = new Date();
        await this.discountOfferRepository.save(offer);

        // Emit event
        this.eventEmitter.emit('marketplace.offer_accepted', {
            offerId: offer.id,
            method,
            supplierId,
        });

        if (method === 'platform_financing') {
            // Create financing application
            const financingAppId = await this.createFinancingForDiscount(offer);

            return {
                success: true,
                financingApplicationId: financingAppId,
            };
        }

        return { success: true };
    }

    /**
     * Create financing application for discount
     */
    private async createFinancingForDiscount(
        offer: DiscountOffer,
    ): Promise<string> {
        // TODO: Integrate with ApplicationOrchestratorService
        // Create application for offer.offerAmount

        this.logger.log(`Creating financing for discount offer ${offer.id}`);

        return 'fin-app-123'; // Mock
    }

    /**
     * Suggest optimal discount rate
     */
    suggestDiscountRate(
        invoiceAmount: number,
        paymentTermDays: number,
    ): { recommended: number; min: number; max: number; reasoning: string } {
        // Rule-based suggestions
        let recommended = 2.0; // default
        let min = 1.0;
        let max = 3.0;

        if (paymentTermDays <= 30) {
            recommended = 1.5;
            min = 1.0;
            max = 2.5;
        } else if (paymentTermDays <= 60) {
            recommended = 2.5;
            min = 2.0;
            max = 4.0;
        } else if (paymentTermDays <= 90) {
            recommended = 4.0;
            min = 3.0;
            max = 6.0;
        } else {
            recommended = 5.0;
            min = 4.0;
            max = 7.0;
        }

        // Adjust for amount
        if (invoiceAmount > 10000000) { // ₹1Cr+
            recommended -= 0.5;
            min -= 0.5;
            max -= 0.5;
        }

        return {
            recommended: Math.max(0.5, recommended),
            min: Math.max(0.5, min),
            max: Math.min(10, max),
            reasoning: `Based on ${paymentTermDays}-day payment terms and market rates`,
        };
    }

    /**
     * Get marketplace analytics
     */
    async getAnalytics(
        tenantId: string,
        periodDays: number = 30,
    ): Promise<MarketplaceAnalytics> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        const offers = await this.discountOfferRepository.find({
            where: {
                tenantId,
            },
        });

        const periodOffers = offers.filter(o => o.createdAt >= startDate);

        const accepted = periodOffers.filter(o => o.status === 'accepted');
        const rejected = periodOffers.filter(o => o.status === 'rejected');

        const totalDiscountValue = periodOffers.reduce(
            (sum, o) => sum + (o.discountAmount || 0),
            0,
        );

        const avgDiscountRate =
            periodOffers.length > 0
                ? periodOffers.reduce((sum, o) => sum + o.discountPercentage, 0) / periodOffers.length
                : 0;

        return {
            totalOffersCreated: periodOffers.length,
            totalOffersAccepted: accepted.length,
            totalOffersRejected: rejected.length,
            acceptanceRate: periodOffers.length > 0 ? (accepted.length / periodOffers.length) * 100 : 0,
            totalDiscountValue,
            totalFinancingVolume: 0, // TODO: Calculate
            averageDiscountRate: avgDiscountRate,
            activeBuyers: new Set(periodOffers.map(o => o.buyerId)).size,
            activeSuppliers: new Set(periodOffers.map(o => o.sellerId)).size,
            periodStart: startDate,
            periodEnd: new Date(),
        };
    }

    /**
     * Convert entity to marketplace offer
     */
    private toMarketplaceOffer(offer: DiscountOffer): MarketplaceDiscountOffer {
        const daysEarly = 30; // TODO: Calculate from invoice due date

        return {
            id: offer.id,
            invoiceId: offer.invoiceId,
            invoiceAmount: offer.originalAmount,
            discountRate: offer.discountPercentage,
            discountAmount: offer.discountAmount || 0,
            netPayment: offer.offerAmount,
            buyerId: offer.buyerId,
            buyerName: 'Buyer Corp', // TODO: Get from user service
            supplierId: offer.sellerId,
            supplierName: 'Supplier Inc', // TODO: Get from user service
            status: offer.status as any,
            acceptedAt: offer.acceptedAt,
            expiresAt: offer.expiresAt,
            paymentDueDate: new Date(), // TODO: From invoice
            daysEarly,
            estimatedRoi: (offer.discountAmount || 0) / daysEarly, // Daily ROI
            createdAt: offer.createdAt,
            updatedAt: offer.updatedAt,
        };
    }
}
