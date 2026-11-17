import { hashPassword } from '../shared/auth/password.ts';
import type { AuthUser } from '../shared/auth/auth-user.ts';
import type { Database } from '../shared/database/prisma.ts';
import { DEFAULT_TEST_NOW } from './test-app.ts';

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

/** Tuesday 2026-11-17 10:00 in São Paulo: a future business slot relative to DEFAULT_TEST_NOW. */
export const FUTURE_SLOT = new Date('2026-11-17T13:00:00.000Z');

export function createAppointment(
  db: Database,
  data: {
    patientId: string;
    examTypeId: string;
    scheduledAt?: Date;
    status?: 'SCHEDULED' | 'CANCELED';
  },
) {
  const { status = 'SCHEDULED', scheduledAt = FUTURE_SLOT, ...ids } = data;
  return db.appointment.create({
    data: {
      ...ids,
      scheduledAt,
      status,
      canceledAt: status === 'CANCELED' ? DEFAULT_TEST_NOW : null,
    },
  });
}

export function createReport(
  db: Database,
  data: {
    appointmentId: string;
    professionalId: string;
    createdById: string;
    status?: 'DRAFT' | 'PUBLISHED';
    title?: string;
    body?: string;
  },
) {
  const { status = 'DRAFT', title = 'Laudo de teste', body = 'Texto do laudo.', ...ids } = data;
  const published = status === 'PUBLISHED';
  return db.report.create({
    data: {
      ...ids,
      title,
      body,
      status,
      publishedAt: published ? DEFAULT_TEST_NOW : null,
      publishedById: published ? ids.createdById : null,
    },
  });
}
