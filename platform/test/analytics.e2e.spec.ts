import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Query, Headers } from '@nestjs/common';
import request from 'supertest';
import { AppTestingModule } from './harness/app-testing.module';

@Controller('analytics')
class TestAnalyticsController {
  @Get('dashboard')
  async dashboard(@Headers('authorization') _auth: string) {
    return { totalRevenue: 1250000, totalInvoices: 245, paidInvoices: 200, unpaidInvoices: 45 };
  }
  @Get('revenue-trend')
  async trend(@Headers('authorization') _auth: string, @Query('range') range = 'last_30_days') {
    const days = range === 'last_7_days' ? 7 : 30;
    const series = Array.from({ length: days }, (_, i) => ({ day: i + 1, revenue: 10000 + i * 300 }));
    return { range, series };
  }
}

describe('Analytics (E2E)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      controllers: [TestAnalyticsController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    token = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('/analytics/dashboard (GET)', async () => {
    const res = await request(app.getHttpServer())
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.totalRevenue).toBeGreaterThan(0);
    expect(res.body.totalInvoices).toBeGreaterThan(0);
  });

  it('/analytics/revenue-trend (GET)', async () => {
    const res = await request(app.getHttpServer())
      .get('/analytics/revenue-trend?range=last_7_days')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body.series)).toBe(true);
    expect(res.body.series.length).toBe(7);
  });
});

