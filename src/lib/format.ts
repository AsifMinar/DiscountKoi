import { SUDBURY_TZ, daysBetween } from "@shared/dates";
import { unitLabel, type Unit } from "@shared/units";

export { SUDBURY_TZ, daysBetween, torontoDate } from "@shared/dates";

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
function moneyFormat(currency: string, whole: boolean) {
  const key = `${currency}-${whole}`;
  let format = formatters.get(key);
  if (!format) {
    format = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
      maximumFractionDigits: whole ? 0 : 2,
      minimumFractionDigits: whole ? 0 : 2,
    });
    formatters.set(key, format);
  }
  return format;
}

/** "$8.99" or "$1,249" in Canadian dollars; US prices show as "US$2.00". */
export function formatPrice(value: number, currency: "CAD" | "USD" = "CAD"): string {
  return moneyFormat(currency, Number.isInteger(value)).format(value);
}

/** "$1.37/L", "$0.88/100 g", "$0.33 each". Tiny amounts keep a third decimal ("$0.004/100 mL"). */
export function formatUnitPrice(
  value: number,
  unit: Unit,
  currency: "CAD" | "USD" = "CAD",
): string {
  const digits = value > 0 && value < 0.1 ? 3 : 2;
  const amount = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return `${amount}${unitLabel(unit)}`;
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
