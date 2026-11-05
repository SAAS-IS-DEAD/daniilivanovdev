import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withTestDatabase } from '../helpers/container-lifecycle.js';
function fixture() {
  let stopped = 0;
  return {
    container: {
      getConnectionUri: () => 'postgresql://generated',
      getHost: () => 'host',
      getDatabase: () => 'db',
      getId: () => 'id',
      stop: async () => {
        stopped++;
      },
    },
    stops: () => stopped,
  };
}
test('runner uses container coordinates and stops on success and nonzero tests', async () => {
  for (const status of [0, 1]) {
    const f = fixture();
    const base = { KEEP: 'yes' };
    const result = await withTestDatabase(
      async () => f.container,
      async (env) => {
        assert.equal(env.TEST_DATABASE_URL, 'postgresql://generated');
        assert.equal(env.KEEP, 'yes');
        return status;
      },
      base,
    );
    assert.equal(result, status);
    assert.equal(f.stops(), 1);
    assert.deepEqual(base, { KEEP: 'yes' });
  }
});
test('failed migrations or aborted tests still stop their owned database', async () => {
  const f = fixture();
  await assert.rejects(
    withTestDatabase(
      async () => f.container,
      async () => {
        throw new Error('migration failed');
      },
      {},
    ),
    /migration failed/,
  );
  assert.equal(f.stops(), 1);
});
test('external database override is rejected before starting anything', async () => {
  let started = false;
  await assert.rejects(
    withTestDatabase(
      async () => {
        started = true;
        return fixture().container;
      },
      async () => undefined,
      { TEST_DATABASE_URL: 'postgresql://production' },
    ),
    /Do not supply/,
  );
  assert.equal(started, false);
});
test('container startup failure does not run migrations or tests', async () => {
  let ran = false;
  await assert.rejects(
    withTestDatabase(
      async () => {
        throw new Error('Docker unavailable');
      },
      async () => {
        ran = true;
      },
      {},
    ),
    /Docker unavailable/,
  );
  assert.equal(ran, false);
});
