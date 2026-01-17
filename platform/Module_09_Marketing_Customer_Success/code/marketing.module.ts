import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Lead } from './entities/lead.entity';
import { LeadService } from './services/lead.service';
import { LeadController } from './controllers/lead.controller';
import { OnboardingWorkflow } from './entities/onboarding-workflow.entity';
import { OnboardingStep } from './entities/onboarding-step.entity';
import { OnboardingService } from './services/onboarding.service';
import { OnboardingController } from './controllers/onboarding.controller';
import { Campaign } from './entities/campaign.entity';
import { CampaignService } from './services/campaign.service';
import { CampaignController } from './controllers/campaign.controller';
import { CustomerHealth } from './entities/customer-health.entity';
import { CustomerSuccessService } from './services/customer-success.service';
import { NotificationIntegrationService } from './services/notification-integration.service';
import { AnalyticsIntegrationService } from './services/analytics-integration.service';
import { CommonModule } from '../../Module_11_Common/common.module';
import { DistributionModule } from '../../Module_02_Intelligent_Distribution/src/distribution.module';

import { VerificationRequest } from './entities/verification-request.entity';
import { VerificationService } from './services/verification.service';
import { VerificationController } from './controllers/verification.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Lead,
            OnboardingWorkflow,
            OnboardingStep,
            Campaign,
            CustomerHealth,
            VerificationRequest // New Entity
        ]),
        ScheduleModule.forRoot(),
        CommonModule,
        DistributionModule,
    ],
    controllers: [
        LeadController,
        CampaignController,
        OnboardingController,
        VerificationController // New Controller
    ],
    providers: [
        LeadService,
        OnboardingService,
        CampaignService,
        CustomerSuccessService,
        NotificationIntegrationService,
        AnalyticsIntegrationService,
        VerificationService // New Service
    ],
    exports: [
        LeadService,
        OnboardingService,
        CampaignService,
        CustomerSuccessService,
        NotificationIntegrationService,
        AnalyticsIntegrationService,
        VerificationService
    ],
})
export class MarketingModule { }
