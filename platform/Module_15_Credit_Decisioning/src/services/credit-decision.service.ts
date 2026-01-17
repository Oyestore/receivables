import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { CreditDecision } from '../entities/credit-decision.entity';
import { DecisionRule } from '../entities/decision-rule.entity';
import { DecisionWorkflow } from '../entities/decision-workflow.entity';
import { ManualReview } from '../entities/manual-review.entity';
import { DecisionStatus, DecisionType, Priority } from '../entities/credit-decision.entity';
import { RuleType, RuleStatus, ActionType } from '../entities/decision-rule.entity';

export interface DecisionRequest {
  entityId: string;
  entityType: string;
  decisionType: DecisionType;
  requestedAmount?: number;
  priority?: Priority;
  context: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface DecisionResult {
  decisionId: string;
  status: DecisionStatus;
  approvedAmount?: number;
  confidenceScore: number;
  riskScore: number;
  decisionReason: string;
  rejectionReason?: string;
  conditions?: Record<string, any>;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    outcome: string;
    score: number;
  }>;
  requiresManualReview: boolean;
  workflowId?: string;
  nextStep?: string;
}

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  conditionMet: boolean;
  score: number;
  action: ActionType;
  parameters: Record<string, any>;
  priority: number;
}

@Injectable()
export class CreditDecisionService {
  private readonly logger = new Logger(CreditDecisionService.name);

  constructor(
    @InjectRepository(CreditDecision)
    private creditDecisionRepo: Repository<CreditDecision>,
    @InjectRepository(DecisionRule)
    private decisionRuleRepo: Repository<DecisionRule>,
    @InjectRepository(DecisionWorkflow)
    private decisionWorkflowRepo: Repository<DecisionWorkflow>,
    @InjectRepository(ManualReview)
    private manualReviewRepo: Repository<ManualReview>,
    private dataSource: DataSource,
  ) {}

  /**
   * Core decision engine - evaluates credit decisions based on rules
   */
  async evaluateDecision(request: DecisionRequest): Promise<DecisionResult> {
    this.logger.log(`Evaluating decision for entity ${request.entityId} of type ${request.entityType}`);

    try {
      // 1. Get applicable rules for this decision type and entity type
      const applicableRules = await this.getApplicableRules(request.decisionType, request.entityType);
      
      // 2. Evaluate each rule
      const ruleEvaluations: RuleEvaluation[] = [];
      for (const rule of applicableRules) {
        const evaluation = await this.evaluateRule(rule, request);
        ruleEvaluations.push(evaluation);
      }

      // 3. Calculate overall scores
      const scores = this.calculateScores(ruleEvaluations, request);

      // 4. Determine decision based on rules and scores
      const decision = await this.makeDecision(scores, ruleEvaluations, request);

      // 5. Save decision record
      const creditDecision = await this.saveDecision(decision, request);

      // 6. Trigger workflow if needed
      if (decision.requiresManualReview) {
        await this.triggerWorkflow(creditDecision, decision.workflowId);
      }

      return {
        decisionId: creditDecision.id,
        status: decision.status,
        approvedAmount: decision.approvedAmount,
        confidenceScore: decision.confidenceScore,
        riskScore: decision.riskScore,
        decisionReason: decision.decisionReason,
        rejectionReason: decision.rejectionReason,
        conditions: decision.conditions,
        appliedRules: decision.appliedRules,
        requiresManualReview: decision.requiresManualReview,
        workflowId: decision.workflowId,
        nextStep: decision.nextStep,
      };
    } catch (error) {
      this.logger.error(`Error evaluating decision: ${error.message}`);
      throw new BadRequestException(`Decision evaluation failed: ${error.message}`);
    }
  }

  /**
   * Get applicable rules for decision type and entity type
   */
  private async getApplicableRules(decisionType: DecisionType, entityType: string): Promise<DecisionRule[]> {
    return await this.decisionRuleRepo
      .createQueryBuilder('rule')
      .where('rule.status = :status', { status: RuleStatus.ACTIVE })
      .andWhere('rule.decisionType = :decisionType', { decisionType })
      .andWhere(':entityType = ANY(rule.entityTypes)', { entityType })
      .orderBy('rule.priority', 'DESC')
      .addOrderBy('rule.executionOrder', 'ASC')
      .getMany();
  }

