import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDeployment } from './render-deployment.mjs';
const revision = 'a'.repeat(40);
const origin = 'https://card.example.com';
test('deployment pins release images, gates application on migrations and keeps DB private', () => {
  const { items } = renderDeployment({ revision, origin });
  const app = items.find((i) => i.kind === 'Deployment');
  const job = items.find((i) => i.kind === 'Job');
  const db = items.find((i) => i.kind === 'StatefulSet');
  assert.equal(
    app.spec.template.spec.containers[0].image,
    `docker.io/library/card-runtime:${revision}`,
  );
  assert.equal(
    job.spec.template.spec.containers[0].image,
    `docker.io/library/card-setup:${revision}`,
  );
  assert(
    Number(db.metadata.annotations['argocd.argoproj.io/sync-wave']) <
      Number(job.metadata.annotations['argocd.argoproj.io/sync-wave']),
  );
  assert(
    Number(job.metadata.annotations['argocd.argoproj.io/sync-wave']) <
      Number(app.metadata.annotations['argocd.argoproj.io/sync-wave']),
  );
  assert.equal(job.spec.backoffLimit, 0);
  assert.equal(db.spec.persistentVolumeClaimRetentionPolicy.whenDeleted, 'Retain');
  assert(
    items
      .filter((i) => i.kind === 'Service')
      .every((i) => !i.spec.type || i.spec.type === 'ClusterIP'),
  );
  assert.equal(JSON.stringify(items).includes('POSTGRES_PASSWORD'), false);
});
test('rejects mutable revisions and unsafe origins', () => {
  for (const bad of ['latest', '', 'a'.repeat(39), 'x'.repeat(40)])
    assert.throws(() => renderDeployment({ revision: bad, origin }));
  for (const bad of [
    'http://card.example.com',
    'https://user:pass@card.example.com',
    'https://card.example.com/path',
    'https://card.example.com?x=1',
  ])
    assert.throws(() => renderDeployment({ revision, origin: bad }));
});
