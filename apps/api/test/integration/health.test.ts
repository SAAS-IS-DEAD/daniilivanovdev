import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createTestApplication } from '../helpers/application.js';
import { HealthModule } from '../../src/health/health.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

test('live and ready with PostgreSQL; failure returns 503 without details', async () => {
  const app = await createTestApplication(HealthModule);
  try {
    await request(app.getHttpServer()).get('/health/live').expect(200, { status: 'ok' });
    await request(app.getHttpServer()).get('/health/ready').expect(200, { status: 'ready' });
    const db = app.get(PrismaService);
    const original = db.$queryRaw;
    db.$queryRaw = (() => {
      throw new Error('secret connection details');
    }) as typeof db.$queryRaw;
    const response = await request(app.getHttpServer()).get('/health/ready').expect(503);
    assert(!JSON.stringify(response.body).includes('secret'));
    db.$queryRaw = original;
  } finally {
    await app.close();
  }
});
