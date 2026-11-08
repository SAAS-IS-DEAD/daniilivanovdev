import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSchema, graphql } from 'graphql';
import type { GraphQLResolveInfo } from 'graphql';
import { selectedProfileFields } from '../../src/graphql/selected-profile-fields.js';
import type { ProfileFields } from '../../src/profile/profile-fields.js';

const schema = buildSchema(`
  type Query { profile: Profile }
  type Profile { name: String description: String skills: [Skill!]! }
  type Skill { id: ID! name: String sortOrder: Int }
`);
async function collect(source: string, variableValues?: Record<string, unknown>) {
  const reads: ProfileFields[] = [];
  const response = await graphql({
    schema,
    source,
    variableValues,
    rootValue: {
      profile: (_args: unknown, _context: unknown, info: GraphQLResolveInfo) => {
        reads.push(selectedProfileFields(info));
        return {
          name: 'Fixture',
          description: 'Biography',
          skills: [{ id: '1', name: 'TS', sortOrder: 0 }],
        };
      },
    },
  });
  assert.equal(response.errors, undefined);
  return reads;
}

test('field names are independent of aliases and merge repeated fields and fragments', async () => {
  const reads = await collect(`{
    profile { title: name ...Parts ...Parts alias: skills { name } }
    profile { skills { id } }
  }
  fragment Parts on Profile { description ... on Profile { skills { sortOrder } } }`);
  assert.deepEqual(reads, [
    { name: {}, description: {}, skills: { sortOrder: {}, name: {}, id: {} } },
  ]);
});

test('directives use coerced variable defaults and apply before fragment deduplication', async () => {
  const query = `query Pick($include: Boolean! = false, $skip: Boolean! = true) {
    profile { name description @skip(if: $skip)
      ...Parts @include(if: $include)
      ... on Profile @include(if: $include) { skills { id } }
    }
  }
  fragment Parts on Profile { skills { name } }`;
  assert.deepEqual(await collect(query), [{ name: {} }]);
  assert.deepEqual(await collect(query, { include: true, skip: false }), [
    { name: {}, description: {}, skills: { name: {}, id: {} } },
  ]);
  assert.deepEqual(
    await collect(`{ profile {
    ...Parts @skip(if: true) ...Parts
    description @include(if: false)
    skills @skip(if: true) @include(if: true) { id }
  }} fragment Parts on Profile { name }`),
    [{ name: {} }],
  );
});

test('root aliases have separate selections; meta-only or fully skipped fields need no public columns', async () => {
  assert.deepEqual(await collect('{ profile { __proto__: name } }'), [{ name: {} }]);
  assert.deepEqual(await collect('{ a: profile { name } b: profile { description } }'), [
    { name: {} },
    { description: {} },
  ]);
  assert.deepEqual(await collect('{ profile { __typename skills { __typename } } }'), [
    { skills: {} },
  ]);
  assert.deepEqual(await collect('{ profile { name @skip(if: true) } }'), [{}]);
});
