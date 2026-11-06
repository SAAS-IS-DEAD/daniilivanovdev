import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { parse } from 'yaml';
const workflow = parse(
  readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
);
test('publication waits for every independent check and runs only on main pushes', () => {
  const { jobs } = workflow;
  for (const id of [
    'lint',
    'format',
    'types',
    'unit',
    'integration',
    'contract',
    'coverage',
    'build',
    'e2e',
  ])
    assert(jobs[id]);
  assert.deepEqual(
    [...jobs.publish.needs].sort(),
    Object.keys(jobs)
      .filter((id) => id !== 'publish')
      .sort(),
  );
  assert.equal(jobs.publish.if, "github.event_name == 'push' && github.ref == 'refs/heads/main'");
  assert.equal(jobs.publish.concurrency['cancel-in-progress'], false);
});
test('E2E starts real Docker app and always tears it down', () => {
  const steps = workflow.jobs.e2e.steps;
  assert(steps.some((s) => s.run?.includes('docker compose up --build')));
  assert(steps.some((s) => s.run === 'npm run test:e2e'));
  assert(steps.some((s) => s.if === 'always()' && s.run === 'docker compose down --volumes'));
});
test('E2E configuration script writes valid separate environment lines', () => {
  const script = workflow.jobs.e2e.steps.find(
    (s) => s.name === 'Create isolated CI configuration',
  ).run;
  const js = script.split("<<'JS'\n")[1].split('\nJS')[0];
  const cwd = mkdtempSync(join(tmpdir(), 'card-ci-test-'));
  try {
    execFileSync(process.execPath, ['--input-type=module', '-e', js], { cwd });
    const env = readFileSync(join(cwd, '.env'), 'utf8');
    assert.match(
      env,
      /^POSTGRES_PASSWORD=[a-f0-9]+\nAUTH_RATE_KEY=[a-f0-9]+\nAPP_ORIGIN=http:\/\/localhost:3000\n$/,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('application CI publishes images without infrastructure access', () => {
  const commands = workflow.jobs.publish.steps.map((s) => s.run ?? '').join('\n');
  assert.match(commands, /docker push/);
  assert.match(commands, /--target release/);
  assert.doesNotMatch(commands, /\bssh\b|\bkubectl\b/);
  assert.equal(workflow.jobs.publish.permissions.packages, 'write');
});
