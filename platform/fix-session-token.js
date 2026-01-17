const { Client } = require('pg');

async function fixSessionTokenSize() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'postgres123',
        database: 'sme_platform'
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Increase sessionToken column size
        console.log('🔧 Increasing sessionToken column size...');
        await client.query(`
            ALTER TABLE user_sessions 
            ALTER COLUMN "sessionToken" TYPE VARCHAR(500);
        `);
        console.log('✅ sessionToken column size increased to 500');

        console.log('\n✨ Column size fixed successfully!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

fixSessionTokenSize();
