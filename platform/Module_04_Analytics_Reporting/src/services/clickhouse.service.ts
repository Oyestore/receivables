import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, ClickHouseClient } from '@clickhouse/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClickHouseService implements OnModuleInit {
    private client: ClickHouseClient;
    private readonly logger = new Logger(ClickHouseService.name);

    constructor(private readonly configService: ConfigService) { }

    async onModuleInit() {
        this.initializeClient();
    }

    private initializeClient() {
        const host = this.configService.get<string>('CLICKHOUSE_HOST', 'http://localhost:8123');
        const username = this.configService.get<string>('CLICKHOUSE_USER', 'default');
        const password = this.configService.get<string>('CLICKHOUSE_PASSWORD', '');
        const database = this.configService.get<string>('CLICKHOUSE_DB', 'default');

        this.logger.log(`Connecting to ClickHouse at ${host}`);

        this.client = createClient({
            host,
            username,
            password,
            database,
            clickhouse_settings: {
                // Settings for robust connections
                wait_end_of_query: 1,
            }
        });
    }

    async query(sql: string, params?: Record<string, unknown>): Promise<any[]> {
        try {
            const resultSet = await this.client.query({
                query: sql,
                query_params: params,
                format: 'JSONEachRow',
            });
            return await resultSet.json();
        } catch (error) {
            this.logger.error(`ClickHouse Query Failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    async insert(table: string, values: any[]) {
        try {
            await this.client.insert({
                table,
                values,
                format: 'JSONEachRow',
            });
        } catch (error) {
            this.logger.error(`ClickHouse Insert Failed: ${error.message}`, error.stack);
            throw error;
        }
    }
}
