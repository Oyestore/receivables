
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { swaggerSpec } from './swagger.config';

/**
 * Setup Swagger UI
 */
export function setupSwagger(app: Express, apiPrefix: string): void {
  app.use(`${apiPrefix}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SME Receivables API Docs',
  }));
}
