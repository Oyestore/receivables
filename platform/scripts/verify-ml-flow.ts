
import { Logger } from '@nestjs/common';
import { CashFlowIntegrationService } from '../Module_02_Intelligent_Distribution/src/services/integration/cash-flow-integration.service';
import { FollowUpEngineService } from '../Module_02_Intelligent_Distribution/src/services/core/follow-up.service';
import { MLTimingService } from '../Module_02_Intelligent_Distribution/src/services/ml-timing.service';
import { of } from 'rxjs';

// Simple Mock Implementation
function createSpy(name: string, defaultReturn: any = undefined) {
    const calls: any[] = [];
    const fn: any = async (...args: any[]) => {
        calls.push(args);
        return fn.returnValue !== undefined ? fn.returnValue : defaultReturn;
    };
    fn.calls = calls;
    fn.returnValue = defaultReturn;
    fn.mockResolvedValue = (val: any) => { fn.returnValue = val; };
    fn.mockResolvedValueOnce = (val: any) => {
        // Simple once implementation: queue logic needed or just overwrite for this script
        fn.returnValue = val;
    };
    return fn;
}

// Mock Dependencies
const mockRepo: any = {
    find: createSpy('find', []),
    findOne: createSpy('findOne', null),
    create: createSpy('create', {}),
    save: createSpy('save', {}),
    update: createSpy('update', {}),
    delete: createSpy('delete', {}),
};

const mockDistributionService: any = {
    distributeInvoice: createSpy('distributeInvoice', { id: 'job-123', status: 'PROCESSING' }),
};

const mockInvoiceService: any = {
    findAll: createSpy('findAll', { data: [] }),
};

const mockDeepSeekService: any = {
    generate: createSpy('generate', { text: 'AI Generated Message' }),
};

const mockCulturalService: any = {
    getAdaptationStrategy: createSpy('getAdaptationStrategy', {
        region: 'Global',
        tone: 'professional',
        greeting: 'Hello',
        language: 'en',
    }),
};

const mockEngagementService: any = {
    getCustomerScore: createSpy('getCustomerScore', { overallScore: 80 }),
};

// Mock HttpService for CashFlowIntegrationService
const mockHttpService: any = {
    post: createSpy('post', of({
        data: {
            status: 'success',
            forecast: [],
            critical_dates: [{ date: '2025-01-01', type: 'cash_gap', amount: -5000 }],
            confidence_score: 0.9,
            model_used: 'test'
        }
    })),
    get: createSpy('get', of({ data: { status: 'healthy' } })),
};

const mockConfigService: any = {
    get: createSpy('get', 'http://localhost:8000'),
};

async function verifyMLIntegration() {
    const logger = new Logger('VerifyMLFlow');
    logger.log('Starting ML Integration Verification (Vanilla TS)...');

    // 1. Instantiate CashFlowIntegrationService
    const cashFlowService = new CashFlowIntegrationService(mockHttpService, mockConfigService);

    // 2. Instantiate MLTimingService
    const mlTimingService = new MLTimingService(
        mockRepo, // engagementScoreRepository
        mockRepo, // experimentRepository
        mockRepo, // trainingRunRepository
        mockDeepSeekService
    );

    // 3. Instantiate FollowUpEngineService
    const followUpService = new FollowUpEngineService(
        mockRepo, // followUpRuleRepository
        mockRepo, // followUpSequenceRepository
        mockRepo, // followUpPauseRepository
        mockDistributionService,
        mockEngagementService,
        mockInvoiceService,
        mockDeepSeekService,
        mockCulturalService,
        cashFlowService
    );

    // Verify Services Created
    logger.log('Services instantiated successfully.');

    // 4. Verify Cash Flow Integration
    logger.log('4. Testing Cash Flow Prediction (Mocked HTTP)...');
    try {
        const prediction = await cashFlowService.getCashFlowPrediction({
            tenant_id: 'test-tenant',
            invoices: [],
            payment_probabilities: {},
            horizon_days: 30
        });
        logger.log('✅ Cash Flow Service Logic works (Consumed Mock HTTP)');
    } catch (error) {
        logger.error(`❌ Cash Flow Service Logic Failed: ${error.message}`);
    }

    // 5. Verify Intelligent Escalation Logic
    logger.log('5. Testing Intelligent Escalation Logic...');

    // Mock getReturn for FollowUpRule to ensure a rule matches
    mockRepo.find.mockResolvedValue([
        {
            name: 'Test Rule',
            daysOffset: 15,
            channel: 'EMAIL',
            isActive: true
        }
    ]);

    const highValueInvoice: any = {
        id: 'inv-123',
        invoiceNumber: 'INV-HIGH-VALUE',
        tenant_id: 'test-tenant',
        client_name: 'Big Corp',
        total_amount: 50000, // > 10000 to trigger ML check
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days overdue
        status: 'SENT'
    };

    // The mockHttpService is already configured to return a "cash_gap".

    await followUpService.processInvoiceFollowUps(highValueInvoice);

    // Check if DistributionService was called with ESCALATED urgency
    const distributeCalls = mockDistributionService.distributeInvoice.calls;
    if (distributeCalls.length > 0) {
        const options = distributeCalls[0][4]; // 5th argument is options
        logger.log('Distribution Options used:', options);

        if (options.priority === 3) { // Critical priority
            logger.log('✅ INTELLIGENT ESCALATION SUCCESSFUL: Priority escalated to 3 (Critical)');
        } else {
            logger.error(`❌ Escalation Failed. Priority is ${options.priority}, expected 3`);
            process.exit(1);
        }

        if (options.useMLOptimization === true) {
            logger.log('✅ ML Optimization Flag Passed');
        } else {
            logger.error('❌ ML Optimization Flag Missing');
            process.exit(1);
        }

    } else {
        logger.error('❌ No distribution triggered');
        process.exit(1);
    }

    logger.log('Verification Complete.');
}

verifyMLIntegration().catch(err => console.error(err));
