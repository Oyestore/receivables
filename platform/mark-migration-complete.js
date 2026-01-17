const { DataSource } = require('typeorm');
require('dotenv').config();

const buildDatabaseUrl = () => {
    const explicitUrl = process.env.DATABASE_URL;
    if (explicitUrl && explicitUrl.trim().length > 0) return explicitUrl;
    const host = process.env.PGHOST || 'localhost';
    const port = process.env.PGPORT || '5432';
    const user = process.env.PGUSER || 'postgres';
    const pass = process.env.PGPASSWORD || 'postgres';
    const db = process.env.PGDATABASE || 'sme_platform';
    return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
};

const dataSource = new DataSource({
  type: 'postgres',
  url: buildDatabaseUrl(),
  synchronize: false,
  logging: false,
});

dataSource.initialize().then(async () => {
  await dataSource.query(`
    INSERT INTO migrations (timestamp, name) 
    VALUES (1766295303041, 'PaymentIntelligence1766295303041')
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('Migration marked as complete');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
