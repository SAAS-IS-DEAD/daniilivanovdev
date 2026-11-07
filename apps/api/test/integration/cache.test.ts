import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { GenericContainer, Wait } from 'testcontainers';
import { createClient } from 'redis';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { CACHE_PREFIX } from '../../src/cache/redis.store.js';
import { ProfileRepository } from '../../src/profile/profile.repository.js';
import { createTestApplication } from '../helpers/application.js';
import { ProfileApiTestModule } from '../helpers/profile-api.js';

const profileQuery = readFileSync(
  new URL('../../../../../apps/web/src/api/profile.graphql', import.meta.url),
  'utf8',
);
const key = CACHE_PREFIX + 'profile';

test('real Redis cache preserves GraphQL data, expires, shares across apps and tolerates outage', async () => {
  const container = await new GenericContainer('redis:7.4.7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();
  const redisUrl = `redis://${container.getHost()}:${container.getMappedPort(6379)}`;
  const redis = createClient({ url: redisUrl, socket: { reconnectStrategy: false } });
  redis.on('error', () => undefined);
  const app = await createTestApplication(ProfileApiTestModule, undefined, undefined, {
    redisUrl,
    ttlSeconds: 2,
  });
  let second: Awaited<ReturnType<typeof createTestApplication>> | undefined;
  const db = app.get(PrismaService);
  const send = (query = profileQuery) =>
    request(app.getHttpServer()).post('/graphql').send({ query });
  try {
    await redis.connect();
    await db.profileLink.deleteMany();
    await db.skill.deleteMany();
    await db.experience.deleteMany();
    await db.project.deleteMany();
    await db.profile.deleteMany();
    const missing = await send();
    assert.equal(missing.body.data.profile, null);
    assert.equal(await redis.get(key), null);
    await db.profile.create({
      data: {
        id: 1,
        name: 'Original',
        description: 'Fixture',
        skills: { create: { name: 'TypeScript', normalizedName: 'typescript', sortOrder: 0 } },
        experience: {
          create: {
            company: 'Fixture',
            position: 'Developer',
            startDate: new Date('2020-01-02'),
            sortOrder: 0,
          },
        },
        projects: { create: { name: 'Card', description: 'Fixture', sortOrder: 0 } },
      },
    });
    let reads = 0;
    const repo = app.get(ProfileRepository);
    const original = repo.profile.bind(repo);
    repo.profile = () => {
      reads++;
      return original();
    };
    const first = await send();
    assert.equal(first.body.errors, undefined);
    assert.equal(first.body.data.profile.experience[0].startDate, '2020-01-02');
    assert.equal(first.body.data.profile.experience[0].endDate, null);
    assert.equal(first.body.data.profile.specialization, null);
    // A background connection may not yet have become ready on the very first read.
    for (let i = 0; !(await redis.exists(key)) && i < 50; i++) {
      await delay(20);
      await send();
    }
    assert.equal(await redis.exists(key), 1);
    assert((await redis.pTTL(key)) > 0 && (await redis.pTTL(key)) <= 2000);
    const before = reads;
    assert.deepEqual((await send()).body, first.body);
    assert.equal(reads, before, 'a cache hit must not execute the repository loader');
    await db.profile.update({ where: { id: 1 }, data: { name: 'Updated' } });
    second = await createTestApplication(ProfileApiTestModule, undefined, undefined, {
      redisUrl,
      ttlSeconds: 2,
    });
    await delay(50);
    const shared = await request(second.getHttpServer())
      .post('/graphql')
      .send({ query: profileQuery });
    assert.equal(shared.body.data.profile.name, 'Original');
    for (let i = 0; (await redis.exists(key)) && i < 150; i++) await delay(20);
    assert.equal(await redis.exists(key), 0, 'Redis must expire the key');
    assert.equal((await send()).body.data.profile.name, 'Updated');
    await redis.set(key, 'corrupt payload');
    assert.equal((await send()).body.data.profile.name, 'Updated');
    const skills = first.body.data.profile.skills;
    const experience = first.body.data.profile.experience;
    const projects = first.body.data.profile.projects;
    const queries = [
      '{ skills { id name sortOrder } experience { id startDate endDate } projects { id name } }',
      `{ skill(id:"${skills[0].id}") { id name } experienceItem(id:"${experience[0].id}") { id startDate endDate } project(id:"${projects[0].id}") { id name } }`,
    ];
    for (const query of queries) {
      const cold = await send(query);
      const warm = await send(query);
      assert.equal(cold.body.errors, undefined);
      assert.deepEqual(warm.body, cold.body);
    }
    assert.equal(
      (await send('{ skill(id:"invalid") { id } }')).body.errors[0].extensions.code,
      'BAD_USER_INPUT',
    );
    const nonexistent = '00000000-0000-0000-0000-000000000000';
    assert.equal((await send(`{ skill(id:"${nonexistent}") { id } }`)).body.data.skill, null);
    assert.equal(await redis.exists(CACHE_PREFIX + 'skill:' + nonexistent), 0);
    await db.profile.update({ where: { id: 1 }, data: { name: 'Slow Redis fallback' } });
    await redis.sendCommand(['CLIENT', 'PAUSE', '2500', 'ALL']);
    const pausedAt = performance.now();
    assert.equal((await send()).body.data.profile.name, 'Slow Redis fallback');
    assert(
      performance.now() - pausedAt < 1000,
      'a connected but stalled Redis must have bounded latency',
    );
    await delay(2600);
    assert.equal(await redis.exists(key), 0, 'a delayed write must not extend snapshot freshness');
    await redis.close();
    await container.stop();
    await db.profile.update({ where: { id: 1 }, data: { name: 'Redis is offline' } });
    const started = performance.now();
    assert.equal((await send()).body.data.profile.name, 'Redis is offline');
    assert(performance.now() - started < 1500, 'offline Redis must not hold up API reads');
  } finally {
    if (redis.isOpen) redis.destroy();
    await second?.close();
    await app.close();
    await container.stop();
  }
});

test('an unreachable Redis does not block startup or GraphQL availability', async () => {
  const started = performance.now();
  const app = await createTestApplication(ProfileApiTestModule, undefined, undefined, {
    redisUrl: 'redis://127.0.0.1:1',
  });
  try {
    const db = app.get(PrismaService);
    await db.profile.upsert({
      where: { id: 1 },
      create: { id: 1, name: 'Startup fallback', description: 'Fixture' },
      update: { name: 'Startup fallback' },
    });
    const result = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: profileQuery });
    assert.equal(result.body.errors, undefined);
    assert.equal(result.body.data.profile.name, 'Startup fallback');
    assert(performance.now() - started < 1500);
  } finally {
    await app.close();
  }
});
