import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentIntegrationService } from './payment-integration.service';
import { Milestone } from '../../entities/milestone.entity';
import { MilestoneVerification } from '../../entities/milestone-verification.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Milestone, MilestoneVerification]),
        HttpModule.register({
            timeout: 10000,
            maxRedirects: 5,
        }),
    ],
    providers: [PaymentIntegrationService],
    exports: [PaymentIntegrationService],
})
export class PaymentIntegrationModule { }
