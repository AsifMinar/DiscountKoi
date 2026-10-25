import type { CategoryId } from "@shared/taxonomy";
import { fold } from "./lib/text";

/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  CATEGORY RULES: edit freely.
 *
 *  Each deal's title, description and brand are checked against these rules from
 *  top to bottom. The FIRST rule with a matching keyword wins, so keep specific
 *  rules (Pets, Kids) above broad ones (Grocery).
 *
 *  - Keywords match whole words, ignoring capitals and accents
 *    ("cat" matches "Cat tree" but not "category"; "cafe" matches "Café").
 *  - Multi-word keywords are fine: "oil change", "free admission".
 *  - Category ids are listed in shared/taxonomy.ts.
 *
 *  If nothing matches, STORE_DEFAULTS below is used, and then "other".
 * ─────────────────────────────────────────────────────────────────────────────
 */
// prettier-ignore
export const CATEGORY_RULES: ReadonlyArray<{ category: CategoryId; keywords: string[] }> = [
  {
    category: "food-help",
    keywords: [
      "food bank", "food banks", "foodbank", "meal program", "soup kitchen", "community meal",
      "community fridge", "good food box", "food hamper", "food hampers",
    ],
  },
  {
    category: "pets",
    keywords: [
      "pet", "pets", "dog", "dogs", "puppy", "cat", "cats", "kitten", "kitty", "litter",
      "kibble", "dog food", "cat food", "pet food", "aquarium", "bird seed", "leash", "petsmart",
      "pet valu",
    ],
  },
  {
    category: "kids-baby",
    keywords: [
      "baby", "babies", "infant", "toddler", "kid", "kids", "children", "childrens", "diaper",
      "diapers", "baby wipes", "stroller", "car seat", "crib", "nursery", "toy", "toys", "lego",
      "playset", "school supplies",
    ],
  },
  {
    category: "automotive",
    keywords: [
      "tire", "tires", "winter tires", "oil change", "motor oil", "wiper", "wipers", "wiper blades",
      "car wash", "automotive", "auto parts", "car battery", "booster cables", "windshield",
      "brake", "brakes", "dash cam", "motomaster", "antifreeze", "washer fluid",
    ],
  },
  {
    category: "services",
    keywords: [
      "service", "services", "subscription", "membership", "free trial", "phone plan",
      "mobile plan", "cell plan", "data plan", "internet plan", "insurance", "banking",
      "bank account", "credit card", "haircut", "salon", "spa", "massage", "cleaning service",
      "repair", "installation", "delivery pass", "tax filing", "tax return",
    ],
  },
  {
    category: "electronics",
    keywords: [
      "tv", "4k", "oled", "laptop", "laptops", "macbook", "ipad", "iphone", "tablet", "phone",
      "smartphone", "headphones", "earbuds", "airpods", "speaker", "bluetooth", "monitor",
      "computer", "pc", "gaming", "playstation", "ps5", "xbox", "nintendo", "switch 2", "camera",
      "smartwatch", "apple watch", "router", "usb", "usb-c", "charger", "power bank", "ssd", "hard drive",
      "printer", "keyboard", "mouse", "electronics", "smart home",
    ],
  },
  {
    category: "health-beauty",
    keywords: [
      "pharmacy", "flu shot", "flu shots", "vaccine", "vitamin", "vitamins", "supplement",
      "skincare", "skin care", "moisturizer", "moisturizing", "face cream", "hand cream",
      "body cream", "lotion", "shampoo",
      "conditioner", "makeup", "cosmetics", "lipstick", "mascara", "fragrance", "perfume",
      "cologne", "razor", "toothpaste", "toothbrush", "deodorant", "sunscreen", "beauty",
      "optimum points", "pc optimum",
    ],
  },
  {
    category: "sports-outdoors",
    keywords: [
      "running", "running shoes", "sneakers", "hiking", "camping", "tent", "sleeping bag",
      "bike", "bikes", "bicycle", "cycling", "fishing", "kayak", "canoe", "golf", "hockey",
      "skates", "ski", "skis", "snowboard", "snowshoes", "fitness", "gym", "yoga", "treadmill",
      "dumbbells", "sports", "outdoor", "outdoors", "sport chek",
    ],
  },
  {
    category: "fashion",
    keywords: [
      "clothing", "clothes", "apparel", "jacket", "jackets", "parka", "parkas", "coat", "coats",
      "hoodie", "hoodies", "sweater", "shirt", "shirts", "t-shirt", "jeans", "pants", "leggings",
      "dress", "dresses", "skirt", "shoes", "boots", "sandals", "socks", "underwear", "bra",
      "handbag", "purse", "backpack", "jewellery", "jewelry", "watch", "sunglasses", "fashion",
    ],
  },
  {
    category: "home",
    keywords: [
      "furniture", "sofa", "couch", "mattress", "bed frame", "bookcase", "shelf", "shelves",
      "desk", "chair", "chairs", "table", "dresser", "lamp", "rug", "curtains", "bedding",
      "sheets", "towels", "pillow", "decor", "home decor", "cookware", "frying pan", "knife set",
      "dishes", "vacuum", "air fryer", "blender", "kettle", "toaster", "coffee maker", "appliance",
      "appliances", "microwave", "fridge", "washer", "dryer", "paint", "tools", "tool set",
      "drill", "snow blower", "shovel", "garden", "bbq", "barbecue", "storage", "home",
    ],
  },
  {
    category: "entertainment",
    keywords: [
      "movie", "movies", "cinema", "theatre", "theater", "concert", "tickets", "ticket",
      "festival", "event", "events", "show", "museum", "gallery", "free admission",
      "family skate", "public skate", "book", "books", "hardcover", "paperback", "e-book",
      "ebook", "kindle", "audiobook", "streaming", "netflix", "disney+", "spotify", "music",
      "video game", "board game", "puzzle", "magazine",
    ],
  },
  {
    category: "food-restaurants",
    keywords: [
      "restaurant", "restaurants", "takeout", "take-out", "dine-in", "dining", "drive-thru",
      "pizza", "burger", "burgers", "wings", "fries", "poutine", "shawarma", "sushi", "tacos",
      "burrito", "sandwich", "sub", "subs", "latte", "cappuccino", "espresso", "frappuccino",
      "donut", "donuts", "doughnut", "cafe", "bistro", "pub", "brunch", "buffet", "combo",
      "meal deal", "kids eat free", "uber eats", "skipthedishes", "doordash",
    ],
  },
  {
    category: "grocery",
    keywords: [
      "grocery", "groceries", "produce", "fruit", "fruits", "vegetable", "vegetables", "apple",
      "apples", "banana", "bananas", "avocado", "avocados", "berries", "strawberries", "grapes",
      "potatoes", "onions", "lettuce", "tomatoes", "chicken", "beef", "pork", "turkey", "ham",
      "bacon", "sausage", "salmon", "fish", "shrimp", "seafood", "meat", "deli", "milk", "cheese",
      "yogurt", "butter", "eggs", "bread", "bagels", "cereal", "pasta", "rice", "flour", "sugar",
      "coffee", "tea", "juice", "pop", "soda", "water", "snacks", "chips", "crackers", "cookies",
      "candy", "chocolate", "frozen", "ice cream", "soup", "sauce", "olive oil", "per lb",
      "per kg", "lb", "kg", "family pack",
    ],
  },
];

