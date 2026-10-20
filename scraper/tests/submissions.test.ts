import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildDealsFile } from "../pipeline";
import { manualDealsToDeals } from "../sources/manual-deals";
import { programsToDeals, STUDENT_DISCOUNTS_FILE } from "../sources/student-discounts";
import { pricesFromTitle, rfdFeedToDeals, splitRfdTitle } from "../sources/rfd-hot-deals";
import { SOURCES } from "../sources";
import {
  CATEGORY_OPTIONS,
  FORM_LABELS,
  LOCATION_OPTIONS,
  addManualDeal,
  parseIssueForm,
  submissionToDeal,
} from "../submissions";

const NOW = new Date("2026-10-20T10:05:00Z");
const TODAY = "2026-10-20";

/** An issue body exactly the way GitHub writes it from the form. */
function issueBody(over: Partial<Record<keyof typeof FORM_LABELS, string>> = {}) {
  const values: Record<keyof typeof FORM_LABELS, string> = {
    name: "Chicken breast, boneless skinless",
    store: "No Frills",
    link: "https://www.nofrills.ca/en/deals/flyer",
    originalPrice: "5.99",
    salePrice: "$3.99",
    size: "per lb",
    endDate: "2026-10-28",
    dealType: "In-store",
    category: "Grocery",
    location: "Sudbury",
    confirm:
      "- [X] The information is accurate and comes from a public source (a flyer, a store's website or the store itself).",
    ...over,
  };
  return (Object.keys(FORM_LABELS) as Array<keyof typeof FORM_LABELS>)
    .map((key) => `### ${FORM_LABELS[key]}\n\n${values[key] || "_No response_"}`)
    .join("\n\n");
}

const approve = (over: Parameters<typeof issueBody>[0] = {}) =>
  submissionToDeal(issueBody(over), 42, TODAY);
const errorsOf = (over: Parameters<typeof issueBody>[0]) => {
  const result = approve(over);
  assert.equal(result.ok, false, "expected the submission to be refused");
  return result.ok ? [] : result.errors;
};

/* ---------- The form and the parser agree ---------- */

test("every label the parser expects is in submit-deal.yml, and every dropdown option is known", () => {
  const yaml = readFileSync(".github/ISSUE_TEMPLATE/submit-deal.yml", "utf8");
  const labels = [...yaml.matchAll(/^\s+label: (.+)$/gm)].map((m) => m[1].trim());
  for (const label of Object.values(FORM_LABELS)) assert.ok(labels.includes(label), label);
  const options = (id: string) => {
    const block = yaml.split(/\n  - type: /).find((b) => b.includes(`id: ${id}\n`)) ?? "";
    return [...block.matchAll(/^\s+- "?([^"\n]+)"?$/gm)].map((m) => m[1]);
  };
  assert.deepEqual(options("category").sort(), Object.keys(CATEGORY_OPTIONS).sort());
  assert.deepEqual(options("location").sort(), Object.keys(LOCATION_OPTIONS).sort());
  assert.deepEqual(options("deal_type"), ["Online", "In-store", "Student", "Free"]);
});

test("parseIssueForm reads sections, skipped fields and Windows line endings", () => {
  const { fields, duplicates } = parseIssueForm(
    "### Store or business\r\n\r\nMetro\r\n\r\n### Sale price\r\n\r\n_No response_\r\n",
  );
  assert.equal(fields.get("Store or business"), "Metro");
  assert.equal(fields.get("Sale price"), "");
  assert.deepEqual(duplicates, []);
});

/* ---------- Good submissions ---------- */

test("a normal submission becomes a product deal", () => {
  const result = approve();
  assert.ok(result.ok);
  assert.deepEqual(result.deal, {
    issue: 42,
    title: "Chicken breast, boneless skinless",
    store: "No Frills",
    url: "https://www.nofrills.ca/en/deals/flyer",
    location: "sudbury",
    dealType: ["in-store"],
    category: "grocery",
    originalPrice: 5.99,
    salePrice: 3.99,
    unit: "lb",
    productName: "Chicken breast, boneless skinless",
    endDate: "2026-10-28",
    approvedAt: TODAY,
  });

  // …and flows through the scraper like any other deal.
  const { deals, problems } = manualDealsToDeals({ deals: [result.deal] });
  assert.deepEqual(problems, []);
  const { file } = buildDealsFile(
    null,
    [{ id: "manual-deals", name: "m", status: "ok", raw: deals }],
    NOW,
  );
  assert.equal(file.deals[0].unitPrice, 3.99);
  assert.equal(file.deals[0].discountPercent, 33);
});

