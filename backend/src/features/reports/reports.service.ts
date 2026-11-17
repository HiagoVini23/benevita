import type { AppDependencies } from '../../shared/app-dependencies.ts';
import type { AuthUser } from '../../shared/auth/auth-user.ts';
import type { Database, Transaction } from '../../shared/database/prisma.ts';
import { AppError, commonErrors } from '../../shared/errors/app-error.ts';
import { lockAppointment } from '../appointments/appointments.service.ts';
import type { SaveDraftBody } from './reports.schemas.ts';

export const reportErrors = {
  /** Distinct code so clients can tell "no report yet" from "no such appointment". */
  notFound: () => new AppError(404, 'REPORT_NOT_FOUND', 'Laudo não encontrado.'),
  appointmentCanceled: () =>
    new AppError(409, 'APPOINTMENT_CANCELED', 'Agendamentos cancelados não podem receber laudo.'),
  alreadyPublished: () =>
    new AppError(
      409,
      'REPORT_ALREADY_PUBLISHED',
      'Este laudo já foi publicado e não pode mais ser alterado.',
    ),
};

const staffReportInclude = {
  professional: true,
  publishedBy: { select: { id: true, name: true } },
} as const;

/**
 * Every write starts with `lockAppointment`, the same row lock used by cancellation. Saving,
 * publishing and canceling the same appointment therefore run one at a time, and each sees the
 * other's committed state: a report is never published on a canceled appointment (L5) and a
 * canceled appointment never ends up with a published report (L6).
 */
export function createReportsService({ db, clock }: Pick<AppDependencies, 'db' | 'clock'>) {
  async function findReport(client: Database | Transaction, appointmentId: string) {
    return client.report.findUnique({ where: { appointmentId }, include: staffReportInclude });
  }

  return {
    async get(appointmentId: string) {
      const appointment = await db.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true },
      });
      if (appointment === null) throw commonErrors.notFound('appointment');

      const report = await findReport(db, appointmentId);
      if (report === null) throw reportErrors.notFound();
      return report;
    },

    /** Creates the appointment's single report (L1) or updates it while it is a draft (L2/L4). */
    saveDraft(appointmentId: string, input: SaveDraftBody, user: AuthUser) {
      return db.$transaction(async (tx) => {
        const appointment = await lockAppointment(tx, appointmentId);
        if (appointment.status === 'CANCELED') throw reportErrors.appointmentCanceled();

        const professional = await tx.professional.findUnique({
          where: { id: input.professionalId },
          select: { id: true },
        });
        if (professional === null) throw commonErrors.notFound('professional');

        const existing = await tx.report.findUnique({
          where: { appointmentId },
          select: { id: true, status: true },
        });
        if (existing?.status === 'PUBLISHED') throw reportErrors.alreadyPublished();

        if (existing === null) {
          return tx.report.create({
            data: { ...input, appointmentId, createdById: user.id },
            include: staffReportInclude,
          });
        }
        return tx.report.update({
          where: { id: existing.id },
          data: input,
          include: staffReportInclude,
        });
      });
    },

    /** Makes the draft visible to the patient and freezes it, recording when and by whom (L7). */
    publish(appointmentId: string, user: AuthUser) {
      return db.$transaction(async (tx) => {
        const appointment = await lockAppointment(tx, appointmentId);
        if (appointment.status === 'CANCELED') throw reportErrors.appointmentCanceled();

        const report = await tx.report.findUnique({
          where: { appointmentId },
          select: { id: true, status: true },
        });
        if (report === null) throw reportErrors.notFound();
        if (report.status === 'PUBLISHED') throw reportErrors.alreadyPublished();

        return tx.report.update({
          where: { id: report.id },
          data: { status: 'PUBLISHED', publishedAt: clock.now(), publishedById: user.id },
          include: staffReportInclude,
        });
      });
    },
  };
}
