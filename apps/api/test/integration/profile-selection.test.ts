import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { ENVIRONMENT, EnvironmentModule, loadEnvironment } from '../../src/config/environment.js';
import { configureApp } from '../../src/configure-app.js';
import { assertTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';
import { ProfileApiTestModule } from '../helpers/profile-api.js';

test('GraphQL profile reads only selected columns and relations, with bounded SQL and correct fragments/directives', async () => {
  assertTestDatabase();
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }),
    log: [{ emit: 'event', level: 'query' }],
  });
  const statements: string[] = [];
  db.$on('query', ({ query }) => {
    if (/^SELECT\b/i.test(query.trim())) statements.push(query);
  });
  const testing = await Test.createTestingModule({
    imports: [EnvironmentModule, PrismaModule, ProfileApiTestModule],
  })
    .overrideProvider(PrismaService)
    .useValue(db)
    .overrideProvider(ENVIRONMENT)
    .useValue(
      loadEnvironment({
        DATABASE_URL: TEST_DATABASE_URL,
        APP_ORIGIN: 'http://localhost:3000',
        NODE_ENV: 'test',
      }),
    )
    .compile();
  const app = testing.createNestApplication({ logger: false, bodyParser: false });
  configureApp(app);
  await app.init();
  const clear = async () => {
    await db.profileLink.deleteMany();
    await db.skill.deleteMany();
    await db.experience.deleteMany();
    await db.project.deleteMany();
    await db.profile.deleteMany();
  };
  const send = async (query: string, variables?: Record<string, unknown>, status = 200) => {
    statements.length = 0;
    return (
      await request(app.getHttpServer()).post('/graphql').send({ query, variables }).expect(status)
    ).body;
  };
  try {
    for (const count of [1, 100]) {
      await clear();
      await db.profile.create({
        data: { id: 1, name: 'Fixture', description: 'Detailed biography' },
      });
      for (let i = 0; i < count; i++) {
        await db.skill.create({
          data: { name: `Skill ${i}`, normalizedName: `skill ${i}`, sortOrder: count - i },
        });
        await db.project.create({
          data: { name: `Project ${i}`, description: 'Project details', sortOrder: i },
        });
        await db.experience.create({
          data: {
            company: `Company ${i}`,
            position: 'Developer',
            startDate: new Date('2020-01-01'),
            sortOrder: i,
          },
        });
        await db.profileLink.create({
          data: { label: `Link ${i}`, url: 'https://example.org', position: i },
        });
      }
      const scalar = await send('{ profile { name } }');
      assert.deepEqual(scalar.data, { profile: { name: 'Fixture' } });
      assert.equal(scalar.errors, undefined);
      assert.equal(statements.length, 1, 'A scalar-only profile must not read relation tables');
      assert.doesNotMatch(statements[0]!, /"description"|"specialization"/);

      const skills = await send('{ profile { skills { name } } }');
      assert.equal(skills.errors, undefined);
      assert.equal(skills.data.profile.skills.length, count);
      assert.equal(skills.data.profile.skills[0].name, `Skill ${count - 1}`);
      assert.equal(statements.length, 2);
      assert.doesNotMatch(statements.join('\n'), /"Project"|"Experience"|"ProfileLink"/);
      const skillSql = statements.find((sql) => sql.includes('"Skill"'))!;
      assert.doesNotMatch(
        skillSql.split(/\bFROM\b/)[0]!,
        /"sortOrder"|"normalizedName"|"createdAt"/,
      );

      const full = await send(
        '{ profile { name links { url } skills { name } experience { company } projects { name } } }',
      );
      assert.equal(full.errors, undefined);
      for (const field of ['links', 'skills', 'experience', 'projects'])
        assert.equal(full.data.profile[field].length, count);
      assert.equal(statements.length, 5, 'Requested relations must stay bounded as lists grow');
    }
    const example = readFileSync(
      new URL('../../../../../README.md', import.meta.url),
      'utf8',
    ).match(/```graphql\s+([\s\S]+?)```/)?.[1];
    assert(example, 'README must include an executable GraphQL example');
    assert.equal((await send(example)).errors, undefined);
    assert.equal(statements.length, 5);

    const conditional = `query Pick($skills: Boolean! = false, $skip: Boolean! = true) {
      profile { title: name ...Parts ...Parts skills @include(if: $skills) { name }
        projects @skip(if: $skip) { name } }
    }
    fragment Parts on Profile { ... @include(if: true) { links { caption: label url } } }`;
    let result = await send(conditional);
    assert.equal(result.errors, undefined);
    assert.equal(result.data.profile.title, 'Fixture');
    assert.equal(result.data.profile.links[0].caption, 'Link 0');
    assert.equal(
      statements.length,
      2,
      'Skipped relations and duplicate fragments must not cause reads',
    );
    assert.doesNotMatch(statements.join('\n'), /"Skill"|"Project"|"Experience"/);
    result = await send(conditional, { skills: true, skip: false });
    assert.equal(result.errors, undefined);
    assert.equal(result.data.profile.skills.length, 100);
    assert.equal(result.data.profile.projects.length, 100);
    assert.equal(statements.length, 4);

    result = await send('{ profile { __typename skills { __typename } } }');
    assert.equal(result.errors, undefined);
    assert.equal(result.data.profile.__typename, 'Profile');
    assert.equal(result.data.profile.skills[0].__typename, 'Skill');
    assert.equal(statements.length, 2);

    result = await send('{ a: profile { name } b: profile { description } }');
    assert.deepEqual(result.data, {
      a: { name: 'Fixture' },
      b: { description: 'Detailed biography' },
    });
    assert.equal(statements.length, 2);
    const columns = statements.map((sql) => sql.split(/\bFROM\b/)[0]!);
    assert(columns.some((sql) => sql.includes('"name"') && !sql.includes('"description"')));
    assert(columns.some((sql) => sql.includes('"description"') && !sql.includes('"name"')));
    result = await send('{ profile { name } profile { description } }');
    assert.deepEqual(result.data.profile, { name: 'Fixture', description: 'Detailed biography' });
    assert.equal(statements.length, 1);

    assert.deepEqual((await send('{ profile { name @include(if: false) } }')).data, {
      profile: {},
    });
    assert.equal(statements.length, 1);
    assert.deepEqual((await send('{ profile @skip(if: true) { name } }')).data, {});
    assert.equal(statements.length, 0);

    const invalid = await send('{ profile { passwordHash } }', undefined, 400);
    assert(invalid.errors);
    assert.equal(statements.length, 0);
    await clear();
    assert.deepEqual((await send('{ profile { __typename } }')).data, { profile: null });
    assert.equal(statements.length, 1);
  } finally {
    await app.close();
    await db.$disconnect();
  }
});
