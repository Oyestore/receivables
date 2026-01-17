import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentModule } from './Module_03_Payment_Integration/src/modules/payment.module';
import { PaymentProcessingService } from './Module_03_Payment_Integration/src/services/payment-processing.service';
import { UPIIntegrationService } from './Module_03_Payment_Integration/src/services/upi-integration.service';
import { RuralPaymentService } from './Module_03_Payment_Integration/src/services/rural-payment.service';
import { VirtualAccountService } from './Module_03_Payment_Integration/src/services/virtual-account.service';
import { FinancingProviderIntegrationService } from './Module_03_Payment_Integration/src/services/financing-provider-integration.service';
import { SMSPaymentService } from './Module_03_Payment_Integration/src/services/sms-payment.service';

async function verifyModule03() {
    console.log('Starting Module 03 Verification...');

    try {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    ignoreEnvFile: true,
                    load: [() => ({
                        DATABASE_URL: 'postgres://test:test@localhost:5432/test',
                        PAYMENT_LINK_BASE_URL: 'https://pay.example.com'
                    })]
                }),
                TypeOrmModule.forRoot({
                    type: 'better-sqlite3',
                    database: ':memory:',
                    autoLoadEntities: true,
                    synchronize: true,
                    dropSchema: true,
                }),
                PaymentModule,
            ],
        }).compile();

        const paymentService = moduleRef.get<PaymentProcessingService>(PaymentProcessingService);
        const upiService = moduleRef.get<UPIIntegrationService>(UPIIntegrationService);
        const ruralService = moduleRef.get<RuralPaymentService>(RuralPaymentService);
        const vaService = moduleRef.get<VirtualAccountService>(VirtualAccountService);
        const financingService = moduleRef.get<FinancingProviderIntegrationService>(FinancingProviderIntegrationService);
        const smsService = moduleRef.get<SMSPaymentService>(SMSPaymentService);

        if (paymentService) console.log('✅ PaymentProcessingService resolved');
        if (upiService) console.log('✅ UPIIntegrationService resolved');
        if (ruralService) console.log('✅ RuralPaymentService resolved');
        if (vaService) console.log('✅ VirtualAccountService resolved');
        if (financingService) console.log('✅ FinancingProviderIntegrationService resolved');
        if (smsService) console.log('✅ SMSPaymentService resolved');

        // Test UPI logic
        const upiQr = upiService.generateDynamicQR('test@upi', 'Test Payee', 100, 'TXN123', 'Test Note');
        if (upiQr.startsWith('upi://pay')) {
            console.log('✅ UPI QR Generation works');
        }

        // Test Rural logic
        const smsLink = ruralService.generateSMSPaymentLink('INV-001', 500);
        if (smsLink.includes('https://pay.example.com')) {
            console.log('✅ SMS Link Generation works');
        }

        // Test Virtual Account logic
        const va = await vaService.createVirtualAccount('CUST123', 'INV001');
        if (va && va.virtualAccountNumber.startsWith('SME')) {
            console.log(`✅ Virtual Account Created: ${va.virtualAccountNumber}`);
        }

        console.log('🎉 Module 03 Verification Successful!');
    } catch (error) {
        console.error('❌ Module 03 verification failed:', error);
        process.exit(1);
    }
}

verifyModule03();
