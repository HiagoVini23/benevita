import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError, commonErrors } from './app-error.ts';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function sendError(reply: FastifyReply, error: AppError, details?: unknown): FastifyReply {
  const body: ErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      ...(details === undefined ? {} : { details }),
    },
  };
  return reply.status(error.statusCode).send(body);
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof AppError) {
    return sendError(reply, error);
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    return sendError(reply, commonErrors.validation(), error.validation);
  }

  // Framework-level client errors keep their status but get a stable code and a pt-BR message;
  // the original (English, internal) details only go to the log.
  if (error.statusCode !== undefined && error.statusCode < 500) {
    request.log.info({ err: error }, 'Request rejected by the framework');
    return sendError(reply, commonErrors.badRequest(error.statusCode));
  }

  request.log.error({ err: error }, 'Unhandled error');
  return sendError(reply, commonErrors.internal());
}

export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): FastifyReply {
  return sendError(reply, commonErrors.routeNotFound(request.method, request.url));
}
