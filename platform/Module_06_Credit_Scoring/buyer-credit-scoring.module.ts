import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { BuyerProfile } from './buyer-profile.entity';
import { CreditAssessment } from './credit-assessment.entity';
import { RiskIndicator } from './risk-indicator.entity';
import { CreditLimit } from './credit-limit.entity';
import { CreditLimitApproval } from './credit-limit-approval.entity';
import { CreditLimitHistory } from './credit-limit-history.entity';
import { AssessmentDataSource } from './assessment-data-source.entity';
import { CreditScoreFactor } from './credit-score-factor.entity';
import { DefaultRiskAssessment } from './default-risk-assessment.entity';
import { RiskAssessment } from './risk-assessment.entity';
import { RiskRule } from './risk-rule.entity';
import { ScoringModel } from './scoring-model.entity';
import { RiskAlert } from './risk-alert.entity';
import { IndustryRiskProfile } from './industry-risk-profile.entity';
import { IndustryRiskFactor } from './industry-risk-factor.entity';
import { RegionalRiskAdjustment } from './regional-risk-adjustment.entity';
import { NetworkBuyerProfile } from './network-buyer-profile.entity';
import { TenantContribution } from './tenant-contribution.entity';
import { NetworkPaymentObservation } from './network-payment-observation.entity';
import { NetworkIntelligence } from './network-intelligence.entity';

// Services
import { CreditAssessmentService } from './credit-assessment.service';
import { ScoreCalculatorService } from './score-calculator.service';
import { DataCollectorService } from './data-collector.service';
import { AiRiskDetectionService } from './ai-risk-detection.service';
import { CreditLimitService } from './credit-limit.service';
import { CreditLimitCalculationService } from './credit-limit-calculation.service';
import { IndustryScoringService } from './industry-scoring.service';
import { IndustryRiskProfileService } from './industry-risk-profile.service';
import { RiskRuleService } from './risk-rule.service';
import { RiskAlertService } from './risk-alert.service';
import { RiskIndicatorMonitoringService } from './risk-indicator-monitoring.service';
import { AutonomousRiskManagementService } from './autonomous-risk-management.service';
import { SubscriptionManagementService } from './subscription-management.service';
import { DynamicTermsManagementService } from './dynamic-terms-management.service';
import { CreditRiskVisualizationService } from './credit-risk-visualization.service';
import { RiskAssessmentService } from './risk-assessment.service';
import { NetworkCreditIntelligenceService } from './network-credit-intelligence.service';
import { NetworkPatternDetectionService } from './network-pattern-detection.service';

// Controllers
import { CreditScoringController } from './credit-scoring.controller';
import { CreditLimitController } from './credit-limit.controller';
import { SubscriptionController } from './subscription.controller';
import { DynamicTermsController } from './dynamic-terms.controller';
import { CreditRiskVisualizationController } from './credit-risk-visualization.controller';
import { NetworkCreditIntelligenceController } from './network-credit-intelligence.controller';

@Module({
    imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([
            BuyerProfile,
            CreditAssessment,
            RiskIndicator,
            CreditLimit,
            CreditLimitApproval,
            CreditLimitHistory,
            AssessmentDataSource,
            CreditScoreFactor,
            DefaultRiskAssessment,
            RiskAssessment,
            RiskRule,
            ScoringModel,
            RiskAlert,
            IndustryRiskProfile,
            IndustryRiskFactor,
            RegionalRiskAdjustment,
            // Network Effect Entities (10x Feature)
            NetworkBuyerProfile,
            TenantContribution,
            NetworkPaymentObservation,
            NetworkIntelligence
        ])
    ],
    controllers: [
        CreditScoringController,
        CreditLimitController,
        SubscriptionController,
        DynamicTermsController,
        CreditRiskVisualizationController,

        // Network Effect Controller (10x Feature)
        NetworkCreditIntelligenceController
    ],
    providers: [
        // Core Services
        CreditAssessmentService,
        ScoreCalculatorService,
        DataCollectorService,

        // Risk Management Services
        AiRiskDetectionService,
        CreditLimitService,
        CreditLimitCalculationService,
        IndustryScoringService,
        IndustryRiskProfileService,
        RiskRuleService,
        RiskAlertService,
        RiskIndicatorMonitoringService,
        RiskAssessmentService,
        AutonomousRiskManagementService,

        // Advanced Enhancement Services
        SubscriptionManagementService,
        DynamicTermsManagementService,
        CreditRiskVisualizationService,

        // Network Effect Services (10x Feature)
        NetworkCreditIntelligenceService,
        NetworkPatternDetectionService
    ],
    exports: [
        // Core Services
        CreditAssessmentService,
        ScoreCalculatorService,
        DataCollectorService,

        // Risk Management Services
        AiRiskDetectionService,
        CreditLimitService,
        IndustryScoringService,
        RiskRuleService,
        RiskAlertService,
        RiskAssessmentService,

        // Advanced Enhancement Services
        SubscriptionManagementService,
        DynamicTermsManagementService,
        CreditRiskVisualizationService,

        // Network Effect Services (10x Feature - Platform Moat)
        NetworkCreditIntelligenceService,
        NetworkPatternDetectionService
    ]
})
export class BuyerCreditScoringModule { }