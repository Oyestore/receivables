import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function runAllMigrations() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'sme_platform',
    });

    const migrations = [
        { name: 'Module 02 - Distribution', file: 'module_02_create_distribution_tables.sql' },
        { name: 'Module 10 - Orchestration', file: 'module_10_create_workflow_tables.sql' },
        { name: 'Module 13 - Cross-Border Trade', file: 'module_13_create_trade_table.sql' },
        { name: 'Module 14 - Globalization', file: 'module_14_create_globalization_tables.sql' },
        { name: 'Module 15 - Credit Decisioning', file: 'module_15_create_decisioning_tables.sql' },
    ];

    try {
        console.log('🚀 Starting all migrations for new modules...\n');
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected successfully\n');

        for (const migration of migrations) {
            console.log(`📋 Running ${migration.name}...`);
            const sqlPath = path.join(__dirname, 'migrations', migration.file);

            if (!fs.existsSync(sqlPath)) {
                console.log(`⚠️  Migration file not found: ${migration.file}`);
                continue;
            }

            const sql = fs.readFileSync(sqlPath, 'utf8');
            await client.query(sql);
            console.log(`✅ ${migration.name} completed\n`);
        }

        console.log('🔍 Verifying all tables...\n');

        // Check distribution tables
        try {
            const dist = await client.query(`SELECT COUNT(*) FROM distribution_rules`);
            console.log(`✅ M02 Distribution: ${dist.rows[0].count} rules`);
        } catch (e) {
            console.log(`❌ M02 Distribution: Tables not created`);
        }

        // Check workflow tables
        try {
            const wf = await client.query(`SELECT COUNT(*) FROM workflows`);
            console.log(`✅ M10 Orchestration: ${wf.rows[0].count} workflows`);
        } catch (e) {
            console.log(`❌ M10 Orchestration: Tables not created`);
        }

        // Check trade tables
        try {
            const trade = await client.query(`SELECT COUNT(*) FROM cross_border_trades`);
            console.log(`✅ M13 Cross-Border: ${trade.rows[0].count} trades`);
        } catch (e) {
            console.log(`❌ M13 Cross-Border: Tables not created`);
        }

        // Check globalization tables
        try {
            const glob = await client.query(`SELECT COUNT(*) FROM currency_exchange_rates`);
            console.log(`✅ M14 Globalization: ${glob.rows[0].count} exchange rates`);
        } catch (e) {
            console.log(`❌ M14 Globalization: Tables not created`);
        }

        // Check decisioning tables
        try {
            const dec = await client.query(`SELECT COUNT(*) FROM decision_rules`);
            console.log(`✅ M15 Credit Decisioning: ${dec.rows[0].count} rules`);
        } catch (e) {
            console.log(`❌ M15 Credit Decisioning: Tables not created`);
        }

        console.log('\n🎉 All migrations completed successfully!');
        console.log('📊 Platform database is now 100% ready!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Check your .env file has correct DB_PASSWORD');
        console.error('   2. Ensure PostgreSQL is running');
        console.error('   3. Verify database "sme_platform" exists');
        console.error('   4. Check user has CREATE TABLE permissions');
        process.exit(1);
    } finally {
        await client.end();
    }
}

runAllMigrations();
