/** Sudbury's time zone. Every "today" in the project means today in Sudbury. */
export const SUDBURY_TZ = "America/Toronto";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: SUDBURY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hourFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: SUDBURY_TZ,
  hour: "numeric",
  hourCycle: "h23",
});

/** The date in Sudbury as YYYY-MM-DD. */
export function torontoDate(date: Date = new Date()): string {
  return dayFormat.format(date);
}

/** The hour (0–23) in Sudbury. */
export function torontoHour(date: Date = new Date()): number {
  return Number(hourFormat.format(date));
}

/** Whole days from one YYYY-MM-DD to another (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
