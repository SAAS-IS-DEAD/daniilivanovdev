import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Query, Resolver } from '@nestjs/graphql';
import { buildSchema } from '../../src/graphql/schema-builder.js';

@Resolver()
class FixtureResolver {
  @Query(() => String)
  fixture(): string {
    return 'fixture';
  }
}
test('schema generation does not require database configuration or application startup', async () => {
  const schema = await buildSchema([FixtureResolver]);
  assert.equal(schema.getQueryType()?.getFields().fixture?.type.toString(), 'String!');
});
