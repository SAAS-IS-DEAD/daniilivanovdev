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
  const app = await createTestApplication(WebTestModule, root);
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

test('fingerprinted assets support immutable caching, HEAD and conditional requests without caching HTML or errors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'card-web-cache-test-'));
  await mkdir(join(root, 'assets'));
  await mkdir(join(root, 'images'));
  await writeFile(join(root, 'index.html'), '<!doctype html><main>Fresh HTML</main>');
  await writeFile(join(root, 'assets/character-sprites-Ab3dE_12.webp'), 'test webp bytes');
  await writeFile(join(root, 'assets/app.css'), 'body {}');
  await writeFile(join(root, 'images/character-sprites.png'), 'legacy image');
  const app = await createTestApplication(WebTestModule, root);
  try {
    const http = request(app.getHttpServer());
    const url = '/assets/character-sprites-Ab3dE_12.webp';
    const asset = await http.get(url).expect(200);
    assert.equal(asset.headers['cache-control'], 'public, max-age=31536000, immutable');
    assert.match(String(asset.headers['content-type']), /image\/webp/);
    assert(asset.headers.etag);
    const head = await http.head(url).expect(200);
    assert.equal(head.headers['cache-control'], asset.headers['cache-control']);
    assert.equal(head.headers['content-length'], asset.headers['content-length']);
    const notModified = await http.get(url).set('If-None-Match', asset.headers.etag).expect(304);
    assert.equal(notModified.headers['cache-control'], asset.headers['cache-control']);
    const ranged = await http.get(url).set('Range', 'bytes=0-3').expect(206);
    assert.equal(ranged.headers['cache-control'], asset.headers['cache-control']);
    assert.equal(ranged.headers['content-length'], '4');
    for (const path of [
      '/',
      '/index.html',
      '/some/deep/route',
      '/assets/app.css',
      '/images/character-sprites.png',
    ]) {
      const response = await http.get(path).set('Accept', 'text/html').expect(200);
      assert.equal(response.headers['cache-control'], 'no-cache', path);
    }
    for (const path of ['/assets/missing-Ab3dE_12.webp', '/health/unknown']) {
      const response = await http.get(path).set('Accept', 'text/html').expect(404);
      assert(!response.headers['cache-control']?.includes('immutable'));
    }
  } finally {
    await app.close();
    await rm(root, { recursive: true, force: true });
  }
});
