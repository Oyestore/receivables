import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { MilestoneDefinition } from './Module_05_Milestone_Workflows/src/entities/milestone-definition.entity';
import { MilestoneInstance } from './Module_05_Milestone_Workflows/src/entities/milestone-instance.entity';
import { MilestonePayment } from './Module_05_Milestone_Workflows/src/entities/milestone-payment.entity';
import { MilestoneWorkflow } from './Module_05_Milestone_Workflows/src/entities/milestone-workflow.entity';
 
config();
 
const buildDatabaseUrl = (): string => {
  const explicitUrl = process.env.DATABASE_URL;
  if (explicitUrl && explicitUrl.trim().length > 0) return explicitUrl;
  const host = process.env.PGHOST || 'localhost';
  const port = process.env.PGPORT || '5432';
  const user = process.env.PGUSER || 'postgres';
  const pass = process.env.PGPASSWORD || 'postgres';
  const db = process.env.PGDATABASE || 'sme_platform';
  return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
};
 
const ds = new DataSource({
  type: 'postgres',
  url: buildDatabaseUrl(),
  entities: [MilestoneDefinition, MilestoneInstance, MilestonePayment, MilestoneWorkflow],
  synchronize: true,
  logging: false,
});
 
async function run() {
  try {
    await ds.initialize();
    console.log('✅ Module 05 entities synchronized');
    await ds.destroy();
    process.exit(0);
  } catch (e: any) {
    console.error('❌ Failed to synchronize Module 05 entities:', e?.message || e);
    process.exit(1);
  }
}
 
run();
