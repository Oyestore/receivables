import { ForexRate, CurrencyPair } from '../src/entities/forex-rate.entity';
import { EscrowTransaction, EscrowStatus, EscrowType } from '../src/entities/escrow-transaction.entity';
import { ShippingOrder } from '../src/entities/shipping-order.entity';
import { LetterOfCredit } from '../src/entities/letter-of-credit.entity';
import { TradeCompliance } from '../src/entities/trade-compliance.entity';

/**
 * Test fixtures and mock data for Module 13
 */

export class TestFixtures {
    /**
     * Create mock ForexRate
     */
    static createMockForexRate(overrides?: Partial<ForexRate>): ForexRate {
        const forexRate = new ForexRate();
        forexRate.id = overrides?.id || '1';
        forexRate.currencyPair = overrides?.currencyPair || CurrencyPair.USD_AED;
        forexRate.fromCurrency = overrides?.fromCurrency || 'USD';
        forexRate.toCurrency = overrides?.toCurrency || 'AED';
        forexRate.rate = overrides?.rate || 3.67;
        forexRate.bid = overrides?.bid || 3.665;
        forexRate.ask = overrides?.ask || 3.675;
        forexRate.spread = overrides?.spread || 0.01;
        forexRate.commission = overrides?.commission || 0.02;
        forexRate.source = overrides?.source || 'test';
        forexRate.lockedRate = overrides?.lockedRate || null;
        forexRate.lockedUntil = overrides?.lockedUntil || null;
        forexRate.createdAt = overrides?.createdAt || new Date();
        forexRate.updatedAt = overrides?.updatedAt || new Date();
        return forexRate;
    }

    /**
     * Create mock EscrowTransaction
     */
    static createMockEscrowTransaction(overrides?: Partial<EscrowTransaction>): EscrowTransaction {
        const escrow = new EscrowTransaction();
        escrow.id = overrides?.id || '1';
        escrow.transactionId = overrides?.transactionId || 'TXN-001';
        escrow.escrowType = overrides?.escrowType || EscrowType.TRADE;
        escrow.amount = overrides?.amount || 10000;
        escrow.currency = overrides?.currency || 'USD';
        escrow.buyerId = overrides?.buyerId || 'buyer-1';
        escrow.sellerId = overrides?.sellerId || 'seller-1';
        escrow.status = overrides?.status || EscrowStatus.CREATED;
        escrow.tradeId = overrides?.tradeId || 'trade-1';
        escrow.releaseConditions = overrides?.releaseConditions || {};
        escrow.smartContractAddress = overrides?.smartContractAddress || null;
        escrow.blockchainHash = overrides?.blockchainHash || null;
        escrow.fundedAt = overrides?.fundedAt || null;
        escrow.releasedAt = overrides?.releasedAt || null;
        escrow.disputeReason = overrides?.disputeReason || null;
        escrow.disputedAt = overrides?.disputedAt || null;
        escrow.resolvedAt = overrides?.resolvedAt || null;
        escrow.resolution = overrides?.resolution || null;
        escrow.metadata = overrides?.metadata || {};
        escrow.createdBy = overrides?.createdBy || 'test-user';
        escrow.createdAt = overrides?.createdAt || new Date();
        escrow.updatedAt = overrides?.updatedAt || new Date();
        return escrow;
    }

    /**
     * Create mock ShippingOrder
     */
    static createMockShippingOrder(overrides?: Partial<ShippingOrder>): ShippingOrder {
        const shipping = new ShippingOrder();
        shipping.id = overrides?.id || '1';
        shipping.trackingNumber = overrides?.trackingNumber || 'TRACK-001';
        shipping.carrier = overrides?.carrier || 'DHL';
        shipping.origin = overrides?.origin || 'Dubai, UAE';
        shipping.destination = overrides?.destination || 'New York, USA';
        shipping.status = overrides?.status || 'pending';
        shipping.packageDetails = overrides?.packageDetails || { weight: 10, dimensions: '10x10x10' };
        shipping.estimatedDelivery = overrides?.estimatedDelivery || new Date();
        shipping.actualDelivery = overrides?.actualDelivery || null;
        shipping.cost = overrides?.cost || 150;
        shipping.currency = overrides?.currency || 'USD';
        shipping.createdBy = overrides?.createdBy || 'test-user';
        shipping.createdAt = overrides?.createdAt || new Date();
        shipping.updatedAt = overrides?.updatedAt || new Date();
        return shipping;
    }

