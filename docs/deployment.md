# Deployment status

Repository: https://github.com/SAAS-IS-DEAD/daniilivanovdev (private), branch main.
Target from ../infra: k3s-02, 62.84.118.213. The application is not yet deployed there.

Quality gate runs on GitHub-hosted runners. The deployment job is deliberately gated
by repository variable DEPLOY_ENABLED=true; this variable has not been enabled.

The initial design follows infra's Argo CD model. A read-only repository deploy key
was rejected by GitHub: "Deploy keys are disabled for this repository". Enabling the
setting through Computer Use is pending: browser host unavailable, native Firefox
access repeatedly times out. No GitHub security setting has been changed.

Prepared fallback (not provisioned on the server): deploy/receive.py accepts release
images through a dedicated forced SSH command, validates their tags, backs up the
application database, runs migrations before application rollout, and checks readiness.
The script requires a root-owned /etc/card-deploy/template.json rendered with
scripts/render-deployment.mjs and a dedicated card-deployer account/key. It has not
been installed or verified against the target cluster. Do not enable DEPLOY_ENABLED
until bootstrap, secrets, database role, ingress/TLS and an actual rollout are checked.

Required CI settings for this fallback: DEPLOY_HOST, APP_ORIGIN, DEPLOY_SSH_KEY,
DEPLOY_KNOWN_HOSTS. Do not reuse the operator's SSH key or copy a cluster kubeconfig
into CI. Argo integration should replace the fallback once repository access is fixed.

No production secrets, deployment private keys or database credentials are committed.
Local generated deployment keys are in gitignored .deploy-secrets/ (mode 0700).
