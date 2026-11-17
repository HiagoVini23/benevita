import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client.ts';

export type Database = PrismaClient;
/** Client handed to `db.$transaction(async (tx) => ...)` callbacks. */
export type Transaction = Prisma.TransactionClient;

export function createDatabase(databaseUrl: string): Database {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

function readPath(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof current !== 'object' || current === null || !(key in current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * True for a unique constraint violation (P2002). With `constraint`, only when that specific
 * index/constraint was violated — the pg driver adapter reports its name in the error metadata.
 */
export function isUniqueConstraintViolation(error: unknown, constraint?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  if (constraint === undefined) return true;
  return (
    readPath(error.meta, ['driverAdapterError', 'cause', 'constraint', 'index']) === constraint
  );
}
