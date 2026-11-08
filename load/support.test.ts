import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readConfig, validProfileResponse } from './support.ts';

const profile = {
  id: '1',
  name: 'Developer',
  description: '',
  specialization: null,
  links: [],
  skills: [],
  experience: [],
  projects: [],
};
test('profile check accepts empty relations and nullable specialization', () => {
  assert.equal(validProfileResponse(JSON.stringify({ data: { profile } })), true);
});
test('profile check rejects errors, missing data, broken JSON and invalid relations', () => {
  for (const body of [
    '<html>error</html>',
    '{}',
    'null',
    JSON.stringify({ data: { profile: null } }),
    JSON.stringify({ data: { profile }, errors: [{ message: 'failure' }] }),
    JSON.stringify({ data: { profile: { ...profile, skills: null } } }),
    JSON.stringify({ data: { profile: { ...profile, projects: [{}] } } }),
  ])
    assert.equal(validProfileResponse(body), false, body);
});
test('configuration defaults to local smoke and accepts an explicit target', () => {
  assert.equal(readConfig({}).mode, 'smoke');
  assert.equal(readConfig({}).baseUrl, 'http://localhost:3000');
  assert.equal(readConfig({ BASE_URL: 'https://example.com/' }).baseUrl, 'https://example.com');
  assert.equal(readConfig({ RATE: '1', MODE: 'load' }).rate, 1);
});
test('configuration rejects unknown modes, invalid numbers and invalid origins', () => {
  for (const env of [
    { MODE: 'typo' },
    { RATE: '0' },
    { RATE: '-1' },
    { RATE: '1.5' },
    { RATE: 'NaN' },
    { MAX_VUS: '1', PRE_ALLOCATED_VUS: '2' },
    { BASE_URL: 'file:///tmp' },
    { BASE_URL: 'https://user:pass@example.com' },
    { BASE_URL: 'https://example.com/path' },
    { P95_MS: '0' },
  ])
    assert.throws(() => readConfig(env));
});

test('profile check accepts all populated relations and rejects malformed scalar fields', () => {
  const populated = {
    ...profile,
    specialization: 'Backend',
    links: [{ id: 'link', label: 'GitHub', url: 'https://github.com' }],
    skills: [{ id: 'skill', name: 'TypeScript', sortOrder: 0 }],
    experience: [
      {
        id: 'job',
        company: 'Company',
        position: 'Developer',
        startDate: '2026-01-01',
        sortOrder: 0,
      },
    ],
    projects: [{ id: 'project', name: 'Card', description: '', sortOrder: 0 }],
  };
  assert.equal(
    validProfileResponse(JSON.stringify({ data: { profile: populated }, errors: [] })),
    true,
  );
  for (const broken of [
    { ...populated, name: null },
    { ...populated, specialization: 42 },
    { ...populated, links: [null] },
    { ...populated, skills: [{ id: 'skill', name: 'TS', sortOrder: '0' }] },
    { ...populated, experience: [{ ...populated.experience[0], startDate: null }] },
  ])
    assert.equal(validProfileResponse(JSON.stringify({ data: { profile: broken } })), false);
});
