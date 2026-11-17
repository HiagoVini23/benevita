import { describe, expect, it } from 'vitest';
import { setupTestApp } from '../../test/test-app.ts';

describe('GET /api/health', () => {
  const { app } = setupTestApp();

  it('reports the API as healthy', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('returns a consistent error body for unknown routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/does-not-exist' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});
