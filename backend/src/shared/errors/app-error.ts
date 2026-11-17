/**
 * Expected, client-facing error. Anything that is not an AppError is treated
 * as unexpected and returned as a generic 500 without internal details.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
