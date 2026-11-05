import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
const guard = new URL('../helpers/database.js', import.meta.url).href;
test('direct integration execution without Testcontainers metadata fails closed', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { assertTestDatabase } from ${JSON.stringify(guard)}; assertTestDatabase();`,
    ],
    { env: {}, encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0, 'A default or manually supplied database must never be used');
});

import { assertTestDatabase } from '../helpers/database.js';
const name = 'card_test_0123456789abcdef';
const env = {
  TEST_DATABASE_URL: `postgresql://card_test:test-password@127.0.0.1:49123/${name}`,
  TEST_DATABASE_HOST: '127.0.0.1',
  TEST_DATABASE_NAME: name,
  TEST_CONTAINER_ID: 'a'.repeat(64),
};
test('generated container coordinates are accepted, including a Docker remote host', () => {
  assert.doesNotThrow(() => assertTestDatabase(env));
  assert.doesNotThrow(() =>
    assertTestDatabase({
      ...env,
      TEST_DATABASE_HOST: 'docker.example',
      TEST_DATABASE_URL: env.TEST_DATABASE_URL.replace('127.0.0.1', 'docker.example'),
    }),
  );
});
test('missing ownership, changed targets and production collisions fail without leaking credentials', () => {
  for (const patch of [
    { TEST_CONTAINER_ID: '' },
    { TEST_DATABASE_NAME: 'card_test' },
    { TEST_DATABASE_HOST: 'wrong-host' },
    { TEST_DATABASE_URL: 'postgresql://card_test:secret@127.0.0.1:49123/production' },
    { TEST_DATABASE_URL: 'not-a-url' },
    { TEST_DATABASE_URL: env.TEST_DATABASE_URL + '?schema=other' },
    { DATABASE_URL: env.TEST_DATABASE_URL.replace('127.0.0.1', 'localhost') },
  ])
    assert.throws(
      () => assertTestDatabase({ ...env, ...patch }),
      (error: unknown) => {
        assert(error instanceof Error);
        assert(!error.message.includes('test-password'));
        assert(!error.message.includes('secret'));
        return true;
      },
    );
});
