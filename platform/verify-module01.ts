import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceModule } from './Module_01_Invoice_Management/src/invoice.module';


async function verifyModule() {
    console.log('Starting Module 01 Verification...');

    try {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    ignoreEnvFile: true,
                    load: [() => ({
                        DATABASE_URL: 'postgres://test:test@localhost:5432/test',
                        NODE_ENV: 'test',
                        JWT_SECRET: 'test_secret',
                        REDIS_HOST: 'localhost',
                        REDIS_PORT: 6379,
                    })]
                }),
                TypeOrmModule.forRoot({
                    type: 'better-sqlite3',
                    database: ':memory:',
                    autoLoadEntities: true,
                    synchronize: true,
                    dropSchema: true,
                }),
                InvoiceModule,
            ],
        }).compile();

        const invoiceService = moduleRef.get('InvoiceService');
        // PDFService is not exported, so we can't get it from the module reference if we imported the module.
        // But if InvoiceService resolves, it means PDFService (its dependency) also resolved.

        if (invoiceService) {
            console.log('✅ InvoiceModule loaded successfully');
            console.log('✅ InvoiceService resolved');
        } else {
            console.error('❌ InvoiceService not resolved');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Module verification failed:', error);
        process.exit(1);
    }
}

verifyModule();
