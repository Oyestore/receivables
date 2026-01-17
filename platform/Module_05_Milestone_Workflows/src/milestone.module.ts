import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// Controllers
import { MilestoneController } from './controllers/milestone.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { EscalationController } from './controllers/escalation.controller';
import { VerificationController } from './controllers/verification.controller';
import { EvidenceController } from './controllers/evidence.controller';
import { WorkflowAutomationController } from './controllers/workflow-automation.controller';

// Services
import { MilestoneService } from './services/milestone.service';
import { WorkflowService } from './services/workflow.service';
import { EscalationService } from './services/escalation.service';
import { VerificationService } from './services/verification.service';
import { EvidenceService } from './services/evidence.service';
import { IntegrationService } from './services/integration.service';
import { InvoiceGenerationService } from './services/invoice-generation.service';
import { MultiChannelStatusProbingService } from './services/multi-channel-status-probing.service';
import { WorkflowExecutionEngineService } from './services/workflow-execution-engine.service';

// Enhanced Services
import { AiRuleOptimizationService } from './services/ai-rule-optimization.service';
import { PredictiveAnalyticsService } from './services/predictive-analytics.service';
import { GlobalizationService } from './services/globalization.service';
import { PerformanceOptimizationService } from './services/performance-optimization.service';
import { WorkflowAutomationService } from './services/workflow-automation.service';
import { BusinessIntelligenceService } from './services/business-intelligence.service';
import { ContinuousImprovementService } from './services/continuous-improvement.service';
import { GlobalExpansionService } from './services/global-expansion.service';

// Entities
import { Milestone } from './entities/milestone.entity';
import { MilestoneWorkflow } from './entities/milestone-workflow.entity';
import { MilestoneVerification } from './entities/milestone-verification.entity';
import { MilestoneEvidence } from './entities/milestone-evidence.entity';
import { MilestoneOwner } from './entities/milestone-owner.entity';
import { MilestoneEscalation } from './entities/milestone-escalation.entity';
import { MilestoneStatusProbe } from './entities/milestone-status-probe.entity';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowState } from './entities/workflow-state.entity';
import { WorkflowOrchestration } from './entities/workflow-orchestration.entity';
import { SuccessMilestone } from './entities/success-milestone.entity';
import { FinancingWorkflow } from './entities/financing-workflow.entity';
import { FinancingWorkflowInstance } from './entities/financing-workflow-instance.entity';
import { OnboardingWorkflow } from './entities/onboarding-workflow.entity';
import { PersonalizedWorkflow } from './entities/personalized-workflow.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowRule } from './entities/workflow-rule.entity';
import { PerformanceMetric } from './entities/performance-metric.entity';

/**
 * Module 05: Milestone Workflows Module
 * 
 * This module provides comprehensive milestone-based payment workflow functionality
 * including milestone tracking, workflow orchestration, verification, escalation,
 * and advanced AI-powered optimization capabilities.
 * 
 * Key Features:
 * - Milestone creation, tracking, and management
 * - Workflow orchestration (linear, parallel, conditional)
 * - Automated verification and evidence collection
 * - Escalation management and notification
 * - AI-powered rule optimization
 * - Predictive analytics and forecasting
 * - Multi-language globalization support
 * - Performance optimization and monitoring
 * - Business intelligence and reporting
 * - Continuous improvement framework
 * - Global expansion capabilities
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.production'],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 100,
    }]),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      // Core Milestone Entities
      Milestone,
      MilestoneWorkflow,
      MilestoneVerification,
      MilestoneEvidence,
      MilestoneOwner,
      MilestoneEscalation,
      MilestoneStatusProbe,
      
      // Workflow Entities
      WorkflowDefinition,
      WorkflowInstance,
      WorkflowState,
      WorkflowOrchestration,
      WorkflowExecution,
      WorkflowRule,
      
      // Specialized Entities
      SuccessMilestone,
      FinancingWorkflow,
      FinancingWorkflowInstance,
      OnboardingWorkflow,
      PersonalizedWorkflow,
      
      // Performance & Analytics
      PerformanceMetric,
    ]),
  ],
  controllers: [
    // Core Controllers
    MilestoneController,
    WorkflowController,
    EscalationController,
    VerificationController,
    EvidenceController,
    WorkflowAutomationController,
  ],
  providers: [
    // Core Services
    MilestoneService,
    WorkflowService,
    EscalationService,
    VerificationService,
    EvidenceService,
    IntegrationService,
    InvoiceGenerationService,
    MultiChannelStatusProbingService,
    WorkflowExecutionEngineService,
    
    // Enhanced Services
    AiRuleOptimizationService,
    PredictiveAnalyticsService,
    GlobalizationService,
    PerformanceOptimizationService,
    WorkflowAutomationService,
    BusinessIntelligenceService,
    ContinuousImprovementService,
    GlobalExpansionService,
  ],
  exports: [
    // Export core services for other modules
    MilestoneService,
    WorkflowService,
    IntegrationService,
    WorkflowExecutionEngineService,
    AiRuleOptimizationService,
    PredictiveAnalyticsService,
    BusinessIntelligenceService,
  ],
})
export class MilestoneModule {}
