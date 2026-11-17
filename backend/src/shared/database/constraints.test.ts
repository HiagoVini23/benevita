import { describe, expect, it } from 'vitest';
import {
  createExamType,
  createPatient,
  createProfessional,
  createStaff,
} from '../../test/factories.ts';
import { setupTestApp } from '../../test/test-app.ts';
import { isUniqueConstraintViolation } from './prisma.ts';

const SLOT = new Date('2026-11-20T17:00:00.000Z');

/** Guards the business rules that the migration enforces at database level. */
describe('database constraints', () => {
  const { db } = setupTestApp();

  async function seedBase() {
    const patient = await createPatient(db);
    const examType = await createExamType(db);
    return { patientId: patient.patientId, examTypeId: examType.id };
  }

  it('rejects two active appointments in the same slot, even when concurrent (R2)', async () => {
    const base = await seedBase();

    const results = await Promise.allSettled([
      db.appointment.create({ data: { ...base, scheduledAt: SLOT } }),
      db.appointment.create({ data: { ...base, scheduledAt: SLOT } }),
    ]);

    const rejected = results.filter((result) => result.status === 'rejected');
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(isUniqueConstraintViolation(rejected[0]?.reason, 'appointments_active_slot_key')).toBe(
      true,
    );
    expect(isUniqueConstraintViolation(rejected[0]?.reason, 'reports_appointment_id_key')).toBe(
      false,
    );
  });

  it('allows reusing the slot of a canceled appointment (R3)', async () => {
    const base = await seedBase();
    await db.appointment.create({
      data: { ...base, scheduledAt: SLOT, status: 'CANCELED', canceledAt: new Date() },
    });

    await expect(
      db.appointment.create({ data: { ...base, scheduledAt: SLOT } }),
    ).resolves.toMatchObject({ status: 'SCHEDULED' });
  });

  it.each([
    ['15 minutes past the hour', '2026-11-20T17:15:00.000Z'],
    ['with seconds', '2026-11-20T17:00:30.000Z'],
    ['with milliseconds', '2026-11-20T17:30:00.001Z'],
  ])('rejects a slot not aligned to 30 minutes (%s)', async (_case, instant) => {
    const base = await seedBase();

    await expect(
      db.appointment.create({ data: { ...base, scheduledAt: new Date(instant) } }),
    ).rejects.toThrow();
  });

  it('requires canceled_at exactly when the appointment is canceled', async () => {
    const base = await seedBase();

    await expect(
      db.appointment.create({ data: { ...base, scheduledAt: SLOT, status: 'CANCELED' } }),
    ).rejects.toThrow();
  });

  describe('reports', () => {
    async function seedDraftReport() {
      const base = await seedBase();
      const staff = await createStaff(db);
      const professional = await createProfessional(db);
      const appointment = await db.appointment.create({ data: { ...base, scheduledAt: SLOT } });
      const report = {
        appointmentId: appointment.id,
        professionalId: professional.id,
        createdById: staff.id,
        title: 'Laudo',
        body: 'Texto do laudo',
      };
      return { report, staffId: staff.id };
    }

    it('allows only one report per appointment (L1)', async () => {
      const { report } = await seedDraftReport();
      await db.report.create({ data: report });

      const duplicate = db.report.create({ data: report });

      await expect(duplicate).rejects.toSatisfy(isUniqueConstraintViolation);
    });

    it('requires publication date and publisher exactly when published (L7)', async () => {
      const { report, staffId } = await seedDraftReport();

      await expect(
        db.report.create({ data: { ...report, status: 'PUBLISHED' } }),
      ).rejects.toThrow();
      await expect(
        db.report.create({
          data: { ...report, status: 'DRAFT', publishedAt: new Date(), publishedById: staffId },
        }),
      ).rejects.toThrow();
      await expect(
        db.report.create({
          data: { ...report, status: 'PUBLISHED', publishedAt: new Date(), publishedById: staffId },
        }),
      ).resolves.toMatchObject({ status: 'PUBLISHED' });
    });
  });
});
