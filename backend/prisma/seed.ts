/**
 * Demo data. Reference data and users are upserted (idempotent); appointments and reports are
 * recreated on every run, relative to today, so the demo always has: exams today (the staff
 * screen opens on today), a past exam without report (to write and publish one), a published
 * report, a draft, upcoming exams and a cancellation.
 */
import { isBusinessDay } from '../src/features/appointments/appointments.rules.ts';
import { hashPassword } from '../src/shared/auth/password.ts';
import type { Role } from '../src/generated/prisma/enums.ts';
import { loadEnv } from '../src/shared/config/env.ts';
import { createDatabase } from '../src/shared/database/prisma.ts';
import {
  addDays,
  clinicDateTimeToUtc,
  toClinicParts,
  type CalendarDate,
} from '../src/shared/time/clinic-time.ts';

const STAFF_PASSWORD = 'equipe123';
const PATIENT_PASSWORD = 'paciente123';

const db = createDatabase(loadEnv().DATABASE_URL);

function businessDay(from: CalendarDate, offset: number): CalendarDate {
  const step = offset >= 0 ? 1 : -1;
  let date = from;
  let remaining = Math.abs(offset);
  while (remaining > 0) {
    date = addDays(date, step);
    if (isBusinessDay(date)) remaining -= 1;
  }
  return date;
}

async function upsertUser(email: string, name: string, role: Role, password: string) {
  return db.user.upsert({
    where: { email },
    update: { name, role, passwordHash: await hashPassword(password) },
    create: { email, name, role, passwordHash: await hashPassword(password) },
  });
}

async function upsertPatient(email: string, name: string, birthDate: string) {
  const user = await upsertUser(email, name, 'PATIENT', PATIENT_PASSWORD);
  return db.patient.upsert({
    where: { userId: user.id },
    update: { name, birthDate: new Date(birthDate) },
    create: { userId: user.id, name, birthDate: new Date(birthDate) },
  });
}

async function main() {
  const staff = await upsertUser('equipe@benevita.dev', 'Equipe Benevita', 'STAFF', STAFF_PASSWORD);
  const ana = await upsertPatient('ana@benevita.dev', 'Ana Souza', '1988-03-14');
  const bruno = await upsertPatient('bruno@benevita.dev', 'Bruno Lima', '1975-09-02');
  const carla = await upsertPatient('carla@benevita.dev', 'Carla Mendes', '1996-12-21');

  const examNames = ['Raio-X', 'Ultrassom', 'Ressonância Magnética', 'Tomografia'] as const;
  const [xRay, ultrasound, mri, ct] = await Promise.all(
    examNames.map((name) => db.examType.upsert({ where: { name }, update: {}, create: { name } })),
  );

  const professionalsData = [
    { crm: 'CRM-SP 123456', name: 'Dra. Helena Marques', specialty: 'Radiologia' },
    { crm: 'CRM-SP 234567', name: 'Dr. Rafael Costa', specialty: 'Radiologia' },
    { crm: 'CRM-SP 345678', name: 'Dra. Beatriz Nogueira', specialty: 'Ultrassonografia' },
  ];
  const [helena, rafael] = await Promise.all(
    professionalsData.map(({ crm, ...data }) =>
      db.professional.upsert({ where: { crm }, update: data, create: { crm, ...data } }),
    ),
  );

  if (!xRay || !ultrasound || !mri || !ct || !helena || !rafael) {
    throw new Error('Reference data was not created');
  }

  await db.report.deleteMany();
  await db.appointment.deleteMany();

  const today = toClinicParts(new Date()).date;
  const at = (offset: number, time: string) =>
    clinicDateTimeToUtc(businessDay(today, offset), time);

  const anaPast = await db.appointment.create({
    data: { patientId: ana.id, examTypeId: xRay.id, scheduledAt: at(-2, '09:00') },
  });
  await db.report.create({
    data: {
      appointmentId: anaPast.id,
      professionalId: helena.id,
      title: 'Raio-X de tórax PA e perfil',
      body: 'Campos pulmonares livres. Seios costofrênicos livres. Área cardíaca dentro dos limites da normalidade.\n\nImpressão: exame sem alterações.',
      status: 'PUBLISHED',
      publishedAt: at(-1, '10:00'),
      createdById: staff.id,
      publishedById: staff.id,
    },
  });

  const brunoPast = await db.appointment.create({
    data: { patientId: bruno.id, examTypeId: mri.id, scheduledAt: at(-1, '14:30') },
  });
  await db.report.create({
    data: {
      appointmentId: brunoPast.id,
      professionalId: rafael.id,
      title: 'Ressonância magnética do joelho direito',
      body: 'Rascunho em elaboração.',
      createdById: staff.id,
    },
  });

  // Exams today only on business days: the clinic does not work on weekends.
  const todayExams = isBusinessDay(today)
    ? [
        { patientId: ana.id, examTypeId: mri.id, scheduledAt: clinicDateTimeToUtc(today, '08:30') },
        {
          patientId: bruno.id,
          examTypeId: xRay.id,
          scheduledAt: clinicDateTimeToUtc(today, '11:00'),
        },
        {
          patientId: carla.id,
          examTypeId: ultrasound.id,
          scheduledAt: clinicDateTimeToUtc(today, '16:00'),
        },
      ]
    : [];

  await db.appointment.createMany({
    data: [
      ...todayExams,
      // Past exam without a report yet: the demo case for writing and publishing one.
      { patientId: carla.id, examTypeId: ultrasound.id, scheduledAt: at(-1, '09:00') },
      { patientId: ana.id, examTypeId: ultrasound.id, scheduledAt: at(1, '10:00') },
      { patientId: carla.id, examTypeId: xRay.id, scheduledAt: at(1, '14:00') },
      { patientId: carla.id, examTypeId: ct.id, scheduledAt: at(2, '08:30') },
      {
        patientId: bruno.id,
        examTypeId: ct.id,
        scheduledAt: at(2, '11:00'),
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    ],
  });

  console.warn(
    'Seed concluído: 1 usuário da equipe, 3 pacientes, 4 tipos de exame, 3 profissionais.',
  );
}

try {
  await main();
} finally {
  await db.$disconnect();
}
