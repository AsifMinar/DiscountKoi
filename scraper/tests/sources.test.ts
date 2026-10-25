import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDealsFile, type SourceRun } from "../pipeline";
import { downtownSpecialsToDeals } from "../sources/downtown-sudbury";
import { itchFeedToDeals } from "../sources/itch-sales";
import { ontarioParksToDeals } from "../sources/ontario-parks";
import { cityNewsToDeals } from "../sources/sudbury-city-news";
import {
  foodProgramsToDeals,
  FOOD_ACCESS_PAGE,
  OPEN_DATA_CREDIT,
} from "../sources/sudbury-food-programs";
import type { RawDeal } from "../sources/types";

const NOW = new Date("2026-10-20T10:05:00Z"); // 6:05 AM in Sudbury

const run = (
  id: string,
  raw: RawDeal[],
  now = NOW,
  previous: Parameters<typeof buildDealsFile>[0] = null,
) => buildDealsFile(previous, [{ id, name: id, status: "ok", raw } satisfies SourceRun], now);

const rss = (...items: string[]) =>
  `<?xml version="1.0"?><rss version="2.0"><channel>${items.map((i) => `<item>${i}</item>`).join("")}</channel></rss>`;

test("City news: only releases about free things, as Free deals with the publish date", () => {
  const xml = rss(
    "<title>New, Free Program for Older Adults</title><link>https://www.greatersudbury.ca/news/a</link><description>&lt;p&gt;A free virtual program.&lt;/p&gt;</description><pubDate>Mon, 19 Oct 2026 14:00:00 GMT</pubDate>",
    "<title>Online Voting Now Open</title><link>https://www.greatersudbury.ca/news/b</link><description>Vote until Oct 26.</description><pubDate>Fri, 16 Oct 2026 13:55:00 GMT</pubDate>",
    "<title>Free public skating, Oct 1</title><link>https://www.greatersudbury.ca/news/c</link><pubDate>Thu, 01 Oct 2026 12:00:00 GMT</pubDate>",
  );
  const raw = cityNewsToDeals(xml);
  assert.equal(raw.length, 2);
  const { file } = run("sudbury-city-news", raw);
  // The Oct 1 post is older than the 7-day freebie window, so it's already gone.
  assert.deepEqual(
    file.deals.map((d) => d.title),
    ["New, Free Program for Older Adults"],
  );
  const [deal] = file.deals;
  assert.deepEqual(deal.dealType, ["free"]);
  assert.equal(deal.description, "A free virtual program.");
  assert.equal(deal.scrapedAt, "2026-10-19T14:00:00.000Z");
  assert.equal(deal.attribution, "City of Greater Sudbury news release");
});

test("Ontario Parks: titles unchanged, no post text copied, Crown copyright credit", () => {
  const raw = ontarioParksToDeals(
    rss(
      "<title>Free day-use at Ontario Parks this Saturday!</title><link>https://blog.ontarioparks.ca/free-day/</link><description>Long post body…</description><pubDate>Mon, 19 Oct 2026 14:00:00 +0000</pubDate>",
      "<title>Creatures of the night</title><link>https://blog.ontarioparks.ca/night/</link><description>Bats.</description>",
    ),
    NOW,
  );
  assert.equal(raw.length, 1);
  assert.equal(raw[0].title, "Free day-use at Ontario Parks this Saturday!");
  assert.doesNotMatch(raw[0].description ?? "", /Long post body/);
  assert.equal(raw[0].attribution, "© King's Printer for Ontario, 2026. Ontario Parks blog.");
  assert.equal(run("ontario-parks", raw).file.deals[0].location, "ontario");
});

