import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { CreditDecision } from './entities/credit-decision.entity';
import { DecisionRule } from './entities/decision-rule.entity';
import { DecisionWorkflow } from './entities/decision-workflow.entity';
import { ManualReview } from './entities/manual-review.entity';

// Services
import { CreditDecisionService } from './services/credit-decision.service';
import { DecisionRuleService } from './services/decision-rule.service';
import { DecisionWorkflowService } from './services/decision-workflow.service';
import { ManualReviewService } from './services/manual-review.service';

// Controllers
import { CreditDecisionController } from './controllers/credit-decision.controller';
import { DecisionRuleController } from './controllers/decision-rule.controller';
import { DecisionWorkflowController } from './controllers/decision-workflow.controller';
import { ManualReviewController } from './controllers/manual-review.controller';

// DTOs
import { CreateCreditDecisionDto } from './dto/create-credit-decision.dto';
import { CreateDecisionRuleDto } from './dto/create-decision-rule.dto';
import { UpdateDecisionRuleDto } from './dto/update-decision-rule.dto';
import { CreateManualReviewDto } from './dto/create-manual-review.dto';

/**
 * Module 15: Credit Decisioning Module
 * 
 * This module provides comprehensive credit decisioning functionality
 * including automated credit scoring, decision rules, workflow management,
 * and manual review processes.
 * 
 * Key Features:
 * - Automated credit decisioning with ML models
 * - Configurable decision rules and workflows
 * - Manual review queue and management
 * - Risk assessment and credit scoring
 * - Decision audit trail and compliance
 * - Real-time decision processing
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.production'],
    }),
    TypeOrmModule.forFeature([
      CreditDecision,
      DecisionRule,
      DecisionWorkflow,
      ManualReview,
    ]),
  ],
  controllers: [
    CreditDecisionController,
    DecisionRuleController,
    DecisionWorkflowController,
    ManualReviewController,
  ],
  providers: [
    CreditDecisionService,
    DecisionRuleService,
    DecisionWorkflowService,
    ManualReviewService,
  ],
  exports: [
    CreditDecisionService,
    DecisionRuleService,
    DecisionWorkflowService,
    ManualReviewService,
  ],
})
export class CreditDecisioningModule {}
