import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { testDatabaseUrl } from './test-env.ts';

const backendDir = fileURLToPath(new URL('../..', import.meta.url));
const prismaCli = fileURLToPath(
  new URL('../../../node_modules/prisma/build/index.js', import.meta.url),
);

/** Creates the test database if needed and applies pending migrations once per test run. */
export default function setup(): void {
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'pipe',
  });
}
