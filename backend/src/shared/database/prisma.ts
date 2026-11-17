import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client.ts';

export type Database = PrismaClient;
/** Client handed to `db.$transaction(async (tx) => ...)` callbacks. */
export type Transaction = Prisma.TransactionClient;

export function createDatabase(databaseUrl: string): Database {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
