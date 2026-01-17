import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NBFCPartner, NBFCPartnerIntegrationType } from '../entities/nbfc-partner.entity';
import { FinancingRequest, FinancingStatus, FinancingType } from '../entities/financing-request.entity';
import { FinancingTransaction, FinancingTransactionType } from '../entities/financing-transaction.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class NBFCIntegrationService {
  private readonly logger = new Logger(NBFCIntegrationService.name);

  constructor(
    @InjectRepository(NBFCPartner)
    private readonly nbfcPartnerRepository: Repository<NBFCPartner>,
    @InjectRepository(FinancingRequest)
    private readonly financingRequestRepository: Repository<FinancingRequest>,
    @InjectRepository(FinancingTransaction)
    private readonly financingTransactionRepository: Repository<FinancingTransaction>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get all active NBFC partners
   */
  async getAllActivePartners(): Promise<NBFCPartner[]> {
    return this.nbfcPartnerRepository.find({
      where: { status: 'active' },
    });
  }

  /**
   * Get NBFC partner by ID
   */
  async getPartnerById(id: string): Promise<NBFCPartner> {
    return this.nbfcPartnerRepository.findOne({
      where: { id },
    });
  }

  /**
   * Create or update NBFC partner
   */
  async createOrUpdatePartner(partnerData: Partial<NBFCPartner>): Promise<NBFCPartner> {
    if (partnerData.id) {
      await this.nbfcPartnerRepository.update(partnerData.id, partnerData);
      return this.getPartnerById(partnerData.id);
    } else {
      const newPartner = this.nbfcPartnerRepository.create(partnerData);
      return this.nbfcPartnerRepository.save(newPartner);
    }
  }

  /**
   * Submit financing request to NBFC partner
   */
  async submitFinancingRequest(
    financingRequestId: string,
    nbfcPartnerId: string,
  ): Promise<FinancingRequest> {
    const financingRequest = await this.financingRequestRepository.findOne({
      where: { id: financingRequestId },
      relations: ['invoice', 'organization'],
    });

    if (!financingRequest) {
      throw new Error('Financing request not found');
    }

    const nbfcPartner = await this.nbfcPartnerRepository.findOne({
      where: { id: nbfcPartnerId },
    });

    if (!nbfcPartner) {
      throw new Error('NBFC partner not found');
    }

    // Update financing request with NBFC partner info
    financingRequest.nbfcPartnerId = nbfcPartner.id;
    financingRequest.nbfcPartnerName = nbfcPartner.name;
    financingRequest.status = FinancingStatus.PENDING_APPROVAL;
    financingRequest.requestDate = new Date();

    // Handle different integration types
    if (nbfcPartner.integrationType === NBFCPartnerIntegrationType.API) {
      try {
        const response = await this.submitRequestViaAPI(financingRequest, nbfcPartner);
        
        // Update with external reference ID if provided
        if (response.referenceId) {
          financingRequest.nbfcReferenceId = response.referenceId;
        }
        
        // Update status if provided
        if (response.status) {
          financingRequest.status = this.mapExternalStatusToInternal(response.status);
        }
        
        // Store additional metadata
        financingRequest.metadata = {
          ...financingRequest.metadata,
          nbfcSubmission: {
            submittedAt: new Date(),
            responseData: response,
          },
        };
      } catch (error) {
        this.logger.error(`Failed to submit financing request to NBFC API: ${error.message}`, error.stack);
        
        // Store error in metadata but keep status as pending
        financingRequest.metadata = {
          ...financingRequest.metadata,
          nbfcSubmission: {
            submittedAt: new Date(),
            error: {
              message: error.message,
              timestamp: new Date(),
            },
          },
        };
      }
    } else {
      // For manual integration, just update status
      financingRequest.metadata = {
        ...financingRequest.metadata,
        manualProcessing: {
          queuedAt: new Date(),
        },
      };
    }

    // Save updated financing request
    await this.financingRequestRepository.save(financingRequest);
    
    // Emit event for financing request submission
    this.eventEmitter.emit('financing.request_submitted', {
      financingRequestId: financingRequest.id,
      nbfcPartnerId: nbfcPartner.id,
      status: financingRequest.status,
    });

    return financingRequest;
  }

  /**
   * Submit financing request via NBFC partner API
   */
  private async submitRequestViaAPI(
    financingRequest: FinancingRequest,
    nbfcPartner: NBFCPartner,
  ): Promise<any> {
    if (!nbfcPartner.apiBaseUrl) {
      throw new Error('NBFC partner API URL not configured');
    }

    // Prepare request payload based on financing type
    const payload = this.prepareAPIPayload(financingRequest, nbfcPartner);

    // Make API call to NBFC partner
    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${nbfcPartner.apiBaseUrl}/financing-requests`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${nbfcPartner.apiKey}`,
              'X-API-Key': nbfcPartner.apiSecret,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `NBFC API call failed: ${error.message}`,
        error.response?.data || error.stack,
      );
      throw new Error(`NBFC API call failed: ${error.message}`);
    }
  }

  /**
   * Prepare API payload based on financing type
   */
  private prepareAPIPayload(
    financingRequest: FinancingRequest,
    nbfcPartner: NBFCPartner,
  ): any {
    const basePayload = {
      requestId: financingRequest.id,
      organizationId: financingRequest.organizationId,
      organizationName: financingRequest.organization?.name,
      amount: financingRequest.requestedAmount,
      currency: financingRequest.currencyCode || 'INR',
      tenorDays: financingRequest.tenorDays || nbfcPartner.defaultTenorDays,
      financingType: financingRequest.financingType,
    };

    // Add type-specific fields
    switch (financingRequest.financingType) {
      case FinancingType.INVOICE_FINANCING:
        return {
          ...basePayload,
          invoiceId: financingRequest.invoiceId,
          invoiceNumber: financingRequest.invoice?.invoiceNumber,
          invoiceAmount: financingRequest.invoice?.totalAmount,
          invoiceDate: financingRequest.invoice?.invoiceDate,
          invoiceDueDate: financingRequest.invoice?.dueDate,
          customerName: financingRequest.invoice?.customerName,
          advancePercentage: financingRequest.advancePercentage || nbfcPartner.defaultAdvancePercentage,
        };
      
      case FinancingType.SUPPLY_CHAIN_FINANCE:
        return {
          ...basePayload,
          buyerId: financingRequest.metadata?.supplyChain?.buyerId,
          buyerName: financingRequest.metadata?.supplyChain?.buyerName,
          supplierId: financingRequest.metadata?.supplyChain?.supplierId,
          supplierName: financingRequest.metadata?.supplyChain?.supplierName,
          invoiceId: financingRequest.invoiceId,
          invoiceNumber: financingRequest.invoice?.invoiceNumber,
          invoiceAmount: financingRequest.invoice?.totalAmount,
          invoiceDate: financingRequest.invoice?.invoiceDate,
          invoiceDueDate: financingRequest.invoice?.dueDate,
        };
      
      case FinancingType.WORKING_CAPITAL:
        return {
          ...basePayload,
          purpose: financingRequest.metadata?.workingCapital?.purpose,
          duration: financingRequest.metadata?.workingCapital?.duration || financingRequest.tenorDays,
          businessVintage: financingRequest.metadata?.workingCapital?.businessVintage,
        };
      
      default:
        return basePayload;
    }
  }

  /**
   * Map external NBFC status to internal status
   */
  private mapExternalStatusToInternal(externalStatus: string): FinancingStatus {
    const statusMap: Record<string, FinancingStatus> = {
      'SUBMITTED': FinancingStatus.PENDING_APPROVAL,
      'UNDER_REVIEW': FinancingStatus.PENDING_APPROVAL,
      'APPROVED': FinancingStatus.APPROVED,
      'REJECTED': FinancingStatus.REJECTED,
      'DISBURSED': FinancingStatus.FUNDED,
      'REPAID': FinancingStatus.REPAID,
      'DEFAULTED': FinancingStatus.DEFAULTED,
      'CANCELLED': FinancingStatus.CANCELLED,
    };

    return statusMap[externalStatus.toUpperCase()] || FinancingStatus.PENDING_APPROVAL;
  }

  /**
   * Update financing request status from NBFC partner
   */
  async updateFinancingRequestStatus(
    financingRequestId: string,
    status: FinancingStatus,
    metadata?: Record<string, any>,
  ): Promise<FinancingRequest> {
    const financingRequest = await this.financingRequestRepository.findOne({
      where: { id: financingRequestId },
    });

    if (!financingRequest) {
      throw new Error('Financing request not found');
    }

    // Update status and related fields
    financingRequest.status = status;
    
    switch (status) {
      case FinancingStatus.APPROVED:
        financingRequest.approvalDate = new Date();
        if (metadata?.approvedAmount) {
          financingRequest.approvedAmount = metadata.approvedAmount;
        }
        if (metadata?.interestRate) {
          financingRequest.interestRate = metadata.interestRate;
        }
        if (metadata?.processingFeePercentage) {
          financingRequest.processingFeePercentage = metadata.processingFeePercentage;
        }
        if (metadata?.processingFeeFixed) {
          financingRequest.processingFeeFixed = metadata.processingFeeFixed;
        }
        if (metadata?.repaymentDueDate) {
          financingRequest.repaymentDueDate = new Date(metadata.repaymentDueDate);
        }
        break;
      
      case FinancingStatus.REJECTED:
        if (metadata?.rejectionReason) {
          financingRequest.rejectionReason = metadata.rejectionReason;
        }
        break;
      
      case FinancingStatus.FUNDED:
        financingRequest.fundingDate = new Date();
        // Create disbursement transaction
        if (metadata?.disbursementAmount) {
          await this.createFinancingTransaction(
            financingRequestId,
            FinancingTransactionType.DISBURSEMENT,
            metadata.disbursementAmount,
            'Disbursement from NBFC partner',
            metadata?.externalReferenceId,
          );
        }
        break;
      
      case FinancingStatus.REPAID:
        financingRequest.repaymentDate = new Date();
        // Create repayment transaction if provided
        if (metadata?.repaymentAmount) {
          await this.createFinancingTransaction(
            financingRequestId,
            FinancingTransactionType.REPAYMENT,
            metadata.repaymentAmount,
            'Repayment to NBFC partner',
            metadata?.externalReferenceId,
          );
        }
        break;
    }

    // Update metadata
    if (metadata) {
      financingRequest.metadata = {
        ...financingRequest.metadata,
        statusUpdates: [
          ...(financingRequest.metadata?.statusUpdates || []),
          {
            status,
            timestamp: new Date(),
            metadata,
          },
        ],
      };
    }

    // Save updated financing request
    await this.financingRequestRepository.save(financingRequest);
    
    // Emit event for status update
    this.eventEmitter.emit('financing.status_updated', {
      financingRequestId: financingRequest.id,
      previousStatus: financingRequest.status,
      newStatus: status,
      metadata,
    });

    return financingRequest;
  }

  /**
   * Create financing transaction
   */
  async createFinancingTransaction(
    financingRequestId: string,
    transactionType: FinancingTransactionType,
    amount: number,
    description?: string,
    externalReferenceId?: string,
  ): Promise<FinancingTransaction> {
    const financingRequest = await this.financingRequestRepository.findOne({
      where: { id: financingRequestId },
    });

    if (!financingRequest) {
      throw new Error('Financing request not found');
    }

    const transaction = this.financingTransactionRepository.create({
      financingRequestId,
      transactionType,
      amount,
      description,
      externalReferenceId,
      transactionDate: new Date(),
      currencyCode: financingRequest.currencyCode,
    });

    const savedTransaction = await this.financingTransactionRepository.save(transaction);

    // Update financing request amounts
    await this.updateFinancingRequestAmounts(financingRequestId);

    // Emit event for transaction creation
    this.eventEmitter.emit('financing.transaction_created', {
      financingRequestId,
      transactionId: savedTransaction.id,
      transactionType,
      amount,
    });

    return savedTransaction;
  }

  /**
   * Update financing request amounts based on transactions
   */
  private async updateFinancingRequestAmounts(financingRequestId: string): Promise<void> {
    const financingRequest = await this.financingRequestRepository.findOne({
      where: { id: financingRequestId },
    });

    if (!financingRequest) {
      throw new Error('Financing request not found');
    }

    // Get all transactions for this financing request
    const transactions = await this.financingTransactionRepository.find({
      where: { financingRequestId },
    });

    // Calculate totals
    let totalRepaymentAmount = 0;
    let repaidAmount = 0;

    for (const transaction of transactions) {
      if (transaction.transactionType === FinancingTransactionType.DISBURSEMENT) {
        totalRepaymentAmount += transaction.amount;
      } else if (transaction.transactionType === FinancingTransactionType.FEE) {
        totalRepaymentAmount += transaction.amount;
      } else if (transaction.transactionType === FinancingTransactionType.INTEREST) {
        totalRepaymentAmount += transaction.amount;
      } else if (transaction.transactionType === FinancingTransactionType.REPAYMENT) {
        repaidAmount += transaction.amount;
      } else if (transaction.transactionType === FinancingTransactionType.REFUND) {
        repaidAmount -= transaction.amount;
      }
    }

    // Add interest if applicable
    if (financingRequest.interestRate && financingRequest.approvedAmount) {
      const interestAmount = (financingRequest.approvedAmount * financingRequest.interestRate / 100) * 
        (financingRequest.tenorDays / 365);
      totalRepaymentAmount += interestAmount;
    }

    // Add processing fees if applicable
    if (financingRequest.processingFeePercentage && financingRequest.approvedAmount) {
      const processingFeeAmount = financingRequest.approvedAmount * 
        financingRequest.processingFeePercentage / 100;
      totalRepaymentAmount += processingFeeAmount;
    }

    if (financingRequest.processingFeeFixed) {
      totalRepaymentAmount += financingRequest.processingFeeFixed;
    }

    // Update financing request
    financingRequest.totalRepaymentAmount = totalRepaymentAmount;
    financingRequest.repaidAmount = repaidAmount;
    financingRequest.outstandingAmount = totalRepaymentAmount - repaidAmount;

    // Update status if fully repaid
    if (financingRequest.status === FinancingStatus.FUNDED && 
        financingRequest.outstandingAmount <= 0) {
      financingRequest.status = 
(Content truncated due to size limit. Use line ranges to read in chunks)