import type { Options } from 'k6/options';

export { default, setup } from './profile.ts';

// A bounded capacity search: 15s ramp + 45s hold at each target.
// Each iteration executes one complete frontend GetProfile request.
export const options: Options = {
  scenarios: {
    maximum: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 600,
      gracefulStop: '10s',
      stages: [10, 25, 50, 100, 200, 400, 800].flatMap((target) => [
        { duration: '15s', target },
        { duration: '45s', target },
      ]),
    },
  },
  thresholds: {
    // Guardrails for capacity search, separate from normal 500ms/1000ms budgets.
    'http_req_duration{name:GetProfile}': [
      { threshold: 'p(95)<2000', abortOnFail: true, delayAbortEval: '30s' },
    ],
    profile_errors: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
    dropped_iterations: ['count==0'],
  },
};
