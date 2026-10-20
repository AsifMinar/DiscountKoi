import assert from "node:assert/strict";
import { test } from "node:test";
import { categorize } from "../categorize";
import { isFreeDeal, isStudentDeal } from "../detect";

test("categorize picks sensible categories", () => {
  const cases: Array<[string, string, string]> = [
    ["Fresh Atlantic salmon fillets", "Food Basics", "grocery"],
    ["Chicken breasts, family pack (per lb)", "No Frills", "grocery"],
    ["Ground coffee, 920 g tub", "Metro", "grocery"],
    ["Kids' fleece hoodies, sizes 4 to 14", "Giant Tiger", "kids-baby"],
    ["Winter wiper blades, all sizes", "Canadian Tire", "automotive"],
    ["Moisturizing cream, 453 g", "Shoppers Drug Mart", "health-beauty"],
    ["5-shelf bookcase, walnut finish", "Walmart", "home"],
    ["Any large latte for $3", "Northern Bean Café", "food-restaurants"],
    ['Open-box 55" 4K smart TV', "Best Buy", "electronics"],
    ["Grain-free dog food, 11 kg bag", "Lakeside Pet Supply", "pets"],
    ["Free flu shots, no appointment needed", "Shoppers Drug Mart", "health-beauty"],
    ["Free family skate this Saturday", "Community Arena", "entertainment"],
    ["Running shoes, select styles", "Sport Chek", "sports-outdoors"],
    ["Men's insulated winter parkas", "Mark's", "fashion"],
    ["Synthetic oil change for $39.99", "Canadian Tire", "automotive"],
    ["Prime Student: 6-month free trial", "Amazon.ca", "services"],
    ["Ice cream, 1.5 L", "Metro", "grocery"],
    ["Mystery item", "Food Basics", "grocery"], // store fallback
    ["Mystery item", "PetSmart", "pets"], // store-name keyword
    ["Mystery item", "Unknown Shop", "other"],
  ];
  for (const [title, store, expected] of cases) {
    assert.equal(categorize(title, store), expected, `${title} @ ${store}`);
  }
});

test("free detection", () => {
  assert.ok(isFreeDeal("Free flu shots"));
  assert.ok(isFreeDeal("Skincare giveaway"));
  assert.ok(isFreeDeal("Anything", 0));
  assert.ok(!isFreeDeal("Free shipping on orders over $35"));
  assert.ok(!isFreeDeal("Buy one get one free"));
  assert.ok(!isFreeDeal("Sugar-free gummies"));
  assert.ok(!isFreeDeal("Free tote with purchase"));
  assert.ok(!isFreeDeal("Freezer bags"));
});

test("student detection", () => {
  assert.ok(isStudentDeal("Spotify Premium Student"));
  assert.ok(isStudentDeal("10% off with SPC card"));
  assert.ok(isStudentDeal("Exclusive on UNiDAYS"));
  assert.ok(isStudentDeal("Apple Education pricing"));
  assert.ok(!isStudentDeal("Studio headphones"));
});