test("a free event without price, size or end date, in two deal types", () => {
  const result = approve({
    name: "Free skating at the arena",
    salePrice: "",
    originalPrice: "",
    size: "",
    endDate: "",
    dealType: "In-store, Free",
    category: "Entertainment & Events",
  });
  assert.ok(result.ok);
  assert.deepEqual(result.deal.dealType, ["in-store", "free"]);
  assert.equal(result.deal.productName, undefined);
  assert.equal(result.deal.endDate, undefined);
});

test("a package size stays a size", () => {
  const result = approve({ size: "4 L", name: "Milk 2%" });
  assert.ok(result.ok);
  assert.equal(result.deal.size, "4 L");
  assert.equal(result.deal.unit, undefined);
});

/* ---------- Malicious and broken submissions ---------- */

test("HTML and scripts are stripped to plain text", () => {
  const result = approve({
    name: '<img src=x onerror="alert(1)"><b>Cheap</b> <script>steal()</script>TVs',
    store: '<a href="javascript:alert(1)">Best Buy</a>',
  });
  assert.ok(result.ok);
  assert.equal(result.deal.title, "Cheap TVs");
  assert.equal(result.deal.store, "Best Buy");
  assert.doesNotMatch(JSON.stringify(result.deal), /<|script|onerror|javascript/i);
});

test("a name that is only HTML is refused as empty", () => {
  assert.ok(
    errorsOf({ name: "<script>alert(1)</script>" }).includes("the deal or product name is missing"),
  );
});

test("javascript:, data:, credential and relative links are refused", () => {
  const message = "the link must be a normal web address starting with https://";
  for (const link of [
    "javascript:alert(document.cookie)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "https://user:password@evil.example/",
    "//evil.example/path",
    "www.nofrills.ca",
    `https://example.com/${"a".repeat(2100)}`,
  ]) {
    assert.ok(
      errorsOf({ link }).some((e) => e === message || /too long/.test(e)),
      link,
    );
  }
});

test("very long text is refused, slightly long text is shortened", () => {
  assert.ok(errorsOf({ name: "A".repeat(5000) }).includes('"Deal or product name" is too long'));
  assert.ok(errorsOf({ store: "B".repeat(600) }).includes('"Store or business" is too long'));
  assert.deepEqual(submissionToDeal("x".repeat(25_000), 1, TODAY), {
    ok: false,
    errors: ["the submission is far too long"],
  });
  const result = approve({ name: `Big sale ${"on everything ".repeat(15)}` });
  assert.ok(result.ok);
  assert.ok(result.deal.title.length <= 120);
  assert.ok(result.deal.title.endsWith("…"));
});

test("invisible and control characters are removed", () => {
  const result = approve({ name: "Free​ coffee‮\u0007 today" });
  assert.ok(result.ok);
  assert.equal(result.deal.title, "Free coffee today");
});

test("a body edited to repeat a field is refused", () => {
  const body = `${issueBody()}\n\n### Link to the deal\n\nhttps://evil.example/`;
  const result = submissionToDeal(body, 42, TODAY);
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.errors[0], /edited by hand/);
});

test("prices, dates and dropdowns must be real", () => {
  assert.ok(errorsOf({ salePrice: "cheap!" }).includes('"Sale price" isn\'t a price'));
  assert.ok(
    errorsOf({ salePrice: "9.99", originalPrice: "4.99" }).includes(
      "the sale price is higher than the original price",
    ),
  );
  assert.ok(
    errorsOf({ endDate: "next Friday" }).includes("the end date must look like 2026-10-28"),
  );
  assert.ok(errorsOf({ endDate: "2026-10-01" }).includes("the deal has already ended"));
  assert.ok(errorsOf({ dealType: "Online, Bitcoin" }).includes("pick a deal type from the list"));
  assert.ok(errorsOf({ category: "<b>Grocery</b>" }).includes("pick a category from the list"));
  assert.ok(errorsOf({ location: "Toronto" }).includes("pick a location from the list"));
  assert.ok(
    errorsOf({ confirm: "- [ ] The information is accurate" }).includes(
      "the submitter didn't confirm the information is accurate",
    ),
  );
});

