/**
 * All dates are shown in the clinic time zone, regardless of the browser's zone, so staff and
 * patients always see the same wall-clock time. The API exchanges instants as ISO UTC strings.
 */
export const CLINIC_TIME_ZONE = 'America/Sao_Paulo';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: CLINIC_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: CLINIC_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// No timeZone on purpose: it formats a browser-local midnight that represents a calendar date.
const longCalendarDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `20/11/2026` */
export function formatDate(isoInstant: string): string {
  return dateFormatter.format(new Date(isoInstant));
}

/** `14:30` */
export function formatTime(isoInstant: string): string {
  return timeFormatter.format(new Date(isoInstant));
}

/** `20/11/2026 às 14:30` */
export function formatDateTime(isoInstant: string): string {
  return `${formatDate(isoInstant)} às ${formatTime(isoInstant)}`;
}

/** Formats a calendar date (`YYYY-MM-DD`, no time zone involved) as `20/11/2026`. */
export function formatCalendarDate(calendarDate: string): string {
  const [year, month, day] = calendarDate.split('-');
  return `${day ?? ''}/${month ?? ''}/${year ?? ''}`;
}

/**
 * Date pickers work with browser-local `Date`s at midnight. A calendar date has no time zone, so
 * converting through the local fields keeps the picked day intact in any browser zone.
 */
export function calendarDateToPickerDate(calendarDate: string): Date {
  const [year, month, day] = calendarDate.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function pickerDateToCalendarDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear())}-${month}-${day}`;
}

/** `sexta-feira, 20 de novembro` — long label for a calendar date. */
export function formatCalendarDateLong(calendarDate: string): string {
  return longCalendarDateFormatter.format(calendarDateToPickerDate(calendarDate));
}

/** Today's date in the clinic, as `YYYY-MM-DD`. */
export function todayInClinic(now: Date = new Date()): string {
  return isoDateFormatter.format(now);
}
