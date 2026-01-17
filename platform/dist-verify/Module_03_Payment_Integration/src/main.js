"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const helmet = __importStar(require("helmet"));
const compression = __importStar(require("compression"));
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    // Security middleware
    app.use(helmet());
    app.use(compression());
    // CORS configuration
    app.enableCors({
        origin: configService.get('CORS_ORIGIN', '*'),
        credentials: configService.get('CORS_CREDENTIALS', true),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    });
    // Global validation pipe
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    // API prefix
    const apiPrefix = configService.get('API_PREFIX', 'api/v1');
    app.setGlobalPrefix(apiPrefix);
    // Swagger configuration
    if (configService.get('ENABLE_SWAGGER', true)) {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('Payment Integration API')
            .setDescription('Advanced Payment Integration Module with Multi-Gateway Support and AI-Powered Analytics')
            .setVersion('3.0.0')
            .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'apiKey')
            .addBearerAuth()
            .addTag('Payment')
            .addTag('Health')
            .addTag('Analytics')
            .addTag('Integrations')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                docExpansion: 'none',
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
            },
            customSiteTitle: 'Payment Integration API Documentation',
            customfavIcon: '/favicon.ico',
            customCss: `
        .topbar-wrapper img { content: url('https://example.com/logo.png'); }
        .swagger-ui .topbar { background-color: #1a73e8; }
        .swagger-ui .topbar-wrapper .link { color: white; }
      `,
        });
    }
    // Health check endpoint for Docker
    app.getHttpAdapter().get('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });
    // Start the application
    const port = configService.get('PORT', 3003);
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Payment Integration API is running on port ${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/${apiPrefix}/docs`);
    console.log(`🏥 Health Check: http://localhost:${port}/health`);
}
bootstrap().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map