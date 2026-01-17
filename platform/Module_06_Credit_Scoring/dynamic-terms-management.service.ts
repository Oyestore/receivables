import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DynamicPaymentTerms } from '../entities/dynamic-payment-terms.entity';
import { PaymentBehaviorScore } from '../entities/payment-behavior-score.entity';
import { PaymentBehaviorScoringService } from './payment-behavior-scoring.service';
import { Customer } from '../../../customers/entities/customer.entity';
import { Organization } from '../../../organizations/entities/organization.entity';

/**
 * Interface for payment terms rule
 */
interface PaymentTermsRule {
  id: string;
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
  riskCategories: string[];
  paymentTermDays: number;
  earlyPaymentDiscountPercentage?: number;
  earlyPaymentDiscountDays?: number;
  latePaymentFeePercentage?: number;
  gracePeriodDays?: number;
  requiresDeposit: boolean;
  depositPercentage?: number;
  allowsInstallments: boolean;
  maxInstallments?: number;
  additionalTerms?: Record<string, any>;
  isActive: boolean;
}

/**
 * Service for managing dynamic payment terms based on customer reputation
 */
@Injectable()
export class DynamicTermsManagementService {
  private readonly logger = new Logger(DynamicTermsManagementService.name);
  private readonly defaultTermsRules: PaymentTermsRule[] = [
    {
      id: 'premium',
      name: 'Premium Terms',
      description: 'Favorable terms for premium customers with excellent payment history',
      minScore: 90,
      maxScore: 100,
      riskCategories: ['premium'],
      paymentTermDays: 45,
      earlyPaymentDiscountPercentage: 2.0,
      earlyPaymentDiscountDays: 10,
      latePaymentFeePercentage: 0,
      gracePeriodDays: 7,
      requiresDeposit: false,
      allowsInstallments: true,
      maxInstallments: 3,
      additionalTerms: {
        prioritySupport: true,
        flexiblePaymentOptions: true,
      },
      isActive: true,
    },
    {
      id: 'low_risk',
      name: 'Preferred Terms',
      description: 'Favorable terms for low-risk customers with good payment history',
      minScore: 75,
      maxScore: 89.99,
      riskCategories: ['low_risk'],
      paymentTermDays: 30,
      earlyPaymentDiscountPercentage: 1.5,
      earlyPaymentDiscountDays: 7,
      latePaymentFeePercentage: 1.0,
      gracePeriodDays: 5,
      requiresDeposit: false,
      allowsInstallments: true,
      maxInstallments: 2,
      additionalTerms: {
        prioritySupport: true,
      },
      isActive: true,
    },
    {
      id: 'standard',
      name: 'Standard Terms',
      description: 'Standard terms for customers with average payment history',
      minScore: 60,
      maxScore: 74.99,
      riskCategories: ['standard'],
      paymentTermDays: 30,
      earlyPaymentDiscountPercentage: 1.0,
      earlyPaymentDiscountDays: 5,
      latePaymentFeePercentage: 1.5,
      gracePeriodDays: 3,
      requiresDeposit: false,
      allowsInstallments: false,
      isActive: true,
    },
    {
      id: 'moderate_risk',
      name: 'Moderate Risk Terms',
      description: 'Cautious terms for customers with moderate payment risk',
      minScore: 40,
      maxScore: 59.99,
      riskCategories: ['moderate_risk'],
      paymentTermDays: 15,
      earlyPaymentDiscountPercentage: 0.5,
      earlyPaymentDiscountDays: 3,
      latePaymentFeePercentage: 2.0,
      gracePeriodDays: 2,
      requiresDeposit: false,
      allowsInstallments: false,
      isActive: true,
    },
    {
      id: 'high_risk',
      name: 'High Risk Terms',
      description: 'Restrictive terms for customers with high payment risk',
      minScore: 20,
      maxScore: 39.99,
      riskCategories: ['high_risk'],
      paymentTermDays: 7,
      latePaymentFeePercentage: 2.5,
      gracePeriodDays: 1,
      requiresDeposit: true,
      depositPercentage: 30,
      allowsInstallments: false,
      isActive: true,
    },
    {
      id: 'severe_risk',
      name: 'Severe Risk Terms',
      description: 'Highly restrictive terms for customers with severe payment risk',
      minScore: 0,
      maxScore: 19.99,
      riskCategories: ['severe_risk'],
      paymentTermDays: 0, // Payment required upfront
      latePaymentFeePercentage: 3.0,
      gracePeriodDays: 0,
      requiresDeposit: true,
      depositPercentage: 100, // Full payment upfront
      allowsInstallments: false,
      isActive: true,
    },
  ];

