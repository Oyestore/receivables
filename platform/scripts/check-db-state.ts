
import { Client } from 'pg';

async function check() {
    const client = new Client({
        user: 'postgres',
        password: 'postgres_password',
        host: 'localhost',
        port: 5438,
        database: 'sme_platform'
    });

    try {
        await client.connect();
        console.log('Connected to DB on 5438');

        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        console.log('Table count:', res.rowCount);
        res.rows.forEach(r => console.log(' - ' + r.table_name));

        const indexRes = await client.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE schemaname = 'public'
        `);
        console.log('Index count:', indexRes.rowCount);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

check();
