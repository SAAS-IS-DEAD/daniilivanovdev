import 'reflect-metadata';
import assert from 'node:assert/strict';
import { serialize } from 'node:v8';
import { test } from 'node:test';
import { CacheService } from '../../src/cache/cache.service.js';
import type { RedisStore } from '../../src/cache/redis.store.js';

function fixture() {
  const entries = new Map<string, string>();
  const store = {
    get: async (key: string) => entries.get(key) ?? null,
    set: async (key: string, value: string) => {
      entries.set(key, value);
    },
  };
  return { entries, store, cache: new CacheService(store as RedisStore) };
}

test('cache hits preserve dates, null fields and response independence', async () => {
  const { cache } = fixture();
  let calls = 0;
  const load = async () => {
    calls++;
    return { date: new Date('2026-01-01'), end: null, skills: ['TS'] };
  };
  const first = await cache.read('profile', load);
  first.skills.push('mutation');
  const second = await cache.read('profile', load);
  assert.equal(calls, 1);
  assert(second.date instanceof Date);
  assert.equal(second.date.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(second.end, null);
  assert.deepEqual(second.skills, ['TS']);
});

test('concurrent misses share one loader and do not share mutable results', async () => {
  const { cache } = fixture();
  let calls = 0;
  const load = async () => {
    calls++;
    await new Promise((r) => setImmediate(r));
    return { values: [] as string[] };
  };
  const results = await Promise.all(Array.from({ length: 20 }, () => cache.read('same', load)));
  assert.equal(calls, 1);
  results[0]!.values.push('changed');
  assert.deepEqual(results[1]!.values, []);
});

test('Redis failures and corrupt entries fall back; loader errors are never cached', async () => {
  const { cache, store, entries } = fixture();
  entries.set('bad', 'corrupt bytes');
  assert.equal(await cache.read('bad', async () => 'fresh'), 'fresh');
  store.get = async () => {
    throw new Error('redis unavailable');
  };
  store.set = async () => {
    throw new Error('redis unavailable');
  };
  assert.equal(await cache.read('offline', async () => 'database'), 'database');
  await assert.rejects(
    cache.read('retry', async () => {
      throw new Error('database failed');
    }),
    /database failed/,
  );
  assert.equal(await cache.read('retry', async () => 'recovered'), 'recovered');
});

test('missing records are not cached; empty lists are cached and keys are isolated', async () => {
  const { cache, entries } = fixture();
  assert.equal(await cache.read('absent', async () => null), null);
  assert.equal(entries.has('absent'), false);
  assert.equal(await cache.read('absent', async () => 'created'), 'created');
  await cache.read('list', async () => []);
  assert.deepEqual(await cache.read('list', async () => ['unexpected']), []);
  entries.set('other', serialize('independent').toString('base64'));
  assert.equal(await cache.read('other', async () => 'unexpected'), 'independent');
});
