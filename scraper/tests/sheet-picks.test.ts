import assert from "node:assert/strict";
import { test } from "node:test";
import { isSheetCsvUrl, sheetToDeals } from "../sources/sheet-picks";

const lookups = {
  flyers: new Map([["no frills", "https://www.nofrills.ca/en/deals/flyer"]]),
  startDays: new Map([["no frills", "thu" as const]]),
  today: "2026-11-01", // a Sunday: the No Frills week is Thu Oct 29 – Wed Nov 4
};

test("only Google Sheets 'Publish to web' CSV links are accepted", () => {
  assert.ok(
    isSheetCsvUrl(
      "https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?gid=0&single=true&output=csv",
    ),
  );
  assert.ok(!isSheetCsvUrl("https://docs.google.com/spreadsheets/d/abc/edit"));
  assert.ok(!isSheetCsvUrl("http://docs.google.com/spreadsheets/d/e/x/pub?output=csv"));
  assert.ok(!isSheetCsvUrl("https://evil.example/spreadsheets/pub?output=csv"));
});

test("sheet rows become listings; blank dates use the store's flyer week", () => {
  const csv = [
    "Store,Product,Price,Per,Size,Regular price,First day,Last day,Brand,Category,Barcode,Note,Link",
    "No Frills,Large eggs,$3.97,package,dozen,,,,,,0 60383 12345 5,,",
    "No Frills,Chicken breast,3.99,lb,,5.99,2026-10-29,2026-11-04,,,,,",
    ",,,,,,,,,,,,", // blank row: ignored
  ].join("\n");
  const { deals, problems } = sheetToDeals(csv, lookups);
  assert.deepEqual(problems, []);
  assert.equal(deals.length, 2);
  const [eggs, chicken] = deals;
  assert.equal(eggs.productName, "Large eggs");
  assert.equal(eggs.salePrice, 3.97);
  assert.equal(eggs.size, "dozen");
  assert.equal(eggs.startDate, "2026-10-29");
  assert.equal(eggs.endDate, "2026-11-04");
  assert.equal(eggs.barcode, "060383123455");
  assert.equal(eggs.url, "https://www.nofrills.ca/en/deals/flyer");
  assert.equal(chicken.unit, "lb");
  assert.equal(chicken.originalPrice, 5.99);
});

test("bad rows are reported with the row number the sheet shows; old rows are skipped", () => {
  const csv = [
    "store,product,price,per,last day",
    "No Frills,Bread,abc,package,2026-11-04",
    "Unknown Shop,Apples,1.99,lb,",
    "No Frills,Milk,5.49,gallon,2026-11-04",
    "No Frills,Old pick,1.00,package,2026-10-01",
  ].join("\n");
  const { deals, problems } = sheetToDeals(csv, lookups);
  assert.equal(deals.length, 0);
  assert.equal(problems.length, 3);
  assert.match(problems[0], /^row 2: .*sale price/);
  assert.match(problems[1], /^row 3: .*Last day/);
  assert.match(problems[2], /^row 4: "Per"/);
});

test("a sheet without Store and Product columns is refused", () => {
  const { deals, problems } = sheetToDeals("Name,Cost\nEggs,3.97", lookups);
  assert.equal(deals.length, 0);
  assert.match(problems[0], /Store/);
});
