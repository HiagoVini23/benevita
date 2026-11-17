import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError } from './app-error.ts';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    } satisfies ErrorResponse);
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
      },
    } satisfies ErrorResponse);
  }

  if (error.statusCode !== undefined && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    } satisfies ErrorResponse);
  }

  request.log.error({ err: error }, 'Unhandled error');
  return reply.status(500).send({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
  } satisfies ErrorResponse);
}
