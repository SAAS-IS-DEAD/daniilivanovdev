import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildSchema as parseSchema, printType } from 'graphql';
import { buildSchema } from '../../src/graphql/schema-builder.js';
import { ProfileResolver } from '../../src/profile/profile.resolver.js';

test('public output types and queries match the planned contract without auth storage fields', async () => {
  const actual = await buildSchema([ProfileResolver]);
  const target = parseSchema(
    await readFile(
      new URL(
        '../../../../../specs/001-digital-business-card/contracts/schema.graphql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  for (const name of ['Profile', 'ProfileLink', 'Skill', 'Experience', 'Project']) {
    const a = actual.getType(name);
    const b = target.getType(name);
    assert(a && b);
    assert.equal(printType(a), printType(b));
  }
  const fields = actual.getQueryType()!.getFields();
  for (const name of [
    'profile',
    'skills',
    'skill',
    'experience',
    'experienceItem',
    'projects',
    'project',
  ]) {
    assert.equal(
      fields[name]?.type.toString(),
      target.getQueryType()!.getFields()[name]?.type.toString(),
    );
  }
  assert.equal(actual.getType('Admin'), undefined);
  assert.equal(actual.getType('Session'), undefined);
});
