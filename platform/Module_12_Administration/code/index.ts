import express, { Application, Request, Response, NextFunction } from 'express';
import adminRoutes from './routes/administration.routes';
import { databaseService } from '../../Module_11_Common/code/database/database.service';
import { Logger } from '../../Module_11_Common/code/logging/logger';
import { oauth2Service } from './services/oauth2.service';
import { usageTrackingService } from './services/usage-tracking.service';

const logger = new Logger('AdministrationModule');

export class AdministrationModule {
    private app: Application;

    constructor(app: Application) {
        this.app = app;
    }

    /**
     * Initialize the administration module
     */
    async initialize(): Promise<void> {
        try {
            logger.info('Initializing Administration Module...');

            // Initialize database
            await this.initializeDatabase();

            // Setup middleware
            this.setupMiddleware();

            // Register routes
            this.registerRoutes();

            // Setup scheduled jobs
            this.setupScheduledJobs();

            // Setup error handling
            this.setupErrorHandling();

            logger.info('Administration Module initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Administration Module', { error });
            throw error;
        }
    }

    /**
     * Initialize database connection
     */
    private async initializeDatabase(): Promise<void> {
        try {
            await databaseService.connect({
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                database: process.env.DB_NAME || 'sme_platform',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || '',
            });

            logger.info('Database connected');
        } catch (error) {
            logger.error('Database connection failed', { error });
            throw error;
        }
    }

    /**
     * Setup middleware
     */
    private setupMiddleware(): void {
        // CORS
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        // Body parsing
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Request logging
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            logger.debug('Incoming request', {
                method: req.method,
                path: req.path,
                ip: req.ip,
            });
            next();
        });

        logger.info('Middleware configured');
    }

    /**
     * Register routes
     */
    private registerRoutes(): void {
        // Health check
        this.app.get('/health', (req: Request, res: Response) => {
            res.status(200).json({
                status: 'healthy',
                module: 'administration',
                timestamp: new Date().toISOString(),
            });
        });

        // Administration routes
        this.app.use('/api/v1', adminRoutes);

        logger.info('Routes registered');
    }

    /**
     * Setup scheduled jobs
     */
    private setupScheduledJobs(): void {
        // Cleanup expired OAuth tokens every hour
        setInterval(async () => {
            try {
                const result = await oauth2Service.cleanupExpired();
                logger.info('OAuth token cleanup completed', result);
            } catch (error) {
                logger.error('OAuth token cleanup failed', { error });
            }
        }, 60 * 60 * 1000); // 1 hour

        // Reset daily quotas at midnight
        setInterval(async () => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                try {
                    const count = await usageTrackingService.resetQuotas('daily');
                    logger.info('Daily quotas reset', { count });
                } catch (error) {
                    logger.error('Daily quota reset failed', { error });
                }
            }
        }, 60 * 1000); // Check every minute

        logger.info('Scheduled jobs configured');
    }

    /**
     * Setup error handling
     */
    private setupErrorHandling(): void {
        // 404 handler
        this.app.use((req: Request, res: Response) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.method} ${req.path} not found`,
            });
        });

        // Global error handler
        this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
            logger.error('Unhandled error', {
                error: error.message,
                stack: error.stack,
                path: req.path,
            });

            const statusCode = error.statusCode || 500;
            const message = error.message || 'Internal Server Error';

            res.status(statusCode).json({
                error: error.name || 'Error',
                message,
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
            });
        });

        logger.info('Error handling configured');
    }

    /**
     * Shutdown gracefully
     */
    async shutdown(): Promise<void> {
        logger.info('Shutting down Administration Module...');

        try {
            await databaseService.disconnect();
            logger.info('Administration Module shutdown complete');
        } catch (error) {
            logger.error('Error during shutdown', { error });
        }
    }
}

// Export factory function
export const createAdministrationModule = (app: Application): AdministrationModule => {
    return new AdministrationModule(app);
};
