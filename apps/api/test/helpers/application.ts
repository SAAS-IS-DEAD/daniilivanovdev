import { WEB_ROOT } from '../../src/web/web.module.js';
import { configureApp } from '../../src/configure-app.js';
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { Type } from '@nestjs/common';
import { ENVIRONMENT, EnvironmentModule, loadEnvironment } from '../../src/config/environment.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { assertTestDatabase, TEST_DATABASE_URL } from './database.js';

export async function createTestApplication(
  module: Type,
  webRoot?: string,
  cache: { redisUrl?: string; ttlSeconds?: number } = {},
) {
  assertTestDatabase();
  const builder = Test.createTestingModule({
    imports: [EnvironmentModule, PrismaModule, module],
  })
    .overrideProvider(ENVIRONMENT)
    .useValue(
      loadEnvironment({
        DATABASE_URL: TEST_DATABASE_URL,
        REDIS_URL: cache.redisUrl,
        CACHE_TTL_SECONDS: String(cache.ttlSeconds ?? 60),
        APP_ORIGIN: 'http://localhost:3000',
        NODE_ENV: 'test',
      }),
    );
  if (webRoot) builder.overrideProvider(WEB_ROOT).useValue(webRoot);
  const testing = await builder.compile();
  const app = testing.createNestApplication({ logger: false, bodyParser: false });
  configureApp(app);
  await app.init();
  return app;
}
