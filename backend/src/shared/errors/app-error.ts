/**
 * Expected, client-facing error; anything else becomes a generic 500. Messages are pt-BR for the
 * UI; clients branch on `code`. Create them only through factories, so each is defined once.
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

/** A const map, since `erasableSyntaxOnly` forbids TS enums. */
export type Resource = 'appointment' | 'patient' | 'examType' | 'professional';

const RESOURCE_LABELS: Record<Resource, string> = {
  appointment: 'Agendamento',
  patient: 'Paciente',
  examType: 'Tipo de exame',
  professional: 'Profissional',
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
  notFound: (resource: Resource) =>
    new AppError(404, 'NOT_FOUND', `${RESOURCE_LABELS[resource]} não encontrado.`),
  /** Also answers another patient's report and drafts in the portal, never revealing existence. */
  reportNotFound: () => new AppError(404, 'REPORT_NOT_FOUND', 'Laudo não encontrado.'),
  routeNotFound: (method: string, url: string) =>
    new AppError(404, 'NOT_FOUND', `Rota ${method} ${url} não encontrada.`),
  internal: () => new AppError(500, 'INTERNAL_SERVER_ERROR', 'Erro interno do servidor.'),
};
