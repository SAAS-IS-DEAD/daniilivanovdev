import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSchema, getIntrospectionQuery, parse, specifiedRules, validate } from 'graphql';
import { queryLimits } from '../../src/graphql/query-limits.js';

const schema = buildSchema(
  'type Query { profile: Profile } type Profile { name: String, child: Profile }',
);
const errors = (source: string) =>
  validate(schema, parse(source), [...specifiedRules, queryLimits]);
test('normal query and standard introspection are accepted', () => {
  assert.equal(errors('{ profile { name } }').length, 0);
  assert.equal(errors(getIntrospectionQuery()).length, 0);
});
test('aliases do not disguise a content query as introspection', () => {
  assert(
    errors(
      '{ __schema { queryType { name } } profile { child { child { child { child { child { name } } } } } } }',
    ).some((e) => e.extensions.code === 'BAD_USER_INPUT'),
  );
});
test('expanded repeated fields are counted separately, including fragments', () => {
  const source =
    '{ profile { ' + Array.from({ length: 51 }, (_, i) => `a${i}: name`).join(' ') + ' } }';
  assert(errors(source).some((e) => e.extensions.code === 'BAD_USER_INPUT'));
  const repeated =
    'query { profile { ...F ...F } } fragment F on Profile { ' +
    Array.from({ length: 26 }, (_, i) => `a${i}: name`).join(' ') +
    ' }';
  assert(errors(repeated).some((e) => e.extensions.code === 'BAD_USER_INPUT'));
});
test('cyclic fragments terminate rather than recurse indefinitely', () => {
  assert(errors('query { profile { ...A } } fragment A on Profile { child { ...A } }').length > 0);
});

test('pure introspection enforces root, depth and expanded field boundaries', () => {
  assert.equal(errors('{a:__typename b:__typename c:__typename}').length, 0);
  assert(errors('{a:__typename b:__typename c:__typename d:__typename}').length > 0);
  const introspect = (fields: number) =>
    '{__schema {' + Array.from({ length: fields }, (_, i) => `a${i}:description`).join(' ') + '}}';
  assert.equal(errors(introspect(1999)).length, 0);
  assert(errors(introspect(2000)).some((e) => e.extensions.code === 'BAD_USER_INPUT'));
  const nested = (levels: number) =>
    '{__type(name:"Profile") {' + 'ofType {'.repeat(levels) + 'name' + '}'.repeat(levels) + '}}';
  assert.equal(errors(nested(18)).length, 0);
  assert(errors(nested(19)).some((e) => e.extensions.code === 'BAD_USER_INPUT'));
});
