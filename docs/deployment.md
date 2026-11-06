# Deployment preparation

Repository: https://github.com/SAAS-IS-DEAD/daniilivanovdev (private).
Target: k3s-02, 62.84.118.213. Application is deployed and Argo auto-sync is enabled.

CI has separate lint/format/types/build/unit/integration/contract/coverage/deployment-tests/E2E
checks. After green main, publish pushes one release image to GHCR with SHA and main tags.
There is no direct SSH deployment from CI.

Argo CD Image Updater v1.4.0 preparation, bootstrap steps and Secret requirements:
[deploy/image-updater/README.md](../deploy/image-updater/README.md).
The updater follows the main tag by digest and commits Kustomize changes to deploy/k3s-02.
Argo CD reads that branch using the existing read-only card-repository deploy key.
Application and migration Job share the same image and digest.

The owner is preparing a separate Git write-back key. GHCR read credentials,
application/DB secrets, database role and ingress/TLS still need provisioning.
Controller and Application manifests are prepared but have not been activated.
No successful live update or public rollout is claimed.

Old deploy/receive.py is a historical SSH fallback, not used by the workflow.
No private keys or production credentials are committed.

## Live state — 2026-11-06

- URL: https://daniilivanovdev.62.84.118.213.sslip.io/
- Sandbox: https://daniilivanovdev.62.84.118.213.sslip.io/graphql
- Shared PostgreSQL: db/db-0, db.db.svc.cluster.local:5432. A new shared instance was
  initialised on k3s-02; no data from other applications was restored.
- Isolated database and owner role: daniil_card, LOGIN without SUPERUSER/CREATEDB/CREATEROLE.
  PUBLIC CONNECT revoked for this database; credentials only in card-env Secret.
- Shared namespace/Pod network labels configured. The app does not own a DB StatefulSet/PVC.
- Shared PV reclaim policy Retain. No off-host database backup is configured yet.
- Original infra PostgreSQL digest was unavailable. Replacement overlay:
  ../infra/environments/card-shared-db, postgres:17.6-bookworm at pinned digest.
  Other uncommitted infra work was not committed or pushed.
- Argo Application Synced/Healthy, automated.enabled=true, selfHeal=true, prune=false.
- Image Updater wrote a digest update to deploy/k3s-02; next reconciliation had no errors.
- Prisma migrations and seed succeeded: 1 profile, 49 skills, 6 experience, 4 projects.
- nginx proxies the app ClusterIP; valid Let's Encrypt certificate and reload hook installed.
- verify and deployment tests passed; all 9 E2E passed against public HTTPS.