test("itch.io: USD prices, sale end date, 100% off becomes Free, skips 0% and non-USD", () => {
  const item = (title: string, pct: number, currency: string, price: string, full: string) =>
    `<title>${title} [${pct}% Off]</title><plainTitle>${title}</plainTitle><link>https://dev.itch.io/${title.replace(/\W/g, "")}</link>` +
    `<price>${price}</price><currency>${currency}</currency><discountpercent>${pct}</discountpercent><fullPrice>${full}</fullPrice>` +
    `<saleends>Sun, 25 Oct 2026 22:59:00 GMT</saleends><imageurl>https://img.itch.zone/a.png</imageurl><description>Fun game</description>`;
  const raw = itchFeedToDeals(
    rss(
      item("Half Off Game", 50, "USD", "$2.00", "$4.00"),
      item("Free Game", 100, "USD", "$0.00", "$5.00"),
      item("Full Price", 0, "USD", "$4.95", "$4.95"),
      item("Pound Game", 50, "GBP", "£2.00", "£4.00"),
    ),
  );
  assert.deepEqual(
    raw.map((r) => r.title),
    ["Half Off Game", "Free Game"],
  );
  const { file } = run("itch-io-sales", raw);
  const half = file.deals.find((d) => d.title === "Half Off Game")!;
  const free = file.deals.find((d) => d.title === "Free Game")!;
  assert.deepEqual(
    [half.salePrice, half.originalPrice, half.discountPercent, half.currency],
    [2, 4, 50, "USD"],
  );
  assert.equal(half.endDate, "2026-10-25"); // 6:59 PM in Sudbury
  assert.equal(half.location, "ships-to-ontario");
  assert.equal(half.imageUrl, undefined, "itch.io blocks hotlinked covers");
  assert.ok(free.dealType.includes("free") && free.dealType.includes("online"));
});

test("Downtown Sudbury: nothing published yet gives 0 deals", () => {
  const html = `<script type="application/ld+json">{"@type":"Organization","name":"Downtown Sudbury BIA"}</script>
    <script type="application/ld+json">{"@type":"WebSite","name":"Downtown Sudbury BIA"}</script>`;
  assert.deepEqual(downtownSpecialsToDeals(html, "https://downtownsudbury.com/specials"), []);
});

test("Downtown Sudbury: specials become short excerpts with BIA credit", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@type": "Offer",
    name: "2-for-1 lattes",
    description: "x".repeat(400),
    price: 5,
    priceCurrency: "CAD",
    validThrough: "2026-10-30",
    seller: { "@type": "LocalBusiness", name: "Corner Café" },
    url: "https://downtownsudbury.com/specials#latte",
  })}</script>`;
  const [raw] = downtownSpecialsToDeals(html, "https://downtownsudbury.com/specials");
  assert.equal(raw.store, "Corner Café");
  assert.ok((raw.description ?? "").length <= 160, "brief excerpt only");
  const [deal] = run("downtown-sudbury", [raw]).file.deals;
  assert.deepEqual(
    [deal.endDate, deal.attribution, deal.location],
    ["2026-10-30", "via Downtown Sudbury BIA", "sudbury"],
  );
});

test("Food programs: food banks, meals and Good Food Box only, never contact details, never aged out", () => {
  const csv = [
    "X,Y,OBJECTID,Category,Address,City,Name,Phone,Email,Services,Website",
    '1,2,1,Food Bank,123 Elm St,Greater Sudbury,Elm Food Bank,705-555-0100,person@example.com,"Emergency food, weekly.",https://elm.example and https://other.example',
    "1,2,2,Meal Program,45 Pine St,Greater Sudbury,Hot Meals,705-555-0101,meals@example.com,Free hot lunch.,",
    "1,2,3,Good Food Box,9 Oak Ave,Greater Sudbury,GFB Depot,,,Affordable produce boxes.,https://gfb.example",
    "1,2,4,Community Garden,1 Garden Rd,Greater Sudbury,Garden,,,Grow food.,https://garden.example",
  ].join("\n");
  const raw = foodProgramsToDeals(csv, "Wed, 29 Jul 2026 12:05:04 GMT");
  assert.deepEqual(
    raw.map((r) => r.title),
    [
      "Free food bank · 123 Elm St",
      "Free meal program · 45 Pine St",
      "Good Food Box (affordable produce) · 9 Oak Ave",
    ],
  );
  assert.equal(raw[0].url, "https://elm.example/");
  assert.equal(raw[1].url, FOOD_ACCESS_PAGE);
  assert.ok(raw.every((r) => r.category === "food-help"));
  const everything = JSON.stringify(raw);
  assert.doesNotMatch(everything, /705-555|@example\.com/, "no phone numbers or emails");

  const first = run("sudbury-food-programs", raw);
  assert.equal(first.file.deals.length, 3);
  assert.ok(first.file.deals.every((d) => d.ongoing && d.attribution === OPEN_DATA_CREDIT));
  assert.ok(
    first.file.deals.find((d) => d.title.startsWith("Free food bank"))!.dealType.includes("free"),
  );
  // Still listed 60 days later: ongoing programs never age out.
  const later = run("sudbury-food-programs", raw, new Date("2026-12-19T11:05:00Z"), first.file);
  assert.equal(later.file.deals.length, 3);
});
