import { Injectable, Logger, OnModuleInit, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { BuyerProfile } from '../entities/buyer-profile.entity';
import { CreditAssessment } from '../entities/credit-assessment.entity';
import { RiskAssessment } from '../entities/risk-assessment.entity';
import { RiskAlert } from '../entities/risk-alert.entity';
import { RiskRule } from '../entities/risk-rule.entity';
import { CreditLimit } from '../entities/credit-limit.entity';
import { ScoringModel } from '../entities/scoring-model.entity';
import { RiskLevel } from '../enums/risk-level.enum';
import { CreditAssessmentStatus } from '../enums/credit-assessment-status.enum';
import { RiskAlertService } from './risk-alert.service';
import { CreditAssessmentService } from './credit-assessment.service';
import { RiskRuleService } from './risk-rule.service';
import { NotificationService } from './notification.service';

export enum AutonomousActionType {
  CREDIT_LIMIT_ADJUSTMENT = 'credit_limit_adjustment',
  RISK_LEVEL_RECALCULATION = 'risk_level_recalculation',
  AUTOMATIC_ALERT = 'automatic_alert',
  PORTFOLIO_REBALANCING = 'portfolio_rebalancing',
  MODEL_RETRAINING = 'model_retraining',
  COMPLIANCE_CHECK = 'compliance_check'
}

export enum AutonomousActionStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export interface AutonomousAction {
  id: string;
  type: AutonomousActionType;
  status: AutonomousActionStatus;
  triggeredBy: string;
  targetId: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  executedAt: Date;
  completedAt?: Date;
}

@Injectable()
export class AutonomousRiskManagementService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(AutonomousRiskManagementService.name);
  private isRunning = false;
  private actionQueue: AutonomousAction[] = [];
  private readonly maxConcurrentActions = 5;
  private readonly actionHistory: Map<string, AutonomousAction[]> = new Map();

  constructor(
    @InjectRepository(BuyerProfile)
    private readonly buyerProfileRepository: Repository<BuyerProfile>,
    @InjectRepository(CreditAssessment)
    private readonly creditAssessmentRepository: Repository<CreditAssessment>,
    @InjectRepository(RiskAssessment)
    private readonly riskAssessmentRepository: Repository<RiskAssessment>,
    @InjectRepository(RiskAlert)
    private readonly riskAlertRepository: Repository<RiskAlert>,
    @InjectRepository(RiskRule)
    private readonly riskRuleRepository: Repository<RiskRule>,
    @InjectRepository(CreditLimit)
    private readonly creditLimitRepository: Repository<CreditLimit>,
    @InjectRepository(ScoringModel)
    private readonly scoringModelRepository: Repository<ScoringModel>,
    private readonly riskAlertService: RiskAlertService,
    private readonly creditAssessmentService: CreditAssessmentService,
    private readonly riskRuleService: RiskRuleService,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Autonomous Risk Management Service');
    await this.initializeAutonomousRules();
    await this.loadActionHistory();
  }

  async onApplicationBootstrap() {
    this.logger.log('Starting Autonomous Risk Management Service');
    this.startAutonomousMonitoring();
  }

  private async initializeAutonomousRules() {
    try {
      // Create default autonomous rules if they don't exist
      const defaultRules = await this.createDefaultAutonomousRules();
      this.logger.log(`Initialized ${defaultRules.length} default autonomous rules`);
    } catch (error) {
      this.logger.error('Failed to initialize autonomous rules:', error);
    }
  }

  private async createDefaultAutonomousRules() {
    const rules = [
      {
        name: 'Auto Credit Limit Adjustment',
        description: 'Automatically adjust credit limits based on risk score changes',
        ruleType: 'AUTOMATION',
        category: 'CREDIT_SCORING',
        trigger: 'ON_UPDATE',
        conditions: [
          {
            field: 'riskScoreChange',
            operator: 'GREATER_THAN',
            value: 20,
            weight: 1.0
          }
        ],
        actions: [
          {
            type: 'credit_limit_adjustment',
            parameters: {
              adjustmentFactor: 0.1,
              maxAdjustment: 0.5,
              requireApproval: false
            },
            priority: 'medium'
          }
        ],
        status: 'ACTIVE',
        isGlobal: true
      },
      {
        name: 'High Risk Alert',
        description: 'Automatically generate alerts for high-risk profiles',
        ruleType: 'ALERT',
        category: 'RISK_ASSESSMENT',
        trigger: 'ON_CREATE',
        conditions: [
          {
            field: 'riskLevel',
            operator: 'IN',
            value: ['HIGH', 'VERY_HIGH', 'EXTREME'],
            weight: 1.0
          }
        ],
        actions: [
          {
            type: 'alert',
            parameters: {
              severity: 'high',
              autoNotify: true,
              escalationRequired: true
            },
            priority: 'high'
          }
        ],
        status: 'ACTIVE',
        isGlobal: true
      },
      {
        name: 'Model Performance Monitor',
        description: 'Monitor model performance and trigger retraining if needed',
        ruleType: 'MONITORING',
        category: 'CREDIT_SCORING',
        trigger: 'ON_SCHEDULE',
        conditions: [
          {
            field: 'modelAccuracy',
            operator: 'LESS_THAN',
            value: 0.85,
            weight: 1.0
          }
        ],
        actions: [
          {
            type: 'model_retraining',
            parameters: {
              autoRetrain: true,
              requireApproval: false,
              dataWindow: '6_months'
            },
            priority: 'medium'
          }
        ],
        status: 'ACTIVE',
        isGlobal: true
      }
    ];

    const createdRules = [];
    for (const ruleData of rules) {
      const existingRule = await this.riskRuleRepository.findOne({
        where: { name: ruleData.name }
      });

      if (!existingRule) {
        const rule = this.riskRuleRepository.create(ruleData);
        const savedRule = await this.riskRuleRepository.save(rule);
        createdRules.push(savedRule);
      }
    }

    return createdRules;
  }

  private async loadActionHistory() {
    try {
      // Load recent action history for analysis
      const recentActions = await this.getRecentActions(100);
      this.actionHistory.set('recent', recentActions);
      this.logger.log(`Loaded ${recentActions.length} recent actions`);
    } catch (error) {
      this.logger.error('Failed to load action history:', error);
    }
  }

  private startAutonomousMonitoring() {
    this.isRunning = true;
    this.processActionQueue();
    this.logger.log('Autonomous monitoring started');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorRiskChanges() {
    if (!this.isRunning) return;

    try {
      // Monitor for significant risk changes
      const significantChanges = await this.detectSignificantRiskChanges();
      
      for (const change of significantChanges) {
        await this.queueAutonomousAction({
          id: this.generateActionId(),
          type: AutonomousActionType.RISK_LEVEL_RECALCULATION,
          status: AutonomousActionStatus.PENDING,
          triggeredBy: 'risk_monitor',
          targetId: change.buyerId,
          parameters: change,
          executedAt: new Date()
        });
      }

      this.logger.log(`Processed ${significantChanges.length} risk changes`);
    } catch (error) {
      this.logger.error('Error in risk monitoring:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async monitorModelPerformance() {
    if (!this.isRunning) return;

    try {
      const models = await this.scoringModelRepository.find({
        where: { status: 'DEPLOYED', isActive: true }
      });

      for (const model of models) {
        const performance = await this.evaluateModelPerformance(model.id);
        
        if (performance.accuracy < 0.85) {
          await this.queueAutonomousAction({
            id: this.generateActionId(),
            type: AutonomousActionType.MODEL_RETRAINING,
            status: AutonomousActionStatus.PENDING,
            triggeredBy: 'performance_monitor',
            targetId: model.id,
            parameters: {
              modelId: model.id,
              currentAccuracy: performance.accuracy,
              retrainThreshold: 0.85
            },
            executedAt: new Date()
          });
        }
      }

      this.logger.log(`Monitored ${models.length} models for performance`);
    } catch (error) {
      this.logger.error('Error in model performance monitoring:', error);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async performComplianceChecks() {
    if (!this.isRunning) return;

    try {
      const complianceIssues = await this.detectComplianceIssues();
      
      for (const issue of complianceIssues) {
        await this.queueAutonomousAction({
          id: this.generateActionId(),
          type: AutonomousActionType.COMPLIANCE_CHECK,
          status: AutonomousActionStatus.PENDING,
          triggeredBy: 'compliance_monitor',
          targetId: issue.entityId,
          parameters: issue,
          executedAt: new Date()
        });
      }

      this.logger.log(`Detected ${complianceIssues.length} compliance issues`);
    } catch (error) {
      this.logger.error('Error in compliance monitoring:', error);
    }
  }

  @Interval(30000) // Every 30 seconds
  async processActionQueue() {
    if (!this.isRunning || this.actionQueue.length === 0) return;

    const executingActions = this.actionQueue.filter(
      action => action.status === AutonomousActionStatus.EXECUTING
    ).length;

    if (executingActions >= this.maxConcurrentActions) {
      return; // Max concurrent actions reached
    }

    const pendingActions = this.actionQueue.filter(
      action => action.status === AutonomousActionStatus.PENDING
    );

    const availableSlots = this.maxConcurrentActions - executingActions;
    const actionsToExecute = pendingActions.slice(0, availableSlots);

    for (const action of actionsToExecute) {
      this.executeAutonomousAction(action);
    }
  }

  private async executeAutonomousAction(action: AutonomousAction) {
    action.status = AutonomousActionStatus.EXECUTING;
    
    try {
      this.logger.log(`Executing autonomous action: ${action.type} for target ${action.targetId}`);

      switch (action.type) {
        case AutonomousActionType.CREDIT_LIMIT_ADJUSTMENT:
          action.result = await this.executeCreditLimitAdjustment(action);
          break;
        
        case AutonomousActionType.RISK_LEVEL_RECALCULATION:
          action.result = await this.executeRiskLevelRecalculation(action);
          break;
        
        case AutonomousActionType.AUTOMATIC_ALERT:
          action.result = await this.executeAutomaticAlert(action);
          break;
        
        case AutonomousActionType.PORTFOLIO_REBALANCING:
          action.result = await this.executePortfolioRebalancing(action);
          break;
        
        case AutonomousActionType.MODEL_RETRAINING:
          action.result = await this.executeModelRetraining(action);
          break;
        
        case AutonomousActionType.COMPLIANCE_CHECK:
          action.result = await this.executeComplianceCheck(action);
          break;
        
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      action.status = AutonomousActionStatus.COMPLETED;
      action.completedAt = new Date();
      
      this.logger.log(`Successfully completed action: ${action.type}`);
    } catch (error) {
      action.status = AutonomousActionStatus.FAILED;
      action.error = error.message;
      action.completedAt = new Date();
      
      this.logger.error(`Failed to execute action ${action.type}:`, error);
      
      // Attempt rollback if possible
      await this.attemptActionRollback(action);
    }

    // Remove from queue and add to history
    this.actionQueue = this.actionQueue.filter(a => a.id !== action.id);
    this.addToActionHistory(action);
  }

  private async executeCreditLimitAdjustment(action: AutonomousAction) {
    const { buyerId, adjustmentFactor, maxAdjustment } = action.parameters;
    
    const currentLimit = await this.creditLimitRepository.findOne({
      where: { buyerId }
    });

    if (!currentLimit) {
      throw new Error('Credit limit not found for buyer');
    }

    const adjustment = currentLimit.approvedLimit * adjustmentFactor;
    const newLimit = currentLimit.approvedLimit + adjustment;
    
    // Ensure adjustment doesn't exceed maximum
    const finalLimit = Math.min(newLimit, currentLimit.approvedLimit * (1 + maxAdjustment));

    // Update credit limit
    currentLimit.approvedLimit = finalLimit;
    currentLimit.lastAdjustedAt = new Date();
    currentLimit.adjustmentReason = 'Autonomous adjustment based on risk change';
    
    await this.creditLimitRepository.save(currentLimit);

    // Create audit record
    await this.createAuditRecord({
      action: 'CREDIT_LIMIT_ADJUSTMENT',
      entityId: currentLimit.id,
      oldValue: currentLimit.approvedLimit - adjustment,
      newValue: finalLimit,
      reason: 'Autonomous risk-based adjustment',
      performedBy: 'autonomous_system'
    });

    return {
      previousLimit: currentLimit.approvedLimit - adjustment,
      newLimit: finalLimit,
      adjustment: adjustment
    };
  }

  private async executeRiskLevelRecalculation(action: AutonomousAction) {
    const { buyerId, riskScoreChange } = action.parameters;
    
    // Get latest credit assessment
    const latestAssessment = await this.creditAssessmentRepository.findOne({
      where: { buyerId },
      order: { createdAt: 'DESC' }
    });

    if (!latestAssessment) {
      throw new Error('No credit assessment found for buyer');
    }

    // Recalculate risk level based on new score
    const newScore = latestAssessment.scoreValue + riskScoreChange;
    const newRiskLevel = this.calculateRiskLevel(newScore);

    // Update assessment
    latestAssessment.scoreValue = newScore;
    latestAssessment.riskLevel = newRiskLevel;
    latestAssessment.updatedAt = new Date();
    
    await this.creditAssessmentRepository.save(latestAssessment);

    return {
      previousScore: latestAssessment.scoreValue - riskScoreChange,
      newScore: newScore,
      previousRiskLevel: latestAssessment.riskLevel,
      newRiskLevel: newRiskLevel
    };
  }

  private async executeAutomaticAlert(action: AutonomousAction) {
    const { buyerId, severity, autoNotify, escalationRequired } = action.parameters;
    
    const alert = await this.riskAlertService.createAlert({
      buyerId,
      alertType: 'AUTONOMOUS_RISK',
      severity,
      message: 'Autonomous risk management system detected elevated risk levels',
      autoNotify,
      escalationRequired
    });

    return {
      alertId: alert.id,
      severity,
      notified: autoNotify,
      escalated: escalationRequired
    };
  }

  private async executePortfolioRebalancing(action: AutonomousAction) {
    // Implement portfolio rebalancing logic
    const { portfolioId, rebalancingStrategy } = action.parameters;
    
    // This would involve complex portfolio analysis and rebalancing
    // For now, return a placeholder result
    return {
      portfolioId,
      rebalancingStrategy,
      adjustments: [],
      riskReduction: 0
    };
  }

  private async executeModelRetraining(action: AutonomousAction) {
    const { modelId, currentAccuracy, retrainThreshold } = action.parameters;
    
    const model = await this.scoringModelRepository.findOne({
      where: { id: modelId }
    });

    if (!model) {
      throw new Error('Model not found');
    }

    // Update model status to training
    model.status = 'TRAINING';
    await this.scoringModelRepository.save(model);

    // Trigger model retraining process
    // This would integrate with ML pipeline
    await this.triggerModelRetraining(modelId);

    return {
      modelId,
      previousAccuracy: currentAccuracy,
      retrainThreshold,
      status: 'TRAINING_INITIATED'
    };
  }

  private async executeComplianceCheck(action: AutonomousAction) {
    const { entityId, complianceType, violations } = action.parameters;
    
    // Create compliance alerts for each violation
    const alerts = [];
    for (const violation of violations) {
      const alert = await this.riskAlertService.createAlert({
        buyerId: entityId,
        alertType: 'COMPLIANCE_VIOLATION',
        severity: violation.severity,
        message: violation.description,
        autoNotify: true,
        escalationRequired: violation.severity === 'high'
      });
      alerts.push(alert);
    }

    return {
      entityId,
      complianceType,
      violations: violations.length,
      alertsCreated: alerts.length
    };
  }

  private async detectSignificantRiskChanges() {
    const changes = [];
    
    // Find recent credit assessments with significant score changes
    const recentAssessments = await this.creditAssessmentRepository.find({
      where: {
        createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
      },
      relations: ['buyer']
    });

    for (const assessment of recentAssessments) {
      // Compare with previous assessment
      const previousAssessment = await this.creditAssessmentRepository.findOne({
        where: { buyerId: assessment.buyerId },
        order: { createdAt: 'DESC' },
        skip: 1
      });

      if (previousAssessment) {
        const scoreChange = Math.abs(assessment.scoreValue - previousAssessment.scoreValue);
        
        if (scoreChange > 20) { // Significant change threshold
          changes.push({
            buyerId: assessment.buyerId,
            scoreChange: scoreChange,
            previousScore: previousAssessment.scoreValue,
            newScore: assessment.scoreValue
          });
        }
      }
    }

    return changes;
  }

  private async evaluateModelPerformance(modelId: string) {
    // This would integrate with model monitoring systems
    // For now, return mock performance data
    return {
      accuracy: 0.87,
      precision: 0.85,
      recall: 0.89,
      f1Score: 0.87,
      lastEvaluated: new Date()
    };
  }

  private async detectComplianceIssues() {
    // This would check various compliance requirements
    // For now, return empty array
    return [];
  }

  private async triggerModelRetraining(modelId: string) {
    // This would integrate with ML training pipeline
    this.logger.log(`Triggering retraining for model: ${modelId}`);
  }

  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.VERY_LOW;
    if (score >= 65) return RiskLevel.LOW;
    if (score >= 50) return RiskLevel.MEDIUM;
    if (score >= 35) return RiskLevel.HIGH;
    if (score >= 20) return RiskLevel.VERY_HIGH;
    return RiskLevel.EXTREME;
  }

  private async createAuditRecord(record: any) {
    // Create audit record for autonomous actions
    this.logger.log('Creating audit record:', record);
  }

  private async attemptActionRollback(action: AutonomousAction) {
    try {
      this.logger.log(`Attempting rollback for failed action: ${action.type}`);
      
      // Implement rollback logic based on action type
      switch (action.type) {
        case AutonomousActionType.CREDIT_LIMIT_ADJUSTMENT:
          await this.rollbackCreditLimitAdjustment(action);
          break;
        // Add rollback logic for other action types
      }
      
      action.status = AutonomousActionStatus.ROLLED_BACK;
    } catch (rollbackError) {
      this.logger.error(`Rollback failed for action ${action.type}:`, rollbackError);
    }
  }

  private async rollbackCreditLimitAdjustment(action: AutonomousAction) {
    const { buyerId } = action.parameters;
    
    const currentLimit = await this.creditLimitRepository.findOne({
      where: { buyerId }
    });

    if (currentLimit && action.result) {
      // Restore previous limit
      currentLimit.approvedLimit = action.result.previousLimit;
      currentLimit.adjustmentReason = 'Rollback of autonomous adjustment';
      await this.creditLimitRepository.save(currentLimit);
    }
  }

  private async queueAutonomousAction(action: AutonomousAction) {
    this.actionQueue.push(action);
    this.logger.log(`Queued autonomous action: ${action.type}`);
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToActionHistory(action: AutonomousAction) {
    const history = this.actionHistory.get('recent') || [];
    history.unshift(action);
    
    // Keep only last 100 actions
    if (history.length > 100) {
      history.splice(100);
    }
    
    this.actionHistory.set('recent', history);
  }

  private async getRecentActions(limit: number): Promise<AutonomousAction[]> {
    // This would typically load from database
    return [];
  }

  // Public API methods
  async getActionQueue(): Promise<AutonomousAction[]> {
    return [...this.actionQueue];
  }

  async getActionHistory(limit: number = 50): Promise<AutonomousAction[]> {
    const history = this.actionHistory.get('recent') || [];
    return history.slice(0, limit);
  }

  async pauseAutonomousMonitoring(): Promise<void> {
    this.isRunning = false;
    this.logger.log('Autonomous monitoring paused');
  }

  async resumeAutonomousMonitoring(): Promise<void> {
    this.isRunning = true;
    this.startAutonomousMonitoring();
    this.logger.log('Autonomous monitoring resumed');
  }

  async getSystemStatus(): Promise<any> {
    return {
      isRunning: this.isRunning,
      queueLength: this.actionQueue.length,
      executingActions: this.actionQueue.filter(a => a.status === AutonomousActionStatus.EXECUTING).length,
      completedActions: this.actionHistory.get('recent')?.filter(a => a.status === AutonomousActionStatus.COMPLETED).length || 0,
      failedActions: this.actionHistory.get('recent')?.filter(a => a.status === AutonomousActionStatus.FAILED).length || 0
    };
  }
}
