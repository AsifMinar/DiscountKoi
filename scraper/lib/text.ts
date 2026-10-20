import { createHash } from "node:crypto";
import { load } from "cheerio";

/*
 * Everything scraped is untrusted. These helpers turn it into plain, safe values
 * before it's saved: no HTML, no scripts, no odd characters, only web links.
 */

// Control characters and invisible formatting characters (zero-width spaces, bidi overrides).
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g;

/**
 * HTML → plain text: drops tags (and the contents of <script>/<style>), decodes
 * entities like &amp;, collapses whitespace and trims to `max` characters.
 */
export function cleanText(input: string | undefined | null, max: number): string {
  if (!input) return "";
  let text = input;
  if (/[<&]/.test(text)) {
    const $ = load(`<div>${text}</div>`, null, false);
    $("script, style, noscript, template, iframe, object").remove();
    // Keep words from separate block elements apart: "<p>a</p><p>b</p>" → "a b".
    $("br, p, div, li, h1, h2, h3, h4, h5, h6, tr").after(" ");
    text = $.root().text();
    // A second pass catches tags that were entity-encoded (&lt;b&gt;) and only appeared after decoding.
    if (/[<>]/.test(text)) text = text.replace(/<[^>]*>/g, " ");
  }
  text = text.normalize("NFC").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Returns the URL only if it's a plain http(s) link; otherwise undefined. */
export function safeUrl(input: string | undefined | null, base?: string): string | undefined {
  if (!input) return undefined;
  try {
    const url = new URL(input.trim(), base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** "$1,299.99" → 1299.99, "CA$ 5" → 5. Anything unreadable → undefined. */
export function parsePrice(input: string | number | undefined | null): number | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input === "number")
    return Number.isFinite(input) && input >= 0 ? round2(input) : undefined;
  const match = /\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?/.exec(input.replace(/\s/g, ""));
  if (!match) return undefined;
  const value = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(value) ? round2(value) : undefined;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Percent saved, rounded; undefined unless the sale price really is lower. */
export function percentOff(original?: number, sale?: number): number | undefined {
  if (original === undefined || sale === undefined || original <= 0 || sale >= original)
    return undefined;
  const pct = Math.round(((original - sale) / original) * 100);
  return pct >= 1 ? Math.min(pct, 100) : undefined;
}

/** Stable id from source + url + title, so the same deal gets the same id every day. */
export function dealId(source: string, url: string, title: string): string {
  return createHash("sha256").update(`${source}\n${url}\n${title}`).digest("hex").slice(0, 16);
}

/** Lowercase, accents removed: "Café" → "cafe". Used for keyword matching. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** "No Frills" → "No Frills'", "Metro" → "Metro's". For names like "Food Basics' site". */
export function possessive(name: string): string {
  const trimmed = name.trim();
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}
