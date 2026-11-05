import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function renderDeployment({ revision, origin }) {
  if (!/^[a-f0-9]{40}$/.test(revision ?? '')) throw new Error('Expected a full Git commit SHA');
  const url = new URL(origin);
  if (
    url.protocol !== 'https:' ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error('Expected an HTTPS origin without path or credentials');
  }
  const namespace = 'daniilivanovdev';
  const image = (target) => `docker.io/library/card-${target}:${revision}`;
  const labels = { 'app.kubernetes.io/name': namespace };
  const secretEnv = [{ secretRef: { name: 'card-env' } }];
  const probe = (path) => ({ httpGet: { path, port: 3000 }, timeoutSeconds: 3, periodSeconds: 10 });
  const metadata = (name, wave = '0') => ({
    name,
    namespace,
    labels,
    annotations: { 'argocd.argoproj.io/sync-wave': wave },
  });
  return {
    apiVersion: 'v1',
    kind: 'List',
    items: [
      {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: namespace,
          labels,
          annotations: { 'argocd.argoproj.io/sync-wave': '-3' },
        },
      },
      {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: metadata('postgres', '-2'),
        spec: {
          clusterIP: 'None',
          selector: { app: 'card-postgres' },
          ports: [{ port: 5432, targetPort: 5432 }],
        },
      },
      {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: metadata('postgres', '-2'),
        spec: {
          serviceName: 'postgres',
          replicas: 1,
          selector: { matchLabels: { app: 'card-postgres' } },
          persistentVolumeClaimRetentionPolicy: { whenDeleted: 'Retain', whenScaled: 'Retain' },
          template: {
            metadata: { labels: { app: 'card-postgres' } },
            spec: {
              automountServiceAccountToken: false,
              terminationGracePeriodSeconds: 60,
              containers: [
                {
                  name: 'postgres',
                  image: 'postgres:17.6-bookworm',
                  imagePullPolicy: 'IfNotPresent',
                  envFrom: [{ secretRef: { name: 'card-postgres' } }],
                  env: [{ name: 'PGDATA', value: '/var/lib/postgresql/data/pgdata' }],
                  ports: [{ containerPort: 5432 }],
                  resources: {
                    requests: { cpu: '50m', memory: '128Mi' },
                    limits: { cpu: '500m', memory: '384Mi' },
                  },
                  securityContext: { allowPrivilegeEscalation: false },
                  volumeMounts: [{ name: 'data', mountPath: '/var/lib/postgresql/data' }],
                  readinessProbe: {
                    exec: {
                      command: ['sh', '-c', 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'],
                    },
                    periodSeconds: 5,
                  },
                  startupProbe: {
                    exec: {
                      command: ['sh', '-c', 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'],
                    },
                    periodSeconds: 5,
                    failureThreshold: 36,
                  },
                },
              ],
            },
          },
          volumeClaimTemplates: [
            {
              metadata: { name: 'data' },
              spec: {
                accessModes: ['ReadWriteOnce'],
                storageClassName: 'local-path',
                resources: { requests: { storage: '1Gi' } },
              },
            },
          ],
        },
      },
      {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
          ...metadata(`migrate-${revision.slice(0, 12)}`, '-1'),
          annotations: {
            'argocd.argoproj.io/sync-wave': '-1',
            'argocd.argoproj.io/hook': 'Sync',
            'argocd.argoproj.io/hook-delete-policy': 'BeforeHookCreation,HookSucceeded',
          },
        },
        spec: {
          backoffLimit: 0,
          activeDeadlineSeconds: 300,
          template: {
            spec: {
              restartPolicy: 'Never',
              automountServiceAccountToken: false,
              containers: [
                {
                  name: 'migrate',
                  image: image('setup'),
                  imagePullPolicy: 'Never',
                  envFrom: secretEnv,
                  resources: {
                    requests: { cpu: '100m', memory: '128Mi' },
                    limits: { cpu: '500m', memory: '512Mi' },
                  },
                  securityContext: {
                    runAsNonRoot: true,
                    runAsUser: 1000,
                    allowPrivilegeEscalation: false,
                    capabilities: { drop: ['ALL'] },
                  },
                },
              ],
            },
          },
        },
      },
      {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: metadata('app'),
        spec: {
          replicas: 1,
          revisionHistoryLimit: 3,
          progressDeadlineSeconds: 300,
          strategy: { type: 'RollingUpdate', rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } },
          selector: { matchLabels: { app: 'card-web' } },
          template: {
            metadata: {
              labels: { app: 'card-web' },
              annotations: { 'app.kubernetes.io/revision': revision },
            },
            spec: {
              automountServiceAccountToken: false,
              containers: [
                {
                  name: 'app',
                  image: image('runtime'),
                  imagePullPolicy: 'Never',
                  envFrom: secretEnv,
                  env: [
                    { name: 'NODE_ENV', value: 'production' },
                    { name: 'APP_ORIGIN', value: url.origin },
                    { name: 'PORT', value: '3000' },
                    { name: 'CLIENT_IP_MODE', value: 'direct' },
                  ],
                  ports: [{ containerPort: 3000 }],
                  resources: {
                    requests: { cpu: '50m', memory: '128Mi' },
                    limits: { cpu: '500m', memory: '384Mi' },
                  },
                  readinessProbe: probe('/health/ready'),
                  livenessProbe: probe('/health/live'),
                  startupProbe: { ...probe('/health/live'), failureThreshold: 30 },
                  securityContext: {
                    runAsNonRoot: true,
                    runAsUser: 1000,
                    allowPrivilegeEscalation: false,
                    capabilities: { drop: ['ALL'] },
                  },
                },
              ],
            },
          },
        },
      },
      {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: metadata('app'),
        spec: { selector: { app: 'card-web' }, ports: [{ port: 80, targetPort: 3000 }] },
      },
      {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'NetworkPolicy',
        metadata: metadata('postgres-only-app'),
        spec: {
          podSelector: { matchLabels: { app: 'card-postgres' } },
          policyTypes: ['Ingress'],
          ingress: [{ from: [{ podSelector: {} }], ports: [{ protocol: 'TCP', port: 5432 }] }],
        },
      },
    ],
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , revision, origin, output] = process.argv;
  if (!output) throw new Error('Usage: render-deployment.mjs SHA HTTPS_ORIGIN OUTPUT');
  writeFileSync(output, JSON.stringify(renderDeployment({ revision, origin }), null, 2) + '\n');
}
