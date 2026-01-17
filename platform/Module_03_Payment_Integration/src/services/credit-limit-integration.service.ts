import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditLimit } from '../entities/credit-limit.entity';
import { CreditLimitApproval } from '../entities/credit-limit-approval.entity';
import { CreditAssessment } from '../entities/credit-assessment.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { PaymentPrediction } from '../entities/payment-prediction.entity';
import { CreditLimitService } from './credit-limit.service';
import { CreditLimitCalculationService } from './credit-limit-calculation.service';

/**
 * Service responsible for integrating credit limit management with other modules.
 * This service provides functionality for connecting credit limits with credit assessment and payment analysis.
 */
@Injectable()
export class CreditLimitIntegrationService {
  private readonly logger = new Logger(CreditLimitIntegrationService.name);

  constructor(
    @InjectRepository(CreditLimit)
    private creditLimitRepository: Repository<CreditLimit>,
    @InjectRepository(CreditLimitApproval)
    private creditLimitApprovalRepository: Repository<CreditLimitApproval>,
    @InjectRepository(CreditAssessment)
    private creditAssessmentRepository: Repository<CreditAssessment>,
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepository: Repository<PaymentHistory>,
    @InjectRepository(PaymentPrediction)
    private paymentPredictionRepository: Repository<PaymentPrediction>,
    private creditLimitService: CreditLimitService,
    private creditLimitCalculationService: CreditLimitCalculationService,
  ) {}

  /**
   * Process new credit assessment and update credit limits if needed
   * @param creditAssessmentId - Credit assessment ID
   * @param tenantId - Tenant ID
   * @returns Updated credit limit if applicable
   */
  async processNewCreditAssessment(
    creditAssessmentId: string,
    tenantId: string,
  ): Promise<CreditLimit | null> {
    this.logger.log(`Processing new credit assessment ${creditAssessmentId}`);
    
    // Get credit assessment
    const assessment = await this.creditAssessmentRepository.findOne({
      where: { id: creditAssessmentId, tenantId },
    });
    
    if (!assessment) {
      throw new Error(`Credit assessment with ID ${creditAssessmentId} not found`);
    }
    
    const buyerId = assessment.buyerId;
    
    // Get active credit limit if exists
    const activeLimit = await this.creditLimitService.findActiveLimitByBuyer(buyerId, tenantId);
    
    // If no active limit exists, don't create one automatically
    // This should be a deliberate action through the credit limit service
    if (!activeLimit) {
      this.logger.log(`No active credit limit found for buyer ${buyerId}, no automatic creation`);
      return null;
    }
    
    // Check if assessment score differs significantly from the one used for current limit
    if (activeLimit.creditAssessmentId) {
      const previousAssessment = await this.creditAssessmentRepository.findOne({
        where: { id: activeLimit.creditAssessmentId, tenantId },
      });
      
      if (previousAssessment) {
        const scoreDifference = Math.abs(assessment.scoreValue - previousAssessment.scoreValue);
        
        // If score change is significant (more than 10 points), recalculate limit
        if (scoreDifference >= 10) {
          this.logger.log(`Significant score change detected (${scoreDifference} points), recalculating credit limit`);
          
          // Calculate new recommended limit
          const calculationResult = await this.creditLimitCalculationService.calculateRecommendedLimit(
            buyerId,
            tenantId,
            {
              calculationMethod: activeLimit.calculationMethod,
              currencyCode: activeLimit.currencyCode,
            }
          );
          
          // Create approval request for limit change
          const approvalRequest = this.creditLimitApprovalRepository.create({
            tenantId,
            creditLimitId: activeLimit.id,
            status: 'pending',
            requestedLimit: calculationResult.recommendedLimit,
            currencyCode: activeLimit.currencyCode,
            requestDate: new Date(),
            approvalSteps: [
              {
                stepNumber: 1,
                stepName: 'Initial Review',
                status: 'pending',
                requiredRole: 'credit_analyst',
              },
              {
                stepNumber: 2,
                stepName: 'Final Approval',
                status: 'pending',
                requiredRole: 'credit_manager',
              }
            ],
            totalSteps: 2,
            currentStep: 1,
            supportingDocuments: {
              creditAssessmentId: assessment.id,
              previousAssessmentId: previousAssessment.id,
              scoreDifference,
              calculationMethod: calculationResult.calculationMethod,
              calculationParameters: calculationResult.calculationParameters,
            },
            notes: `Automatic limit review triggered by significant credit score change (${scoreDifference} points)`,
          });
          
          await this.creditLimitApprovalRepository.save(approvalRequest);
          
          // Update credit limit with new assessment ID but don't change limit yet
          // The limit will be changed after approval
          return await this.creditLimitService.update(
            activeLimit.id,
            {
              creditAssessmentId: assessment.id,
              recommendedLimit: calculationResult.recommendedLimit,
              confidenceLevel: calculationResult.confidenceLevel,
              riskLevel: calculationResult.riskLevel,
              calculationParameters: calculationResult.calculationParameters,
              notes: `Credit assessment updated, recommended limit: ${calculationResult.recommendedLimit} ${activeLimit.currencyCode}`,
            },
            tenantId
          );
        } else {
          // Update credit limit with new assessment ID
          return await this.creditLimitService.update(
            activeLimit.id,
            {
              creditAssessmentId: assessment.id,
              notes: `Credit assessment updated, no significant change in score`,
            },
            tenantId
          );
        }
      }
    }
    
    // Just update with new assessment ID if no previous assessment
    return await this.creditLimitService.update(
      activeLimit.id,
      {
        creditAssessmentId: assessment.id,
        notes: `Credit assessment updated`,
      },
      tenantId
    );
  }

