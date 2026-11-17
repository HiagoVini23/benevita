import { describe, expect, it } from 'vitest';
import {
  addDays,
  clinicDateTimeToUtc,
  clinicDayRange,
  isValidCalendarDate,
  toClinicParts,
} from './clinic-time.ts';

describe('clinic time (America/Sao_Paulo)', () => {
  it('converts clinic wall-clock time to UTC', () => {
    expect(clinicDateTimeToUtc('2026-11-20', '14:00').toISOString()).toBe(
      '2026-11-20T17:00:00.000Z',
    );
  });

  it('reads a UTC instant as clinic date, time and ISO weekday', () => {
    expect(toClinicParts(new Date('2026-11-21T01:30:00.000Z'))).toEqual({
      date: '2026-11-20',
      time: '22:30',
      weekday: 5,
    });
  });

  it('round-trips between clinic time and UTC', () => {
    const instant = clinicDateTimeToUtc('2026-03-02', '08:30');
    expect(toClinicParts(instant)).toMatchObject({ date: '2026-03-02', time: '08:30' });
  });

  it('builds the UTC range of a clinic day', () => {
    const { start, end } = clinicDayRange('2026-11-20');
    expect(start.toISOString()).toBe('2026-11-20T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-21T03:00:00.000Z');
  });

  it('adds days across month boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('validates calendar dates', () => {
    expect(isValidCalendarDate('2026-02-28')).toBe(true);
    expect(isValidCalendarDate('2026-02-30')).toBe(false);
    expect(isValidCalendarDate('20-11-2026')).toBe(false);
  });
});
