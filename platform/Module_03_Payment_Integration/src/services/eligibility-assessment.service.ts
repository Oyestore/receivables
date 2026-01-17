import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancingRequest, FinancingType } from '../entities/financing-request.entity';
import { NBFCPartner } from '../entities/nbfc-partner.entity';
import { SupplyChainRelationship } from '../entities/supply-chain-relationship.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface EligibilityResult {
  isEligible: boolean;
  riskScore: number;
  maxEligibleAmount: number;
  recommendedInterestRate: number;
  eligibilityFactors: Record<string, any>;
  recommendations: string[];
}

@Injectable()
export class EligibilityAssessmentService {
  private readonly logger = new Logger(EligibilityAssessmentService.name);

  constructor(
    @InjectRepository(FinancingRequest)
    private readonly financingRequestRepository: Repository<FinancingRequest>,
    @InjectRepository(NBFCPartner)
    private readonly nbfcPartnerRepository: Repository<NBFCPartner>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(SupplyChainRelationship)
    private readonly supplyChainRepository: Repository<SupplyChainRelationship>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Assess eligibility for financing request
   */
  async assessEligibility(
    financingRequestId: string,
    nbfcPartnerId?: string,
  ): Promise<EligibilityResult> {
    const financingRequest = await this.financingRequestRepository.findOne({
      where: { id: financingRequestId },
      relations: ['invoice', 'organization'],
    });

    if (!financingRequest) {
      throw new Error('Financing request not found');
    }

    // Get NBFC partner if specified
    let nbfcPartner: NBFCPartner | null = null;
    if (nbfcPartnerId) {
      nbfcPartner = await this.nbfcPartnerRepository.findOne({
        where: { id: nbfcPartnerId },
      });
      
      if (!nbfcPartner) {
        throw new Error('NBFC partner not found');
      }
    }

    // Collect data for assessment
    const assessmentData = await this.collectAssessmentData(financingRequest);

    // Perform assessment based on financing type
    let eligibilityResult: EligibilityResult;
    
    switch (financingRequest.financingType) {
      case FinancingType.INVOICE_FINANCING:
        eligibilityResult = await this.assessInvoiceFinancingEligibility(
          financingRequest,
          assessmentData,
          nbfcPartner,
        );
        break;
      
      case FinancingType.SUPPLY_CHAIN_FINANCE:
        eligibilityResult = await this.assessSupplyChainFinanceEligibility(
          financingRequest,
          assessmentData,
          nbfcPartner,
        );
        break;
      
      case FinancingType.WORKING_CAPITAL:
        eligibilityResult = await this.assessWorkingCapitalEligibility(
          financingRequest,
          assessmentData,
          nbfcPartner,
        );
        break;
      
      default:
        eligibilityResult = await this.assessGenericEligibility(
          financingRequest,
          assessmentData,
          nbfcPartner,
        );
    }

    // Update financing request with eligibility results
    financingRequest.riskScore = eligibilityResult.riskScore;
    financingRequest.eligibilityFactors = eligibilityResult.eligibilityFactors;
    
    // If eligible and amount is higher than requested, adjust approved amount
    if (eligibilityResult.isEligible) {
      const approvedAmount = Math.min(
        financingRequest.requestedAmount,
        eligibilityResult.maxEligibleAmount,
      );
      
      financingRequest.approvedAmount = approvedAmount;
      financingRequest.interestRate = eligibilityResult.recommendedInterestRate;
    }
    
    // Update metadata
    financingRequest.metadata = {
      ...financingRequest.metadata,
      eligibilityAssessment: {
        timestamp: new Date(),
        result: eligibilityResult,
        nbfcPartnerId: nbfcPartner?.id,
      },
    };
    
    await this.financingRequestRepository.save(financingRequest);
    
    // Emit event for eligibility assessment
    this.eventEmitter.emit('financing.eligibility_assessed', {
      financingRequestId: financingRequest.id,
      isEligible: eligibilityResult.isEligible,
      riskScore: eligibilityResult.riskScore,
      nbfcPartnerId: nbfcPartner?.id,
    });

    return eligibilityResult;
  }

  /**
   * Collect data for assessment
   */
  private async collectAssessmentData(
    financingRequest: FinancingRequest,
  ): Promise<Record<string, any>> {
    const organizationId = financingRequest.organizationId;
    const invoiceId = financingRequest.invoiceId;

    // Get organization data
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    // Get payment history
    const paymentHistory = await this.getPaymentHistory(organizationId);

    // Get invoice data if available
    let invoice = null;
    let invoicePaymentStatus = null;
    if (invoiceId) {
      invoice = await this.invoiceRepository.findOne({
        where: { id: invoiceId },
      });
      
      invoicePaymentStatus = await this.getInvoicePaymentStatus(invoiceId);
    }

    // Get supply chain relationships if applicable
    let supplyChainRelationships = null;
    if (financingRequest.financingType === FinancingType.SUPPLY_CHAIN_FINANCE) {
      supplyChainRelationships = await this.supplyChainRepository.find({
        where: { organizationId },
      });
    }

    // Return collected data
    return {
      organization,
      paymentHistory,
      invoice,
      invoicePaymentStatus,
      supplyChainRelationships,
      requestedAmount: financingRequest.requestedAmount,
      financingType: financingRequest.financingType,
      tenorDays: financingRequest.tenorDays,
    };
  }

  /**
   * Get payment history for organization
   */
  private async getPaymentHistory(
    organizationId: string,
  ): Promise<Record<string, any>> {
    // Get all invoices for organization
    const invoices = await this.invoiceRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: 100, // Limit to recent invoices
    });

