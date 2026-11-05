import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createTestApplication } from '../helpers/application.js';
import { ProfileApiTestModule } from '../helpers/profile-api.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

test('all list/detail queries share deterministic ordering, dates and nullable fields', async () => {
  const app = await createTestApplication(ProfileApiTestModule);
  const db = app.get(PrismaService);
  const send = (query: string) => request(app.getHttpServer()).post('/graphql').send({ query });
  try {
    await db.profileLink.deleteMany();
    await db.skill.deleteMany();
    await db.experience.deleteMany();
    await db.project.deleteMany();
    await db.profile.deleteMany();
    const ids = ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'];
    const createdAt = new Date('2020-01-01');
    await db.profile.create({
      data: {
        id: 1,
        name: 'Fixture',
        description: 'Only test data',
        links: {
          create: [
            { label: 'Second', url: 'https://example.com/2', position: 1 },
            { label: 'First', url: 'https://example.com/1', position: 0 },
          ],
        },
        skills: {
          create: ids.map((id, i) => ({
            id,
            name: `Skill ${i}`,
            normalizedName: `skill ${i}`,
            sortOrder: 0,
            createdAt,
          })),
        },
        experience: {
          create: ids.map((id, i) => ({
            id,
            company: `Company ${i}`,
            position: 'Developer',
            startDate: new Date('2024-02-29'),
            sortOrder: 0,
            createdAt,
          })),
        },
        projects: {
          create: ids.map((id, i) => ({
            id,
            name: `Project ${i}`,
            description: '<script>text only</script>',
            sortOrder: 0,
            createdAt,
          })),
        },
      },
    });
    const expected = [...ids].reverse();
    for (const [list, detail, fields] of [
      ['skills', 'skill', 'name'],
      ['experience', 'experienceItem', 'company position startDate endDate description'],
      ['projects', 'project', 'name description websiteUrl repositoryUrl imageUrl'],
    ] as const) {
      const result = await send(
        `{ ${list} { id ${fields} } profile { ${list} { id ${fields} } } }`,
      );
      assert.equal(result.body.errors, undefined);
      assert.deepEqual(
        result.body.data[list].map((v: { id: string }) => v.id),
        expected,
      );
      assert.deepEqual(result.body.data[list], result.body.data.profile[list]);
      const single = await send(`{ ${detail}(id:"${ids[0]}") { id ${fields} } }`);
      assert.deepEqual(single.body.data[detail], result.body.data[list][1]);
      assert.equal(
        (await send(`{ ${detail}(id:"00000000-0000-0000-0000-000000000099") { id } }`)).body.data[
          detail
        ],
        null,
      );
      const invalid = await send(`{ ${detail}(id:"invalid") { id } }`);
      assert.equal(invalid.body.errors[0].extensions.code, 'BAD_USER_INPUT');
      assert.equal(invalid.body.errors[0].extensions.fields[0].path, 'id');
    }
    const values = (
      await send(
        '{ profile { specialization links { label } experience { startDate endDate description } projects { websiteUrl repositoryUrl imageUrl } } }',
      )
    ).body.data.profile;
    assert.equal(values.specialization, null);
    assert.deepEqual(
      values.links.map((l: { label: string }) => l.label),
      ['First', 'Second'],
    );
    assert.equal(values.experience[0].startDate, '2024-02-29');
    assert.equal(values.experience[0].endDate, null);
    assert.equal(values.projects[0].websiteUrl, null);
    await db.skill.deleteMany();
    await db.experience.deleteMany();
    await db.project.deleteMany();
    assert.deepEqual(
      (await send('{ skills { id } experience { id } projects { id } }')).body.data,
      { skills: [], experience: [], projects: [] },
    );
  } finally {
    await app.close();
  }
});

test('database rejects duplicate skills and invalid content without partial writes', async () => {
  const app = await createTestApplication(ProfileApiTestModule);
  const db = app.get(PrismaService);
  try {
    await db.skill.deleteMany();
    await db.profile.upsert({
      where: { id: 1 },
      create: { id: 1, name: 'Test', description: 'Test' },
      update: {},
    });
    await assert.rejects(
      db.$transaction(async (tx) => {
        await tx.skill.create({ data: { name: 'A', normalizedName: 'a', sortOrder: 0 } });
        await tx.skill.create({ data: { name: 'a', normalizedName: 'a', sortOrder: 1 } });
      }),
    );
    assert.equal(await db.skill.count(), 0);
    await assert.rejects(
      db.skill.create({ data: { name: 'Negative', normalizedName: 'negative', sortOrder: -1 } }),
    );
    assert.equal(await db.skill.count(), 0);
  } finally {
    await app.close();
  }
});
