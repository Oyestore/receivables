import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { RiskAssessment, RiskAssessmentType, RiskAssessmentMethod, RiskAssessmentStatus } from '../entities/risk-assessment.entity';
import { BuyerProfile } from '../entities/buyer-profile.entity';
import { CreditAssessment } from '../entities/credit-assessment.entity';
import { RiskRule } from '../entities/risk-rule.entity';
import { RiskAlert } from '../entities/risk-alert.entity';
import { RiskLevel } from '../enums/risk-level.enum';
import { CreateRiskAssessmentDto } from '../dto/risk-assessment.dto';
import { UpdateRiskAssessmentDto } from '../dto/risk-assessment.dto';

@Injectable()
export class RiskAssessmentService {
  private readonly logger = new Logger(RiskAssessmentService.name);

  constructor(
    @InjectRepository(RiskAssessment)
    private readonly riskAssessmentRepository: Repository<RiskAssessment>,
    @InjectRepository(BuyerProfile)
    private readonly buyerProfileRepository: Repository<BuyerProfile>,
    @InjectRepository(CreditAssessment)
    private readonly creditAssessmentRepository: Repository<CreditAssessment>,
    @InjectRepository(RiskRule)
    private readonly riskRuleRepository: Repository<RiskRule>,
    @InjectRepository(RiskAlert)
    private readonly riskAlertRepository: Repository<RiskAlert>,
  ) {}

  async create(createRiskAssessmentDto: CreateRiskAssessmentDto): Promise<RiskAssessment> {
    this.logger.log(`Creating risk assessment for buyer: ${createRiskAssessmentDto.buyerId}`);

    // Validate buyer exists
    const buyer = await this.buyerProfileRepository.findOne({
      where: { id: createRiskAssessmentDto.buyerId }
    });

    if (!buyer) {
      throw new NotFoundException(`Buyer with ID ${createRiskAssessmentDto.buyerId} not found`);
    }

    // Create risk assessment
    const riskAssessment = this.riskAssessmentRepository.create({
      ...createRiskAssessmentDto,
      assessmentDate: new Date(),
      status: RiskAssessmentStatus.PENDING,
      buyer: buyer
    });

    const savedAssessment = await this.riskAssessmentRepository.save(riskAssessment);

    // Trigger automated assessment if method is automated
    if (createRiskAssessmentDto.assessmentMethod === RiskAssessmentMethod.AUTOMATED) {
      await this.performAutomatedAssessment(savedAssessment.id);
    }

    return savedAssessment;
  }