    // Get all payment transactions for organization
    const transactions = await this.paymentTransactionRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: 100, // Limit to recent transactions
    });

    // Calculate payment metrics
    const totalInvoices = invoices.length;
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const partiallyPaidInvoices = invoices.filter(inv => inv.status === 'partially_paid').length;
    const overdueInvoices = invoices.filter(inv => {
      return inv.status !== 'paid' && 
             inv.dueDate && 
             new Date(inv.dueDate) < new Date();
    }).length;

    // Calculate average days to payment
    const daysToPay = [];
    for (const invoice of invoices) {
      if (invoice.status === 'paid' && invoice.paidDate && invoice.invoiceDate) {
        const invoiceDate = new Date(invoice.invoiceDate);
        const paidDate = new Date(invoice.paidDate);
        const days = Math.floor((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        daysToPay.push(days);
      }
    }
    
    const averageDaysToPay = daysToPay.length > 0 
      ? daysToPay.reduce((sum, days) => sum + days, 0) / daysToPay.length 
      : null;

    // Calculate payment reliability score (0-100)
    let paymentReliabilityScore = 0;
    
    if (totalInvoices > 0) {
      // Base score on paid invoice percentage (0-70 points)
      const paidPercentage = (paidInvoices / totalInvoices) * 100;
      paymentReliabilityScore += Math.min(70, paidPercentage * 0.7);
      
      // Add points for low overdue percentage (0-20 points)
      const overduePercentage = (overdueInvoices / totalInvoices) * 100;
      paymentReliabilityScore += Math.min(20, 20 - (overduePercentage * 0.2));
      
      // Add points for timely payments (0-10 points)
      if (averageDaysToPay !== null) {
        // If pays on average before due date (assuming 30 days is standard)
        if (averageDaysToPay <= 30) {
          paymentReliabilityScore += 10;
        } else {
          // Deduct points for late payments
          const daysLate = averageDaysToPay - 30;
          paymentReliabilityScore += Math.max(0, 10 - (daysLate * 0.5));
        }
      }
    }

    return {
      totalInvoices,
      totalInvoiceAmount,
      paidInvoices,
      partiallyPaidInvoices,
      overdueInvoices,
      averageDaysToPay,
      paymentReliabilityScore,
      recentInvoices: invoices.slice(0, 10), // Include 10 most recent invoices
      recentTransactions: transactions.slice(0, 10), // Include 10 most recent transactions
    };
  }

  /**
   * Get invoice payment status
   */
  private async getInvoicePaymentStatus(
    invoiceId: string,
  ): Promise<Record<string, any>> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return null;
    }

    // Get payment transactions for this invoice
    const transactions = await this.paymentTransactionRepository.find({
      where: { invoiceId },
    });

    // Calculate metrics
    const totalPaid = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const remainingAmount = Math.max(0, Number(invoice.totalAmount) - totalPaid);
    const paymentPercentage = invoice.totalAmount > 0 
      ? (totalPaid / Number(invoice.totalAmount)) * 100 
      : 0;

    // Check if invoice is overdue
    const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date();
    const daysOverdue = isOverdue && invoice.dueDate 
      ? Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      invoiceStatus: invoice.status,
      totalAmount: invoice.totalAmount,
      totalPaid,
      remainingAmount,
      paymentPercentage,
      isOverdue,
      daysOverdue,
      transactions,
    };
  }

  /**
   * Assess eligibility for invoice financing
   */
  private async assessInvoiceFinancingEligibility(
    financingRequest: FinancingRequest,
    assessmentData: Record<string, any>,
    nbfcPartner?: NBFCPartner,
  ): Promise<EligibilityResult> {
    const { 
      invoice, 
      invoicePaymentStatus, 
      paymentHistory, 
      organization,
      requestedAmount,
    } = assessmentData;

    // Initialize result
    const result: EligibilityResult = {
      isEligible: false,
      riskScore: 0,
      maxEligibleAmount: 0,
      recommendedInterestRate: nbfcPartner?.defaultInterestRate || 12,
      eligibilityFactors: {},
      recommendations: [],
    };

    // Check if invoice exists
    if (!invoice) {
      result.eligibilityFactors.invoiceExists = false;
      result.recommendations.push('Please provide a valid invoice for financing');
      return result;
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      result.eligibilityFactors.invoiceAlreadyPaid = true;
      result.recommendations.push('Invoice is already paid and not eligible for financing');
      return result;
    }

    // Check if invoice is already partially financed
    if (invoice.metadata?.financing?.isFinanced) {
      result.eligibilityFactors.invoiceAlreadyFinanced = true;
      result.recommendations.push('Invoice is already financed');
      return result;
    }

    // Calculate risk score (0-100, lower is better)
    let riskScore = 50; // Start with neutral score

    // Factor 1: Payment history (0-30 points)
    const paymentReliabilityScore = paymentHistory.paymentReliabilityScore || 0;
    const paymentHistoryRisk = 30 - ((paymentReliabilityScore / 100) * 30);
    riskScore += paymentHistoryRisk;
    result.eligibilityFactors.paymentHistoryRisk = paymentHistoryRisk;

    // Factor 2: Invoice age (0-20 points)
    let invoiceAgeRisk = 0;
    if (invoice.invoiceDate) {
      const invoiceAge = Math.floor(
        (new Date().getTime() - new Date(invoice.invoiceDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Newer invoices are less risky
      if (invoiceAge <= 7) {
        invoiceAgeRisk = 0; // Very fresh invoice
      } else if (invoiceAge <= 30) {
        invoiceAgeRisk = 5; // Recent invoice
      } else if (invoiceAge <= 60) {
        invoiceAgeRisk = 10; // Moderately aged invoice
      } else if (invoiceAge <= 90) {
        invoiceAgeRisk = 15; // Older invoice
      } else {
        invoiceAgeRisk = 20; // Very old invoice
      }
    } else {
      invoiceAgeRisk = 20; // No invoice date is high risk
    }
    riskScore += invoiceAgeRisk;
    result.eligibilityFactors.invoiceAgeRisk = invoiceAgeRisk;

    // Factor 3: Invoice amount vs requested amount (0-15 points)
    let amountRisk = 0;
    if (invoice.totalAmount > 0) {
      const requestPercentage = (requestedAmount / Number(invoice.totalAmount)) * 100;
      
      if (requestPercentage <= 50) {
        amountRisk = 0; // Conservative request
      } else if (requestPercentage <= 70) {
        amountRisk = 5; // Moderate request
      } else if (requestPercentage <= 85) {
        amountRisk = 10; // High request
      } else {
        amountRisk = 15; // Very high request
      }
    } else {
      amountRisk = 15; // Invalid invoice amount
    }
    riskScore += amountRisk;
    result.eligibilityFactors.amountRisk = amountRisk;

    // Factor 4: Customer payment behavior (0-20 points)
    let customerRisk = 20; // Start with maximum risk
    
    if (invoice.customerId) {
      // Get customer payment history
      const customerInvoices = await this.invoiceRepository.find({
        where: { 
          organizationId: financingRequest.organizationId,
          customerId: invoice.customerId,
        },
      });
      
      if (customerInvoices.length > 0) {
        const totalCustomerInvoices = customerInvoices.length;
        const paidCustomerInvoices = customerInvoices.filter(inv => inv.status === 'paid').length;
        const paidPercentage = (paidCustomerInvoices / totalCustomerInvoices) * 100;
        
        if (paidPercentage >= 90) {
          customerRisk = 0; // Excellent customer
        } else if (paidPercentage >= 75) {
          customerRisk = 5; // Good customer
        } else if (paidPercentage >= 60) {
          customerRisk = 10; // Average customer
        } else if (paidPercentage >= 40) {
          customerRisk = 15; // Below average customer
        } else {
          customerRisk = 20; // Poor customer
        }
      }
    }
    riskScore += customerRisk;
    result.eligibilityFactors.customerRisk = customerRisk;

    // Factor 5: Organization age (0-15 points)
    let organizationAgeRisk = 15; // Start with maximum risk
    
    if (organization && organization.foundingDate) {
      const orgAgeYears = (new Date().getTime() - new Date(organization.foundingDate).getTime()) / 
        (1000 * 60 * 60 * 24 * 365);
      
      if (orgAgeYears >= 5) {
        organizationAgeRisk = 0; // Well-established
      } else if (orgAgeYears >= 3) {
        organizationAgeRisk = 5; // Established
      } else if (orgAgeYears >= 1) {
        organizationAgeRisk = 10; // Relatively new
      } else {
     
(Content truncated due to size limit. Use line ranges to read in chunks)