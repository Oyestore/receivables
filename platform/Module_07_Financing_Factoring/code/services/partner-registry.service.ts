import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IFinancingPartnerPlugin, FinancingProduct } from '../interfaces/financing-partner-plugin.interface';

/**
 * Partner Registry Service
 * 
 * Central registry of all financing partners
 * - Manages partner lifecycle
 * - Provides partner discovery by ID or product type
 * - Enables dynamic partner selection
 * - Powers multi-partner auction engine
 */
@Injectable()
export class PartnerRegistryService {
    private readonly logger = new Logger(PartnerRegistryService.name);
    private readonly partners: Map<string, IFinancingPartnerPlugin> = new Map();

    constructor(
        // Partner adapters will be injected here as they're created
        // For now, we'll register them manually in the constructor
    ) {
        this.logger.log('Partner Registry Service initialized');
    }

    /**
     * Register a partner adapter
     * Called at module initialization for each partner
     */
    registerPartner(partner: IFinancingPartnerPlugin): void {
        if (this.partners.has(partner.partnerId)) {
            this.logger.warn(`Partner ${partner.partnerId} already registered, skipping`);
            return;
        }

        this.partners.set(partner.partnerId, partner);
        this.logger.log(
            `Registered partner: ${partner.partnerName} (${partner.partnerId}) ` +
            `supporting ${partner.supportedProducts.length} products`,
        );
    }

    /**
     * Unregister a partner (for maintenance or deprecation)
     */
    unregisterPartner(partnerId: string): boolean {
        const deleted = this.partners.delete(partnerId);
        if (deleted) {
            this.logger.log(`Unregistered partner: ${partnerId}`);
        }
        return deleted;
    }

    /**
     * Get partner by ID
     * Throws if partner not found
     */
    getPartner(partnerId: string): IFinancingPartnerPlugin {
        const partner = this.partners.get(partnerId);

        if (!partner) {
            throw new NotFoundException(
                `Financing partner '${partnerId}' not found. ` +
                `Available partners: ${Array.from(this.partners.keys()).join(', ')}`,
            );
        }

        return partner;
    }

    /**
     * Get partner by ID (safe - returns null if not found)
     */
    findPartner(partnerId: string): IFinancingPartnerPlugin | null {
        return this.partners.get(partnerId) || null;
    }

    /**
     * Get all registered partners
     */
    getAllPartners(): IFinancingPartnerPlugin[] {
        return Array.from(this.partners.values());
    }

    /**
     * Get all partner IDs
     */
    getAllPartnerIds(): string[] {
        return Array.from(this.partners.keys());
    }

    /**
     * Get partners that support a specific product
     * Used for intelligent partner selection
     */
    getPartnersByProduct(product: FinancingProduct): IFinancingPartnerPlugin[] {
        return this.getAllPartners().filter(
            partner => partner.supportedProducts.includes(product),
        );
    }

    /**
     * Get partners that support multiple products
     * Returns partners that support ALL specified products
     */
    getPartnersByProducts(products: FinancingProduct[]): IFinancingPartnerPlugin[] {
        return this.getAllPartners().filter(partner =>
            products.every(product => partner.supportedProducts.includes(product)),
        );
    }

    /**
     * Get partners that support ANY of the specified products
     */
    getPartnersByAnyProduct(products: FinancingProduct[]): IFinancingPartnerPlugin[] {
        return this.getAllPartners().filter(partner =>
            products.some(product => partner.supportedProducts.includes(product)),
        );
    }

    /**
     * Check if partner is registered
     */
    hasPartner(partnerId: string): boolean {
        return this.partners.has(partnerId);
    }

    /**
     * Get count of registered partners
     */
    getPartnerCount(): number {
        return this.partners.size;
    }

    /**
     * Get registry statistics
     */
    getRegistryStats(): {
        totalPartners: number;
        partnersByType: Record<string, number>;
        productCoverage: Record<string, number>;
    } {
        const partners = this.getAllPartners();

        // Count partners by type
        const partnersByType: Record<string, number> = {};
        partners.forEach(partner => {
            partnersByType[partner.partnerType] = (partnersByType[partner.partnerType] || 0) + 1;
        });

        // Count partners supporting each product
        const productCoverage: Record<string, number> = {};
        partners.forEach(partner => {
            partner.supportedProducts.forEach(product => {
                productCoverage[product] = (productCoverage[product] || 0) + 1;
            });
        });

        return {
            totalPartners: partners.length,
            partnersByType,
            productCoverage,
        };
    }

    /**
     * Get partners summary (for debugging/monitoring)
     */
    getPartnersSummary(): Array<{
        id: string;
        name: string;
        type: string;
        products: string[];
    }> {
        return this.getAllPartners().map(partner => ({
            id: partner.partnerId,
            name: partner.partnerName,
            type: partner.partnerType,
            products: partner.supportedProducts,
        }));
    }

    /**
     * Validate partner configuration
     * Checks if partner implements all required methods
     */
    validatePartner(partner: IFinancingPartnerPlugin): {
        valid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // Check required properties
        if (!partner.partnerId) errors.push('Missing partnerId');
        if (!partner.partnerName) errors.push('Missing partnerName');
        if (!partner.partnerType) errors.push('Missing partnerType');
        if (!partner.supportedProducts || partner.supportedProducts.length === 0) {
            errors.push('Missing or empty supportedProducts');
        }

        // Check required methods
        const requiredMethods = [
            'checkEligibility',
            'submitApplication',
            'getOffers',
            'trackStatus',
            'handleWebhook',
        ];

        requiredMethods.forEach(method => {
            if (typeof (partner as any)[method] !== 'function') {
                errors.push(`Missing required method: ${method}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * List available products across all partners
     */
    getAvailableProducts(): FinancingProduct[] {
        const productsSet = new Set<FinancingProduct>();

        this.getAllPartners().forEach(partner => {
            partner.supportedProducts.forEach(product => productsSet.add(product));
        });

        return Array.from(productsSet);
    }

    /**
     * Find best partner for a specific product based on criteria
     * (Phase 4 - Pre-qualification will use this)
     */
    async findBestPartner(
        product: FinancingProduct,
        criteria?: {
            preferredType?: string;
            excludeIds?: string[];
        },
    ): Promise<IFinancingPartnerPlugin | null> {
        let candidates = this.getPartnersByProduct(product);

        // Apply filters
        if (criteria?.excludeIds && criteria.excludeIds.length > 0) {
            candidates = candidates.filter(
                partner => !criteria.excludeIds!.includes(partner.partnerId),
            );
        }

        if (criteria?.preferredType) {
            const preferred = candidates.filter(
                partner => partner.partnerType === criteria.preferredType,
            );
            if (preferred.length > 0) {
                candidates = preferred;
            }
        }

        // For now, return first candidate
        // In Phase 4, this will use ML-based selection
        return candidates.length > 0 ? candidates[0] : null;
    }
}
