import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Module } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import request from 'supertest';
import { ApiGraphQLModule } from '../../src/graphql/graphql.module.js';
import { createTestApplication } from '../helpers/application.js';

@Resolver()
class FailingResolver {
  @Query(() => String, { nullable: true })
  fail() {
    throw new Error('private-database-error-and-credentials');
  }
}
@Module({ imports: [ApiGraphQLModule], providers: [FailingResolver] })
class ErrorTestModule {}

test('internal failures return correlation ID and never expose internal details', async () => {
  const app = await createTestApplication(ErrorTestModule);
  try {
    const result = await request(app.getHttpServer()).post('/graphql').send({ query: '{ fail }' });
    assert.equal(result.body.errors[0].extensions.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(result.body.errors[0].extensions.requestId, result.headers['x-request-id']);
    assert.match(result.body.errors[0].extensions.requestId, /^[0-9a-f-]{36}$/);
    assert.ok(!JSON.stringify(result.body).includes('private-database'));
  } finally {
    await app.close();
  }
});
