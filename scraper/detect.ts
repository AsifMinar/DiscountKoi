import { fold } from "./lib/text";

/*
 * Automatic "Free" and "Student" detection. Edit the word lists to tune it.
 */

/** Words that mean the deal is free stuff. */
// prettier-ignore
const FREE_WORDS = [
  "free", "freebie", "freebies", "giveaway", "give away", "giving away", "free sample",
  "free samples", "complimentary", "no charge", "100% off",
];

/**
 * Phrases where "free" doesn't mean the thing itself is free (you still have to pay
 * for something). If any of these appear, the deal is NOT marked as free.
 */
// prettier-ignore
const NOT_REALLY_FREE = [
  "free shipping", "ships free", "free delivery", "free returns", "free pickup",
  "free installation", "with purchase", "with any purchase", "with every purchase",
  "with the purchase", "when you buy", "when you spend", "buy one", "buy 1", "buy 2",
  "get one free", "get 1 free", "bogo", "b1g1", "gift with purchase", "gwp",
  "sugar free", "sugar-free", "gluten free", "gluten-free", "fat free", "dairy free",
  "nut free", "scent free", "fragrance free", "fragrance-free", "hands-free", "hands free",
  "cord-free", "tax-free", "tax free", "interest-free", "interest free",
  "free trial", "free trials", "try it free", "try free", "free for 30 days", "free month",
];

/** Words that mean the deal is for students. */
// prettier-ignore
const STUDENT_WORDS = [
  "student", "students", "spc", "spc card", "student price card", "unidays", "student beans",
  "studentbeans", "isic", "education pricing", "education discount", "apple education",
  "prime student", "spotify student", "college student", "university student",
];

const toPattern = (words: string[]) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${words.map((w) => fold(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}\\p{N}])`,
    "u",
  );

const FREE = toPattern(FREE_WORDS);
const NOT_FREE = toPattern(NOT_REALLY_FREE);
const STUDENT = toPattern(STUDENT_WORDS);

/** Free if the price is $0, or the text says free and isn't a "free with purchase" kind of deal. */
export function isFreeDeal(text: string, salePrice?: number): boolean {
  if (salePrice === 0) return true;
  const folded = fold(text);
  return FREE.test(folded) && !NOT_FREE.test(folded);
}

export function isStudentDeal(text: string): boolean {
  return STUDENT.test(fold(text));
}