  /**
   * Process new payment history and update credit limit utilization
   * @param paymentHistoryId - Payment history ID
   * @param tenantId - Tenant ID
   * @returns Updated credit limit if applicable
   */
  async processNewPaymentHistory(
    paymentHistoryId: string,
    tenantId: string,
  ): Promise<CreditLimit | null> {
    this.logger.log(`Processing new payment history ${paymentHistoryId}`);
    
    // Get payment history
    const payment = await this.paymentHistoryRepository.findOne({
      where: { id: paymentHistoryId, tenantId },
    });
    
    if (!payment) {
      throw new Error(`Payment history with ID ${paymentHistoryId} not found`);
    }
    
    const buyerId = payment.buyerId;
    
    // Get active credit limit if exists
    const activeLimit = await this.creditLimitService.findActiveLimitByBuyer(buyerId, tenantId);
    
    if (!activeLimit) {
      this.logger.log(`No active credit limit found for buyer ${buyerId}`);
      return null;
    }
    
    // Get all unpaid invoices for this buyer
    const unpaidPayments = await this.paymentHistoryRepository.find({
      where: { 
        buyerId, 
        tenantId,
        paymentStatus: 'unpaid',
      },
    });
    
    // Calculate total utilization
    let totalUtilization = 0;
    unpaidPayments.forEach(unpaid => {
      totalUtilization += unpaid.invoiceAmount;
    });
    
    // Update credit limit utilization
    return await this.creditLimitService.updateUtilization(
      activeLimit.id,
      tenantId,
      totalUtilization
    );
  }

