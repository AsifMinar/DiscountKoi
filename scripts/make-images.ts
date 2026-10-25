/**
 * Draws the share image and app icons from the koi logo (src/app/icon.svg), in the
 * site's own colours and font. Run it again only if the logo or tagline changes:
 *
 *   npm run build && npm run make-images
 *
 * Writes (all committed):
 *   public/og-image.png                        1200×630 link preview (Open Graph and Twitter)
 *   src/app/apple-icon.png                     180×180 iPhone home screen
 *   public/icons/icon-192.png, icon-512.png    installed app icons
 *   public/icons/maskable-512.png              Android adaptive icon
 *
 * The committed files were then shrunk to 256 colours (about 60% smaller, no visible
 * change). After a re-run, do the same with any PNG optimiser, e.g. pngquant or TinyPNG.
 */
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const KOI = readFileSync("src/app/icon.svg", "utf8");
const PAGE = "#f6f2ee";
const INK = "#1c1917";
const MUTED = "#57534e";
const ACCENT_TEXT = "#8a2e0e";

/** The Geist font the build downloaded (the largest latin woff2), so text matches the site. */
function geistUrl(): string | null {
  try {
    const dir = resolve("out/_next/static/media");
    const fonts = readdirSync(dir).filter((f) => f.endsWith(".woff2"));
    const latin = fonts.find((f) => f.includes(".p.")) ?? fonts[0];
    return latin ? pathToFileURL(join(dir, latin)).href : null;
  } catch {
    return null;
  }
}

const font = geistUrl();
const fontFace = font
  ? `@font-face { font-family: Geist; src: url("${font}") format("woff2"); font-weight: 100 900; }`
  : "";
const base = `${fontFace}
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; }
  body { font-family: Geist, ui-sans-serif, system-ui, sans-serif; color: ${INK}; -webkit-font-smoothing: antialiased; }`;

const backdrop = `background:
  radial-gradient(42rem 34rem at 8% -4%, rgb(244 162 97 / 0.45), transparent 70%),
  radial-gradient(36rem 30rem at 100% 18%, rgb(240 128 128 / 0.3), transparent 70%),
  radial-gradient(52rem 38rem at 45% 108%, rgb(42 110 115 / 0.3), transparent 72%),
  ${PAGE};`;

const shareImage = `<style>${base}
  body { ${backdrop} display: grid; place-items: center; }
  .card { width: 1040px; height: 470px; border-radius: 56px; padding: 64px 72px;
    background: rgb(255 255 255 / 0.55); border: 2px solid rgb(255 255 255 / 0.8);
    box-shadow: 0 2px 4px rgb(28 25 23 / 0.05), 0 40px 80px -40px rgb(28 25 23 / 0.35);
    display: flex; flex-direction: column; justify-content: center; gap: 28px; }
  .brand { display: flex; align-items: center; gap: 28px; }
  .brand svg { width: 150px; height: 150px; }
  h1 { font-size: 104px; font-weight: 600; letter-spacing: -0.035em; line-height: 1; }
  h1 span { color: ${ACCENT_TEXT}; }
  p { font-size: 44px; line-height: 1.2; color: ${INK}; letter-spacing: -0.015em; font-weight: 500; }
  small { font-size: 28px; color: ${MUTED}; }
</style>
<div class="card">
  <div class="brand">${KOI}<h1>Discount <span>Koi</span></h1></div>
  <p>Every deal in Sudbury, in one calm place.</p>
  <small>Weekly flyers · Price comparisons · Student discounts · Free stuff</small>
</div>`;

/** Square icon: koi on the page colour. `inset` leaves room for Android's mask (maskable). */
const icon = (inset: number) => `<style>${base}
  body { ${backdrop} display: grid; place-items: center; }
  svg { width: ${100 - inset * 2}%; height: ${100 - inset * 2}%; }
</style>${KOI}`;

const IMAGES = [
  { file: "public/og-image.png", width: 1200, height: 630, html: shareImage },
  { file: "src/app/apple-icon.png", width: 180, height: 180, html: icon(12) },
  { file: "public/icons/icon-192.png", width: 192, height: 192, html: icon(10) },
  { file: "public/icons/icon-512.png", width: 512, height: 512, html: icon(10) },
  // Android may crop to a circle: keep the koi inside the middle 80%.
  { file: "public/icons/maskable-512.png", width: 512, height: 512, html: icon(22) },
];

async function main() {
  if (!font) console.warn("No build found (out/): using a system font. Run npm run build first.");
  mkdirSync("public/icons", { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const image of IMAGES) {
      const page = await browser.newPage({
        viewport: { width: image.width, height: image.height },
        deviceScaleFactor: 1,
      });
      // A file:// page so it may load the font file from ./out.
      await page.goto(pathToFileURL(resolve("scripts/preview.mjs")).href.replace(/[^/]+$/, ""));
      await page.setContent(`<!doctype html><meta charset="utf-8">${image.html}`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: image.file });
      await page.close();
      console.log(`✓ ${image.file} (${image.width}×${image.height})`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
