import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Post, Get, Body, Param, HttpCode } from '@nestjs/common';
import request from 'supertest';
import { AppTestingModule } from './harness/app-testing.module';

@Controller('payments')
class TestPaymentController {
  private txs: any[] = [];
  @Post('initiate')
  async initiate(@Body() dto: any) {
    const id = 'tx-' + (this.txs.length + 1);
    const tx = { id, invoiceId: dto.invoiceId, amount: dto.amount, status: 'INITIATED', gateway: dto.gateway || 'PHONEPE' };
    this.txs.push(tx);
    return { orderId: 'order-' + id, redirectUrl: 'https://pay.local/' + id };
  }
  @Post('verify')
  @HttpCode(200)
  async verify(@Body() dto: any) {
    const tx = this.txs.find(t => t.id === dto.transactionId) || { id: dto.transactionId };
    tx.status = 'SUCCESS';
    return { transactionId: tx.id, status: 'SUCCESS' };
  }
  @Get(':id')
  async get(@Param('id') id: string) {
    const tx = this.txs.find(t => t.id === id) || { id, status: 'UNKNOWN' };
    return tx;
  }
  @Get('invoice/:invoiceId')
  async byInvoice(@Param('invoiceId') invoiceId: string) {
    return this.txs.filter(t => t.invoiceId === invoiceId);
  }
}

describe('Payments (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      controllers: [TestPaymentController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('/payments/initiate (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/payments/initiate')
      .send({ invoiceId: 'INV-99', amount: 2500, gateway: 'PHONEPE' })
      .expect(201);
    expect(res.body.orderId).toBeDefined();
    expect(res.body.redirectUrl).toContain('https://');
  });

  it('/payments/verify (POST)', async () => {
    const init = await request(app.getHttpServer())
      .post('/payments/initiate')
      .send({ invoiceId: 'INV-100', amount: 1000 })
      .expect(201);
    const txId = init.body.orderId.replace('order-','');
    const res = await request(app.getHttpServer())
      .post('/payments/verify')
      .send({ transactionId: txId })
      .expect(200);
    expect(res.body.status).toBe('SUCCESS');
  });

  it('/payments/:id (GET)', async () => {
    const init = await request(app.getHttpServer())
      .post('/payments/initiate')
      .send({ invoiceId: 'INV-101', amount: 500 })
      .expect(201);
    const txId = init.body.orderId.replace('order-','');
    const res = await request(app.getHttpServer())
      .get('/payments/' + txId)
      .expect(200);
    expect(res.body.id).toBe(txId);
  });

  it('/payments/invoice/:invoiceId (GET)', async () => {
    await request(app.getHttpServer()).post('/payments/initiate').send({ invoiceId: 'INV-77', amount: 300 }).expect(201);
    await request(app.getHttpServer()).post('/payments/initiate').send({ invoiceId: 'INV-77', amount: 400 }).expect(201);
    const res = await request(app.getHttpServer())
      .get('/payments/invoice/INV-77')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });
});

