'''
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../config/config.service';

const swaggerOptions: swaggerJsdoc.Options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'SME Receivables Platform API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the SME Receivables Platform',
      contact: {
        name: 'Support Team',
        email: 'support@sme-receivables.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.getValue('port')}${config.getValue('apiPrefix')}`,
        description: 'Development Server',
      },
      {
        url: 'https://staging.sme-receivables.com/api/v1',
        description: 'Staging Server',
      },
      {
        url: 'https://app.sme-receivables.com/api/v1',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.ts', './src/common/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
'''
