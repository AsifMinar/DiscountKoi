/** Sudbury's time zone. All dates on the site are shown in this zone. */
export const SUDBURY_TZ = "America/Toronto";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: SUDBURY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in Sudbury as YYYY-MM-DD. */
export function torontoDate(date: Date = new Date()): string {
  return dayFormat.format(date);
}

const updatedFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: SUDBURY_TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Tue, Oct. 20, 6:04 a.m." in Sudbury time. */
export function formatUpdated(iso: string): string {
  return updatedFormat.format(new Date(iso));
}

const shortDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "Oct. 24, 2026" for a YYYY-MM-DD calendar date. */
export function formatDay(isoDay: string): string {
  return shortDate.format(new Date(`${isoDay}T00:00:00Z`));
}

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const moneyWhole = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

/** "$8.99", or "$1,249" for whole dollars. */
export function formatPrice(value: number): string {
  return Number.isInteger(value) ? moneyWhole.format(value) : money.format(value);
}

/** Whole days from one YYYY-MM-DD to another (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** "Ends today", "Ends tomorrow", "Ends in 4 days", or "Ends Nov. 30, 2026" when far off. */
export function endsLabel(endDate: string, today: string): string {
  const days = daysBetween(today, endDate);
  if (days < 0) return "Ended";
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  if (days <= 30) return `Ends in ${days} days`;
  return `Ends ${formatDay(endDate)}`;
}
