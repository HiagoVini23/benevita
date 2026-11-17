import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../shared/auth/auth-user.ts';
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

describe('catalog registration', () => {
  const { app, db, authHeader } = setupTestApp();

  function post(user: AuthUser, url: string, payload: Record<string, unknown>) {
    return app.inject({ method: 'POST', url, headers: authHeader(user), payload });
  }

  it('registers a patient with a login the patient can use', async () => {
    const staff = await createStaff(db);

    const response = await post(staff, '/api/patients', {
      name: 'Daniela Prado',
      birthDate: '1992-07-15',
      email: 'Daniela@Test.dev',
      password: 'senha-inicial',
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ name: 'Daniela Prado', birthDate: '1992-07-15' });
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'daniela@test.dev', password: 'senha-inicial' },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toMatchObject({
      user: { role: 'PATIENT', patientId: response.json<{ id: string }>().id },
    });
  });

  it('rejects a patient e-mail already in use and a birth date in the future', async () => {
    const staff = await createStaff(db, { email: 'used@test.dev' });
    const base = { name: 'Fulano', birthDate: '1990-01-01', password: 'senha-inicial' };

    const [duplicate, future] = await Promise.all([
      post(staff, '/api/patients', { ...base, email: 'USED@test.dev' }),
      post(staff, '/api/patients', { ...base, email: 'new@test.dev', birthDate: '2099-01-01' }),
    ]);

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({ error: { code: 'EMAIL_TAKEN' } });
    expect(future.statusCode).toBe(400);
    expect(future.json()).toMatchObject({ error: { code: 'BIRTH_DATE_IN_FUTURE' } });
  });

  it('registers exam types, rejecting duplicates regardless of case', async () => {
    const staff = await createStaff(db);

    const created = await post(staff, '/api/exam-types', { name: 'Mamografia' });
    const duplicate = await post(staff, '/api/exam-types', { name: 'mamografia' });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ name: 'Mamografia' });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({ error: { code: 'EXAM_TYPE_EXISTS' } });
  });

  it('registers professionals with a normalized, unique CRM', async () => {
    const staff = await createStaff(db);
    const payload = { name: 'Dr. Paulo Reis', crm: 'crm-sp  654321', specialty: 'Radiologia' };

    const created = await post(staff, '/api/professionals', payload);
    const duplicate = await post(staff, '/api/professionals', { ...payload, crm: 'CRM-SP 654321' });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ crm: 'CRM-SP 654321' });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({ error: { code: 'CRM_TAKEN' } });
  });

  it('only lets staff register', async () => {
    const patient = await createPatient(db);

    const responses = await Promise.all([
      post(patient, '/api/exam-types', { name: 'Densitometria' }),
      post(patient, '/api/professionals', { name: 'X', crm: 'CRM 1', specialty: 'Y' }),
      post(patient, '/api/patients', {
        name: 'X',
        birthDate: '1990-01-01',
        email: 'x@test.dev',
        password: 'senha-inicial',
      }),
    ]);

    expect(responses.map((response) => response.statusCode)).toEqual([403, 403, 403]);
  });
});
