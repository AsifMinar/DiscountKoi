import type { IncomingHttpHeaders } from "node:http";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import { request } from "undici";
import { CONFIG } from "../config";
import { HttpCache } from "./engine/http-cache";
import { RETRYABLE_STATUS, backoffMs, isTransientError, retryAfterMs } from "./engine/retry";
import { RobotsCache } from "./engine/robots";
import { HostScheduler, sleep } from "./engine/scheduler";

/**
 * Thrown when a site says no: robots.txt disallows the page, it answers 401/403, or it
 * rate-limits us (429) without a short Retry-After. The source is then reported as
 * "skipped (blocked)". Nothing ever tries to get around it.
 */
export class BlockedError extends Error {
  constructor(
    readonly url: string,
    readonly reason: string,
  ) {
    super(`Blocked: ${reason} (${url})`);
    this.name = "BlockedError";
  }
}

/** One fetched page. `fromCache` means the site said "304 Not Modified". */
export type FetchedPage = {
  url: string;
  status: number;
  body: string;
  contentType?: string;
  lastModified?: string;
  fromCache: boolean;
};

export type FetcherOptions = {
  delayMs?: { min: number; max: number };
  maxConcurrency?: number;
  maxRetries?: number;
  backoffBaseMs?: number;
  maxRetryAfterMs?: number;
  timeoutMs?: number;
  maxBodyBytes?: number;
  /** Path of the ETag/Last-Modified cache, or null to switch caching off. */
  cacheFile?: string | null;
};

type RawResponse = { status: number; headers: IncomingHttpHeaders; body?: Buffer };

const MAX_REDIRECTS = 5;

