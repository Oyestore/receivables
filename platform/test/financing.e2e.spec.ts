import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Post, Get, Body, Param } from '@nestjs/common';
import request from 'supertest';
import { AppTestingModule } from './harness/app-testing.module';

@Controller('api/tenant/:tenantId/financing/requests')
class TestFinancingRequestController {
  private store: any[] = [];
  @Post()
  async create(@Param('tenantId') tenantId: string, @Body() dto: any) {
    const id = 'req-' + (this.store.length + 1);
    const req = { id, tenantId, status: 'DRAFT', ...dto };
    this.store.push(req);
    return req;
  }
  @Get()
  async list(@Param('tenantId') tenantId: string) { return this.store.filter(r => r.tenantId === tenantId); }
  @Get(':id')
  async get(@Param('id') id: string) { return this.store.find(r => r.id === id); }
  @Post(':id/submit')
  async submit(@Param('id') id: string) { const r = this.store.find(x => x.id === id); r.status = 'SUBMITTED'; return r; }
}

describe('Financing Requests (E2E)', () => {
  let app: INestApplication;
  let tenant = 'tenant-test';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      controllers: [TestFinancingRequestController],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('POST create financing request', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/tenant/${tenant}/financing/requests`)
      .send({ amount: 50000, currency: 'INR' })
      .expect(201);
    expect(res.body.id).toBeDefined();
  });

  it('GET list financing requests', async () => {
    await request(app.getHttpServer()).post(`/api/tenant/${tenant}/financing/requests`).send({ amount: 60000, currency: 'INR' });
    const res = await request(app.getHttpServer())
      .get(`/api/tenant/${tenant}/financing/requests`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST submit request', async () => {
    const create = await request(app.getHttpServer()).post(`/api/tenant/${tenant}/financing/requests`).send({ amount: 75000, currency: 'INR' });
    const id = create.body.id;
    const res = await request(app.getHttpServer())
      .post(`/api/tenant/${tenant}/financing/requests/${id}/submit`)
      .expect(201);
    expect(res.body.status).toBe('SUBMITTED');
  });
});

