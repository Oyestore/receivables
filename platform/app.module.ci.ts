import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdministrationModule } from './Module_12_Administration/src/administration.module';
import { AnalyticsModule } from './Module_04_Analytics_Reporting/code/analytics.module';
import { CreditScoringModule } from './Module_06_Credit_Scoring/src/credit-scoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'sme_platform'),
        synchronize: false,
        logging: false,
        entities: [],
      }),
      inject: [ConfigService],
    }),
    AdministrationModule,
    AnalyticsModule,
    CreditScoringModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModuleCI {}
