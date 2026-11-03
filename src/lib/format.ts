import { SUDBURY_TZ, daysBetween } from "@shared/dates";

export { daysBetween, torontoDate } from "@shared/dates";

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

const formatters = new Map<string, Intl.NumberFormat>();
function moneyFormat(currency: string, digits: number) {
  const key = `${currency}-${digits}`;
  let format = formatters.get(key);
  if (!format) {
    format = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    });
    formatters.set(key, format);
  }
  return format;
}

/** "$8.99" or "$1,249" in Canadian dollars; US prices show as "US$2.00". */
export function formatPrice(value: number, currency: "CAD" | "USD" = "CAD"): string {
  return moneyFormat(currency, Number.isInteger(value) ? 0 : 2).format(value);
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

/** "1 deal", "1,204 deals". */
export const plural = (n: number, word: string) =>
  `${n.toLocaleString("en-CA")} ${word}${n === 1 ? "" : "s"}`;
