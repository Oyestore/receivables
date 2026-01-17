import { createConnection } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    console.log('🚀 Starting Module 17 Database Migration...\n');

    try {
        // Create database connection
        const connection = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres123',
            database: process.env.DB_NAME || 'sme_platform',
            synchronize: false,
            logging: true,
        });

        console.log('✅ Database connection established\n');

        // Read SQL migration file
        const sqlFile = path.join(__dirname, 'migrations', 'module_17_create_tables.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('📄 Executing migration SQL...\n');

        // Execute the entire SQL file as one transaction
        await connection.query(sql);

        console.log('\n✅ Migration completed successfully!\n');

        // Verify tables exist
        console.log('🔍 Verifying tables...\n');
        const tables = await connection.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'gl_%' 
            OR table_name LIKE 'bank_%'
            OR table_name LIKE 'reconciliation_%'
            OR table_name LIKE 'journal_%'
        `);

        console.log('  Module 17 Tables:');
        tables.forEach((t: any) => console.log(`    ✓ ${t.table_name}`));

        // Count default accounts
        const accountCount = await connection.query(
            `SELECT COUNT(*) as count FROM gl_accounts WHERE is_system_account = true`
        );
        console.log(`\n  ✓ Default GL Accounts: ${accountCount[0].count}`);

        await connection.close();
        console.log('\n🎉 Module 17 is now fully integrated and ready!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nError details:', error);
        process.exit(1);
    }
}

runMigration();
