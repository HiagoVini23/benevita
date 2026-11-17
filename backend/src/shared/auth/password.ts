import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let unknownUserHash: Promise<string> | undefined;

/** Compared for unknown e-mails, so response time does not reveal which accounts exist. */
export function unknownUserPasswordHash(): Promise<string> {
  unknownUserHash ??= hashPassword(randomUUID());
  return unknownUserHash;
}
