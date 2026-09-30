export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(month: number, year: number): number {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1] ?? 31;
}

// Formats a season entry's "DD-MM" storage key as a human-readable "<day> <month name>".
export function formatSeasonKey(key: string): string {
  const [dayStr, monthStr] = key.split("-");
  const name = MONTH_NAMES[Number(monthStr) - 1] ?? monthStr;
  return `${Number(dayStr)} ${name}`;
}
