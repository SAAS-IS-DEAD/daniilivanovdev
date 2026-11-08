import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { createTestApplication } from '../helpers/application.js';
import { ProfileApiTestModule } from '../helpers/profile-api.js';

function smoke(baseUrl: string): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('k6', ['run', '--quiet', 'load/profile.ts'], {
      cwd: fileURLToPath(new URL('../../../../../', import.meta.url)),
      env: { ...process.env, BASE_URL: baseUrl, MODE: 'smoke', K6_NO_USAGE_REPORT: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    const timeout = setTimeout(() => child.kill('SIGKILL'), 60_000);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      resolve({ code, output });
    });
  });
}

test('k6 fails on an empty database and passes against a real GraphQL profile', async () => {
  const app = await createTestApplication(ProfileApiTestModule);
  try {
    await app.listen(0, '127.0.0.1');
    const baseUrl = await app.getUrl();
    const empty = await smoke(baseUrl);
    assert.notEqual(empty.code, 0, empty.output);
    assert.match(empty.output, /Preflight failed/);
    await app.get(PrismaService).profile.create({
      data: {
        id: 1,
        name: 'Load test fixture',
        description: 'Isolated PostgreSQL',
        links: { create: { label: 'Website', url: 'https://example.com', position: 0 } },
        skills: { create: { name: 'TypeScript', normalizedName: 'typescript', sortOrder: 0 } },
        experience: {
          create: {
            company: 'Fixture',
            position: 'Developer',
            startDate: new Date('2026-01-01'),
            sortOrder: 0,
          },
        },
        projects: { create: { name: 'Card', description: 'Fixture', sortOrder: 0 } },
      },
    });
    const populated = await smoke(baseUrl);
    assert.equal(populated.code, 0, populated.output);
    assert.match(populated.output, /HTTP 200/);
  } finally {
    await app.close();
  }
});
