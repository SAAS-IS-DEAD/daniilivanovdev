import { afterEach, expect, test, vi } from 'vitest';
import { createApi, sdk } from '../src/api/client';
import { GraphQLClient } from 'graphql-request';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
test('public queries succeed without CSRF tokens and never expose GraphQL error variables', async () => {
  const fetcher = vi.fn().mockImplementation(
    async () =>
      new Response(JSON.stringify({ data: { profile: null } }), {
        headers: { 'content-type': 'application/json' },
      }),
  );
  const api = createApi(new GraphQLClient('http://localhost/graphql', { fetch: fetcher }));
  await expect(api.GetProfile()).resolves.toEqual({ profile: null });
  expect(new Headers(fetcher.mock.calls[0]![1].headers).get('X-CSRF-Token')).toBeNull();
  fetcher.mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          errors: [
            {
              message: 'private-password-value',
              extensions: { code: 'INTERNAL_SERVER_ERROR', message: 'Не удалось выполнить запрос' },
            },
          ],
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
  );
  const log = vi.spyOn(console, 'error');
  await expect(api.GetProfile()).rejects.toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Не удалось выполнить запрос',
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(log).not.toHaveBeenCalled();
});
test('transport failure is normalized with one request only', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('private URL'));
  const api = createApi(new GraphQLClient('http://localhost/graphql', { fetch: fetcher }));
  await expect(api.GetProfile()).rejects.toMatchObject({
    code: 'NETWORK_ERROR',
    message: 'Не удалось связаться с сервером',
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('browser SDK resolves endpoint against the current origin', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: { profile: null } }), {
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetcher);
  await expect(sdk.GetProfile()).resolves.toEqual({ profile: null });
  expect(String(fetcher.mock.calls[0]?.[0])).toBe(new URL('/graphql', window.location.origin).href);
  expect(fetcher.mock.calls[0]?.[1].credentials).toBe('omit');
});

test.each([
  'BAD_USER_INPUT',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'UNKNOWN',
])('normalizes %s and filters malformed field errors', async (code) => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        errors: [
          {
            message: 'private detail',
            extensions: {
              code,
              fields: [
                null,
                {},
                { path: 'name', message: 'Required' },
                { path: 1, message: 'bad' },
              ],
              retryAfterSeconds: 15,
            },
          },
        ],
      }),
      { headers: { 'content-type': 'application/json' } },
    ),
  );
  const api = createApi(new GraphQLClient('http://localhost/graphql', { fetch: fetcher }));
  await expect(api.GetProfile()).rejects.toMatchObject({
    code: code === 'UNKNOWN' ? 'INTERNAL_SERVER_ERROR' : code,
    fields: [{ path: 'name', message: 'Required' }],
    retryAfterSeconds: 15,
  });
});

test('prototype property names are not accepted as public error codes', async () => {
  for (const code of ['toString', '__proto__', 'constructor']) {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'private', extensions: { code } }] }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    const api = createApi(new GraphQLClient('http://localhost/graphql', { fetch: fetcher }));
    await expect(api.GetProfile()).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Не удалось выполнить запрос',
    });
  }
});
