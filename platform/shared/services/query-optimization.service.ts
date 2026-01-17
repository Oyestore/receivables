import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';

/**
 * Database query optimization utilities
 */
@Injectable()
export class QueryOptimizationService {
    private readonly logger = new Logger(QueryOptimizationService.name);

    constructor(private readonly dataSource: DataSource) { }

    /**
     * Add pagination with optimized query
     */
    addPagination<T>(
        queryBuilder: SelectQueryBuilder<T>,
        page: number = 1,
        limit: number = 20,
    ): SelectQueryBuilder<T> {
        const skip = (page - 1) * limit;
        return queryBuilder.skip(skip).take(limit);
    }

    /**
     * Add efficient counting (using window functions)
     */
    async getPaginatedResults<T>(
        queryBuilder: SelectQueryBuilder<T>,
        page: number = 1,
        limit: number = 20,
    ): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
        const skip = (page - 1) * limit;

        // Execute query with pagination
        const [data, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Optimize query with selective fields
     */
    selectFields<T>(
        queryBuilder: SelectQueryBuilder<T>,
        alias: string,
        fields: string[],
    ): SelectQueryBuilder<T> {
        const selections = fields.map((field) => `${alias}.${field}`);
        return queryBuilder.select(selections);
    }

    /**
     * Add efficient JOIN with field selection
     */
    addOptimizedJoin<T>(
        queryBuilder: SelectQueryBuilder<T>,
        relation: string,
        alias: string,
        fields?: string[],
    ): SelectQueryBuilder<T> {
        queryBuilder.leftJoin(relation, alias);

        if (fields) {
            fields.forEach((field) => {
                queryBuilder.addSelect(`${alias}.${field}`);
            });
        }

        return queryBuilder;
    }

    /**
     * Batch insert with optimized query
     */
    async batchInsert<T>(
        repository: any,
        entities: T[],
        batchSize: number = 1000,
    ): Promise<void> {
        const batches = this.chunk(entities, batchSize);

        for (const batch of batches) {
            await repository.insert(batch);
            this.logger.debug(`Inserted batch of ${batch.length} records`);
        }

        this.logger.log(`Batch insert complete: ${entities.length} records`);
    }

    /**
     * Batch update with optimized query
     */
    async batchUpdate<T>(
        repository: any,
        updates: Array<{ id: string; data: Partial<T> }>,
        batchSize: number = 500,
    ): Promise<void> {
        const batches = this.chunk(updates, batchSize);

        for (const batch of batches) {
            await Promise.all(
                batch.map(({ id, data }) => repository.update(id, data)),
            );
            this.logger.debug(`Updated batch of ${batch.length} records`);
        }

        this.logger.log(`Batch update complete: ${updates.length} records`);
    }

    /**
     * Execute raw query with parameters (safe from SQL injection)
     */
    async executeRawQuery(query: string, parameters: any[] = []): Promise<any> {
        return this.dataSource.query(query, parameters);
    }

    /**
     * Analyze query performance
     */
    async analyzeQuery(query: string): Promise<any> {
        const explainQuery = `EXPLAIN ANALYZE ${query}`;
        const result = await this.dataSource.query(explainQuery);
        return result;
    }

    /**
     * Get slow queries from PostgreSQL logs
     */
    async getSlowQueries(thresholdMs: number = 1000): Promise<any[]> {
        // This requires pg_stat_statements extension
        const query = `
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time
      FROM pg_stat_statements
      WHERE mean_time > $1
      ORDER BY mean_time DESC
      LIMIT 20
    `;

        try {
            return await this.dataSource.query(query, [thresholdMs]);
        } catch (error) {
            this.logger.warn('pg_stat_statements not available');
            return [];
        }
    }

    /**
     * Create index if not exists
     */
    async createIndexIfNotExists(
        table: string,
        columns: string[],
        indexName?: string,
    ): Promise<void> {
        const name = indexName || `idx_${table}_${columns.join('_')}`;
        const columnList = columns.join(', ');

        const query = `
      CREATE INDEX IF NOT EXISTS ${name}
      ON ${table} (${columnList})
    `;

        await this.dataSource.query(query);
        this.logger.log(`Index created: ${name}`);
    }

    /**
     * Get table statistics
     */
    async getTableStats(tableName: string): Promise<{
        rowCount: number;
        tableSize: string;
        indexSize: string;
        totalSize: string;
    }> {
        const query = `
      SELECT 
        (SELECT COUNT(*) FROM ${tableName}) as row_count,
        pg_size_pretty(pg_table_size('${tableName}'::regclass)) as table_size,
        pg_size_pretty(pg_indexes_size('${tableName}'::regclass)) as index_size,
        pg_size_pretty(pg_total_relation_size('${tableName}'::regclass)) as total_size
    `;

        const result = await this.dataSource.query(query);
        return result[0];
    }

    /**
     * Vacuum analyze table (maintenance)
     */
    async vacuumAnalyze(tableName: string): Promise<void> {
        await this.dataSource.query(`VACUUM ANALYZE ${tableName}`);
        this.logger.log(`Vacuum analyze completed for ${tableName}`);
    }

    /**
     * Helper: Chunk array into batches
     */
    private chunk<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}
