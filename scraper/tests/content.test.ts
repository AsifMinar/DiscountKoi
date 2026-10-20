import assert from "node:assert/strict";
import { test } from "node:test";
import { csvToObjects, parseCsv } from "../lib/csv";
import { parseFeed } from "../lib/feeds";
import { extractJsonLd, extractOpenGraph } from "../lib/structured";

const page = (...blocks: string[]) =>
  `<html><head>${blocks.map((b) => `<script type="application/ld+json">${b}</script>`).join("")}</head></html>`;

test("JSON-LD Product with an Offer, ImageObject and brand object", () => {
  const [item] = extractJsonLd(
    page(
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Wireless earbuds",
        image: { "@type": "ImageObject", url: "/img/buds.jpg" },
        brand: { "@type": "Brand", name: "Acme" },
        offers: {
          "@type": "Offer",
          price: "49.99",
          priceCurrency: "CAD",
          priceValidUntil: "2026-10-31T23:59:59",
        },
      }),
    ),
    "https://shop.example/p/1",
  );
  assert.deepEqual(
    { ...item },
    {
      kind: "product",
      name: "Wireless earbuds",
      description: undefined,
      url: undefined,
      image: "https://shop.example/img/buds.jpg",
      brand: "Acme",
      price: 49.99,
      currency: "CAD",
      validFrom: undefined,
      validThrough: "2026-10-31",
      seller: undefined,
    },
  );
});

test("AggregateOffer lowPrice, @graph, ItemList and strikethrough prices", () => {
  const items = extractJsonLd(
    page(
      JSON.stringify({
        "@graph": [
          { "@type": "WebSite", name: "ignored" },
          {
            "@type": ["Product"],
            name: "Kettle",
            offers: { "@type": "AggregateOffer", lowPrice: 19, highPrice: 29 },
          },
        ],
      }),
      JSON.stringify({
        "@type": "ItemList",
        itemListElement: [
          {
            "@type": "ListItem",
            item: {
              "@type": "http://schema.org/Product",
              name: "Toaster",
              offers: {
                "@type": "Offer",
                priceSpecification: [
                  { "@type": "UnitPriceSpecification", price: 24.99, priceCurrency: "CAD" },
                  {
                    "@type": "UnitPriceSpecification",
                    priceType: "https://schema.org/StrikethroughPrice",
                    price: 39.99,
                  },
                ],
              },
            },
          },
        ],
      }),
    ),
    "https://shop.example/",
  );
  assert.deepEqual(
    items.map((i) => [i.name, i.price, i.originalPrice]),
    [
      ["Kettle", 19, undefined],
      ["Toaster", 24.99, 39.99],
    ],
  );
});

test("broken JSON-LD blocks are skipped without losing the good ones", () => {
  const items = extractJsonLd(
    page("{ not json", JSON.stringify({ "@type": "Offer", name: "Deal", price: 0 })),
    "https://x.example/",
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].isFree, true);
});

test("Events: free flag and dates", () => {
  const [event] = extractJsonLd(
    page(
      JSON.stringify({
        "@type": "MusicEvent",
        name: "Concert",
        startDate: "2026-11-02T19:00",
        isAccessibleForFree: true,
      }),
    ),
    "https://x.example/",
  );
  assert.deepEqual(
    [event.kind, event.isFree, event.validFrom, event.validThrough],
    ["event", true, "2026-11-02", "2026-11-02"],
  );
});

test("only http(s) image and page links survive", () => {
  const [item] = extractJsonLd(
    page(
      JSON.stringify({
        "@type": "Product",
        name: "X",
        url: "javascript:alert(1)",
        image: "data:image/png;base64,AAA",
      }),
    ),
    "https://x.example/",
  );
  assert.equal(item.url, undefined);
  assert.equal(item.image, undefined);
});

test("Open Graph and product price tags", () => {
  const og = extractOpenGraph(
    `<meta property="og:title" content="Big sale"><meta property="og:image" content="/s.png">
     <meta name="twitter:description" content="Up to 50% off"><meta property="product:price:amount" content="12.50">
     <meta property="product:price:currency" content="CAD">`,
    "https://x.example/page",
  );
  assert.deepEqual(og, {
    title: "Big sale",
    description: "Up to 50% off",
    image: "https://x.example/s.png",
    url: undefined,
    siteName: undefined,
    price: 12.5,
    currency: "CAD",
  });
});

test("RSS 2.0: titles, links, escaped HTML descriptions, dates, categories, custom fields", () => {
  const [item] = parseFeed(`<?xml version="1.0"?><rss version="2.0"><channel><item>
    <title>Free Public Skating</title><link>https://city.example/news/skate</link>
    <description>&lt;p&gt;Free skating &amp;amp; fun&lt;/p&gt;</description>
    <pubDate>Fri, 16 Oct 2026 13:55:00 GMT</pubDate><category>Play</category><category>Move</category>
    <saleends>Sun, 25 Oct 2026 22:59:00 GMT</saleends><plainTitle>Plain</plainTitle>
  </item></channel></rss>`);
  assert.equal(item.title, "Free Public Skating");
  assert.equal(item.link, "https://city.example/news/skate");
  assert.equal(item.description, "<p>Free skating &amp; fun</p>");
  assert.equal(item.published, "2026-10-16T13:55:00.000Z");
  assert.deepEqual(item.categories, ["Play", "Move"]);
  assert.equal(item.field("saleends"), "Sun, 25 Oct 2026 22:59:00 GMT");
  assert.equal(item.field("plainTitle"), "Plain");
  assert.equal(item.field("missing"), undefined);
});

test("Atom: alternate link, summary and dates", () => {
  const [entry] = parseFeed(`<feed xmlns="http://www.w3.org/2005/Atom"><entry>
    <title>Deal</title><link rel="self" href="https://x.example/self"/><link href="https://x.example/deal"/>
    <summary>Half off</summary><updated>2026-10-19T08:00:00Z</updated><category term="sale"/>
  </entry></feed>`);
  assert.deepEqual(
    [entry.title, entry.link, entry.description, entry.published, entry.categories],
    ["Deal", "https://x.example/deal", "Half off", "2026-10-19T08:00:00.000Z", ["sale"]],
  );
});

test("CSV: quotes, commas, escaped quotes, line breaks, CRLF and a byte-order mark", () => {
  const text =
    '﻿Name,Address,Note\r\n"Food Bank","3, rue Mary","He said ""hi"""\r\nB,"line 1\nline 2",\r\n';
  assert.deepEqual(parseCsv(text), [
    ["Name", "Address", "Note"],
    ["Food Bank", "3, rue Mary", 'He said "hi"'],
    ["B", "line 1\nline 2", ""],
  ]);
  assert.deepEqual(csvToObjects(text)[0], {
    Name: "Food Bank",
    Address: "3, rue Mary",
    Note: 'He said "hi"',
  });
});
