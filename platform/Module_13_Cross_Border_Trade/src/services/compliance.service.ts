import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeCompliance } from '../entities/trade-compliance.entity';

export enum ComplianceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUIRE_ADDITIONAL_INFO = 'require_additional_info',
  UNDER_REVIEW = 'under_review',
  EXPIRED = 'expired',
}

export enum ComplianceType {
  IMPORT_LICENSE = 'import_license',
  EXPORT_LICENSE = 'export_license',
  SANCTIONS_CHECK = 'sanctions_check',
  EMBARGO_CHECK = 'embargo_check',
  DUAL_USE_CHECK = 'dual_use_check',
  ANTI_MONEY_LAUNDERING = 'anti_money_laundering',
  KNOW_YOUR_CUSTOMER = 'know_your_customer',
  TRADE_RESTRICTIONS = 'trade_restrictions',
  UAE_VAT = 'uae_vat',
  UAE_CUSTOMS = 'uae_customs',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ComplianceCheckRequest {
  entityType: 'individual' | 'company' | 'transaction' | 'shipment';
  entityId: string;
  complianceType: ComplianceType;
  entityData: {
    name?: string;
    registrationNumber?: string;
    taxId?: string;
    country?: string;
    address?: string;
    industry?: string;
    transactionAmount?: number;
    currency?: string;
    counterparties?: Array<{
      name: string;
      country: string;
      registrationNumber?: string;
    }>;
    goodsDescription?: string;
    hsCode?: string;
    originCountry?: string;
    destinationCountry?: string;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedBy: string;
  dueDate?: Date;
  metadata?: Record<string, any>;
}

export interface ComplianceCheckResult {
  status: ComplianceStatus;
  riskLevel: RiskLevel;
  score: number;
  findings: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
    evidence?: string[];
  }>;
  restrictions: Array<{
    type: string;
    description: string;
    conditions?: string[];
    expiryDate?: Date;
  }>;
  approvedAmount?: number;
  conditions?: string[];
  nextReviewDate?: Date;
  checkedBy: string;
  checkedAt: Date;
  notes?: string;
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(TradeCompliance)
    private complianceRepo: Repository<TradeCompliance>,
  ) {}

  /**
   * Create a new compliance check
   */
  async createComplianceCheck(request: ComplianceCheckRequest): Promise<TradeCompliance> {
    this.logger.log(`Creating compliance check for ${request.entityType} ${request.entityId}`);

    try {
      const complianceCheck = this.complianceRepo.create({
        ...request,
        status: ComplianceStatus.PENDING,
        riskLevel: RiskLevel.LOW,
        score: 0,
        findings: [],
        restrictions: [],
        checkedAt: new Date(),
      });

      return await this.complianceRepo.save(complianceCheck);
    } catch (error: any) {
      this.logger.error(`Error creating compliance check: ${error.message}`);
      throw new BadRequestException(`Failed to create compliance check: ${error.message}`);
    }
  }

  /**
   * Get compliance check by ID
   */
  async getComplianceCheck(id: string): Promise<TradeCompliance> {
    const complianceCheck = await this.complianceRepo.findOne({ where: { id } });

    if (!complianceCheck) {
      throw new NotFoundException(`Compliance check with ID ${id} not found`);
    }

    return complianceCheck;
  }

  /**
   * Perform compliance check
   */
  async performComplianceCheck(id: string, checkedBy: string): Promise<TradeCompliance> {
    this.logger.log(`Performing compliance check ${id}`);

    const complianceCheck = await this.getComplianceCheck(id);

    if (complianceCheck.status !== ComplianceStatus.PENDING) {
      throw new BadRequestException(`Compliance check must be in PENDING status. Current status: ${complianceCheck.status}`);
    }

    // Perform the actual compliance check based on type
    const result = await this.runComplianceCheck(complianceCheck);

    complianceCheck.status = result.status;
    complianceCheck.riskLevel = result.riskLevel;
    complianceCheck.score = result.score;
    complianceCheck.findings = result.findings;
    complianceCheck.restrictions = result.restrictions;
    complianceCheck.approvedAmount = result.approvedAmount;
    complianceCheck.conditions = result.conditions;
    complianceCheck.nextReviewDate = result.nextReviewDate;
    complianceCheck.checkedBy = checkedBy;
    complianceCheck.checkedAt = new Date();
    complianceCheck.notes = result.notes;

    return await this.complianceRepo.save(complianceCheck);
  }

