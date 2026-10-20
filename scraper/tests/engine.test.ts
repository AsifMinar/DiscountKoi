import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { gzipSync } from "node:zlib";
import { BlockedError, PoliteFetcher, type FetcherOptions } from "../lib/http";

/*
 * The engine against a real local web server. "127.0.0.1" and "localhost" reach the
 * same server but count as two different websites, so cross-site rules can be tested.
 */

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let server: Server;
let port = 0;
let routes: Record<string, Handler> = {};
let hits: Array<{ host: string; path: string; at: number; headers: IncomingMessage["headers"] }> =
  [];

const ip = (path: string) => `http://127.0.0.1:${port}${path}`;
const named = (path: string) => `http://localhost:${port}${path}`;

before(async () => {
  server = createServer((req, res) => {
    const host = (req.headers.host ?? "").split(":")[0];
    hits.push({ host, path: req.url ?? "", at: Date.now(), headers: req.headers });
    const handler = routes[`${host}${req.url}`] ?? routes[req.url ?? ""];
    if (handler) handler(req, res);
    else res.writeHead(404).end("not found");
  });
  // No host given: listen on all interfaces so both 127.0.0.1 and localhost (::1) work.
  await new Promise<void>((resolve) => server.listen(0, resolve));
  port = (server.address() as AddressInfo).port;
});

after(() => server.close());

beforeEach(() => {
  routes = {};
  hits = [];
});

const fast: FetcherOptions = {
  delayMs: { min: 20, max: 30 },
  backoffBaseMs: 20,
  maxRetries: 2,
  timeoutMs: 2000,
  cacheFile: null,
};
const fetcher = (options: FetcherOptions = {}) =>
  new PoliteFetcher(() => {}, { ...fast, ...options });
const count = (path: string) => hits.filter((h) => h.path === path).length;

test("no robots.txt (404) means everything is allowed", async () => {
  routes["/page"] = (_q, r) => r.end("ok");
  assert.equal(await fetcher().text(ip("/page")), "ok");
});

test("robots.txt server error means the site is off-limits, and the page is never requested", async () => {
  routes["/robots.txt"] = (_q, r) => r.writeHead(503).end();
  routes["/page"] = (_q, r) => r.end("ok");
  await assert.rejects(fetcher({ maxRetries: 0 }).text(ip("/page")), (e: unknown) => {
    assert.ok(e instanceof BlockedError);
    assert.match(e.reason, /unreachable/);
    return true;
  });
  assert.equal(count("/page"), 0);
});

test("Crawl-delay in robots.txt is honoured between requests", async () => {
  routes["/robots.txt"] = (_q, r) => r.end("User-agent: *\nCrawl-delay: 1\n");
  routes["/a"] = (_q, r) => r.end("a");
  routes["/b"] = (_q, r) => r.end("b");
  const http = fetcher();
  await http.text(ip("/a"));
  await http.text(ip("/b"));
  const [robots, a, b] = hits;
  assert.ok(a.at - robots.at >= 950, `robots→a ${a.at - robots.at}ms`);
  assert.ok(b.at - a.at >= 950, `a→b ${b.at - a.at}ms`);
});

test("5xx answers are retried with backoff, then succeed", async () => {
  let calls = 0;
  routes["/flaky"] = (_q, r) => (++calls < 3 ? r.writeHead(503).end() : r.end("finally"));
  const http = fetcher();
  assert.equal(await http.text(ip("/flaky")), "finally");
  assert.equal(calls, 3);
  assert.equal(http.stats.retries, 2);
});

test("a persistent 500 gives up after the retry limit", async () => {
  routes["/broken"] = (_q, r) => r.writeHead(500).end();
  await assert.rejects(fetcher().text(ip("/broken")), /HTTP 500/);
  assert.equal(count("/broken"), 3); // first try + 2 retries
});

test("Retry-After is honoured", async () => {
  let calls = 0;
  routes["/busy"] = (_q, r) =>
    ++calls === 1 ? r.writeHead(503, { "retry-after": "1" }).end() : r.end("ok");
  await fetcher().text(ip("/busy"));
  const tries = hits.filter((h) => h.path === "/busy");
  assert.ok(tries[1].at - tries[0].at >= 950, `waited ${tries[1].at - tries[0].at}ms`);
});

test("429 without a short Retry-After is 'blocked' and never retried", async () => {
  routes["/limited"] = (_q, r) => r.writeHead(429).end();
  routes["/slow-down"] = (_q, r) => r.writeHead(429, { "retry-after": "3600" }).end();
  await assert.rejects(fetcher().text(ip("/limited")), (e: unknown) => {
    assert.ok(e instanceof BlockedError);
    assert.match(e.reason, /rate limited/);
    return true;
  });
  await assert.rejects(fetcher().text(ip("/slow-down")), BlockedError);
  assert.equal(count("/limited"), 1);
  assert.equal(count("/slow-down"), 1);
});

test("401 and 403 are 'blocked' and never retried", async () => {
  routes["/login"] = (_q, r) => r.writeHead(401).end();
  routes["/nope"] = (_q, r) => r.writeHead(403).end();
  await assert.rejects(fetcher().text(ip("/login")), BlockedError);
  await assert.rejects(fetcher().text(ip("/nope")), BlockedError);
  assert.equal(count("/login") + count("/nope"), 2);
});

