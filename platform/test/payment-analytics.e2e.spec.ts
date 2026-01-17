import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppTestingModule } from './harness/app-testing.module';
import { PaymentAnalyticsService } from '../Module_03_Payment_Integration/src/services/payment-analytics.service';
import { TransactionStatus } from '../Module_03_Payment_Integration/src/entities/payment-transaction.entity';

describe('PaymentAnalyticsService (Deterministic)', () => {
  let app: INestApplication;
  let service: PaymentAnalyticsService;
  const mockTxRepo = { find: jest.fn() };
  const mockSetRepo = { find: jest.fn() };
  const mockRefundRepo = { find: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      providers: [{
        provide: PaymentAnalyticsService,
        useFactory: () => {
          const s: any = new (PaymentAnalyticsService as any)(undefined, undefined, undefined);
          s['transactionRepository'] = mockTxRepo;
          s['settlementRepository'] = mockSetRepo;
          s['refundRepository'] = mockRefundRepo;
          return s as PaymentAnalyticsService;
        }
      }],
    }).compile();
    service = moduleFixture.get(PaymentAnalyticsService);
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('exportToCSV formats transactions', async () => {
    const now = new Date('2025-01-01T00:00:00Z');
    const csv = await service.exportToCSV([
      { id: 't1', createdAt: now, amount: 100, currency: 'INR', status: TransactionStatus.COMPLETED, gatewayTransactionId: 'g1', invoiceId: 'inv1' } as any,
    ]);
    expect(csv.split('\n')[0]).toContain('Transaction ID');
    expect(csv).toContain('t1');
    expect(csv).toContain('completed');
  });

  it('getTransactionReport filters by amount and status', async () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');
    mockTxRepo.find.mockResolvedValue([
      { tenantId: 'ten', createdAt: new Date('2025-01-10'), amount: 50, status: TransactionStatus.COMPLETED } as any,
      { tenantId: 'ten', createdAt: new Date('2025-01-11'), amount: 500, status: TransactionStatus.FAILED } as any,
    ]);
    const res = await service.getTransactionReport('ten', { startDate: start, endDate: end, status: TransactionStatus.FAILED, minAmount: 100 });
    expect(res.length).toBe(1);
    expect(Number(res[0].amount)).toBeGreaterThanOrEqual(100);
  });

  it('getSettlementSummary aggregates by gateway', async () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');
    mockSetRepo.find.mockResolvedValue([
      { tenantId: 'ten', settlementDate: new Date('2025-01-10'), gateway: 'RAZORPAY', transactionCount: 2, totalAmount: 200, fees: 4, netAmount: 196 } as any,
      { tenantId: 'ten', settlementDate: new Date('2025-01-11'), gateway: 'RAZORPAY', transactionCount: 1, totalAmount: 100, fees: 2, netAmount: 98 } as any,
    ]);
    const summary = await service.getSettlementSummary('ten', start, end);
    expect(summary.totalSettlements).toBe(2);
    expect(summary.byGateway['RAZORPAY'].count).toBe(2);
    expect(summary.totalAmount).toBeGreaterThan(0);
  });

  it('getFailureAnalysis groups by reason and totals', async () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');
    mockTxRepo.find.mockResolvedValue([
      { tenantId: 'ten', status: TransactionStatus.FAILED, createdAt: new Date('2025-01-12'), amount: 50, metadata: { error: 'NETWORK' } } as any,
      { tenantId: 'ten', status: TransactionStatus.FAILED, createdAt: new Date('2025-01-13'), amount: 75, metadata: { error: 'DECLINED' } } as any,
      { tenantId: 'ten', status: TransactionStatus.FAILED, createdAt: new Date('2025-01-14'), amount: 25, metadata: { } } as any,
    ]);
    const analysis = await service.getFailureAnalysis('ten', start, end);
    expect(analysis.total).toBe(3);
    expect(Object.keys(analysis.byReason).length).toBeGreaterThanOrEqual(2);
    expect(analysis.failedAmount).toBeGreaterThan(0);
  });

  it('getRevenueAnalytics groups by month', async () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-02-28');
    mockTxRepo.find.mockResolvedValue([
      { tenantId: 'ten', createdAt: new Date('2025-01-10'), amount: 100, status: TransactionStatus.COMPLETED } as any,
      { tenantId: 'ten', createdAt: new Date('2025-02-10'), amount: 200, status: TransactionStatus.COMPLETED } as any,
    ]);
    const res = await service.getRevenueAnalytics('ten', start, end, 'month');
    expect(res.length).toBeGreaterThanOrEqual(2);
    expect(res[0].revenue).toBeDefined();
  });
});
