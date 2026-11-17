import type { Database } from '../../shared/database/prisma.ts';

/** Read-only reference data used by staff forms. Managed through the seed (no CRUD by design). */
export function createCatalogService(db: Database) {
  return {
    async listPatients() {
      const patients = await db.patient.findMany({
        select: { id: true, name: true, birthDate: true },
        orderBy: { name: 'asc' },
      });
      // birth_date is a DATE column; send it as a calendar date so no time zone can shift it.
      return patients.map((patient) => ({
        ...patient,
        birthDate: patient.birthDate.toISOString().slice(0, 10),
      }));
    },

    listExamTypes() {
      return db.examType.findMany({ orderBy: { name: 'asc' } });
    },

    listProfessionals() {
      return db.professional.findMany({ orderBy: { name: 'asc' } });
    },
  };
}
