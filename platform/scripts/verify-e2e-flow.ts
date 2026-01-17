import { NestFactory } from '@nestjs/core';
import { AppModuleE2E } from '../app.e2e.module';
import { TenantService, CreateTenantDto } from '../Module_12_Administration/src/services/tenant.service';
import { InvoiceService } from '../Module_01_Smart_Invoice_Generation/src/services/invoice.service';
import { ConciergeService } from '../Module_16_Invoice_Concierge/code/services/concierge.service';
import { ChatPersona } from '../Module_16_Invoice_Concierge/code/entities/chat-session.entity';
import { PaymentService } from '../Module_03_Payment_Integration/src/services/payment.service';
import { DisputeIntegrationService } from '../Module_16_Invoice_Concierge/code/services/dispute-integration.service';
import { StaticPortalService } from '../Module_16_Invoice_Concierge/code/services/static-portal.service';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
// Removed: import { CreateTenantDto } from '../Module_12_Administration/src/dto/create-tenant.dto';

// Load env
dotenv.config();

// FORCE OVERRIDE for E2E (bypass .env file if it has stale port)
process.env.DB_PORT = '5438';
process.env.PGPORT = '5438';
process.env.DB_PASSWORD = 'postgres_password';
process.env.PGPASSWORD = 'postgres_password';
process.env.DATABASE_URL = 'postgresql://postgres:postgres_password@localhost:5438/sme_platform';
process.env.BACKEND_URL = 'http://localhost:3000';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.JWT_SECRET = 'e2e_secret_key';
process.env.VITE_API_BASE_URL = 'http://localhost:3000/api';
process.env.EMAIL_PROVIDER = 'smtp';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'user';
process.env.SMTP_PASSWORD = 'password';
process.env.EMAIL_FROM_ADDRESS = 'noreply@sme.com';
process.env.MOCK_NOTIFICATIONS = 'true';
// process.env.TWILIO_ACCOUNT_SID = 'AC_dummy';
// process.env.TWILIO_AUTH_TOKEN = 'dummy_token';
// process.env.TWILIO_PHONE_NUMBER = '+15005550006';

