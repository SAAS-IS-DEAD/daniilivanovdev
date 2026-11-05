import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { Client } from 'pg';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { withTestDatabase } from '../helpers/container-lifecycle.js';

test('owned PostgreSQL is shut down even if the test callback fails', async () => {
  let uri = '';
  await assert.rejects(
    withTestDatabase(
      async () =>
        new PostgreSqlContainer('postgres:17.6-bookworm')
          .withDatabase(`card_test_${randomBytes(8).toString('hex')}`)
          .withUsername('card_test')
          .withPassword(randomBytes(24).toString('hex'))
          .withStartupTimeout(120_000)
          .start(),
      async (env) => {
        uri = env.TEST_DATABASE_URL!;
        const client = new Client({ connectionString: uri });
        await client.connect();
        try {
          assert.equal((await client.query('SELECT 1 AS value')).rows[0].value, 1);
        } finally {
          await client.end();
        }
        throw new Error('Expected test callback failure');
      },
      {},
    ),
    /Expected test callback failure/,
  );
  const disconnected = new Client({ connectionString: uri, connectionTimeoutMillis: 1000 });
  try {
    await assert.rejects(disconnected.connect());
  } finally {
    await disconnected.end();
  }
});
