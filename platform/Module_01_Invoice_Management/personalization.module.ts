import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageTemplate } from './entities/message-template.entity';
import { SenderProfile } from './entities/sender-profile.entity';
import { MessageHistory } from './entities/message-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageTemplate,
      SenderProfile,
      MessageHistory,
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class PersonalizationModule {}
