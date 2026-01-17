import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FinancingRequest, FinancingType, FinancingStatus } from '../entities/financing-request.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { EligibilityAssessmentService } from './eligibility-assessment.service';
import { WorkingCapitalService } from './working-capital.service';
import { SupplyChainFinanceService } from './supply-chain-finance.service';

@Injectable()
export class FinancingIntegrationService {
  private readonly logger = new Logger(FinancingIntegrationService.name);

  constructor(
    @InjectRepository(FinancingRequest)
    private readonly financingRequestRepository: Repository<FinancingRequest>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    private readonly eligibilityService: EligibilityAssessmentService,
    private readonly workingCapitalService: WorkingCapitalService,
    private readonly supplyChainService: SupplyChainFinanceService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Subscribe to relevant events
    this.subscribeToEvents();
  }

  /**
   * Subscribe to relevant events from other modules
   */
  private subscribeToEvents(): void {
    // Listen for invoice creation events
    this.eventEmitter.on('invoice.created', (payload) => {
      this.handleInvoiceCreated(payload);
    });

    // Listen for invoice status change events
    this.eventEmitter.on('invoice.status_changed', (payload) => {
      this.handleInvoiceStatusChanged(payload);
    });

    // Listen for payment transaction events
    this.eventEmitter.on('payment.transaction_completed', (payload) => {
      this.handlePaymentTransactionCompleted(payload);
    });

    // Listen for payment failure events
    this.eventEmitter.on('payment.transaction_failed', (payload) => {
      this.handlePaymentTransactionFailed(payload);
    });
  }

