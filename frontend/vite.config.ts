import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // The single .env lives at the repo root, shared with the backend.
  const env = loadEnv(mode, '..', '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': env.API_URL ?? 'http://localhost:3333',
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
