import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadEnvironment } from '../../src/config/environment.js';

const valid = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/card_test',
  APP_ORIGIN: 'http://localhost:3000',
  AUTH_RATE_KEY: 'a'.repeat(64),
};
test('valid local settings default to direct IP mode', () => {
  const result = loadEnvironment(valid);
  assert.equal(result.clientIpMode, 'direct');
  assert.equal(result.port, 3000);
  assert.deepEqual(result.trustedProxyCidrs, []);
});
test('missing or malformed config fails without echoing secrets', () => {
  for (const patch of [
    { DATABASE_URL: '' },
    { DATABASE_URL: 'password-secret' },
    { APP_ORIGIN: 'https://site.test/path' },
    { PORT: '3.5' },
    { PORT: '0' },
    { AUTH_RATE_KEY: 'short' },
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
test('proxy mode requires explicit bounded addresses', () => {
  for (const list of ['', 'true', '1', '0.0.0.0/0', '::/0', 'loopback', 'not-an-ip']) {
    assert.throws(() =>
      loadEnvironment({ ...valid, CLIENT_IP_MODE: 'trusted-proxy', TRUSTED_PROXY_CIDRS: list }),
    );
  }
  assert.deepEqual(
    loadEnvironment({
      ...valid,
      CLIENT_IP_MODE: 'trusted-proxy',
      TRUSTED_PROXY_CIDRS: '192.0.2.0/24,2001:db8::/64',
    }).trustedProxyCidrs,
    ['192.0.2.0/24', '2001:db8::/64'],
  );
});
test('production requires HTTPS origin and auth key never defaults', () => {
  assert.throws(() => loadEnvironment({ ...valid, NODE_ENV: 'production' }));
  assert.throws(() => loadEnvironment({ ...valid, AUTH_RATE_KEY: undefined }));
  assert.equal(
    loadEnvironment({ ...valid, NODE_ENV: 'production', APP_ORIGIN: 'https://card.example' })
      .production,
    true,
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
