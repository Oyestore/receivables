import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { InvoiceIntegrationService } from './invoice-integration.service';
import { Milestone } from '../../entities/milestone.entity';
import { WorkflowInstance } from '../../entities/workflow-instance.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Milestone, WorkflowInstance]),
        HttpModule.register({
            timeout: 10000,
            maxRedirects: 5,
        }),
    ],
    providers: [InvoiceIntegrationService],
    exports: [InvoiceIntegrationService],
})
export class InvoiceIntegrationModule { }
