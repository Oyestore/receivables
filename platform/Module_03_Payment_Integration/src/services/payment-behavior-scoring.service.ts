import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentBehaviorScore } from '../entities/payment-behavior-score.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { Customer } from '../../../customers/entities/customer.entity';

/**
 * Service for calculating and managing customer payment behavior scores
 */
@Injectable()
export class PaymentBehaviorScoringService {
  private readonly logger = new Logger(PaymentBehaviorScoringService.name);

  constructor(
    @InjectRepository(PaymentBehaviorScore)
    private readonly behaviorScoreRepository: Repository<PaymentBehaviorScore>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Calculate or update payment behavior score for a customer
   */
  async calculateCustomerScore(
    organizationId: string,
    customerId: string,
  ): Promise<PaymentBehaviorScore> {
    try {
      this.logger.log(`Calculating payment behavior score for customer: ${customerId}`);
      
      // Get existing score or create new one
      let behaviorScore = await this.behaviorScoreRepository.findOne({
        where: { organizationId, customerId },
      });
      
      if (!behaviorScore) {
        behaviorScore = this.behaviorScoreRepository.create({
          organizationId,
          customerId,
        });
      }
      
      // Get customer payment history
      const paymentHistory = await this.getCustomerPaymentHistory(organizationId, customerId);
      
      // Calculate individual score components
      const paymentTimeliness = this.calculatePaymentTimeliness(paymentHistory);
      const paymentConsistency = this.calculatePaymentConsistency(paymentHistory);
      const communicationScore = this.calculateCommunicationScore(paymentHistory);
      const disputeFrequency = this.calculateDisputeFrequency(paymentHistory);
      
      // Calculate overall score (weighted average)
      const overallScore = this.calculateOverallScore({
        paymentTimeliness,
        paymentConsistency,
        communicationScore,
        disputeFrequency,
      });
      
      // Determine risk category
      const riskCategory = this.determineRiskCategory(overallScore);
      
      // Update score history
      const scoreHistory = behaviorScore.scoreHistory || {};
      scoreHistory[new Date().toISOString()] = {
        overallScore,
        paymentTimeliness,
        paymentConsistency,
        communicationScore,
        disputeFrequency,
      };
      
      // Update score factors
      const scoreFactors = this.generateScoreFactors(paymentHistory, {
        paymentTimeliness,
        paymentConsistency,
        communicationScore,
        disputeFrequency,
      });
      
      // Update behavior score
      behaviorScore.overallScore = overallScore;
      behaviorScore.paymentTimeliness = paymentTimeliness;
      behaviorScore.paymentConsistency = paymentConsistency;
      behaviorScore.communicationScore = communicationScore;
      behaviorScore.disputeFrequency = disputeFrequency;
      behaviorScore.totalInvoicesAnalyzed = paymentHistory.invoices.length;
      behaviorScore.totalPaymentsAnalyzed = paymentHistory.payments.length;
      behaviorScore.totalAmountAnalyzed = paymentHistory.totalAmount;
      behaviorScore.averagePaymentDelay = paymentHistory.averagePaymentDelay;
      behaviorScore.scoreFactors = scoreFactors;
      behaviorScore.scoreHistory = scoreHistory;
      behaviorScore.riskCategory = riskCategory;
      behaviorScore.lastScoreUpdate = new Date();
      
      // Save updated score
      const savedScore = await this.behaviorScoreRepository.save(behaviorScore);
      
      // Emit score update event
      this.eventEmitter.emit('payment.behavior.score.updated', savedScore);
      
      return savedScore;
    } catch (error) {
      this.logger.error(`Error calculating payment behavior score: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get customer payment history
   */
  private async getCustomerPaymentHistory(
    organizationId: string,
    customerId: string,
  ): Promise<any> {
    // Get invoices for the customer (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const invoices = await this.invoiceRepository.find({
      where: {
        organizationId,
        customerId,
        createdAt: MoreThan(oneYearAgo),
      },
      order: {
        createdAt: 'DESC',
      },
    });
    
    // Get payments for these invoices
    const invoiceIds = invoices.map(invoice => invoice.id);
    const payments = await this.paymentTransactionRepository.find({
      where: {
        invoiceId: In(invoiceIds),
      },
      order: {
        createdAt: 'DESC',
      },
    });
    
    // Calculate payment statistics
    let totalAmount = 0;
    let totalPaidAmount = 0;
    let totalPaymentDelay = 0;
    let paymentDelayCount = 0;
    let earlyPaymentCount = 0;
    let latePaymentCount = 0;
    let onTimePaymentCount = 0;
    let disputeCount = 0;
    let communicationCount = 0;
    
    for (const invoice of invoices) {
      totalAmount += Number(invoice.totalAmount);
      
      // Find payments for this invoice
      const invoicePayments = payments.filter(payment => payment.invoiceId === invoice.id);
      const totalPaid = invoicePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      
      totalPaidAmount += totalPaid;
      
      // Check payment timing
      if (invoice.dueDate && invoice.paidDate) {
        const dueDate = new Date(invoice.dueDate);
        const paidDate = new Date(invoice.paidDate);
        const paymentDelay = Math.round((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        totalPaymentDelay += paymentDelay;
        paymentDelayCount++;
        
        if (paymentDelay < 0) {
          earlyPaymentCount++;
        } else if (paymentDelay === 0) {
          onTimePaymentCount++;
        } else {
          latePaymentCount++;
        }
      }
      
      // Check for disputes
      if (invoice.metadata && invoice.metadata.disputed) {
        disputeCount++;
      }
      
      // Check for communication
      if (invoice.metadata && invoice.metadata.customerCommunication) {
        communicationCount++;
      }
    }
    
    return {
      invoices,
      payments,
      totalAmount,
      totalPaidAmount,
      averagePaymentDelay: paymentDelayCount > 0 ? totalPaymentDelay / paymentDelayCount : 0,
      earlyPaymentCount,
      onTimePaymentCount,
      latePaymentCount,
      disputeCount,
      communicationCount,
    };
  }

  /**
   * Calculate payment timeliness score (0-100)
   */
  private calculatePaymentTimeliness(paymentHistory: any): number {
    const { earlyPaymentCount, onTimePaymentCount, latePaymentCount, averagePaymentDelay } = paymentHistory;
    const totalPayments = earlyPaymentCount + onTimePaymentCount + latePaymentCount;
    
    if (totalPayments === 0) {
      return 50; // Default score for new customers
    }
    
    // Calculate on-time payment percentage
    const onTimePercentage = ((earlyPaymentCount + onTimePaymentCount) / totalPayments) * 100;
    
    // Calculate delay factor (0-100, where 0 is bad and 100 is good)
    let delayFactor = 100;
    if (averagePaymentDelay > 0) {
      // Exponential penalty for increasing delay
      delayFactor = Math.max(0, 100 - Math.pow(averagePaymentDelay, 1.5));
    }
    
    // Weighted combination of on-time percentage and delay factor
    return (onTimePercentage * 0.7) + (delayFactor * 0.3);
  }

  /**
   * Calculate payment consistency score (0-100)
   */
  private calculatePaymentConsistency(paymentHistory: any): number {
    const { invoices, payments } = paymentHistory;
    
    if (invoices.length < 3) {
      return 50; // Default score for new customers with limited history
    }
    
    // Calculate payment delay standard deviation
    const paymentDelays: number[] = [];
    
    for (const invoice of invoices) {
      if (invoice.dueDate && invoice.paidDate) {
        const dueDate = new Date(invoice.dueDate);
        const paidDate = new Date(invoice.paidDate);
        const paymentDelay = Math.round((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        paymentDelays.push(paymentDelay);
      }
    }
    
    if (paymentDelays.length < 3) {
      return 50;
    }
    
    const mean = paymentDelays.reduce((sum, delay) => sum + delay, 0) / paymentDelays.length;
    const variance = paymentDelays.reduce((sum, delay) => sum + Math.pow(delay - mean, 2), 0) / paymentDelays.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert standard deviation to score (lower deviation = higher score)
    // Scale: 0 days deviation = 100 score, 30+ days deviation = 0 score
    const consistencyScore = Math.max(0, 100 - (standardDeviation * 3.33));
    
    return consistencyScore;
  }

  /**
   * Calculate communication score (0-100)
   */
  private calculateCommunicationScore(paymentHistory: any): number {
    const { invoices, communicationCount, latePaymentCount } = paymentHistory;
    
    if (invoices.length === 0) {
      return 50; // Default score for new customers
    }
    
    // Base communication score on proactive communication
    const communicationPercentage = (communicationCount / invoices.length) * 100;
    
    // Adjust for late payments with communication
    let adjustedScore = communicationPercentage;
    
    if (latePaymentCount > 0) {
      // Check if customer communicated about late payments
      const latePaymentCommunication = invoices.filter(invoice => 
        invoice.metadata && 
        invoice.metadata.customerCommunication && 
        invoice.metadata.customerCommunication.type === 'delay_notification'
      ).length;
      
      const latePaymentCommunicationPercentage = (latePaymentCommunication / latePaymentCount) * 100;
      
      // Weighted combination
      adjustedScore = (communicationPercentage * 0.4) + (latePaymentCommunicationPercentage * 0.6);
    }
    
    return adjustedScore;
  }

  /**
   * Calculate dispute frequency score (0-100)
   */
  private calculateDisputeFrequency(paymentHistory: any): number {
    const { invoices, disputeCount } = paymentHistory;
    
    if (invoices.length === 0) {
      return 50; // Default score for new customers
    }
    
    // Calculate dispute percentage
    const disputePercentage = (disputeCount / invoices.length) * 100;
    
    // Convert to score (lower dispute percentage = higher score)
    // Scale: 0% disputes = 100 score, 50%+ disputes = 0 score
    const disputeScore = Math.max(0, 100 - (disputePercentage * 2));
    
    return disputeScore;
  }

  /**
   * Calculate overall score from component scores
   */
  private calculateOverallScore(scores: {
    paymentTimeliness: number;
    paymentConsistency: number;
    communicationScore: number;
    disputeFrequency: number;
  }): number {
    // Weighted average of component scores
    return (
      (scores.paymentTimeliness * 0.4) +
      (scores.paymentConsistency * 0.3) +
      (scores.communicationScore * 0.15) +
      (scores.disputeFrequency * 0.15)
    );
  }

  /**
   * Determine risk category based on overall score
   */
  private determineRiskCategory(overallScore: number): string {
    if (overallScore >= 90) {
      return 'premium';
    } else if (overallScore >= 75) {
      return 'low_risk';
    } else if (overallScore >= 60) {
      return 'standard';
    } else if (overallScore >= 40) {
      return 'moderate_risk';
    } else if (overallScore >= 20) {
      return 'high_risk';
    } else {
      return 'severe_risk';
    }
  }

  /**
   * Generate score factors for explanation
   */
  private generateScoreFactors(
    paymentHistory: any,
    scores: {
      paymentTimeliness: number;
      paymentConsistency: number;
      communicationScore: number;
      disputeFrequency: number;
    },
  ): Record<string, any> {
    const factors: Record<string, any> = {};
    
    // Payment timeliness factors
    factors.timeliness = {
      score: scores.paymentTimeliness,
      earlyPayments: paymentHistory.earlyPaymentCount,
      onTimePayments: paymentHistory.onTimePaymentCount,
      latePayments: paymentHistory.latePaymentCount,
      averageDelay: paymentHistory.averagePaymentDelay,
      impact: 'high',
    };
    
    // Payment consistency factors
    factors.consistency = {
      score: scores.paymentConsistency,
      paymentPattern: this.determinePaymentPattern(paymentHistory),
      impact: 'medium',
    };
    
    // Communication factors
    factors.communication = {
      score: scores.communicationScore,
      communicationCount: paymentHistory.communicationCount,
      proactiveCommunication: this.calculateProactiveCommunication(paymentHistory),
      impact: 'medium',
    };
    
    // Dispute factors
    factors.disputes = {
      score: scores.disputeFrequency,
      disputeCount: paymentHistory.disputeCount,
      disputePercentage: (paymentHistory.disputeCount / paymentHistory.invoices.length) * 100,
      impact: 'medium',
    };
    
    return factors;
  }

  /**
   * Determine payment pattern description
   */
  private determinePaymentPattern(paymentHistory: any): string {
    const { earlyPaymentCount, onTimePaymentCount, latePaymentCount } = paymentHistory;
    const totalPayments = earlyPaymentCount + onTimePaymentCount + latePaymentCount;
    
    if (totalPayments === 0) {
      return 'insufficient_data';
    }
    
    const earlyPercentage = (earlyPaymentCount / totalPayments) * 100;
    const onTimePercentage = (onTimePaymentCount / totalPayments) * 100;
    const latePercentage = (latePaymentCount / totalPayments) * 100;
    
    if (earlyPercentage >= 50) {
      return 'consistently_early';
    } else if (onTimePercentage >= 50) {
      return 'consistently_on_time';
    } else if (latePercentage >= 50) {
      return 'consistently_late';
    } else {
      return 'inconsistent';
    }
  }

  /**
   * Calculate proactive communication percentage
   */
  private calculateProactiveCommunication(paymentHistory: any): number {
    const { invoices } = paymentHistory;
    
    const proactiveCommunications = invoices.filter(invoice => 
      invoice.metadata && 
      invoice.metadata.customerCommunication && 
      invoice.metadata.customerCommunication.timing === 'proactive'
    ).length;
    
    return invoices.length > 0 ? (proactiveCommunications / invoices.length) * 100 : 0;
  }

  /**
   * Get payment behavior score for a customer
   */
  async getCustomerScore(
    organizationId: string,
    customerId: string,
  ): Promise<PaymentBehaviorScore> {
    try {
      const behaviorScore = await this.behaviorScoreRepository.findOne({
        where: { organizationId, customerId },
      });
      
      if (!behaviorScore) {
        // Calculate new score if none exists
        return this.calculateCustomerScore(organizationId, customerId);
      }
      
      // Check if score needs updating (older than 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      if (!behaviorScore.lastScoreUpdate || behaviorScore.lastScoreUpdate < sevenDaysAgo) {
        return this.calculateCustomerScore(organizationId, customerId);
      }
      
      return behaviorScore;
    
(Content truncated due to size limit. Use line ranges to read in chunks)