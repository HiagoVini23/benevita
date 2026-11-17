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

/** Today's date in the clinic, as `YYYY-MM-DD`. */
export function todayInClinic(now: Date = new Date()): string {
  return isoDateFormatter.format(now);
}
