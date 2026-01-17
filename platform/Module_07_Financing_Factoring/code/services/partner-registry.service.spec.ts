import { Test, TestingModule } from '@nestjs/testing';
import { PartnerRegistryService } from './partner-registry.service';
import { IFinancingPartnerPlugin, PartnerType, FinancingProduct } from '../interfaces/financing-partner-plugin.interface';
import { NotFoundException } from '@nestjs/common';

describe('PartnerRegistryService', () => {
    let service: PartnerRegistryService;

    // Mock partner adapters
    const mockLendingKart: IFinancingPartnerPlugin = {
        partnerId: 'lendingkart',
        partnerName: 'LendingKart',
        partnerType: PartnerType.NBFC,
        supportedProducts: [
            FinancingProduct.INVOICE_FINANCING,
            FinancingProduct.WORKING_CAPITAL,
        ],
        checkEligibility: jest.fn(),
        submitApplication: jest.fn(),
        getOffers: jest.fn(),
        trackStatus: jest.fn(),
        handleWebhook: jest.fn(),
    };

    const mockCapitalFloat: IFinancingPartnerPlugin = {
        partnerId: 'capital_float',
        partnerName: 'Capital Float',
        partnerType: PartnerType.NBFC,
        supportedProducts: [
            FinancingProduct.INVOICE_FINANCING,
            FinancingProduct.WORKING_CAPITAL,
            FinancingProduct.CREDIT_LINE,
        ],
        checkEligibility: jest.fn(),
        submitApplication: jest.fn(),
        getOffers: jest.fn(),
        trackStatus: jest.fn(),
        handleWebhook: jest.fn(),
    };

    const mockBank: IFinancingPartnerPlugin = {
        partnerId: 'hdfc_bank',
        partnerName: 'HDFC Bank',
        partnerType: PartnerType.BANK,
        supportedProducts: [
            FinancingProduct.WORKING_CAPITAL,
            FinancingProduct.EQUIPMENT_FINANCING,
        ],
        checkEligibility: jest.fn(),
        submitApplication: jest.fn(),
        getOffers: jest.fn(),
        trackStatus: jest.fn(),
        handleWebhook: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PartnerRegistryService],
        }).compile();

        service = module.get<PartnerRegistryService>(PartnerRegistryService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('registerPartner', () => {
        it('should register a partner successfully', () => {
            service.registerPartner(mockLendingKart);

            expect(service.hasPartner('lendingkart')).toBe(true);
            expect(service.getPartnerCount()).toBe(1);
        });

        it('should register multiple partners', () => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);
            service.registerPartner(mockBank);

            expect(service.getPartnerCount()).toBe(3);
        });

        it('should not register duplicate partners', () => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockLendingKart); // Try to register again

            expect(service.getPartnerCount()).toBe(1);
        });

        it('should handle registration of partners with same name but different IDs', () => {
            const mockLendingKart2: IFinancingPartnerPlugin = {
                ...mockLendingKart,
                partnerId: 'lendingkart_v2',
            };

            service.registerPartner(mockLendingKart);
            service.registerPartner(mockLendingKart2);

            expect(service.getPartnerCount()).toBe(2);
            expect(service.hasPartner('lendingkart')).toBe(true);
            expect(service.hasPartner('lendingkart_v2')).toBe(true);
        });
    });

    describe('unregisterPartner', () => {
        beforeEach(() => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);
        });

        it('should unregister a partner', () => {
            const result = service.unregisterPartner('lendingkart');

            expect(result).toBe(true);
            expect(service.hasPartner('lendingkart')).toBe(false);
            expect(service.getPartnerCount()).toBe(1);
        });

        it('should return false for non-existent partner', () => {
            const result = service.unregisterPartner('invalid-partner');

            expect(result).toBe(false);
        });
    });

    describe('getPartner', () => {
        beforeEach(() => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);
        });

        it('should retrieve partner by ID', () => {
            const partner = service.getPartner('lendingkart');

            expect(partner).toBe(mockLendingKart);
            expect(partner.partnerName).toBe('LendingKart');
        });

        it('should throw NotFoundException for invalid ID', () => {
            expect(() => service.getPartner('invalid-id')).toThrow(NotFoundException);
        });

        it('should include available partners in error message', () => {
            try {
                service.getPartner('invalid-id');
            } catch (error) {
                expect(error.message).toContain('lendingkart');
                expect(error.message).toContain('capital_float');
            }
        });
    });

    describe('findPartner', () => {
        beforeEach(() => {
            service.registerPartner(mockLendingKart);
        });

        it('should return partner if found', () => {
            const partner = service.findPartner('lendingkart');

            expect(partner).toBe(mockLendingKart);
        });

        it('should return null if not found', () => {
            const partner = service.findPartner('invalid-id');

            expect(partner).toBeNull();
        });
    });

    describe('getAllPartners', () => {
        it('should return empty array when no partners registered', () => {
            const partners = service.getAllPartners();

            expect(partners).toHaveLength(0);
        });

        it('should return all registered partners', () => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);
            service.registerPartner(mockBank);

            const partners = service.getAllPartners();

            expect(partners).toHaveLength(3);
            expect(partners).toContain(mockLendingKart);
            expect(partners).toContain(mockCapitalFloat);
            expect(partners).toContain(mockBank);
        });
    });

    describe('getPartnersByProduct', () => {
        beforeEach(() => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);
            service.registerPartner(mockBank);
        });

        it('should find partners supporting invoice financing', () => {
            const partners = service.getPartnersByProduct(FinancingProduct.INVOICE_FINANCING);

            expect(partners).toHaveLength(2);
            expect(partners).toContain(mockLendingKart);
            expect(partners).toContain(mockCapitalFloat);
        });

        it('should find partners supporting credit line', () => {
            const partners = service.getPartnersByProduct(FinancingProduct.CREDIT_LINE);

            expect(partners).toHaveLength(1);
            expect(partners[0]).toBe(mockCapitalFloat);
        });

        it('should return empty array for unsupported product', () => {
            const partners = service.getPartnersByProduct(FinancingProduct.REVENUE_BASED_FINANCING);

            expect(partners).toHaveLength(0);
        });

        it('should find partners supporting working capital', () => {
            const partners = service.getPartnersByProduct(FinancingProduct.WORKING_CAPITAL);

            expect(partners).toHaveLength(3); // All three support it
        });
    });

    describe('getPartnersByProducts', () => {
        beforeEach(() => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);
            service.registerPartner(mockBank);
        });

        it('should find partners supporting ALL specified products', () => {
            const partners = service.getPartnersByProducts([
                FinancingProduct.INVOICE_FINANCING,
                FinancingProduct.WORKING_CAPITAL,
            ]);

            // LendingKart and Capital Float support both
            expect(partners).toHaveLength(2);
            expect(partners).toContain(mockLendingKart);
            expect(partners).toContain(mockCapitalFloat);
        });

        it('should return empty when no partner supports all products', () => {
            const partners = service.getPartnersByProducts([
                FinancingProduct.INVOICE_FINANCING,
                FinancingProduct.EQUIPMENT_FINANCING,
            ]);

            // No partner supports both
            expect(partners).toHaveLength(0);
        });
    });

    describe('getPartnersByAnyProduct', () => {
        beforeEach(() => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);
            service.registerPartner(mockBank);
        });

        it('should find partners supporting ANY of specified products', () => {
            const partners = service.getPartnersByAnyProduct([
                FinancingProduct.CREDIT_LINE,
                FinancingProduct.EQUIPMENT_FINANCING,
            ]);

            // Capital Float (credit line) + Bank (equipment)
            expect(partners).toHaveLength(2);
            expect(partners).toContain(mockCapitalFloat);
            expect(partners).toContain(mockBank);
        });
    });

    describe('getRegistryStats', () => {
        beforeEach(() => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);
            service.registerPartner(mockBank);
        });

        it('should return correct partner count', () => {
            const stats = service.getRegistryStats();

            expect(stats.totalPartners).toBe(3);
        });

        it('should count partners by type', () => {
            const stats = service.getRegistryStats();

            expect(stats.partnersByType[PartnerType.NBFC]).toBe(2);
            expect(stats.partnersByType[PartnerType.BANK]).toBe(1);
        });

        it('should count product coverage', () => {
            const stats = service.getRegistryStats();

            expect(stats.productCoverage[FinancingProduct.INVOICE_FINANCING]).toBe(2);
            expect(stats.productCoverage[FinancingProduct.WORKING_CAPITAL]).toBe(3);
            expect(stats.productCoverage[FinancingProduct.CREDIT_LINE]).toBe(1);
            expect(stats.productCoverage[FinancingProduct.EQUIPMENT_FINANCING]).toBe(1);
        });
    });

    describe('validatePartner', () => {
        it('should validate complete partner implementation', () => {
            const result = service.validatePartner(mockLendingKart);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing partnerId', () => {
            const invalidPartner = { ...mockLendingKart, partnerId: '' as any };

            const result = service.validatePartner(invalidPartner);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing partnerId');
        });

        it('should detect missing required methods', () => {
            const invalidPartner = {
                ...mockLendingKart,
                checkEligibility: undefined as any,
            };

            const result = service.validatePartner(invalidPartner);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing required method: checkEligibility');
        });

        it('should detect empty supportedProducts', () => {
            const invalidPartner = { ...mockLendingKart, supportedProducts: [] };

            const result = service.validatePartner(invalidPartner);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing or empty supportedProducts');
        });
    });

    describe('getAvailableProducts', () => {
        it('should return empty array when no partners', () => {
            const products = service.getAvailableProducts();

            expect(products).toHaveLength(0);
        });

        it('should return all unique products', () => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);
            service.registerPartner(mockBank);

            const products = service.getAvailableProducts();

            expect(products).toContain(FinancingProduct.INVOICE_FINANCING);
            expect(products).toContain(FinancingProduct.WORKING_CAPITAL);
            expect(products).toContain(FinancingProduct.CREDIT_LINE);
            expect(products).toContain(FinancingProduct.EQUIPMENT_FINANCING);
            expect(products.length).toBeLessThanOrEqual(4);
        });

        it('should not have duplicates', () => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);

            const products = service.getAvailableProducts();
            const uniqueProducts = [...new Set(products)];

            expect(products).toHaveLength(uniqueProducts.length);
        });
    });

    describe('findBestPartner', () => {
        beforeEach(() => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);
            service.registerPartner(mockBank);
        });

        it('should find a partner for specified product', async () => {
            const partner = await service.findBestPartner(FinancingProduct.INVOICE_FINANCING);

            expect(partner).not.toBeNull();
            expect(partner!.supportedProducts).toContain(FinancingProduct.INVOICE_FINANCING);
        });

        it('should return null if no partner supports product', async () => {
            const partner = await service.findBestPartner(FinancingProduct.REVENUE_BASED_FINANCING);

            expect(partner).toBeNull();
        });

        it('should exclude specified partners', async () => {
            const partner = await service.findBestPartner(FinancingProduct.INVOICE_FINANCING, {
                excludeIds: ['lendingkart'],
            });

            expect(partner).not.toBeNull();
            expect(partner!.partnerId).not.toBe('lendingkart');
            expect(partner!.partnerId).toBe('capital_float');
        });

        it('should prefer specified partner type', async () => {
            const partner = await service.findBestPartner(FinancingProduct.WORKING_CAPITAL, {
                preferredType: PartnerType.BANK,
            });

            expect(partner).not.toBeNull();
            expect(partner!.partnerType).toBe(PartnerType.BANK);
        });
    });

    describe('Edge Cases', () => {
        it('should handle rapid registration/unregistration', () => {
            service.registerPartner(mockLendingKart);
            service.unregisterPartner('lendingkart');
            service.registerPartner(mockLendingKart);
            service.unregisterPartner('lendingkart');
            service.registerPartner(mockLendingKart);

            expect(service.hasPartner('lendingkart')).toBe(true);
            expect(service.getPartnerCount()).toBe(1);
        });

        it('should handle empty partner searches', () => {
            const partners = service.getPartnersByProduct(FinancingProduct.INVOICE_FINANCING);

            expect(partners).toHaveLength(0);
        });

        it('should handle partner summary for debugging', () => {
            service.registerPartner(mockLendingKart);
            service.registerPartner(mockCapitalFloat);

            const summary = service.getPartnersSummary();

            expect(summary).toHaveLength(2);
            expect(summary[0]).toHaveProperty('id');
            expect(summary[0]).toHaveProperty('name');
            expect(summary[0]).toHaveProperty('type');
            expect(summary[0]).toHaveProperty('products');
        });
    });
});
