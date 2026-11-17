import { calendarDateToPickerDate, todayInClinic } from '@/lib/clinic-time';

/*
 * UX mirror of the scheduling rules. The source of truth is the backend
 * (backend/src/features/appointments/appointments.rules.ts), which validates every booking; these
 * values only shape the UI (blocked calendar days, help text) and must follow it if it changes.
 */
const BUSINESS_WEEKDAYS = new Set([1, 2, 3, 4, 5]); // Monday … Friday (Date#getDay)

export const BUSINESS_HOURS_LABEL =
  'Sala única, horários de 30 minutos, de segunda a sexta, das 08:00 às 18:00 (horário de Brasília).';

export function isBookableDate(calendarDate: string): boolean {
  const weekday = calendarDateToPickerDate(calendarDate).getDay();
  return calendarDate >= todayInClinic() && BUSINESS_WEEKDAYS.has(weekday);
}
