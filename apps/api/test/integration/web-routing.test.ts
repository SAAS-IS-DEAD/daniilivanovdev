import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { Module } from '@nestjs/common';
import { WebModule } from '../../src/web/web.module.js';
import { HealthModule } from '../../src/health/health.module.js';
import { createTestApplication } from '../helpers/application.js';
@Module({ imports: [WebModule, HealthModule] })
class WebTestModule {}
test('static files and SPA fallback do not swallow API, missing assets or non-HTML requests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'card-web-test-'));
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'index.html'), '<!doctype html><main>Test application</main>');
  await writeFile(join(root, 'assets/app.css'), 'body { color: red; }');
  const app = await createTestApplication(WebTestModule, undefined, root);
  try {
    const http = request(app.getHttpServer());
    const page = await http.get('/some/deep/route').set('Accept', 'text/html').expect(200);
    assert.match(page.text, /Test application/);
    assert.equal(page.headers['cache-control'], 'no-cache');
    await http.head('/').set('Accept', 'text/html').expect(200);
    const asset = await http.get('/assets/app.css').expect(200);
    assert.match(asset.text, /color: red/);
    await http.get('/assets/missing.js').set('Accept', 'text/html').expect(404);
    await http.get('/health/unknown').set('Accept', 'text/html').expect(404);
    await http.get('/graphql/unknown').set('Accept', 'text/html').expect(404);
    await http.get('/health/live').expect(200, { status: 'ok' });
    await http.get('/missing').set('Accept', 'application/json').expect(404);
    await http.post('/missing').set('Accept', 'text/html').expect(404);
    await rm(join(root, 'index.html'));
    await http.get('/').set('Accept', 'text/html').expect(404);
  } finally {
    await app.close();
    await rm(root, { recursive: true, force: true });
  }
});
