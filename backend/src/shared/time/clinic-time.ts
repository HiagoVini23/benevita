/**
 * The clinic operates in a single time zone. Instants are stored and exchanged in UTC;
 * "calendar" values (a day, a wall-clock time) are always interpreted in this zone.
 */
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

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short',
});

function parseDate(date: CalendarDate): [number, number, number] {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new Error(`Invalid calendar date: ${date}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function parseTime(time: WallTime): [number, number] {
  const match = TIME_PATTERN.exec(time);
  if (!match) throw new Error(`Invalid wall time: ${time}`);
  return [Number(match[1]), Number(match[2])];
}

function readParts(instant: Date): Record<string, string> {
  return Object.fromEntries(
    partsFormatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
}

function offsetMinutesAt(instant: Date): number {
  const parts = readParts(instant);
  const wallClockAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (wallClockAsUtc - instant.getTime()) / MS_PER_MINUTE;
}

export function isValidCalendarDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  const [year, month, day] = parseDate(date);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1;
}

/** Converts a clinic wall-clock date/time to the UTC instant it represents. */
export function clinicDateTimeToUtc(date: CalendarDate, time: WallTime): Date {
  const [year, month, day] = parseDate(date);
  const [hour, minute] = parseTime(time);
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offset = offsetMinutesAt(new Date(naiveUtc));
  return new Date(naiveUtc - offset * MS_PER_MINUTE);
}

/** Reads a UTC instant as clinic wall-clock values. */
export function toClinicParts(instant: Date): ClinicDateTimeParts {
  const parts = readParts(instant);
  const weekdayIndex = WEEKDAYS.findIndex((weekday) => weekday === parts.weekday);
  return {
    date: `${parts.year ?? ''}-${parts.month ?? ''}-${parts.day ?? ''}`,
    time: `${parts.hour ?? ''}:${parts.minute ?? ''}`,
    weekday: weekdayIndex + 1,
  };
}

/** UTC range [start, end) covering a whole clinic calendar day. */
export function clinicDayRange(date: CalendarDate): { start: Date; end: Date } {
  return {
    start: clinicDateTimeToUtc(date, '00:00'),
    end: clinicDateTimeToUtc(addDays(date, 1), '00:00'),
  };
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const [year, month, day] = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY).toISOString().slice(0, 10);
}
