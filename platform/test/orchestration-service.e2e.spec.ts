import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppTestingModule } from './harness/app-testing.module';
import { OrchestrationService } from '../Module_10_Orchestration_Hub/src/services/orchestration.service';

describe('OrchestrationService (Deterministic)', () => {
  let app: INestApplication;
  let svc: OrchestrationService;
  const wfRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), remove: jest.fn() };
  const exRepo = { find: jest.fn(), save: jest.fn(), create: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      providers: [{
        provide: OrchestrationService,
        useFactory: () => {
          const s: any = new (OrchestrationService as any)(undefined, undefined);
          s['workflowRepository'] = wfRepo;
          s['executionRepository'] = exRepo;
          return s as OrchestrationService;
        }
      }],
    }).compile();
    svc = moduleFixture.get(OrchestrationService);
    app = moduleFixture.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('getDashboardStats aggregates counts', async () => {
    const now = new Date();
    wfRepo.find.mockResolvedValue([
      { id: 'wf1', status: 'active' },
      { id: 'wf2', status: 'inactive' },
    ]);
    exRepo.find.mockResolvedValue([
      { executionStatus: 'completed', createdAt: now, duration: 2 },
      { executionStatus: 'running', createdAt: now, duration: 1 },
    ]);
    const stats = await svc.getDashboardStats('tenant');
    expect(stats.totalWorkflows).toBe(2);
    expect(Number(stats.successRate)).toBeGreaterThanOrEqual(50);
    expect(stats.avgDuration).toBeGreaterThan(0);
  });

  it('getWorkflowsByModule filters by moduleName', async () => {
    wfRepo.find.mockResolvedValue([
      { id: 'wf3', moduleName: 'payments' },
    ]);
    const res = await svc.getWorkflowsByModule('tenant', 'payments');
    expect(res.length).toBe(1);
    expect(res[0].moduleName).toBe('payments');
  });
});
