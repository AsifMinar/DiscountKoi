import robotsParser from "robots-parser";
import { CONFIG } from "../config";

/**
 * Thrown when a site says no: robots.txt disallows the page, or the server answers
 * 401/403/429 (typical of bot protection). The source is then reported as
 * "skipped (blocked)" and is never retried or worked around.
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

type Robots = ReturnType<typeof robotsParser>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The only way sources reach the internet. It:
 *  - reads each site's robots.txt once and refuses disallowed pages,
 *  - waits 2–3 seconds (or the site's Crawl-delay, if longer) between requests to a site,
 *  - sends a clear user agent,
 *  - fetches pages one at a time, never in parallel.
 */
export class PoliteFetcher {
  private robots = new Map<string, Promise<Robots | "disallow-all">>();
  private crawlDelayMs = new Map<string, number>();
  private lastRequest = new Map<string, number>();
  private browser: import("playwright").Browser | null = null;
  requestCount = 0;

  constructor(
    private readonly log: (message: string) => void = () => {},
    /** Only tests shorten this; real runs always use CONFIG.delayMs. */
    private readonly delayMs: { min: number; max: number } = CONFIG.delayMs,
  ) {}

  /** Fetches a page as text. Throws BlockedError if the site says no. */
  async text(url: string, accept = "text/html,application/xhtml+xml"): Promise<string> {
    const res = await this.request(url, accept);
    return res.text();
  }

  /** Fetches and parses JSON. */
  async json<T = unknown>(url: string): Promise<T> {
    const res = await this.request(url, "application/json");
    return (await res.json()) as T;
  }

  /**
   * Loads a page in headless Chromium and returns the rendered HTML. Only for pages
   * that need JavaScript; plain `text()` is much lighter for everything else.
   */
  async rendered(url: string, waitForSelector?: string): Promise<string> {
    await this.assertAllowed(url);
    await this.waitTurn(url);
    if (!this.browser) {
      const { chromium } = await import("playwright");
      this.browser = await chromium.launch();
    }
    const context = await this.browser.newContext({ userAgent: CONFIG.userAgent, locale: "en-CA" });
    try {
      const page = await context.newPage();
      const res = await page.goto(url, {
        timeout: CONFIG.requestTimeoutMs,
        waitUntil: "domcontentloaded",
      });
      this.requestCount++;
      const status = res?.status() ?? 0;
      if (status === 401 || status === 403 || status === 429) {
        throw new BlockedError(url, `HTTP ${status}`);
      }
      if (waitForSelector)
        await page.waitForSelector(waitForSelector, { timeout: CONFIG.requestTimeoutMs });
      return await page.content();
    } finally {
      await context.close();
    }
  }

  /** Closes the browser if one was started. */
  async close() {
    await this.browser?.close();
    this.browser = null;
  }

  private async request(url: string, accept: string): Promise<Response> {
    await this.assertAllowed(url);
    await this.waitTurn(url);
    this.requestCount++;
    const res = await fetch(url, {
      headers: {
        "User-Agent": CONFIG.userAgent,
        Accept: accept,
        "Accept-Language": "en-CA,en;q=0.8",
      },
      signal: AbortSignal.timeout(CONFIG.requestTimeoutMs),
      redirect: "follow",
    });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      throw new BlockedError(url, `HTTP ${res.status}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    // A redirect may land on another site; that site's robots.txt applies too.
    if (res.url && new URL(res.url).origin !== new URL(url).origin)
      await this.assertAllowed(res.url);
    return res;
  }

  /** Throws BlockedError unless robots.txt allows our user agent to fetch this URL. */
  private async assertAllowed(url: string) {
    const robots = await this.robotsFor(url);
    if (robots === "disallow-all") throw new BlockedError(url, "robots.txt unreachable");
    if (robots.isAllowed(url, CONFIG.userAgent) === false) {
      throw new BlockedError(url, "disallowed by robots.txt");
    }
  }

  private robotsFor(url: string) {
    const { origin } = new URL(url);
    let robots = this.robots.get(origin);
    if (!robots) {
      robots = this.loadRobots(origin);
      this.robots.set(origin, robots);
    }
    return robots;
  }

  /**
   * Follows RFC 9309: a missing robots.txt (4xx) means everything is allowed; a server
   * error or no answer means we must assume nothing is.
   */
  private async loadRobots(origin: string): Promise<Robots | "disallow-all"> {
    const robotsUrl = `${origin}/robots.txt`;
    await this.waitTurn(robotsUrl);
    this.requestCount++;
    try {
      const res = await fetch(robotsUrl, {
        headers: { "User-Agent": CONFIG.userAgent },
        signal: AbortSignal.timeout(CONFIG.requestTimeoutMs),
      });
      if (res.status >= 500) return "disallow-all";
      const body = res.ok ? await res.text() : "";
      this.log(
        `robots.txt ${origin}: ${res.ok ? "loaded" : `HTTP ${res.status}, treating as allow-all`}`,
      );
      const robots = robotsParser(robotsUrl, body);
      this.crawlDelayMs.set(
        new URL(origin).host,
        (robots.getCrawlDelay(CONFIG.userAgent) ?? 0) * 1000,
      );
      return robots;
    } catch {
      return "disallow-all";
    }
  }

  /** Waits so requests to one site are 2–3 s apart (or longer if robots.txt asks). */
  private async waitTurn(url: string) {
    const { host } = new URL(url);
    const { min, max } = this.delayMs;
    const gap = Math.max(this.crawlDelayMs.get(host) ?? 0, min + Math.random() * (max - min));
    const last = this.lastRequest.get(host);
    if (last !== undefined) {
      const wait = last + gap - Date.now();
      if (wait > 0) await sleep(wait);
    }
    this.lastRequest.set(host, Date.now());
  }
}
