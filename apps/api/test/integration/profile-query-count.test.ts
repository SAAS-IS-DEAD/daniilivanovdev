import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { ProfileRepository } from '../../src/profile/profile.repository.js';
import { assertTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';

test('profile uses at most five SELECTs for both one and one hundred items per relation', async () => {
  assertTestDatabase();
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }),
    log: [{ emit: 'event', level: 'query' }],
  });
  const module = await Test.createTestingModule({
    providers: [ProfileRepository, { provide: PrismaService, useValue: db }],
  }).compile();
  let selects = 0;
  db.$on('query', ({ query }) => {
    if (/^SELECT\b/i.test(query.trim())) selects++;
  });
  try {
    for (const count of [1, 100]) {
      await db.profileLink.deleteMany();
      await db.skill.deleteMany();
      await db.experience.deleteMany();
      await db.project.deleteMany();
      await db.profile.deleteMany();
      await db.profile.create({ data: { id: 1, name: 'Fixture', description: 'Test only' } });
      await db.skill.createMany({
        data: Array.from({ length: count }, (_, i) => ({
          name: `Skill ${i}`,
          normalizedName: `skill ${i}`,
          sortOrder: i,
        })),
      });
      await db.project.createMany({
        data: Array.from({ length: count }, (_, i) => ({
          name: `Project ${i}`,
          description: 'Test',
          sortOrder: i,
        })),
      });
      await db.experience.createMany({
        data: Array.from({ length: count }, (_, i) => ({
          company: `Company ${i}`,
          position: 'Test',
          startDate: new Date('2020-01-01'),
          sortOrder: i,
        })),
      });
      await db.profileLink.create({
        data: { label: 'Test', url: 'https://example.org', position: 0 },
      });
      selects = 0;
      const profile = await module.get(ProfileRepository).profile();
      assert.equal(profile?.projects.length, count);
      assert(selects > 0 && selects <= 5, `Observed ${selects} SELECTs for ${count} items`);
    }
  } finally {
    await db.$disconnect();
    await module.close();
  }
});
