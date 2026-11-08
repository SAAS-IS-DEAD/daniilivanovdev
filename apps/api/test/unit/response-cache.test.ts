import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApolloServer } from '@apollo/server';
import type { FormattedExecutionResult } from 'graphql';
import { createResponseCachePlugin, MAX_RESPONSE_BYTES } from '../../src/graphql/response-cache.js';

function fixture() {
  let now = 1000;
  let calls = 0;
  let fail = false;
  let missing = false;
  let name: string | undefined;
  let nestedError = false;
  let pending: (() => Promise<void>) | undefined;
  const entries = new Map<string, string>();
  const writes: number[] = [];
  const store = {
    get: async (key: string) => entries.get(key) ?? null,
    set: async (key: string, value: string, deadline?: number) => {
      entries.set(key, value);
      writes.push(deadline!);
    },
  };
  const server = new ApolloServer({
    typeDefs:
      'type Query { profile: Profile skill(id: ID!): String } type Profile { name: String! endDate: String }',
    resolvers: {
      Query: {
        profile: async () => {
          calls++;
          await pending?.();
          if (fail) throw new Error('database failed');
          return missing ? null : { name: name ?? `Name ${calls}`, endDate: null };
        },
        skill: (_: unknown, { id }: { id: string }) => id,
      },
      Profile: {
        endDate: () => {
          if (nestedError) throw new Error('field failed');
          return null;
        },
      },
    },
    plugins: [createResponseCachePlugin(store, 60, () => now)],
  });
  return {
    server,
    store,
    entries,
    writes,
    calls: () => calls,
    advance: (ms: number) => {
      now += ms;
    },
    fail: (value: boolean) => {
      fail = value;
    },
    name: (value: string) => {
      name = value;
    },
    nestedError: (value: boolean) => {
      nestedError = value;
    },
    missing: (value: boolean) => {
      missing = value;
    },
    pending: (value: () => Promise<void>) => {
      pending = value;
    },
  };
}
const query = '{ profile { name endDate } }';
const body = (result: Awaited<ReturnType<ApolloServer['executeOperation']>>) => {
  assert.equal(result.body.kind, 'single');
  if (result.body.kind !== 'single') throw new Error('Expected single response');
  return JSON.parse(JSON.stringify(result.body.singleResult)) as FormattedExecutionResult<
    Record<string, unknown>
  >;
};

test('normalized response hit bypasses resolvers, preserves null and expires without sliding TTL', async () => {
  const f = fixture();
  try {
    const first = body(await f.server.executeOperation({ query }));
    f.advance(59_000);
    assert.deepEqual(
      body(await f.server.executeOperation({ query: '# comment\n{profile{name,endDate}}' })),
      first,
    );
    assert.equal(f.calls(), 1);
    assert.deepEqual(f.writes, [61_000]);
    f.advance(1001);
    assert.notDeepEqual(body(await f.server.executeOperation({ query })), first);
    assert.equal(f.calls(), 2);
  } finally {
    await f.server.stop();
  }
});

test('errors, missing roots, introspection and invalid variables do not reuse cached data', async () => {
  const f = fixture();
  try {
    f.fail(true);
    assert(body(await f.server.executeOperation({ query })).errors);
    assert.equal(f.entries.size, 0);
    f.fail(false);
    f.missing(true);
    assert.deepEqual(body(await f.server.executeOperation({ query })).data, { profile: null });
    assert.equal(f.entries.size, 0);
    await f.server.executeOperation({ query: '{ __typename }' });
    assert.equal(f.entries.size, 0);
    const variableQuery = 'query($id: ID!) { skill(id:$id) }';
    assert.deepEqual(
      body(await f.server.executeOperation({ query: variableQuery, variables: { id: 'a' } })).data,
      { skill: 'a' },
    );
    assert(
      body(await f.server.executeOperation({ query: variableQuery, variables: { id: null } }))
        .errors,
    );
    assert.equal(f.entries.size, 1);
  } finally {
    await f.server.stop();
  }
});

test('Redis failure and corrupt entry are misses; successful reads still work', async () => {
  const f = fixture();
  try {
    await f.server.executeOperation({ query });
    for (const key of f.entries.keys()) f.entries.set(key, 'broken JSON');
    await f.server.executeOperation({ query });
    assert.equal(f.calls(), 2);
    f.store.get = async () => {
      throw new Error('offline');
    };
    f.store.set = async () => {
      throw new Error('offline');
    };
    assert.equal(body(await f.server.executeOperation({ query })).errors, undefined);
    assert.equal(f.calls(), 3);
  } finally {
    await f.server.stop();
  }
});

test('concurrent normalized misses share execution and release waiters after errors', async () => {
  const f = fixture();
  try {
    f.pending(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => f.server.executeOperation({ query })),
    );
    assert.equal(f.calls(), 1);
    for (const result of results)
      assert.deepEqual(body(result).data, { profile: { name: 'Name 1', endDate: null } });
    f.entries.clear();
    f.fail(true);
    const errors = await Promise.all([
      f.server.executeOperation({ query }),
      f.server.executeOperation({ query }),
    ]);
    assert(errors.every((r) => body(r).errors));
    f.fail(false);
    assert.equal(body(await f.server.executeOperation({ query })).errors, undefined);
  } finally {
    await f.server.stop();
  }
});

test('oversized responses, partial field errors and results older than the deadline are not cached', async () => {
  const f = fixture();
  try {
    f.name('x'.repeat(MAX_RESPONSE_BYTES));
    assert.equal(body(await f.server.executeOperation({ query })).errors, undefined);
    assert.equal(f.entries.size, 0);
    f.name('Short');
    f.nestedError(true);
    const partial = body(await f.server.executeOperation({ query }));
    assert(partial.errors);
    assert(partial.data?.profile);
    assert.equal(f.entries.size, 0);
    f.nestedError(false);
    f.pending(async () => {
      f.advance(61_000);
    });
    assert.equal(body(await f.server.executeOperation({ query })).errors, undefined);
    assert.equal(f.entries.size, 0);
  } finally {
    await f.server.stop();
  }
});

test('schema changes isolate cached results even for identical operation text', async () => {
  const f = fixture();
  const next = new ApolloServer({
    typeDefs:
      'type Query { profile: Profile extra: String } type Profile { name: String! endDate: String }',
    resolvers: { Query: { profile: () => ({ name: 'New schema', endDate: null }) } },
    plugins: [createResponseCachePlugin(f.store, 60, () => 1000)],
  });
  try {
    await f.server.executeOperation({ query });
    assert.deepEqual(body(await next.executeOperation({ query })).data, {
      profile: { name: 'New schema', endDate: null },
    });
    assert.equal(f.entries.size, 2);
  } finally {
    await next.stop();
    await f.server.stop();
  }
});

test('missing or unknown operationName preserves operation-resolution errors after warming the document', async () => {
  const f = fixture();
  const query = 'query A { profile {name} } query B { profile {endDate} }';
  try {
    await f.server.executeOperation({ query, operationName: 'A' });
    for (const operationName of [undefined, 'Unknown']) {
      const result = await f.server.executeOperation({ query, operationName });
      assert.equal(result.http.status, 400);
      assert.equal(body(result).errors?.[0]?.extensions?.code, 'OPERATION_RESOLUTION_FAILURE');
    }
    assert.equal(f.calls(), 1);
    assert.equal(f.entries.size, 1);
  } finally {
    await f.server.stop();
  }
});
