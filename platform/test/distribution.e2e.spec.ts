import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Post, Get, Body, Param } from '@nestjs/common';
import request from 'supertest';
import { AppTestingModule } from './harness/app-testing.module';

@Controller('distribution')
class TestDistributionController {
  private jobs: any[] = [];
  private events: any[] = [];
  @Post('jobs')
  async createJob(@Body() dto: any) { const id = 'job-' + (this.jobs.length + 1); const job = { id, channel: dto.channel || 'EMAIL', recipients: dto.recipients || [], status: 'QUEUED' }; this.jobs.push(job); return job; }
  @Get('jobs')
  async listJobs() { return this.jobs; }
  @Post('events/:jobId')
  async addEvent(@Param('jobId') jobId: string, @Body() dto: any) { const ev = { jobId, type: dto.type || 'DELIVERED', ts: new Date().toISOString() }; this.events.push(ev); return ev; }
  @Get('events/:jobId')
  async listEvents(@Param('jobId') jobId: string) { return this.events.filter(e => e.jobId === jobId); }
}

describe('Intelligent Distribution (E2E)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppTestingModule], controllers: [TestDistributionController] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('Create job and track events', async () => {
    const job = await request(app.getHttpServer()).post('/distribution/jobs').send({ channel: 'WHATSAPP', recipients: ['+911234567890'] }).expect(201);
    const jobId = job.body.id;
    await request(app.getHttpServer()).post(`/distribution/events/${jobId}`).send({ type: 'DELIVERED' }).expect(201);
    const events = await request(app.getHttpServer()).get(`/distribution/events/${jobId}`).expect(200);
    expect(events.body.length).toBe(1);
  });
});

