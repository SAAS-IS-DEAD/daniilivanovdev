import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { GenericContainer, Wait } from 'testcontainers';
import { createClient } from 'redis';
import { stripIgnoredCharacters } from 'graphql';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { CACHE_PREFIX, RedisStore } from '../../src/cache/redis.store.js';
import { ProfileService } from '../../src/profile/profile.service.js';
import { createTestApplication } from '../helpers/application.js';
import { ProfileApiTestModule } from '../helpers/profile-api.js';

const profileQuery = readFileSync(
  new URL('../../../../../apps/web/src/api/profile.graphql', import.meta.url),
  'utf8',
);

test('normalized response cache skips GraphQL execution, shares across apps, expires once and tolerates outage', async () => {
  const container = await new GenericContainer('redis:7.4.7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();
  const redisUrl = `redis://${container.getHost()}:${container.getMappedPort(6379)}`;
  const redis = createClient({ url: redisUrl, socket: { reconnectStrategy: false } });
  redis.on('error', () => undefined);
  let app: Awaited<ReturnType<typeof createTestApplication>> | undefined;
  let second: typeof app;
  try {
    await redis.connect();
    app = await createTestApplication(ProfileApiTestModule, undefined, {
      redisUrl,
      ttlSeconds: 2,
    });
    const connected = async (instance: NonNullable<typeof app>) => {
      await redis.set(CACHE_PREFIX + 'probe', 'ready', { EX: 10 });
      for (let i = 0; (await instance.get(RedisStore).get('probe')) !== 'ready' && i < 100; i++)
        await delay(10);
      assert.equal(await instance.get(RedisStore).get('probe'), 'ready');
      await redis.del(CACHE_PREFIX + 'probe');
    };
    await connected(app);
    const db = app.get(PrismaService);
    await db.profileLink.deleteMany();
    await db.skill.deleteMany();
    await db.experience.deleteMany();
    await db.project.deleteMany();
    await db.profile.deleteMany();
    const send = (
      query = profileQuery,
      variables?: Record<string, unknown>,
      operationName?: string,
    ) =>
      request(app!.getHttpServer())
        .post('/graphql')
        .set('Origin', 'http://localhost:3000')
        .send({ query, variables, operationName });
    const keys = () => redis.keys(CACHE_PREFIX + 'response:v1:*');
    assert.equal((await send()).body.data.profile, null);
    assert.equal((await keys()).length, 0);
    await db.profile.create({
      data: {
        id: 1,
        name: 'Original',
        description: 'Fixture',
        skills: {
          create: [
            { name: 'A', normalizedName: 'a', sortOrder: 0 },
            { name: 'B', normalizedName: 'b', sortOrder: 1 },
          ],
        },
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
    let executions = 0;
    const service = app.get(ProfileService);
    const original = service.profile.bind(service);
    service.profile = () => {
      executions++;
      return original();
    };
    const first = await send();
    assert.equal(first.body.errors, undefined);
    assert.equal(first.body.data.profile.experience[0].startDate, '2020-01-02');
    assert.equal(first.body.data.profile.experience[0].endDate, null);
    assert.equal(first.body.data.profile.specialization, null);
    const [fullKey] = await keys();
    assert(fullKey);
    const initialTtl = await redis.pTTL(fullKey);
    assert(initialTtl > 0 && initialTtl <= 2000);
    await delay(100);
    const warm = await send('# comment\n' + stripIgnoredCharacters(profileQuery));
    assert.deepEqual(warm.body, first.body);
    assert.equal(
      executions,
      1,
      'normalized cache hit must skip the root resolver/service entirely',
    );
    assert.notEqual(warm.headers['x-request-id'], first.headers['x-request-id']);
    assert.equal(warm.headers['access-control-allow-origin'], 'http://localhost:3000');
    assert((await redis.pTTL(fullKey)) < initialTtl - 50, 'a hit must not extend TTL');
    await db.profile.update({ where: { id: 1 }, data: { name: 'Updated' } });
    second = await createTestApplication(ProfileApiTestModule, undefined, {
      redisUrl,
      ttlSeconds: 2,
    });
    await connected(second);
    assert.equal(
      (await request(second.getHttpServer()).post('/graphql').send({ query: profileQuery })).body
        .data.profile.name,
      'Original',
    );
    // A new operation reads PostgreSQL directly, never another 60s data-cache layer.
    assert.equal((await send('{ profile { name } }')).body.data.profile.name, 'Updated');
    for (let i = 0; (await redis.exists(fullKey)) && i < 200; i++) await delay(10);
    assert.equal(await redis.exists(fullKey), 0);
    assert.equal((await send()).body.data.profile.name, 'Updated');
    await redis.set(fullKey, 'corrupt JSON');
    const beforeCorrupt = executions;
    assert.equal((await send()).body.data.profile.name, 'Updated');
    assert.equal(executions, beforeCorrupt + 1);
    const [a, b] = first.body.data.profile.skills;
    const variableQuery = 'query Read($id: ID!) { skill(id:$id) { id name } }';
    assert.equal((await send(variableQuery, { id: a.id })).body.data.skill.name, 'A');
    assert.equal((await send(variableQuery, { id: b.id })).body.data.skill.name, 'B');
    assert((await send(variableQuery, { id: null })).body.errors);
    const multi = 'query A { profile { name } } query B { profile { description } }';
    assert.deepEqual((await send(multi, {}, 'A')).body.data.profile, { name: 'Updated' });
    assert.deepEqual((await send(multi, {}, 'B')).body.data.profile, { description: 'Fixture' });
    const aliases = '{ a:profile {name} b:profile {description} }';
    assert.deepEqual(Object.keys((await send(aliases)).body.data), ['a', 'b']);
    assert.deepEqual(
      Object.keys((await send('{ b:profile {description} a:profile {name} }')).body.data),
      ['b', 'a'],
    );
    const store = app.get(RedisStore);
    const get = store.get.bind(store);
    let lookups = 0;
    store.get = (key) => {
      lookups++;
      return get(key);
    };
    assert((await send('{ unknownField }')).body.errors);
    assert((await send('not graphql')).body.errors);
    assert(
      (
        await send(
          '{ ' + Array.from({ length: 51 }, (_, i) => `a${i}:profile{name}`).join(' ') + ' }',
        )
      ).body.errors,
    );
    assert.equal(lookups, 0, 'parsing/validation/complexity errors must never reach the cache');
    await send('{ __schema { queryType { name } } }');
    assert.equal(lookups, 0, 'introspection stays available without entering response cache');
    const missingId = '00000000-0000-0000-0000-000000000000';
    const beforeMissing = (await keys()).length;
    assert.equal((await send(variableQuery, { id: missingId })).body.data.skill, null);
    assert.equal((await keys()).length, beforeMissing);
    assert.equal(
      (await send('{ skill(id:"invalid") { id } }')).body.errors[0].extensions.code,
      'BAD_USER_INPUT',
    );
    // Genuine SQL failure in the owned test PostgreSQL, with restoration in finally.
    await db.$executeRawUnsafe('ALTER TABLE "Profile" RENAME TO "ProfileCacheFailure"');
    try {
      const errors = await Promise.all([
        send('{ failed:profile {name} }'),
        send('{ failed:profile {name} }'),
      ]);
      for (const r of errors)
        assert.equal(r.body.errors[0].extensions.code, 'INTERNAL_SERVER_ERROR');
      assert.notEqual(
        errors[0]!.body.errors[0].extensions.requestId,
        errors[1]!.body.errors[0].extensions.requestId,
      );
    } finally {
      await db.$executeRawUnsafe('ALTER TABLE "ProfileCacheFailure" RENAME TO "Profile"');
    }
    assert.equal((await send('{ failed:profile {name} }')).body.data.failed.name, 'Updated');
    // Warm this operation, then stall a real connected Redis past its freshness deadline.
    await send();
    await db.profile.update({ where: { id: 1 }, data: { name: 'Slow Redis fallback' } });
    await redis.sendCommand(['CLIENT', 'PAUSE', '2500', 'ALL']);
    const pausedAt = performance.now();
    assert.equal((await send()).body.data.profile.name, 'Slow Redis fallback');
    assert(performance.now() - pausedAt < 1000, 'stalled Redis must have bounded latency');
    await delay(2600);
    assert.equal(await redis.exists(fullKey), 0, 'a delayed SET must not rejuvenate the snapshot');
    await redis.close();
    await container.stop();
    await db.profile.update({ where: { id: 1 }, data: { name: 'Redis offline' } });
    assert.equal((await send()).body.data.profile.name, 'Redis offline');
  } finally {
    if (redis.isOpen) redis.destroy();
    await second?.close();
    await app?.close();
    await container.stop();
  }
});

test('an unreachable Redis does not block startup or GraphQL availability', async () => {
  const started = performance.now();
  const app = await createTestApplication(ProfileApiTestModule, undefined, {
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
