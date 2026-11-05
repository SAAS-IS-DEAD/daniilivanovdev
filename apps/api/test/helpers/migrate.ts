import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertTestDatabase, TEST_DATABASE_URL } from './database.js';

assertTestDatabase();
execFileSync(
  process.execPath,
  [
    fileURLToPath(new URL('../../../../../node_modules/prisma/build/index.js', import.meta.url)),
    'migrate',
    'deploy',
  ],
  {
    cwd: fileURLToPath(new URL('../../../', import.meta.url)),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  },
);
