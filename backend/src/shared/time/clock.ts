/** Single source of "now" so time-dependent rules (e.g. no booking in the past) are testable. */
export interface Clock {
  now: () => Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
