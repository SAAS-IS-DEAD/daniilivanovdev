import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSchema, getOperationAST, parse, GraphQLScalarType } from 'graphql';
import { responseCacheKey, isPublicQuery } from '../../src/graphql/response-cache-key.js';

const schema = buildSchema(
  'type Query { item(id: ID!, options: Filter): String } input Filter { a: Int b: [Int] }',
);
function key(
  source: string,
  variables: Record<string, unknown> = {},
  operationName?: string,
  namespace = 'schema-v1',
) {
  const document = parse(source);
  const operation = getOperationAST(document, operationName);
  assert(operation);
  return responseCacheKey(schema, document, operation, variables, namespace);
}

test('query cache normalizes whitespace, comments, commas and variable object key order', () => {
  assert.equal(
    key('query Read($id: ID!, $o: Filter) { item(id: $id, options: $o) }', {
      id: 'a',
      o: { a: 1, b: [2, 3] },
    }),
    key('# comment\n query Read ( $id : ID! $o: Filter ) {\n item (id:$id options:$o)\n}', {
      o: { b: [2, 3], a: 1 },
      id: 'a',
    }),
  );
});

test('coerced variables share IDs/defaults while values, array order and null stay distinct', () => {
  const query = 'query Read($id: ID! = "123", $o: Filter) { item(id:$id, options:$o) }';
  assert.equal(key(query), key(query, { id: 123 }));
  assert.equal(key(query, { id: '123' }), key(query, { id: 123, ignored: 'value' }));
  assert.notEqual(key(query, { id: 'a' }), key(query, { id: 'b' }));
  assert.notEqual(key(query), key(query, { o: null }));
  assert.notEqual(key(query, { o: { b: [1, 2] } }), key(query, { o: { b: [2, 1] } }));
  assert.equal(key(query, { id: null }), undefined);
  assert.notEqual(key(query, { o: { a: -0 } }), key(query, { o: { a: 0 } }));
});

test('operation selection, aliases, field order, literal contents and schema namespace are isolated', () => {
  const query = 'query A { item(id:"a") } query B { item(id:"b") }';
  assert.notEqual(key(query, {}, 'A'), key(query, {}, 'B'));
  assert.notEqual(key('{ one:item(id:"a") }'), key('{ two:item(id:"a") }'));
  assert.notEqual(
    key('{ a:item(id:"a") b:item(id:"b") }'),
    key('{ b:item(id:"b") a:item(id:"a") }'),
  );
  assert.notEqual(key('{ item(id:"a  b") }'), key('{ item(id:"a b") }'));
  assert.notEqual(key('{ item(id:"a") }'), key('{ item(id:"a") }', {}, undefined, 'schema-v2'));
});

test('only public query roots are eligible, including roots selected through fragments', () => {
  for (const [source, expected] of [
    ['query { ...Root } fragment Root on Query { ... on Query { profile {name} } }', true],
    ['{ x:profile {name} skills {id} }', true],
    ['{ __schema { queryType {name} } }', false],
    ['{ profile {name} privateRoot }', false],
    ['mutation { profile {name} }', false],
    ['query { ...Missing }', false],
    ['query { ...Root } fragment Root on Query { ...Root }', false],
  ] as const) {
    const document = parse(source);
    const operation = getOperationAST(document);
    assert(operation);
    assert.equal(isPublicQuery(document, operation), expected);
  }
});

test('custom scalar variables that cannot be canonical JSON bypass caching instead of colliding', () => {
  const schema = buildSchema('scalar Opaque type Query { item(id: Opaque): String }');
  const scalar = schema.getType('Opaque');
  assert(scalar instanceof GraphQLScalarType);
  const document = parse('query Read($id: Opaque) { item(id:$id) }');
  const operation = getOperationAST(document);
  assert(operation);
  for (const value of [new Date('2026-01-01'), Symbol('opaque'), BigInt(1), NaN, Infinity]) {
    scalar.parseValue = () => value;
    assert.equal(
      responseCacheKey(schema, document, operation, { id: 'input' }, 'schema'),
      undefined,
    );
  }
});
