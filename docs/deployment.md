# Deployment preparation

Repository: https://github.com/SAAS-IS-DEAD/daniilivanovdev (private).
Target: k3s-02, 62.84.118.213. Application deployment is not active yet.

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
