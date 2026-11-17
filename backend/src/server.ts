import { buildApp } from './app.ts';
import { loadEnv } from './shared/config/env.ts';
import { createDatabase } from './shared/database/prisma.ts';
import { systemClock } from './shared/time/clock.ts';

const env = loadEnv();
const db = createDatabase(env.DATABASE_URL);
const app = buildApp({ env, db, clock: systemClock }, { logger: env.NODE_ENV !== 'test' });

const shutdown = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, 'Shutting down');
  await app.close();
  await db.$disconnect();
  process.exit(0);
};

process.once('SIGINT', (signal) => void shutdown(signal));
process.once('SIGTERM', (signal) => void shutdown(signal));

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  await db.$disconnect();
  process.exit(1);
}
