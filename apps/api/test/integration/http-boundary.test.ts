import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createTestApplication } from '../helpers/application.js';
import { ProfileApiTestModule } from '../helpers/profile-api.js';
test('HTTP boundary exposes correlation IDs, restricts CORS and has no mutation API', async () => {
  const app = await createTestApplication(ProfileApiTestModule);
  const http = request(app.getHttpServer());
  try {
    const first = await http
      .post('/graphql')
      .set('Origin', 'http://localhost:3000')
      .send({ query: '{profile{name}}' });
    assert.equal(first.headers['access-control-allow-origin'], 'http://localhost:3000');
    assert.equal(first.headers['access-control-allow-credentials'], undefined);
    const other = await http
      .post('/graphql')
      .set('Origin', 'https://untrusted.example')
      .send({ query: '{profile{name}}' });
    assert.notEqual(other.headers['access-control-allow-origin'], 'https://untrusted.example');
    assert.notEqual(first.headers['x-request-id'], other.headers['x-request-id']);
    const schema = await http.post('/graphql').send({ query: '{__schema{mutationType{name}}}' });
    assert.equal(schema.body.data.__schema.mutationType, null);
    const mutation = await http.post('/graphql').send({
      query: 'mutation { deleteSkill(id:"00000000-0000-0000-0000-000000000001") { id } }',
    });
    assert.ok(mutation.body.errors?.length);
    const syntax = await http.post('/graphql').send({ query: '{ broken ' });
    assert.equal(syntax.body.errors[0].extensions.code, 'GRAPHQL_PARSE_FAILED');
    const unknown = await http.get('/health/unknown').expect(404);
    assert.ok(!unknown.text.includes('stack'));
    await http
      .options('/graphql')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);
  } finally {
    await app.close();
  }
});
