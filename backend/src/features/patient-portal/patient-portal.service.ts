import type { AppDependencies } from '../../shared/app-dependencies.ts';
import { commonErrors } from '../../shared/errors/app-error.ts';

/** Every query is scoped by the token's patient id in the `where`, never checked after fetching. */
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
      // Same answer for another patient's appointment, no report or a draft (T2, T3), so
      // existence is never revealed. publishedAt is guaranteed by a CHECK; this narrows the type.
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