test("the same issue can't be approved twice", () => {
  const result = approve();
  assert.ok(result.ok);
  const first = addManualDeal({ deals: [] }, result.deal);
  assert.ok(first.ok);
  assert.deepEqual(addManualDeal(first.file, result.deal), {
    ok: false,
    error: "issue #42 is already in data/manual-deals.json",
  });
});

test("a hand-edited manual-deals.json is checked again by the source", () => {
  const { deals, problems } = manualDealsToDeals({
    deals: [
      {
        issue: 1,
        title: "x",
        store: "y",
        url: "javascript:alert(1)",
        location: "sudbury",
        dealType: ["online"],
        category: "other",
        approvedAt: TODAY,
      },
    ],
  });
  assert.equal(deals.length, 0);
  assert.match(problems[0], /url/);
});

/* ---------- Student programs ---------- */

test("the real student-discounts.json gives ~15 valid, ongoing student programs", () => {
  const { deals, problems } = programsToDeals(
    JSON.parse(readFileSync(STUDENT_DISCOUNTS_FILE, "utf8")),
  );
  assert.deepEqual(problems, []);
  assert.ok(deals.length >= 15, `only ${deals.length}`);
  const { file, summary } = buildDealsFile(
    null,
    [{ id: "student-discounts", name: "s", status: "ok", raw: deals }],
    new Date("2027-06-01T10:05:00Z"), // months later: still there (ongoing)
  );
  assert.equal(summary.sources[0].invalid.length, 0, summary.sources[0].invalid.join("\n"));
  assert.equal(file.deals.length, deals.length);
  assert.ok(file.deals.every((d) => d.dealType.includes("student") && d.ongoing));
  assert.ok(file.deals.every((d) => d.url.startsWith("https://")));
  // No made-up local school deals.
  assert.ok(
    file.deals.every(
      (d) => !/laurentian|cambrian|bor[ée]al/i.test(`${d.title} ${d.store} ${d.description}`),
    ),
  );
});

/* ---------- RedFlagDeals (built, switched off) ---------- */

test("RFD stays switched off until VerticalScope says yes", () => {
  assert.equal(SOURCES.find((s) => s.id === "rfd-hot-deals")?.enabled, false);
});

test("RFD Atom feed: store from [brackets], prices from the title, credit, no post text", () => {
  assert.deepEqual(splitRfdTitle("[Walmart] Air fryer - $49.97 (reg $99.97)"), {
    store: "Walmart",
    title: "Air fryer - $49.97 (reg $99.97)",
  });
  assert.deepEqual(pricesFromTitle("Air fryer - $49.97 (reg $99.97)"), {
    salePrice: 49.97,
    originalPrice: 99.97,
  });
  assert.deepEqual(pricesFromTitle("Was $1,299, now $999 at Best Buy"), {
    salePrice: 999,
    originalPrice: 1299,
  });
  assert.deepEqual(pricesFromTitle("Free Tim Hortons coffee"), {
    salePrice: undefined,
    originalPrice: undefined,
  });

  const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
    <entry><title>[Costco] Kirkland batteries $19.99</title>
      <link rel="alternate" href="https://forums.redflagdeals.com/viewtopic.php?t=1"/>
      <published>2026-10-19T14:00:00Z</published><content type="html">Long post body</content></entry>
    <entry><title>No store tag here</title><link href="https://forums.redflagdeals.com/viewtopic.php?t=2"/></entry>
  </feed>`;
  const raw = rfdFeedToDeals(xml);
  assert.equal(raw.length, 2);
  assert.equal(raw[0].store, "Costco");
  assert.equal(raw[0].salePrice, 19.99);
  assert.equal(raw[1].store, "RedFlagDeals");
  assert.ok(raw.every((d) => !/Long post body/.test(d.description ?? "")));
  assert.ok(raw.every((d) => d.attribution === "via RedFlagDeals.com Hot Deals forum"));
});
