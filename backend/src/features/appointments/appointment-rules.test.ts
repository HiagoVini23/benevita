import { describe, expect, it } from 'vitest';
import { businessSlotsOf, findSlotViolation } from './appointment-rules.ts';

// Monday 2026-11-16, 09:00 in São Paulo.
const NOW = new Date('2026-11-16T12:00:00.000Z');
const at = (iso: string) => new Date(iso);

describe('findSlotViolation', () => {
  it('accepts a future, aligned slot inside business hours', () => {
    expect(findSlotViolation(at('2026-11-16T13:30:00.000Z'), NOW)).toBeNull(); // Mon 10:30
  });

  it.each([
    ['08:00, the first slot', '2026-11-17T11:00:00.000Z'],
    ['17:30, the last slot', '2026-11-17T20:30:00.000Z'],
  ])('accepts the business hours boundary (%s)', (_case, iso) => {
    expect(findSlotViolation(at(iso), NOW)).toBeNull();
  });

  it.each([
    ['15 minutes past the hour', '2026-11-17T13:15:00.000Z'],
    ['seconds', '2026-11-17T13:00:30.000Z'],
  ])('rejects a misaligned slot (%s)', (_case, iso) => {
    expect(findSlotViolation(at(iso), NOW)).toBe('INVALID_SLOT');
  });

  it.each([
    ['07:30, before opening', '2026-11-17T10:30:00.000Z'],
    ['18:00, at closing', '2026-11-17T21:00:00.000Z'],
    ['Saturday', '2026-11-21T13:00:00.000Z'],
    ['Sunday', '2026-11-22T13:00:00.000Z'],
  ])('rejects a slot outside business hours (%s)', (_case, iso) => {
    expect(findSlotViolation(at(iso), NOW)).toBe('OUTSIDE_BUSINESS_HOURS');
  });

  it.each([
    ['earlier today', '2026-11-16T11:30:00.000Z'],
    ['exactly now', '2026-11-16T12:00:00.000Z'],
    ['last week', '2026-11-10T13:00:00.000Z'],
  ])('rejects a slot in the past (%s)', (_case, iso) => {
    expect(findSlotViolation(at(iso), NOW)).toBe('IN_PAST');
  });
});

describe('businessSlotsOf', () => {
  it('lists the 20 half-hour slots of a weekday, from 08:00 to 17:30', () => {
    const slots = businessSlotsOf('2026-11-17');

    expect(slots).toHaveLength(20);
    expect(slots[0]?.toISOString()).toBe('2026-11-17T11:00:00.000Z');
    expect(slots.at(-1)?.toISOString()).toBe('2026-11-17T20:30:00.000Z');
  });

  it('has no slots on weekends', () => {
    expect(businessSlotsOf('2026-11-21')).toEqual([]);
    expect(businessSlotsOf('2026-11-22')).toEqual([]);
  });
});
