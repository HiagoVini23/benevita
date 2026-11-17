import { buildApp } from './app.ts';
import { loadEnv } from './shared/config/env.ts';

const env = loadEnv();
const app = buildApp({ logger: env.NODE_ENV !== 'test' });

const shutdown = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, 'Shutting down');
  await app.close();
  process.exit(0);
};

process.once('SIGINT', (signal) => void shutdown(signal));
process.once('SIGTERM', (signal) => void shutdown(signal));

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
