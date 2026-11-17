import { describe, expect, it } from 'vitest';
import {
  createAppointment,
  createExamType,
  createPatient,
  createProfessional,
  createReport,
  createStaff,
} from '../../test/factories.ts';
import { setupTestApp } from '../../test/test-app.ts';

const MONDAY = new Date('2026-11-16T13:00:00.000Z');
const TUESDAY = new Date('2026-11-17T13:00:00.000Z');
const WEDNESDAY = new Date('2026-11-18T13:00:00.000Z');

describe('patient portal routes', () => {
  const { app, db, authHeader } = setupTestApp();

  async function seed() {
    const staff = await createStaff(db);
    const ana = await createPatient(db, { name: 'Ana Souza' });
    const bruno = await createPatient(db, { name: 'Bruno Lima' });
    const examType = await createExamType(db, 'Raio-X');
    const professional = await createProfessional(db, { name: 'Dra. Helena Marques' });
    return { staff, ana, bruno, examType, professional };
  }

  describe('GET /api/me/appointments', () => {
    it("lists only the patient's own appointments, newest first", async () => {
      const { ana, bruno, examType } = await seed();
      await createAppointment(db, {
        patientId: ana.patientId,
        examTypeId: examType.id,
        scheduledAt: MONDAY,
      });
      await createAppointment(db, {
        patientId: ana.patientId,
        examTypeId: examType.id,
        scheduledAt: WEDNESDAY,
        status: 'CANCELED',
      });
      await createAppointment(db, {
        patientId: bruno.patientId,
        examTypeId: examType.id,
        scheduledAt: TUESDAY,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/me/appointments',
        headers: authHeader(ana),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        expect.objectContaining({
          scheduledAt: WEDNESDAY.toISOString(),
          status: 'CANCELED',
          examType: { id: examType.id, name: 'Raio-X' },
        }),
        expect.objectContaining({ scheduledAt: MONDAY.toISOString(), status: 'SCHEDULED' }),
      ]);
    });

    it('flags published reports but never drafts (T3)', async () => {
      const { staff, ana, examType, professional } = await seed();
      const withPublished = await createAppointment(db, {
        patientId: ana.patientId,
        examTypeId: examType.id,
        scheduledAt: MONDAY,
      });
      const withDraft = await createAppointment(db, {
        patientId: ana.patientId,
        examTypeId: examType.id,
        scheduledAt: TUESDAY,
      });
      await createReport(db, {
        appointmentId: withPublished.id,
        professionalId: professional.id,
        createdById: staff.id,
        status: 'PUBLISHED',
      });
      await createReport(db, {
        appointmentId: withDraft.id,
        professionalId: professional.id,
        createdById: staff.id,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/me/appointments',
        headers: authHeader(ana),
      });

      const flags = Object.fromEntries(
        response
          .json<{ id: string; hasPublishedReport: boolean }[]>()
          .map(({ id, hasPublishedReport }) => [id, hasPublishedReport]),
      );
      expect(flags).toEqual({ [withPublished.id]: true, [withDraft.id]: false });
      expect(response.body).not.toContain('DRAFT');
    });
  });

  describe('GET /api/me/appointments/:id/report', () => {
    it("denies access to another patient's report without revealing it (T2)", async () => {
      const { staff, ana, bruno, examType, professional } = await seed();
      const brunoAppointment = await createAppointment(db, {
        patientId: bruno.patientId,
        examTypeId: examType.id,
      });
      await createReport(db, {
        appointmentId: brunoAppointment.id,
        professionalId: professional.id,
        createdById: staff.id,
        status: 'PUBLISHED',
        title: 'Laudo do Bruno',
        body: 'Conteúdo confidencial do Bruno.',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/me/appointments/${brunoAppointment.id}/report`,
        headers: authHeader(ana),
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: 'REPORT_NOT_FOUND', message: 'Laudo não encontrado.' },
      });
      expect(response.body).not.toContain('Bruno');
    });

    it('does not disclose the content of a draft (T3)', async () => {
      const { staff, ana, examType, professional } = await seed();
      const appointment = await createAppointment(db, {
        patientId: ana.patientId,
        examTypeId: examType.id,
      });
      await createReport(db, {
        appointmentId: appointment.id,
        professionalId: professional.id,
        createdById: staff.id,
        title: 'Rascunho interno',
        body: 'Texto ainda em revisão pela equipe.',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/me/appointments/${appointment.id}/report`,
        headers: authHeader(ana),
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ error: { code: 'REPORT_NOT_FOUND' } });
      expect(response.body).not.toContain('Rascunho interno');
      expect(response.body).not.toContain('em revisão');
    });

    it('makes a report available to the right patient once staff publish it (T4)', async () => {
      const { staff, ana, bruno, examType, professional } = await seed();
      const appointment = await createAppointment(db, {
        patientId: ana.patientId,
        examTypeId: examType.id,
      });
      const readAsAna = () =>
        app.inject({
          method: 'GET',
          url: `/api/me/appointments/${appointment.id}/report`,
          headers: authHeader(ana),
        });

      const draft = await app.inject({
        method: 'PUT',
        url: `/api/appointments/${appointment.id}/report`,
        headers: authHeader(staff),
        payload: {
          title: 'Raio-X de tórax',
          body: 'Campos pulmonares livres.',
          professionalId: professional.id,
        },
      });
      expect(draft.statusCode).toBe(200);
      // The draft exists, yet the patient cannot see it.
      expect((await readAsAna()).statusCode).toBe(404);

      const published = await app.inject({
        method: 'POST',
        url: `/api/appointments/${appointment.id}/report/publish`,
        headers: authHeader(staff),
      });
      expect(published.statusCode).toBe(200);

      const response = await readAsAna();
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: published.json<{ id: string }>().id,
        title: 'Raio-X de tórax',
        body: 'Campos pulmonares livres.',
        professional: {
          name: 'Dra. Helena Marques',
          crm: professional.crm,
          specialty: 'Radiologia',
        },
        publishedAt: published.json<{ publishedAt: string }>().publishedAt,
        appointment: {
          id: appointment.id,
          scheduledAt: appointment.scheduledAt.toISOString(),
          examType: { id: examType.id, name: 'Raio-X' },
        },
      });
      // Staff audit data stays internal.
      expect(response.body).not.toContain(staff.id);

      const asBruno = await app.inject({
        method: 'GET',
        url: `/api/me/appointments/${appointment.id}/report`,
        headers: authHeader(bruno),
      });
      expect(asBruno.statusCode).toBe(404);
    });

    it("answers identically for another patient's report, a draft and a missing report", async () => {
      const { staff, ana, bruno, examType, professional } = await seed();
      const brunoPublished = await createAppointment(db, {
        patientId: bruno.patientId,
        examTypeId: examType.id,
        scheduledAt: MONDAY,
      });
      const anaDraft = await createAppointment(db, {
        patientId: ana.patientId,
        examTypeId: examType.id,
        scheduledAt: TUESDAY,
      });
      await createReport(db, {
        appointmentId: brunoPublished.id,
        professionalId: professional.id,
        createdById: staff.id,
        status: 'PUBLISHED',
      });
      await createReport(db, {
        appointmentId: anaDraft.id,
        professionalId: professional.id,
        createdById: staff.id,
      });

      const [otherPatient, draft, missing] = await Promise.all(
        [brunoPublished.id, anaDraft.id, crypto.randomUUID()].map((id) =>
          app.inject({
            method: 'GET',
            url: `/api/me/appointments/${id}/report`,
            headers: authHeader(ana),
          }),
        ),
      );

      // Same status and body: the response never reveals whether a report exists.
      expect(otherPatient?.statusCode).toBe(404);
      expect(draft?.statusCode).toBe(404);
      expect(missing?.statusCode).toBe(404);
      expect(draft?.body).toBe(otherPatient?.body);
      expect(missing?.body).toBe(otherPatient?.body);
    });

    it('rejects a malformed appointment id', async () => {
      const { ana } = await seed();

      const response = await app.inject({
        method: 'GET',
        url: '/api/me/appointments/not-a-uuid/report',
        headers: authHeader(ana),
      });

      expect(response.statusCode).toBe(400);
    });
  });

  it('is reserved to patients', async () => {
    const { staff } = await seed();

    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/api/me/appointments', headers: authHeader(staff) }),
      app.inject({ method: 'GET', url: '/api/me/appointments' }),
    ]);

    expect(responses.map((response) => response.statusCode)).toEqual([403, 401]);
  });
});
