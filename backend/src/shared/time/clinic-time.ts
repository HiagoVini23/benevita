import { tz } from '@date-fns/tz';
import { addDays as addCalendarDays, format, getISODay, isValid, parse } from 'date-fns';

/** Instants are UTC; calendar values (a day, a wall-clock time) are read in the clinic zone. */
export const CLINIC_TIME_ZONE = 'America/Sao_Paulo';

/** ISO calendar date, e.g. `2026-11-20`. */
export type CalendarDate = string;
/** Wall-clock time, e.g. `14:30`. */
export type WallTime = string;

export interface ClinicDateTimeParts {
  date: CalendarDate;
  time: WallTime;
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  weekday: number;
}

const CALENDAR_DATE_FORMAT = 'yyyy-MM-dd';
const WALL_TIME_FORMAT = 'HH:mm';
const inClinic = { in: tz(CLINIC_TIME_ZONE) };

export function clinicDateTimeToUtc(date: CalendarDate, time: WallTime): Date {
  const zoned = parse(
    `${date} ${time}`,
    `${CALENDAR_DATE_FORMAT} ${WALL_TIME_FORMAT}`,
    new Date(),
    inClinic,
  );
  if (!isValid(zoned)) throw new Error(`Invalid clinic date/time: ${date} ${time}`);
  return new Date(zoned.getTime());
}

export function toClinicParts(instant: Date): ClinicDateTimeParts {
  return {
    date: format(instant, CALENDAR_DATE_FORMAT, inClinic),
    time: format(instant, WALL_TIME_FORMAT, inClinic),
    weekday: getISODay(instant, inClinic),
  };
}

/** Half-open UTC range [start, end). */
export function clinicDayRange(date: CalendarDate): { start: Date; end: Date } {
  return {
    start: clinicDateTimeToUtc(date, '00:00'),
    end: clinicDateTimeToUtc(addDays(date, 1), '00:00'),
  };
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const day = parse(date, CALENDAR_DATE_FORMAT, new Date(), inClinic);
  if (!isValid(day)) throw new Error(`Invalid calendar date: ${date}`);
  return format(addCalendarDays(day, days, inClinic), CALENDAR_DATE_FORMAT, inClinic);
}
