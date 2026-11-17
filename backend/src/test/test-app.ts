import { afterAll, beforeAll, beforeEach } from 'vitest';
import { buildApp, type App } from '../app.ts';
import type { AuthUser } from '../shared/auth/auth-user.ts';
import { loadEnv } from '../shared/config/env.ts';
import { createDatabase, type Database } from '../shared/database/prisma.ts';
import type { Clock } from '../shared/time/clock.ts';

export const DEFAULT_TEST_NOW = new Date('2026-11-16T12:00:00.000Z');

export interface FixedClock extends Clock {
  set: (instant: Date) => void;
}

export function createFixedClock(initial: Date = DEFAULT_TEST_NOW): FixedClock {
  let current = initial;
  return {
    now: () => new Date(current),
    set: (instant) => {
      current = instant;
    },
  };
}

export async function resetDatabase(db: Database): Promise<void> {
  await db.$executeRaw`TRUNCATE TABLE reports, appointments, patients, professionals, exam_types, users CASCADE`;
}

export interface TestContext {
  app: App;
  db: Database;
  clock: FixedClock;
  authHeader: (user: AuthUser) => { authorization: string };
}

/**
 * Builds the real app against the test database. Registers hooks that reset the database
 * before each test and release resources after the file. Call it at the top of a `describe`.
 */
export function setupTestApp(): TestContext {
  const env = loadEnv();
  const db = createDatabase(env.DATABASE_URL);
  const clock = createFixedClock();
  const app = buildApp({ env, db, clock });

  // Plugins (e.g. app.jwt) are only available once the app is ready.
  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    clock.set(DEFAULT_TEST_NOW);
    await resetDatabase(db);
  });

  afterAll(async () => {
    await app.close();
    await db.$disconnect();
  });

  return {
    app,
    db,
    clock,
    authHeader: (user) => ({ authorization: `Bearer ${app.jwt.sign(user)}` }),
  };
}
