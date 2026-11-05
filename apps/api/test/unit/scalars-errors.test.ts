import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GraphQLError, Kind } from 'graphql';
import { DateScalar } from '../../src/graphql/scalars.js';
import { badInput, domainError, formatError } from '../../src/common/errors.js';

const scalar = new DateScalar();
for (const value of ['2024-02-29', '2000-01-01', '2026-11-05']) {
  test(`Date scalar accepts calendar date ${value} in input, literal and output`, () => {
    assert.equal(scalar.parseValue(value), value);
    assert.equal(scalar.parseLiteral({ kind: Kind.STRING, value }), value);
    assert.equal(scalar.serialize(new Date(`${value}T23:59:59Z`)), value);
    assert.equal(scalar.serialize(value), value);
  });
}
for (const value of [
  null,
  123,
  '',
  '2023-02-29',
  '2024-13-01',
  '2024-04-31',
  '2024-1-01',
  '2024-01-01T00:00:00Z',
]) {
  test(`Date scalar rejects invalid input ${JSON.stringify(value)}`, () => {
    assert.throws(() => scalar.parseValue(value), GraphQLError);
    assert.throws(() => scalar.serialize(value), GraphQLError);
  });
}
test('Date literal must be a string', () => {
  assert.throws(() => scalar.parseLiteral({ kind: Kind.INT, value: '2024' }), GraphQLError);
});
test('domain errors preserve only public metadata', () => {
  assert.throws(
    () => badInput('name', 'Required'),
    (error: unknown) => {
      assert(error instanceof GraphQLError);
      assert.deepEqual(error.extensions, {
        code: 'BAD_USER_INPUT',
        fields: [{ path: 'name', message: 'Required' }],
      });
      return true;
    },
  );
  assert.throws(() => domainError('NOT_FOUND', 'Missing'), { message: 'Missing' });
  const publicError = formatError({
    message: 'Slow down',
    path: ['profile'],
    extensions: {
      code: 'RATE_LIMITED',
      retryAfterSeconds: 10,
      stacktrace: ['secret'],
      password: 'secret',
    },
  });
  assert.deepEqual(publicError.extensions, { code: 'RATE_LIMITED', retryAfterSeconds: 10 });
  assert.deepEqual(publicError.path, ['profile']);
});
test('unknown errors are redacted and query limit errors stay actionable', () => {
  for (const code of [undefined, 'DB_SECRET', 123]) {
    const result = formatError({
      message: 'secret connection string',
      extensions: { code, requestId: 'request-1', stacktrace: ['secret'] },
    });
    assert.equal(result.message, 'Внутренняя ошибка сервера');
    assert.deepEqual(result.extensions, { code: 'INTERNAL_SERVER_ERROR', requestId: 'request-1' });
  }
  assert.deepEqual(
    formatError({
      message: 'Too deep',
      extensions: { reason: 'QUERY_LIMIT', code: 'INTERNAL_SERVER_ERROR' },
    }).extensions,
    { code: 'BAD_USER_INPUT' },
  );
});
