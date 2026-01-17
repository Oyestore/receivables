import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MilestoneModule } from './Module_05_Milestone_Workflows/src/milestone.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      synchronize: true,
      logging: false,
      entities: [],
    }),
    MilestoneModule,
  ],
})
export class AppModuleTest {}