  /**
   * Handle invoice created event
   */
  private async handleInvoiceCreated(payload: any): Promise<void> {
    try {
      const { invoiceId, organizationId, customerId, amount } = payload;
      
      this.logger.log(`Processing invoice creation for financing: ${invoiceId}`);
      
      // Check if automatic financing assessment is enabled for this organization
      const invoice = await this.invoiceRepository.findOne({
        where: { id: invoiceId },
        relations: ['organization'],
      });
      
      if (!invoice || !invoice.organization) {
        return;
      }
      
      const autoFinancingEnabled = invoice.organization.metadata?.financingSettings?.autoAssessment;
      
      if (autoFinancingEnabled) {
        // Create a financing request for assessment
        const financingRequest = this.financingRequestRepository.create({
          organizationId,
          invoiceId,
          requestedAmount: amount * 0.8, // Default to 80% of invoice amount
          approvedAmount: 0,
          outstandingAmount: 0,
          interestRate: 0,
          tenorDays: 60, // Default tenor
          financingType: FinancingType.INVOICE_FINANCING,
          status: FinancingStatus.PENDING_ASSESSMENT,
          metadata: {
            autoCreated: true,
            creationSource: 'invoice_creation',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        await this.financingRequestRepository.save(financingRequest);
        
        // Perform eligibility assessment
        await this.eligibilityService.assessEligibility(financingRequest.id);
        
        this.logger.log(`Auto-created financing request for invoice: ${invoiceId}`);
      }
      
      // Check for supply chain financing opportunities
      if (customerId) {
        const supplyChainRelationships = await this.supplyChainService.calculateSupplyChainMetrics(organizationId);
        
        // If there are active buyer relationships, check for financing opportunities
        if (supplyChainRelationships.activeRelationships > 0) {
          this.logger.log(`Checking supply chain financing opportunities for invoice: ${invoiceId}`);
          
          // Logic to identify potential supply chain financing opportunities
          // This would typically involve checking if the customer is a registered buyer
          // and if they have enabled supply chain financing
          
          // For demonstration purposes, we'll just log this opportunity
          this.eventEmitter.emit('financing.supply_chain_opportunity', {
            invoiceId,
            organizationId,
            customerId,
            amount,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error handling invoice creation for financing: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle invoice status changed event
   */
  private async handleInvoiceStatusChanged(payload: any): Promise<void> {
    try {
      const { invoiceId, oldStatus, newStatus } = payload;
      
      this.logger.log(`Processing invoice status change for financing: ${invoiceId} (${oldStatus} -> ${newStatus})`);
      
      // Find any financing requests for this invoice
      const financingRequests = await this.financingRequestRepository.find({
        where: { invoiceId },
      });
      
      if (financingRequests.length === 0) {
        return;
      }
      
      // Handle different status transitions
      switch (newStatus) {
        case 'paid':
          // If invoice is paid, update financing requests
          for (const request of financingRequests) {
            if (request.status === FinancingStatus.FUNDED) {
              // Mark financing as repaid
              request.status = FinancingStatus.REPAID;
              request.outstandingAmount = 0;
              request.repaymentDate = new Date();
              request.updatedAt = new Date();
              
              await this.financingRequestRepository.save(request);
              
              this.logger.log(`Marked financing request ${request.id} as repaid due to invoice payment`);
              
              // Emit event for financing repayment
              this.eventEmitter.emit('financing.repaid', {
                financingRequestId: request.id,
                invoiceId,
                repaymentDate: request.repaymentDate,
              });
            }
          }
          break;
          
        case 'cancelled':
        case 'void':
          // If invoice is cancelled or voided, update financing requests
          for (const request of financingRequests) {
            if (request.status !== FinancingStatus.REPAID) {
              // Mark financing as cancelled
              request.status = FinancingStatus.CANCELLED;
              request.updatedAt = new Date();
              
              await this.financingRequestRepository.save(request);
              
              this.logger.log(`Marked financing request ${request.id} as cancelled due to invoice cancellation`);
              
              // Emit event for financing cancellation
              this.eventEmitter.emit('financing.cancelled', {
                financingRequestId: request.id,
                invoiceId,
                reason: `Invoice ${newStatus}`,
              });
            }
          }
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling invoice status change for financing: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle payment transaction completed event
   */
  private async handlePaymentTransactionCompleted(payload: any): Promise<void> {
    try {
      const { transactionId, invoiceId, amount } = payload;
      
      if (!invoiceId) {
        return;
      }
      
      this.logger.log(`Processing payment transaction for financing: ${transactionId} (Invoice: ${invoiceId})`);
      
      // Find any financing requests for this invoice
      const financingRequests = await this.financingRequestRepository.find({
        where: { invoiceId },
      });
      
      if (financingRequests.length === 0) {
        return;
      }
      
      // Get the invoice to check total amount
      const invoice = await this.invoiceRepository.findOne({
        where: { id: invoiceId },
      });
      
      if (!invoice) {
        return;
      }
      
      // Get all payments for this invoice
      const payments = await this.paymentTransactionRepository.find({
        where: { invoiceId },
      });
      
      // Calculate total paid amount
      const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      
      // Check if invoice is fully paid
      const isFullyPaid = totalPaid >= Number(invoice.totalAmount);
      
      // Update financing requests based on payment
      for (const request of financingRequests) {
        if (request.status === FinancingStatus.FUNDED) {
          if (isFullyPaid) {
            // Mark financing as repaid
            request.status = FinancingStatus.REPAID;
            request.outstandingAmount = 0;
            request.repaymentDate = new Date();
          } else {
            // Update outstanding amount
            const paymentPercentage = totalPaid / Number(invoice.totalAmount);
            request.outstandingAmount = Number(request.approvedAmount) * (1 - paymentPercentage);
          }
          
          request.updatedAt = new Date();
          await this.financingRequestRepository.save(request);
          
          this.logger.log(`Updated financing request ${request.id} based on payment transaction`);
          
          // Emit event for financing update
          this.eventEmitter.emit('financing.payment_applied', {
            financingRequestId: request.id,
            invoiceId,
            transactionId,
            paymentAmount: amount,
            remainingAmount: request.outstandingAmount,
            isFullyRepaid: isFullyPaid,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error handling payment transaction for financing: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle payment transaction failed event
   */
  private async handlePaymentTransactionFailed(payload: any): Promise<void> {
    try {
      const { transactionId, invoiceId, reason } = payload;
      
      if (!invoiceId) {
        return;
      }
      
      this.logger.log(`Processing failed payment transaction for financing: ${transactionId} (Invoice: ${invoiceId})`);
      
      // Find any financing requests for this invoice
      const financingRequests = await this.financingRequestRepository.find({
        where: { invoiceId },
      });
      
      if (financingRequests.length === 0) {
        return;
      }
      
      // Update financing requests to record failed payment attempt
      for (const request of financingRequests) {
        if (request.status === FinancingStatus.FUNDED) {
          // Add failed payment attempt to metadata
          if (!request.metadata.failedPaymentAttempts) {
            request.metadata.failedPaymentAttempts = [];
          }
          
          request.metadata.failedPaymentAttempts.push({
            transactionId,
            date: new Date(),
            reason,
          });
          
          request.updatedAt = new Date();
          await this.financingRequestRepository.save(request);
          
          this.logger.log(`Recorded failed payment attempt for financing request ${request.id}`);
          
          // Emit event for failed payment
          this.eventEmitter.emit('financing.payment_failed', {
            financingRequestId: request.id,
            invoiceId,
            transactionId,
            reason,
            failedAttempts: request.metadata.failedPaymentAttempts.length,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error handling failed payment transaction for financing: ${error.message}`, error.stack);
    }
  }

  /**
   * Create financing request from invoice
   */
  async createFinancingRequestFromInvoice(
    invoiceId: string,
    organizationId: string,
    amount: number,
    financingType: FinancingType,
    tenorDays: number,
    nbfcPartnerId?: string,
  ): Promise<FinancingRequest> {
    // Verify invoice exists
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // Create financing request
    const financingRequest = this.financingRequestRepository.create({
      organizationId,
      invoiceId,
      nbfcPartnerId,
      requestedAmount: amount,
      approvedAmount: 0,
      outstandingAmount: 0,
      interestRate: 0,
      tenorDays,
      financingType,
      status: FinancingStatus.PENDING,
      metadata: {
        creationSource: 'manual_request',
        invoiceNumber: invoice.invoiceNumber,
        invoiceAmount: invoice.totalAmount,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    await this.financingRequestRepository.save(financingRequest);
    
    // Emit event for financing request creation
    this.eventEmitter.emit('financing.request_created', {
      financingRequestId: financingRequest.id,
      invoiceId,
      organizationId,
      amount,
      financingType,
      tenorDays,
      nbfcPartnerId,
    });
    
    return financingRequest;
  }

  /**
   * Update invoice with financing information
   */
  async updateInvoiceWithFinancingInfo(
    invoiceId: string,
    financingRequestId: string,
    financingStatus: FinancingStatus,
  ): Promise<Invoice> {
    // Get invoice and financing request
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    const financingRequest = await this.financingRequestRepository.findOne({
      where: { id: financingRequestId },
    });
    
    if (!financingRequest) {
      throw new Error('Financing request not found');
    }
    
    // Update invoice with financing information
    invoice.metadata = {
      ...invoice.metadata,
      financing: {
        isFinanced: financingStatus === FinancingStatus.FUNDED,
        financingRequestId,
        financingType: financingRequest.financingType,
        financedAmount: financingRequest.approvedAmount,
        financingDate: financingRequest.disbursementDate,
        financingStatus,
        nbfcPartnerId: financingRequest.nbfcPartnerId,
        nbfcPartnerName: financingRequest.nbfcPartnerName,
      },
    };
    
    await this.invoiceRepository.save(invoice);
    
    // Emit event for invoice financing update
    this.eventEmitter.emit('invoice.financing_updated', {
      invoiceId,
      financingRequestId,
      financingStatus,
      isFinanced: financingStatus === FinancingStatus.FUNDED,
    });
    
    return invoice;
  }

  /**
   * Create payment transaction for financing disbursement
   */
  async createFinancingDisbursementTransaction(
    financingRequestId: string,
  ): Promise<PaymentTransaction> {
    // Get financing request
    const financingRequest = await this.financingRequestRepository.findOne({
      where: { id: financingRequestId },
      relations: ['invoice'],
    });
    
    if (!financingRequest) {
      throw new Error('Financing request not found');
    }
    
    if (financingRequest.status !== FinancingStatus.APPROVED) {
      throw new Error('Financing request is not approved');
    }
    
    // Create disbursement transaction
    const transaction = this.paymentTransactionRepositor
(Content truncated due to size limit. Use line ranges to read in chunks)