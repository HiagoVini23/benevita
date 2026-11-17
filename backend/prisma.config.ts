import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer loads .env automatically; the single .env lives at the repo root.
const rootEnvFile = '../.env';
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // `prisma generate` runs on postinstall and needs no connection, so a fresh clone without
  // .env must still install. Commands that touch the database fail fast without DATABASE_URL.
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
