import { describe, expect, it } from 'vitest';
import { setupTestApp } from '../../test/test-app.ts';
import { createPatient, createStaff, TEST_PASSWORD } from '../../test/factories.ts';

describe('auth routes', () => {
  const { app, db, authHeader } = setupTestApp();

  describe('POST /api/auth/login', () => {
    it('returns a token and the user for valid credentials (e-mail is case-insensitive)', async () => {
      const patient = await createPatient(db, { email: 'ana@test.dev' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'ANA@test.dev', password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{ token: string; user: unknown }>();
      expect(body.token).toEqual(expect.any(String));
      expect(body.user).toEqual(patient);
    });

    it.each([
      ['wrong password', 'ana@test.dev', 'senha-errada'],
      ['unknown e-mail', 'ninguem@test.dev', TEST_PASSWORD],
    ])('rejects %s with the same generic error', async (_case, email, password) => {
      await createPatient(db, { email: 'ana@test.dev' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email, password },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } });
    });

    it('rejects an invalid payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'not-an-email' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the authenticated user', async () => {
      const staff = await createStaff(db);

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: authHeader(staff),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(staff);
    });

    it.each([
      ['no token', undefined],
      ['an invalid token', 'Bearer not-a-jwt'],
    ])('rejects requests with %s', async (_case, authorization) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: authorization === undefined ? {} : { authorization },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
    });
  });
});
