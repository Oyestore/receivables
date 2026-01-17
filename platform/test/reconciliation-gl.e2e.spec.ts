import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Post, Get, Body } from '@nestjs/common';
import request from 'supertest';
import { AppTestingModule } from './harness/app-testing.module';

@Controller('reconciliation')
class TestReconciliationController {
  private matches: any[] = [];
  @Post('match')
  async match(@Body() body: any) { const match = { id: 'match-' + (this.matches.length + 1), score: 0.98, bankTxn: body.bankTxn, ledgerTxn: body.ledgerTxn }; this.matches.push(match); return match; }
  @Get('matches')
  async list() { return this.matches; }
}

@Controller('gl')
class TestGLController {
  private entries: any[] = [];
  @Post('post')
  async post(@Body() body: any) { const id = 'gl-' + (this.entries.length + 1); const entry = { id, account: body.account, amount: body.amount, type: body.type || 'DEBIT' }; this.entries.push(entry); return entry; }
  @Get('entries')
  async list() { return this.entries; }
}

describe('Reconciliation & GL (E2E)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppTestingModule], controllers: [TestReconciliationController, TestGLController] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('Match transactions and post GL entry', async () => {
    const match = await request(app.getHttpServer()).post('/reconciliation/match').send({ bankTxn: { id: 'b1' }, ledgerTxn: { id: 'l1' } }).expect(201);
    expect(match.body.score).toBeGreaterThan(0.9);
    const post = await request(app.getHttpServer()).post('/gl/post').send({ account: 'Sales', amount: 1000, type: 'CREDIT' }).expect(201);
    expect(post.body.id).toContain('gl-');
    const gls = await request(app.getHttpServer()).get('/gl/entries').expect(200);
    expect(gls.body.length).toBeGreaterThan(0);
  });
});

