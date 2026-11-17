import {
  clinicDateTimeToUtc,
  toClinicParts,
  type CalendarDate,
  type WallTime,
} from '../../shared/time/clinic-time.ts';

/** Single room, fixed slots regardless of the exam type. */
export const SLOT_DURATION_MINUTES = 30;
const SLOT_DURATION_MS = SLOT_DURATION_MINUTES * 60_000;

/** Clinic time zone, Monday–Friday; the last slot starts at 17:30. */
const FIRST_SLOT: WallTime = '08:00';
const LAST_SLOT: WallTime = '17:30';
const LAST_BUSINESS_WEEKDAY = 5; // ISO weekday: 1 = Monday … 5 = Friday

export type SlotViolation = 'INVALID_SLOT' | 'OUTSIDE_BUSINESS_HOURS' | 'IN_PAST';

export function isBusinessDay(date: CalendarDate): boolean {
  return toClinicParts(clinicDateTimeToUtc(date, '12:00')).weekday <= LAST_BUSINESS_WEEKDAY;
}

function wallTimes(): WallTime[] {
  const times: WallTime[] = [];
  const [firstHour, firstMinute] = FIRST_SLOT.split(':').map(Number);
  const [lastHour, lastMinute] = LAST_SLOT.split(':').map(Number);
  const first = (firstHour ?? 0) * 60 + (firstMinute ?? 0);
  const last = (lastHour ?? 0) * 60 + (lastMinute ?? 0);
  for (let minutes = first; minutes <= last; minutes += SLOT_DURATION_MINUTES) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    times.push(`${hh}:${mm}`);
  }
  return times;
}

const BUSINESS_WALL_TIMES = wallTimes();

export function businessSlotsOf(date: CalendarDate): Date[] {
  if (!isBusinessDay(date)) return [];
  return BUSINESS_WALL_TIMES.map((time) => clinicDateTimeToUtc(date, time));
}

/** Order matters for the message shown: malformed slot, then business hours, then the past. */
export function findSlotViolation(scheduledAt: Date, now: Date): SlotViolation | null {
  if (scheduledAt.getTime() % SLOT_DURATION_MS !== 0) return 'INVALID_SLOT';

  const { date, time } = toClinicParts(scheduledAt);
  if (!isBusinessDay(date) || time < FIRST_SLOT || time > LAST_SLOT) {
    return 'OUTSIDE_BUSINESS_HOURS';
  }

  if (scheduledAt.getTime() <= now.getTime()) return 'IN_PAST';
  return null;
}
