import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client.ts';

const MAX_RETRIES = 2;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 4xx answers (validation, permission, not found) will not change by retrying.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
          failureCount < MAX_RETRIES,
        refetchOnWindowFocus: false,
      },
    },
  });
}
