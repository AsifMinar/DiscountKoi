import { load, type CheerioAPI } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { csvToObjects } from "./csv";
import { parsePrice } from "./text";

/*
 * Reads affiliate product feeds (the product lists networks give approved publishers)
 * in the common shapes: CSV or tab-separated (Awin, Impact, CJ), CJ and Rakuten XML,
 * and Google Shopping-style XML (which many networks also offer).
 *
 * Every network names its columns differently ("aw_deep_link", "BUYURL", "Product URL",
 * <URL><product>…), so column names are squashed ("Product URL" → "producturl") and
 * looked up in the alias lists below. Text is returned raw; the pipeline cleans it.
 */

export type FeedProduct = {
  id?: string;
  name: string;
  /** The affiliate (tracking) link to the product. */
  url: string;
  /** Regular price. */
  price?: number;
  salePrice?: number;
  currency?: string;
  image?: string;
  brand?: string;
  category?: string;
  /** YYYY-MM-DD the sale ends, if the feed says. */
  saleEnds?: string;
  /** False only when the feed clearly says it's out of stock. */
  inStock: boolean;
};

export type FeedFormat = "csv" | "tsv" | "xml";

// Column names, squashed, in order of preference.
const ALIASES = {
  id: [
    "awproductid",
    "sku",
    "id",
    "productid",
    "uniquemerchantsku",
    "merchantproductid",
    "skunumber",
  ],
  name: ["productname", "name", "title"],
  url: [
    "awdeeplink",
    "buyurl",
    "clickurl",
    "trackinglink",
    "urlproduct",
    "producturl",
    "link",
    "deeplink",
    "url",
  ],
  sale: ["saleprice", "pricesale", "currentprice", "searchprice"],
  regular: [
    "rrpprice",
    "retailprice",
    "priceretail",
    "originalprice",
    "productpriceold",
    "listprice",
    "price",
    "storeprice",
  ],
  currency: ["currency", "pricecurrency", "currencycode"],
  image: ["awimageurl", "merchantimageurl", "imageurl", "imagelink", "urlproductimage", "image"],
  brand: ["brandname", "brand", "manufacturername", "manufacturer"],
  category: [
    "merchantcategory",
    "categoryname",
    "advertisercategory",
    "categoryprimary",
    "producttype",
    "category",
  ],
  ends: ["pricesaleenddate", "saleenddate", "enddate", "salepriceeffectivedate"],
  stock: ["instock", "availability", "stockavailability"],
} as const;

const squash = (key: string) =>
  key
    .replace(/^[a-z]+:/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function pick(row: Map<string, string>, names: readonly string[]): [string, string] | undefined {
  for (const name of names) {
    const value = row.get(name)?.trim();
    if (value) return [name, value];
  }
  return undefined;
}

/** "19.99 CAD" → "CAD". */
const currencyIn = (text?: string) => /\b([A-Z]{3})\b/.exec(text ?? "")?.[1];

/** First YYYY-MM-DD in the text; for Google's "start/end" ranges, the end. */
function endDay(text?: string): string | undefined {
  if (!text) return undefined;
  const part = text.includes("/") ? text.split("/").pop()! : text;
  return /(\d{4}-\d{2}-\d{2})/.exec(part)?.[1];
}

function toProduct(row: Map<string, string>): FeedProduct | undefined {
  const name = pick(row, ALIASES.name)?.[1];
  const url = pick(row, ALIASES.url)?.[1];
  if (!name || !url) return undefined;

  const sale = pick(row, ALIASES.sale);
  const regular = pick(
    row,
    ALIASES.regular.filter((n) => n !== sale?.[0]),
  );
  let salePrice = parsePrice(sale?.[1]);
  let price = parsePrice(regular?.[1]);
  // Only one price: that's what it costs now.
  if (salePrice === undefined && price !== undefined) [salePrice, price] = [price, undefined];

  const stock = pick(row, ALIASES.stock)?.[1];
  return {
    id: pick(row, ALIASES.id)?.[1],
    name,
    url,
    price,
    salePrice,
    currency:
      pick(row, ALIASES.currency)?.[1]?.toUpperCase() ?? currencyIn(sale?.[1] ?? regular?.[1]),
    image: pick(row, ALIASES.image)?.[1],
    brand: pick(row, ALIASES.brand)?.[1],
    category: pick(row, ALIASES.category)?.[1],
    saleEnds: endDay(pick(row, ALIASES.ends)?.[1]),
    inStock: !stock || !/^(?:0|no|n|false|out ?of ?stock|outofstock|sold ?out)$/i.test(stock),
  };
}

/** Flattens one XML record: <price><sale end_date="…">5</sale></price> → "pricesale", "pricesaleenddate". */
function flattenXml($: CheerioAPI, el: Element, prefix = "", into = new Map<string, string>()) {
  for (const [attr, value] of Object.entries(el.attribs ?? {})) {
    const key = squash(prefix + attr);
    if (!into.has(key)) into.set(key, value);
  }
  for (const child of el.children as AnyNode[]) {
    if (child.type !== "tag") continue;
    const name = (child as Element).name.replace(/^[a-z]+:/i, "");
    const hasElements = (child as Element).children.some((c) => c.type === "tag");
    if (hasElements) {
      flattenXml($, child as Element, `${prefix}${name}.`, into);
    } else {
      const key = squash(prefix + name);
      const text = $(child).text();
      if (!into.has(key)) into.set(key, text);
      for (const [attr, value] of Object.entries((child as Element).attribs ?? {})) {
        const attrKey = squash(`${prefix}${name}.${attr}`);
        if (!into.has(attrKey)) into.set(attrKey, value);
      }
    }
  }
  return into;
}

function guessFormat(text: string): FeedFormat {
  const start = text.replace(/^﻿/, "").trimStart();
  if (start.startsWith("<")) return "xml";
  const newline = start.indexOf("\n");
  const firstLine = newline === -1 ? start : start.slice(0, newline);
  return firstLine.split("\t").length > firstLine.split(",").length ? "tsv" : "csv";
}

/** Reads a whole feed. Rows without a name or link are skipped. */
export function parseProductFeed(
  text: string,
  format: FeedFormat = guessFormat(text),
): FeedProduct[] {
  let rows: Array<Map<string, string>>;
  if (format === "xml") {
    const $ = load(text, { xml: true });
    const tag = ["item", "product", "entry"].find((t) => $(t).length > 0);
    rows = tag
      ? $(tag)
          // Rakuten nests <URL><product> inside each <product>: only take the outer ones.
          .filter((_, el) => $(el).parents(tag).length === 0)
          .toArray()
          .map((el) => flattenXml($, el as Element))
      : [];
  } else {
    rows = csvToObjects(text, format === "tsv" ? "\t" : ",").map(
      (obj) => new Map(Object.entries(obj).map(([k, v]) => [squash(k), v])),
    );
  }
  return rows.map(toProduct).filter((p): p is FeedProduct => p !== undefined);
}
