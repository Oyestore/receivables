const { Client } = require('pg');

async function fixDatabase() {
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

        // Drop duplicate index if it exists
        console.log('🔧 Dropping duplicate index...');
        await client.query('DROP INDEX IF EXISTS "IDX_cd68029afa74f6da673d2db160"');
        console.log('✅ Duplicate index dropped');

        // Create user_sessions table if it doesn't exist
        console.log('🔧 Creating user_sessions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "userId" UUID NOT NULL,
                "tenantId" UUID NOT NULL,
                "sessionToken" VARCHAR(255) NOT NULL UNIQUE,
                "ipAddress" INET,
                "userAgent" TEXT,
                "expiresDate" TIMESTAMP NOT NULL,
                "isActive" BOOLEAN DEFAULT true,
                "lastActivity" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "deviceInfo" JSONB DEFAULT '{}'::jsonb,
                "createdDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                version INTEGER DEFAULT 1,
                metadata JSONB DEFAULT '{}'::jsonb,
                CONSTRAINT fk_user_session_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log('✅ user_sessions table created');

        // Create indexes
        console.log('🔧 Creating indexes...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_userId ON user_sessions("userId")');
        await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_sessionToken ON user_sessions("sessionToken")');
        await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_isActive ON user_sessions("isActive")');
        console.log('✅ Indexes created');

        console.log('\n✨ Database fixed successfully!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

fixDatabase();
