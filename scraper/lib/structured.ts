import { load } from "cheerio";
import { parsePrice, safeUrl } from "./text";

/*
 * Structured data: the machine-readable product/offer/event descriptions many sites
 * embed for search engines (schema.org JSON-LD and Open Graph tags). Reading these is
 * far sturdier than CSS selectors, which break whenever a site is redesigned.
 * Everything here works on HTML we already fetched; it never makes requests.
 */

export type StructuredItem = {
  kind: "product" | "offer" | "event";
  name?: string;
  description?: string;
  url?: string;
  image?: string;
  brand?: string;
  seller?: string;
  price?: number;
  /** The "was" price, when the site marks a strikethrough / list price. */
  originalPrice?: number;
  currency?: string;
  /** YYYY-MM-DD */
  validFrom?: string;
  /** YYYY-MM-DD */
  validThrough?: string;
  isFree?: boolean;
};

export type OpenGraph = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  price?: number;
  currency?: string;
};

type Node = Record<string, unknown>;

const asArray = (value: unknown): unknown[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];

/** "Product", ["Product"], "schema:Product" or "https://schema.org/Product" → ["product"] */
const typesOf = (node: Node) =>
  asArray(node["@type"]).map((t) => String(t).split(/[/:#]/).pop()!.toLowerCase());

const str = (value: unknown): string | undefined => {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const node = value as Node;
    return str(node.name) ?? str(node.url) ?? str(node["@value"]);
  }
  return undefined;
};

const firstUrl = (value: unknown, base: string): string | undefined => {
  for (const item of asArray(value)) {
    const candidate =
      typeof item === "string"
        ? item
        : (str((item as Node)?.url) ?? str((item as Node)?.contentUrl));
    const url = safeUrl(candidate, base);
    if (url) return url;
  }
  return undefined;
};

const day = (value: unknown): string | undefined => {
  const text = str(value);
  if (!text) return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  return match ? match[1] : undefined;
};

/** Reads price fields from an Offer / AggregateOffer (and Google's strikethrough price spec). */
function readOffer(offer: Node, item: StructuredItem) {
  const types = typesOf(offer);
  item.price ??= parsePrice(
    str(offer.price) ?? (types.includes("aggregateoffer") ? str(offer.lowPrice) : undefined),
  );
  item.currency ??= str(offer.priceCurrency);
  item.validFrom ??= day(offer.validFrom);
  item.validThrough ??= day(offer.priceValidUntil) ?? day(offer.validThrough);
  item.seller ??= str(offer.seller);
  for (const spec of asArray(offer.priceSpecification) as Node[]) {
    if (!spec || typeof spec !== "object") continue;
    const priceType = String(spec.priceType ?? "").toLowerCase();
    const value = parsePrice(str(spec.price));
    if (/strikethroughprice|listprice|msrp/.test(priceType)) item.originalPrice ??= value;
    else item.price ??= value;
    item.currency ??= str(spec.priceCurrency);
  }
}

function toItem(node: Node, kind: StructuredItem["kind"], base: string): StructuredItem {
  const item: StructuredItem = {
    kind,
    name: str(node.name),
    description: str(node.description),
    url: firstUrl(node.url, base),
    image: firstUrl(node.image, base),
    brand: str(node.brand),
  };
  if (kind === "offer") {
    readOffer(node, item);
    const offered = node.itemOffered as Node | undefined;
    if (offered && typeof offered === "object") {
      item.name ??= str(offered.name);
      item.description ??= str(offered.description);
      item.image ??= firstUrl(offered.image, base);
      item.brand ??= str(offered.brand);
    }
  } else {
    for (const offer of asArray(node.offers) as Node[]) {
      if (offer && typeof offer === "object") readOffer(offer, item);
    }
  }
  if (kind === "event") {
    item.validFrom ??= day(node.startDate);
    item.validThrough ??= day(node.endDate) ?? day(node.startDate);
    item.isFree = node.isAccessibleForFree === true || node.isAccessibleForFree === "true";
  }
  if (item.price === 0) item.isFree = true;
  return item;
}

/** All schema.org Products, Offers and Events found in the page's JSON-LD blocks. */
export function extractJsonLd(html: string, baseUrl: string): StructuredItem[] {
  const $ = load(html);
  const items: StructuredItem[] = [];
  const seen = new Set<unknown>();

  const visit = (value: unknown, depth: number) => {
    if (depth > 8 || !value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((v) => visit(v, depth + 1));
      return;
    }
    const node = value as Node;
    const types = typesOf(node);
    if (types.includes("product")) items.push(toItem(node, "product", baseUrl));
    else if (types.includes("offer") || types.includes("aggregateoffer"))
      items.push(toItem(node, "offer", baseUrl));
    else if (types.some((t) => t.endsWith("event"))) items.push(toItem(node, "event", baseUrl));
    // Containers that often hold the interesting nodes.
    visit(node["@graph"], depth + 1);
    visit(node.itemListElement, depth + 1);
    visit(node.item, depth + 1);
    visit(node.mainEntity, depth + 1);
    visit(node.hasPart, depth + 1);
  };

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      visit(JSON.parse(raw), 0);
    } catch {
      // Broken JSON-LD on someone else's page: skip that block, keep the rest.
    }
  });
  return items;
}

/** Open Graph / Twitter card tags, plus Open Graph product price tags. */
export function extractOpenGraph(html: string, baseUrl: string): OpenGraph {
  const $ = load(html);
  const meta = (...keys: string[]) => {
    for (const key of keys) {
      const value = $(`meta[property="${key}"], meta[name="${key}"]`).first().attr("content");
      if (value?.trim()) return value.trim();
    }
    return undefined;
  };
  return {
    title: meta("og:title", "twitter:title"),
    description: meta("og:description", "twitter:description", "description"),
    image: safeUrl(meta("og:image", "og:image:url", "twitter:image"), baseUrl),
    url: safeUrl(meta("og:url"), baseUrl),
    siteName: meta("og:site_name"),
    price: parsePrice(meta("product:price:amount", "og:price:amount")),
    currency: meta("product:price:currency", "og:price:currency"),
  };
}
