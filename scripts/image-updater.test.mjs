import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse, parseAllDocuments } from 'yaml';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const updater = parse(read('deploy/image-updater/card-updater.yaml'));
const resources = JSON.parse(read('deploy/gitops/resources.json')).items;
test('updater is scoped to the card and writes digests to a separate GitOps branch', () => {
  assert.equal(updater.spec.applicationRefs.length, 1);
  assert.equal(updater.spec.applicationRefs[0].namePattern, 'daniilivanovdev');
  assert.equal(updater.spec.writeBackConfig.gitConfig.branch, 'deploy/k3s-02');
  assert.equal(updater.spec.writeBackConfig.gitConfig.writeBackTarget, 'kustomization');
  assert.equal(updater.spec.writeBackConfig.method, 'git:secret:argocd/card-image-updater-git');
  assert.equal(
    updater.spec.applicationRefs[0].images[0].commonUpdateSettings.updateStrategy,
    'digest',
  );
});
test('app and migration share one release image; registry auth is referenced without secrets', () => {
  const workloads = resources.filter((item) => ['Deployment', 'Job'].includes(item.kind));
  assert.equal(workloads.length, 2);
  assert.equal(
    new Set(workloads.map((item) => item.spec.template.spec.containers[0].image)).size,
    1,
  );
  for (const item of workloads) {
    assert.notEqual(item.spec.template.spec.containers[0].imagePullPolicy, 'Never');
    assert.deepEqual(item.spec.template.spec.imagePullSecrets, [{ name: 'ghcr-pull' }]);
  }
  const job = workloads.find((item) => item.kind === 'Job');
  assert.deepEqual(job.spec.template.spec.containers[0].command, [
    'npm',
    'run',
    'setup',
    '--workspace',
    'apps/api',
  ]);
});
test('configuration fields and required values match the pinned upstream CRD', () => {
  const crd = parseAllDocuments(read('deploy/image-updater/vendor/install.yaml'))
    .map((d) => d.toJSON())
    .find((d) => d?.kind === 'CustomResourceDefinition');
  const schema = crd.spec.versions.find((v) => v.storage).schema.openAPIV3Schema;
  function validate(value, shape) {
    if (shape.enum) assert(shape.enum.includes(value));
    if (shape.pattern && typeof value === 'string') assert(new RegExp(shape.pattern).test(value));
    if (Array.isArray(value)) {
      for (const item of value) validate(item, shape.items ?? {});
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const key of shape.required ?? []) assert(key in value, `Missing ${key}`);
    for (const [key, field] of Object.entries(value)) {
      if (shape.properties) {
        assert(shape.properties[key] || shape.additionalProperties, `Unsupported field: ${key}`);
        validate(field, shape.properties[key] ?? {});
      }
    }
  }
  validate(updater.spec, schema.properties.spec);
});
test('publication only pushes registry images and does not connect to the server', () => {
  const ci = parse(read('.github/workflows/ci.yml'));
  const commands = ci.jobs.publish.steps.map((s) => s.run ?? '').join('\n');
  assert.match(commands, /docker push/);
  assert.match(commands, /--target release/);
  assert.doesNotMatch(commands, /\bssh\b|\bkubectl\b/);
  assert.equal(ci.jobs.publish.permissions.packages, 'write');
});

test('GitOps uses shared PostgreSQL access labels and never owns a database server', () => {
  assert(!resources.some((r) => r.kind === 'StatefulSet' || r.kind === 'PersistentVolumeClaim'));
  assert.equal(
    resources.find((r) => r.kind === 'Namespace').metadata.labels['database-access'],
    'shared-postgres',
  );
  for (const r of resources.filter((r) => ['Deployment', 'Job'].includes(r.kind))) {
    assert.equal(r.spec.template.metadata.labels['database-client'], 'shared-postgres');
  }
});
