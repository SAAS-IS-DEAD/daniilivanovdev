import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { getIntrospectionQuery } from 'graphql';
import { createTestApplication } from '../helpers/application.js';
import { ProfileApiTestModule } from '../helpers/profile-api.js';

test('HTTP rejects batches, large requests and expanded field abuse; introspection works', async () => {
  const app = await createTestApplication(ProfileApiTestModule);
  try {
    const send = (query: string) => request(app.getHttpServer()).post('/graphql').send({ query });
    const introspection = await send(getIntrospectionQuery());
    assert.equal(introspection.body.errors, undefined);
    assert(introspection.body.data.__schema.types.length > 0);
    const abusive = await send(
      '{ profile { ' + Array.from({ length: 51 }, (_, i) => `a${i}:name`).join(' ') + ' } }',
    );
    assert.equal(abusive.body.errors[0].extensions.code, 'BAD_USER_INPUT');
    await request(app.getHttpServer())
      .post('/graphql')
      .send([{ query: '{profile{name}}' }])
      .expect(400);
    await send('{' + ' '.repeat(65536) + 'profile{name}}').expect(413);
    const malformed = await request(app.getHttpServer())
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .send('{"password":"private-input", broken')
      .expect(400);
    assert.ok(!malformed.text.includes('private-input'));
    const sandbox = await request(app.getHttpServer())
      .get('/graphql')
      .set('Accept', 'text/html')
      .expect(200);
    assert.match(sandbox.text, /sandbox/i);
  } finally {
    await app.close();
  }
});
