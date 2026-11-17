import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rootEnvFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

/** Integration tests run against a dedicated database, reset before every test. */
export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://benevita:benevita@localhost:5432/benevita_test?schema=public';

// Tests truncate every table: refuse to run against the development database by mistake.
if (testDatabaseUrl === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must point to a different database than DATABASE_URL');
}

export const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl,
  JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
  JWT_EXPIRES_IN: '1h',
} as const;
