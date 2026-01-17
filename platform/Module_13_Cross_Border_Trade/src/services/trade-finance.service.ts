import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LetterOfCredit } from '../entities/letter-of-credit.entity';

export enum LCStatus {
  DRAFT = 'draft',
  REQUESTED = 'requested',
  ISSUED = 'issued',
  ACTIVE = 'active',
  UTILIZED = 'utilized',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  CLOSED = 'closed',
}

export enum LCType {
  COMMERCIAL = 'commercial',
  STANDBY = 'standby',
  REVOLVING = 'revolving',
  TRANSFERABLE = 'transferable',
  BACK_TO_BACK = 'back_to_back',
}

export enum LCPaymentTerms {
  AT_SIGHT = 'at_sight',
  DEFERRED_PAYMENT = 'deferred_payment',
  ACCEPTANCE = 'acceptance',
  NEGOTIATION = 'negotiation',
  MIXED = 'mixed',
}

export interface CreateLCRequest {
  lcNumber: string;
  lcType: LCType;
  applicantId: string;
  applicantName: string;
  beneficiaryId: string;
  beneficiaryName: string;
  issuingBankId: string;
  issuingBankName: string;
  advisingBankId?: string;
  advisingBankName?: string;
  confirmingBankId?: string;
  confirmingBankName?: string;
  amount: number;
  currency: string;
  expiryDate: Date;
  latestShipmentDate: Date;
  paymentTerms: LCPaymentTerms;
  shipmentTerms: string;
  documentsRequired: string[];
  goodsDescription: string;
  portOfLoading: string;
  portOfDischarge: string;
  partialShipments: boolean;
  transshipment: boolean;
  confirmationRequired: boolean;
  transferable: boolean;
  revolving?: {
    revolvingAmount: number;
    numberOfRevolutions: number;
    revolvingPeriod: string;
  };
  charges: {
    applicantCharges: boolean;
    beneficiaryCharges: boolean;
    bankCharges: string;
  };
  specialInstructions?: string;
  metadata?: Record<string, any>;
}

export interface UpdateLCRequest {
  status?: LCStatus;
  advisingBankId?: string;
  advisingBankName?: string;
  confirmingBankId?: string;
  confirmingBankName?: string;
  documentsRequired?: string[];
  specialInstructions?: string;
  notes?: string;
  expiryDate?: Date;
  latestShipmentDate?: Date;
}

export interface LCDocumentRequest {
  lcId: string;
  documentType: string;
  documentName: string;
  documentUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
}

export interface LCPresentationRequest {
  lcId: string;
  documents: Array<{
    documentType: string;
    documentUrl: string;
    documentName: string;
  }>;
  presentedBy: string;
  presentedAt: Date;
  presentationNotes?: string;
}

@Injectable()
export class TradeFinanceService {
  private readonly logger = new Logger(TradeFinanceService.name);

