import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsIntegrationService } from './analytics-integration.service';
import { WorkflowInstance } from '../../entities/workflow-instance.entity';
import { Milestone } from '../../entities/milestone.entity';
import { WorkflowState } from '../../entities/workflow-state.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([WorkflowInstance, Milestone, WorkflowState]),
    ],
    providers: [AnalyticsIntegrationService],
    exports: [AnalyticsIntegrationService],
})
export class AnalyticsIntegrationModule { }
