
import { NestFactory } from '@nestjs/core';
import { AppModuleE2E } from '../app.e2e.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

// Load env
dotenv.config();

// FORCE OVERRIDE for E2E
process.env.DB_PORT = '5438';
process.env.PGPORT = '5438';
process.env.DB_PASSWORD = 'postgres_password';
process.env.PGPASSWORD = 'postgres_password';
process.env.DATABASE_URL = 'postgresql://postgres:postgres_password@localhost:5438/sme_platform';
process.env.BACKEND_URL = 'http://localhost:3000';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.JWT_SECRET = 'e2e_secret_key';
process.env.VITE_API_BASE_URL = 'http://localhost:3000/api';

async function bootstrap() {
    const logger = new Logger('DI-Test');
    try {
        const app = await NestFactory.createApplicationContext(AppModuleE2E, { logger: ['error', 'warn'] });
        console.log('✅ AppModuleE2E initialized successfully!');
        await app.close();
    } catch (error) {
        console.error('❌ AppModuleE2E initialization failed:');
        if (error instanceof Error) {
            console.error(error.message);
            // console.error(error.stack);
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}
bootstrap();