  async findAll(filters: {
    buyerId?: string;
    assessmentType?: RiskAssessmentType;
    status?: RiskAssessmentStatus;
    riskLevel?: RiskLevel;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{ assessments: RiskAssessment[]; total: number }> {
    const { page = 1, limit = 10, ...whereFilters } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (whereFilters.buyerId) {
      where.buyerId = whereFilters.buyerId;
    }

    if (whereFilters.assessmentType) {
      where.assessmentType = whereFilters.assessmentType;
    }

    if (whereFilters.status) {
      where.status = whereFilters.status;
    }

    if (whereFilters.riskLevel) {
      where.overallRiskLevel = whereFilters.riskLevel;
    }

    if (whereFilters.dateFrom || whereFilters.dateTo) {
      where.assessmentDate = {};
      if (whereFilters.dateFrom) {
        where.assessmentDate = MoreThan(whereFilters.dateFrom);
      }
      if (whereFilters.dateTo) {
        where.assessmentDate = where.assessmentDate ? 
          Between(whereFilters.dateFrom, whereFilters.dateTo) : 
          LessThan(whereFilters.dateTo);
      }
    }

    const [assessments, total] = await this.riskAssessmentRepository.findAndCount({
      where,
      relations: ['buyer', 'creditAssessments'],
      order: { assessmentDate: 'DESC' },
      skip,
      take: limit
    });

    return { assessments, total };
  }

  async findOne(id: string): Promise<RiskAssessment> {
    const assessment = await this.riskAssessmentRepository.findOne({
      where: { id },
      relations: ['buyer', 'creditAssessments', 'riskFactors']
    });

    if (!assessment) {
      throw new NotFoundException(`Risk assessment with ID ${id} not found`);
    }

    return assessment;
  }

  async update(id: string, updateRiskAssessmentDto: UpdateRiskAssessmentDto): Promise<RiskAssessment> {
    const assessment = await this.findOne(id);

    Object.assign(assessment, updateRiskAssessmentDto);
    assessment.updatedAt = new Date();

    return await this.riskAssessmentRepository.save(assessment);
  }

  async remove(id: string): Promise<void> {
    const assessment = await this.findOne(id);
    await this.riskAssessmentRepository.remove(assessment);
  }

  async performAutomatedAssessment(assessmentId: string): Promise<RiskAssessment> {
    this.logger.log(`Performing automated assessment for: ${assessmentId}`);

    const assessment = await this.findOne(assessmentId);
    
    if (assessment.status !== RiskAssessmentStatus.PENDING) {
      throw new BadRequestException(`Assessment ${assessmentId} is not in pending status`);
    }

    assessment.status = RiskAssessmentStatus.IN_PROGRESS;
    await this.riskAssessmentRepository.save(assessment);

    try {
      // Step 1: Gather data from various sources
      const assessmentData = await this.gatherAssessmentData(assessment.buyerId);

      // Step 2: Apply risk rules
      const ruleResults = await this.applyRiskRules(assessmentData);

      // Step 3: Calculate risk scores
      const riskScores = await this.calculateRiskScores(assessmentData, ruleResults);

      // Step 4: Determine overall risk level
      const overallRiskLevel = this.determineOverallRiskLevel(riskScores);

      // Step 5: Generate recommendations
      const recommendations = await this.generateRecommendations(assessmentData, riskScores);

      // Update assessment with results
      assessment.overallRiskLevel = overallRiskLevel.level;
      assessment.overallRiskScore = overallRiskLevel.score;
      assessment.riskFactors = riskScores.factors;
      assessment.recommendations = recommendations;
      assessment.status = RiskAssessmentStatus.COMPLETED;
      assessment.assessmentSummary = this.generateAssessmentSummary(riskScores, overallRiskLevel);

      const completedAssessment = await this.riskAssessmentRepository.save(assessment);

      // Step 6: Create alerts if needed
      if (overallRiskLevel.level === RiskLevel.HIGH || 
          overallRiskLevel.level === RiskLevel.VERY_HIGH || 
          overallRiskLevel.level === RiskLevel.EXTREME) {
        await this.createRiskAlert(assessment.buyerId, overallRiskLevel.level, assessment.id);
      }

      this.logger.log(`Automated assessment completed for: ${assessmentId}`);
      return completedAssessment;

    } catch (error) {
      assessment.status = RiskAssessmentStatus.REJECTED;
      assessment.assessmentSummary = `Assessment failed: ${error.message}`;
      await this.riskAssessmentRepository.save(assessment);
      
      this.logger.error(`Automated assessment failed for ${assessmentId}:`, error);
      throw error;
    }
  }

  private async gatherAssessmentData(buyerId: string): Promise<any> {
    // Get buyer profile
    const buyer = await this.buyerProfileRepository.findOne({
      where: { id: buyerId },
      relations: ['paymentHistory', 'financialDocuments']
    });

    if (!buyer) {
      throw new NotFoundException(`Buyer with ID ${buyerId} not found`);
    }

    // Get latest credit assessments
    const creditAssessments = await this.creditAssessmentRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
      take: 5
    });

    // Get previous risk assessments
    const previousRiskAssessments = await this.riskAssessmentRepository.find({
      where: { buyerId },
      order: { assessmentDate: 'DESC' },
      take: 3
    });

    return {
      buyer,
      creditAssessments,
      previousRiskAssessments,
      currentData: {
        date: new Date(),
        economicIndicators: await this.getEconomicIndicators(),
        industryTrends: await this.getIndustryTrends(buyer.industry)
      }
    };
  }

  private async applyRiskRules(assessmentData: any): Promise<any[]> {
    const applicableRules = await this.riskRuleRepository.find({
      where: { 
        status: 'ACTIVE',
        category: 'CREDIT_SCORING'
      }
    });

    const ruleResults = [];

    for (const rule of applicableRules) {
      try {
        const result = await this.evaluateRule(rule, assessmentData);
        ruleResults.push({
          ruleId: rule.id,
          ruleName: rule.name,
          result: result.passed,
          score: result.score,
          impact: result.impact,
          details: result.details
        });
      } catch (error) {
        this.logger.warn(`Failed to evaluate rule ${rule.id}:`, error.message);
      }
    }

    return ruleResults;
  }

