import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Phase 1 Integration Modules
import { AuthModule } from './auth/auth.module';
import { InvoiceIntegrationModule } from './integrations/invoice/invoice-integration.module';
import { PaymentIntegrationModule } from './integrations/payment/payment-integration.module';
import { AnalyticsIntegrationModule } from './integrations/analytics/analytics-integration.module';
import { MLServiceModule } from './integrations/ml/ml.module';

// Controllers
import { MilestoneController } from './controllers/milestone.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { EscalationController } from './controllers/escalation.controller';
import { VerificationController } from './controllers/verification.controller';
import { EvidenceController } from './controllers/evidence.controller';
import { WorkflowAdaptationController } from './controllers/workflow-adaptation.controller';
import { PredictionController } from './controllers/prediction.controller';

// Services
import { MilestoneService } from './services/milestone.service';
import { WorkflowService } from './services/workflow.service';
import { EscalationService } from './services/milestone-escalation.service';
import { VerificationService } from './services/milestone-verification.service';
import { EvidenceService } from './services/milestone-evidence.service';
import { MilestoneOwnerService } from './services/milestone-owner.service';
import { MilestoneVisualizationService } from './services/milestone-visualization.service';
import { VisualWorkflowDesignerService } from './services/visual-workflow-designer.service';
import { WorkflowStateMachineService } from './services/workflow-state-machine.service';
import { SuccessMilestoneManagementService } from './services/success-milestone-management.service';
import { ApprovalWorkflowService } from './services/approval-workflow.service';
import { InvoiceFinancingWorkflowService } from './services/invoice-financing-workflow.service';
import { WorkflowAdaptationService } from './services/workflow-adaptation.service';
import { PredictionService } from './services/prediction.service';
import { RiskMonitoringService } from './services/risk-monitoring.service';

// Entities
import { Milestone } from './entities/milestone.entity';
import { MilestoneWorkflow } from './entities/milestone-workflow.entity';
import { MilestoneEscalation } from './entities/milestone-escalation.entity';
import { MilestoneVerification } from './entities/milestone-verification.entity';
import { MilestoneEvidence } from './entities/milestone-evidence.entity';
import { MilestoneOwner } from './entities/milestone-owner.entity';
import { MilestoneStatusProbe } from './entities/milestone-status-probe.entity';
import { SuccessMilestone } from './entities/success-milestone.entity';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowState } from './entities/workflow-state.entity';
import { WorkflowOrchestration } from './entities/workflow-orchestration.entity';
import { WorkflowAdaptation } from './entities/workflow-adaptation.entity';
import { FinancingWorkflow } from './entities/financing-workflow.entity';
import { FinancingWorkflowInstance } from './entities/financing-workflow-instance.entity';
import { OnboardingWorkflow } from './entities/onboarding-workflow.entity';
import { PersonalizedWorkflow } from './entities/personalized-workflow.entity';
import { MilestonePrediction } from './entities/milestone-prediction.entity';

// DTOs
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CreateMilestoneEscalationDto } from './dto/create-milestone-escalation.dto';
import { UpdateMilestoneEscalationDto } from './dto/update-milestone-escalation.dto';
import { CreateMilestoneVerificationDto } from './dto/create-milestone-verification.dto';
import { UpdateMilestoneVerificationDto } from './dto/update-milestone-verification.dto';
import { CreateMilestoneEvidenceDto } from './dto/create-milestone-evidence.dto';
import { UpdateMilestoneEvidenceDto } from './dto/update-milestone-evidence.dto';
import { CreateMilestoneOwnerDto } from './dto/create-milestone-owner.dto';
import { UpdateMilestoneOwnerDto } from './dto/update-milestone-owner.dto';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // Event-Driven Architecture - Phase 1
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    // Authentication & Authorization
    AuthModule,
    // TypeORM Database Configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5435,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'milestone_workflows',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([
      Milestone,
      MilestoneWorkflow,
      MilestoneEscalation,
      MilestoneVerification,
      MilestoneEvidence,
      MilestoneOwner,
      MilestoneStatusProbe,
      SuccessMilestone,
      WorkflowDefinition,
      WorkflowInstance,
      WorkflowState,
      WorkflowOrchestration,
      WorkflowAdaptation,
      FinancingWorkflow,
      FinancingWorkflowInstance,
      OnboardingWorkflow,
      PersonalizedWorkflow,
      MilestonePrediction,
    ]),
    // Rate Limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
    // Scheduled Tasks
    ScheduleModule.forRoot(),
    // Phase 1 Integrations
    InvoiceIntegrationModule,
    PaymentIntegrationModule,
    AnalyticsIntegrationModule,
    MLServiceModule,
  ],
  controllers: [
    MilestoneController,
    WorkflowController,
    EscalationController,
    VerificationController,
    EvidenceController,
    WorkflowAdaptationController,
    PredictionController,
  ],
  providers: [
    MilestoneService,
    WorkflowService,
    EscalationService,
    VerificationService,
    EvidenceService,
    MilestoneOwnerService,
    MilestoneVisualizationService,
    VisualWorkflowDesignerService,
    WorkflowStateMachineService,
    SuccessMilestoneManagementService,
    ApprovalWorkflowService,
    InvoiceFinancingWorkflowService,
    WorkflowAdaptationService,
    PredictionService,
    RiskMonitoringService,
  ],
  exports: [
    MilestoneService,
    WorkflowService,
    EscalationService,
    VerificationService,
    EvidenceService,
    MilestoneOwnerService,
    MilestoneVisualizationService,
    VisualWorkflowDesignerService,
    WorkflowStateMachineService,
    SuccessMilestoneManagementService,
    ApprovalWorkflowService,
    InvoiceFinancingWorkflowService,
    WorkflowAdaptationService,
  ],
})
export class AppModule { }
