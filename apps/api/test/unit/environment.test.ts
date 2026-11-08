import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadEnvironment } from '../../src/config/environment.js';

const valid = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/card_test',
  APP_ORIGIN: 'http://localhost:3000',
};
test('public app starts with database and origin only', () => {
  const result = loadEnvironment(valid);
  assert.equal(result.port, 3000);
  assert.equal(result.appOrigin, valid.APP_ORIGIN);
});
test('missing or malformed config fails without echoing secrets', () => {
  for (const patch of [
    { DATABASE_URL: '' },
    { DATABASE_URL: 'password-secret' },
    { APP_ORIGIN: 'https://site.test/path' },
    { PORT: '3.5' },
    { PORT: '0' },
    { NODE_ENV: 'unknown' },
  ]) {
    assert.throws(
      () => loadEnvironment({ ...valid, ...patch }),
      (error: unknown) => {
        assert(error instanceof Error);
        assert(!error.message.includes('password-secret'));
        return true;
      },
    );
  }
});
test('retired auth/proxy environment variables do not affect public app startup', () => {
  assert.deepEqual(
    loadEnvironment({
      ...valid,
      AUTH_RATE_KEY: 'legacy',
      CLIENT_IP_MODE: 'legacy',
      TRUSTED_PROXY_CIDRS: 'legacy',
    }),
    loadEnvironment(valid),
  );
});
test('production requires HTTPS origin without an authentication secret', () => {
  assert.throws(() => loadEnvironment({ ...valid, NODE_ENV: 'production' }));
  assert.equal(
    loadEnvironment({ ...valid, NODE_ENV: 'production', APP_ORIGIN: 'https://card.example' })
      .appOrigin,
    'https://card.example',
  );
});

test('Redis is optional and cache TTL and URL are bounded without leaking credentials', () => {
  assert.equal(loadEnvironment(valid).redisUrl, undefined);
  assert.equal(loadEnvironment(valid).cacheTtlSeconds, 60);
  assert.equal(
    loadEnvironment({ ...valid, REDIS_URL: 'redis://localhost:6379', CACHE_TTL_SECONDS: '1' })
      .cacheTtlSeconds,
    1,
  );
  for (const patch of [
    { REDIS_URL: 'http://secret:password@localhost' },
    { REDIS_URL: 'redis://localhost/invalid' },
    { CACHE_TTL_SECONDS: '0' },
    { CACHE_TTL_SECONDS: '1.5' },
    { CACHE_TTL_SECONDS: '3601' },
    { CACHE_TTL_SECONDS: 'NaN' },
  ])
    assert.throws(
      () => loadEnvironment({ ...valid, ...patch }),
      (error: unknown) => {
        assert(error instanceof Error);
        assert(!error.message.includes('password'));
        return true;
      },
    );
});
