import assert from "node:assert/strict";
import { test } from "node:test";
import type { Deal } from "@shared/deal";
import {
  ontarioPriceFor,
  pastValues,
  priceVerdict,
  vsOntario,
  type HistoryPoint,
  type OntarioPrice,
} from "@shared/price-info";
import { parseStatcanName } from "../ontario-prices";
import { PHOTO_CREDIT, applyProductPhotos, photoFromProductPage } from "../product-photos";

test("StatCan product names are split into product and quantity", () => {
  assert.deepEqual(parseStatcanName("Eggs, 1 dozen"), {
    product: "Eggs",
    unit: "each",
    perUnit: 12,
  });
  assert.deepEqual(parseStatcanName("Chicken breasts, per kilogram"), {
    product: "Chicken breasts",
    unit: "kg",
    perUnit: 1,
  });
  assert.deepEqual(parseStatcanName("Milk, 4 litres"), { product: "Milk", unit: "L", perUnit: 4 });
  assert.deepEqual(parseStatcanName("Butter, 454 grams"), {
    product: "Butter",
    unit: "kg",
    perUnit: 0.454,
  });
  assert.deepEqual(parseStatcanName("Lemons, unit"), {
    product: "Lemons",
    unit: "each",
    perUnit: 1,
  });
  assert.deepEqual(parseStatcanName("Tea (20 bags)"), {
    product: "Tea",
    unit: "each",
    perUnit: 20,
  });
});

const item = (
  name: string,
  product: string,
  unit: OntarioPrice["unit"],
  unitPrice: number,
): OntarioPrice => ({ name, product, price: unitPrice, unit, unitPrice, period: "2026-08" });

const ONTARIO = [
  item("Eggs, 1 dozen", "Eggs", "each", 0.4167),
  item("Butter, 454 grams", "Butter", "kg", 12.67),
  item("Peanut butter, 1 kilogram", "Peanut butter", "kg", 6.5),
  item("Milk, 1 litre", "Milk", "L", 3.97),
  item("Milk, 4 litres", "Milk", "L", 1.72),
  item("Chicken breasts, per kilogram", "Chicken breasts", "kg", 13.94),
];

const match = (deal: Parameters<typeof ontarioPriceFor>[0]) => ontarioPriceFor(deal, ONTARIO)?.name;

test("products match their Ontario average: most specific name, same kind of unit, nearest size", () => {
  assert.equal(match({ productName: "Large eggs", unit: "each" }), "Eggs, 1 dozen");
  assert.equal(
    match({ productName: "Smooth peanut butter", unit: "kg" }),
    "Peanut butter, 1 kilogram",
  );
  assert.equal(match({ productName: "Salted butter", unit: "100g" }), "Butter, 454 grams");
  assert.equal(match({ productName: "Milk, 2%", unit: "L", size: "4 L" }), "Milk, 4 litres");
  assert.equal(match({ productName: "Milk, 2%", unit: "L", size: "1 L" }), "Milk, 1 litre");
  assert.equal(
    match({ productName: "Chicken breast, boneless skinless", unit: "lb" }),
    "Chicken breasts, per kilogram",
  );
  // Wrong kind of unit, or not tracked by StatCan: no match.
  assert.equal(match({ productName: "Large eggs", unit: "kg" }), undefined);
  assert.equal(match({ productName: "AirPods", unit: "each" }), undefined);
});

test("compared with the Ontario average per unit, whatever the unit", () => {
  // $3.99/lb = $8.80/kg, against $13.94/kg: about 37% cheaper.
  const gap = vsOntario({ unit: "lb", unitPrice: 3.99 }, ONTARIO[5])!;
  assert.ok(Math.abs(gap - (3.99 / 0.45359237 / 13.94 - 1)) < 0.001);
});

test("the good-deal meter: past prices first, then the Ontario average", () => {
  assert.equal(priceVerdict(1, [2, 3, 4])?.label, "Lowest price in 90 days");
  assert.equal(priceVerdict(2.5, [2, 3, 4])?.label, "Good price");
  assert.equal(priceVerdict(3, [2, 3, 4])?.label, "Usual price");
  assert.equal(priceVerdict(3.9, [2, 3, 4])?.label, "Higher than usual");
  // Fewer than 3 past prices: the Ontario average decides.
  assert.equal(priceVerdict(1, [2], -0.25)?.reason, "25% below the Ontario average");
  assert.equal(priceVerdict(1, [], 0.05)?.label, "Usual price");
  assert.equal(priceVerdict(1, [], 0.3)?.label, "Higher than usual");
  assert.equal(priceVerdict(1, []), undefined);
});

test("past prices: same product, same kind of unit, earlier dates only", () => {
  const point = (over: Partial<HistoryPoint>): HistoryPoint => ({
    product: "Large eggs",
    store: "Metro",
    date: "2026-10-15",
    price: 4.49,
    unit: "each",
    unitPrice: 0.3742,
    ...over,
  });
  const history = [
    point({}),
    point({ product: "Large Egg", store: "No Frills", date: "2026-10-22", unitPrice: 0.3308 }),
    point({ date: "2026-11-01", unitPrice: 0.3575 }), // today: left out
    point({ product: "Egg noodles", unit: "100g", unitPrice: 0.5 }), // another product
  ];
  const values = pastValues(
    { productName: "Large eggs", unit: "each", unitPrice: 0.3 },
    history,
    "2026-11-01",
  );
  assert.deepEqual(values, [0.3742, 0.3308]);
});

const deal = (over: Partial<Deal>): Deal => ({
  id: "d1",
  title: "Eggs",
  description: "",
  store: "Metro",
  dealType: ["in-store"],
  category: "grocery",
  location: "sudbury",
  url: "https://www.metro.ca/en/flyer",
  source: "sheet-picks",
  scrapedAt: "2026-11-01T10:00:00.000Z",
  productName: "Large eggs",
  ...over,
});

test("the photo is the Open Food Facts product image, not their logo", () => {
  const photo =
    "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.200.jpg";
  const html = `<meta property="og:image" content="https://static.openfoodfacts.org/images/logos/off-logo.png">
    <meta property="og:image" content="${photo}">`;
  assert.equal(photoFromProductPage(html), photo);
  assert.equal(photoFromProductPage("<html>no product</html>"), null);
});

test("photos are looked up once per barcode, remembered, and credited", async () => {
  const looked: string[] = [];
  const lookup = async (code: string) => {
    looked.push(code);
    return code === "11111111" ? "https://images.openfoodfacts.org/a.jpg" : null;
  };
  const deals = [
    deal({ id: "a", barcode: "11111111" }),
    deal({ id: "b", barcode: "11111111", store: "No Frills" }),
    deal({ id: "c", barcode: "22222222" }),
    deal({ id: "d" }),
  ];
  const first = await applyProductPhotos(deals, {}, "2026-11-01", lookup);
  assert.deepEqual(looked, ["11111111", "22222222"]);
  assert.equal(first.deals[0].imageUrl, "https://images.openfoodfacts.org/a.jpg");
  assert.equal(first.deals[1].imageCredit, PHOTO_CREDIT);
  assert.equal(first.deals[2].imageUrl, undefined);
  assert.deepEqual(first.book["22222222"], { url: null, checked: "2026-11-01" });

  // Next day: nothing new to look up. A run without web requests still uses what's known.
  looked.length = 0;
  await applyProductPhotos(deals, first.book, "2026-11-02", lookup);
  assert.deepEqual(looked, []);
  const offline = await applyProductPhotos(deals, first.book, "2026-11-02", null);
  assert.equal(offline.deals[0].imageUrl, "https://images.openfoodfacts.org/a.jpg");
});