test("unchanged pages come back as 304 and are served from the cache (ETag and Last-Modified)", async () => {
  const cacheFile = join(mkdtempSync(join(tmpdir(), "dk-cache-")), "http.json");
  routes["/etag"] = (req, r) =>
    req.headers["if-none-match"] === '"v1"'
      ? r.writeHead(304).end()
      : r.writeHead(200, { etag: '"v1"' }).end("etag body");
  routes["/modified"] = (req, r) =>
    req.headers["if-modified-since"] === "Tue, 20 Oct 2026 10:00:00 GMT"
      ? r.writeHead(304).end()
      : r.writeHead(200, { "last-modified": "Tue, 20 Oct 2026 10:00:00 GMT" }).end("lm body");

  const day1 = fetcher({ cacheFile });
  assert.equal((await day1.fetch(ip("/etag"))).fromCache, false);
  await day1.fetch(ip("/modified"));
  await day1.close(); // saves the cache file

  const day2 = fetcher({ cacheFile });
  const etag = await day2.fetch(ip("/etag"));
  const modified = await day2.fetch(ip("/modified"));
  assert.deepEqual([etag.fromCache, etag.body], [true, "etag body"]);
  assert.deepEqual([modified.fromCache, modified.body], [true, "lm body"]);
  assert.equal(day2.stats.notModified, 2);
});

test("a redirect to another site is checked against that site's robots.txt first", async () => {
  routes["127.0.0.1/go"] = (_q, r) => r.writeHead(302, { location: named("/secret") }).end();
  routes["localhost/robots.txt"] = (_q, r) => r.end("User-agent: *\nDisallow: /secret\n");
  routes["localhost/secret"] = (_q, r) => r.end("should never be fetched");
  await assert.rejects(fetcher().text(ip("/go")), BlockedError);
  assert.equal(hits.filter((h) => h.host === "localhost" && h.path === "/secret").length, 0);
});

test("allowed redirects are followed", async () => {
  routes["/old"] = (_q, r) => r.writeHead(301, { location: "/new" }).end();
  routes["/new"] = (_q, r) => r.end("moved here");
  const page = await fetcher().fetch(ip("/old"));
  assert.equal(page.body, "moved here");
  assert.equal(page.url, ip("/new"));
});

test("redirects to non-web links are refused", async () => {
  routes["/evil"] = (_q, r) => r.writeHead(302, { location: "javascript:alert(1)" }).end();
  await assert.rejects(fetcher().text(ip("/evil")), /Refusing to follow/);
});

test("different sites are fetched side by side; one site's requests stay in line", async () => {
  routes["/slow"] = (_q, r) => setTimeout(() => r.end("done"), 300);
  const http = fetcher();
  const started = Date.now();
  await Promise.all([http.text(ip("/slow")), http.text(named("/slow"))]);
  const parallel = Date.now() - started;
  assert.ok(parallel < 900, `two sites took ${parallel}ms`);

  hits = [];
  routes["/slow-2"] = routes["/slow"];
  const sameSite = fetcher();
  await Promise.all([sameSite.text(ip("/slow")), sameSite.text(ip("/slow-2"))]);
  const [, first, second] = hits; // robots.txt, then the two pages
  assert.ok(second.at - first.at >= 300, "the second request waited for the first to finish");
});

test("oversized responses are refused", async () => {
  routes["/huge"] = (_q, r) => r.end("x".repeat(5000));
  await assert.rejects(fetcher({ maxBodyBytes: 1000 }).text(ip("/huge")), /larger than 1000 bytes/);
});

test("requests that hang time out and are retried, then fail", async () => {
  routes["/hang"] = () => {}; // never answers
  await assert.rejects(fetcher({ timeoutMs: 200, maxRetries: 1 }).text(ip("/hang")));
  assert.equal(count("/hang"), 2);
});

test("gzip responses are decoded and charsets respected", async () => {
  routes["/gz"] = (_q, r) =>
    r.writeHead(200, { "content-encoding": "gzip" }).end(gzipSync(Buffer.from("zipped café")));
  routes["/latin1"] = (_q, r) =>
    r
      .writeHead(200, { "content-type": "text/html; charset=iso-8859-1" })
      .end(Buffer.from([0x63, 0x61, 0x66, 0xe9]));
  const http = fetcher();
  assert.equal(await http.text(ip("/gz")), "zipped café");
  assert.equal(await http.text(ip("/latin1")), "café");
});

test("every request, robots.txt included, uses our honest user agent and nothing browser-like", async () => {
  routes["/robots.txt"] = (_q, r) => r.end("User-agent: *\nAllow: /\n");
  routes["/page"] = (_q, r) => r.end("ok");
  await fetcher().text(ip("/page"));
  for (const hit of hits) {
    assert.match(
      String(hit.headers["user-agent"]),
      /^DiscountKoiBot\/1\.0 \(\+https:\/\/github\.com\//,
    );
    assert.doesNotMatch(String(hit.headers["user-agent"]), /Mozilla|Chrome|Safari/);
    assert.equal(hit.headers["sec-ch-ua"], undefined);
  }
});
