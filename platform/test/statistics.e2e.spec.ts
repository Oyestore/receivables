import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppTestingModule } from './harness/app-testing.module';
import { StatisticalAnalysisService } from '../Module_04_Analytics_Reporting/src/services/statistical-analysis.service';

describe('StatisticalAnalysisService (Deterministic)', () => {
  let app: INestApplication;
  let stats: StatisticalAnalysisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      providers: [StatisticalAnalysisService],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    stats = app.get(StatisticalAnalysisService);
  });

  afterAll(async () => { await app.close(); });

  it('calculates descriptive statistics', () => {
    const res = stats.calculateDescriptiveStatistics([1,2,3,4,5,5]);
    expect(res?.count).toBe(6);
    expect(res?.min).toBe(1);
    expect(res?.max).toBe(5);
    expect(res?.mode).toBe(5);
  });

  it('calculates correlation and regression', () => {
    const c = stats.calculateCorrelation([1,2,3,4], [2,4,6,8]);
    expect(c.coefficient).toBeGreaterThan(0.99);
    const r = stats.performLinearRegression([[1,2],[2,4],[3,6]]);
    expect(r.equation.startsWith('y =')).toBe(true);
    expect(r.predict(4)).toBeCloseTo(8, 5);
  });

  it('detects outliers via IQR', () => {
    const res = stats.detectOutliers([1,2,3,4,100]);
    expect(res.count).toBe(1);
    expect(res.outliers[0]).toBe(100);
  });
});

