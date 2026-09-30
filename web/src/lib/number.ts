export function parseNonNegativeInt(value: string): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function parseNonNegativeFloat(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function parseInteger(value: string): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : 0;
}

export function parsePositiveInt(value: string): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function parseIntInRange(value: string, min: number, max: number): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// Probability rules must be greater than 0 (a 0% chance rule is pointless — just
// remove it) and no more than 1 (100%).
export function clampProbability(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0.05, n)) : 0.05;
}
