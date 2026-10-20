import robotsParser from "robots-parser";

type Robots = ReturnType<typeof robotsParser>;

export type RobotsVerdict = { allowed: true } | { allowed: false; reason: string };

/** Fetches a robots.txt file; returns its HTTP status and body (or throws on network failure). */
export type RobotsFetch = (url: string) => Promise<{ status: number; body: string }>;

/**
 * robots.txt rules per website, read once per run, following RFC 9309:
 *  - 2xx: obey the file (including Crawl-delay),
 *  - 4xx (e.g. no robots.txt): everything is allowed,
 *  - 5xx or no answer: assume nothing is allowed.
 */
export class RobotsCache {
  private files = new Map<string, Promise<Robots | "unreachable">>();

  constructor(
    private readonly userAgent: string,
    private readonly fetchRobots: RobotsFetch,
    private readonly onCrawlDelay: (host: string, ms: number) => void,
    private readonly log: (message: string) => void = () => {},
  ) {}

  async check(url: string): Promise<RobotsVerdict> {
    const robots = await this.forOrigin(new URL(url).origin);
    if (robots === "unreachable") return { allowed: false, reason: "robots.txt unreachable" };
    return robots.isAllowed(url, this.userAgent) === false
      ? { allowed: false, reason: "disallowed by robots.txt" }
      : { allowed: true };
  }

  private forOrigin(origin: string) {
    let robots = this.files.get(origin);
    if (!robots) {
      robots = this.load(origin);
      this.files.set(origin, robots);
    }
    return robots;
  }

  private async load(origin: string): Promise<Robots | "unreachable"> {
    const robotsUrl = `${origin}/robots.txt`;
    try {
      const { status, body } = await this.fetchRobots(robotsUrl);
      if (status >= 500) {
        this.log(`robots.txt ${origin}: HTTP ${status}, treating the site as off-limits`);
        return "unreachable";
      }
      const ok = status >= 200 && status < 300;
      const robots = robotsParser(robotsUrl, ok ? body : "");
      const delay = robots.getCrawlDelay(this.userAgent);
      if (delay) this.onCrawlDelay(new URL(origin).host, delay * 1000);
      this.log(
        `robots.txt ${origin}: ${ok ? "loaded" : `HTTP ${status}, everything allowed`}` +
          (delay ? ` (Crawl-delay ${delay}s)` : ""),
      );
      return robots;
    } catch (error) {
      this.log(
        `robots.txt ${origin}: no answer (${(error as Error).message}), treating as off-limits`,
      );
      return "unreachable";
    }
  }
}
