import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministrationModule } from './Module_12_Administration/src/administration.module';
import { InvoiceModule } from './Module_01_Smart_Invoice_Generation/src/invoice.module';
import { PaymentModule } from './Module_03_Payment_Integration/src/payment.module';
import { ConciergeModule } from './Module_16_Invoice_Concierge/code/concierge.module';
import { CommonModule } from './Module_11_Common/common.module';
import { OrchestrationHubModule } from './Module_10_Orchestration_Hub/src/orchestration-hub.module';
import { WorkflowEntity, WorkflowExecutionEntity } from './Module_10_Orchestration_Hub/src/entities/workflow.entity';

@Module({
    imports: [
        // Global configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
            cache: true,
        }),

        // Database configuration
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const url = configService.get<string>('DATABASE_URL');
                console.log('🔍 E2E CONNECTION URL:', url); // DEBUG
                // Ensure we use the forced port from process.env if set, or fall back to standard config
                // In verify-e2e-flow.ts we set process.env.DATABASE_URL

                // Define minimal entities required for E2E
                const entities = [
                    __dirname + '/Module_01_Smart_Invoice_Generation/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_12_Administration/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_03_Payment_Integration/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_11_Common/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_16_Invoice_Concierge/code/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_16_Invoice_Concierge/code/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_10_Orchestration_Hub/src/entities/**/*.entity.{ts,js}',
                    __dirname + '/Module_06_Credit_Scoring/src/entities/**/*.entity.{ts,js}', // Added Module 06
                    __dirname + '/Module_08_Dispute_Resolution_&_Legal_Network/code/entities/**/*.entity.{ts,js}', // Added Module 08 just in case
                    WorkflowEntity,
                    WorkflowExecutionEntity,
                ];

                return {
                    type: 'postgres',
                    url: url || 'postgresql://postgres:postgres_password@localhost:5438/sme_platform',
                    entities,
                    synchronize: true, // Enable sync to create missing tables
                    logging: ['error', 'warn'],
                };
            },
            inject: [ConfigService],
        }),

        // Core Modules for E2E
        AdministrationModule,
        CommonModule,
        InvoiceModule,
        PaymentModule,
        OrchestrationHubModule,
        ConciergeModule,
    ],
})
export class AppModuleE2E { }
