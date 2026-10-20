import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Conditional-request cache. For each page we keep its ETag / Last-Modified and body.
 * Next time we send If-None-Match / If-Modified-Since; if the site answers
 * "304 Not Modified" we reuse the stored body, which is cheaper for both sides.
 */

type Entry = {
  etag?: string;
  lastModified?: string;
  contentType?: string;
  body: string;
  savedAt: string;
};

const MAX_ENTRY_BYTES = 2 * 1024 * 1024;

export class HttpCache {
  private dirty = false;

  private constructor(
    private readonly file: string | null,
    private readonly entries: Record<string, Entry>,
    private readonly maxAgeDays: number,
  ) {}

  /** Loads the cache file. A missing or damaged file just means an empty cache. */
  static async load(file: string | null, maxAgeDays: number): Promise<HttpCache> {
    if (!file) return new HttpCache(null, {}, maxAgeDays);
    try {
      const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
      const entries =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, Entry>)
          : {};
      return new HttpCache(file, entries, maxAgeDays);
    } catch {
      return new HttpCache(file, {}, maxAgeDays);
    }
  }

  /** Headers that ask the server "has this changed since last time?" */
  validators(url: string): Record<string, string> {
    const entry = this.entries[url];
    const headers: Record<string, string> = {};
    if (entry?.etag) headers["if-none-match"] = entry.etag;
    if (entry?.lastModified) headers["if-modified-since"] = entry.lastModified;
    return headers;
  }

  get(url: string): Entry | undefined {
    return this.entries[url];
  }

  /** Stores a page, but only if the server gave us something to revalidate with. */
  store(url: string, page: Omit<Entry, "savedAt">) {
    if (!page.etag && !page.lastModified) return;
    if (Buffer.byteLength(page.body) > MAX_ENTRY_BYTES) return;
    this.entries[url] = { ...page, savedAt: new Date().toISOString() };
    this.dirty = true;
  }

  /** Writes the cache to disk (dropping entries older than maxAgeDays). */
  async save() {
    if (!this.file) return;
    const cutoff = Date.now() - this.maxAgeDays * 86_400_000;
    for (const [url, entry] of Object.entries(this.entries)) {
      if (Date.parse(entry.savedAt) < cutoff) {
        delete this.entries[url];
        this.dirty = true;
      }
    }
    if (!this.dirty) return;
    await mkdir(dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp`;
    await writeFile(temp, JSON.stringify(this.entries));
    await rename(temp, this.file);
    this.dirty = false;
  }
}