  constructor(
    @InjectRepository(LetterOfCredit)
    private lcRepo: Repository<LetterOfCredit>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new Letter of Credit
   */
  async createLetterOfCredit(createRequest: CreateLCRequest, createdBy: string): Promise<LetterOfCredit> {
    this.logger.log(`Creating Letter of Credit ${createRequest.lcNumber}`);

    try {
      // Validate expiry date
      if (createRequest.expiryDate <= new Date()) {
        throw new BadRequestException('Expiry date must be in the future');
      }

      // Validate latest shipment date
      if (createRequest.latestShipmentDate >= createRequest.expiryDate) {
        throw new BadRequestException('Latest shipment date must be before expiry date');
      }

      const lc = this.lcRepo.create({
        ...createRequest,
        status: LCStatus.DRAFT,
        utilizedAmount: 0,
        remainingAmount: createRequest.amount,
        documents: [],
        createdBy,
      });

      return await this.lcRepo.save(lc);
    } catch (error: any) {
      this.logger.error(`Error creating Letter of Credit: ${error.message}`);
      throw new BadRequestException(`Failed to create Letter of Credit: ${error.message}`);
    }
  }

  /**
   * Get Letter of Credit by ID
   */
  async getLetterOfCredit(id: string): Promise<LetterOfCredit> {
    const lc = await this.lcRepo.findOne({ where: { id } });

    if (!lc) {
      throw new NotFoundException(`Letter of Credit with ID ${id} not found`);
    }

    return lc;
  }

  /**
   * Get Letter of Credit by LC number
   */
  async getLetterOfCreditByNumber(lcNumber: string): Promise<LetterOfCredit> {
    const lc = await this.lcRepo.findOne({ where: { lcNumber } });

    if (!lc) {
      throw new NotFoundException(`Letter of Credit with number ${lcNumber} not found`);
    }

    return lc;
  }

  /**
   * Update Letter of Credit
   */
  async updateLetterOfCredit(id: string, updateRequest: UpdateLCRequest, updatedBy: string): Promise<LetterOfCredit> {
    this.logger.log(`Updating Letter of Credit ${id}`);

    const lc = await this.getLetterOfCredit(id);

    // Validate status transitions
    if (updateRequest.status && !this.isValidStatusTransition(lc.status, updateRequest.status)) {
      throw new BadRequestException(`Invalid status transition from ${lc.status} to ${updateRequest.status}`);
    }

    // Validate date updates
    if (updateRequest.expiryDate && updateRequest.latestShipmentDate) {
      if (updateRequest.latestShipmentDate >= updateRequest.expiryDate) {
        throw new BadRequestException('Latest shipment date must be before expiry date');
      }
    }

    Object.assign(lc, updateRequest, { updatedBy });

    return await this.lcRepo.save(lc);
  }

  /**
   * Request Letter of Credit issuance
   */
  async requestLCIssuance(id: string, requestedBy: string): Promise<LetterOfCredit> {
    this.logger.log(`Requesting issuance for LC ${id}`);

    const lc = await this.getLetterOfCredit(id);

    if (lc.status !== LCStatus.DRAFT) {
      throw new BadRequestException(`LC must be in DRAFT status to request issuance. Current status: ${lc.status}`);
    }

    lc.status = LCStatus.REQUESTED;
    lc.updatedBy = requestedBy;

    return await this.lcRepo.save(lc);
  }

  /**
   * Issue Letter of Credit
   */
  async issueLetterOfCredit(id: string, issuedBy: string, bankReference?: string): Promise<LetterOfCredit> {
    this.logger.log(`Issuing Letter of Credit ${id}`);

    const lc = await this.getLetterOfCredit(id);

    if (lc.status !== LCStatus.REQUESTED) {
      throw new BadRequestException(`LC must be in REQUESTED status to issue. Current status: ${lc.status}`);
    }

    lc.status = LCStatus.ISSUED;
    lc.issuedAt = new Date();
    lc.issuedBy = issuedBy;
    lc.bankReference = bankReference;
    lc.updatedBy = issuedBy;

    return await this.lcRepo.save(lc);
  }

  /**
   * Activate Letter of Credit
   */
  async activateLetterOfCredit(id: string, activatedBy: string): Promise<LetterOfCredit> {
    this.logger.log(`Activating Letter of Credit ${id}`);

    const lc = await this.getLetterOfCredit(id);

    if (lc.status !== LCStatus.ISSUED) {
      throw new BadRequestException(`LC must be ISSUED to activate. Current status: ${lc.status}`);
    }

    lc.status = LCStatus.ACTIVE;
    lc.activatedAt = new Date();
    lc.activatedBy = activatedBy;
    lc.updatedBy = activatedBy;

    return await this.lcRepo.save(lc);
  }

  /**
   * Utilize Letter of Credit
   */
  async utilizeLetterOfCredit(id: string, utilizationAmount: number, utilizationDetails: any, utilizedBy: string): Promise<LetterOfCredit> {
    this.logger.log(`Utilizing Letter of Credit ${id} for amount ${utilizationAmount}`);

    const lc = await this.getLetterOfCredit(id);

    if (lc.status !== LCStatus.ACTIVE) {
      throw new BadRequestException(`LC must be ACTIVE to utilize. Current status: ${lc.status}`);
    }

    if (utilizationAmount > lc.remainingAmount) {
      throw new BadRequestException(`Utilization amount ${utilizationAmount} exceeds remaining amount ${lc.remainingAmount}`);
    }

    if (new Date() > lc.expiryDate) {
      throw new BadRequestException('LC has expired');
    }

    lc.utilizedAmount += utilizationAmount;
    lc.remainingAmount = lc.amount - lc.utilizedAmount;
    lc.utilizations = [...(lc.utilizations || []), {
      amount: utilizationAmount,
      date: new Date(),
      details: utilizationDetails,
      utilizedBy,
    }];

    // Check if LC is fully utilized
    if (lc.remainingAmount === 0) {
      lc.status = LCStatus.UTILIZED;
    }

    lc.updatedBy = utilizedBy;

    return await this.lcRepo.save(lc);
  }

  /**
   * Present documents under LC
   */
  async presentDocuments(presentationRequest: LCPresentationRequest): Promise<LetterOfCredit> {
    this.logger.log(`Presenting documents for LC ${presentationRequest.lcId}`);

    const lc = await this.getLetterOfCredit(presentationRequest.lcId);

    if (lc.status !== LCStatus.ACTIVE) {
      throw new BadRequestException(`LC must be ACTIVE to present documents. Current status: lc.status}`);
    }

    // Validate required documents
    const missingDocuments = this.validateRequiredDocuments(lc, presentationRequest.documents);
    if (missingDocuments.length > 0) {
      throw new BadRequestException(`Missing required documents: ${missingDocuments.join(', ')}`);
    }

    const presentation = {
      documents: presentationRequest.documents,
      presentedBy: presentationRequest.presentedBy,
      presentedAt: presentationRequest.presentedAt,
      presentationNotes: presentationRequest.presentationNotes,
      status: 'pending',
    };

    lc.presentations = [...(lc.presentations || []), presentation];
    lc.updatedBy = presentationRequest.presentedBy;

    return await this.lcRepo.save(lc);
  }

  /**
   * Cancel Letter of Credit
   */
  async cancelLetterOfCredit(id: string, reason: string, cancelledBy: string): Promise<LetterOfCredit> {
    this.logger.log(`Cancelling Letter of Credit ${id}`);

    const lc = await this.getLetterOfCredit(id);

    if ([LCStatus.ISSUED, LCStatus.ACTIVE, LCStatus.UTILIZED].includes(lc.status)) {
      throw new BadRequestException(`LC cannot be cancelled in ${lc.status} status`);
    }

    lc.status = LCStatus.CANCELLED;
    lc.cancelledAt = new Date();
    lc.cancelledBy = cancelledBy;
    lc.cancellationReason = reason;
    lc.updatedBy = cancelledBy;

    return await this.lcRepo.save(lc);
  }

  /**
   * Close Letter of Credit
   */
  async closeLetterOfCredit(id: string, reason: string, closedBy: string): Promise<LetterOfCredit> {
    this.logger.log(`Closing Letter of Credit ${id}`);

    const lc = await this.getLetterOfCredit(id);

    if (![LCStatus.UTILIZED, LCStatus.EXPIRED].includes(lc.status)) {
      throw new BadRequestException(`LC must be UTILIZED or EXPIRED to close. Current status: ${lc.status}`);
    }

    lc.status = LCStatus.CLOSED;
    lc.closedAt = new Date();
    lc.closedBy = closedBy;
    lc.closingReason = reason;
    lc.updatedBy = closedBy;

    return await this.lcRepo.save(lc);
  }

  /**
   * Get Letters of Credit by applicant
   */
  async getLCsByApplicant(applicantId: string, status?: LCStatus): Promise<LetterOfCredit[]> {
    const where: any = { applicantId };
    if (status) {
      where.status = status;
    }

    return await this.lcRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get Letters of Credit by beneficiary
   */
  async getLCsByBeneficiary(beneficiaryId: string, status?: LCStatus): Promise<LetterOfCredit[]> {
    const where: any = { beneficiaryId };
    if (status) {
      where.status = status;
    }

    return await this.lcRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get Letters of Credit by bank
   */
  async getLCsByBank(bankId: string, bankType: 'issuing' | 'advising' | 'confirming', status?: LCStatus): Promise<LetterOfCredit[]> {
    const where: any = {};
    if (bankType === 'issuing') {
      where.issuingBankId = bankId;
    } else if (bankType === 'advising') {
      where.advisingBankId = bankId;
    } else if (bankType === 'confirming') {
      where.confirmingBankId = bankId;
    }
    
    if (status) {
      where.status = status;
    }

    return await this.lcRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get expiring Letters of Credit
   */
  async getExpiringLCs(daysThreshold: number = 30): Promise<LetterOfCredit[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return await this.lcRepo
      .createQueryBuilder('lc')
      .where('lc.expiryDate BETWEEN :now AND :threshold', { 
        now: new Date(), 
        threshold: thresholdDate 
      })
      .andWhere('lc.status IN (:...statuses)', { 
        statuses: [LCStatus.ISSUED, LCStatus.ACTIVE] 
      })
      .orderBy('lc.expiryDate', 'ASC')
      .getMany();
  }

  /**
   * Get LC analytics
   */
  async getLCAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.lcRepo.createQueryBuilder('lc');

    if (startDate && endDate) {
      query.where('lc.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const lcs = await query.getMany();

    const analytics = {
      totalLCs: lcs.length,
      statusDistribution: {
        draft: lcs.filter(l => l.status === LCStatus.DRAFT).length,
        requested: lcs.filter(l => l.status === LCStatus.REQUESTED).length,
        issued: lcs.filter(l => l.status === LCStatus.ISSUED).length,
        active: lcs.filter(l => l.status === LCStatus.ACTIVE).length,
        utilized: lcs.filter(l => l.status === LCStatus.UTILIZED).length,
        expired: lcs.filter(l => l.status === LCStatus.EXPIRED).length,
        cancelled: lcs.filter(l => l.status === LCStatus.CANCELLED).length,
        closed: lcs.filter(l => l.status === LCStatus.CLOSED).length,
      },
      typeDistribution: lcs.reduce((acc: any, lc) => {
        acc[lc.lcType] = (acc[lc.lcType] || 0) + 1;
        return acc;
      }, {}),
      totalValue: lcs.reduce((sum, lc) => sum + lc.amount, 0),
      averageValue: lcs.length > 0 ? lcs.reduce((sum, lc) => sum + lc.amount, 0) / lcs.length : 0,
      totalUtilized: lcs.reduce((sum, lc) => sum + lc.utilizedAmount, 0),
      utilizationRate: lcs.length > 0 ? (lcs.reduce((sum, lc) => sum + lc.utilizedAmount, 0) / lcs.reduce((sum, lc) => sum + lc.amount, 0)) * 100 : 0,
      currencyDistribution: lcs.reduce((acc: any, lc) => {
        acc[lc.currency] = (acc[lc.currency] || 0) + 1;
        return acc;
      }, {}),
      averageProcessingTime: this.calculateAverageProcessingTime(lcs),
    };

    return analytics;
  }

  /**
   * Get LC performance metrics
   */
  async getLCMetrics(): Promise<any> {
    const lcs = await this.lcRepo.find();

    const metrics = {
      totalLCs: lcs.length,
      successfulLCs: lcs.filter(l => [LCStatus.ACTIVE, LCStatus.UTILIZED, LCStatus.CLOSED].includes(l.status)).length,
      cancelledLCs: lcs.filter(l => l.status === LCStatus.CANCELLED).length,
      expiredLCs: lcs.filter(l => l.status === LCStatus.EXPIRED).length,
      totalValue: lcs.reduce((sum, lc) => sum + lc.amount, 0),
      averageValue: lcs.length > 0 ? lcs.reduce((sum, lc) => sum + lc.amount, 0) / lcs.length : 0,
      totalUtilized: lcs.reduce((sum, lc) => sum + lc.utilizedAmount, 0),
      utilizationRate: lcs.length > 0 ? (lcs.reduce((sum, lc) => sum + lc.utilizedAmount, 0) / lcs.reduce((sum, lc) => sum + lc.amount, 0)) * 100 : 0,
      confirmationRate: lcs.length > 0 ? (lcs.filter(l => lc.confirmationRequired).length / lcs.length) * 100 : 0,
      transferableRate: lcs.length > 0 ? (lcs.filter(l => l.transferable).length / lcs.length) * 100 : 0,
    };

    return metrics;
  }

  /**
   * Private helper methods
   */

  private isValidStatusTransition(currentStatus: LCStatus, newStatus: LCStatus): boolean {
    const validTransitions: Record<LCStatus, LCStatus[]> = {
      [LCStatus.DRAFT]: [LCStatus.REQUESTED, LCStatus.CANCELLED],
      [LCStatus.REQUESTED]: [LCStatus.ISSUED, LCStatus.CANCELLED],
      [LCStatus.ISSUED]: [LCStatus.ACTIVE, LCStatus.CANCELLED],
      [LCStatus.ACTIVE]: [LCStatus.UTILIZED, LCStatus.EXPIRED, LCStatus.CANCELLED],
      [LCStatus.UTILIZED]: [LCStatus.CLOSED],
      [LCStatus.EXPIRED]: [LCStatus.CLOSED],
      [LCStatus.CANCELLED]: [],
      [LCStatus.CLOSED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private validateRequiredDocuments(lc: LetterOfCredit, presentedDocuments: any[]): string[] {
    const requiredDocs = lc.documentsRequired || [];
    const presentedDocTypes = presentedDocuments.map(doc => doc.documentType);
    
    return requiredDocs.filter(doc => !presentedDocTypes.includes(doc));
  }

  private calculateAverageProcessingTime(lcs: LetterOfCredit[]): number {
    const completedLCs = lcs.filter(lc => lc.issuedAt && (lc.status === LCStatus.UTILIZED || lc.status === LCStatus.CLOSED));
    
    if (completedLCs.length === 0) return 0;

    const totalTime = completedLCs.reduce((sum, lc) => {
      const completionDate = lc.status === LCStatus.UTILIZED ? lc.utilizations?.[0]?.date : lc.closedAt;
      return sum + (completionDate!.getTime() - lc.issuedAt!.getTime());
    }, 0);

    return totalTime / completedLCs.length / (1000 * 60 * 60 * 24); // Convert to days
  }
}
