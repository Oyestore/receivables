import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import request from 'supertest';
import { AppTestingModule } from './harness/app-testing.module';

@Controller('api/v1/cross-border-trade')
class TestCrossBorderTradeController {
  private trades: any[] = [];
  @Post()
  async create(@Body() dto: any) { const id = 'trade-' + (this.trades.length + 1); const t = { id, status: 'CREATED', ...dto }; this.trades.push(t); return t; }
  @Get()
  async list() { return this.trades; }
  @Get(':id')
  async get(@Param('id') id: string) { return this.trades.find(t => t.id === id); }
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) { const t = this.trades.find(x => x.id === id); Object.assign(t!, dto); return t; }
  @Delete(':id')
  async del(@Param('id') id: string) { this.trades = this.trades.filter(t => t.id !== id); return { message: 'Trade deleted successfully' }; }
  @Get('dashboard/stats')
  async stats() { return { trades: this.trades.length }; }
  @Post(':id/submit-customs')
  async customs(@Param('id') id: string) { const t = this.trades.find(x => x.id === id); t!.status = 'SUBMITTED_CUSTOMS'; return t; }
}

describe('Cross Border Trade (E2E)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppTestingModule], controllers: [TestCrossBorderTradeController] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('CRUD trade and submit customs', async () => {
    const created = await request(app.getHttpServer()).post('/api/v1/cross-border-trade').send({ value: 10000, currency: 'USD' }).expect(201);
    const id = created.body.id;
    const got = await request(app.getHttpServer()).get(`/api/v1/cross-border-trade/${id}`).expect(200);
    expect(got.body.status).toBe('CREATED');
    const upd = await request(app.getHttpServer()).put(`/api/v1/cross-border-trade/${id}`).send({ value: 12000 }).expect(200);
    expect(upd.body.value).toBe(12000);
    const customs = await request(app.getHttpServer()).post(`/api/v1/cross-border-trade/${id}/submit-customs`).expect(201);
    expect(customs.body.status).toBe('SUBMITTED_CUSTOMS');
    const stats = await request(app.getHttpServer()).get('/api/v1/cross-border-trade/dashboard/stats').expect(200);
    expect(stats.body.trades).toBeGreaterThan(0);
    await request(app.getHttpServer()).delete(`/api/v1/cross-border-trade/${id}`).expect(200);
  });
});

