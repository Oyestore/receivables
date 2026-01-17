import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'sme_platform',
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected successfully');

        // Read SQL file
        const sqlPath = path.join(__dirname, 'migrations', 'module_13_create_trade_table.sql');
        console.log(`📄 Reading migration file: ${sqlPath}`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute migration
        console.log('🚀 Executing Module 13 migration...');
        await client.query(sql);
        console.log('✅ Migration completed successfully!');

        // Verify table creation
        const result = await client.query(`
      SELECT COUNT(*) as count
      FROM cross_border_trades;
    `);
        console.log(`✅ Table 'cross_border_trades' created with ${result.rows[0].count} sample records`);

        // Show table structure
        const structure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cross_border_trades'
      ORDER BY ordinal_position;
    `);
        console.log('\n📊 Table Structure:');
        structure.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });

        // Show indexes
        const indexes = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'cross_border_trades'
      ORDER BY indexname;
    `);
        console.log('\n🔍 Indexes Created:');
        indexes.rows.forEach(row => {
            console.log(`  - ${row.indexname}`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed');
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('\n🎉 Module 13 migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
