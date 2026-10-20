import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProductFeed } from "../lib/affiliate";
import { buildDealsFile } from "../pipeline";
import { FeedConfigSchema, feedToDeals } from "../sources/affiliate-feeds";
import { SOURCES } from "../sources";

const NOW = new Date("2026-10-20T10:05:00Z");

test("affiliate feeds stay switched off until approved", () => {
  assert.equal(SOURCES.find((s) => s.id === "affiliate-feeds")?.enabled, false);
});

test("Awin-style CSV", () => {
  const csv = [
    "aw_deep_link,product_name,search_price,rrp_price,currency,aw_image_url,brand_name,in_stock",
    'https://www.awin1.com/pclick.php?p=1,"Headphones, wireless",79.99,129.99,CAD,https://images.example/h.jpg,Sony,1',
    "https://www.awin1.com/pclick.php?p=2,Cable,9.99,9.99,CAD,,,1",
  ].join("\n");
  const [first, second] = parseProductFeed(csv);
  assert.deepEqual(first, {
    id: undefined,
    name: "Headphones, wireless",
    url: "https://www.awin1.com/pclick.php?p=1",
    price: 129.99,
    salePrice: 79.99,
    currency: "CAD",
    image: "https://images.example/h.jpg",
    brand: "Sony",
    category: undefined,
    saleEnds: undefined,
    inStock: true,
  });
  assert.equal(second.price, 9.99);
});

test("Impact-style tab-separated catalog with spaced column names", () => {
  const tsv = [
    "Unique Merchant SKU\tProduct Name\tProduct URL\tCurrent Price\tOriginal Price\tCurrency\tStock Availability",
    "A1\tBlender\thttps://goto.example/1\t49.99\t89.99\tCAD\tInStock",
    "A2\tToaster\thttps://goto.example/2\t19.99\t39.99\tCAD\tOutOfStock",
  ].join("\n");
  const rows = parseProductFeed(tsv);
  assert.equal(rows[0].id, "A1");
  assert.equal(rows[0].salePrice, 49.99);
  assert.equal(rows[0].price, 89.99);
  assert.equal(rows[1].inStock, false);
});

test("CJ XML", () => {
  const xml = `<?xml version="1.0"?><cj-api><products>
    <product><name>Running shoes</name><buy-url>https://www.anrdoezrs.net/click-1</buy-url>
      <price>120.00</price><sale-price>84.00</sale-price><retail-price>130.00</retail-price>
      <currency>CAD</currency><image-url>https://img.example/s.jpg</image-url><manufacturer-name>Brand</manufacturer-name>
      <in-stock>yes</in-stock></product>
  </products></cj-api>`;
  const [p] = parseProductFeed(xml);
  assert.equal(p.name, "Running shoes");
  assert.equal(p.url, "https://www.anrdoezrs.net/click-1");
  assert.equal(p.salePrice, 84);
  assert.equal(p.price, 130);
  assert.equal(p.brand, "Brand");
});

test("Rakuten XML: nested <URL><product> doesn't count as a product", () => {
  const xml = `<merchandiser><header><merchantName>Shop</merchantName></header>
    <product product_id="9" name="Winter jacket" sku_number="J-1" manufacturer_name="Maker">
      <category><primary>Clothing</primary></category>
      <URL><product>https://click.linksynergy.com/link?id=1</product><productImage>https://img.example/j.jpg</productImage></URL>
      <price currency="CAD"><sale end_date="2026-10-31">149.99</sale><retail>249.99</retail></price>
      <brand>Maker</brand>
    </product></merchandiser>`;
  const items = parseProductFeed(xml);
  assert.equal(items.length, 1);
  assert.deepEqual(
    { ...items[0] },
    {
      id: "9",
      name: "Winter jacket",
      url: "https://click.linksynergy.com/link?id=1",
      price: 249.99,
      salePrice: 149.99,
      currency: "CAD",
      image: "https://img.example/j.jpg",
      brand: "Maker",
      category: "Clothing",
      saleEnds: "2026-10-31",
      inStock: true,
    },
  );
});

test("Google Shopping-style XML (g: namespace, '19.99 CAD' prices, effective-date range)", () => {
  const xml = `<rss xmlns:g="http://base.google.com/ns/1.0"><channel><item>
    <g:id>55</g:id><g:title>Desk lamp</g:title><g:link>https://shop.example/lamp?aff=1</g:link>
    <g:price>59.99 CAD</g:price><g:sale_price>29.99 CAD</g:sale_price>
    <g:sale_price_effective_date>2026-10-01T00:00-0400/2026-10-25T23:59-0400</g:sale_price_effective_date>
    <g:availability>in stock</g:availability></item></channel></rss>`;
  const [p] = parseProductFeed(xml);
  assert.equal(p.name, "Desk lamp");
  assert.equal(p.price, 59.99);
  assert.equal(p.salePrice, 29.99);
  assert.equal(p.currency, "CAD");
  assert.equal(p.saleEnds, "2026-10-25");
});

test("feedToDeals keeps real discounts only, biggest first, marked as affiliate", () => {
  const feed = FeedConfigSchema.parse({ id: "shop", store: "Shop", network: "awin", maxItems: 2 });
  const products = parseProductFeed(
    [
      "aw_deep_link,product_name,search_price,rrp_price,currency,in_stock",
      "https://a.example/1,Five off,95,100,CAD,1",
      "https://a.example/2,Half off,50,100,CAD,1",
      "https://a.example/3,Thirty off,70,100,CAD,1",
      "https://a.example/4,Euro,10,100,EUR,1",
      "https://a.example/5,Sold out,10,100,CAD,0",
      "https://a.example/6,Twenty off,80,100,CAD,1",
      "javascript:alert(1),Evil,1,100,CAD,1",
    ].join("\n"),
  );
  const raw = feedToDeals(products, feed);
  assert.deepEqual(
    raw.map((d) => d.title),
    ["Evil", "Half off"],
  );
  // The pipeline still refuses the javascript: link, so only the safe deal survives.
  const { file } = buildDealsFile(
    null,
    [{ id: "affiliate-feeds", name: "a", status: "ok", raw }],
    NOW,
  );
  assert.equal(file.deals.length, 1);
  const [deal] = file.deals;
  assert.equal(deal.affiliate, true);
  assert.equal(deal.productName, "Half off");
  assert.deepEqual(deal.dealType, ["online"]);
  assert.equal(deal.location, "ships-to-ontario");
});
