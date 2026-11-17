import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../shared/auth/auth-user.ts';
import {
  createAppointment,
  createExamType,
  createPatient,
  createProfessional,
  createReport,
  createStaff,
} from '../../test/factories.ts';
import { setupTestApp } from '../../test/test-app.ts';

describe('reports routes (staff)', () => {
  const { app, db, clock, authHeader } = setupTestApp();

  async function seed(options: { appointmentStatus?: 'SCHEDULED' | 'CANCELED' } = {}) {
    const staff = await createStaff(db, { name: 'Equipe Benevita' });
    const patient = await createPatient(db);
    const examType = await createExamType(db);
    const professional = await createProfessional(db, { name: 'Dra. Helena Marques' });
    const appointment = await createAppointment(db, {
      patientId: patient.patientId,
      examTypeId: examType.id,
      ...(options.appointmentStatus === undefined ? {} : { status: options.appointmentStatus }),
    });
    const draft = {
      title: 'Raio-X de tórax',
      body: 'Campos pulmonares livres.',
      professionalId: professional.id,
    };
    return { staff, patient, professional, appointment, draft };
  }

  function saveDraft(user: AuthUser, appointmentId: string, payload: Record<string, unknown>) {
    return app.inject({
      method: 'PUT',
      url: `/api/appointments/${appointmentId}/report`,
      headers: authHeader(user),
      payload,
    });
  }

  function publish(user: AuthUser, appointmentId: string) {
    return app.inject({
      method: 'POST',
      url: `/api/appointments/${appointmentId}/report/publish`,
      headers: authHeader(user),
    });
  }

  describe('PUT /api/appointments/:id/report', () => {
    it('creates a draft with the responsible professional', async () => {
      const { staff, appointment, draft } = await seed();

      const response = await saveDraft(staff, appointment.id, draft);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        appointmentId: appointment.id,
        title: 'Raio-X de tórax',
        body: 'Campos pulmonares livres.',
        status: 'DRAFT',
        professional: { name: 'Dra. Helena Marques' },
        publishedAt: null,
        publishedBy: null,
      });
      await expect(
        db.report.findUniqueOrThrow({ where: { appointmentId: appointment.id } }),
      ).resolves.toMatchObject({ createdById: staff.id });
    });

    it('updates the same draft instead of creating a second report (L1, L2)', async () => {
      const { staff, appointment, draft } = await seed();
      await saveDraft(staff, appointment.id, draft);

      const response = await saveDraft(staff, appointment.id, {
        ...draft,
        body: 'Texto revisado.',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ body: 'Texto revisado.', status: 'DRAFT' });
      await expect(db.report.count({ where: { appointmentId: appointment.id } })).resolves.toBe(1);
    });

    it('keeps a single report when two drafts are saved at the same time (L1)', async () => {
      const { staff, appointment, draft } = await seed();

      const responses = await Promise.all([
        saveDraft(staff, appointment.id, { ...draft, title: 'Primeiro' }),
        saveDraft(staff, appointment.id, { ...draft, title: 'Segundo' }),
      ]);

      expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
      await expect(db.report.count({ where: { appointmentId: appointment.id } })).resolves.toBe(1);
    });

    it('rejects a report for a canceled appointment (L5)', async () => {
      const { staff, appointment, draft } = await seed({ appointmentStatus: 'CANCELED' });

      const response = await saveDraft(staff, appointment.id, draft);

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ error: { code: 'APPOINTMENT_CANCELED' } });
      await expect(db.report.count()).resolves.toBe(0);
    });

    it('rejects editing a published report (L4)', async () => {
      const { staff, appointment, professional, draft } = await seed();
      await createReport(db, {
        appointmentId: appointment.id,
        professionalId: professional.id,
        createdById: staff.id,
        status: 'PUBLISHED',
        title: 'Original',
      });

      const response = await saveDraft(staff, appointment.id, { ...draft, title: 'Alterado' });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ error: { code: 'REPORT_ALREADY_PUBLISHED' } });
      await expect(
        db.report.findUniqueOrThrow({ where: { appointmentId: appointment.id } }),
      ).resolves.toMatchObject({ title: 'Original' });
    });

    it.each([
      ['an empty title', { title: '   ' }],
      ['an empty body', { body: '' }],
      ['an invalid professional id', { professionalId: 'not-a-uuid' }],
    ])('rejects %s', async (_case, override) => {
      const { staff, appointment, draft } = await seed();

      const response = await saveDraft(staff, appointment.id, { ...draft, ...override });

      expect(response.statusCode).toBe(400);
    });

    it('returns 404 for an unknown professional or appointment', async () => {
      const { staff, appointment, draft } = await seed();
      const unknownId = '01a1e793-0000-7000-8000-000000000000';

      const [unknownProfessional, unknownAppointment] = await Promise.all([
        saveDraft(staff, appointment.id, { ...draft, professionalId: unknownId }),
        saveDraft(staff, unknownId, draft),
      ]);

      expect(unknownProfessional.statusCode).toBe(404);
      expect(unknownAppointment.statusCode).toBe(404);
    });
  });

  describe('POST /api/appointments/:id/report/publish', () => {
    it('publishes the draft, recording when and by whom (L7)', async () => {
      const { staff, appointment, draft } = await seed();
      await saveDraft(staff, appointment.id, draft);

      const response = await publish(staff, appointment.id);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'PUBLISHED',
        publishedAt: clock.now().toISOString(),
        publishedBy: { id: staff.id, name: 'Equipe Benevita' },
      });
    });

    it('rejects publishing twice', async () => {
      const { staff, appointment, draft } = await seed();
      await saveDraft(staff, appointment.id, draft);
      await publish(staff, appointment.id);

      const response = await publish(staff, appointment.id);

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ error: { code: 'REPORT_ALREADY_PUBLISHED' } });
    });

    it('returns 404 when there is no report to publish', async () => {
      const { staff, appointment } = await seed();

      const response = await publish(staff, appointment.id);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ error: { code: 'REPORT_NOT_FOUND' } });
    });

    it('rejects publishing a draft left on a canceled appointment (L5)', async () => {
      const { staff, appointment, professional } = await seed();
      await createReport(db, {
        appointmentId: appointment.id,
        professionalId: professional.id,
        createdById: staff.id,
      });
      await db.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CANCELED', canceledAt: clock.now() },
      });

      const response = await publish(staff, appointment.id);

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ error: { code: 'APPOINTMENT_CANCELED' } });
    });

    it('never ends with a canceled appointment holding a published report (L5/L6 race)', async () => {
      const { staff, patient, appointment, draft } = await seed();
      // A race window is small, so several appointments race at once to make a missing lock
      // show up reliably instead of once in a while.
      const RACES = 10;
      const appointments = [appointment];
      for (let index = 1; index < RACES; index += 1) {
        appointments.push(
          await createAppointment(db, {
            patientId: patient.patientId,
            examTypeId: appointment.examTypeId,
            scheduledAt: new Date(appointment.scheduledAt.getTime() + index * 30 * 60_000),
          }),
        );
      }
      await Promise.all(appointments.map(({ id }) => saveDraft(staff, id, draft)));

      const results = await Promise.all(
        appointments.map(async ({ id }) => {
          const [publishResponse, cancelResponse] = await Promise.all([
            publish(staff, id),
            app.inject({
              method: 'POST',
              url: `/api/appointments/${id}/cancel`,
              headers: authHeader(staff),
            }),
          ]);
          return [publishResponse.statusCode, cancelResponse.statusCode].sort();
        }),
      );

      // The row lock serializes both operations: whichever runs second sees the first one's
      // result and is rejected with 409.
      expect(results).toEqual(Array.from({ length: RACES }, () => [200, 409]));
      const canceledWithPublishedReport = await db.appointment.count({
        where: { status: 'CANCELED', report: { status: 'PUBLISHED' } },
      });
      expect(canceledWithPublishedReport).toBe(0);
    });
  });

  describe('GET /api/appointments/:id/report', () => {
    it('returns the draft to staff', async () => {
      const { staff, appointment, draft } = await seed();
      await saveDraft(staff, appointment.id, draft);

      const response = await app.inject({
        method: 'GET',
        url: `/api/appointments/${appointment.id}/report`,
        headers: authHeader(staff),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: 'DRAFT', body: 'Campos pulmonares livres.' });
    });

    it('returns 404 when the appointment has no report yet', async () => {
      const { staff, appointment } = await seed();

      const response = await app.inject({
        method: 'GET',
        url: `/api/appointments/${appointment.id}/report`,
        headers: authHeader(staff),
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        error: { code: 'REPORT_NOT_FOUND', message: 'Laudo não encontrado.' },
      });
    });
  });

  it('forbids patients from reading, writing or publishing through staff routes', async () => {
    const { staff, patient, appointment, draft } = await seed();
    await saveDraft(staff, appointment.id, draft);

    const responses = await Promise.all([
      app.inject({
        method: 'GET',
        url: `/api/appointments/${appointment.id}/report`,
        headers: authHeader(patient),
      }),
      saveDraft(patient, appointment.id, draft),
      publish(patient, appointment.id),
    ]);

    expect(responses.map((response) => response.statusCode)).toEqual([403, 403, 403]);
    await expect(
      db.report.findUniqueOrThrow({ where: { appointmentId: appointment.id } }),
    ).resolves.toMatchObject({ status: 'DRAFT' });
  });
});
