/**
 * Adds a strict Content Security Policy to every page of the static export in ./out.
 *
 * GitHub Pages can't send security headers, so the policy goes in a <meta> tag at the
 * top of <head>. The few inline scripts (Next.js page data, the light/dark theme script)
 * are allowed by their SHA-256 hash, so scripts never need 'unsafe-inline' or
 * 'unsafe-eval': an injected <script> or onclick="…" simply won't run.
 *
 * Runs after `next build` (see "build" in package.json). Running it twice is safe.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "out";

/** SHA-256 hashes ('sha256-…') of every inline <script> in the page, in order, without repeats. */
export function inlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>();
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(attrs)) continue;
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  return [...hashes];
}

/** The policy for one page. */
export function buildPolicy(scriptHashes: string[]): string {
  return [
    "default-src 'self'",
    // Our own files plus this page's hashed inline scripts. No 'unsafe-inline', no 'unsafe-eval'.
    `script-src 'self' ${scriptHashes.join(" ")}`.trim(),
    // React and next-themes set a few inline styles; styles can't run code.
    "style-src 'self' 'unsafe-inline'",
    // Product and retailer thumbnails are hotlinked from store sites, always over https.
    "img-src 'self' https:",
    "font-src 'self'",
    // Only our own deals.json and page data are ever fetched.
    "connect-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const CSP_META = /<meta http-equiv="Content-Security-Policy"[^>]*>/i;

/** Puts the policy meta tag right after <meta charset>, before any script. */
export function applyCsp(html: string): string {
  const clean = html.replace(CSP_META, "");
  const tag = `<meta http-equiv="Content-Security-Policy" content="${buildPolicy(inlineScriptHashes(clean))}"/>`;
  const charset = /<meta charset="utf-8"\s*\/?>/i.exec(clean);
  if (charset) {
    const at = charset.index + charset[0].length;
    return clean.slice(0, at) + tag + clean.slice(at);
  }
  const head = /<head[^>]*>/i.exec(clean);
  if (!head) throw new Error("page has no <head>");
  const at = head.index + head[0].length;
  return clean.slice(0, at) + tag + clean.slice(at);
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/csp-hash.ts")) {
  const files = htmlFiles(OUT_DIR);
  let scripts = 0;
  for (const file of files) {
    const html = applyCsp(readFileSync(file, "utf8"));
    scripts += inlineScriptHashes(html).length;
    writeFileSync(file, html);
  }
  console.log(`CSP added to ${files.length} pages (${scripts} inline scripts hashed).`);
}
