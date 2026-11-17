import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import { authQueryKeys, type AuthUser } from '@/features/auth/auth.api';
import { AppToaster } from '@/components/AppToaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { tokenStorage } from '@/lib/api-client';

export const staffUser: AuthUser = {
  id: '00000000-0000-7000-8000-000000000001',
  name: 'Equipe Teste',
  role: 'STAFF',
  patientId: null,
};

export const patientUser: AuthUser = {
  id: '00000000-0000-7000-8000-000000000002',
  name: 'Ana Souza',
  role: 'PATIENT',
  patientId: '00000000-0000-7000-8000-000000000003',
};

interface RenderOptions {
  /** Initial URL. */
  route?: string;
  /** Route pattern the UI is mounted on, so `useParams` works (e.g. `/staff/appointments/:id`). */
  path?: string;
  /** Renders as an already authenticated user (no /auth/me request). */
  user?: AuthUser;
  /** Extra routes, e.g. redirect targets to assert navigation. */
  extraRoutes?: ReactNode;
}

/**
 * Renders UI with the same providers as the app: React Query, theme, auth and a data router
 * (needed by `useBlocker`).
 */
export function renderWithProviders(
  ui: ReactNode,
  { route = '/', path = '*', user, extraRoutes }: RenderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const queryClient = new QueryClient({
    // No retries by default; queries that opt into retrying (e.g. the session check) retry instantly.
    defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } },
  });

  if (user !== undefined) {
    tokenStorage.set('test-token');
    queryClient.setQueryData(authQueryKeys.me, user);
  }

  const router = createMemoryRouter(
    createRoutesFromElements(
      <>
        <Route path={path} element={ui} />
        {extraRoutes}
      </>,
    ),
    { initialEntries: [route] },
  );

  const result = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
        <AppToaster />
      </ThemeProvider>
    </QueryClientProvider>,
  );

  return { ...result, queryClient };
}

/** Minimal JSON Response for `fetch` mocks. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type RouteHandler = (request: { url: URL; body: unknown }) => Response;

/**
 * Stubs `fetch` with a tiny router keyed by `"METHOD /path"` (query string ignored). Unknown routes
 * answer 404 so a missing mock shows up as a visible error instead of a hanging request.
 */
export function mockApi(routes: Record<string, RouteHandler>) {
  const fetchMock = vi.fn((input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    const handler = routes[key];
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    return Promise.resolve(
      handler === undefined
        ? jsonResponse({ error: { code: 'NOT_FOUND', message: `No mock for ${key}` } }, 404)
        : handler({ url, body }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
