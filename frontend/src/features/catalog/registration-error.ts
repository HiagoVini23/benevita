import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';

/**
 * Shows a failed registration as an error toast (same place as the success toasts) and returns
 * which field caused it, so the form can mark it until the user edits it.
 */
export function reportRegistrationError<Field extends string>(
  error: Error,
  fieldByCode: Partial<Record<string, Field>>,
): Field | null {
  toast.error(error.message);
  return error instanceof ApiError ? (fieldByCode[error.code] ?? null) : null;
}
