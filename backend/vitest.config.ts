import { defineConfig } from 'vitest/config';
import { testEnv } from './src/test/test-env.ts';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['./src/test/global-setup.ts'],
    env: testEnv,
    // Integration tests share one database and reset it between tests, so files run serially.
    fileParallelism: false,
  },
});
