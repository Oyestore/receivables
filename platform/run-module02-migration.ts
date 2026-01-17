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

        console.log('📋 Running Module 02 (Distribution) migration...');
        const sqlPath = path.join(__dirname, 'migrations', 'module_02_create_distribution_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query(sql);
        console.log('✅ Migration executed successfully\n');

        console.log('🔍 Verifying tables...');
        const result = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM distribution_rules WHERE is_active = true) as active_rules,
        (SELECT COUNT(*) FROM distribution_assignments) as total_assignments
    `);

        console.log('📊 Verification Results:');
        console.log(`  - Active Rules: ${result.rows[0].active_rules}`);
        console.log(`  - Total Assignments: ${result.rows[0].total_assignments}`);
        console.log('\n✅ Module 02 migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
