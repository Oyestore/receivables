import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config/config.service';
import { DatabaseError } from '../errors/app-error';
import { Logger } from '../logging/logger';

const logger = new Logger('DatabaseService');

/**
 * Query options interface
 */
export interface IQueryOptions {
  schema?: string;
  timeout?: number;
  transaction?: boolean;
}

/**
 * Transaction interface
 */
export interface ITransaction {
  client: PoolClient;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

/**
 * Database Service
 * Manages PostgreSQL connections and queries with multi-tenancy support
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private pool: Pool;
  private isConnected: boolean = false;

  private constructor() {
    this.pool = this.createPool();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Create PostgreSQL connection pool
   */
  private createPool(): Pool {
    const dbConfig = config.getValue('database');

    const pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      max: dbConfig.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: dbConfig.connectionTimeout,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      logger.error('Unexpected database pool error', err);
    });

    // Handle pool connection
    pool.on('connect', () => {
      logger.debug('New database connection established');
    });

    // Handle pool removal
    pool.on('remove', () => {
      logger.debug('Database connection removed from pool');
    });

    return pool;
  }

  /**
   * Connect to database and verify connection
   */
  public async connect(): Promise<void> {
    try {
      logger.info('Connecting to database...');

      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;

      logger.info('Database connected successfully', {
        timestamp: result.rows[0].now,
        host: config.getValue('database').host,
        database: config.getValue('database').database,
      });
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to database', error as Error);
      throw new DatabaseError('Database connection failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database', error as Error);
      throw new DatabaseError('Database disconnection failed');
    }
  }

  /**
   * Execute query
   */
  public async query<T = unknown>(
    sql: string,
    params?: unknown[],
    options?: IQueryOptions
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();

    try {
      // Set schema if provided (for multi-tenancy)
      if (options?.schema) {
        await this.setSchema(options.schema);
      }

      // Execute query
      const result = await this.pool.query<T>(sql, params);

      const duration = Date.now() - startTime;
      logger.query(sql, params, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database query failed', {
        sql,
        params,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new DatabaseError('Query execution failed', {
        sql,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Execute query and return first row
   */
  public async queryOne<T = unknown>(
    sql: string,
    params?: unknown[],
    options?: IQueryOptions
  ): Promise<T | null> {
    const result = await this.query<T>(sql, params, options);
    return result.rows[0] || null;
  }

  /**
   * Execute query and return all rows
   */
  public async queryMany<T = unknown>(
    sql: string,
    params?: unknown[],
    options?: IQueryOptions
  ): Promise<T[]> {
    const result = await this.query<T>(sql, params, options);
    return result.rows;
  }

  /**
   * Begin transaction
   */
  public async beginTransaction(schema?: string): Promise<ITransaction> {
    const client = await this.pool.connect();

    try {
      // Set schema if provided
      if (schema) {
        await client.query(`SET search_path TO ${schema}`);
      }

      await client.query('BEGIN');

      logger.debug('Transaction started', { schema });

      return {
        client,
        commit: async () => {
          try {
            await client.query('COMMIT');
            logger.debug('Transaction committed', { schema });
          } finally {
            client.release();
          }
        },
        rollback: async () => {
          try {
            await client.query('ROLLBACK');
            logger.debug('Transaction rolled back', { schema });
          } finally {
            client.release();
          }
        },
      };
    } catch (error) {
      client.release();
      throw error;
    }
  }

  /**
   * Execute function within transaction
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    schema?: string
  ): Promise<T> {
    const transaction = await this.beginTransaction(schema);

    try {
      const result = await callback(transaction.client);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Set schema for current connection (multi-tenancy)
   */
  private async setSchema(schema: string): Promise<void> {
    await this.pool.query(`SET search_path TO ${schema}`);
  }

  /**
   * Create schema (for tenant provisioning)
   */
  public async createSchema(schema: string): Promise<void> {
    try {
      await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      logger.info('Schema created', { schema });
    } catch (error) {
      logger.error('Failed to create schema', {
        schema,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Schema creation failed', { schema });
    }
  }

  /**
   * Drop schema (for tenant deletion)
   */
  public async dropSchema(schema: string, cascade: boolean = false): Promise<void> {
    try {
      const cascadeClause = cascade ? 'CASCADE' : '';
      await this.pool.query(`DROP SCHEMA IF EXISTS ${schema} ${cascadeClause}`);
      logger.warn('Schema dropped', { schema, cascade });
    } catch (error) {
      logger.error('Failed to drop schema', {
        schema,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Schema deletion failed', { schema });
    }
  }

  /**
   * Check if schema exists
   */
  public async schemaExists(schema: string): Promise<boolean> {
    const result = await this.queryOne<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)',
      [schema]
    );
    return result?.exists || false;
  }

  /**
   * Get connection pool statistics
   */
  public getPoolStats(): {
    total: number;
    idle: number;
    waiting: number;
  } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Check if database is connected
   */
  public isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Perform health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database health check failed', error as Error);
      return false;
    }
  }
}

// Export singleton instance
export const database = DatabaseService.getInstance();
