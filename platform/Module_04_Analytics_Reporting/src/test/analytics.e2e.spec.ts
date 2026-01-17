import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Analytics API E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token for protected endpoints
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@smeplatform.com',
        password: 'admin123',
      });

    authToken = response.body.data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('should reject requests without API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics')
        .expect(401);
    });

    it('should accept requests with valid API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200);
    });

    it('should reject requests with invalid API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics')
        .set('X-API-Key', 'invalid-key')
        .expect(401);
    });
  });

  describe('Analytics API', () => {
    let createdDashboardId: string;

    it('should create a new dashboard', () => {
      return request(app.getHttpServer())
        .post('/api/v1/dashboards')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          name: 'Test Dashboard',
          description: 'Test dashboard for E2E testing',
          type: 'business',
          layout: { grid: { cols: 12, rows: 8 } },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Test Dashboard');
          createdDashboardId = res.body.data.id;
        });
    });

    it('should get all dashboards', () => {
      return request(app.getHttpServer())
        .get('/api/v1/dashboards')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should get a specific dashboard', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/dashboards/${createdDashboardId}`)
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(createdDashboardId);
        });
    });

    it('should update a dashboard', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/dashboards/${createdDashboardId}`)
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          name: 'Updated Test Dashboard',
          description: 'Updated description',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Updated Test Dashboard');
        });
    });

    it('should add widgets to dashboard', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/dashboards/${createdDashboardId}/widgets`)
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          name: 'Revenue Chart',
          type: 'chart',
          position: { x: 0, y: 0, w: 6, h: 4 },
          config: { chartType: 'line', title: 'Monthly Revenue' },
          data_source: { query: 'SELECT month, revenue FROM monthly_revenue' },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Revenue Chart');
        });
    });

    it('should get dashboard widgets', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/dashboards/${createdDashboardId}/widgets`)
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('Reports API', () => {
    let createdTemplateId: string;
    let createdExecutionId: string;

    it('should create a report template', () => {
      return request(app.getHttpServer())
        .post('/api/v1/reports/templates')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          name: 'Financial Report Template',
          description: 'Monthly financial performance report',
          format: 'pdf',
          template_config: {
            sections: [
              { name: 'Revenue', type: 'chart' },
              { name: 'Expenses', type: 'table' },
              { name: 'Summary', type: 'text' },
            ],
          },
          parameters: {
            start_date: { type: 'date', required: true },
            end_date: { type: 'date', required: true },
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Financial Report Template');
          createdTemplateId = res.body.data.id;
        });
    });

    it('should get all report templates', () => {
      return request(app.getHttpServer())
        .get('/api/v1/reports/templates')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should execute a report', () => {
      return request(app.getHttpServer())
        .post('/api/v1/reports/execute')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          template_id: createdTemplateId,
          name: 'Monthly Financial Report',
          parameters: {
            start_date: '2025-01-01',
            end_date: '2025-01-31',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe('pending');
          createdExecutionId = res.body.data.id;
        });
    });

    it('should get report execution status', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/reports/executions/${createdExecutionId}`)
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(createdExecutionId);
        });
    });

    it('should get all report executions', () => {
      return request(app.getHttpServer())
        .get('/api/v1/reports/executions')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('AI Insights API', () => {
    it('should generate AI insights', () => {
      return request(app.getHttpServer())
        .post('/api/v1/ai/insights')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          type: 'trend',
          data_sources: ['revenue', 'customers'],
          time_period: '30d',
          metrics: ['revenue_growth', 'customer_acquisition'],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.type).toBe('trend');
          expect(res.body.data.confidence_score).toBeDefined();
        });
    });

    it('should get all AI insights', () => {
      return request(app.getHttpServer())
        .get('/api/v1/ai/insights')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should get AI insights by type', () => {
      return request(app.getHttpServer())
        .get('/api/v1/ai/insights?type=trend')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('Anomaly Detection API', () => {
    it('should detect anomalies', () => {
      return request(app.getHttpServer())
        .post('/api/v1/anomalies/detect')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          metric_name: 'revenue',
          data_source: 'sales_data',
          time_period: '7d',
          sensitivity: 'medium',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data.anomalies)).toBe(true);
        });
    });

    it('should get all anomalies', () => {
      return request(app.getHttpServer())
        .get('/api/v1/anomalies')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should get anomalies by severity', () => {
      return request(app.getHttpServer())
        .get('/api/v1/anomalies?severity=high')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should resolve an anomaly', () => {
      return request(app.getHttpServer())
        .post('/api/v1/anomalies/resolve')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          anomaly_id: '550e8400-e29b-41d4-a716-446655440001',
          resolution_notes: 'False positive - data was correct',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe('resolved');
        });
    });
  });

  describe('Real-time Analytics API', () => {
    it('should get real-time metrics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/realtime')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.metrics).toBeDefined();
          expect(res.body.data.timestamp).toBeDefined();
        });
    });

    it('should get real-time dashboard data', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/realtime/dashboard/550e8400-e29b-41d4-a716-446655440001')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.widgets).toBeDefined();
        });
    });

    it('should subscribe to real-time updates', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/realtime/subscribe')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          dashboard_id: '550e8400-e29b-41d4-a716-446655440001',
          widget_ids: ['660e8400-e29b-41d4-a716-446655440001'],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.subscription_id).toBeDefined();
        });
    });
  });

  describe('Query Builder API', () => {
    it('should build and execute query', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/query')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          tables: ['sales', 'customers'],
          columns: ['sales.amount', 'customers.name'],
          filters: [
            { field: 'sales.date', operator: '>=', value: '2025-01-01' },
            { field: 'sales.amount', operator: '>', value: 1000 },
          ],
          group_by: ['customers.name'],
          order_by: [{ field: 'sales.amount', direction: 'DESC' }],
          limit: 10,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should validate query', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/query/validate')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          tables: ['sales'],
          columns: ['amount', 'date'],
          filters: [{ field: 'amount', operator: '>', value: 0 }],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.is_valid).toBe(true);
        });
    });

    it('should get available tables', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/query/tables')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should get table schema', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/query/tables/sales/schema')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.columns).toBeDefined();
        });
    });
  });

  describe('Export API', () => {
    it('should export dashboard data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/export/dashboard')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          dashboard_id: '550e8400-e29b-41d4-a716-446655440001',
          format: 'xlsx',
          date_range: {
            start_date: '2025-01-01',
            end_date: '2025-01-31',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.export_id).toBeDefined();
        });
    });

    it('should export analytics data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/export/data')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          query: 'SELECT * FROM sales WHERE date >= \'2025-01-01\'',
          format: 'csv',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.export_id).toBeDefined();
        });
    });

    it('should get export status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/export/550e8400-e29b-41d4-a716-446655440001')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBeDefined();
        });
    });
  });

  describe('Health Check API', () => {
    it('should return comprehensive health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
          expect(res.body.services).toBeDefined();
          expect(res.body.metrics).toBeDefined();
        });
    });

    it('should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
          expect(res.body.checks).toBeDefined();
        });
    });

    it('should return provider status', () => {
      return request(app.getHttpServer())
        .get('/health/providers')
        .expect(200)
        .expect((res) => {
          expect(res.body.clickhouse).toBeDefined();
          expect(res.body.redis).toBeDefined();
          expect(res.body.postgresql).toBeDefined();
        });
    });

    it('should return system metrics', () => {
      return request(app.getHttpServer())
        .get('/health/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.body.memory).toBeDefined();
          expect(res.body.cpu).toBeDefined();
          expect(res.body.uptime).toBeDefined();
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors properly', () => {
      return request(app.getHttpServer())
        .post('/api/v1/dashboards')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          // Missing required fields
          description: 'Test dashboard without name',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('VALIDATION_FAILED');
        });
    });

    it('should handle not found errors properly', () => {
      return request(app.getHttpServer())
        .get('/api/v1/dashboards/non-existent-id')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('NOT_FOUND');
        });
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests to trigger rate limiting
      const promises = Array(101).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/api/v1/analytics')
          .set('X-API-Key', 'sk-analytics-key')
      );

      const results = await Promise.allSettled(promises);
      const rateLimitedRequests = results.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      // Create a dashboard
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/dashboards')
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          name: 'Consistency Test Dashboard',
          type: 'business',
          layout: { grid: { cols: 12, rows: 8 } },
        });

      const dashboardId = createResponse.body.data.id;

      // Add a widget to the dashboard
      const widgetResponse = await request(app.getHttpServer())
        .post(`/api/v1/dashboards/${dashboardId}/widgets`)
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          name: 'Test Widget',
          type: 'metric',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: { title: 'Test Metric' },
        });

      const widgetId = widgetResponse.body.data.id;

      // Verify the widget is associated with the dashboard
      const getWidgetsResponse = await request(app.getHttpServer())
        .get(`/api/v1/dashboards/${dashboardId}/widgets`)
        .set('X-API-Key', 'sk-analytics-key');

      expect(getWidgetsResponse.body.data.some(w => w.id === widgetId)).toBe(true);

      // Update the dashboard
      await request(app.getHttpServer())
        .patch(`/api/v1/dashboards/${dashboardId}`)
        .set('X-API-Key', 'sk-analytics-key')
        .send({
          name: 'Updated Consistency Test Dashboard',
        });

      // Verify the widget is still associated with the updated dashboard
      const updatedWidgetsResponse = await request(app.getHttpServer())
        .get(`/api/v1/dashboards/${dashboardId}/widgets`)
        .set('X-API-Key', 'sk-analytics-key');

      expect(updatedWidgetsResponse.body.data.some(w => w.id === widgetId)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = 50;
      const promises = Array(concurrentRequests).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/api/v1/dashboards')
          .set('X-API-Key', 'sk-analytics-key')
      );

      const results = await Promise.allSettled(promises);
      const successfulRequests = results.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );

      expect(successfulRequests.length).toBe(concurrentRequests);
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/dashboards')
        .set('X-API-Key', 'sk-analytics-key')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
