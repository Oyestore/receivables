import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config();

const buildDatabaseUrl = (): string => {
    const explicitUrl = process.env.DATABASE_URL;
    if (explicitUrl && explicitUrl.trim().length > 0) return explicitUrl;
    const host = process.env.PGHOST || 'localhost';
    const port = process.env.PGPORT || '5432';
    const user = process.env.PGUSER || 'postgres';
    const pass = process.env.PGPASSWORD || 'postgres';
    const db = process.env.PGDATABASE || 'sme_platform';
    return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
};

export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    url: buildDatabaseUrl(),

    // Entity paths - Hardcoded forward slashes for Windows compatibility
    entities: [
        __dirname + '/Module_01_Smart_Invoice_Generation/src/entities/**/*.entity.{ts,js}',
        __dirname + '/Module_12_Administration/src/entities/**/*.entity.{ts,js}',
        __dirname + '/Module_03_Payment_Integration/src/entities/**/*.entity.{ts,js}',
        __dirname + '/Module_04_Analytics_Reporting/src/entities/**/*.entity.{ts,js}',
        __dirname + '/Module_05_Milestone_Workflows/src/entities/**/*.entity.{ts,js}',
        __dirname + '/Module_06_Credit_Scoring/src/entities/**/*.entity.{ts,js}',
        __dirname + '/Module_07_Financing/src/entities/**/*.entity.{ts,js}',
        __dirname + '/Module_11_Common/src/entities/**/*.entity.{ts,js}',
    ],

    // Migration configuration
    migrations: [
        join(__dirname, 'migrations/**/*.{ts,js}').replace(/\\/g, '/'),
        join(__dirname, 'Module_06_Credit_Scoring/migrations/*.{ts,js}').replace(/\\/g, '/'),
    ],
    migrationsTableName: 'migrations',

    // Schema configuration
    schema: 'public',

    // ============================================
    // CONNECTION POOL CONFIGURATION
    // ============================================
    // Maximum number of connections in the pool
    poolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),

    // Connection pool settings (requires pg driver options)
    extra: {
        // Maximum number of connections allowed
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),

        // Minimum number of connections to maintain
        min: parseInt(process.env.DB_POOL_MIN || '2', 10),

        // Idle connection timeout (30 seconds)
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),

        // Connection timeout (10 seconds)
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),

        // Maximum time to wait for connection acquire (30 seconds)
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000', 10),

        // Statement timeout for queries (60 seconds)
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '60000', 10),

        // Enable keep-alive for connections
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
    },

    // ============================================
    // QUERY & PERFORMANCE CONFIGURATION
    // ============================================
    // Maximum query execution time (60 seconds)
    maxQueryExecutionTime: parseInt(process.env.DB_MAX_QUERY_TIME || '60000', 10),

    // Logging
    logging: process.env.NODE_ENV === 'development',
    logger: 'advanced-console',

    // Cache configuration
    cache: process.env.DB_CACHE_ENABLED === 'true' ? {
        type: 'database',
        duration: parseInt(process.env.DB_CACHE_DURATION || '60000', 10), // 1 minute default
    } : false,

    // Synchronization (NEVER true in production!)
    synchronize: false,

    // Drop schema on connection (NEVER true!)
    dropSchema: false,

    // ============================================
    // RETRY & RESILIENCE CONFIGURATION  
    // ============================================
    // Auto reconnect on connection loss
    connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),

    // SSL configuration for production
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    } : false,
};

// Create and export the data source
export const AppDataSource = new DataSource(dataSourceOptions);

/**
 * Initialize data source with retry logic
 * Implements exponential backoff for connection failures
 */
export const initializeDataSource = async (maxRetries = 5) => {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            // Test connection
            await AppDataSource.query('SELECT 1');

            console.log('✅ Data Source has been initialized successfully');
            console.log(`📊 Connection Pool: Min=${dataSourceOptions.extra?.min}, Max=${dataSourceOptions.extra?.max}`);
            console.log(`⏱️  Idle Timeout: ${dataSourceOptions.extra?.idleTimeoutMillis}ms`);
            console.log(`🔍 Query Timeout: ${dataSourceOptions.maxQueryExecutionTime}ms`);

            return AppDataSource;
        } catch (error: any) {
            retries++;
            const waitTime = Math.min(1000 * Math.pow(2, retries), 30000); // Exponential backoff, max 30s

            console.error(`❌ Database connection attempt ${retries}/${maxRetries} failed:`, error?.message || error);

            if (retries >= maxRetries) {
                console.error('💥 Maximum retry attempts reached. Database connection failed.');
                throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${error?.message || error}`);
            }

            console.log(`⏳ Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    throw new Error('Failed to initialize data source');
};

/**
 * Gracefully close database connection
 */
export const closeDataSource = async () => {
    try {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('✅ Data Source has been closed successfully');
        }
    } catch (error) {
        console.error('❌ Error during Data Source closure:', error);
        throw error;
    }
};

/**
 * Check database health
 */
export const checkDatabaseHealth = async (): Promise<{
    connected: boolean;
    responseTime: number;
    error?: string;
}> => {
    const startTime = Date.now();

    try {
        if (!AppDataSource.isInitialized) {
            return {
                connected: false,
                responseTime: 0,
                error: 'Database not initialized',
            };
        }

        await AppDataSource.query('SELECT 1');

        return {
            connected: true,
            responseTime: Date.now() - startTime,
        };
    } catch (error: any) {
        return {
            connected: false,
            responseTime: Date.now() - startTime,
            error: error?.message || 'Unknown error',
        };
    }
};
