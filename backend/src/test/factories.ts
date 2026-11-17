import { hashPassword } from '../features/auth/password.ts';
import type { AuthUser } from '../shared/auth/auth-user.ts';
import type { Database } from '../shared/database/prisma.ts';

export const TEST_PASSWORD = 'senha-de-teste';

let passwordHash: Promise<string> | undefined;
function testPasswordHash(): Promise<string> {
  passwordHash ??= hashPassword(TEST_PASSWORD);
  return passwordHash;
}

export async function createStaff(
  db: Database,
  overrides: { name?: string; email?: string } = {},
): Promise<AuthUser> {
  const user = await db.user.create({
    data: {
      name: overrides.name ?? 'Equipe Teste',
      email: overrides.email ?? `staff-${crypto.randomUUID()}@test.dev`,
      passwordHash: await testPasswordHash(),
      role: 'STAFF',
    },
  });
  return { id: user.id, name: user.name, role: 'STAFF', patientId: null };
}

export async function createPatient(
  db: Database,
  overrides: { name?: string; email?: string } = {},
): Promise<AuthUser & { patientId: string }> {
  const name = overrides.name ?? 'Paciente Teste';
  const user = await db.user.create({
    data: {
      name,
      email: overrides.email ?? `patient-${crypto.randomUUID()}@test.dev`,
      passwordHash: await testPasswordHash(),
      role: 'PATIENT',
      patient: { create: { name, birthDate: new Date('1990-05-10') } },
    },
    include: { patient: true },
  });
  if (user.patient === null) throw new Error('Patient was not created');
  return { id: user.id, name: user.name, role: 'PATIENT', patientId: user.patient.id };
}

export function createExamType(db: Database, name = 'Raio-X') {
  return db.examType.create({ data: { name } });
}

export function createProfessional(db: Database, overrides: { name?: string; crm?: string } = {}) {
  return db.professional.create({
    data: {
      name: overrides.name ?? 'Dra. Teste',
      crm: overrides.crm ?? `CRM-SP ${String(Math.floor(Math.random() * 1_000_000))}`,
      specialty: 'Radiologia',
    },
  });
}
