import { describe, expect, it } from 'vitest';
import {
  formatCalendarDate,
  formatDate,
  formatDateTime,
  formatTime,
  todayInClinic,
} from './clinic-time.ts';

describe('clinic time formatting (America/Sao_Paulo)', () => {
  const instant = '2026-11-20T17:30:00.000Z';

  it('formats UTC instants in the clinic time zone', () => {
    expect(formatDate(instant)).toBe('20/11/2026');
    expect(formatTime(instant)).toBe('14:30');
    expect(formatDateTime(instant)).toBe('20/11/2026 às 14:30');
  });

  it('uses the clinic day even when it differs from the UTC day', () => {
    expect(formatDateTime('2026-11-21T01:00:00.000Z')).toBe('20/11/2026 às 22:00');
    expect(todayInClinic(new Date('2026-11-21T01:00:00.000Z'))).toBe('2026-11-20');
  });

  it('formats calendar dates without time zone shifts', () => {
    expect(formatCalendarDate('1990-05-10')).toBe('10/05/1990');
  });
});
