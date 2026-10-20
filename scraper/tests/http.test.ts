import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { BlockedError, PoliteFetcher } from "../lib/http";

let server: Server;
let base = "";
const hits: Array<{ path: string; at: number; ua: string }> = [];

before(async () => {
  server = createServer((req, res) => {
    hits.push({ path: req.url ?? "", at: Date.now(), ua: req.headers["user-agent"] ?? "" });
    if (req.url === "/robots.txt") {
      res.end("User-agent: *\nDisallow: /private\n");
    } else if (req.url === "/forbidden") {
      res.writeHead(403).end("nope");
    } else if (req.url === "/data.json") {
      res.setHeader("Content-Type", "application/json").end('{"ok":true}');
    } else {
      res.end("<html>hello</html>");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

test("obeys robots.txt, reports blocks, spaces requests and identifies itself", async () => {
  const http = new PoliteFetcher(() => {}, { delayMs: { min: 300, max: 400 }, cacheFile: null });

  assert.equal(await http.text(`${base}/page`), "<html>hello</html>");
  assert.deepEqual(await http.json(`${base}/data.json`), { ok: true });

  await assert.rejects(http.text(`${base}/private/area`), (e: unknown) => {
    assert.ok(e instanceof BlockedError);
    assert.match(e.reason, /robots\.txt/);
    return true;
  });
  await assert.rejects(http.text(`${base}/forbidden`), BlockedError);

  // robots.txt is read once; the disallowed page is never requested.
  assert.equal(hits.filter((h) => h.path === "/robots.txt").length, 1);
  assert.equal(hits.filter((h) => h.path.startsWith("/private")).length, 0);

  // Every request carries our user agent and requests are spaced out. Gaps are measured
  // when requests *arrive*, and the first one also opens the connection, so allow 50 ms of
  // network jitter below the 300 ms minimum.
  assert.ok(hits.every((h) => h.ua.startsWith("DiscountKoiBot/")));
  for (let i = 1; i < hits.length; i++) {
    assert.ok(hits[i].at - hits[i - 1].at >= 250, `gap ${hits[i].at - hits[i - 1].at}ms`);
  }
});