  /**
   * Evaluate a single rule against the request
   */
  private async evaluateRule(rule: DecisionRule, request: DecisionRequest): Promise<RuleEvaluation> {
    const conditionMet = await this.evaluateConditions(rule.conditions, request.context);
    
    let score = 0;
    if (conditionMet) {
      score = this.calculateRuleScore(rule, request);
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      conditionMet,
      score,
      action: conditionMet ? this.getPrimaryAction(rule) : ActionType.REJECT,
      parameters: conditionMet ? this.getActionParameters(rule) : {},
      priority: rule.priority,
    };
  }

  /**
   * Evaluate rule conditions
   */
  private async evaluateConditions(conditions: any[], context: Record<string, any>): Promise<boolean> {
    if (!conditions || conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(context, condition.field);
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value);
      
      if (!conditionMet) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(context: Record<string, any>, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      case 'greater_equal':
        return Number(fieldValue) >= Number(expectedValue);
      case 'less_equal':
        return Number(fieldValue) <= Number(expectedValue);
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(expectedValue));
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'not_in':
        return !Array.isArray(expectedValue) || !expectedValue.includes(fieldValue);
      case 'between':
        return Array.isArray(expectedValue) && 
               Number(fieldValue) >= Number(expectedValue[0]) && 
               Number(fieldValue) <= Number(expectedValue[1]);
      case 'regex':
        return new RegExp(expectedValue).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * Calculate rule score
   */
  private calculateRuleScore(rule: DecisionRule, request: DecisionRequest): number {
    if (!rule.scoringAlgorithm) {
      return rule.priority;
    }

    const { weights, thresholds } = rule.scoringAlgorithm;
    let totalScore = 0;
    let totalWeight = 0;

    // Simple weighted average implementation
    for (const [field, weight] of Object.entries(weights)) {
      const fieldValue = this.getFieldValue(request.context, field);
      const score = this.normalizeScore(fieldValue, thresholds);
      totalScore += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Normalize score to 0-100 range
   */
  private normalizeScore(value: any, thresholds: Record<string, number>): number {
    const numValue = Number(value);
    
    if (thresholds.min !== undefined && numValue < thresholds.min) return 0;
    if (thresholds.max !== undefined && numValue > thresholds.max) return 100;
    
    if (thresholds.min !== undefined && thresholds.max !== undefined) {
      const range = thresholds.max - thresholds.min;
      return ((numValue - thresholds.min) / range) * 100;
    }
    
    return 50; // Default middle score
  }

  /**
   * Get primary action for a rule
   */
  private getPrimaryAction(rule: DecisionRule): ActionType {
    if (rule.actions && rule.actions.length > 0) {
      return rule.actions[0].type as ActionType;
    }
    return ActionType.REJECT;
  }

  /**
   * Get action parameters for a rule
   */
  private getActionParameters(rule: DecisionRule): Record<string, any> {
    if (rule.actions && rule.actions.length > 0) {
      return rule.actions[0].parameters || {};
    }
    return {};
  }

  /**
   * Calculate overall scores from rule evaluations
   */
  private calculateScores(ruleEvaluations: RuleEvaluation[], request: DecisionRequest): any {
    const totalScore = ruleEvaluations.reduce((sum, eval) => sum + eval.score, 0);
    const averageScore = ruleEvaluations.length > 0 ? totalScore / ruleEvaluations.length : 0;
    
    const mandatoryRules = ruleEvaluations.filter(eval => {
      const rule = ruleEvaluations.find(r => r.ruleId === eval.ruleId);
      return rule && rule.priority >= 80; // High priority rules are mandatory
    });

    const mandatoryPassed = mandatoryRules.every(eval => eval.conditionMet);
    
    // Risk score based on failed high-priority rules
    const riskScore = mandatoryRules.filter(eval => !eval.conditionMet).length * 20;

    return {
      totalScore,
      averageScore,
      mandatoryPassed,
      riskScore,
      ruleEvaluations,
    };
  }

  /**
   * Make final decision based on scores and evaluations
   */
  private async makeDecision(scores: any, ruleEvaluations: RuleEvaluation[], request: DecisionRequest): Promise<any> {
    const { totalScore, averageScore, mandatoryPassed, riskScore, ruleEvaluations: evaluations } = scores;

    // Check for mandatory rule failures
    if (!mandatoryPassed) {
      return {
        status: DecisionStatus.MANUAL_REVIEW,
        approvedAmount: 0,
        confidenceScore: 0,
        riskScore: Math.min(100, riskScore),
        decisionReason: 'Mandatory rules not met',
        rejectionReason: 'Application fails mandatory requirements',
        requiresManualReview: true,
        appliedRules: evaluations.map(e => ({
          ruleId: e.ruleId,
          ruleName: e.ruleName,
          outcome: e.conditionMet ? 'passed' : 'failed',
          score: e.score,
        })),
      };
    }

    // Determine decision based on score thresholds
    if (averageScore >= 80) {
      // Approve
      return {
        status: DecisionStatus.APPROVED,
        approvedAmount: request.requestedAmount || 0,
        confidenceScore: averageScore,
        riskScore: Math.min(100, riskScore),
        decisionReason: 'High confidence approval based on rule evaluation',
        requiresManualReview: false,
        appliedRules: evaluations.map(e => ({
          ruleId: e.ruleId,
          ruleName: e.ruleName,
          outcome: 'passed',
          score: e.score,
        })),
      };
    } else if (averageScore >= 60) {
      // Approve with conditions
      return {
        status: DecisionStatus.APPROVED,
        approvedAmount: Math.floor((request.requestedAmount || 0) * (averageScore / 100)),
        confidenceScore: averageScore,
        riskScore: Math.min(100, riskScore),
        decisionReason: 'Conditional approval based on moderate confidence',
        conditions: {
          monitoringRequired: true,
          reviewPeriod: '30_days',
          additionalDocumentation: required,
        },
        requiresManualReview: false,
        appliedRules: evaluations.map(e => ({
          ruleId: e.ruleId,
          ruleName: e.ruleName,
          outcome: 'passed',
          score: e.score,
        })),
      };
    } else if (averageScore >= 40) {
      // Manual review
      return {
        status: DecisionStatus.MANUAL_REVIEW,
        approvedAmount: 0,
        confidenceScore: averageScore,
        riskScore: Math.min(100, riskScore),
        decisionReason: 'Moderate confidence - requires manual review',
        requiresManualReview: true,
        appliedRules: evaluations.map(e => ({
          ruleId: e.ruleId,
          ruleName: e.ruleName,
          outcome: e.conditionMet ? 'passed' : 'failed',
          score: e.score,
        })),
      };
    } else {
      // Reject
      const failedRules = evaluations.filter(e => !e.conditionMet);
      return {
        status: DecisionStatus.REJECTED,
        approvedAmount: 0,
        confidenceScore: averageScore,
        riskScore: Math.min(100, riskScore),
        decisionReason: 'Low confidence score',
        rejectionReason: `Failed rules: ${failedRules.map(r => r.ruleName).join(', ')}`,
        requiresManualReview: false,
        appliedRules: evaluations.map(e => ({
          ruleId: e.ruleId,
          ruleName: e.ruleName,
          outcome: e.conditionMet ? 'passed' : 'failed',
          score: e.score,
        })),
      };
    }
  }

  /**
   * Save decision record to database
   */
  private async saveDecision(decision: any, request: DecisionRequest): Promise<CreditDecision> {
    const creditDecision = this.creditDecisionRepo.create({
      entityId: request.entityId,
      entityType: request.entityType,
      decisionType: request.decisionType,
      status: decision.status,
      priority: request.priority || Priority.MEDIUM,
      creditScore: request.context.creditScore || null,
      requestedAmount: request.requestedAmount || null,
      approvedAmount: decision.approvedAmount || null,
      riskScore: decision.riskScore,
      confidenceScore: decision.confidenceScore,
      decisionReason: decision.decisionReason,
      rejectionReason: decision.rejectionReason || null,
      conditions: decision.conditions || null,
      appliedRules: decision.appliedRules || [],
      metadata: request.metadata || {},
      createdBy: 'system',
    });

    return await this.creditDecisionRepo.save(creditDecision);
  }

  /**
   * Trigger workflow for manual review
   */
  private async triggerWorkflow(creditDecision: CreditDecision, workflowId?: string): Promise<void> {
    // Find appropriate workflow
    let workflow: DecisionWorkflow;
    
    if (workflowId) {
      workflow = await this.decisionWorkflowRepo.findOne({ where: { id: workflowId } });
    } else {
      // Find default workflow for this decision type
      workflow = await this.decisionWorkflowRepo.findOne({
        where: {
          decisionType: creditDecision.decisionType,
          isDefault: true,
          status: 'active',
        },
      });
    }

    if (!workflow) {
      this.logger.warn(`No workflow found for decision type ${creditDecision.decisionType}`);
      return;
    }

    // Create manual review
    const manualReview = this.manualReviewRepo.create({
      decisionId: creditDecision.id,
      reviewType: 'manual_review',
      status: 'pending',
      priority: creditDecision.priority,
      reviewReason: creditDecision.decisionReason,
      assignedBy: 'system',
      assignedAt: new Date(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      createdBy: 'system',
    });

    await this.manualReviewRepo.save(manualReview);

    // Update decision with workflow info
    creditDecision.workflowId = workflow.id;
    creditDecision.currentStep = workflow.steps[0]?.id || 'start';
    await this.creditDecisionRepo.save(creditDecision);

    this.logger.log(`Triggered workflow ${workflow.id} for decision ${creditDecision.id}`);
  }

  /**
   * Get decision by ID
   */
  async getDecision(id: string): Promise<CreditDecision> {
    const decision = await this.creditDecisionRepo.findOne({
      where: { id },
      relations: ['workflow', 'manualReviews'],
    });

    if (!decision) {
      throw new NotFoundException(`Decision with ID ${id} not found`);
    }

    return decision;
  }

  /**
   * Get decisions by entity
   */
  async getDecisionsByEntity(entityId: string, entityType: string): Promise<CreditDecision[]> {
    return await this.creditDecisionRepo.find({
      where: { entityId, entityType },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update decision status
   */
  async updateDecisionStatus(id: string, status: DecisionStatus, reviewerId?: string, reviewNotes?: string): Promise<CreditDecision> {
    const decision = await this.getDecision(id);
    
    decision.status = status;
    
    if (reviewerId) {
      decision.reviewerId = reviewerId;
      decision.reviewNotes = reviewNotes;
      decision.reviewedAt = new Date();
    }

    if (status === DecisionStatus.APPROVED || status === DecisionStatus.REJECTED) {
      decision.finalizedAt = new Date();
    }

    return await this.creditDecisionRepo.save(decision);
  }

  /**
   * Get decision analytics
   */
  async getDecisionAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.creditDecisionRepo.createQueryBuilder('decision');

    if (startDate && endDate) {
      query.where('decision.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const decisions = await query.getMany();

    const analytics = {
      totalDecisions: decisions.length,
      statusDistribution: {
        pending: decisions.filter(d => d.status === DecisionStatus.PENDING).length,
        approved: decisions.filter(d => d.status === DecisionStatus.APPROVED).length,
        rejected: decisions.filter(d => d.status === DecisionStatus.REJECTED).length,
        manualReview: decisions.filter(d => d.status === DecisionStatus.MANUAL_REVIEW).length,
        escalated: decisions.filter(d => d.status === DecisionStatus.ESCALATED).length,
      },
      decisionTypeDistribution: decisions.reduce((acc, d) => {
        acc[d.decisionType] = (acc[d.decisionType] || 0) + 1;
        return acc;
      }, {}),
      averageConfidence: decisions.reduce((sum, d) => sum + (d.confidenceScore || 0), 0) / decisions.length,
      averageRiskScore: decisions.reduce((sum, d) => sum + (d.riskScore || 0), 0) / decisions.length,
      totalApprovedAmount: decisions
        .filter(d => d.status === DecisionStatus.APPROVED)
        .reduce((sum, d) => sum + (d.approvedAmount || 0), 0),
      totalRequestedAmount: decisions
        .filter(d => d.requestedAmount)
        .reduce((sum, d) => sum + d.requestedAmount, 0),
    };

    return analytics;
  }
}
