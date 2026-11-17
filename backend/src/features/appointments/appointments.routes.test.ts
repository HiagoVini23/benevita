import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../shared/auth/auth-user.ts';
import {
  createAppointment,
  createExamType,
  createPatient,
  createProfessional,
  createReport,
  createStaff,
  FUTURE_SLOT,
} from '../../test/factories.ts';
import { setupTestApp } from '../../test/test-app.ts';

describe('appointments routes', () => {
  const { app, db, clock, authHeader } = setupTestApp();

  async function seedBase() {
    const staff = await createStaff(db);
    const patient = await createPatient(db, { name: 'Ana Souza' });
    const examType = await createExamType(db, 'Raio-X');
    return { staff, patient, examType };
  }

  function post(staff: AuthUser, payload: Record<string, unknown>) {
    return app.inject({
      method: 'POST',
      url: '/api/appointments',
      headers: authHeader(staff),
      payload,
    });
  }

  describe('POST /api/appointments', () => {
    it('schedules an exam for a patient in a free future slot', async () => {
      const { staff, patient, examType } = await seedBase();

      const response = await post(staff, {
        patientId: patient.patientId,
        examTypeId: examType.id,
        scheduledAt: FUTURE_SLOT.toISOString(),
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        scheduledAt: FUTURE_SLOT.toISOString(),
        status: 'SCHEDULED',
        canceledAt: null,
        patient: { id: patient.patientId, name: 'Ana Souza' },
        examType: { id: examType.id, name: 'Raio-X' },
        report: null,
      });
    });

    it('accepts only one of two simultaneous bookings for the same slot (T1)', async () => {
      const { staff, patient, examType } = await seedBase();
      const otherPatient = await createPatient(db, { name: 'Bruno Lima' });

      const responses = await Promise.all([
        post(staff, {
          patientId: patient.patientId,
          examTypeId: examType.id,
          scheduledAt: FUTURE_SLOT.toISOString(),
        }),
        post(staff, {
          patientId: otherPatient.patientId,
          examTypeId: examType.id,
          scheduledAt: FUTURE_SLOT.toISOString(),
        }),
      ]);

      const statuses = responses.map((response) => response.statusCode).sort();
      expect(statuses).toEqual([201, 409]);
      expect(responses.find((response) => response.statusCode === 409)?.json()).toMatchObject({
        error: { code: 'SLOT_TAKEN' },
      });
      await expect(db.appointment.count({ where: { scheduledAt: FUTURE_SLOT } })).resolves.toBe(1);
    });

    it('rejects booking in the past and persists nothing (T5)', async () => {
      const { staff, patient, examType } = await seedBase();
      clock.set(new Date('2026-11-18T12:00:00.000Z'));

      const response = await post(staff, {
        patientId: patient.patientId,
        examTypeId: examType.id,
        scheduledAt: FUTURE_SLOT.toISOString(),
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: 'APPOINTMENT_IN_PAST' } });
      await expect(db.appointment.count()).resolves.toBe(0);
    });

    it('allows reusing the slot of a canceled appointment', async () => {
      const { staff, patient, examType } = await seedBase();
      await createAppointment(db, {
        patientId: patient.patientId,
        examTypeId: examType.id,
        status: 'CANCELED',
      });

      const response = await post(staff, {
        patientId: patient.patientId,
        examTypeId: examType.id,
        scheduledAt: FUTURE_SLOT.toISOString(),
      });

      expect(response.statusCode).toBe(201);
    });

    it.each([
      ['a misaligned slot', '2026-11-17T13:15:00.000Z', 'INVALID_SLOT'],
      ['a slot outside business hours', '2026-11-17T22:00:00.000Z', 'OUTSIDE_BUSINESS_HOURS'],
      ['a weekend slot', '2026-11-21T13:00:00.000Z', 'OUTSIDE_BUSINESS_HOURS'],
    ])('rejects %s', async (_case, scheduledAt, code) => {
      const { staff, patient, examType } = await seedBase();

      const response = await post(staff, {
        patientId: patient.patientId,
        examTypeId: examType.id,
        scheduledAt,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code } });
    });

    it('returns 404 for an unknown patient or exam type', async () => {
      const { staff, patient, examType } = await seedBase();
      const unknownId = '01a1e793-0000-7000-8000-000000000000';

      const [unknownPatient, unknownExam] = await Promise.all([
        post(staff, { patientId: unknownId, examTypeId: examType.id, scheduledAt: FUTURE_SLOT }),
        post(staff, {
          patientId: patient.patientId,
          examTypeId: unknownId,
          scheduledAt: FUTURE_SLOT,
        }),
      ]);

      expect(unknownPatient.statusCode).toBe(404);
      expect(unknownExam.statusCode).toBe(404);
    });
  });

  describe('GET /api/appointments', () => {
    it('lists appointments ordered by time and filters by clinic day and patient', async () => {
      const { staff, patient, examType } = await seedBase();
      const other = await createPatient(db, { name: 'Bruno Lima' });
      const tuesdayLate = new Date('2026-11-17T20:30:00.000Z'); // Tue 17:30
      const wednesday = new Date('2026-11-18T13:00:00.000Z'); // Wed 10:00
      await createAppointment(db, {
        patientId: other.patientId,
        examTypeId: examType.id,
        scheduledAt: tuesdayLate,
      });
      await createAppointment(db, { patientId: patient.patientId, examTypeId: examType.id });
      await createAppointment(db, {
        patientId: patient.patientId,
        examTypeId: examType.id,
        scheduledAt: wednesday,
      });

      const list = async (query: string) =>
        (
          await app.inject({
            method: 'GET',
            url: `/api/appointments${query}`,
            headers: authHeader(staff),
          })
        ).json<{ scheduledAt: string; patient: { name: string } }[]>();

      expect((await list('')).map((item) => item.scheduledAt)).toEqual([
        FUTURE_SLOT.toISOString(),
        tuesdayLate.toISOString(),
        wednesday.toISOString(),
      ]);
      expect((await list('?date=2026-11-17')).map((item) => item.scheduledAt)).toEqual([
        FUTURE_SLOT.toISOString(),
        tuesdayLate.toISOString(),
      ]);
      expect(
        (await list(`?date=2026-11-17&patientId=${patient.patientId}`)).map(
          (item) => item.patient.name,
        ),
      ).toEqual(['Ana Souza']);
    });

    it('rejects an invalid date filter', async () => {
      const { staff } = await seedBase();

      const response = await app.inject({
        method: 'GET',
        url: '/api/appointments?date=2026-02-30',
        headers: authHeader(staff),
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/appointments/available-slots', () => {
    it('returns future business slots that no active appointment occupies', async () => {
      const { staff, patient, examType } = await seedBase();
      // Now is Monday 09:00; 09:00 itself is no longer bookable.
      const mondayTen = new Date('2026-11-16T13:00:00.000Z');
      const mondayTenThirty = new Date('2026-11-16T13:30:00.000Z');
      await createAppointment(db, {
        patientId: patient.patientId,
        examTypeId: examType.id,
        scheduledAt: mondayTen,
      });
      await createAppointment(db, {
        patientId: patient.patientId,
        examTypeId: examType.id,
        scheduledAt: mondayTenThirty,
        status: 'CANCELED',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/appointments/available-slots?date=2026-11-16',
        headers: authHeader(staff),
      });

      const { slots } = response.json<{ slots: string[] }>();
      expect(slots[0]).toBe('2026-11-16T12:30:00.000Z'); // 09:30
      expect(slots).not.toContain(mondayTen.toISOString());
      expect(slots).toContain(mondayTenThirty.toISOString());
      expect(slots.at(-1)).toBe('2026-11-16T20:30:00.000Z'); // 17:30
    });
  });

  describe('POST /api/appointments/:id/cancel', () => {
    async function seedAppointment() {
      const base = await seedBase();
      const appointment = await createAppointment(db, {
        patientId: base.patient.patientId,
        examTypeId: base.examType.id,
      });
      return { ...base, appointment };
    }

    function cancel(staff: AuthUser, id: string) {
      return app.inject({
        method: 'POST',
        url: `/api/appointments/${id}/cancel`,
        headers: authHeader(staff),
      });
    }

    it('cancels a scheduled appointment and records when', async () => {
      const { staff, appointment } = await seedAppointment();

      const response = await cancel(staff, appointment.id);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'CANCELED',
        canceledAt: clock.now().toISOString(),
      });
    });

    it('rejects canceling twice', async () => {
      const { staff, appointment } = await seedAppointment();
      await cancel(staff, appointment.id);

      const response = await cancel(staff, appointment.id);

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ error: { code: 'APPOINTMENT_ALREADY_CANCELED' } });
    });

    it('rejects canceling an appointment whose report is published (L6)', async () => {
      const { staff, appointment } = await seedAppointment();
      const professional = await createProfessional(db);
      await createReport(db, {
        appointmentId: appointment.id,
        professionalId: professional.id,
        createdById: staff.id,
        status: 'PUBLISHED',
      });

      const response = await cancel(staff, appointment.id);

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ error: { code: 'REPORT_ALREADY_PUBLISHED' } });
    });

    it('allows canceling an appointment with a draft report', async () => {
      const { staff, appointment } = await seedAppointment();
      const professional = await createProfessional(db);
      await createReport(db, {
        appointmentId: appointment.id,
        professionalId: professional.id,
        createdById: staff.id,
      });

      const response = await cancel(staff, appointment.id);

      expect(response.statusCode).toBe(200);
    });

    it('returns 404 for an unknown appointment', async () => {
      const { staff } = await seedBase();

      const response = await cancel(staff, '01a1e793-0000-7000-8000-000000000000');

      expect(response.statusCode).toBe(404);
    });
  });

  it('forbids patients from every staff appointment route', async () => {
    const { patient, examType } = await seedBase();
    const appointment = await createAppointment(db, {
      patientId: patient.patientId,
      examTypeId: examType.id,
    });

    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/api/appointments', headers: authHeader(patient) }),
      app.inject({
        method: 'GET',
        url: `/api/appointments/${appointment.id}`,
        headers: authHeader(patient),
      }),
      app.inject({
        method: 'POST',
        url: `/api/appointments/${appointment.id}/cancel`,
        headers: authHeader(patient),
      }),
      post(patient, {
        patientId: patient.patientId,
        examTypeId: examType.id,
        scheduledAt: FUTURE_SLOT.toISOString(),
      }),
    ]);

    expect(responses.map((response) => response.statusCode)).toEqual([403, 403, 403, 403]);
    await expect(
      db.appointment.findUnique({ where: { id: appointment.id } }),
    ).resolves.toMatchObject({ status: 'SCHEDULED' });
  });
});
