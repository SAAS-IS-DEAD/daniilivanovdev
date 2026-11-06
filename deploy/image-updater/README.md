# Image Updater (prepared, activation pending credentials)

Pinned upstream: v1.4.0; vendored manifest checksum in vendor/SOURCE.txt.
Controller overlay: namespace argocd, 10m/64Mi request, 200m/256Mi limit.
No controller or Application has been applied to the cluster by this change.

Flow: main checks -> publish one release image to GHCR -> updater resolves main tag
into a digest -> commits Kustomize image change to deploy/k3s-02 -> Argo sync.
One image/digest covers app and migration Job. The release image currently derives
from the setup stage (includes build dependencies); optimising its size is deferred.
Migrations use sync wave -1, application wave 0; failed migrations block rollout.

The updater matches only Application daniilivanovdev. The GitOps branch is outside
CI push filters, so updater commits cannot trigger a publication loop. Bootstrap
branch deploy/k3s-02 from the reviewed main before activating the Application.
Registry image: ghcr.io/saas-is-dead/daniilivanovdev:main (private by default).

## Credentials (do not send private keys through chat)

1. Git write-back: separate repository deploy key with write access, Secret
   argocd/card-image-updater-git, key sshPrivateKey. Existing card-repository remains
   read-only and belongs to Argo CD. Example with a local key file:

```sh
kubectl -n argocd create secret generic card-image-updater-git \
  --from-file=sshPrivateKey=/secure/path/to/private-key
```

2. GHCR read access: credential with read:packages to this private package.
   Create docker-registry Secrets argocd/card-ghcr-read (updater) and
   daniilivanovdev/ghcr-pull (workloads). Use a secure local tool to supply credentials;
   do not commit them or put tokens in shell history. The Git SSH key does not grant
   registry access. CI publication uses its ephemeral GITHUB_TOKEN/packages:write.

## Bootstrap after credentials are ready

- Review deploy/gitops/resources.json: temporary HTTPS origin is provisional.
- Prepare namespace and card-env Secret for the shared PostgreSQL, restricted app DB role,
  persistent volume retention, external nginx/TLS and backup policy.
- Publish initial image through green main CI and pin its digest in kustomization.yaml.
- Create deploy/k3s-02 branch including the GitOps manifests.
- Render/check controller: `kubectl kustomize deploy/image-updater`.
- Install controller: `kubectl apply -k deploy/image-updater` and wait for
  deployment/argocd-image-updater-controller in argocd.
- Apply application.yaml only after bootstrap; it enables automatic sync.
- Apply card-updater.yaml once Git and GHCR Secrets are present.
- Check ImageUpdater conditions/recentUpdates, verify a digest commit, successful
  migration hook and Argo rollout. No successful live update is claimed yet.

The old deploy/receive.py SSH fallback is obsolete and no longer invoked by CI.

Shared DB: db.db.svc.cluster.local:5432, database/role daniil_card. Namespace
requires database-access=shared-postgres; app and migration Pods require
database-client=shared-postgres. No app-owned PostgreSQL/PVC is deployed.