const header = (headers: IncomingHttpHeaders, name: string) => {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * The only way sources reach the internet. Every request:
 *  - is checked against the site's robots.txt first (redirect targets too),
 *  - waits its turn in a per-site queue (2–3 s apart, or the site's Crawl-delay),
 *  - says who we are with one honest user agent,
 *  - retries network hiccups and 5xx answers with exponential backoff,
 *  - honours Retry-After, and treats 401/403/429 as "blocked", never retried,
 *  - reuses unchanged pages via ETag / Last-Modified (304 Not Modified),
 *  - times out, and refuses oversized responses.
 */
export class PoliteFetcher {
  requestCount = 0;
  readonly stats = { notModified: 0, retries: 0 };

  private readonly options: Required<FetcherOptions>;
  private readonly scheduler: HostScheduler;
  private readonly robots: RobotsCache;
  private readonly cache: Promise<HttpCache>;

  constructor(
    private readonly log: (message: string) => void = () => {},
    options: FetcherOptions = {},
  ) {
    this.options = {
      delayMs: CONFIG.delayMs,
      maxConcurrency: CONFIG.maxConcurrency,
      maxRetries: CONFIG.maxRetries,
      backoffBaseMs: CONFIG.backoffBaseMs,
      maxRetryAfterMs: CONFIG.maxRetryAfterMs,
      timeoutMs: CONFIG.requestTimeoutMs,
      maxBodyBytes: CONFIG.maxBodyBytes,
      cacheFile: CONFIG.httpCacheFile,
      ...options,
    };
    this.scheduler = new HostScheduler({
      minDelayMs: this.options.delayMs.min,
      maxDelayMs: this.options.delayMs.max,
      maxConcurrency: this.options.maxConcurrency,
    });
    this.robots = new RobotsCache(
      CONFIG.userAgent,
      (url) => this.fetchRobots(url),
      (host, ms) => this.scheduler.setCrawlDelay(host, ms),
      log,
    );
    this.cache = HttpCache.load(this.options.cacheFile, CONFIG.httpCacheMaxAgeDays);
  }

  /** Fetches a page as text. Throws BlockedError if the site says no. */
  async text(url: string, accept = "text/html,application/xhtml+xml"): Promise<string> {
    return (await this.fetch(url, accept)).body;
  }

  /** Fetches and parses JSON. */
  async json<T = unknown>(url: string): Promise<T> {
    return JSON.parse((await this.fetch(url, "application/json")).body) as T;
  }

  /** Fetches a page and returns its details (final URL, Last-Modified, whether it was cached). */
  async fetch(url: string, accept = "*/*"): Promise<FetchedPage> {
    const cache = await this.cache;
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await this.assertAllowed(current);
      const res = await this.getWithRetries(current, accept, cache.validators(current));

      if (res.status === 304) {
        const cached = cache.get(current);
        if (!cached) throw new Error(`HTTP 304 without a cached copy for ${current}`);
        this.stats.notModified++;
        return {
          url: current,
          status: 200,
          body: cached.body,
          contentType: cached.contentType,
          lastModified: cached.lastModified,
          fromCache: true,
        };
      }

      if (res.status >= 300 && res.status < 400) {
        const location = header(res.headers, "location");
        if (!location) throw new Error(`HTTP ${res.status} without a Location for ${current}`);
        const next = new URL(location, current);
        if (next.protocol !== "https:" && next.protocol !== "http:") {
          throw new Error(`Refusing to follow a redirect to ${next.protocol} (${current})`);
        }
        // The next hop is checked against its own site's robots.txt at the top of the loop.
        current = next.toString();
        continue;
      }

      if (res.status < 200 || res.status >= 300)
        throw new Error(`HTTP ${res.status} for ${current}`);

      const body = decodeBody(res.body ?? Buffer.alloc(0), res.headers, this.options.maxBodyBytes);
      const page: FetchedPage = {
        url: current,
        status: res.status,
        body,
        contentType: header(res.headers, "content-type"),
        lastModified: header(res.headers, "last-modified"),
        fromCache: false,
      };
      cache.store(current, {
        etag: header(res.headers, "etag"),
        lastModified: page.lastModified,
        contentType: page.contentType,
        body,
      });
      return page;
    }
    throw new Error(`Too many redirects starting at ${url}`);
  }

  /** Saves the page cache. */
  async close() {
    await (await this.cache).save();
  }

  private async assertAllowed(url: string) {
    const verdict = await this.robots.check(url);
    if (!verdict.allowed) throw new BlockedError(url, verdict.reason);
  }

  /** One GET, retried on network errors and 5xx, honouring Retry-After; 401/403/429 block. */
  private async getWithRetries(
    url: string,
    accept: string,
    extraHeaders: Record<string, string>,
  ): Promise<RawResponse> {
    const host = new URL(url).host;
    const { maxRetries, backoffBaseMs, maxRetryAfterMs } = this.options;

    for (let attempt = 0; ; attempt++) {
      let res: RawResponse;
      try {
        res = await this.scheduler.run(host, () => this.send(url, accept, extraHeaders));
      } catch (error) {
        if (attempt < maxRetries && isTransientError(error)) {
          await this.pause(url, backoffMs(attempt, backoffBaseMs), (error as Error).message);
          continue;
        }
        throw error;
      }

      if (res.status === 401 || res.status === 403)
        throw new BlockedError(url, `HTTP ${res.status}`);

      if (res.status === 429 || RETRYABLE_STATUS.has(res.status)) {
        const after = retryAfterMs(header(res.headers, "retry-after"));
        const canWait = after === undefined ? res.status !== 429 : after <= maxRetryAfterMs;
        if (attempt < maxRetries && canWait) {
          await this.pause(url, after ?? backoffMs(attempt, backoffBaseMs), `HTTP ${res.status}`);
          continue;
        }
        if (res.status === 429) throw new BlockedError(url, "rate limited (HTTP 429)");
        throw new Error(`HTTP ${res.status} for ${url} (after ${attempt + 1} tries)`);
      }
      return res;
    }
  }

  private async pause(url: string, ms: number, why: string) {
    this.stats.retries++;
    this.log(`retrying ${url} in ${(ms / 1000).toFixed(1)}s (${why})`);
    await sleep(ms);
  }

  /** A single HTTP GET with our user agent and a timeout. Reads the body only for 2xx. */
  private async send(
    url: string,
    accept: string,
    extraHeaders: Record<string, string>,
  ): Promise<RawResponse> {
    const started = Date.now();
    this.requestCount++;
    const res = await request(url, {
      method: "GET",
      headers: {
        "user-agent": CONFIG.userAgent,
        accept,
        "accept-language": "en-CA,en;q=0.8",
        ...extraHeaders,
      },
      signal: AbortSignal.timeout(this.options.timeoutMs),
      headersTimeout: this.options.timeoutMs,
      bodyTimeout: this.options.timeoutMs,
    });
    let body: Buffer | undefined;
    if (res.statusCode >= 200 && res.statusCode < 300) {
      body = await readCapped(res.body, this.options.maxBodyBytes);
    } else {
      await res.body.dump();
    }
    this.log(`GET ${res.statusCode} ${Date.now() - started}ms ${url}`);
    return { status: res.statusCode, headers: res.headers, body };
  }

  /** robots.txt itself: our user agent, redirects followed, one retry for network hiccups. */
  private async fetchRobots(robotsUrl: string): Promise<{ status: number; body: string }> {
    let current = robotsUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const host = new URL(current).host;
      let res: RawResponse;
      // Some servers answer 406 to a strict "text/plain", so accept anything (it's a text file).
      const accept = "text/plain, */*;q=0.8";
      try {
        res = await this.scheduler.run(host, () => this.send(current, accept, {}));
      } catch (error) {
        if (!isTransientError(error)) throw error;
        res = await this.scheduler.run(host, () => this.send(current, accept, {}));
      }
      const location = header(res.headers, "location");
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current).toString();
        continue;
      }
      const body = res.body ? decodeBody(res.body, res.headers, this.options.maxBodyBytes) : "";
      return { status: res.status, body };
    }
    return { status: 404, body: "" };
  }
}

/** Reads a response body, refusing anything over `max` bytes. */
async function readCapped(body: AsyncIterable<Buffer>, max: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of body) {
    size += chunk.length;
    if (size > max) throw new Error(`Response is larger than ${max} bytes; refusing it`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Undoes gzip/br/deflate (capped against zip bombs) and decodes the declared charset. */
function decodeBody(raw: Buffer, headers: IncomingHttpHeaders, max: number): string {
  const encoding = header(headers, "content-encoding")?.toLowerCase();
  const limits = { maxOutputLength: max };
  const data =
    encoding === "gzip" || encoding === "x-gzip"
      ? gunzipSync(raw, limits)
      : encoding === "br"
        ? brotliDecompressSync(raw, limits)
        : encoding === "deflate"
          ? inflateSync(raw, limits)
          : raw;
  const charset = /charset="?([^";]+)/i.exec(header(headers, "content-type") ?? "")?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset.trim()).decode(data);
  } catch {
    return new TextDecoder().decode(data);
  }
}
