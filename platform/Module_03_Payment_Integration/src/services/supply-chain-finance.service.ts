import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { FinancingRequest, FinancingType, FinancingStatus } from '../entities/financing-request.entity';
import { SupplyChainRelationship } from '../entities/supply-chain-relationship.entity';
import { NBFCPartner } from '../entities/nbfc-partner.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface SupplyChainFinancingOffer {
  id: string;
  buyerId: string;
  buyerName: string;
  supplierId: string;
  supplierName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  interestRate: number;
  tenorDays: number;
  offerExpiryDate: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

interface DynamicDiscountOffer {
  id: string;
  buyerId: string;
  buyerName: string;
  supplierId: string;
  supplierName: string;
  invoiceId: string;
  invoiceNumber: string;
  originalAmount: number;
  discountedAmount: number;
  discountPercentage: number;
  daysEarly: number;
  offerExpiryDate: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

interface SupplyChainMetrics {
  totalBuyers: number;
  totalSuppliers: number;
  activeRelationships: number;
  averagePaymentTime: number;
  totalFinancingVolume: number;
  averageFinancingRate: number;
  topBuyers: Array<{
    id: string;
    name: string;
    volume: number;
    relationshipCount: number;
  }>;
  topSuppliers: Array<{
    id: string;
    name: string;
    volume: number;
    relationshipCount: number;
  }>;
}

@Injectable()
export class SupplyChainFinanceService {
  private readonly logger = new Logger(SupplyChainFinanceService.name);