    /**
     * Create mock LetterOfCredit
     */
    static createMockLetterOfCredit(overrides?: Partial<LetterOfCredit>): LetterOfCredit {
        const lc = new LetterOfCredit();
        lc.id = overrides?.id || '1';
        lc.lcNumber = overrides?.lcNumber || 'LC-001';
        lc.applicantId = overrides?.applicantId || 'applicant-1';
        lc.beneficiaryId = overrides?.beneficiaryId || 'beneficiary-1';
        lc.amount = overrides?.amount || 100000;
        lc.currency = overrides?.currency || 'USD';
        lc.issuingBank = overrides?.issuingBank || 'Test Bank';
        lc.advisingBank = overrides?.advisingBank || 'Test Advising Bank';
        lc.status = overrides?.status || 'draft';
        lc.issueDate = overrides?.issueDate || null;
        lc.expiryDate = overrides?.expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        lc.utilizedAmount = overrides?.utilizedAmount || 0;
        lc.availableAmount = overrides?.availableAmount || 100000;
        lc.terms = overrides?.terms || {};
        lc.documents = overrides?.documents || [];
        lc.createdBy = overrides?.createdBy || 'test-user';
        lc.createdAt = overrides?.createdAt || new Date();
        lc.updatedAt = overrides?.updatedAt || new Date();
        return lc;
    }

    /**
     * Create mock Trade Compliance
     */
    static createMockTradeCompliance(overrides?: Partial<TradeCompliance>): TradeCompliance {
        const compliance = new TradeCompliance();
        compliance.id = overrides?.id || '1';
        compliance.transactionId = overrides?.transactionId || 'TXN-001';
        compliance.buyerCountry = overrides?.buyerCountry || 'AE';
        compliance.sellerCountry = overrides?.sellerCountry || 'US';
        compliance.goodsDescription = overrides?.goodsDescription || 'Test goods';
        compliance.hsCode = overrides?.hsCode || '123456';
        compliance.checkStatus = overrides?.checkStatus || 'pending';
        compliance.sanctionsCheck = overrides?.sanctionsCheck || null;
        compliance.amlCheck = overrides?.amlCheck || null;
        compliance.vatCompliance = overrides?.vatCompliance || null;
        compliance.restrictionsCheck = overrides?.restrictionsCheck || null;
        compliance.riskScore = overrides?.riskScore || null;
        compliance.approvedAt = overrides?.approvedAt || null;
        compliance.rejectedAt = overrides?.rejectedAt || null;
        compliance.rejectionReason = overrides?.rejectionReason || null;
        compliance.performedBy = overrides?.performedBy || null;
        compliance.createdAt = overrides?.createdAt || new Date();
        compliance.updatedAt = overrides?.updatedAt || new Date();
        return compliance;
    }

    /**
     * Mock currency conversion request
     */
    static createMockConversionRequest() {
        return {
            fromCurrency: 'USD',
            toCurrency: 'AED',
            amount: 1000,
            lockRate: false,
            lockDurationMinutes: 30,
        };
    }

    /**
     * Mock escrow creation request
     */
    static createMockEscrowRequest() {
        return {
            transactionId: 'TXN-TEST-001',
            escrowType: EscrowType.TRADE,
            amount: 50000,
            currency: 'USD',
            buyerId: 'buyer-test-1',
            sellerId: 'seller-test-1',
            tradeId: 'trade-test-1',
            releaseConditions: {
                requiresApproval: true,
                autoReleaseAfterDays: 30,
            },
        };
    }
}
