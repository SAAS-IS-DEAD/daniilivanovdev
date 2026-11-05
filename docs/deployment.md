# Deployment status

Repository: https://github.com/SAAS-IS-DEAD/daniilivanovdev (private), branch main.
Target from ../infra: k3s-02, 62.84.118.213. The application is not yet deployed there.

CI runs separate GitHub-hosted jobs: lint, formatting, types, build, unit, integration,
contract, coverage, deployment tests and browser E2E. Deployment runs automatically
on pushes to main after every check succeeds. DEPLOY_ENABLED is no longer used.
Deployment configuration is currently missing; the preflight check reports missing
variables/secrets explicitly, so a successful server rollout is not yet claimed.

Deploy keys were enabled for SAAS-IS-DEAD through GitHub UI after explicit owner
confirmation. GitHub showed "Deploy key policy enabled". A dedicated read-only key
(id 168902315) was added only to this repository. Its private key is stored in
argocd/card-repository on k3s-02. A server-side git ls-remote using that key and
Argo CD's pinned SSH known_hosts successfully read refs/heads/main.

Repository access is now configured. The Argo Application, release delivery,
application secrets, database bootstrap and public ingress still need provisioning.

Prepared fallback (not provisioned on the server): deploy/receive.py accepts release
images through a dedicated forced SSH command, validates their tags, backs up the
application database, runs migrations before application rollout, and checks readiness.
The script requires a root-owned /etc/card-deploy/template.json rendered with
scripts/render-deployment.mjs and a dedicated card-deployer account/key. It has not
been installed or verified against the target cluster. Bootstrap, secrets, database role and ingress/TLS must be provisioned before
the automatic job can complete a rollout.

Required CI settings for this fallback: DEPLOY_HOST, APP_ORIGIN, DEPLOY_SSH_KEY,
DEPLOY_KNOWN_HOSTS. Do not reuse the operator's SSH key or copy a cluster kubeconfig
into CI. Argo integration should replace the fallback once repository access is fixed.

No production secrets, deployment private keys or database credentials are committed.
Local generated deployment keys are in gitignored .deploy-secrets/ (mode 0700).
