import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';

const project = `card-smoke-${Date.now()}`;
const port = 45317;
const env = {
  ...process.env,
  POSTGRES_USER: 'card',
  POSTGRES_DB: 'card',
  POSTGRES_PASSWORD: randomBytes(24).toString('hex'),
  APP_ORIGIN: `http://localhost:${port}`,
  PORT: String(port),
  NODE_ENV: 'development',
  CACHE_TTL_SECONDS: '1',
};
const compose = (...args) =>
  execFileSync('docker', ['compose', '-p', project, '-f', 'compose.yaml', ...args], {
    env,
    stdio: 'pipe',
    timeout: 240000,
  });
const sql = (query) =>
  compose(
    'exec',
    '-T',
    'db',
    'psql',
    '-U',
    'card',
    '-d',
    'card',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    query,
  );
const profile = async () => {
  const response = await fetch(`http://localhost:${port}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ profile { name skills { name } } }' }),
  });
  const result = await response.json();
  assert.equal(result.errors, undefined);
  return result.data.profile;
};

test('clean Compose startup, repeat setup and restart preserve edits', {
  timeout: 300000,
}, async () => {
  try {
    compose('up', '-d', '--wait', '--wait-timeout', '120');
    assert.equal((await profile()).name, 'Даниил Иванов');
    execFileSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
      env: { ...env, E2E_BASE_URL: `http://localhost:${port}` },
      stdio: 'inherit',
      timeout: 120000,
    });
    sql(`UPDATE "Profile" SET name='Smoke edit' WHERE id=1; DELETE FROM "Skill";`);
    compose('run', '--rm', 'setup');
    compose('run', '--rm', 'setup');
    compose('restart', 'app');
    compose('up', '-d', '--wait', '--wait-timeout', '60');
    assert.deepEqual(await profile(), { name: 'Smoke edit', skills: [] });
    compose('stop', 'app');
    // A deliberately invalid migration history makes setup fail; app must remain stopped.
    sql(
      `INSERT INTO "_prisma_migrations" (id,checksum,migration_name,started_at,applied_steps_count) VALUES ('smoke-failure','test','smoke_failure',now(),0)`,
    );
    assert.throws(() => compose('up', '-d', '--force-recreate', 'setup', 'app'));
    const state = compose('ps', '--status', 'running', '--services').toString();
    assert.ok(!state.split('\n').includes('app'));
  } finally {
    // Only this generated test project and its dedicated volume are removed.
    compose('down', '-v', '--remove-orphans');
  }
});
