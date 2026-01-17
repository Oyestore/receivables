import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';

// Entities
import { DistributionRule, DistributionAssignment } from './entities/distribution-entities';
import { DistributionRecord, DistributionStatus } from './entities/distribution-record.entity';
import { RecipientContact, CommunicationChannel } from './entities/recipient-contact.entity';
import { FollowUpRule, TriggerType } from './entities/follow-up-rule.entity';
import { FollowUpSequence } from './entities/follow-up-sequence.entity';
import { FollowUpStep } from './entities/follow-up-step.entity';
import { SenderProfile } from './entities/sender-profile.entity';

// Services
import { DistributionService } from './services/distribution.service';
import { DistributionRecordService } from './services/distribution-record.service';
import { RecipientContactService } from './services/recipient-contact.service';
import { FollowUpEngineService } from './services/follow-up-engine.service';
import { FollowUpRuleService } from './services/follow-up-rule.service';
import { FollowUpSequenceService } from './services/follow-up-sequence.service';
import { EmailService } from './services/email.service';
import { SMSService } from './services/sms.service';
import { WhatsAppService } from './services/whatsapp.service';
import { DistributionQueueService } from './services/distribution-queue.service';
import { DistributionOrchestratorService } from './services/distribution-orchestrator.service';
import { DynamicPricingService } from './services/dynamic-pricing.service';
import { SmbMetricsService } from './services/smb-metrics.service';
// New Gap Implementations
import { ChannelOptimizationService } from './services/channel-optimization.service';
import { TrackingService } from './services/tracking.service';
import { PhysicalMailService } from './services/physical-mail.service';

// Enhanced ML and Analytics Services
import { EnhancedMLRuleOptimizationService } from './services/enhanced-ml-rule-optimization.service';
import { AdvancedChannelOptimizationService } from './services/advanced-channel-optimization.service';
import { CrossModuleIntelligenceService } from './services/cross-module-intelligence.service';
import { EnhancedRealTimeAnalyticsService } from './services/enhanced-real-time-analytics.service';
import { MobileOptimizationService } from './services/mobile-optimization.service';
import { AIAssistantService } from './services/ai-assistant.service';

// ... (Controllers and DTOs remain same)

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      // Core distribution entities
      DistributionRule,
      DistributionAssignment,
      // Original entities
      DistributionRecord,
      RecipientContact,
      FollowUpRule,
      FollowUpSequence,
      FollowUpStep,
      SenderProfile,
    ]),
    BullModule.registerQueue({
      name: 'distribution',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),
  ],
  controllers: [
    DistributionController,
    DistributionRecordController,
    RecipientContactController,
  ],
  providers: [
    // Core services
    DistributionService,
    DistributionQueueService,
    DistributionOrchestratorService,
    // External service integrations
    EmailService,
    SMSService,
    WhatsAppService,
    // Original services
    DistributionRecordService,
    RecipientContactService,
    FollowUpEngineService,
    FollowUpRuleService,
    FollowUpSequenceService,
    // AI/ML Services
    DynamicPricingService,
    SmbMetricsService,
    // Gap Services
    ChannelOptimizationService,
    TrackingService,
    PhysicalMailService,
    // Enhanced ML and Analytics Services
    EnhancedMLRuleOptimizationService,
    AdvancedChannelOptimizationService,
    CrossModuleIntelligenceService,
    EnhancedRealTimeAnalyticsService,
    MobileOptimizationService,
    AIAssistantService,
  ],
  exports: [
    DistributionService,
    DistributionQueueService,
    DistributionOrchestratorService,
    DistributionRecordService,
    RecipientContactService,
    FollowUpEngineService,
    ChannelOptimizationService,
    TrackingService,
    PhysicalMailService,
    EnhancedMLRuleOptimizationService,
    AdvancedChannelOptimizationService,
    CrossModuleIntelligenceService,
    EnhancedRealTimeAnalyticsService,
    MobileOptimizationService,
    AIAssistantService,
  ],
})
export class DistributionModule { }
