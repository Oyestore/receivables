import { Client } from 'pg';

const combinations = [
    { user: 'postgres', pass: 'postgres' },
    { user: 'postgres', pass: 'postgres_password' },
    { user: 'postgres', pass: '' },
    { user: 'postgres', pass: 'admin' },
    { user: 'postgres', pass: 'root' },
    { user: 'postgres', pass: 'password' },
    { user: 'admin', pass: 'admin' },
    { user: 'postgres', pass: 'sme_password_change_me' },
];

const ports = [5432, 5433, 5438];

async function check(user: string, pass: string, port: number) {
    const client = new Client({
        user,
        password: pass,
        host: 'localhost',
        port,
        database: 'postgres', // Connect to default DB first
        connectionTimeoutMillis: 2000,
    });

    try {
        await client.connect();
        console.log(`✅ SUCCESS: Connected with ${user}:${pass || '<empty>'}@localhost:${port}`);
        await client.end();
        return true;
        return true;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`❌ Failed: ${user}:${pass}@localhost:${port} - ${msg}`);
        await client.end();
        return false;
    }
}

async function run() {
    console.log('🔍 Diagnosing Database Connection...');

    for (const port of ports) {
        for (const cred of combinations) {
            const success = await check(cred.user, cred.pass, port);
            if (success) {
                console.log(`\n🎉 FOUND VALID CREDENTIALS:`);
                console.log(`Host: localhost`);
                console.log(`Port: ${port}`);
                console.log(`User: ${cred.user}`);
                console.log(`Pass: ${cred.pass}`);
                console.log(`\nSet these in your .env or run E2E script with these values.`);
                process.exit(0);
            }
        }
    }
    console.log('\n❌ Could not find valid credentials in common combinations.');
    process.exit(1);
}

run();
