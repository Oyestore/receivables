import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const logger = new Logger('Module04Verification');
    try {
        const app = await NestFactory.createApplicationContext(AppModule);
        logger.log('Module 04 (Analytics) loaded successfully!');

        const dashboardService = app.get('DashboardService');
        if (dashboardService) {
            logger.log('DashboardService resolved successfully.');
        } else {
            logger.error('DashboardService failed to resolve.');
        }

        const reportService = app.get('ReportService');
        if (reportService) {
            logger.log('ReportService resolved successfully.');
        } else {
            logger.error('ReportService failed to resolve.');
        }

        await app.close();
        process.exit(0);
    } catch (error) {
        logger.error('Failed to load Module 04', error);
        process.exit(1);
    }
}
bootstrap();
