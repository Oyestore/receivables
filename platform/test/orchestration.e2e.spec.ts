import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Post, Get, Put, Delete, Body, Param, Query } from '@nestjs/common';
import request from 'supertest';
import { AppTestingModule } from './harness/app-testing.module';

type Workflow = { id: string; name: string; module?: string; steps: any[] };
type Execution = { id: string; workflowId: string; status: string };

@Controller('api/v1/orchestration')
class TestOrchestrationController {
  private workflows: Workflow[] = [];
  private executions: Execution[] = [];

  @Post('workflows')
  async create(@Body() dto: any) {
    const id = 'wf-' + (this.workflows.length + 1);
    const wf = { id, name: dto.name || id, module: dto.module, steps: dto.steps || [] };
    this.workflows.push(wf);
    return wf;
  }
  @Get('workflows')
  async list(@Query('module') module?: string) { return module ? this.workflows.filter(w => w.module === module) : this.workflows; }
  @Get('workflows/:id')
  async get(@Param('id') id: string) { return this.workflows.find(w => w.id === id); }
  @Put('workflows/:id')
  async update(@Param('id') id: string, @Body() dto: any) { const wf = this.workflows.find(w => w.id === id); Object.assign(wf!, dto); return wf; }
  @Delete('workflows/:id')
  async del(@Param('id') id: string) { this.workflows = this.workflows.filter(w => w.id !== id); return { message: 'Workflow deleted successfully' }; }
  @Post('execute')
  async execute(@Body() dto: any) { const id = 'exec-' + (this.executions.length + 1); const exec = { id, workflowId: dto.workflowId, status: 'COMPLETED' }; this.executions.push(exec); return exec; }
  @Get('executions')
  async executionsList(@Query('workflowId') workflowId?: string) { return workflowId ? this.executions.filter(e => e.workflowId === workflowId) : this.executions; }
  @Get('dashboard/stats')
  async stats() { return { workflows: this.workflows.length, executions: this.executions.length }; }
}

describe('Orchestration Hub (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      controllers: [TestOrchestrationController],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('CRUD workflows and execute', async () => {
    const create = await request(app.getHttpServer()).post('/api/v1/orchestration/workflows').send({ name: 'Demo', module: 'payments' }).expect(201);
    const id = create.body.id;
    const getRes = await request(app.getHttpServer()).get(`/api/v1/orchestration/workflows/${id}`).expect(200);
    expect(getRes.body.name).toBe('Demo');
    const upd = await request(app.getHttpServer()).put(`/api/v1/orchestration/workflows/${id}`).send({ name: 'Demo2' }).expect(200);
    expect(upd.body.name).toBe('Demo2');
    const exec = await request(app.getHttpServer()).post('/api/v1/orchestration/execute').send({ workflowId: id }).expect(201);
    expect(exec.body.status).toBe('COMPLETED');
    const stats = await request(app.getHttpServer()).get('/api/v1/orchestration/dashboard/stats').expect(200);
    expect(stats.body.workflows).toBeGreaterThan(0);
    await request(app.getHttpServer()).delete(`/api/v1/orchestration/workflows/${id}`).expect(200);
  });
});

