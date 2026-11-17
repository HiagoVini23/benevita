import type { Env } from './config/env.ts';
import type { Database } from './database/prisma.ts';
import type { Clock } from './time/clock.ts';

/** Explicit dependencies handed to every feature plugin, so tests can swap db and clock. */
export interface AppDependencies {
  env: Env;
  db: Database;
  clock: Clock;
}

export interface FeaturePluginOptions {
  deps: AppDependencies;
}
