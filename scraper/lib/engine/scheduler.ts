/**
 * Request queue with per-website pacing.
 *
 * - Requests to the same host run one at a time, in order. Each one waits a random
 *   2–3 s (or the host's Crawl-delay, if longer) after the previous one *finished*,
 *   so a slow site automatically gets more breathing room.
 * - Different hosts may run side by side, up to `maxConcurrency` at once.
 */
export class HostScheduler {
  private chains = new Map<string, Promise<unknown>>();
  private lastFinish = new Map<string, number>();
  private crawlDelayMs = new Map<string, number>();
  private active = 0;
  private waiting: Array<() => void> = [];

  constructor(
    private readonly options: { minDelayMs: number; maxDelayMs: number; maxConcurrency: number },
  ) {}

  /** Records a host's robots.txt Crawl-delay so later requests wait at least that long. */
  setCrawlDelay(host: string, ms: number) {
    if (ms > 0) this.crawlDelayMs.set(host, ms);
  }

  /** Runs `task` when it's this host's turn. */
  run<T>(host: string, task: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(host) ?? Promise.resolve();
    const next = previous
      .catch(() => {}) // one failed request must not block the host's queue
      .then(async () => {
        await this.waitForGap(host);
        await this.acquireSlot();
        try {
          return await task();
        } finally {
          this.lastFinish.set(host, Date.now());
          this.releaseSlot();
        }
      });
    this.chains.set(host, next);
    return next;
  }

  private async waitForGap(host: string) {
    const last = this.lastFinish.get(host);
    if (last === undefined) return;
    const { minDelayMs, maxDelayMs } = this.options;
    const politeGap = minDelayMs + Math.random() * (maxDelayMs - minDelayMs);
    const gap = Math.max(politeGap, this.crawlDelayMs.get(host) ?? 0);
    const wait = last + gap - Date.now();
    if (wait > 0) await sleep(wait);
  }

  private acquireSlot(): Promise<void> {
    if (this.active < this.options.maxConcurrency) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.waiting.push(resolve)).then(() => {
      this.active++;
    });
  }

  private releaseSlot() {
    this.active--;
    this.waiting.shift()?.();
  }
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
