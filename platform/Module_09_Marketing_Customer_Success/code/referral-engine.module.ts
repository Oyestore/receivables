import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralReward } from './entities/referral-reward.entity';
import { ReferralService } from './services/referral.service';
import { ReferralController } from './controllers/referral.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([ReferralReward]),
    ],
    controllers: [ReferralController],
    providers: [ReferralService],
    exports: [ReferralService],
})
export class ReferralEngineModule { }
