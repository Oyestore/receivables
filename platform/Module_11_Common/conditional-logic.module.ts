import { Module } from '@nestjs/common';
import { ConditionalLogicService } from './services/conditional-logic.service';

@Module({
  providers: [ConditionalLogicService],
  exports: [ConditionalLogicService],
})
export class ConditionalLogicModule {}

