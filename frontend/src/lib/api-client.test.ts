import { describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '@/test/render';
import { apiRequest, ApiError, setUnauthorizedHandler, tokenStorage } from './api-client.ts';

describe('apiRequest', () => {
  it('sends the stored token and parses JSON', async () => {
    tokenStorage.set('jwt');
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse({ ok: true })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiRequest('/things', { query: { date: '2026-11-20', empty: '' } }),
    ).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/things?date=2026-11-20',
      expect.objectContaining({ headers: { authorization: 'Bearer jwt' } }),
    );
  });

  it('resolves 204 No Content to undefined', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
    );

    await expect(apiRequest('/things/1/cancel', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('turns the standard error body into an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({ error: { code: 'SLOT_TAKEN', message: 'Horário ocupado.' } }, 409),
        ),
      ),
    );

    await expect(apiRequest('/appointments', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 409,
      code: 'SLOT_TAKEN',
      message: 'Horário ocupado.',
    });
  });

  it('reports network failures as NETWORK_ERROR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    const error: unknown = await apiRequest('/things').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('calls the unauthorized handler when an authenticated request gets 401', async () => {
    tokenStorage.set('expired');
    const onUnauthorized = vi.fn();
    const unregister = setUnauthorizedHandler(onUnauthorized);
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão expirada.' } }, 401),
        ),
      ),
    );

    await expect(apiRequest('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
    unregister();
  });
});
