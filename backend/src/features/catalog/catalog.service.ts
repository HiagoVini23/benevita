import type { AppDependencies } from '../../shared/app-dependencies.ts';
import { isUniqueConstraintViolation } from '../../shared/database/prisma.ts';
import { AppError } from '../../shared/errors/app-error.ts';
import { toClinicParts } from '../../shared/time/clinic-time.ts';
import { hashPassword } from '../auth/password.ts';
import type {
  CreateExamTypeBody,
  CreatePatientBody,
  CreateProfessionalBody,
} from './catalog.schemas.ts';

export const catalogErrors = {
  emailTaken: () => new AppError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.'),
  examTypeExists: () =>
    new AppError(409, 'EXAM_TYPE_EXISTS', 'Já existe um tipo de exame com este nome.'),
  crmTaken: () => new AppError(409, 'CRM_TAKEN', 'Já existe um profissional com este CRM.'),
  birthDateInFuture: () =>
    new AppError(400, 'BIRTH_DATE_IN_FUTURE', 'A data de nascimento não pode estar no futuro.'),
};

/**
 * Reference data used by staff forms: patients, exam types and professionals. Uniqueness is
 * guaranteed by the database (unique indexes); a violation becomes a clear 409.
 */
export function createCatalogService({ db, clock }: Pick<AppDependencies, 'db' | 'clock'>) {
  // birth_date is a DATE column; send it as a calendar date so no time zone can shift it.
  const toPatientOption = (patient: { id: string; name: string; birthDate: Date }) => ({
    id: patient.id,
    name: patient.name,
    birthDate: patient.birthDate.toISOString().slice(0, 10),
  });

  return {
    async listPatients() {
      const patients = await db.patient.findMany({
        select: { id: true, name: true, birthDate: true },
        orderBy: { name: 'asc' },
      });
      return patients.map(toPatientOption);
    },

    listExamTypes() {
      return db.examType.findMany({ orderBy: { name: 'asc' } });
    },

    listProfessionals() {
      return db.professional.findMany({ orderBy: { name: 'asc' } });
    },

    async createPatient({ name, birthDate, email, password }: CreatePatientBody) {
      if (birthDate > toClinicParts(clock.now()).date) throw catalogErrors.birthDateInFuture();
      try {
        const user = await db.user.create({
          data: {
            name,
            email,
            passwordHash: await hashPassword(password),
            role: 'PATIENT',
            patient: { create: { name, birthDate: new Date(birthDate) } },
          },
          select: { patient: { select: { id: true, name: true, birthDate: true } } },
        });
        if (user.patient === null) throw new Error('Patient was not created with its user');
        return toPatientOption(user.patient);
      } catch (error) {
        if (isUniqueConstraintViolation(error, 'users_email_key')) throw catalogErrors.emailTaken();
        throw error;
      }
    },

    async createExamType({ name }: CreateExamTypeBody) {
      const existing = await db.examType.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existing !== null) throw catalogErrors.examTypeExists();
      try {
        return await db.examType.create({ data: { name } });
      } catch (error) {
        if (isUniqueConstraintViolation(error, 'exam_types_name_key')) {
          throw catalogErrors.examTypeExists();
        }
        throw error;
      }
    },

    async createProfessional(input: CreateProfessionalBody) {
      try {
        return await db.professional.create({ data: input });
      } catch (error) {
        if (isUniqueConstraintViolation(error, 'professionals_crm_key')) {
          throw catalogErrors.crmTaken();
        }
        throw error;
      }
    },
  };
}
