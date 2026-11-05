import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createTestApplication } from '../helpers/application.js';
import { ProfileApiTestModule } from '../helpers/profile-api.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

test('profile queries return selected public fields, stable relations and nulls', async () => {
  const app = await createTestApplication(ProfileApiTestModule);
  const db = app.get(PrismaService);
  try {
    await db.profileLink.deleteMany();
    await db.skill.deleteMany();
    await db.experience.deleteMany();
    await db.project.deleteMany();
    await db.profile.deleteMany();
    const send = (query: string) => request(app.getHttpServer()).post('/graphql').send({ query });
    assert.deepEqual((await send('{ profile { name } skills { name } }')).body.data, {
      profile: null,
      skills: [],
    });
    await db.profile.create({
      data: {
        id: 1,
        name: 'Тестовый профиль',
        description: 'Fixture, не реальная биография',
        skills: {
          create: [
            { name: 'B', normalizedName: 'b', sortOrder: 2 },
            { name: 'A', normalizedName: 'a', sortOrder: 1 },
          ],
        },
      },
    });
    assert.deepEqual((await send('{ profile { name } }')).body.data, {
      profile: { name: 'Тестовый профиль' },
    });
    const result = (
      await send(
        '{ profile { name description skills { name } projects { name } experience { company position } } }',
      )
    ).body;
    assert.equal(result.errors, undefined);
    assert.deepEqual(result.data.profile.skills, [{ name: 'A' }, { name: 'B' }]);
    assert.deepEqual(result.data.profile.projects, []);
    assert.equal(
      (await send('{ profile { passwordHash } }')).body.errors[0].extensions.code,
      'GRAPHQL_VALIDATION_FAILED',
    );
    assert.equal(
      (await send('{ project(id:"00000000-0000-0000-0000-000000000000") { name } }')).body.data
        .project,
      null,
    );
  } finally {
    await app.close();
  }
});
