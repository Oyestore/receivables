import {
    ShippingOrder,
    ShippingStatus,
    ShippingProvider,
} from '../shipping-order.entity';
import {
    ForexRate,
    CurrencyPair,
} from '../forex-rate.entity';
import {
    TradeCompliance,
    ComplianceStatus,
    ComplianceType,
    RiskLevel,
} from '../trade-compliance.entity';

describe('Module 13 Entity Tests - Operational & Compliance Entities', () => {
    describe('ShippingOrder Entity', () => {
        it('should create shipping order with complete details', () => {
            const shipping = new ShippingOrder();
            shipping.orderId = 'SHIP-2024-001';
            shipping.tradeId = 'TRADE-123';
            shipping.sender = 'seller-1';
            shipping.recipientId = 'buyer-1';
            shipping.provider = ShippingProvider.DHL;
            shipping.trackingNumber = 'DHL123456789';
            shipping.status = ShippingStatus.PENDING;

            expect(shipping.orderId).toBe('SHIP-2024-001');
            expect(shipping.provider).toBe(ShippingProvider.DHL);
            expect(shipping.trackingNumber).toBe('DHL123456789');
        });

        it('should handle status transitions', () => {
            const shipping = new ShippingOrder();

            shipping.status = ShippingStatus.PENDING;
            expect(shipping.status).toBe(ShippingStatus.PENDING);

            shipping.status = ShippingStatus.BOOKED;
            shipping.pickupDate = new Date();
            expect(shipping.status).toBe(ShippingStatus.BOOKED);

            shipping.status = ShippingStatus.IN_TRANSIT;
            expect(shipping.status).toBe(ShippingStatus.IN_TRANSIT);

            shipping.status = ShippingStatus.DELIVERED;
            shipping.actualDelivery = new Date();
            expect(shipping.status).toBe(ShippingStatus.DELIVERED);
            expect(shipping.actualDelivery).toBeDefined();
        });

        it('should store address details', () => {
            const shipping = new ShippingOrder();
            shipping.originAddress = {
                street: '123 Factory Road',
                city: 'Shanghai',
                state: 'Shanghai',
                country: 'CN',
                postalCode: '200000',
            };
            shipping.destinationAddress = {
                street: '456 Business Ave',
                city: 'Los Angeles',
                state: 'CA',
                country: 'US',
                postalCode: '90001',
            };

            expect(shipping.originAddress.city).toBe('Shanghai');
            expect(shipping.destinationAddress.city).toBe('Los Angeles');
        });

        it('should handle package details', () => {
            const shipping = new ShippingOrder();
            shipping.packageDetails = {
                weight: 25.5,
                dimensions: {
                    length: 50,
                    width: 40,
                    height: 30,
                },
                description: 'Electronics',
                value: 50000,
                currency: 'USD',
            };

            expect(shipping.packageDetails.weight).toBe(25.5);
            expect(shipping.packageDetails.value).toBe(50000);
        });

        it('should track shipping events', () => {
            const shipping = new ShippingOrder();
            shipping.trackingEvents = [
                {
                    timestamp: new Date('2024-01-15T10:00:00Z'),
                    status: 'picked_up',
                    location: 'Shanghai, CN',
                    description: 'Package picked up',
                },
                {
                    timestamp: new Date('2024-01-16T15:30:00Z'),
                    status: 'in_transit',
                    location: 'Hong Kong Hub',
                    description: 'Package in transit',
                },
            ];

            expect(shipping.trackingEvents).toHaveLength(2);
            expect(shipping.trackingEvents[0].location).toBe('Shanghai, CN');
        });

        it('should handle insurance and customs', () => {
            const shipping = new ShippingOrder();
            shipping.insuranceRequired = true;
            shipping.insuranceAmount = 60000;
            shipping.customsDeclaration = {
                hsCode: '8471.30',
                declaredValue: 50000,
                purpose: 'commercial',
                documents: ['invoice', 'packing_list', 'certificate_of_origin'],
            };

            expect(shipping.insuranceRequired).toBe(true);
            expect(shipping.customsDeclaration.hsCode).toBe('8471.30');
        });
    });

    describe('ForexRate Entity', () => {
        it('should create forex rate with basic fields', () => {
            const forex = new ForexRate();
            forex.currencyPair = CurrencyPair.USD_INR;
            forex.rate = 83.45;
            forex.spread = 0.50;
            forex.commission = 0.25;
            forex.lastUpdated = new Date();
            forex.source = 'RBI';

            expect(forex.currencyPair).toBe(CurrencyPair.USD_INR);
            expect(forex.rate).toBe(83.45);
            expect(forex.spread).toBe(0.50);
        });

        it('should handle rate locking', () => {
            const forex = new ForexRate();
            forex.currencyPair = CurrencyPair.USD_EUR;
            forex.rate = 0.92;
            forex.lockedRate = 0.92;
            forex.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            expect(forex.lockedRate).toBe(0.92);
            expect(forex.lockedUntil).toBeDefined();

            // Check if still locked
            const isLocked = new Date() < forex.lockedUntil;
            expect(isLocked).toBe(true);
        });

        it('should support all major currency pairs', () => {
            const pairs = [
                CurrencyPair.USD_EUR,
                CurrencyPair.USD_GBP,
                CurrencyPair.USD_INR,
                CurrencyPair.EUR_GBP,
                CurrencyPair.USD_AED,
            ];

            pairs.forEach(pair => {
                const forex = new ForexRate();
                forex.currencyPair = pair;
                expect(forex.currencyPair).toBe(pair);
            });
        });

        it('should handle rate calculations with spread and commission', () => {
            const forex = new ForexRate();
            forex.rate = 83.00;
            forex.spread = 0.50; // 0.5%
            forex.commission = 0.25; // 0.25%

            // Calculate effective rate
            const spreadAmount = forex.rate * (forex.spread / 100);
            const commissionAmount = forex.rate * (forex.commission / 100);
            const effectiveRate = forex.rate + spreadAmount + commissionAmount;

            expect(effectiveRate).toBeGreaterThan(forex.rate);
            expect(effectiveRate).toBeCloseTo(83.6225, 2);
        });

        it('should handle inactive rates', () => {
            const forex = new ForexRate();
            forex.isActive = false;

            expect(forex.isActive).toBe(false);
        });

        it('should store rate metadata', () => {
            const forex = new ForexRate();
            forex.metadata = {
                provider: 'XE.com',
                confidence: 'high',
                volatility: 'low',
            };

            expect(forex.metadata.provider).toBe('XE.com');
        });
    });

    describe('TradeCompliance Entity', () => {
        it('should create compliance record with required fields', () => {
            const compliance = new TradeCompliance();
            compliance.tradeId = 'TRADE-123';
            compliance.entityId = 'ENTITY-456';
            compliance.entityType = 'buyer';
            compliance.complianceType = ComplianceType.SANCTION_CHECK;
            compliance.status = ComplianceStatus.PENDING;
            compliance.riskLevel = RiskLevel.MEDIUM;
            compliance.countryCode = 'US';

            expect(compliance.complianceType).toBe(ComplianceType.SANCTION_CHECK);
            expect(compliance.riskLevel).toBe(RiskLevel.MEDIUM);
        });

        it('should handle sanction list hits', () => {
            const compliance = new TradeCompliance();
            compliance.sanctionListHits = [
                {
                    listName: 'OFAC SDN List',
                    matchedName: 'John Smith',
                    matchScore: 95,
                    date: new Date(),
                },
            ];
            compliance.status = ComplianceStatus.REQUIRES_REVIEW;
            compliance.riskLevel = RiskLevel.HIGH;

            expect(compliance.sanctionListHits).toHaveLength(1);
            expect(compliance.sanctionListHits[0].matchScore).toBe(95);
            expect(compliance.status).toBe(ComplianceStatus.REQUIRES_REVIEW);
        });

        it('should handle AML flags', () => {
            const compliance = new TradeCompliance();
            compliance.complianceType = ComplianceType.ANTI_MONEY_LAUNDERING;
            compliance.amlFlags = [
                {
                    flagType: 'high_value_transaction',
                    description: 'Transaction exceeds threshold',
                    severity: 'medium',
                    date: new Date(),
                },
            ];

            expect(compliance.amlFlags).toHaveLength(1);
            expect(compliance.amlFlags[0].flagType).toBe('high_value_transaction');
        });

        it('should handle KYC documentation', () => {
            const compliance = new TradeCompliance();
            compliance.complianceType = ComplianceType.KNOW_YOUR_CUSTOMER;
            compliance.kycStatus = 'verified';
            compliance.kycDocuments = [
                {
                    documentType: 'passport',
                    documentNumber: 'P1234567',
                    issuedDate: new Date('2020-01-01'),
                    expiryDate: new Date('2030-01-01'),
                    status: 'verified',
                },
                {
                    documentType: 'business_license',
                    documentNumber: 'BL789012',
                    issuedDate: new Date('2018-06-01'),
                    expiryDate: new Date('2028-06-01'),
                    status: 'verified',
                },
            ];

            expect(compliance.kycDocuments).toHaveLength(2);
            expect(compliance.kycStatus).toBe('verified');
        });

        it('should handle export/import licenses', () => {
            const compliance = new TradeCompliance();
            compliance.exportLicenseRequired = true;
            compliance.exportLicenseNumber = 'EXP-2024-1234';
            compliance.importLicenseRequired = true;
            compliance.importLicenseNumber = 'IMP-2024-5678';

            expect(compliance.exportLicenseRequired).toBe(true);
            expect(compliance.exportLicenseNumber).toBe('EXP-2024-1234');
        });

        it('should handle UAE VAT compliance', () => {
            const compliance = new TradeCompliance();
            compliance.complianceType = ComplianceType.UAE_VAT;
            compliance.uaeVatRegistered = true;
            compliance.uaeVatNumber = '123456789012345';
            compliance.countryCode = 'ARE';

            expect(compliance.uaeVatRegistered).toBe(true);
            expect(compliance.uaeVatNumber).toHaveLength(15);
        });

        it('should calculate compliance score', () => {
            const compliance = new TradeCompliance();
            compliance.complianceScore = 87.50;
            compliance.status = ComplianceStatus.APPROVED;

            expect(compliance.complianceScore).toBeGreaterThan(80);
            expect(compliance.status).toBe(ComplianceStatus.APPROVED);
        });

        it('should handle review workflow', () => {
            const compliance = new TradeCompliance();
            compliance.status = ComplianceStatus.REQUIRES_REVIEW;
            compliance.reviewerId = 'reviewer-123';
            compliance.reviewDate = new Date();
            compliance.reviewNotes = 'Additional documentation requested';
            compliance.nextReviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            expect(compliance.reviewerId).toBe('reviewer-123');
            expect(compliance.reviewNotes).toContain('Additional documentation');
        });

        it('should support different compliance types', () => {
            const types = [
                ComplianceType.SANCTION_CHECK,
                ComplianceType.ANTI_MONEY_LAUNDERING,
                ComplianceType.KNOW_YOUR_CUSTOMER,
                ComplianceType.EXPORT_CONTROL,
                ComplianceType.IMPORT_LICENSE,
                ComplianceType.TAX_COMPLIANCE,
                ComplianceType.CUSTOMS_COMPLIANCE,
                ComplianceType.UAE_VAT,
            ];

            types.forEach(type => {
                const compliance = new TradeCompliance();
                compliance.complianceType = type;
                expect(compliance.complianceType).toBe(type);
            });
        });

        it('should handle risk level escalation', () => {
            const compliance = new TradeCompliance();

            // Start with low risk
            compliance.riskLevel = RiskLevel.LOW;
            expect(compliance.riskLevel).toBe(RiskLevel.LOW);

            // Escalate to medium
            compliance.riskLevel = RiskLevel.MEDIUM;
            expect(compliance.riskLevel).toBe(RiskLevel.MEDIUM);

            // Escalate to high
            compliance.riskLevel = RiskLevel.HIGH;
            expect(compliance.riskLevel).toBe(RiskLevel.HIGH);

            // Critical escalation
            compliance.riskLevel = RiskLevel.CRITICAL;
            compliance.status = ComplianceStatus.REJECTED;
            expect(compliance.riskLevel).toBe(RiskLevel.CRITICAL);
            expect(compliance.status).toBe(ComplianceStatus.REJECTED);
        });
    });
});
