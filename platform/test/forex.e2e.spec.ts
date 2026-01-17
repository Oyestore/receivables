import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppTestingModule } from './harness/app-testing.module';
import { ForexService, Currency } from '../Module_13_Cross_Border_Trade/src/services/forex.service';

@Controller('forex')
class TestForexController {
  constructor(private readonly forex: ForexService) {}
  @Get('rate')
  async rate(@Query('from') from: Currency, @Query('to') to: Currency) {
    return this.forex.getExchangeRate(from, to);
  }
  @Post('convert')
  async convert(@Body() body: { amount: number; from: Currency; to: Currency }) {
    return this.forex.convertAmount(body.amount, body.from, body.to, true);
  }
  @Get('historical')
  async historical(@Query('from') from: Currency, @Query('to') to: Currency, @Query('period') period: any) {
    return this.forex.getHistoricalRates(from, to, period || '7d');
  }
  @Post('lock')
  async lock(@Body() body: { invoiceId: string; from: Currency; to: Currency; amount: number }) {
    return this.forex.lockRate(body.invoiceId, body.from, body.to, body.amount, 1);
  }
  @Post('lock/use')
  async use(@Body() body: { lockId: string }) {
    return this.forex.useRateLock(body.lockId);
  }
  @Get('currencies')
  async currencies() {
    return this.forex.getSupportedCurrencies();
  }
}

describe('Forex (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      controllers: [TestForexController],
      providers: [ForexService, { provide: ConfigService, useValue: { get: () => undefined } }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/forex/rate (GET)', async () => {
    const res = await request(app.getHttpServer())
      .get('/forex/rate?from=USD&to=INR')
      .expect(200);
    expect(res.body.rate).toBeGreaterThan(0);
    expect(res.body.inverseRate).toBeGreaterThan(0);
  });

  it('/forex/convert (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/forex/convert')
      .send({ amount: 100, from: 'USD', to: 'INR' })
      .expect(201);
    expect(res.body.convertedAmount).toBeGreaterThan(0);
    expect(res.body.totalInTargetCurrency).toBeGreaterThan(0);
  });

  it('/forex/historical (GET)', async () => {
    const res = await request(app.getHttpServer())
      .get('/forex/historical?from=USD&to=INR&period=7d')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(7);
    expect(res.body[0].open).toBeDefined();
  });

  it('/forex/lock + use (POST)', async () => {
    const lockRes = await request(app.getHttpServer())
      .post('/forex/lock')
      .send({ invoiceId: 'INV-1', from: 'USD', to: 'INR', amount: 100 })
      .expect(201);
    const useRes = await request(app.getHttpServer())
      .post('/forex/lock/use')
      .send({ lockId: lockRes.body.lockId })
      .expect(201);
    expect(useRes.body.exchangeRate).toBeGreaterThan(0);
    expect(useRes.body.convertedAmount).toBeGreaterThan(0);
  });

  it('/forex/currencies (GET)', async () => {
    const res = await request(app.getHttpServer())
      .get('/forex/currencies')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find((c: any) => c.code === 'USD')).toBeTruthy();
  });
});
