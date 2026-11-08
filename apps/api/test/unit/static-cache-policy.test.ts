import assert from 'node:assert/strict';
import { test } from 'node:test';
import { staticCacheControl } from '../../src/web/static-cache-policy.js';

test('content-addressed build assets can be cached for a year', () => {
  for (const path of [
    'assets/character-sprites-Ab3dE_12.webp',
    'assets/character-gaming-aB12_-Cd.gif',
    'assets/index-D8ab_123.js',
    'assets/index-D8ab_123.css',
  ]) {
    assert.equal(staticCacheControl(path), 'public, max-age=31536000, immutable');
  }
});

test('HTML, unversioned files and paths outside build assets must revalidate', () => {
  for (const path of [
    'index.html',
    'assets/page-Ab3dE_12.html',
    'assets/app.css',
    'images/character-sprites.png',
    'images/character-Ab3dE_12.webp',
    'assets/short-123.webp',
    'assets/nested/index-Ab3dE_12.js',
    '../assets/index-Ab3dE_12.js',
    'assets/index-Ab3dE_12.js/extra',
    '',
  ]) {
    assert.equal(staticCacheControl(path), 'no-cache', path);
  }
});
