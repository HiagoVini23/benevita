import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rootEnvFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

/**
 * Integration tests run against a dedicated database (never the dev one). Each git worktree can
 * point TEST_DATABASE_URL at its own database so parallel test runs do not wipe each other.
 */
export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://benevita:benevita@localhost:5432/benevita_test?schema=public';

export const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl,
  JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
  JWT_EXPIRES_IN: '1h',
} as const;
