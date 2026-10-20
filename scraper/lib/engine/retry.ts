/**
 * When to retry, and how long to wait. Retrying is only for honest hiccups (dropped
 * connections, a server briefly overloaded). It never changes identity and never
 * ignores a site's own Retry-After.
 */

/** Network-level failures worth one more try. */
const TRANSIENT_ERRORS = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "EPIPE",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

export function isTransientError(error: unknown): boolean {
  const code =
    (error as { code?: string; cause?: { code?: string } })?.code ??
    (error as { cause?: { code?: string } })?.cause?.code;
  if (code && TRANSIENT_ERRORS.has(code)) return true;
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

/** 5xx answers that usually mean "try again shortly". */
export const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

/** Exponential backoff with jitter: ~2 s, ~4 s, ~8 s … for attempt 0, 1, 2 … */
export function backoffMs(attempt: number, baseMs: number): number {
  return baseMs * 2 ** attempt + Math.random() * baseMs;
}

/**
 * Reads a Retry-After header (seconds, or an HTTP date) as milliseconds from now.
 * Returns undefined if it's missing or unreadable.
 */
export function retryAfterMs(header: string | undefined, now = Date.now()): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}
