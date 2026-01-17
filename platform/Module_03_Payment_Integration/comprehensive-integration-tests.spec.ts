/**
 * Comprehensive Integration Testing Suite for SME Receivables Management Platform
 * Coverage: Cross-Module Interactions and Data Flow Validation
 * 
 * This test suite validates module interactions, API integrations, and
 * end-to-end workflows across all 11 modules with real database transactions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

// Import all entities for integration testing
import { InvoiceEntity } from '../module_01_invoice_generation/entities/invoice.entity';
import { CustomerEntity } from '../module_02_crm/entities/customer.entity';
import { PaymentEntity } from '../module_03_payment_integration/entities/payment.entity';
import { CreditRatingEntity } from '../module_04_credit_rating/entities/credit-rating.entity';
import { DunningCampaignEntity } from '../module_05_dunning_collections/entities/dunning-campaign.entity';
import { FinancialReportEntity } from '../module_06_financial_reporting/entities/financial-report.entity';
import { WorkflowEntity } from '../module_07_workflow_automation/entities/workflow.entity';
import { ComplianceEntity } from '../module_08_legal_compliance/entities/compliance.entity';
import { TenantEntity } from '../module_09_multi_tenant/entities/tenant.entity';
import { TenantManagementEntity } from '../module_11_administrative_hub/entities/tenant-management.entity';

// Import all services for integration testing
import { InvoiceService } from '../module_01_invoice_generation/services/invoice.service';
import { CustomerService } from '../module_02_crm/services/customer.service';
import { PaymentService } from '../module_03_payment_integration/services/payment.service';
import { CreditRatingService } from '../module_04_credit_rating/services/credit-rating.service';
import { DunningService } from '../module_05_dunning_collections/services/dunning.service';
import { ReportingService } from '../module_06_financial_reporting/services/reporting.service';
import { WorkflowService } from '../module_07_workflow_automation/services/workflow.service';
import { ComplianceService } from '../module_08_legal_compliance/services/compliance.service';
import { TenantService } from '../module_09_multi_tenant/services/tenant.service';
import { APIGatewayService } from '../module_10_api_gateway/services/api-gateway.service';
import { TenantManagementService } from '../module_11_administrative_hub/services/tenant-management.service';

// Import event handlers and processors
import { InvoiceEventHandler } from '../shared/events/invoice.events';
import { PaymentEventHandler } from '../shared/events/payment.events';
import { WorkflowProcessor } from '../shared/processors/workflow.processor';
import { NotificationProcessor } from '../shared/processors/notification.processor';

describe('SME Platform - Comprehensive Integration Testing Suite', () => {
  let app: INestApplication;
  let module: TestingModule;
  let dataSource: DataSource;
  
  // Repository instances for direct database operations
  let invoiceRepository: Repository<InvoiceEntity>;
  let customerRepository: Repository<CustomerEntity>;
  let paymentRepository: Repository<PaymentEntity>;
  let tenantRepository: Repository<TenantEntity>;
  
  // Service instances for integration testing
  let invoiceService: InvoiceService;
  let customerService: CustomerService;
  let paymentService: PaymentService;
  let creditRatingService: CreditRatingService;
  let dunningService: DunningService;
  let reportingService: ReportingService;
  let workflowService: WorkflowService;
  let complianceService: ComplianceService;
  let tenantService: TenantService;
  let apiGatewayService: APIGatewayService;
  let tenantManagementService: TenantManagementService;

  // Test data
  let testTenant: TenantEntity;
  let testCustomer: CustomerEntity;
  let testInvoice: InvoiceEntity;
  let testUser: any;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.integration'
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.INTEGRATION_DB_HOST || 'localhost',
          port: parseInt(process.env.INTEGRATION_DB_PORT) || 5432,
          username: process.env.INTEGRATION_DB_USERNAME || 'integration',
          password: process.env.INTEGRATION_DB_PASSWORD || 'integration',
          database: process.env.INTEGRATION_DB_NAME || 'sme_platform_integration',
          entities: [
            InvoiceEntity, CustomerEntity, PaymentEntity, CreditRatingEntity,
            DunningCampaignEntity, FinancialReportEntity, WorkflowEntity,
            ComplianceEntity, TenantEntity, TenantManagementEntity
          ],
          synchronize: true,
          dropSchema: true,
          logging: ['error']
        }),
        TypeOrmModule.forFeature([
          InvoiceEntity, CustomerEntity, PaymentEntity, CreditRatingEntity,
          DunningCampaignEntity, FinancialReportEntity, WorkflowEntity,
          ComplianceEntity, TenantEntity, TenantManagementEntity
        ]),
        JwtModule.register({
          secret: 'integration-test-secret',
          signOptions: { expiresIn: '1h' }
        }),
        CacheModule.register({
          isGlobal: true,
          ttl: 300
        }),
        EventEmitterModule.forRoot(),
        BullModule.forRoot({
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379
          }
        }),
        BullModule.registerQueue(
          { name: 'workflow' },
          { name: 'notification' },
          { name: 'payment' },
          { name: 'dunning' }
        )
      ],
      providers: [
        InvoiceService, CustomerService, PaymentService, CreditRatingService,
        DunningService, ReportingService, WorkflowService, ComplianceService,
        TenantService, APIGatewayService, TenantManagementService,
        InvoiceEventHandler, PaymentEventHandler,
        WorkflowProcessor, NotificationProcessor
      ]
    }).compile();

    app = module.createNestApplication();
    await app.init();

    // Get service instances
    invoiceService = module.get<InvoiceService>(InvoiceService);
    customerService = module.get<CustomerService>(CustomerService);
    paymentService = module.get<PaymentService>(PaymentService);
    creditRatingService = module.get<CreditRatingService>(CreditRatingService);
    dunningService = module.get<DunningService>(DunningService);
    reportingService = module.get<ReportingService>(ReportingService);
    workflowService = module.get<WorkflowService>(WorkflowService);
    complianceService = module.get<ComplianceService>(ComplianceService);
    tenantService = module.get<TenantService>(TenantService);
    apiGatewayService = module.get<APIGatewayService>(APIGatewayService);
    tenantManagementService = module.get<TenantManagementService>(TenantManagementService);

    // Get repository instances
    dataSource = module.get<DataSource>(DataSource);
    invoiceRepository = module.get<Repository<InvoiceEntity>>(getRepositoryToken(InvoiceEntity));
    customerRepository = module.get<Repository<CustomerEntity>>(getRepositoryToken(CustomerEntity));
    paymentRepository = module.get<Repository<PaymentEntity>>(getRepositoryToken(PaymentEntity));
    tenantRepository = module.get<Repository<TenantEntity>>(getRepositoryToken(TenantEntity));

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test tenant
    testTenant = await tenantRepository.save({
      id: uuidv4(),
      name: 'Integration Test Tenant',
      domain: 'integration-test.com',
      plan: 'enterprise',
      isActive: true,
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        features: ['all_modules']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create test user
    testUser = {
      id: uuidv4(),
      tenantId: testTenant.id,
      email: 'integration@test.com',
      roles: ['admin']
    };

    // Create test customer
    testCustomer = await customerRepository.save({
      id: uuidv4(),
      tenantId: testTenant.id,
      name: 'Integration Test Customer',
      email: 'customer@integration-test.com',
      phone: '+91-9876543210',
      isActive: true,
      businessDetails: {
        industry: 'Technology',
        companySize: 'Medium',
        annualRevenue: 10000000,
        gstNumber: '27ABCDE1234F1Z5'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create test invoice
    testInvoice = await invoiceRepository.save({
      id: uuidv4(),
      tenantId: testTenant.id,
      customerId: testCustomer.id,
      invoiceNumber: 'INT-TEST-001',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: 'INR',
      status: 'draft',
      subtotal: 1000,
      taxAmount: 180,
      totalAmount: 1180,
      items: [
        {
          id: uuidv4(),
          description: 'Integration Test Service',
          quantity: 1,
          unitPrice: 1000,
          taxRate: 0.18,
          amount: 1000
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async function cleanupTestData() {
    await dataSource.query('TRUNCATE TABLE invoices, customers, payments, tenants CASCADE');
  }

  describe('Module Integration Tests - Cross-Module Data Flow', () => {
    describe('Invoice-to-Payment Integration', () => {
      it('should handle complete invoice-to-payment workflow with events', async () => {
        const startTime = Date.now();
        
        // Step 1: Create customer through CRM module
        const customer = await customerService.createCustomer({
          tenantId: testTenant.id,
          name: 'Workflow Test Customer',
          email: 'workflow@test.com',
          phone: '+91-9876543210',
          businessDetails: {
            industry: 'Manufacturing',
            companySize: 'Large',
            annualRevenue: 50000000,
            gstNumber: '27WORKFLOW123F1Z5'
          }
        }, testUser.id);

        expect(customer).toBeDefined();
        expect(customer.id).toBeDefined();

        // Step 2: Create invoice through Invoice module
        const invoice = await invoiceService.createInvoice({
          tenantId: testTenant.id,
          customerId: customer.id,
          invoiceNumber: 'WF-TEST-001',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currency: 'INR',
          items: [
            {
              description: 'Workflow Test Product',
              quantity: 5,
              unitPrice: 2000,
              taxRate: 0.18
            }
          ]
        }, testUser.id);

        expect(invoice).toBeDefined();
        expect(invoice.totalAmount).toBe(11800); // 10000 + 1800 tax

        // Step 3: Send invoice (triggers workflow)
        await invoiceService.updateStatus(invoice.id, 'sent', testUser.id);
        
        // Verify invoice status updated
        const sentInvoice = await invoiceRepository.findOne({ where: { id: invoice.id } });
        expect(sentInvoice.status).toBe('sent');

        // Step 4: Process payment through Payment module
        const payment = await paymentService.processPayment({
          tenantId: testTenant.id,
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          currency: 'INR',
          paymentMethod: 'upi',
          gatewayProvider: 'razorpay',
          customerDetails: {
            customerId: customer.id,
            email: customer.email,
            phone: customer.phone
          }
        });

        expect(payment).toBeDefined();
        expect(payment.amount).toBe(invoice.totalAmount);
        expect(payment.status).toBe('processing');

        // Step 5: Simulate payment success callback
        await paymentService.handlePaymentCallback({
          transactionId: payment.transactionId,
          status: 'success',
          gatewayResponse: {
            paymentId: 'razorpay_test_123',
            orderId: payment.gatewayOrderId,
            signature: 'valid_signature'
          }
        });

        // Step 6: Verify payment completion and invoice update
        const completedPayment = await paymentRepository.findOne({ 
          where: { id: payment.id } 
        });
        expect(completedPayment.status).toBe('completed');

        const paidInvoice = await invoiceRepository.findOne({ 
          where: { id: invoice.id } 
        });
        expect(paidInvoice.status).toBe('paid');

        // Step 7: Verify customer payment history updated
        const updatedCustomer = await customerRepository.findOne({
          where: { id: customer.id },
          relations: ['paymentHistory']
        });
        expect(updatedCustomer.paymentHistory).toBeDefined();

        const endTime = Date.now();
        const workflowDuration = endTime - startTime;
        
        // Performance assertion
        expect(workflowDuration).toBeLessThan(5000); // Should complete in under 5 seconds
      });

      it('should handle payment failure and dunning workflow integration', async () => {
        // Create invoice
        const invoice = await invoiceService.createInvoice({
          tenantId: testTenant.id,
          customerId: testCustomer.id,
          invoiceNumber: 'FAIL-TEST-001',
          dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days overdue
          items: [{ description: 'Failed Payment Test', quantity: 1, unitPrice: 5000 }]
        }, testUser.id);

        // Attempt payment
        const payment = await paymentService.processPayment({
          tenantId: testTenant.id,
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          currency: 'INR',
          paymentMethod: 'credit_card'
        });

        // Simulate payment failure
        await paymentService.handlePaymentCallback({
          transactionId: payment.transactionId,
          status: 'failed',
          gatewayResponse: {
            error: 'insufficient_funds',
            errorDescription: 'Insufficient funds in account'
          }
        });

        // Verify payment failed
        const failedPayment = await paymentRepository.findOne({ 
          where: { id: payment.id } 
        });
        expect(failedPayment.status).toBe('failed');

        // Create dunning campaign
        const campaign = await dunningService.createCampaign({
          tenantId: testTenant.id,
          name: 'Integration Test Campaign',
          description: 'Test campaign for failed payments',
          escalationSteps: [
            { day: 1, action: 'email_reminder', template: 'gentle_reminder' },
            { day: 5, action: 'phone_call', template: 'urgent_notice' }
          ]
        }, testUser.id);

        // Process overdue invoices
        const dunningActions = await dunningService.processOverdueInvoices(testTenant.id);
        
        expect(dunningActions).toBeInstanceOf(Array);
        expect(dunningActions.length).toBeGreaterThan(0);
        
        const invoiceAction = dunningActions.find(action => action.invoiceId === invoice.id);
        expect(invoiceAction).toBeDefined();
        expect(invoiceAction.action).toBe('phone_call'); // 5 days overdue
      });
    });

    describe('Credit Rating Integration', () => {
      it('should update credit rating based on payment behavior', async () => {
        // Create customer with payment history
        const customer = await customerService.createCustomer({
          tenantId: testTenant.id,
          name: 'Credit Rating Test Customer',
          email: 'credit@test.com',
          businessDetails: {
            industry: 'Retail',
            companySize: 'Medium',
            annualRevenue: 25000000
          }
        }, testUser.id);

        // Create multiple invoices and payments
        const invoices = [];
        const payments = [];

        for (let i = 0; i < 5; i++) {
          const invoice = await invoiceService.createInvoice({
            tenantId: testTenant.id,
            customerId: customer.id,
            invoiceNumber: `CR-TEST-${i + 1}`,
            items: [{ description: `Service ${i + 1}`, quantity: 1, unitPrice: 10000 }]
          }, testUser.id);
          invoices.push(invoice);

          // Simulate different payment behaviors
          const paymentDelay = i < 3 ? 0 : i * 2; // First 3 on time, others delayed
          const payment = await paymentService.processPayment({
            tenantId: testTenant.id,
            invoiceId: invoice.id,
            amount: invoice.totalAmount,
            currency: 'INR',
            paymentMethod: 'upi'
          });

          // Simulate payment completion with delay
          setTimeout(async () => {
            await paymentService.handlePaymentCallback({
              transactionId: payment.transactionId,
              status: 'success'
            });
          }, paymentDelay * 100); // Simulate delay

          payments.push(payment);
        }

        // Wait for all payments to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Calculate credit rating
        const creditRating = await creditRatingService.calculateCreditScore({
          customerId: customer.id,
          tenantId: testTenant.id
        });

        expect(creditRating).toBeDefined();
        expect(creditRating.score).toBeGreaterThan(0);
        expect(creditRating.score).toBeLessThanOrEqual(1000);
        expect(creditRating.paymentBehaviorScore).toBeDefined();
        expect(creditRating.riskLevel).toMatch(/^(Low|Medium|High)$/);

        // Verify credit limit calculation
        const creditLimit = await creditRatingService.calculateCreditLimit(
          customer,
          creditRating
        );
        expect(creditLimit).toBeGreaterThan(0);
      });
    });

    describe('Workflow Automation Integration', () => {
      it('should execute automated workflows across modules', async () => {
        // Create workflow for high-value invoice approval
        const workflow = await workflowService.createWorkflow({
          tenantId: testTenant.id,
          name: 'High Value Invoice Workflow',
          description: 'Automated workflow for invoices over 50,000',
          trigger: {
            type: 'invoice_created',
            conditions: [
              { field: 'totalAmount', operator: 'greater_than', value: 50000 }
            ]
          },
          steps: [
            {
              id: 'credit_check',
              type: 'service_call',
              service: 'credit-rating',
              method: 'checkCreditLimit',
              timeout: 30
            },
            {
              id: 'manager_approval',
              type: 'approval',
              assignee: 'finance_manager',
              timeout: 24 * 60 // 24 hours
            },
            {
              id: 'send_invoice',
              type: 'service_call',
              service: 'invoice',
              method: 'sendInvoice',
              timeout: 10
            },
            {
              id: 'notify_customer',
              type: 'notification',
              recipients: ['customer'],
              template: 'invoice_sent',
              timeout: 5
            }
          ]
        }, testUser.id);

        expect(workflow).toBeDefined();
        expect(workflow.steps).toHaveLength(4);

        // Create high-value invoice to trigger workflow
        const highValueInvoice = await invoiceService.createInvoice({
          tenantId: testTenant.id,
          customerId: testCustomer.id,
          invoiceNumber: 'HV-TEST-001',
          items: [
            { description: 'High Value Service', quantity: 1, unitPrice: 75000 }
          ]
        }, testUser.id);

        expect(highValueInvoice.totalAmount).toBeGreaterThan(50000);

        // Wait for workflow to trigger and execute
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify workflow execution
        const workflowExecutions = await workflowService.getExecutions(workflow.id);
        expect(workflowExecutions).toBeInstanceOf(Array);
        expect(workflowExecutions.length).toBeGreaterThan(0);

        const execution = workflowExecutions[0];
        expect(execution.status).toMatch(/^(running|completed|pending_approval)$/);
        expect(execution.currentStep).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Financial Reporting Integration', () => {
      it('should generate comprehensive reports across all modules', async () => {
        // Create test data across modules
        const customers = [];
        const invoices = [];
        const payments = [];

        // Create multiple customers
        for (let i = 0; i < 3; i++) {
          const customer = await customerService.createCustomer({
            tenantId: testTenant.id,
            name: `Report Test Customer ${i + 1}`,
            email: `report${i + 1}@test.com`,
            businessDetails: {
              industry: ['Technology', 'Manufacturing', 'Retail'][i],
              companySize: ['Small', 'Medium', 'Large'][i],
              annualRevenue: (i + 1) * 10000000
            }
          }, testUser.id);
          customers.push(customer);
        }

        // Create invoices for each customer
        for (let i = 0; i < customers.length; i++) {
          for (let j = 0; j < 3; j++) {
            const invoice = await invoiceService.createInvoice({
              tenantId: testTenant.id,
              customerId: customers[i].id,
              invoiceNumber: `RPT-${i + 1}-${j + 1}`,
              issueDate: new Date(Date.now() - (j * 10) * 24 * 60 * 60 * 1000),
              dueDate: new Date(Date.now() + (30 - j * 10) * 24 * 60 * 60 * 1000),
              items: [
                { description: `Service ${j + 1}`, quantity: j + 1, unitPrice: (i + 1) * 5000 }
              ]
            }, testUser.id);
            invoices.push(invoice);

            // Pay some invoices
            if (j < 2) {
              const payment = await paymentService.processPayment({
                tenantId: testTenant.id,
                invoiceId: invoice.id,
                amount: invoice.totalAmount,
                currency: 'INR',
                paymentMethod: 'upi'
              });

              await paymentService.handlePaymentCallback({
                transactionId: payment.transactionId,
                status: 'success'
              });

              payments.push(payment);
            }
          }
        }

        // Wait for all transactions to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate aging report
        const agingReport = await reportingService.generateAgingReport(testTenant.id);
        expect(agingReport).toBeDefined();
        expect(agingReport.buckets).toBeDefined();
        expect(agingReport.totalOutstanding).toBeGreaterThan(0);

        // Generate cash flow report
        const cashFlowReport = await reportingService.generateCashFlowReport(testTenant.id, {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        });
        expect(cashFlowReport).toBeDefined();
        expect(cashFlowReport.inflows).toBeDefined();
        expect(cashFlowReport.outflows).toBeDefined();

        // Generate customer analysis report
        const customerReport = await reportingService.generateCustomerAnalysisReport(testTenant.id);
        expect(customerReport).toBeDefined();
        expect(customerReport.segments).toBeDefined();
        expect(customerReport.topCustomers).toBeInstanceOf(Array);

        // Generate KPI dashboard
        const kpiDashboard = await reportingService.generateKPIDashboard(testTenant.id);
        expect(kpiDashboard).toBeDefined();
        expect(kpiDashboard.collectionEfficiency).toBeDefined();
        expect(kpiDashboard.averagePaymentDays).toBeDefined();
        expect(kpiDashboard.overduePercentage).toBeDefined();
      });
    });

    describe('Compliance Integration', () => {
      it('should ensure compliance across all financial transactions', async () => {
        // Create invoice with GST compliance requirements
        const gstInvoice = await invoiceService.createInvoice({
          tenantId: testTenant.id,
          customerId: testCustomer.id,
          invoiceNumber: 'GST-COMP-001',
          items: [
            { description: 'Taxable Service', quantity: 1, unitPrice: 100000, taxRate: 0.18 }
          ],
          gstDetails: {
            gstNumber: testCustomer.businessDetails.gstNumber,
            placeOfSupply: 'Maharashtra',
            reverseCharge: false
          }
        }, testUser.id);

        // Validate GST compliance
        const gstCompliance = await complianceService.validateGSTCompliance({
          tenantId: testTenant.id,
          invoiceId: gstInvoice.id,
          period: '2025-01'
        });

        expect(gstCompliance).toBeDefined();
        expect(gstCompliance.isCompliant).toBe(true);
        expect(gstCompliance.gstAmount).toBe(18000);

        // Process payment and validate TDS compliance
        const payment = await paymentService.processPayment({
          tenantId: testTenant.id,
          invoiceId: gstInvoice.id,
          amount: gstInvoice.totalAmount,
          currency: 'INR',
          paymentMethod: 'net_banking',
          tdsDetails: {
            applicable: true,
            rate: 0.1,
            category: 'professional_services'
          }
        });

        const tdsCompliance = await complianceService.validateTDSCompliance({
          tenantId: testTenant.id,
          paymentId: payment.id
        });

        expect(tdsCompliance).toBeDefined();
        expect(tdsCompliance.isCompliant).toBe(true);
        expect(tdsCompliance.tdsAmount).toBe(11800); // 10% of total amount

        // Generate compliance report
        const complianceReport = await complianceService.generateComplianceReport(testTenant.id, {
          period: '2025-01',
          types: ['GST', 'TDS', 'ESI', 'PF']
        });

        expect(complianceReport).toBeDefined();
        expect(complianceReport.gstCompliance).toBeDefined();
        expect(complianceReport.tdsCompliance).toBeDefined();
        expect(complianceReport.overallScore).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('API Gateway Integration Tests', () => {
    describe('Request Routing and Load Balancing', () => {
      it('should route requests to appropriate microservices', async () => {
        const testCases = [
          {
            path: '/api/v1/invoices',
            method: 'GET',
            expectedService: 'invoice-service',
            expectedStatusCode: 200
          },
          {
            path: '/api/v1/customers',
            method: 'POST',
            expectedService: 'crm-service',
            expectedStatusCode: 201
          },
          {
            path: '/api/v1/payments',
            method: 'POST',
            expectedService: 'payment-service',
            expectedStatusCode: 201
          },
          {
            path: '/api/v1/reports/aging',
            method: 'GET',
            expectedService: 'reporting-service',
            expectedStatusCode: 200
          }
        ];

        for (const testCase of testCases) {
          const response = await request(app.getHttpServer())
            [testCase.method.toLowerCase()](testCase.path)
            .set('Authorization', 'Bearer valid-token')
            .set('X-Tenant-ID', testTenant.id);

          expect(response.status).toBe(testCase.expectedStatusCode);
          expect(response.headers['x-service']).toBe(testCase.expectedService);
        }
      });

      it('should handle rate limiting per tenant', async () => {
        const requests = Array.from({ length: 105 }, () =>
          request(app.getHttpServer())
            .get('/api/v1/invoices')
            .set('Authorization', 'Bearer valid-token')
            .set('X-Tenant-ID', testTenant.id)
        );

        const responses = await Promise.all(requests);
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });

      it('should handle circuit breaker for failing services', async () => {
        // Simulate service failure
        jest.spyOn(invoiceService, 'getInvoices').mockRejectedValue(new Error('Service unavailable'));

        const requests = Array.from({ length: 10 }, () =>
          request(app.getHttpServer())
            .get('/api/v1/invoices')
            .set('Authorization', 'Bearer valid-token')
            .set('X-Tenant-ID', testTenant.id)
        );

        const responses = await Promise.all(requests);
        const circuitBreakerResponses = responses.filter(r => r.status === 503);
        
        expect(circuitBreakerResponses.length).toBeGreaterThan(0);
      });
    });

    describe('Webhook Integration', () => {
      it('should deliver webhooks to external systems', async () => {
        const webhookUrl = 'https://webhook.site/test-endpoint';
        
        // Register webhook
        await apiGatewayService.registerWebhook({
          tenantId: testTenant.id,
          url: webhookUrl,
          events: ['invoice.created', 'payment.completed'],
          secret: 'webhook-secret'
        });

        // Create invoice to trigger webhook
        const invoice = await invoiceService.createInvoice({
          tenantId: testTenant.id,
          customerId: testCustomer.id,
          invoiceNumber: 'WEBHOOK-TEST-001',
          items: [{ description: 'Webhook Test', quantity: 1, unitPrice: 1000 }]
        }, testUser.id);

        // Wait for webhook delivery
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify webhook delivery
        const deliveries = await apiGatewayService.getWebhookDeliveries(testTenant.id);
        const invoiceWebhook = deliveries.find(d => 
          d.event === 'invoice.created' && d.payload.invoiceId === invoice.id
        );

        expect(invoiceWebhook).toBeDefined();
        expect(invoiceWebhook.status).toMatch(/^(success|pending|failed)$/);
      });
    });
  });

  describe('Multi-Tenant Data Isolation Tests', () => {
    it('should ensure complete data isolation between tenants', async () => {
      // Create second tenant
      const tenant2 = await tenantRepository.save({
        id: uuidv4(),
        name: 'Isolation Test Tenant 2',
        domain: 'tenant2.test.com',
        plan: 'professional',
        isActive: true,
        settings: { timezone: 'UTC', currency: 'USD' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create data for tenant 1
      const tenant1Customer = await customerService.createCustomer({
        tenantId: testTenant.id,
        name: 'Tenant 1 Customer',
        email: 'tenant1@test.com'
      }, testUser.id);

      const tenant1Invoice = await invoiceService.createInvoice({
        tenantId: testTenant.id,
        customerId: tenant1Customer.id,
        invoiceNumber: 'T1-ISOLATION-001',
        items: [{ description: 'Tenant 1 Service', quantity: 1, unitPrice: 1000 }]
      }, testUser.id);

      // Create data for tenant 2
      const tenant2User = { ...testUser, tenantId: tenant2.id };
      
      const tenant2Customer = await customerService.createCustomer({
        tenantId: tenant2.id,
        name: 'Tenant 2 Customer',
        email: 'tenant2@test.com'
      }, tenant2User.id);

      const tenant2Invoice = await invoiceService.createInvoice({
        tenantId: tenant2.id,
        customerId: tenant2Customer.id,
        invoiceNumber: 'T2-ISOLATION-001',
        items: [{ description: 'Tenant 2 Service', quantity: 1, unitPrice: 2000 }]
      }, tenant2User.id);

      // Verify tenant 1 can only see its data
      const tenant1Customers = await customerService.getCustomers(testTenant.id);
      const tenant1Invoices = await invoiceService.getInvoices(testTenant.id);

      expect(tenant1Customers.some(c => c.id === tenant1Customer.id)).toBe(true);
      expect(tenant1Customers.some(c => c.id === tenant2Customer.id)).toBe(false);
      expect(tenant1Invoices.some(i => i.id === tenant1Invoice.id)).toBe(true);
      expect(tenant1Invoices.some(i => i.id === tenant2Invoice.id)).toBe(false);

      // Verify tenant 2 can only see its data
      const tenant2Customers = await customerService.getCustomers(tenant2.id);
      const tenant2Invoices = await invoiceService.getInvoices(tenant2.id);

      expect(tenant2Customers.some(c => c.id === tenant2Customer.id)).toBe(true);
      expect(tenant2Customers.some(c => c.id === tenant1Customer.id)).toBe(false);
      expect(tenant2Invoices.some(i => i.id === tenant2Invoice.id)).toBe(true);
      expect(tenant2Invoices.some(i => i.id === tenant1Invoice.id)).toBe(false);
    });

    it('should handle tenant-specific configurations', async () => {
      // Update tenant settings
      await tenantService.updateSettings(testTenant.id, {
        timezone: 'America/New_York',
        currency: 'USD',
        taxSettings: {
          defaultTaxRate: 0.08,
          taxInclusive: false
        },
        invoiceSettings: {
          numberPrefix: 'US-',
          paymentTerms: 15
        }
      });

      // Create invoice with tenant-specific settings
      const invoice = await invoiceService.createInvoice({
        tenantId: testTenant.id,
        customerId: testCustomer.id,
        invoiceNumber: 'AUTO-GENERATED', // Should use tenant prefix
        items: [{ description: 'US Service', quantity: 1, unitPrice: 1000 }]
      }, testUser.id);

      expect(invoice.invoiceNumber).toMatch(/^US-/);
      expect(invoice.taxAmount).toBe(80); // 8% tax rate
      expect(invoice.paymentTerms).toBe(15);
    });
  });

  describe('Performance and Scalability Tests', () => {
    it('should handle concurrent operations across modules', async () => {
      const concurrentOperations = 20;
      const operations = [];

      // Create concurrent operations across different modules
      for (let i = 0; i < concurrentOperations; i++) {
        operations.push(
          customerService.createCustomer({
            tenantId: testTenant.id,
            name: `Concurrent Customer ${i}`,
            email: `concurrent${i}@test.com`
          }, testUser.id)
        );

        operations.push(
          invoiceService.createInvoice({
            tenantId: testTenant.id,
            customerId: testCustomer.id,
            invoiceNumber: `CONCURRENT-${i}`,
            items: [{ description: `Concurrent Service ${i}`, quantity: 1, unitPrice: 1000 }]
          }, testUser.id)
        );
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(operations);
      const endTime = Date.now();

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;
      const averageTime = (endTime - startTime) / operations.length;

      expect(successCount).toBeGreaterThan(operations.length * 0.9); // 90% success rate
      expect(failureCount).toBeLessThan(operations.length * 0.1); // Less than 10% failures
      expect(averageTime).toBeLessThan(500); // Average under 500ms per operation
    });

    it('should maintain database connection pool under load', async () => {
      const connectionTests = Array.from({ length: 50 }, async () => {
        const customer = await customerRepository.findOne({ 
          where: { tenantId: testTenant.id } 
        });
        return customer !== null;
      });

      const results = await Promise.all(connectionTests);
      const successRate = results.filter(r => r === true).length / results.length;

      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
    });

    it('should handle memory usage efficiently during bulk operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform bulk operations
      const bulkCustomers = Array.from({ length: 100 }, (_, i) => ({
        tenantId: testTenant.id,
        name: `Bulk Customer ${i}`,
        email: `bulk${i}@test.com`
      }));

      for (const customerData of bulkCustomers) {
        await customerService.createCustomer(customerData, testUser.id);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePerOperation = memoryIncrease / bulkCustomers.length;

      // Memory increase should be reasonable (less than 1MB per operation)
      expect(memoryIncreasePerOperation).toBeLessThan(1024 * 1024);
    });
  });

  describe('Error Handling and Recovery Tests', () => {
    it('should handle database connection failures gracefully', async () => {
      // Simulate database connection failure
      jest.spyOn(dataSource, 'query').mockRejectedValueOnce(new Error('Connection lost'));

      const result = await customerService.getCustomers(testTenant.id).catch(error => error);
      
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('Connection lost');

      // Verify recovery after connection restored
      jest.restoreAllMocks();
      
      const customers = await customerService.getCustomers(testTenant.id);
      expect(customers).toBeInstanceOf(Array);
    });

    it('should handle transaction rollbacks properly', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Create customer
        const customer = await queryRunner.manager.save(CustomerEntity, {
          id: uuidv4(),
          tenantId: testTenant.id,
          name: 'Transaction Test Customer',
          email: 'transaction@test.com',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Simulate error during invoice creation
        throw new Error('Simulated transaction error');

        await queryRunner.manager.save(InvoiceEntity, {
          id: uuidv4(),
          tenantId: testTenant.id,
          customerId: customer.id,
          invoiceNumber: 'TRANSACTION-TEST',
          status: 'draft',
          totalAmount: 1000,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
      } finally {
        await queryRunner.release();
      }

      // Verify rollback - customer should not exist
      const customers = await customerRepository.find({
        where: { email: 'transaction@test.com' }
      });
      expect(customers).toHaveLength(0);
    });

    it('should handle external service failures with retries', async () => {
      let attemptCount = 0;
      
      // Mock external service that fails first 2 times
      jest.spyOn(paymentService, 'processExternalPayment').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('External service unavailable');
        }
        return { success: true, transactionId: 'retry-success-123' };
      });

      const result = await paymentService.processPaymentWithRetry({
        tenantId: testTenant.id,
        amount: 1000,
        currency: 'INR',
        paymentMethod: 'credit_card',
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 100
        }
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      expect(result.transactionId).toBe('retry-success-123');
    });
  });

  describe('Security Integration Tests', () => {
    it('should prevent unauthorized cross-tenant access', async () => {
      // Create second tenant
      const unauthorizedTenant = await tenantRepository.save({
        id: uuidv4(),
        name: 'Unauthorized Tenant',
        domain: 'unauthorized.test.com',
        plan: 'basic',
        isActive: true,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Try to access testTenant data with unauthorizedTenant context
      const unauthorizedUser = { ...testUser, tenantId: unauthorizedTenant.id };

      await expect(
        customerService.getCustomer(testCustomer.id, unauthorizedUser.tenantId)
      ).rejects.toThrow('Access denied');

      await expect(
        invoiceService.getInvoice(testInvoice.id, unauthorizedUser.tenantId)
      ).rejects.toThrow('Access denied');
    });

    it('should validate JWT tokens properly', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '' // Empty token
      ];

      for (const token of invalidTokens) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/invoices')
          .set('Authorization', token)
          .set('X-Tenant-ID', testTenant.id);

        expect(response.status).toBe(401);
      }
    });

    it('should prevent SQL injection in dynamic queries', async () => {
      const maliciousInputs = [
        "'; DROP TABLE customers; --",
        "' OR '1'='1",
        "'; UPDATE customers SET email='hacked@evil.com'; --",
        "' UNION SELECT * FROM payments; --"
      ];

      for (const input of maliciousInputs) {
        // Should not throw errors or return unauthorized data
        const result = await customerService.searchCustomers(testTenant.id, input);
        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBe(0); // Should return empty results for invalid search
      }

      // Verify tables still exist and data is intact
      const customers = await customerRepository.find({ where: { tenantId: testTenant.id } });
      expect(customers.length).toBeGreaterThan(0);
    });
  });
});

// Integration Test Utilities
class IntegrationTestHelper {
  static async waitForAsyncOperation(operation: Promise<any>, timeout: number = 5000): Promise<any> {
    return Promise.race([
      operation,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ]);
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  static generateTestData(count: number, generator: (index: number) => any): any[] {
    return Array.from({ length: count }, (_, i) => generator(i));
  }

  static async cleanupTestData(dataSource: DataSource, tenantId: string): Promise<void> {
    const entities = [
      'payments', 'invoices', 'customers', 'workflows', 
      'dunning_campaigns', 'credit_ratings', 'compliance_records'
    ];

    for (const entity of entities) {
      await dataSource.query(`DELETE FROM ${entity} WHERE tenant_id = $1`, [tenantId]);
    }
  }
}

// Performance Metrics Collector
class IntegrationPerformanceMetrics {
  private static metrics: Map<string, any[]> = new Map();

  static recordMetric(operation: string, duration: number, success: boolean): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    this.metrics.get(operation)!.push({
      duration,
      success,
      timestamp: new Date()
    });
  }

  static getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [operation, records] of this.metrics.entries()) {
      const durations = records.map(r => r.duration);
      const successCount = records.filter(r => r.success).length;
      
      result[operation] = {
        totalRequests: records.length,
        successRate: successCount / records.length,
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p95Duration: this.percentile(durations, 0.95),
        p99Duration: this.percentile(durations, 0.99)
      };
    }
    
    return result;
  }

  private static percentile(arr: number[], p: number): number {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }

  static reset(): void {
    this.metrics.clear();
  }
}