  constructor(
    @InjectRepository(DynamicPaymentTerms)
    private readonly dynamicTermsRepository: Repository<DynamicPaymentTerms>,
    @InjectRepository(PaymentBehaviorScore)
    private readonly behaviorScoreRepository: Repository<PaymentBehaviorScore>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly behaviorScoringService: PaymentBehaviorScoringService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate or update dynamic payment terms for a customer
   */
  async generateCustomerTerms(
    organizationId: string,
    customerId: string,
    forceUpdate: boolean = false,
  ): Promise<DynamicPaymentTerms> {
    try {
      this.logger.log(`Generating dynamic payment terms for customer: ${customerId}`);
      
      // Get existing terms or create new ones
      let dynamicTerms = await this.dynamicTermsRepository.findOne({
        where: { organizationId, customerId },
      });
      
      // Check if terms need updating
      if (dynamicTerms && !forceUpdate) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (dynamicTerms.lastReviewDate && dynamicTerms.lastReviewDate > thirtyDaysAgo) {
          return dynamicTerms; // Terms are still current
        }
      }
      
      // Get customer behavior score
      const behaviorScore = await this.behaviorScoringService.getCustomerScore(organizationId, customerId);
      
      // Get organization's terms rules
      const termsRules = await this.getOrganizationTermsRules(organizationId);
      
      // Find applicable rule based on score
      const applicableRule = this.findApplicableTermsRule(behaviorScore.overallScore, behaviorScore.riskCategory, termsRules);
      
      if (!applicableRule) {
        throw new Error('No applicable payment terms rule found for customer score');
      }
      
      // Create or update dynamic terms
      if (!dynamicTerms) {
        dynamicTerms = this.dynamicTermsRepository.create({
          organizationId,
          customerId,
          behaviorScoreId: behaviorScore.id,
        });
      }
      
      // Update terms based on rule
      dynamicTerms.paymentTermDays = applicableRule.paymentTermDays;
      dynamicTerms.earlyPaymentDiscountPercentage = applicableRule.earlyPaymentDiscountPercentage;
      dynamicTerms.earlyPaymentDiscountDays = applicableRule.earlyPaymentDiscountDays;
      dynamicTerms.latePaymentFeePercentage = applicableRule.latePaymentFeePercentage;
      dynamicTerms.gracePeriodDays = applicableRule.gracePeriodDays;
      dynamicTerms.requiresDeposit = applicableRule.requiresDeposit;
      dynamicTerms.depositPercentage = applicableRule.depositPercentage;
      dynamicTerms.allowsInstallments = applicableRule.allowsInstallments;
      dynamicTerms.maxInstallments = applicableRule.maxInstallments;
      dynamicTerms.additionalTerms = applicableRule.additionalTerms || {};
      dynamicTerms.termsSource = 'auto';
      dynamicTerms.lastReviewDate = new Date();
      
      // Set next review date (30 days from now)
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + 30);
      dynamicTerms.nextReviewDate = nextReviewDate;
      
      // Save updated terms
      const savedTerms = await this.dynamicTermsRepository.save(dynamicTerms);
      
      // Emit terms update event
      this.eventEmitter.emit('payment.terms.updated', savedTerms);
      
      return savedTerms;
    } catch (error) {
      this.logger.error(`Error generating dynamic payment terms: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get organization's payment terms rules
   */
  private async getOrganizationTermsRules(organizationId: string): Promise<PaymentTermsRule[]> {
    try {
      // In a real implementation, this would fetch custom rules from the database
      // For now, we'll use the default rules
      return this.defaultTermsRules;
    } catch (error) {
      this.logger.error(`Error getting organization terms rules: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find applicable terms rule based on score and risk category
   */
  private findApplicableTermsRule(
    score: number,
    riskCategory: string,
    rules: PaymentTermsRule[],
  ): PaymentTermsRule | null {
    // First try to match by risk category
    const categoryMatch = rules.find(rule => 
      rule.isActive && 
      rule.riskCategories.includes(riskCategory)
    );
    
    if (categoryMatch) {
      return categoryMatch;
    }
    
    // Fall back to score range matching
    return rules.find(rule => 
      rule.isActive && 
      score >= rule.minScore && 
      score <= rule.maxScore
    ) || null;
  }

  /**
   * Get dynamic payment terms for a customer
   */
  async getCustomerTerms(
    organizationId: string,
    customerId: string,
  ): Promise<DynamicPaymentTerms> {
    try {
      const dynamicTerms = await this.dynamicTermsRepository.findOne({
        where: { organizationId, customerId },
        relations: ['behaviorScore'],
      });
      
      if (!dynamicTerms) {
        // Generate new terms if none exist
        return this.generateCustomerTerms(organizationId, customerId);
      }
      
      // Check if terms need updating
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (!dynamicTerms.lastReviewDate || dynamicTerms.lastReviewDate < thirtyDaysAgo) {
        return this.generateCustomerTerms(organizationId, customerId, true);
      }
      
      return dynamicTerms;
    } catch (error) {
      this.logger.error(`Error getting dynamic payment terms: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Override dynamic payment terms for a customer
   */
  async overrideCustomerTerms(
    organizationId: string,
    customerId: string,
    termsOverride: Partial<DynamicPaymentTerms>,
  ): Promise<DynamicPaymentTerms> {
    try {
      this.logger.log(`Overriding dynamic payment terms for customer: ${customerId}`);
      
      // Get existing terms or generate new ones
      let dynamicTerms = await this.dynamicTermsRepository.findOne({
        where: { organizationId, customerId },
      });
      
      if (!dynamicTerms) {
        dynamicTerms = await this.generateCustomerTerms(organizationId, customerId);
      }
      
      // Apply overrides
      if (termsOverride.paymentTermDays !== undefined) {
        dynamicTerms.paymentTermDays = termsOverride.paymentTermDays;
      }
      
      if (termsOverride.earlyPaymentDiscountPercentage !== undefined) {
        dynamicTerms.earlyPaymentDiscountPercentage = termsOverride.earlyPaymentDiscountPercentage;
      }
      
      if (termsOverride.earlyPaymentDiscountDays !== undefined) {
        dynamicTerms.earlyPaymentDiscountDays = termsOverride.earlyPaymentDiscountDays;
      }
      
      if (termsOverride.latePaymentFeePercentage !== undefined) {
        dynamicTerms.latePaymentFeePercentage = termsOverride.latePaymentFeePercentage;
      }
      
      if (termsOverride.gracePeriodDays !== undefined) {
        dynamicTerms.gracePeriodDays = termsOverride.gracePeriodDays;
      }
      
      if (termsOverride.requiresDeposit !== undefined) {
        dynamicTerms.requiresDeposit = termsOverride.requiresDeposit;
      }
      
      if (termsOverride.depositPercentage !== undefined) {
        dynamicTerms.depositPercentage = termsOverride.depositPercentage;
      }
      
      if (termsOverride.allowsInstallments !== undefined) {
        dynamicTerms.allowsInstallments = termsOverride.allowsInstallments;
      }
      
      if (termsOverride.maxInstallments !== undefined) {
        dynamicTerms.maxInstallments = termsOverride.maxInstallments;
      }
      
      if (termsOverride.additionalTerms) {
        dynamicTerms.additionalTerms = {
          ...dynamicTerms.additionalTerms,
          ...termsOverride.additionalTerms,
        };
      }
      
      // Mark as manually overridden
      dynamicTerms.termsSource = 'manual';
      dynamicTerms.lastReviewDate = new Date();
      
      // Set next review date (90 days from now for manual overrides)
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + 90);
      dynamicTerms.nextReviewDate = nextReviewDate;
      
      // Save updated terms
      const savedTerms = await this.dynamicTermsRepository.save(dynamicTerms);
      
      // Emit terms update event
      this.eventEmitter.emit('payment.terms.updated', savedTerms);
      
      return savedTerms;
    } catch (error) {
      this.logger.error(`Error overriding dynamic payment terms: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get dynamic payment terms for all customers in an organization
   */
  async getOrganizationTerms(
    organizationId: string,
  ): Promise<DynamicPaymentTerms[]> {
    try {
      return this.dynamicTermsRepository.find({
        where: { organizationId },
        relations: ['behaviorScore', 'customer'],
        order: { lastReviewDate: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error getting organization dynamic payment terms: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get dynamic payment terms by risk category
   */
  async getTermsByRiskCategory(
    organizationId: string,
    riskCategory: string,
  ): Promise<DynamicPaymentTerms[]> {
    try {
      // Get behavior scores for the risk category
      const behaviorScores = await this.behaviorScoreRepository.find({
        where: { organizationId, riskCategory },
      });
      
      const behaviorScoreIds = behaviorScores.map(score => score.id);
      
      // Get terms for these behavior scores
      return this.dynamicTermsRepository.find({
        where: { behaviorScoreId: In(behaviorScoreIds) },
        relations: ['behaviorScore', 'customer'],
        order: { lastReviewDate: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error getting dynamic payment terms by risk category: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get terms distribution for an organization
   */
  async getTermsDistribution(
    organizationId: string,
  ): Promise<Record<string, any>> {
    try {
      const terms = await this.dynamicTermsRepository.find({
        where: { organizationId },
        relations: ['behaviorScore'],
      });
      
      // Initialize distribution buckets
      const paymentTermsDistribution: Record<string, number> = {
        'upfront': 0,
        '1-7_days': 0,
        '8-15_days': 0,
        '16-30_days': 0,
        '31-45_days': 0,
        '46+_days': 0,
      };
      
      // Count terms in each bucket
      for (const term of terms) {
        const days = term.paymentTermDays;
        
        if (days === 0) {
          paymentTermsDistribution['upfront']++;
        } else if (days <= 7) {
          paymentTermsDistribution['1-7_days']++;
        } else if (days <= 15) {
          paymentTermsDistribution['8-15_days']++;
        } else if (days <= 30) {
          paymentTermsDistribution['16-30_days']++;
        } else if (days <= 45) {
          paymentTermsDistributio
(Content truncated due to size limit. Use line ranges to read in chunks)