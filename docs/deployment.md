# Deployment ownership

All Kubernetes, Argo CD, Image Updater, shared database and nginx configuration is
owned by [SAAS-IS-DEAD/infra](https://github.com/SAAS-IS-DEAD/infra).

- apps/daniilivanovdev: application, migration hook, Kustomize image digest.
- gitops/daniilivanovdev.yaml: Argo Application and AppProject.
- platform/image-updater: pinned controller and card ImageUpdater configuration.
- nginx/daniil-ivanov.dev.conf: canonical domain/TLS proxy template.
- tests/test_card_gitops.py: infrastructure behaviour/configuration checks.

Argo and Image Updater track infra branch deploy/k3s-02. Git write-back goes only
to infra; the application repository no longer contains a deploy branch source.
CI here runs checks and publishes ghcr.io/saas-is-dead/daniilivanovdev after green main.
The Dockerfile/release image belongs to this application repository.

Live site: https://daniil-ivanov.dev/
GraphQL Sandbox: https://daniil-ivanov.dev/graphql
Shared PostgreSQL: db.db.svc.cluster.local:5432; isolated role/database daniil_card.
Credentials remain in Kubernetes Secrets and are never committed.
