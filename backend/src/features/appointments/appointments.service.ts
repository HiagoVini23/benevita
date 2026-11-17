import type { AppointmentStatus } from '../../generated/prisma/enums.ts';
import type { AppDependencies } from '../../shared/app-dependencies.ts';
import {
  isUniqueConstraintViolation,
  type Database,
  type Transaction,
} from '../../shared/database/prisma.ts';
import { AppError, commonErrors } from '../../shared/errors/app-error.ts';
import { clinicDayRange, type CalendarDate } from '../../shared/time/clinic-time.ts';
import { businessSlotsOf, findSlotViolation, type SlotViolation } from './appointment-rules.ts';
import type { CreateAppointmentBody, ListAppointmentsQuery } from './appointments.schemas.ts';

export const appointmentErrors = {
  invalidSlot: () =>
    new AppError(
      400,
      'INVALID_SLOT',
      'O horário deve começar em um intervalo de 30 minutos (:00 ou :30).',
    ),
  outsideBusinessHours: () =>
    new AppError(
      400,
      'OUTSIDE_BUSINESS_HOURS',
      'Agendamentos apenas de segunda a sexta, das 08:00 às 18:00 (horário de Brasília).',
    ),
  inPast: () =>
    new AppError(400, 'APPOINTMENT_IN_PAST', 'Não é possível agendar em um horário que já passou.'),
  slotTaken: () =>
    new AppError(409, 'SLOT_TAKEN', 'Este horário já está ocupado. Escolha outro horário.'),
  alreadyCanceled: () =>
    new AppError(409, 'APPOINTMENT_ALREADY_CANCELED', 'Este agendamento já foi cancelado.'),
  reportPublished: () =>
    new AppError(
      409,
      'REPORT_ALREADY_PUBLISHED',
      'Agendamentos com laudo publicado não podem ser cancelados.',
    ),
};

const slotViolationErrors: Record<SlotViolation, () => AppError> = {
  INVALID_SLOT: appointmentErrors.invalidSlot,
  OUTSIDE_BUSINESS_HOURS: appointmentErrors.outsideBusinessHours,
  IN_PAST: appointmentErrors.inPast,
};

/** Partial unique index from the init migration: one SCHEDULED appointment per slot (R2/R3). */
const ACTIVE_SLOT_INDEX = 'appointments_active_slot_key';

const staffAppointmentInclude = {
  patient: { select: { id: true, name: true } },
  examType: true,
  report: { select: { id: true, status: true, publishedAt: true } },
} as const;

/**
 * Locks the appointment row until the transaction ends. Every operation whose rule spans the
 * appointment and its report (cancel, save draft, publish) starts with this lock, so they run one
 * at a time per appointment and each sees the other's committed result (rules L5/L6).
 */
interface LockedAppointment {
  id: string;
  status: AppointmentStatus;
  scheduledAt: Date;
}

export async function lockAppointment(
  tx: Transaction,
  appointmentId: string,
): Promise<LockedAppointment> {
  const [row] = await tx.$queryRaw<LockedAppointment[]>`
    SELECT id, status, scheduled_at AS "scheduledAt"
    FROM appointments WHERE id = ${appointmentId}::uuid FOR UPDATE`;
  if (row === undefined) throw commonErrors.notFound('appointment');
  return row;
}

export function createAppointmentsService({ db, clock }: Pick<AppDependencies, 'db' | 'clock'>) {
  async function findById(client: Database | Transaction, id: string) {
    const appointment = await client.appointment.findUnique({
      where: { id },
      include: staffAppointmentInclude,
    });
    if (appointment === null) throw commonErrors.notFound('appointment');
    return appointment;
  }

  return {
    list({ date, patientId }: ListAppointmentsQuery) {
      const range = date === undefined ? undefined : clinicDayRange(date);
      return db.appointment.findMany({
        where: {
          ...(patientId === undefined ? {} : { patientId }),
          ...(range === undefined ? {} : { scheduledAt: { gte: range.start, lt: range.end } }),
        },
        include: staffAppointmentInclude,
        orderBy: { scheduledAt: 'asc' },
      });
    },

    getById(id: string) {
      return findById(db, id);
    },

    /** Future business slots of the day that no active appointment occupies. */
    async availableSlots(date: CalendarDate) {
      const { start, end } = clinicDayRange(date);
      const now = clock.now();
      const taken = await db.appointment.findMany({
        where: { status: 'SCHEDULED', scheduledAt: { gte: start, lt: end } },
        select: { scheduledAt: true },
      });
      const takenTimes = new Set(taken.map(({ scheduledAt }) => scheduledAt.getTime()));
      const slots = businessSlotsOf(date).filter(
        (slot) => slot.getTime() > now.getTime() && !takenTimes.has(slot.getTime()),
      );
      return { date, slots };
    },

    async create({ patientId, examTypeId, scheduledAt }: CreateAppointmentBody) {
      const violation = findSlotViolation(scheduledAt, clock.now());
      if (violation !== null) throw slotViolationErrors[violation]();

      const [patient, examType] = await Promise.all([
        db.patient.findUnique({ where: { id: patientId }, select: { id: true } }),
        db.examType.findUnique({ where: { id: examTypeId }, select: { id: true } }),
      ]);
      if (patient === null) throw commonErrors.notFound('patient');
      if (examType === null) throw commonErrors.notFound('examType');

      try {
        return await db.appointment.create({
          data: { patientId, examTypeId, scheduledAt },
          include: staffAppointmentInclude,
        });
      } catch (error) {
        // The partial unique index is the real guard against double booking: two concurrent
        // requests both pass the checks above, and the database rejects the second insert.
        if (isUniqueConstraintViolation(error, ACTIVE_SLOT_INDEX))
          throw appointmentErrors.slotTaken();
        throw error;
      }
    },

    cancel(id: string) {
      return db.$transaction(async (tx) => {
        const appointment = await lockAppointment(tx, id);
        if (appointment.status === 'CANCELED') throw appointmentErrors.alreadyCanceled();

        const report = await tx.report.findUnique({
          where: { appointmentId: id },
          select: { status: true },
        });
        if (report?.status === 'PUBLISHED') throw appointmentErrors.reportPublished();

        await tx.appointment.update({
          where: { id },
          data: { status: 'CANCELED', canceledAt: clock.now() },
        });
        return findById(tx, id);
      });
    },
  };
}
