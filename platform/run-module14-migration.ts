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

        console.log('📋 Running Module 14 (Globalization) migration...');
        const sqlPath = path.join(__dirname, 'migrations', 'module_14_create_globalization_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query(sql);
        console.log('✅ Migration executed successfully\n');

        console.log('🔍 Verifying tables...');
        const result = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM currency_exchange_rates) as exchange_rates,
        (SELECT COUNT(*) FROM localization_settings) as localization_settings,
        (SELECT COUNT(*) FROM translations) as translations
    `);

        console.log('📊 Verification Results:');
        console.log(`  - Exchange Rates: ${result.rows[0].exchange_rates}`);
        console.log(`  - Localization Settings: ${result.rows[0].localization_settings}`);
        console.log(`  - Translations: ${result.rows[0].translations}`);
        console.log('\n✅ Module 14 migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