  private async evaluateRule(rule: RiskRule, assessmentData: any): Promise<any> {
    // Simplified rule evaluation logic
    // In a real implementation, this would be more sophisticated
    const { conditions } = rule;
    let passed = true;
    let score = 0;
    const details = [];

    for (const condition of conditions) {
      const { field, operator, value } = condition;
      const fieldValue = this.getFieldValue(assessmentData, field);

      let conditionPassed = false;
      
      switch (operator) {
        case 'GREATER_THAN':
          conditionPassed = fieldValue > value;
          break;
        case 'LESS_THAN':
          conditionPassed = fieldValue < value;
          break;
        case 'EQUALS':
          conditionPassed = fieldValue === value;
          break;
        case 'IN':
          conditionPassed = value.includes(fieldValue);
          break;
        default:
          conditionPassed = false;
      }

      if (!conditionPassed) {
        passed = false;
      }

      score += conditionPassed ? (condition.weight || 1.0) : 0;
      details.push({
        field,
        operator,
        value,
        fieldValue,
        passed: conditionPassed
      });
    }

    return {
      passed,
      score: score / conditions.length,
      impact: passed ? 'positive' : 'negative',
      details
    };
  }

  private getFieldValue(data: any, field: string): any {
    // Navigate nested object properties
    const parts = field.split('.');
    let value = data;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return value;
  }

