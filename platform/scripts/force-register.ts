
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

// Load env from platform root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function forceRegister() {
    console.log('🚀 Starting Force Registration (Raw SQL)...');

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres123',
        database: process.env.DB_NAME || 'sme_platform',
        // No entities needed for raw query
        entities: [],
        synchronize: false,
        logging: false,
    });

    try {
        await dataSource.initialize();
        console.log('✅ Connected to Database');

        const email = 'demo@platform.com';
        const rawPassword = 'Password123!';
        const firstName = 'Demo';
        const lastName = 'User';

        // 1. Check if user exists
        const existing = await dataSource.query(`SELECT id FROM users WHERE email = $1`, [email]);
        if (existing.length > 0) {
            console.log('⚠️ User already exists. Updating password...');
            const passwordHash = await bcrypt.hash(rawPassword, 10);
            await dataSource.query(
                `UPDATE users SET "passwordHash" = $1 WHERE email = $2`,
                [passwordHash, email]
            );
            console.log('✅ User password updated.');
            await dataSource.destroy();
            return;
        }

        // 2. Prepare Data
        const id = uuidv4();
        const tenantId = uuidv4(); // Mock tenant
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        const username = email;
        const status = 'active';
        const createdBy = '00000000-0000-0000-0000-000000000000'; // System UUID
        const now = new Date();

        // 3. Insert User
        // Note: Column names must match DB exactly. Based on UserEntity, snake_case or camelCase?
        // TypeORM default is camelCase if not specified, but let's check standard behavior.
        // Usually TypeORM preserves property names unless snake_case naming strategy is used.
        // I'll try quoting column names as defined in Entity (cameCase).

        const query = `
            INSERT INTO users (
                id, "tenantId", username, email, "firstName", "lastName", 
                status, "passwordHash", "createdDate", "updatedDate", "createdBy", version, metadata, preferences
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, '{}', '{}'
            )
        `;

        await dataSource.query(query, [
            id, tenantId, username, email, firstName, lastName,
            status, passwordHash, now, now, createdBy
        ]);

        console.log('✅ User inserted successfully');
        console.log(`   ID: ${id}`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${rawPassword}`);

    } catch (error) {
        console.error('❌ Error during registration:', error);
    } finally {
        if (dataSource.isInitialized) await dataSource.destroy();
    }
}

forceRegister();
