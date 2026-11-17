import { describe, expect, it } from 'vitest';
import { setupTestApp } from '../../test/test-app.ts';
import {
  createExamType,
  createPatient,
  createProfessional,
  createStaff,
} from '../../test/factories.ts';

describe('catalog routes', () => {
  const { app, db, authHeader } = setupTestApp();

  it('lists patients, exam types and professionals for staff', async () => {
    const staff = await createStaff(db);
    const patient = await createPatient(db, { name: 'Ana Souza' });
    const examType = await createExamType(db, 'Ultrassom');
    const professional = await createProfessional(db, { name: 'Dra. Helena' });

    const [patients, examTypes, professionals] = await Promise.all(
      ['/api/patients', '/api/exam-types', '/api/professionals'].map((url) =>
        app.inject({ method: 'GET', url, headers: authHeader(staff) }),
      ),
    );

    expect(patients?.json()).toEqual([
      { id: patient.patientId, name: 'Ana Souza', birthDate: '1990-05-10' },
    ]);
    expect(examTypes?.json()).toEqual([{ id: examType.id, name: 'Ultrassom' }]);
    expect(professionals?.json()).toEqual([professional]);
  });

  it('forbids patients from listing other patients', async () => {
    const patient = await createPatient(db);

    const response = await app.inject({
      method: 'GET',
      url: '/api/patients',
      headers: authHeader(patient),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  it('requires authentication', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/exam-types' });

    expect(response.statusCode).toBe(401);
  });
});