  /**
   * Update compliance check status
   */
  async updateComplianceCheck(id: string, status: ComplianceStatus, notes?: string, updatedBy?: string): Promise<TradeCompliance> {
    this.logger.log(`Updating compliance check ${id} to status ${status}`);

    const complianceCheck = await this.getComplianceCheck(id);

    complianceCheck.status = status;
    if (notes) complianceCheck.notes = notes;
    if (updatedBy) complianceCheck.updatedBy = updatedBy;

    return await this.complianceRepo.save(complianceCheck);
  }

  /**
   * Get compliance checks by entity
   */
  async getComplianceChecksByEntity(entityType: string, entityId: string, status?: ComplianceStatus): Promise<TradeCompliance[]> {
    const where: any = { entityType, entityId };
    if (status) {
      where.status = status;
    }

    return await this.complianceRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get compliance checks by type
   */
  async getComplianceChecksByType(complianceType: ComplianceType, status?: ComplianceStatus): Promise<TradeCompliance[]> {
    const where: any = { complianceType };
    if (status) {
      where.status = status;
    }

    return await this.complianceRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get pending compliance checks
   */
  async getPendingComplianceChecks(): Promise<TradeCompliance[]> {
    return await this.complianceRepo.find({
      where: { status: ComplianceStatus.PENDING },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Get overdue compliance checks
   */
  async getOverdueComplianceChecks(): Promise<TradeCompliance[]> {
    const now = new Date();
    
    return await this.complianceRepo
      .createQueryBuilder('compliance')
      .where('compliance.dueDate < :now', { now })
      .andWhere('compliance.status IN (:...statuses)', { 
        statuses: [ComplianceStatus.PENDING, ComplianceStatus.UNDER_REVIEW, ComplianceStatus.REQUIRE_ADDITIONAL_INFO] 
      })
      .orderBy('compliance.dueDate', 'ASC')
      .getMany();
  }

  /**
   * Get compliance analytics
   */
  async getComplianceAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.complianceRepo.createQueryBuilder('compliance');

    if (startDate && endDate) {
      query.where('compliance.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const checks = await query.getMany();

    const analytics = {
      totalChecks: checks.length,
      statusDistribution: {
        pending: checks.filter(c => c.status === ComplianceStatus.PENDING).length,
        approved: checks.filter(c => c.status === ComplianceStatus.APPROVED).length,
        rejected: checks.filter(c => c.status === ComplianceStatus.REJECTED).length,
        requireAdditionalInfo: checks.filter(c => c.status === ComplianceStatus.REQUIRE_ADDITIONAL_INFO).length,
        underReview: checks.filter(c => c.status === ComplianceStatus.UNDER_REVIEW).length,
        expired: checks.filter(c => c.status === ComplianceStatus.EXPIRED).length,
      },
      typeDistribution: checks.reduce((acc: any, c) => {
        acc[c.complianceType] = (acc[c.complianceType] || 0) + 1;
        return acc;
      }, {}),
      riskLevelDistribution: {
        low: checks.filter(c => c.riskLevel === RiskLevel.LOW).length,
        medium: checks.filter(c => c.riskLevel === RiskLevel.MEDIUM).length,
        high: checks.filter(c => c.riskLevel === RiskLevel.HIGH).length,
        critical: checks.filter(c => c.riskLevel === RiskLevel.CRITICAL).length,
      },
      averageScore: checks.length > 0 ? checks.reduce((sum, c) => sum + c.score, 0) / checks.length : 0,
      approvalRate: checks.length > 0 ? (checks.filter(c => c.status === ComplianceStatus.APPROVED).length / checks.length) * 100 : 0,
      rejectionRate: checks.length > 0 ? (checks.filter(c => c.status === ComplianceStatus.REJECTED).length / checks.length) * 100 : 0,
      averageProcessingTime: this.calculateAverageProcessingTime(checks),
    };

    return analytics;
  }

  /**
   * Get compliance performance metrics
   */
  async getComplianceMetrics(): Promise<any> {
    const checks = await this.complianceRepo.find();

    const metrics = {
      totalChecks: checks.length,
      approvedChecks: checks.filter(c => c.status === ComplianceStatus.APPROVED).length,
      rejectedChecks: checks.filter(c => c.status === ComplianceStatus.REJECTED).length,
      pendingChecks: checks.filter(c => c.status === ComplianceStatus.PENDING).length,
      highRiskChecks: checks.filter(c => c.riskLevel === RiskLevel.HIGH || c.riskLevel === RiskLevel.CRITICAL).length,
      averageScore: checks.length > 0 ? checks.reduce((sum, c) => sum + c.score, 0) / checks.length : 0,
      approvalRate: checks.length > 0 ? (checks.filter(c => c.status === ComplianceStatus.APPROVED).length / checks.length) * 100 : 0,
      mostCommonTypes: this.getMostCommonComplianceTypes(checks),
      countriesWithRestrictions: this.getCountriesWithRestrictions(checks),
    };

    return metrics;
  }

  /**
   * Private helper methods
   */

  private async runComplianceCheck(complianceCheck: TradeCompliance): Promise<ComplianceCheckResult> {
    // Simulate compliance checking logic based on type
    switch (complianceCheck.complianceType) {
      case ComplianceType.SANCTIONS_CHECK:
        return this.performSanctionsCheck(complianceCheck);
      case ComplianceType.EMBARGO_CHECK:
        return this.performEmbargoCheck(complianceCheck);
      case ComplianceType.ANTI_MONEY_LAUNDERING:
        return this.performAMLCheck(complianceCheck);
      case ComplianceType.KNOW_YOUR_CUSTOMER:
        return this.performKYCCheck(complianceCheck);
      case ComplianceType.UAE_VAT:
        return this.performUAEVATCheck(complianceCheck);
      case ComplianceType.UAE_CUSTOMS:
        return this.performUAECustomsCheck(complianceCheck);
      default:
        return this.performGenericCheck(complianceCheck);
    }
  }

  private performSanctionsCheck(complianceCheck: TradeCompliance): ComplianceCheckResult {
    // Simulate sanctions list checking
    const entityData = complianceCheck.entityData;
    const riskCountries = ['IR', 'KP', 'SY', 'RU', 'BY'];
    const isHighRisk = riskCountries.includes(entityData.country || '');
    const hasHighRiskCounterparties = entityData.counterparties?.some(cp => riskCountries.includes(cp.country)) || false;

    const riskLevel = isHighRisk || hasHighRiskCounterparties ? RiskLevel.HIGH : RiskLevel.LOW;
    const score = isHighRisk ? 20 : 85;

    const findings = [];
    if (isHighRisk) {
      findings.push({
        type: 'sanctions_risk',
        severity: 'high' as const,
        description: `Entity located in high-risk country: ${entityData.country}`,
        recommendation: 'Enhanced due diligence required',
      });
    }

    if (hasHighRiskCounterparties) {
      findings.push({
        type: 'counterparty_risk',
        severity: 'medium' as const,
        description: 'Transaction involves high-risk counterparties',
        recommendation: 'Additional documentation required',
      });
    }

    return {
      status: score >= 50 ? ComplianceStatus.APPROVED : ComplianceStatus.REJECTED,
      riskLevel,
      score,
      findings,
      restrictions: score < 50 ? [{
        type: 'transaction_restriction',
        description: 'Transaction restricted due to sanctions risk',
      }] : [],
      checkedBy: 'system',
      checkedAt: new Date(),
    };
  }

  private performEmbargoCheck(complianceCheck: TradeCompliance): ComplianceCheckResult {
    // Simulate embargo checking
    const entityData = complianceCheck.entityData;
    const embargoedCountries = ['CU', 'IR', 'KP', 'SY'];
    const isEmbargoed = embargoedCountries.includes(entityData.destinationCountry || '') || 
                       embargoedCountries.includes(entityData.originCountry || '');

    const riskLevel = isEmbargoed ? RiskLevel.CRITICAL : RiskLevel.LOW;
    const score = isEmbargoed ? 0 : 90;

    const findings = [];
    if (isEmbargoed) {
      findings.push({
        type: 'embargo_violation',
        severity: 'critical' as const,
        description: 'Trade with embargoed country detected',
        recommendation: 'Transaction prohibited',
      });
    }

    return {
      status: isEmbargoed ? ComplianceStatus.REJECTED : ComplianceStatus.APPROVED,
      riskLevel,
      score,
      findings,
      restrictions: isEmbargoed ? [{
        type: 'trade_embargo',
        description: 'Trade with this country is prohibited under international embargo',
      }] : [],
      checkedBy: 'system',
      checkedAt: new Date(),
    };
  }

  private performAMLCheck(complianceCheck: TradeCompliance): ComplianceCheckResult {
    // Simulate AML checking
    const entityData = complianceCheck.entityData;
    const amount = entityData.transactionAmount || 0;
    const highValueThreshold = 10000; // USD
    const isHighValue = amount > highValueThreshold;

    const riskLevel = isHighValue ? RiskLevel.MEDIUM : RiskLevel.LOW;
    const score = isHighValue ? 70 : 90;

    const findings = [];
    if (isHighValue) {
      findings.push({
        type: 'high_value_transaction',
        severity: 'medium' as const,
        description: `High-value transaction: ${amount} ${entityData.currency}`,
        recommendation: 'Enhanced monitoring required',
      });
    }

    return {
      status: ComplianceStatus.APPROVED,
      riskLevel,
      score,
      findings,
      restrictions: [],
      conditions: isHighValue ? ['Enhanced transaction monitoring required'] : [],
      nextReviewDate: isHighValue ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
      checkedBy: 'system',
      checkedAt: new Date(),
    };
  }

  private performKYCCheck(complianceCheck: TradeCompliance): ComplianceCheckResult {
    // Simulate KYC checking
    const entityData = complianceCheck.entityData;
    const hasCompleteInfo = !!(entityData.name && entityData.registrationNumber && entityData.address && entityData.country);

    const riskLevel = hasCompleteInfo ? RiskLevel.LOW : RiskLevel.MEDIUM;
    const score = hasCompleteInfo ? 85 : 60;

    const findings = [];
    if (!hasCompleteInfo) {
      findings.push({
        type: 'incomplete_kyc',
        severity: 'medium' as const,
        description: 'Incomplete KYC information',
        recommendation: 'Additional documentation required',
      });
    }

    return {
      status: hasCompleteInfo ? ComplianceStatus.APPROVED : ComplianceStatus.REQUIRE_ADDITIONAL_INFO,
      riskLevel,
      score,
      findings,
      restrictions: [],
      checkedBy: 'system',
      checkedAt: new Date(),
    };
  }

  private performUAEVATCheck(complianceCheck: TradeCompliance): ComplianceCheckResult {
    // Simulate UAE VAT compliance checking
    const entityData = complianceCheck.entityData;
    const isUAEEntity = entityData.country === 'AE';
    const requiresVATRegistration = isUAEEntity && (entityData.transactionAmount || 0) > 375000; // AED 375,000 threshold

    const riskLevel = requiresVATRegistration && !entityData.taxId ? RiskLevel.MEDIUM : RiskLevel.LOW;
    const score = requiresVATRegistration && !entityData.taxId ? 65 : 90;

    const findings = [];
    if (requiresVATRegistration && !entityData.taxId) {
      findings.push({
        type: 'vat_registration_required',
        severity: 'medium' as const,
        description: 'UAE VAT registration required based on transaction volume',
        recommendation: 'Register for UAE VAT or provide tax registration number',
      });
    }

    return {
      status: ComplianceStatus.APPROVED,
      riskLevel,
      score,
      findings,
      restrictions: [],
      conditions: requiresVATRegistration && !entityData.taxId ? ['VAT registration required within 30 days'] : [],
      checkedBy: 'system',
      checkedAt: new Date(),
    };
  }

  private performUAECustomsCheck(complianceCheck: TradeCompliance): ComplianceCheckResult {
    // Simulate UAE customs compliance checking
    const entityData = complianceCheck.entityData;
    const restrictedGoods = ['weapons', 'chemicals', 'pharmaceuticals', 'tobacco', 'alcohol'];
    const hasRestrictedGoods = entityData.goodsDescription && 
      restrictedGoods.some(good => entityData.goodsDescription!.toLowerCase().includes(good));

    const riskLevel = hasRestrictedGoods ? RiskLevel.HIGH : RiskLevel.LOW;
    const score = hasRestrictedGoods ? 40 : 85;

    const findings = [];
    if (hasRestrictedGoods) {
      findings.push({
        type: 'restricted_goods',
        severity: 'high' as const,
        description: 'Transaction involves restricted goods for UAE customs',
        recommendation: 'Special import/export permits required',
      });
    }

    return {
      status: hasRestrictedGoods ? ComplianceStatus.REQUIRE_ADDITIONAL_INFO : ComplianceStatus.APPROVED,
      riskLevel,
      score,
      findings,
      restrictions: hasRestrictedGoods ? [{
        type: 'customs_permit_required',
        description: 'Special UAE customs permit required for restricted goods',
        conditions: ['Valid import/export license', 'Product certification', 'Safety documentation'],
      }] : [],
      checkedBy: 'system',
      checkedAt: new Date(),
    };
  }

  private performGenericCheck(complianceCheck: TradeCompliance): ComplianceCheckResult {
    // Generic compliance check
    return {
      status: ComplianceStatus.APPROVED,
      riskLevel: RiskLevel.LOW,
      score: 80,
      findings: [],
      restrictions: [],
      checkedBy: 'system',
      checkedAt: new Date(),
    };
  }

  private calculateAverageProcessingTime(checks: TradeCompliance[]): number {
    const completedChecks = checks.filter(c => c.checkedAt && c.createdAt);
    
    if (completedChecks.length === 0) return 0;

    const totalTime = completedChecks.reduce((sum, c) => {
      return sum + (c.checkedAt!.getTime() - c.createdAt.getTime());
    }, 0);

    return totalTime / completedChecks.length / (1000 * 60 * 60); // Convert to hours
  }

  private getMostCommonComplianceTypes(checks: TradeCompliance[]): Array<{ type: string; count: number }> {
    const typeCounts = checks.reduce((acc: any, check) => {
      acc[check.complianceType] = (acc[check.complianceType] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getCountriesWithRestrictions(checks: TradeCompliance[]): Array<{ country: string; restrictionCount: number }> {
    const countryRestrictions: Record<string, number> = {};

    checks.forEach(check => {
      if (check.restrictions && check.entityData.country) {
        countryRestrictions[check.entityData.country] = (countryRestrictions[check.entityData.country] || 0) + check.restrictions.length;
      }
    });

    return Object.entries(countryRestrictions)
      .map(([country, restrictionCount]) => ({ country, restrictionCount }))
      .sort((a, b) => b.restrictionCount - a.restrictionCount)
      .slice(0, 10);
  }
}
