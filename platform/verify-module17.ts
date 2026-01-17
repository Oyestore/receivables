import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module17ReconciliationGlModule } from './Module_17_Reconciliation_GL/src/module-17-reconciliation-gl.module';
import { GlPostingService } from './Module_17_Reconciliation_GL/src/services/gl-posting.service';
import { ReconciliationService } from './Module_17_Reconciliation_GL/src/services/reconciliation.service';
import { GlAccount } from './Module_17_Reconciliation_GL/src/entities/gl-account.entity';
import { JournalEntry } from './Module_17_Reconciliation_GL/src/entities/journal-entry.entity';
import { GlEntry } from './Module_17_Reconciliation_GL/src/entities/gl-entry.entity';
import { BankAccount } from './Module_17_Reconciliation_GL/src/entities/bank-account.entity';
import { BankTransaction } from './Module_17_Reconciliation_GL/src/entities/bank-transaction.entity';
import { ReconciliationMatch } from './Module_17_Reconciliation_GL/src/entities/reconciliation-match.entity';

async function bootstrap() {
    console.log('🚀 Starting Module 17 Verification...');

    try {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite', // Use sqlite for fast in-memory testing
                    database: ':memory:',
                    entities: [
                        GlAccount, JournalEntry, GlEntry, BankAccount, BankTransaction, ReconciliationMatch
                    ],
                    synchronize: true,
                    logging: false
                }),
                Module17ReconciliationGlModule
            ],
        }).compile();

        const app = moduleFixture.createNestApplication();
        await app.init();
        console.log('✅ Module 17 loaded successfully into NestJS context');

        // Test DI
        const glService = app.get(GlPostingService);
        const reconService = app.get(ReconciliationService);

        if (glService && reconService) {
            console.log('✅ Services injected successfully');
        } else {
            throw new Error('Service injection failed');
        }

        console.log('\n🎉 Verification Complete: Module 17 is structurally sound!');
        await app.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }
}

bootstrap();
