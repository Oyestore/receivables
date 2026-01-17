import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppTestingModule } from './harness/app-testing.module';
import { DistributionAnalyticsService } from '../Module_02_Intelligent_Distribution/src/services/analytics/distribution-analytics.service';

describe('DistributionAnalyticsService (Deterministic)', () => {
  let app: INestApplication;
  let svc: DistributionAnalyticsService;
  const jobRepo = { find: jest.fn() };
  const logRepo = { find: jest.fn() };
  const eventRepo = { find: jest.fn() };
  const scoreRepo = { find: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      providers: [{
        provide: DistributionAnalyticsService,
        useFactory: () => {
          const instance: any = new (DistributionAnalyticsService as any)(undefined, undefined, undefined, undefined);
          instance['distributionJobRepository'] = jobRepo;
          instance['distributionLogRepository'] = logRepo;
          instance['deliveryEventRepository'] = eventRepo;
          instance['engagementScoreRepository'] = scoreRepo;
          return instance as DistributionAnalyticsService;
        }
      }],
    }).compile();
    svc = moduleFixture.get(DistributionAnalyticsService);
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('exportToCSV builds rows from jobs', async () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');
    jobRepo.find.mockResolvedValue([
      { id: 'j1', invoiceId: 'inv1', status: 'sent', channels: ['EMAIL','WHATSAPP'], createdAt: new Date('2025-01-10'), completedAt: new Date('2025-01-11') } as any,
    ]);
    const csv = await svc.exportToCSV('ten', { startDate: start, endDate: end });
    expect(csv).toContain('Job ID');
    expect(csv).toContain('j1');
    expect(csv).toContain('EMAIL;WHATSAPP');
  });

  it('getDashboardData aggregates metrics', async () => {
    const range = { startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31') };
    jobRepo.find.mockResolvedValue([]);
    logRepo.find.mockResolvedValue([]);
    eventRepo.find.mockResolvedValue([]);
    scoreRepo.find.mockResolvedValue([]);
    const data = await svc.getDashboardData('ten', range);
    expect(data.period).toEqual(range);
    expect(data.distribution.totalDistributed).toBeDefined();
  });

  it('getChannelPerformance computes rates', async () => {
    const range = { startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31') };
    logRepo.find.mockResolvedValue([
      { tenantId: 'ten', channelType: 'EMAIL', status: 'delivered' } as any,
      { tenantId: 'ten', channelType: 'EMAIL', status: 'failed' } as any,
      { tenantId: 'ten', channelType: 'WHATSAPP', status: 'delivered' } as any,
    ]);
    eventRepo.find.mockResolvedValue([
      { tenantId: 'ten', channel: 'EMAIL', eventType: 'opened' } as any,
      { tenantId: 'ten', channel: 'EMAIL', eventType: 'clicked' } as any,
    ]);
    const stats = await svc.getChannelPerformance('ten', range);
    expect(stats.EMAIL.deliveryRate).toBeGreaterThanOrEqual(50);
    expect(stats.EMAIL.openRate).toBeGreaterThanOrEqual(0);
  });

  it('getMLPerformance calculates averages and coverage', async () => {
    const range = { startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31') };
    scoreRepo.find.mockResolvedValue([
      { tenantId: 'ten', lastCalculatedAt: new Date('2025-01-10'), paymentProbability: 0.8, churnRisk: 0.2, preferredChannel: 'EMAIL' } as any,
      { tenantId: 'ten', lastCalculatedAt: new Date('2025-01-11'), paymentProbability: 0.6, churnRisk: 0.3, preferredChannel: 'WHATSAPP' } as any,
    ]);
    const ml = await svc.getMLPerformance('ten', range);
    expect(ml.avgPaymentProbability).toBeGreaterThan(0);
    expect(ml.predictionCoverage).toBeGreaterThan(0);
  });
});
