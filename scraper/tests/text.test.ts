import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanText, dealId, parsePrice, percentOff, safeUrl } from "../lib/text";

test("cleanText strips tags, scripts and entities", () => {
  assert.equal(cleanText("<b>Big</b> &amp; <i>bold</i>", 100), "Big & bold");
  assert.equal(cleanText("Hi<script>alert(1)</script> there", 100), "Hi there");
  assert.equal(cleanText("<p>one</p><p>two</p>", 100), "one two");
  assert.equal(cleanText("&lt;img src=x onerror=alert(1)&gt;Deal", 100), "Deal");
  assert.equal(cleanText("zero​width  \n spaces", 100), "zerowidth spaces");
  assert.equal(cleanText("a".repeat(50), 10), `${"a".repeat(9)}…`);
  assert.equal(cleanText(undefined, 10), "");
});

test("safeUrl only allows plain http(s) links", () => {
  assert.equal(safeUrl("https://example.com/a?b=1"), "https://example.com/a?b=1");
  assert.equal(safeUrl("http://example.com"), "http://example.com/");
  assert.equal(safeUrl("/deal/1", "https://store.ca/flyer"), "https://store.ca/deal/1");
  assert.equal(safeUrl("javascript:alert(1)"), undefined);
  assert.equal(safeUrl("JaVaScRiPt:alert(1)"), undefined);
  assert.equal(safeUrl("data:text/html,<script>"), undefined);
  assert.equal(safeUrl("https://user:pass@example.com"), undefined);
  assert.equal(safeUrl("not a url"), undefined);
});

test("parsePrice and percentOff", () => {
  assert.equal(parsePrice("$1,299.99"), 1299.99);
  assert.equal(parsePrice("CA$ 5"), 5);
  assert.equal(parsePrice("free"), undefined);
  assert.equal(parsePrice(-3), undefined);
  assert.equal(percentOff(13.99, 8.99), 36);
  assert.equal(percentOff(10, 10), undefined);
  assert.equal(percentOff(10, 12), undefined);
  assert.equal(percentOff(12.99, 0), 100);
});

test("dealId is stable and source-specific", () => {
  assert.equal(dealId("a", "https://x.ca", "T"), dealId("a", "https://x.ca", "T"));
  assert.notEqual(dealId("a", "https://x.ca", "T"), dealId("b", "https://x.ca", "T"));
  assert.match(dealId("a", "https://x.ca", "T"), /^[0-9a-f]{16}$/);
});
