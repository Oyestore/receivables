import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipientContact } from './entities/recipient-contact.entity';
import { DistributionRecord } from './entities/distribution-record.entity';
import { RecipientContactService } from './services/recipient-contact.service';
import { RecipientContactController } from './controllers/recipient-contact.controller';
import { DistributionRecordService } from './services/distribution-record.service';
import { DistributionRecordController } from './controllers/distribution-record.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecipientContact,
      DistributionRecord,
    ]),
  ],
  controllers: [
    RecipientContactController,
    DistributionRecordController
  ],
  providers: [
    RecipientContactService,
    DistributionRecordService
  ],
  exports: [
    RecipientContactService,
    DistributionRecordService
  ],
})
export class DistributionModule {}
