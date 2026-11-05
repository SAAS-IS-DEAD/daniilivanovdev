import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000', trace: 'off' },
});
