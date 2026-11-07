/**
 * How much now grew from before, as a fraction: 0.5 is up by half. Null when
 * there was nothing before to compare with.
 */
export function growth(now: number, before: number): number | null {
  return before === 0 ? null : (now - before) / before
}