  /**
   * Process new payment prediction and update credit limit if needed
   * @param paymentPredictionId - Payment prediction ID
   * @param tenantId - Tenant ID
   * @returns Updated credit limit if applicable
   */
  async processNewPaymentPrediction(
    paymentPredictionId: string,
    tenantId: string,
  ): Promise<CreditLimit | null> {
    this.logger.log(`Processing new payment prediction ${paymentPredictionId}`);
    
    // Get payment prediction
    const prediction = await this.paymentPredictionRepository.findOne({
      where: { id: paymentPredictionId, tenantId },
    });
    
    if (!prediction) {
      throw new Error(`Payment prediction with ID ${paymentPredictionId} not found`);
    }
    
    const buyerId = prediction.buyerId;
    
    // Get active credit limit if exists
    const activeLimit = await this.creditLimitService.findActiveLimitByBuyer(buyerId, tenantId);
    
    if (!activeLimit) {
      this.logger.log(`No active credit limit found for buyer ${buyerId}`);
      return null;
    }
    
    // Check if prediction indicates high risk
    const defaultProbability = prediction.defaultProbability || 0;
    const veryLateProbability = prediction.veryLateProbability || 0;
    
    // If combined probability of default or very late payment is high (>30%)
    if (defaultProbability + veryLateProbability > 30) {
      this.logger.warn(`High risk payment prediction for buyer ${buyerId}: default ${defaultProbability}%, very late ${veryLateProbability}%`);
      
      // Create approval request for limit reduction
      const recommendedReduction = Math.round(activeLimit.approvedLimit * 0.25); // 25% reduction
      const newRecommendedLimit = activeLimit.approvedLimit - recommendedReduction;
      
      const approvalRequest = this.creditLimitApprovalRepository.create({
        tenantId,
        creditLimitId: activeLimit.id,
        status: 'pending',
        requestedLimit: newRecommendedLimit,
        currencyCode: activeLimit.currencyCode,
        requestDate: new Date(),
        approvalSteps: [
          {
            stepNumber: 1,
            stepName: 'Risk Review',
            status: 'pending',
            requiredRole: 'risk_analyst',
          },
          {
            stepNumber: 2,
            stepName: 'Final Approval',
            status: 'pending',
            requiredRole: 'credit_manager',
          }
        ],
        totalSteps: 2,
        currentStep: 1,
        supportingDocuments: {
          paymentPredictionId: prediction.id,
          defaultProbability,
          veryLateProbability,
          recommendedReduction,
        },
        notes: `Automatic limit review triggered by high risk payment prediction (default ${defaultProbability}%, very late ${veryLateProbability}%)`,
      });
      
      await this.creditLimitApprovalRepository.save(approvalRequest);
      
      // Update credit limit with warning but don't change limit yet
      // The limit will be changed after approval
      return await this.creditLimitService.update(
        activeLimit.id,
        {
          recommendedLimit: newRecommendedLimit,
          notes: `High risk payment prediction detected, recommended limit reduction: ${recommendedReduction} ${activeLimit.currencyCode}`,
        },
        tenantId
      );
    }
    
    return activeLimit;
  }

  /**
   * Check credit limit before invoice creation
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @param amount - Invoice amount
   * @returns Credit check result
   */
  async checkCreditLimitForInvoice(
    buyerId: string,
    tenantId: string,
    amount: number,
  ): Promise<any> {
    this.logger.log(`Checking credit limit for buyer ${buyerId} for amount ${amount}`);
    
    // Get active credit limit
    const activeLimit = await this.creditLimitService.findActiveLimitByBuyer(buyerId, tenantId);
    
    if (!activeLimit) {
      return {
        approved: false,
        reason: 'No active credit limit found',
        buyerId,
        requestedAmount: amount,
      };
    }
    
    // Check if credit limit is approved
    if (activeLimit.status !== 'approved') {
      return {
        approved: false,
        reason: `Credit limit status is ${activeLimit.status}`,
        buyerId,
        requestedAmount: amount,
        creditLimit: activeLimit,
      };
    }
    
    // Check if amount exceeds available credit
    if (amount > activeLimit.availableCredit) {
      return {
        approved: false,
        reason: 'Requested amount exceeds available credit',
        buyerId,
        requestedAmount: amount,
        availableCredit: activeLimit.availableCredit,
        creditLimit: activeLimit,
        shortfall: amount - activeLimit.availableCredit,
      };
    }
    
    // Calculate new utilization if invoice is created
    const newUtilization = activeLimit.currentUtilization + amount;
    const newUtilizationPercentage = Math.round(newUtilization * 100 / (activeLimit.approvedLimit + (activeLimit.temporaryIncrease || 0)));
    
    return {
      approved: true,
      buyerId,
      requestedAmount: amount,
      availableCredit: activeLimit.availableCredit,
      availableCreditAfter: activeLimit.availableCredit - amount,
      currentUtilization: activeLimit.currentUtilization,
      newUtilization,
      utilizationPercentage: activeLimit.utilizationPercentage,
      newUtilizationPercentage,
      creditLimit: activeLimit,
    };
  }

