// Serves the static export in /out under /discount-koi/, the same way GitHub Pages will.
// Usage: npm run build && npm run preview  →  http://localhost:4173/discount-koi/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve("out");
const BASE = process.env.PAGES_BASE_PATH ?? "/discount-koi";
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

async function resolveFile(urlPath) {
  // Block path traversal: the final path must stay inside /out.
  const target = normalize(join(ROOT, decodeURIComponent(urlPath)));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
  for (const candidate of [
    target,
    join(target, "index.html"),
    `${target}.html`,
    windowsSegmentPath(target),
  ]) {
    if (!candidate) continue;
    const info = await stat(candidate).catch(() => null);
    if (info?.isFile()) return candidate;
  }
  return null;
}

// Next.js 16's static export, when run on Windows, writes prefetch files for nested
// pages as `__next.about/__PAGE__.txt` instead of `__next.about.__PAGE__.txt` (it builds
// the name from a backslash path). Linux builds (like GitHub Actions) are correct, so this
// fallback only keeps local previews on Windows free of 404s.
function windowsSegmentPath(target) {
  const match = /^(.*[\\/])__next\.([^\\/]+)\.txt$/.exec(target);
  if (!match) return null;
  const [first, ...rest] = match[2].split(".");
  return rest.length ? join(match[1], `__next.${first}`, ...rest) + ".txt" : null;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/" || url.pathname === BASE) {
    res.writeHead(302, { Location: `${BASE}/` }).end();
    return;
  }
  const inside = url.pathname.startsWith(`${BASE}/`) ? url.pathname.slice(BASE.length) : null;
  const file = inside === null ? null : await resolveFile(inside);
  const path = file ?? join(ROOT, "404.html");
  const body = await readFile(path).catch(() => Buffer.from("Not found"));
  res.writeHead(file ? 200 : 404, {
    "Content-Type": TYPES[extname(path)] ?? "application/octet-stream",
  });
  res.end(body);
}).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}${BASE}/`));
