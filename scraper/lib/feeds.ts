import { load, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

/** One entry from an RSS 2.0 or Atom feed. Text is raw: the pipeline cleans it later. */
export type FeedItem = {
  title: string;
  link: string;
  /** May contain HTML; never rendered as HTML, only cleaned into plain text. */
  description: string;
  /** ISO date-time, if the feed gave one. */
  published?: string;
  categories: string[];
  /** Any other child element's text, by exact tag name (e.g. itch.io's "saleends"). */
  field(name: string): string | undefined;
};

const iso = (value: string | undefined) => {
  if (!value) return undefined;
  const ms = Date.parse(value.trim());
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
};

function childText($: CheerioAPI, el: AnyNode, name: string): string | undefined {
  const child = $(el)
    .children()
    .filter((_, c) => "tagName" in c && c.tagName === name)
    .first();
  return child.length ? child.text().trim() : undefined;
}

/** Parses RSS 2.0 (<item>) and Atom (<entry>) feeds. Unknown formats give an empty list. */
export function parseFeed(xml: string): FeedItem[] {
  const $ = load(xml, { xml: true });
  const rss = $("item").toArray();
  if (rss.length) {
    return rss.map((el) => ({
      title: childText($, el, "title") ?? "",
      link: childText($, el, "link") ?? "",
      description: childText($, el, "description") ?? childText($, el, "content:encoded") ?? "",
      published: iso(childText($, el, "pubDate") ?? childText($, el, "dc:date")),
      categories: $(el)
        .children("category")
        .toArray()
        .map((c) => $(c).text().trim())
        .filter(Boolean),
      field: (name) => childText($, el, name),
    }));
  }
  return $("entry")
    .toArray()
    .map((el) => {
      const links = $(el).children("link").toArray();
      const alternate =
        links.find((l) => !$(l).attr("rel") || $(l).attr("rel") === "alternate") ?? links[0];
      return {
        title: childText($, el, "title") ?? "",
        link: alternate ? ($(alternate).attr("href") ?? "") : "",
        description: childText($, el, "summary") ?? childText($, el, "content") ?? "",
        published: iso(childText($, el, "published") ?? childText($, el, "updated")),
        categories: $(el)
          .children("category")
          .toArray()
          .map((c) => $(c).attr("term") ?? $(c).text().trim())
          .filter(Boolean),
        field: (name: string) => childText($, el, name),
      };
    });
}
