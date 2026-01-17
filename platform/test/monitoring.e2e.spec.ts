import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Header } from '@nestjs/common';
import request from 'supertest';
import { AppTestingModule } from './harness/app-testing.module';

@Controller('metrics')
class TestMetricsController {
  @Get()
  @Header('Content-Type', 'text/plain')
  async metrics() { return '# HELP demo_metric A demo metric\n# TYPE demo_metric gauge\ndemo_metric 1\n'; }
  @Get('health')
  async health() { return { status: 'ok', metrics: 'available' }; }
}

describe('Monitoring Metrics (E2E)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppTestingModule], controllers: [TestMetricsController] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('GET /metrics returns prometheus text', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.text.includes('demo_metric')).toBe(true);
  });
  it('GET /metrics/health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/metrics/health').expect(200);
    expect(res.body.metrics).toBe('available');
  });
});