  private async calculateRiskScores(assessmentData: any, ruleResults: any[]): Promise<any> {
    const factors = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Payment History Factor (30% weight)
    const paymentHistoryScore = this.calculatePaymentHistoryScore(assessmentData.creditAssessments);
    factors.push({
      factor: 'PAYMENT_HISTORY',
      weight: 0.3,
      score: paymentHistoryScore,
      impact: paymentHistoryScore > 0.7 ? 'positive' : paymentHistoryScore > 0.5 ? 'medium' : 'negative',
      description: 'Analysis of historical payment behavior'
    });
    totalScore += paymentHistoryScore * 0.3;
    totalWeight += 0.3;

    // Financial Health Factor (25% weight)
    const financialHealthScore = this.calculateFinancialHealthScore(assessmentData.buyer);
    factors.push({
      factor: 'FINANCIAL_HEALTH',
      weight: 0.25,
      score: financialHealthScore,
      impact: financialHealthScore > 0.7 ? 'positive' : financialHealthScore > 0.5 ? 'medium' : 'negative',
      description: 'Current financial stability and ratios'
    });
    totalScore += financialHealthScore * 0.25;
    totalWeight += 0.25;

    // Industry Risk Factor (20% weight)
    const industryRiskScore = await this.calculateIndustryRiskScore(assessmentData.buyer.industry);
    factors.push({
      factor: 'INDUSTRY_RISK',
      weight: 0.2,
      score: industryRiskScore,
      impact: industryRiskScore > 0.7 ? 'positive' : industryRiskScore > 0.5 ? 'medium' : 'negative',
      description: 'Industry-specific risk factors'
    });
    totalScore += industryRiskScore * 0.2;
    totalWeight += 0.2;

    // Business Stability Factor (15% weight)
    const businessStabilityScore = this.calculateBusinessStabilityScore(assessmentData.buyer);
    factors.push({
      factor: 'BUSINESS_STABILITY',
      weight: 0.15,
      score: businessStabilityScore,
      impact: businessStabilityScore > 0.7 ? 'positive' : businessStabilityScore > 0.5 ? 'medium' : 'negative',
      description: 'Business age and operational stability'
    });
    totalScore += businessStabilityScore * 0.15;
    totalWeight += 0.15;

    // Rule-based Factor (10% weight)
    const ruleScore = ruleResults.reduce((sum, result) => sum + result.score, 0) / ruleResults.length;
    factors.push({
      factor: 'RULE_BASED',
      weight: 0.1,
      score: ruleScore,
      impact: ruleScore > 0.7 ? 'positive' : ruleScore > 0.5 ? 'medium' : 'negative',
      description: 'Automated rule evaluation results'
    });
    totalScore += ruleScore * 0.1;
    totalWeight += 0.1;

    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      factors,
      overallScore,
      breakdown: {
        paymentHistory: paymentHistoryScore,
        financialHealth: financialHealthScore,
        industryRisk: industryRiskScore,
        businessStability: businessStabilityScore,
        ruleBased: ruleScore
      }
    };
  }

  private calculatePaymentHistoryScore(creditAssessments: CreditAssessment[]): number {
    if (!creditAssessments || creditAssessments.length === 0) {
      return 0.5; // Neutral score if no history
    }

    const recentAssessments = creditAssessments.slice(0, 3); // Last 3 assessments
    let totalScore = 0;

    for (const assessment of recentAssessments) {
      // Score based on payment behavior and risk level
      let score = 0.5; // Base score

      if (assessment.riskLevel === RiskLevel.VERY_LOW || assessment.riskLevel === RiskLevel.LOW) {
        score += 0.3;
      } else if (assessment.riskLevel === RiskLevel.HIGH || assessment.riskLevel === RiskLevel.VERY_HIGH) {
        score -= 0.2;
      } else if (assessment.riskLevel === RiskLevel.EXTREME) {
        score -= 0.4;
      }

      totalScore += Math.max(0, Math.min(1, score));
    }

    return totalScore / recentAssessments.length;
  }

  private calculateFinancialHealthScore(buyer: BuyerProfile): number {
    let score = 0.5; // Base score

    // Business age factor
    if (buyer.businessAge && buyer.businessAge > 5) {
      score += 0.2;
    } else if (buyer.businessAge && buyer.businessAge > 2) {
      score += 0.1;
    }

    // Revenue stability (simplified)
    if (buyer.annualRevenue && buyer.annualRevenue > 10000000) { // > 1 crore
      score += 0.2;
    } else if (buyer.annualRevenue && buyer.annualRevenue > 1000000) { // > 10 lakh
      score += 0.1;
    }

    // Employee count
    if (buyer.employeeCount && buyer.employeeCount > 50) {
      score += 0.1;
    } else if (buyer.employeeCount && buyer.employeeCount > 10) {
      score += 0.05;
    }

    return Math.max(0, Math.min(1, score));
  }

  private async calculateIndustryRiskScore(industry: string): Promise<number> {
    // Simplified industry risk scoring
    // In a real implementation, this would use industry-specific data
    const industryRiskMap: Record<string, number> = {
      'technology': 0.8,
      'manufacturing': 0.7,
      'retail': 0.6,
      'construction': 0.5,
      'services': 0.7,
      'healthcare': 0.8,
      'education': 0.7,
      'finance': 0.6,
      'agriculture': 0.4,
      'transportation': 0.6
    };

    return industryRiskMap[industry.toLowerCase()] || 0.5;
  }

  private calculateBusinessStabilityScore(buyer: BuyerProfile): number {
    let score = 0.5; // Base score

    // Business age
    if (buyer.businessAge && buyer.businessAge > 10) {
      score += 0.3;
    } else if (buyer.businessAge && buyer.businessAge > 5) {
      score += 0.2;
    } else if (buyer.businessAge && buyer.businessAge > 2) {
      score += 0.1;
    }

    // Legal structure
    if (buyer.legalStructure === 'PRIVATE_LIMITED' || buyer.legalStructure === 'PUBLIC_LIMITED') {
      score += 0.1;
    }

    // GST registration (Indian context)
    if (buyer.gstRegistered) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  private determineOverallRiskLevel(riskScores: any): { level: RiskLevel; score: number } {
    const score = riskScores.overallScore;

    let level: RiskLevel;
    if (score >= 0.85) {
      level = RiskLevel.VERY_LOW;
    } else if (score >= 0.7) {
      level = RiskLevel.LOW;
    } else if (score >= 0.5) {
      level = RiskLevel.MEDIUM;
    } else if (score >= 0.3) {
      level = RiskLevel.HIGH;
    } else if (score >= 0.15) {
      level = RiskLevel.VERY_HIGH;
    } else {
      level = RiskLevel.EXTREME;
    }

    return { level, score };
  }

  private async generateRecommendations(assessmentData: any, riskScores: any): Promise<any[]> {
    const recommendations = [];
    const { factors } = riskScores;

    for (const factor of factors) {
      if (factor.score < 0.5) {
        switch (factor.factor) {
          case 'PAYMENT_HISTORY':
            recommendations.push({
              recommendation: 'Implement stricter payment terms and monitor payment patterns closely',
              priority: 'high',
              category: 'immediate',
              estimatedImpact: 'Reduce payment defaults by 30%',
              implementationCost: 'low'
            });
            break;

          case 'FINANCIAL_HEALTH':
            recommendations.push({
              recommendation: 'Request recent financial statements and cash flow projections',
              priority: 'medium',
              category: 'short_term',
              estimatedImpact: 'Improve financial visibility',
              implementationCost: 'medium'
            });
            break;

          case 'INDUSTRY_RISK':
            recommendations.push({
              recommendation: 'Consider industry-specific risk mitigation strategies',
              priority: 'medium',
              category: 'short_term',
              estimatedImpact: 'Reduce industry-specific exposure',
              implementationCost: 'medium'
            });
            break;

          case 'BUSINESS_STABILITY':
            recommendations.push({
              recommendation: 'Verify business registration and operational continuity',
              priority: 'medium',
              category: 'immediate',
              estimatedImpact: 'Ensure business legitimacy',
              implementationCost: 'low'
            });
            break;
        }
      }
    }

    return recommendations;
  }

  private generateAssessmentSummary(riskScores: any, overallRiskLevel: any): string {
    const { breakdown } = riskScores;
    const { level } = overallRiskLevel;

    let summary = `Risk assessment completed with overall risk level: ${level}. `;
    
    summary += `Key factors - Payment History: ${(breakdown.paymentHistory * 100).toFixed(1)}%, `;
    summary += `Financial Health: ${(breakdown.financialHealth * 100).toFixed(1)}%, `;
    summary += `Industry Risk: ${(breakdown.industryRisk * 100).toFixed(1)}%, `;
    summary += `Business Stability: ${(breakdown.businessStability * 100).toFixed(1)}%.`;

    return summary;
  }

  private async createRiskAlert(buyerId: string, riskLevel: RiskLevel, assessmentId: string): Promise<void> {
    const alert = this.riskAlertRepository.create({
      buyerId,
      alertType: 'RISK_ASSESSMENT',
      severity: riskLevel === RiskLevel.EXTREME ? 'critical' : 
               riskLevel === RiskLevel.VERY_HIGH ? 'high' : 'medium',
      message: `High risk level (${riskLevel}) detected in recent assessment`,
      assessmentId,
      isActive: true,
      requiresAction: true
    });

    await this.riskAlertRepository.save(alert);
    this.logger.log(`Risk alert created for buyer ${buyerId} with level ${riskLevel}`);
  }

  private async getEconomicIndicators(): Promise<any> {
    // Mock economic indicators - in real implementation, would fetch from economic data API
    return {
      gdpGrowth: 0.06,
      inflationRate: 0.04,
      interestRate: 0.065,
      exchangeRate: 83.5,
      businessConfidence: 0.62
    };
  }

  private async getIndustryTrends(industry: string): Promise<any> {
    // Mock industry trends - in real implementation, would fetch from industry data API
    return {
      growthRate: 0.08,
      profitability: 0.12,
      riskIndex: 0.45,
      outlook: 'positive'
    };
  }

  async getRiskStatistics(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const where: any = {};
    
    if (dateFrom || dateTo) {
      where.assessmentDate = {};
      if (dateFrom) where.assessmentDate = MoreThan(dateFrom);
      if (dateTo) {
        where.assessmentDate = where.assessmentDate ? 
          Between(dateFrom, dateTo) : 
          LessThan(dateTo);
      }
    }

    const assessments = await this.riskAssessmentRepository.find({ where });

    const statistics = {
      total: assessments.length,
      byRiskLevel: {},
      byAssessmentType: {},
      byStatus: {},
      averageRiskScore: 0,
      completionRate: 0
    };

    let totalRiskScore = 0;
    let completedCount = 0;

    for (const assessment of assessments) {
      // Count by risk level
      const riskLevel = assessment.overallRiskLevel || 'UNKNOWN';
      statistics.byRiskLevel[riskLevel] = (statistics.byRiskLevel[riskLevel] || 0) + 1;

      // Count by assessment type
      const type = assessment.assessmentType;
      statistics.byAssessmentType[type] = (statistics.byAssessmentType[type] || 0) + 1;

      // Count by status
      const status = assessment.status;
      statistics.byStatus[status] = (statistics.byStatus[status] || 0) + 1;

      // Calculate average risk score
      if (assessment.overallRiskScore) {
        totalRiskScore += assessment.overallRiskScore;
      }

      // Count completed assessments
      if (assessment.status === RiskAssessmentStatus.COMPLETED) {
        completedCount++;
      }
    }

    statistics.averageRiskScore = assessments.length > 0 ? totalRiskScore / assessments.length : 0;
    statistics.completionRate = assessments.length > 0 ? (completedCount / assessments.length) * 100 : 0;

    return statistics;
  }

  async batchAssess(buyerIds: string[]): Promise<RiskAssessment[]> {
    const results = [];

    for (const buyerId of buyerIds) {
      try {
        const assessment = await this.create({
          buyerId,
          assessmentType: RiskAssessmentType.CREDIT_RISK,
          assessmentMethod: RiskAssessmentMethod.AUTOMATED,
          createdBy: 'batch_process'
        });

        results.push(assessment);
      } catch (error) {
        this.logger.error(`Failed to create assessment for buyer ${buyerId}:`, error);
      }
    }

    return results;
  }
}
