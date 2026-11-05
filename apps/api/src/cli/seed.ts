import type { PrismaClient } from '../generated/prisma/client.js';
import { seedData } from './seed-data.js';

export async function seed(db: PrismaClient): Promise<void> {
  await db.$transaction(
    async (tx) => {
      // Transaction-scoped lock also serializes independent setup processes.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(734801, 1)`;
      if (await tx.seedState.findUnique({ where: { version: 1 } })) return;
      if (!(await tx.profile.findUnique({ where: { id: 1 } }))) {
        await tx.profile.create({ data: seedData() });
      }
      await tx.seedState.create({ data: { version: 1 } });
    },
    { timeout: 15000 },
  );
}