/**
 * Fallback by store name (lowercase) when no keyword matches.
 * Add your own: "store name": "category-id".
 */
export const STORE_DEFAULTS: Record<string, CategoryId> = {
  "food basics": "grocery",
  "no frills": "grocery",
  freshco: "grocery",
  metro: "grocery",
  "your independent grocer": "grocery",
  "real canadian superstore": "grocery",
  costco: "grocery",
  "best buy": "electronics",
  "the source": "electronics",
  "shoppers drug mart": "health-beauty",
  rexall: "health-beauty",
  "sport chek": "sports-outdoors",
  "canadian tire": "home",
  "home depot": "home",
  "home hardware": "home",
  "giant tiger": "other",
  walmart: "other",
};

// Pre-compile one regex per rule. Word edges are "not a letter or digit" so
// punctuation like "kids'" or "usb-c" still matches.
const compiled = CATEGORY_RULES.map(({ category, keywords }) => ({
  category,
  pattern: new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${keywords
      .map((k) => fold(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})(?![\\p{L}\\p{N}])`,
    "u",
  ),
}));

const matchRules = (text: string) =>
  compiled.find(({ pattern }) => pattern.test(fold(text)))?.category;

/**
 * Picks a category: keywords in the deal's text first, then STORE_DEFAULTS, then
 * keywords in the store's name (so "PetSmart" → Pets), and finally "other".
 */
export function categorize(text: string, store = ""): CategoryId {
  return matchRules(text) ?? STORE_DEFAULTS[fold(store).trim()] ?? matchRules(store) ?? "other";
}
