import type { AppDependencies } from '../../shared/app-dependencies.ts';
import { commonErrors } from '../../shared/errors/app-error.ts';

/**
 * Every query is scoped by the patient id taken from the token, inside the query itself
 * (`where: { patientId }`), never by comparing after fetching another patient's data.
 */
export function createPatientPortalService({ db }: Pick<AppDependencies, 'db'>) {
  return {
    async listAppointments(patientId: string) {
      const appointments = await db.appointment.findMany({
        where: { patientId },
        include: { examType: true, report: { select: { status: true } } },
        orderBy: { scheduledAt: 'desc' },
      });
      return appointments.map(({ report, ...appointment }) => ({
        id: appointment.id,
        scheduledAt: appointment.scheduledAt,
        status: appointment.status,
        examType: appointment.examType,
        hasPublishedReport: report?.status === 'PUBLISHED',
      }));
    },

    async getPublishedReport(patientId: string, appointmentId: string) {
      const report = await db.report.findFirst({
        where: { appointmentId, status: 'PUBLISHED', appointment: { patientId } },
        include: {
          professional: { select: { name: true, crm: true, specialty: true } },
          appointment: { select: { id: true, scheduledAt: true, examType: true } },
        },
      });
      // Same answer whether the appointment belongs to another patient, has no report or only a
      // draft, so a patient cannot even learn that someone else's report exists (T2, T3). A
      // PUBLISHED report always has publishedAt (CHECK constraint); the check narrows the type.
      if (!report?.publishedAt) throw commonErrors.reportNotFound();

      return {
        id: report.id,
        title: report.title,
        body: report.body,
        professional: report.professional,
        publishedAt: report.publishedAt,
        appointment: report.appointment,
      };
    },
  };
}
