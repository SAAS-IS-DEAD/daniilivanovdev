import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seedData } from '../../src/cli/seed-data.js';
import { normalize } from '../../src/common/validation.js';
test('resume seed is valid, deterministic and has unique normalized skills', () => {
  const data = seedData();
  assert.deepEqual(seedData(), data);
  assert.equal(data.id, 1);
  assert.ok(data.name.length > 0 && data.description.length > 0);
  const skills = data.skills.create;
  assert.equal(new Set(skills.map((s) => s.normalizedName)).size, skills.length);
  for (const skill of skills) assert.equal(skill.normalizedName, normalize(skill.name));
  for (const item of data.experience.create) assert(item.startDate <= item.endDate);
  for (const link of data.links.create) assert.match(link.url, /^https?:\/\//);
  const original = data.skills.create[0]!.name;
  data.skills.create[0]!.name = 'changed';
  assert.equal(seedData().skills.create[0]!.name, original);
});
