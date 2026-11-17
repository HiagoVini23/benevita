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

/**
 * Display names of the domain resources, used in user-facing messages. A const object (not a TS
 * enum, which `erasableSyntaxOnly` forbids) gives the same single source and type safety.
 */
export type Resource = 'appointment' | 'patient' | 'examType' | 'report';

const RESOURCES: Record<Resource, { label: string; gender: 'm' | 'f' }> = {
  appointment: { label: 'Agendamento', gender: 'm' },
  patient: { label: 'Paciente', gender: 'm' },
  examType: { label: 'Tipo de exame', gender: 'm' },
  report: { label: 'Laudo', gender: 'm' },
};

export const commonErrors = {
  validation: () => new AppError(400, 'VALIDATION_ERROR', 'Dados da requisição inválidos.'),
  /** Malformed requests rejected by the framework itself (invalid JSON, body too large...). */
  badRequest: (statusCode = 400) => new AppError(statusCode, 'BAD_REQUEST', 'Requisição inválida.'),
  unauthenticated: () =>
    new AppError(401, 'UNAUTHENTICATED', 'Sessão inválida ou expirada. Faça login novamente.'),
  forbidden: () =>
    new AppError(403, 'FORBIDDEN', 'Você não tem permissão para acessar este recurso.'),
  /** `notFound('appointment')` → "Agendamento não encontrado." */
  notFound: (resource: Resource) => {
    const { label, gender } = RESOURCES[resource];
    const found = gender === 'm' ? 'encontrado' : 'encontrada';
    return new AppError(404, 'NOT_FOUND', `${label} não ${found}.`);
  },
  routeNotFound: (method: string, url: string) =>
    new AppError(404, 'NOT_FOUND', `Rota ${method} ${url} não encontrada.`),
  internal: () => new AppError(500, 'INTERNAL_SERVER_ERROR', 'Erro interno do servidor.'),
};
