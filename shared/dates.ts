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

/** True for a real calendar day written as YYYY-MM-DD. */
export const isIsoDay = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** The YYYY-MM-DD `days` after (or before, if negative) another one. */
export const addDays = (isoDay: string, days: number) =>
  new Date(Date.parse(`${isoDay}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Whole days from one YYYY-MM-DD to another (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

const monthDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});
const dayOnly = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", day: "numeric" });

/** "Oct 22–28", or "Oct 29 – Nov 4" across months (YYYY-MM-DD in, calendar days). */
export function weekLabel(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  return s.getUTCMonth() === e.getUTCMonth()
    ? `${monthDay.format(s)}–${dayOnly.format(e)}`
    : `${monthDay.format(s)} – ${monthDay.format(e)}`;
}
