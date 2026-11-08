import { check, fail } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';
import type { Options } from 'k6/options';
import { readConfig, validProfileResponse } from './support.ts';

const config = readConfig(__ENV);
// The exact query used by the frontend; open() runs once in init context.
const query = open('../apps/web/src/api/profile.graphql');
const payload = JSON.stringify({ query, operationName: 'GetProfile' });
const responseErrors = new Rate('profile_errors');
const params = {
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  tags: { name: 'GetProfile' },
  timeout: '10s',
};

export const options: Options = {
  scenarios: {
    profile:
      config.mode === 'smoke'
        ? { executor: 'shared-iterations', vus: 1, iterations: 5, maxDuration: '30s' }
        : {
            executor: 'ramping-arrival-rate',
            startRate: 1,
            timeUnit: '1s',
            preAllocatedVUs: config.preAllocatedVUs,
            maxVUs: config.maxVUs,
            stages:
              config.mode === 'load'
                ? [
                    { duration: '30s', target: config.rate },
                    { duration: '2m', target: config.rate },
                    { duration: '30s', target: 0 },
                  ]
                : [
                    { duration: '30s', target: config.rate },
                    { duration: '1m', target: config.rate },
                    { duration: '30s', target: config.rate * 2 },
                    { duration: '1m', target: config.rate * 2 },
                    { duration: '30s', target: config.rate * 4 },
                    { duration: '1m', target: config.rate * 4 },
                    { duration: '30s', target: 0 },
                  ],
          },
  },
  thresholds: {
    'http_req_duration{name:GetProfile}': [`p(95)<${config.p95}`, `p(99)<${config.p99}`],
    'http_req_failed{name:GetProfile}': ['rate<0.01'],
    profile_errors: ['rate==0'],
    checks: ['rate==1'],
    ...(config.mode === 'smoke' ? {} : { dropped_iterations: ['count==0'] }),
  },
};

export function setup() {
  const response = http.post(`${config.baseUrl}/graphql`, payload, params);
  if (response.status !== 200 || !validProfileResponse(String(response.body)))
    fail('Preflight failed: /graphql must return a populated public profile without errors');
}

export default function () {
  const response = http.post(`${config.baseUrl}/graphql`, payload, params);
  const valid = check(response, {
    'HTTP 200': (r) => r.status === 200,
    'public profile without GraphQL errors': (r) => validProfileResponse(String(r.body)),
  });
  responseErrors.add(!valid);
}
