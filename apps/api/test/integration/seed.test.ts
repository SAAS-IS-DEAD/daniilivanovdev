import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTestApplication } from '../helpers/application.js';
import { ProfileApiTestModule } from '../helpers/profile-api.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { seed } from '../../src/cli/seed.js';

test('seed is atomic, concurrent-safe and never replaces existing content', async () => {
  const app = await createTestApplication(ProfileApiTestModule);
  const db = app.get(PrismaService);
  const clear = async () => {
    await db.profileLink.deleteMany();
    await db.skill.deleteMany();
    await db.project.deleteMany();
    await db.experience.deleteMany();
    await db.profile.deleteMany();
    await db.seedState.deleteMany();
  };
  try {
    await clear();
    await Promise.all([seed(db), seed(db)]);
    assert.equal(await db.profile.count(), 1);
    assert.equal(await db.seedState.count(), 1);
    assert.ok((await db.skill.count()) > 0);
    await db.profile.update({ where: { id: 1 }, data: { name: 'Моя правка' } });
    await db.skill.deleteMany();
    await seed(db);
    await seed(db);
    assert.equal((await db.profile.findUniqueOrThrow({ where: { id: 1 } })).name, 'Моя правка');
    assert.equal(await db.skill.count(), 0);
    await db.seedState.deleteMany();
    await seed(db);
    assert.equal((await db.profile.findUniqueOrThrow({ where: { id: 1 } })).name, 'Моя правка');
    assert.equal(await db.skill.count(), 0);
    await clear();
    // A failing marker insert must roll back all content written earlier in the transaction.
    await db.$executeRawUnsafe(
      `CREATE FUNCTION test_reject_seed() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END; $$ LANGUAGE plpgsql`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER test_reject_seed BEFORE INSERT ON "SeedState" FOR EACH ROW EXECUTE FUNCTION test_reject_seed()`,
    );
    try {
      await assert.rejects(seed(db));
      assert.equal(await db.profile.count(), 0);
      assert.equal(await db.skill.count(), 0);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER test_reject_seed ON "SeedState"');
      await db.$executeRawUnsafe('DROP FUNCTION test_reject_seed()');
    }
  } finally {
    await app.close();
  }
});
