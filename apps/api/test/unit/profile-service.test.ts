import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GraphQLError } from 'graphql';
import { ProfileService } from '../../src/profile/profile.service.js';
import type { CacheService } from '../../src/cache/cache.service.js';
const cache = { read: (_key: string, load: () => unknown) => load() } as CacheService;
import type { ProfileRepository } from '../../src/profile/profile.repository.js';
for (const method of ['skill', 'experienceItem', 'project'] as const) {
  test(`${method} rejects invalid identifiers before accessing storage`, () => {
    let calls = 0;
    const service = new ProfileService(
      {
        [method]: () => {
          calls++;
        },
      } as unknown as ProfileRepository,
      cache,
    );
    for (const id of ['', '1', "' OR 1=1", '00000000-0000-0000-0000-00000000000z']) {
      assert.throws(
        () => service[method](id),
        (error: unknown) => {
          assert(error instanceof GraphQLError);
          assert.equal(error.extensions.code, 'BAD_USER_INPUT');
          assert.deepEqual(error.extensions.fields, [
            { path: 'id', message: 'Некорректный идентификатор' },
          ]);
          return true;
        },
      );
    }
    assert.equal(calls, 0);
  });
  test(`${method} accepts UUIDs and preserves missing record semantics`, async () => {
    const id = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE';
    let received = '';
    const service = new ProfileService(
      {
        [method]: async (value: string) => {
          received = value;
          return null;
        },
      } as unknown as ProfileRepository,
      cache,
    );
    assert.equal(await service[method](id), null);
    assert.equal(received, id);
  });
}
