import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';

/** Returns the offending field, so the form can mark it until the user edits it. */
export function reportRegistrationError<Field extends string>(
  error: Error,
  fieldByCode: Partial<Record<string, Field>>,
): Field | null {
  toast.error(error.message);
  return error instanceof ApiError ? (fieldByCode[error.code] ?? null) : null;
}