  /**
   * Update credit limit after invoice creation
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @param invoiceId - Invoice ID
   * @param amount - Invoice amount
   * @returns Updated credit limit
   */
  async updateCreditLimitAfterInvoice(
    buyerId: string,
    tenantId: string,
    invoiceId: string,
    amount: number,
  ): Promise<CreditLimit | null> {
    this.logger.log(`Updating credit limit for buyer ${buyerId} after invoice ${invoiceId} for amount ${amount}`);
    
    // Get active credit limit
    const activeLimit = await this.creditLimitService.findActiveLimitByBuyer(buyerId, tenantId);
    
    if (!activeLimit) {
      this.logger.log(`No active credit limit found for buyer ${buyerId}`);
      return null;
    }
    
    // Update utilization
    const newUtilization = activeLimit.currentUtilization + amount;
    
    return await this.creditLimitService.updateUtilization(
      activeLimit.id,
      tenantId,
      newUtilization
    );
  }

  /**
   * Update credit limit after payment received
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @param paymentId - Payment ID
   * @param amount - Payment amount
   * @returns Updated credit limit
   */
  async updateCreditLimitAfterPayment(
    buyerId: string,
    tenantId: string,
    paymentId: string,
    amount: number,
  ): Promise<CreditLimit | null> {
    this.logger.log(`Updating credit limit for buyer ${buyerId} after payment ${paymentId} for amount ${amount}`);
    
    // Get active credit limit
    const activeLimit = await this.creditLimitService.findActiveLimitByBuyer(buyerId, tenantId);
    
    if (!activeLimit) {
      this.logger.log(`No active credit limit found for buyer ${buyerId}`);
      return null;
    }
    
    // Update utilization
    const newUtilization = Math.max(0, activeLimit.currentUtilization - amount);
    
    return await this.creditLimitService.updateUtilization(
      activeLimit.id,
      tenantId,
      newUtilization
    );
  }

  /**
   * Get credit limit status for buyer dashboard
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @returns Credit limit status information
   */
  async getCreditLimitStatusForDashboard(
    buyerId: string,
    tenantId: string,
  ): Promise<any> {
    // Get active credit limit
    const activeLimit = await this.creditLimitService.findActiveLimitByBuyer(buyerId, tenantId);
    
    if (!activeLimit) {
      return {
        hasActiveLimit: false,
        buyerId,
      };
    }
    
    // Get latest credit assessment
    const assessment = activeLimit.creditAssessmentId ? 
      await this.creditAssessmentRepository.findOne({
        where: { id: activeLimit.creditAssessmentId, tenantId },
      }) : null;
    
    // Get pending approval requests
    const pendingApprovals = await this.creditLimitApprovalRepository.find({
      where: { 
        creditLimitId: activeLimit.id, 
        tenantId,
        status: 'pending',
      },
    });
    
    // Calculate days until review
    const today = new Date();
    const reviewDate = new Date(activeLimit.reviewDate);
    const daysUntilReview = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate days until expiry if applicable
    let daysUntilExpiry = null;
    if (activeLimit.expiryDate) {
      const expiryDate = new Date(activeLimit.expiryDate);
      daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Calculate temporary increase expiry if applicable
    let temporaryIncreaseExpiryDays = null;
    if (activeLimit.temporaryIncreaseExpiry) {
      const tempExpiryDate = new Date(activeLimit.temporaryIncreaseExpiry);
      temporaryIncreaseExpiryDays = Math.ceil((tempExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return {
      hasActiveLimit: true,
      buyerId,
      creditLimit: activeLimit,
      creditScore: assessment ? assessment.scoreValue : null,
      pendingApprovalCount: pendingApprovals.length,
      daysUntilReview,
      daysUntilExpiry,
      temporaryIncreaseExpiryDays,
      utilizationStatus: this.getUtilizationStatus(activeLimit.utilizationPercentage),
    };
  }

  /**
   * Get utilization status based on percentage
   * @param utilizationPercentage - Utilization percentage
   * @returns Utilization status
   */
  private getUtilizationStatus(utilizationPercentage: number): string {
    if (utilizationPercentage >= 90) {
      return 'critical';
    } else if (utilizationPercentage >= 75) {
      return 'warning';
    } else if (utilizationPercentage >= 50) {
      return 'moderate';
    } else {
      return 'good';
    }
  }
}
