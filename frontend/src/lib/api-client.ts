const API_BASE_PATH = '/api';
const TOKEN_STORAGE_KEY = 'benevita.token';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Token persisted in localStorage (documented trade-off: simple, but readable by XSS). */
export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_STORAGE_KEY),
  set: (token: string): void => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

let unauthorizedHandler: (() => void) | undefined;

/** Registers what happens when an authenticated request is rejected with 401 (e.g. expired token). */
export function setUnauthorizedHandler(handler: () => void): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = undefined;
  };
}

type QueryParams = Record<string, string | undefined>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: QueryParams;
}

function buildUrl(path: string, query: QueryParams = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const search = params.toString();
  return `${API_BASE_PATH}${path}${search ? `?${search}` : ''}`;
}

interface ErrorBody {
  error: { code: string; message: string };
}

function isErrorBody(value: unknown): value is ErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  if (isErrorBody(body)) {
    return new ApiError(response.status, body.error.code, body.error.message);
  }
  return new ApiError(response.status, 'UNEXPECTED_ERROR', 'Ocorreu um erro inesperado.');
}

/**
 * Single entry point for HTTP calls. `T` mirrors the backend contract; the backend validates
 * every response against its schema, so the payload is trusted to match.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = options;
  const token = tokenStorage.get();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token !== null) headers.authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível conectar ao servidor.');
  }

  if (!response.ok) {
    if (response.status === 401 && token !== null) unauthorizedHandler?.();
    throw await toApiError(response);
  }

  // 204 No Content (and any empty body) resolves to undefined instead of failing to parse.
  const text = await response.text();
  const data: unknown = text === '' ? undefined : JSON.parse(text);
  return data as T;
}
