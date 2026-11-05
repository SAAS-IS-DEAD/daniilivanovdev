import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { withTestDatabase } from './container-lifecycle.js';
import { assertTestDatabase } from './database.js';

const coverage = process.argv.includes('--coverage');
if (process.argv.slice(2).some((arg) => arg !== '--coverage'))
  throw new Error('Unknown test runner argument');
const abort = new AbortController();
const interrupt = () => abort.abort();
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);
const cwd = fileURLToPath(new URL('../../../', import.meta.url));
function runNode(args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  abort.signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit' });
    const stop = () => child.kill('SIGTERM');
    abort.signal.addEventListener('abort', stop, { once: true });
    const timeout = setTimeout(() => child.kill('SIGKILL'), 10 * 60 * 1000);
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const forceStop = () => {
      killTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
    };
    abort.signal.addEventListener('abort', forceStop, { once: true });
    child.once('error', reject);
    child.once('close', (code) => {
      clearTimeout(timeout);
      clearTimeout(killTimer);
      abort.signal.removeEventListener('abort', stop);
      abort.signal.removeEventListener('abort', forceStop);
      resolve(code ?? 1);
    });
  });
}
try {
  process.exitCode = await withTestDatabase(
    async () => {
      const container = await new PostgreSqlContainer('postgres:17.6-bookworm')
        .withDatabase(`card_test_${randomBytes(8).toString('hex')}`)
        .withUsername('card_test')
        .withPassword(randomBytes(24).toString('hex'))
        .withStartupTimeout(120_000)
        .start();
      console.log(
        `Test PostgreSQL started: ${container.getId().slice(0, 12)}, port ${container.getPort()}`,
      );
      return container;
    },
    async (env) => {
      assertTestDatabase(env);
      const migration = await runNode(['dist-test/test/helpers/migrate.js'], env);
      if (migration !== 0) return migration;
      const groups = coverage ? ['unit', 'integration', 'contract'] : ['integration'];
      const files = (
        await Promise.all(
          groups.map(async (group) =>
            (
              await readdir(new URL(`../${group}/`, import.meta.url))
            )
              .filter((name) => name.endsWith('.test.js'))
              .sort()
              .map((name) => `dist-test/test/${group}/${name}`),
          ),
        )
      ).flat();
      if (!files.length) throw new Error('No test files discovered');
      return runNode(
        [
          '--test',
          '--test-concurrency=1',
          ...(coverage
            ? [
                '--experimental-test-coverage',
                '--test-coverage-include=dist-test/src/**/*.js',
                '--test-coverage-exclude=dist-test/src/generated/**',
                '--test-coverage-lines=95',
                '--test-coverage-functions=90',
                '--test-coverage-branches=75',
              ]
            : []),
          ...files,
        ],
        env,
      );
    },
  );
} catch (error) {
  console.error(
    abort.signal.aborted
      ? 'Test run interrupted'
      : `Testcontainers runner failed: ${error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted database URL]') : 'unknown error'}`,
  );
  process.exitCode = 1;
} finally {
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
  console.log('Test database lifecycle finished');
}
