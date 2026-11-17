/**
 * Expected, client-facing error. Anything that is not an AppError is treated as unexpected and
 * returned as a generic 500 without internal details. Messages are in pt-BR because the UI shows
 * them to the user; clients should branch on `code`, never on `message`.
 *
 * Create errors through factories (`commonErrors` here, `<feature>Errors` in each feature) so
 * status, code and message for a given situation are defined in exactly one place.
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

export const commonErrors = {
  validation: () => new AppError(400, 'VALIDATION_ERROR', 'Dados da requisição inválidos.'),
  /** Malformed requests rejected by the framework itself (invalid JSON, body too large...). */
  badRequest: (statusCode = 400) => new AppError(statusCode, 'BAD_REQUEST', 'Requisição inválida.'),
  unauthenticated: () =>
    new AppError(401, 'UNAUTHENTICATED', 'Sessão inválida ou expirada. Faça login novamente.'),
  forbidden: () =>
    new AppError(403, 'FORBIDDEN', 'Você não tem permissão para acessar este recurso.'),
  notFound: (message = 'Recurso não encontrado.') => new AppError(404, 'NOT_FOUND', message),
  internal: () => new AppError(500, 'INTERNAL_SERVER_ERROR', 'Erro interno do servidor.'),
};