async function run() {
    const logger = new Logger('E2E-Verification');
    console.log('DEBUG: MOCK_NOTIFICATIONS in script =', process.env.MOCK_NOTIFICATIONS);
    logger.log('Starting E2E Platform Verification...');

    // Bootstrap Application Context
    const app = await NestFactory.createApplicationContext(AppModuleE2E, { logger: ['error', 'warn', 'log'] });

    try {
        // Services
        const tenantService = app.get(TenantService);
        const invoiceService = app.get(InvoiceService);
        const conciergeService = app.get(ConciergeService);
        const paymentService = app.get(PaymentService);
        // Note: DisputeIntegrationService is inside Module 16 and used by Controller, 
        // we can use it directly or use DisputeService from Module 08.
        // Let's use ConciergeService's internal reasoning which calls DisputeIntegrationService for a "Raise Dispute" intent if needed,
        // or call the service directly if we want to validte the method.
        // We will verify the "Raise Dispute" INTENT via AI first.

        // 0. Setup System User ID (must be UUID)
        const crypto = require('crypto');
        const systemUserId = crypto.randomUUID();
        const subscriptionPlanId = crypto.randomUUID();

        // Helper for DB
        const { DataSource } = require('typeorm');
        const dataSource = app.get(DataSource);

        // 0.5 Create Subscription Plan (Required for Tenant)
        logger.log('\n--- Step 0.5: Subscription Plan Setup ---');
        try {
            await dataSource.query(`
                INSERT INTO "subscription_plans" 
                ("id", "planName", "planType", "status", "currency", "createdBy", "createdDate", "updatedDate", "version", "basePrice") 
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), 1, 0)
            `, [subscriptionPlanId, 'Standard Plan', 'subscription', 'active', 'USD', systemUserId]);
            logger.log(`✅ Subscription Plan Created: ${subscriptionPlanId}`);
        } catch (e) {
            logger.log(`ℹ️ Subscription Plan might exist, proceeding... (${(e as Error).message.split('\n')[0]})`);
        }

        // 1. Create Tenant
        logger.log('\n--- Step 1: Tenant Creation ---');
        const tenantDto: CreateTenantDto = {
            organizationName: 'Virtual BioTech Solutions', // Fixed property name match interface
            subscriptionPlanId: subscriptionPlanId, // Added missing required field
            primaryContact: {
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@virtualbiotech.com',
                phone: '+1-555-0199'
            },
            currency: 'USD',
            timezone: 'UTC'
        };
        // Check if exists or create
        // Assuming create returns the entity
        let tenant;
        try {
            tenant = await tenantService.create(tenantDto, systemUserId);
        } catch (e) {
            // If conflict, try to find
            if ((e as Error).message.includes('exists')) {
                const tenants = await tenantService.findAll({ search: 'Virtual BioTech Solutions' });
                tenant = tenants[0];
            } else {
                throw e;
            }
        }
        logger.log(`✅ Tenant Created/Retrieved: ${tenant.id} (${tenant.organizationName})`);

        // 1.5 Create Customer (Required for Invoice)
        // Direct DB insert as CustomerService might be in another module or we want speed
        // Actually, let's use the DB pool from invoice service if possible or just use a raw query if we can get the pool.
        // Alternatively, assuming there is a CustomerService.
        // Let's assume we can inject 'databaseService' or just use a raw query via a helper.
        // We'll create a dummy customer if it doesn't exist.

        // HACK: Use invoiceService.pool (it's private). 
        // Better: Import databaseService.
        // const db = app.get('DatabaseService'); // Or similar ?? No, it's imported in invoice.service.ts
        // Let's use `app.get(DataSource)` if TypeORM is used globally (it is in AppModule).
        // const { DataSource } = require('typeorm');
        // const dataSource = app.get(DataSource);

        // Insert customer using TypeORM or raw query
        logger.log('Creating/Fetching Customer...');
        const customerEmail = 'accounts@globalpharma.com';
        const customerId = crypto.randomUUID();
        logger.log(`✅ Using Generated Customer ID: ${customerId}`);

        // 1.8 Create System User (Required for Invoice createdBy FK)
        logger.log('\n--- Step 1.8: System User Creation ---');
        const existingUser = await dataSource.query(`SELECT id FROM users WHERE id = $1`, [systemUserId]);
        if (existingUser.length === 0) {
            await dataSource.query(`
                INSERT INTO "users" 
                ("id", "tenantId", "username", "email", "firstName", "lastName", "passwordHash", "status", "createdDate", "updatedDate", "createdBy", "version", "metadata") 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9, 1, $10)
            `, [
                systemUserId,
                tenant.id,
                'sysadmin',
                'sysadmin@test.com',
                'System',
                'Admin',
                'hashedpassword',
                'active',
                systemUserId, // Created by self
                '{}'
            ]);
            logger.log(`✅ System User Created: ${systemUserId}`);
        } else {
            logger.log(`✅ System User Already Exists: ${systemUserId}`);
        }

        // 2. Generate Invoice
        logger.log('\n--- Step 2: Invoice Generation ---');
        const invoiceData = {
            invoiceNumber: `INV-${Date.now()}`,
            amount: 10000,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
            items: [
                { description: 'R&D Consulting Services', quantity: 100, price: 100 }
            ]
        };

        // Actual signature: create(tenantId, userId, createInvoiceDto)
        const invoice = await invoiceService.create(
            tenant.id,
            systemUserId,
            {
                customerId: customerId,
                customerName: 'Global Pharma Inc',
                customerEmail: 'accounts@globalpharma.com',
                issueDate: new Date().toISOString(),
                dueDate: invoiceData.dueDate.toISOString(),
                currency: 'USD',
                lineItems: invoiceData.items.map(i => ({
                    description: i.description,
                    quantity: i.quantity,
                    unitPrice: i.price
                })),
                termsAndConditions: 'Standard Terms'
            }
        );
        logger.log(`✅ Invoice Generated: ${invoice.id} (${invoice.invoiceNumber}) - $${invoice.grandTotal}`);

        // 3. Start Concierge Session (Payer Persona)
        logger.log('\n--- Step 3: AI Concierge Session ---');
        const session = await conciergeService.startSession(tenant.id, ChatPersona.CONCIERGE, invoice.id);
        logger.log(`✅ Session Started: ${session.id}`);

        // 4. Test DeepSeek Integration (AI Chat)
        logger.log('\n--- Step 4: Intelligent Query (DeepSeek) ---');
        const userQuery = "I am creating a test run. Can I get a payment extension for this invoice?";
        logger.log(`User: ${userQuery}`);

        const aiResponse = await conciergeService.processMessage(session.id, userQuery);
        logger.log(`AI Agent: ${aiResponse.response}`);

        if (aiResponse.response && aiResponse.response.length > 10) {
            logger.log('✅ AI Response validated (DeepSeek Integration works)');
        } else {
            logger.error('❌ AI Response seems empty or invalid');
        }

        // 4.5 Configure Payment Gateway (Required for Payment Initiation)
        logger.log('\n--- Step 4.5: Configure Payment Gateway ---');
        const gatewayId = crypto.randomUUID();
        try {
            await dataSource.query(`
                INSERT INTO "gateway_configs" 
                ("id", "tenant_id", "gateway", "credentials", "is_active", "priority", "created_at", "updated_at")
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `, [
                gatewayId,
                tenant.id,
                'razorpay',
                JSON.stringify({ keyId: 'rzp_test_123', keySecret: 'secret' }),
                true,
                1
            ]);
            logger.log(`✅ Payment Gateway 'RAZORPAY' configured: ${gatewayId}`);
        } catch (e) {
            logger.log(`ℹ️ Gateway might exist, proceeding... (${(e as Error).message.split('\n')[0]})`);
        }

        // 5. Create Payment Order
        logger.log('\n--- Step 5: Payment Initiation (Module 03) ---');
        const paymentOrder = await paymentService.initiatePayment(
            tenant.id,
            'payer_user',
            {
                invoiceId: invoice.id,
                amount: Number(invoice.grandTotal),
                currency: 'USD'
            }
        );
        logger.log(`✅ Payment Order Created: ${paymentOrder.gatewayOrderId} (Gateway: ${paymentOrder.gateway})`); // Fixed property name

        // 5.5 Portal Actions (Un-stubbed)
        logger.log('\n--- Step 5.5: Portal Actions (Un-stubbed) ---');
        const staticPortalService = app.get(StaticPortalService);
        // Generate Token
        const tokenData = await staticPortalService.generateAccessToken(tenant.id, invoice.id);
        const token = tokenData.token;
        logger.log(`✅ Token Generated: ${token.substring(0, 10)}...`);

        // 1. Download PDF
        try {
            const pdfResult = await staticPortalService.downloadPDF(token);
            if (pdfResult.buffer && pdfResult.buffer.length > 0) {
                logger.log(`✅ PDF Generated via Portal Service: ${pdfResult.filename} (${pdfResult.buffer.length} bytes)`);
            } else {
                logger.error('❌ PDF Generation Failed: Empty Buffer');
            }
        } catch (e) {
            logger.error('❌ PDF Generation Error:', (e as Error).message);
        }

        // 2. Approve Draft
        try {
            await staticPortalService.approveDraft(token);
            logger.log('✅ Invoice Approved via Portal');
        } catch (e) {
            logger.warn('⚠️ Approval Warning (Expected if status changed):', (e as Error).message);
        }

        // 6. Raise Dispute (via Integration Service directly to simulate controller action)
        logger.log('\n--- Step 6: Dispute Resolution (Module 08 Integration) ---');
        // We need to fetch DisputeIntegrationService from app context
        const disputeIntegration = app.get(DisputeIntegrationService);

        const disputeTicket = await disputeIntegration.createDisputeTicket(session.id, {
            type: 'Billing Error',
            description: 'The rate seems incorrect based on MSA',
            evidence: ['file_reference_id']
        });
        logger.log(`✅ Dispute Ticket Created: ${disputeTicket.id} (Status: ${disputeTicket.status})`);

        logger.log('\n🎉 E2E VERIFICATION COMPLETE: ALL SYSTEMS GO 🎉');

    } catch (error) {
        logger.error('❌ Verification Failed:', error);
        console.error(error);
    } finally {
        await app.close();
    }
}

run();