  constructor(
    @InjectRepository(FinancingRequest)
    private readonly financingRequestRepository: Repository<FinancingRequest>,
    @InjectRepository(SupplyChainRelationship)
    private readonly supplyChainRepository: Repository<SupplyChainRelationship>,
    @InjectRepository(NBFCPartner)
    private readonly nbfcPartnerRepository: Repository<NBFCPartner>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new supply chain relationship
   */
  async createSupplyChainRelationship(
    organizationId: string,
    partnerOrganizationId: string,
    relationshipType: 'buyer' | 'supplier',
    metadata?: Record<string, any>,
  ): Promise<SupplyChainRelationship> {
    // Verify organizations exist
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    
    if (!organization) {
      throw new Error('Organization not found');
    }
    
    const partnerOrganization = await this.organizationRepository.findOne({
      where: { id: partnerOrganizationId },
    });
    
    if (!partnerOrganization) {
      throw new Error('Partner organization not found');
    }
    
    // Check if relationship already exists
    const existingRelationship = await this.supplyChainRepository.findOne({
      where: {
        organizationId,
        partnerOrganizationId,
      },
    });
    
    if (existingRelationship) {
      throw new Error('Relationship already exists');
    }
    
    // Create inverse relationship type
    const inverseRelationshipType = relationshipType === 'buyer' ? 'supplier' : 'buyer';
    
    // Create relationship
    const relationship = this.supplyChainRepository.create({
      organizationId,
      organizationName: organization.name,
      partnerOrganizationId,
      partnerOrganizationName: partnerOrganization.name,
      relationshipType,
      status: 'pending',
      trustScore: 0,
      averageTransactionAmount: 0,
      transactionCount: 0,
      metadata: metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    await this.supplyChainRepository.save(relationship);
    
    // Create inverse relationship
    const inverseRelationship = this.supplyChainRepository.create({
      organizationId: partnerOrganizationId,
      organizationName: partnerOrganization.name,
      partnerOrganizationId: organizationId,
      partnerOrganizationName: organization.name,
      relationshipType: inverseRelationshipType,
      status: 'pending',
      trustScore: 0,
      averageTransactionAmount: 0,
      transactionCount: 0,
      metadata: metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    await this.supplyChainRepository.save(inverseRelationship);
    
    // Emit event for relationship creation
    this.eventEmitter.emit('supply_chain.relationship_created', {
      organizationId,
      partnerOrganizationId,
      relationshipType,
      relationshipId: relationship.id,
    });
    
    return relationship;
  }

  /**
   * Update supply chain relationship status
   */
  async updateRelationshipStatus(
    relationshipId: string,
    status: 'pending' | 'active' | 'inactive' | 'rejected',
  ): Promise<SupplyChainRelationship> {
    // Get relationship
    const relationship = await this.supplyChainRepository.findOne({
      where: { id: relationshipId },
    });
    
    if (!relationship) {
      throw new Error('Relationship not found');
    }
    
    // Update status
    relationship.status = status;
    relationship.updatedAt = new Date();
    
    await this.supplyChainRepository.save(relationship);
    
    // If status is active or rejected, update inverse relationship
    if (status === 'active' || status === 'rejected') {
      const inverseRelationship = await this.supplyChainRepository.findOne({
        where: {
          organizationId: relationship.partnerOrganizationId,
          partnerOrganizationId: relationship.organizationId,
        },
      });
      
      if (inverseRelationship) {
        inverseRelationship.status = status;
        inverseRelationship.updatedAt = new Date();
        await this.supplyChainRepository.save(inverseRelationship);
      }
    }
    
    // Emit event for relationship update
    this.eventEmitter.emit('supply_chain.relationship_updated', {
      relationshipId,
      status,
      organizationId: relationship.organizationId,
      partnerOrganizationId: relationship.partnerOrganizationId,
    });
    
    return relationship;
  }

  /**
   * Update relationship trust score
   */
  async updateRelationshipTrustScore(
    relationshipId: string,
    trustScore: number,
  ): Promise<SupplyChainRelationship> {
    // Validate trust score
    if (trustScore < 0 || trustScore > 1) {
      throw new Error('Trust score must be between 0 and 1');
    }
    
    // Get relationship
    const relationship = await this.supplyChainRepository.findOne({
      where: { id: relationshipId },
    });
    
    if (!relationship) {
      throw new Error('Relationship not found');
    }
    
    // Update trust score
    relationship.trustScore = trustScore;
    relationship.updatedAt = new Date();
    
    await this.supplyChainRepository.save(relationship);
    
    // Emit event for trust score update
    this.eventEmitter.emit('supply_chain.trust_score_updated', {
      relationshipId,
      trustScore,
      organizationId: relationship.organizationId,
      partnerOrganizationId: relationship.partnerOrganizationId,
    });
    
    return relationship;
  }

  /**
   * Record transaction for relationship
   */
  async recordTransaction(
    relationshipId: string,
    amount: number,
    transactionDate: Date,
    metadata?: Record<string, any>,
  ): Promise<SupplyChainRelationship> {
    // Get relationship
    const relationship = await this.supplyChainRepository.findOne({
      where: { id: relationshipId },
    });
    
    if (!relationship) {
      throw new Error('Relationship not found');
    }
    
    // Update transaction metrics
    const newTransactionCount = relationship.transactionCount + 1;
    const newAverageAmount = (
      (relationship.averageTransactionAmount * relationship.transactionCount) + amount
    ) / newTransactionCount;
    
    relationship.transactionCount = newTransactionCount;
    relationship.averageTransactionAmount = newAverageAmount;
    relationship.lastTransactionDate = transactionDate;
    relationship.updatedAt = new Date();
    
    // Update transaction history
    if (!relationship.metadata.transactionHistory) {
      relationship.metadata.transactionHistory = [];
    }
    
    relationship.metadata.transactionHistory.push({
      date: transactionDate,
      amount,
      ...metadata,
    });
    
    // Limit history to last 20 transactions
    if (relationship.metadata.transactionHistory.length > 20) {
      relationship.metadata.transactionHistory = relationship.metadata.transactionHistory.slice(-20);
    }
    
    await this.supplyChainRepository.save(relationship);
    
    // Update inverse relationship
    const inverseRelationship = await this.supplyChainRepository.findOne({
      where: {
        organizationId: relationship.partnerOrganizationId,
        partnerOrganizationId: relationship.organizationId,
      },
    });
    
    if (inverseRelationship) {
      inverseRelationship.transactionCount = newTransactionCount;
      inverseRelationship.averageTransactionAmount = newAverageAmount;
      inverseRelationship.lastTransactionDate = transactionDate;
      inverseRelationship.updatedAt = new Date();
      
      // Update transaction history
      if (!inverseRelationship.metadata.transactionHistory) {
        inverseRelationship.metadata.transactionHistory = [];
      }
      
      inverseRelationship.metadata.transactionHistory.push({
        date: transactionDate,
        amount,
        ...metadata,
      });
      
      // Limit history to last 20 transactions
      if (inverseRelationship.metadata.transactionHistory.length > 20) {
        inverseRelationship.metadata.transactionHistory = inverseRelationship.metadata.transactionHistory.slice(-20);
      }
      
      await this.supplyChainRepository.save(inverseRelationship);
    }
    
    // Emit event for transaction record
    this.eventEmitter.emit('supply_chain.transaction_recorded', {
      relationshipId,
      amount,
      transactionDate,
      organizationId: relationship.organizationId,
      partnerOrganizationId: relationship.partnerOrganizationId,
    });
    
    return relationship;
  }

  /**
   * Create buyer-led financing offer
   */
  async createBuyerFinancingOffer(
    buyerId: string,
    supplierId: string,
    invoiceId: string,
    amount: number,
    interestRate: number,
    tenorDays: number,
    expiryDays: number = 7,
    nbfcPartnerId?: string,
  ): Promise<SupplyChainFinancingOffer> {
    // Verify organizations exist
    const buyer = await this.organizationRepository.findOne({
      where: { id: buyerId },
    });
    
    if (!buyer) {
      throw new Error('Buyer organization not found');
    }
    
    const supplier = await this.organizationRepository.findOne({
      where: { id: supplierId },
    });
    
    if (!supplier) {
      throw new Error('Supplier organization not found');
    }
    
    // Verify invoice exists
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // Verify relationship exists
    const relationship = await this.supplyChainRepository.findOne({
      where: {
        organizationId: supplierId,
        partnerOrganizationId: buyerId,
        relationshipType: 'supplier',
        status: 'active',
      },
    });
    
    if (!relationship) {
      throw new Error('Active supplier relationship not found');
    }
    
    // Verify NBFC partner if provided
    let nbfcPartner = null;
    if (nbfcPartnerId) {
      nbfcPartner = await this.nbfcPartnerRepository.findOne({
        where: { id: nbfcPartnerId },
      });
      
      if (!nbfcPartner) {
        throw new Error('NBFC partner not found');
      }
    }
    
    // Calculate expiry date
    const offerExpiryDate = new Date();
    offerExpiryDate.setDate(offerExpiryDate.getDate() + expiryDays);
    
    // Create financing offer
    const offer: SupplyChainFinancingOffer = {
      id: this.generateUniqueId(),
      buyerId,
      buyerName: buyer.name,
      supplierId,
      supplierName: supplier.name,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      amount,
      interestRate,
      tenorDays,
      offerExpiryDate,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Store offer in relationship metadata
    if (!relationship.metadata.financingOffers) {
      relationship.metadata.financingOffers = [];
    }
    
    relationship.metadata.financingOffers.push(offer);
    await this.supplyChainRepository.save(relationship);
    
    // Create financing request if NBFC partner provided
    if (nbfcPartner) {
      const financingRequest = this.financingRequestRepository.create({
        organizationId: supplierId,
        invoiceId,
        nbfcPartnerId,
        nbfcPartnerName: nbfcPartner.name,
        requestedAmount: amount,
        approvedAmount: 0,
        outstandingAmount: 0,
        interestRate,
        tenorDays,
        financingType: FinancingType.SUPPLY_CHAIN_FINANCE,
        status: FinancingStatus.PENDING,
        metadata: {
          buyerFinancingOffer: offer,
          buyerId,
          buyerName: buyer.name,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      await this.financingRequestRepository.save(financingRequest);
    }
    
    // Emit event for financing offer creation
    this.eventEmitter.emit('supply_chain.financing_offer_created', {
      offerId: offer.id,
      buyerId,
      supplierId,
      invoiceId,
      amount,
      interestRate,
      tenorDays,
      nbfcPartnerId,
    });
    
    return offer;
  }

  /**
   * Update financing offer status
   */
  async updateFinancingOfferStatus(
    offerId: string,
    supplierId: string,
    status: 'accepted' | 'rejected' | 'expired',
  ): Promise<SupplyChainFinancingOffer> {
    // Find relationship with offer
    const relationship = await this.supplyChainRepository.findOne({
      where: {
        organizationId: supplierId,
        relationshipType: 'supplier',
      },
    });
    
    if (!relationship || !relationship.metadata.financingOffers) {
      throw new Error('Relationship or financing offers not found');
    }
    
    // Find offer
    const offerIndex = relationship.metadata.financingOffers.findIndex(
      (offer: SupplyChainFinancingOffer) => offer.id === offerId
    );
    
    if (offerIndex === -1) {
      throw new Error('Financing offer not found');
    }
    
    const offer = relationship.metadata.financingOffers[offerIndex];
    
    // Update offer status
    offer.status = status;
    offer.updatedAt = new Date();
    relationship.metadata.financingOffers[offerIndex] = offer;
    
    await this.supplyChainRepository.save(relationship);
    
    // If accepted, create financing transaction
    if (status === 'accepted') {
      // Find financing request if exists
      const financingRequest = await this.financingRequestRepository.findOne({
        where: {
          organizationId: supplierId,
          invoiceId: offer.invoiceId,
          st
(Content truncated due to size limit. Use line ranges to read in chunks)