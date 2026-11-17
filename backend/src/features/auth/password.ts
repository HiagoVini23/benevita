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

/**
 * Hash compared when the e-mail does not exist, so an unknown e-mail costs the same bcrypt work
 * as a wrong password and response time does not reveal which accounts exist.
 */
export function unknownUserPasswordHash(): Promise<string> {
  unknownUserHash ??= hashPassword(randomUUID());
  return unknownUserHash;
}
