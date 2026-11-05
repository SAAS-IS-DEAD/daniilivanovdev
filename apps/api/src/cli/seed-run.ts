import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { seed } from './seed.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  await seed(db);
  console.log('Initial content preparation completed');
} catch {
  console.error('Initial content preparation failed');
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
