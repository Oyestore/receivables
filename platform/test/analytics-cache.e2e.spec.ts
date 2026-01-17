import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppTestingModule } from './harness/app-testing.module';
import { CacheService } from '../Module_04_Analytics_Reporting/src/services/cache.service';
import { ConfigService } from '@nestjs/config';

describe('Analytics CacheService (Deterministic)', () => {
  let app: INestApplication;
  let cache: CacheService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestingModule],
      providers: [CacheService, { provide: ConfigService, useValue: { get: () => undefined } }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    cache = app.get(CacheService);
  });

  afterAll(async () => { await app.close(); });

  it('returns nulls/booleans deterministically when Redis may be unavailable', async () => {
    expect(await cache.get('missing')).toBeNull();
    await cache.set('k', { a: 1 }, 10);
    expect(await cache.delete('k')).toBeUndefined();
    expect(await cache.invalidatePattern('x:*')).toBe(0);
    expect(await cache.getStats()).toBeNull();
    expect(await cache.getTTL('k')).toBe(-1);
    expect(await cache.exists('k')).toBe(false);
    expect(await cache.increment('ctr')).toBe(0);
  });

  it('getOrSet returns fallback when cache miss', async () => {
    const val = await cache.getOrSet('k2', async () => ({ x: 1 }), 5);
    expect(val).toEqual({ x: 1 });
  });
});
