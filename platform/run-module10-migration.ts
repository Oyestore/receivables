import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'sme_platform',
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected successfully\n');

        console.log('📋 Running Module 10 (Orchestration) migration...');
        const sqlPath = path.join(__dirname, 'migrations', 'module_10_create_workflow_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query(sql);
        console.log('✅ Migration executed successfully\n');

        console.log('🔍 Verifying tables...');
        const result = await client.query(`
      SELECT 
        COUNT(*) as total_workflows,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_workflows
      FROM workflows
    `);

        console.log('📊 Verification Results:');
        console.log(`  - Total Workflows: ${result.rows[0].total_workflows}`);
        console.log(`  - Active Workflows: ${result.rows[0].active_workflows}`);
        console.log('\n✅ Module 10 migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
