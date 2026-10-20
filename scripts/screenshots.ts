/**
 * Screenshots every page state at every width, in light and dark mode, and checks each
 * one for layout problems. Needs a build first:
 *
 *   npm run build && npm run screenshots
 *   npm run screenshots -- --only=home,about --widths=320,1280
 *
 * Saves screenshots/<state>/<width>-<theme>.png and screenshots/report.md (both git-ignored).
 * Phone widths are taken with an iPhone-style notch (47px) and home bar (34px) emulated.
 *
 * Checks: horizontal scrolling, touch targets under 44px, clipped text, overlapping
 * controls, glass panels without their blur, content under the notch or home bar, and the
 * corner radii in use (for a consistency review).
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

const PORT = Number(process.env.SCREENSHOT_PORT ?? 4180);
const ORIGIN = `http://localhost:${PORT}`;
const BASE = `${ORIGIN}/DiscountKoi`;
const OUT = "screenshots";

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const THEMES = ["light", "dark"] as const;
/** iPhone notch and home bar, applied at phone widths. */
const SAFE_AREA = { top: 47, bottom: 34 };

type Deal = { id: string; productName?: string; salePrice?: number; lowestInSudbury?: boolean };
const deals = (JSON.parse(readFileSync("out/deals.json", "utf8")) as { deals: Deal[] }).deals;
const dealId = (deals.find((d) => d.salePrice !== undefined && !d.productName) ?? deals[0])?.id;
const productId = (deals.find((d) => d.lowestInSudbury) ?? deals.find((d) => d.productName))?.id;

type State = {
  name: string;
  path: string;
  /** Popups and menus: screenshot what's on screen, not the whole page. */
  viewportOnly?: boolean;
  /** Only at widths below this (e.g. the phone menu). */
  maxWidth?: number;
  action?: (page: Page) => Promise<void>;
};

const STATES: State[] = [
  { name: "home", path: "/" },
  { name: "home-filtered", path: "/?type=in-store&cat=grocery" },
  { name: "search-no-results", path: "/?q=unicorn%20saddle" },
  { name: "deal-popup", path: `/?deal=${dealId}`, viewportOnly: true },
  { name: "products-search", path: "/products/?q=milk" },
  { name: "product-popup", path: `/products/?deal=${productId}`, viewportOnly: true },
  { name: "student", path: "/student/" },
  { name: "free", path: "/free/" },
  { name: "about", path: "/about/" },
  { name: "not-found", path: "/this-page-does-not-exist/" },
  {
    name: "mobile-menu",
    path: "/",
    viewportOnly: true,
    maxWidth: 767,
    action: async (page) => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.locator("#mobile-menu").waitFor();
    },
  },
];

type Issue = { type: string; detail: string };

/** Runs inside the page. Returns every problem it can measure. */
function inspect(safe: { top: number; bottom: number } | null): {
  issues: Issue[];
  radii: string[];
} {
  const issues: Issue[] = [];
  const doc = document.documentElement;
  const dialog = document.querySelector("dialog[open]");
  const root: Element = dialog ?? document.body;
  const describe = (el: Element) => {
    const text = (el.getAttribute("aria-label") ?? el.textContent ?? "")
      .trim()
      .replace(/\s+/g, " ");
    return `<${el.tagName.toLowerCase()}> "${text.slice(0, 40)}"`;
  };
  const isShown = (el: Element) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // Skip invisible and screen-reader-only (clipped away) elements.
    const clipped = cs.clipPath === "inset(50%)" || cs.clip === "rect(0px, 0px, 0px, 0px)";
    return (
      r.width > 1 && r.height > 1 && !clipped && cs.visibility !== "hidden" && cs.opacity !== "0"
    );
  };
  /** Inside a sideways-scrolling row (the filter chips): offscreen parts are intended. */
  const inScroller = (el: Element) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll") return true;
    }
    return false;
  };

  if (doc.scrollWidth > window.innerWidth + 1) {
    const wide = [...document.body.querySelectorAll("*")]
      .filter(
        (el) =>
          isShown(el) && !inScroller(el) && el.getBoundingClientRect().right > doc.clientWidth + 1,
      )
      .slice(0, 3)
      .map(describe);
    issues.push({
      type: "horizontal scroll",
      detail: `${doc.scrollWidth}px > ${window.innerWidth}px: ${wide.join(", ")}`,
    });
  }

  const interactive = [
    ...root.querySelectorAll("a[href], button, input, select, textarea, summary, [role=button]"),
  ].filter((el) => isShown(el) && !el.closest("[inert]"));

  // The size a tap actually hits: a card's title link covers the whole card (::after).
  const hitBox = (el: Element) => {
    const after = getComputedStyle(el, "::after");
    if (after.content !== "none" && after.position === "absolute" && el instanceof HTMLElement) {
      const host = el.offsetParent;
      if (host) return host.getBoundingClientRect();
    }
    return el.getBoundingClientRect();
  };
  for (const el of interactive) {
    if (inScroller(el) && el.getBoundingClientRect().right > doc.clientWidth) continue;
    const r = hitBox(el);
    if (r.width < 44 || r.height < 44) {
      const inline = getComputedStyle(el).display === "inline" && el.closest("p, li");
      issues.push({
        type: inline ? "small inline link" : "touch target < 44px",
        detail: `${describe(el)} ${Math.round(r.width)}×${Math.round(r.height)}`,
      });
    }
  }

  // Menus, popups and the sticky navbar float over the page on purpose: only compare
  // controls that sit in the same layer.
  const layerOf = (el: Element) => {
    for (let p: Element | null = el; p; p = p.parentElement) {
      if (
        ["fixed", "absolute", "sticky"].includes(getComputedStyle(p).position) &&
        !p.matches(".sr-only")
      ) {
        return p;
      }
    }
    return document.body;
  };
  for (let i = 0; i < interactive.length; i++) {
    for (let j = i + 1; j < interactive.length; j++) {
      const a = interactive[i];
      const b = interactive[j];
      if (a.contains(b) || b.contains(a) || layerOf(a) !== layerOf(b)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w > 4 && h > 4)
        issues.push({ type: "overlap", detail: `${describe(a)} and ${describe(b)}` });
    }
  }

  for (const el of root.querySelectorAll("*")) {
    if (el === document.body || !isShown(el) || !el.textContent?.trim()) continue;
    const cs = getComputedStyle(el);
    const clips = ["hidden", "clip"].includes(cs.overflowX);
    const intended = cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none";
    if (clips && !intended && el.scrollWidth > el.clientWidth + 1) {
      issues.push({
        type: "cut-off text",
        detail: `${describe(el)} ${el.scrollWidth}px in ${el.clientWidth}px`,
      });
    }
  }

  for (const el of root.querySelectorAll(".frost")) {
    const cs = getComputedStyle(el) as CSSStyleDeclaration & { webkitBackdropFilter?: string };
    if (
      isShown(el) &&
      cs.backdropFilter === "none" &&
      (cs.webkitBackdropFilter ?? "none") === "none"
    ) {
      issues.push({ type: "glass without blur", detail: describe(el) });
    }
  }

  if (safe) {
    // What's on screen at the top (page start) must clear the notch; the dialog must clear both.
    const texty = [
      ...root.querySelectorAll("a, button, input, select, h1, h2, h3, p, span, dt, dd, li"),
    ]
      .filter(
        (el) =>
          isShown(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim()),
      )
      .concat(interactive);
    for (const el of texty) {
      const r = el.getBoundingClientRect();
      if (r.top < safe.top && r.bottom > 0 && window.scrollY === 0) {
        issues.push({ type: "under the notch", detail: describe(el) });
      }
      // Popup content scrolled out of the popup's own view isn't visible, so only count what shows.
      const box = dialog?.getBoundingClientRect();
      const shownBottom = box ? Math.min(r.bottom, box.bottom) : r.bottom;
      if (dialog && shownBottom > window.innerHeight - safe.bottom && r.top < shownBottom) {
        issues.push({ type: "under the home bar", detail: describe(el) });
      }
    }
  }

  const radii = [
    ...new Set(
      [...root.querySelectorAll(".glass, .glass-strong, button, a[href], input, select")]
        .filter(isShown)
        .map((el) => getComputedStyle(el).borderRadius)
        .filter((r) => r !== "0px")
        // rounded-full is "infinity", which computes to a huge number.
        .map((r) => (parseFloat(r) > 9999 ? "pill" : r)),
    ),
  ].sort();
  return { issues, radii };
}

/** At the end of a page, the footer must clear the home bar. */
function inspectPageEnd(safeBottom: number): Issue[] {
  window.scrollTo(0, document.documentElement.scrollHeight);
  const footer = document.querySelector("footer");
  const last = [...(footer?.querySelectorAll("a, p") ?? [])].at(-1);
  const r = last?.getBoundingClientRect();
  return r && r.bottom > window.innerHeight - safeBottom - 8
    ? [
        {
          type: "under the home bar",
          detail: `footer ends ${Math.round(window.innerHeight - r.bottom)}px from the bottom`,
        },
      ]
    : [];
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/`)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Preview server didn't start on port ${PORT}`);
}

async function main() {
  const args = process.argv.slice(2);
  const pick = (flag: string) => args.find((a) => a.startsWith(`--${flag}=`))?.split("=")[1];
  const only = pick("only")?.split(",");
  const widths = pick("widths")?.split(",").map(Number) ?? WIDTHS;
  const states = STATES.filter((s) => !only || only.includes(s.name));

  const server = spawn(process.execPath, ["scripts/preview.mjs"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });
  const browser = await chromium.launch();
  const report: string[] = ["# Screenshot report", ""];
  const radiiSeen = new Map<string, Set<string>>();
  let total = 0;
  let problems = 0;

  try {
    await waitForServer();
    for (const width of widths) {
      const phone = width < 768;
      const height = phone ? 844 : 900;
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width, height },
          colorScheme: theme,
          reducedMotion: "reduce",
          isMobile: phone,
          hasTouch: phone,
        });
        // tsx adds __name() calls to functions; the copies sent into the page need it defined.
        await context.addInitScript({ content: "window.__name = (f) => f;" });
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        page.on("console", (m) => {
          if (m.type() === "error" && !/404 \(Not Found\)/.test(m.text())) errors.push(m.text());
        });
        const safe = width <= 430 ? SAFE_AREA : null;
        if (safe) {
          const cdp = await context.newCDPSession(page);
          await cdp.send("Emulation.setSafeAreaInsetsOverride", {
            insets: {
              top: safe.top,
              topMax: safe.top,
              bottom: safe.bottom,
              bottomMax: safe.bottom,
              left: 0,
              leftMax: 0,
              right: 0,
              rightMax: 0,
            },
          });
        }

        for (const state of states) {
          if (state.maxWidth && width > state.maxWidth) continue;
          await page.setViewportSize({ width, height });
          await page.goto(`${BASE}${state.path}`, { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready);
          await state.action?.(page);
          if (state.viewportOnly) await page.waitForTimeout(150);

          const { issues, radii } = await page.evaluate(inspect, safe);
          if (!state.viewportOnly && safe)
            issues.push(...(await page.evaluate(inspectPageEnd, safe.bottom)));
          await page.evaluate(() => window.scrollTo(0, 0));
          radiiSeen.set(state.name, new Set([...(radiiSeen.get(state.name) ?? []), ...radii]));

          const dir = join(OUT, state.name);
          mkdirSync(dir, { recursive: true });
          const file = join(dir, `${width}-${theme}.png`);
          if (state.viewportOnly) {
            await page.screenshot({ path: file });
          } else {
            // Grow the window to the whole page, so the fixed background covers it all
            // (a plain full-page capture leaves a seam where the first screen ends).
            const full = await page.evaluate(() => document.documentElement.scrollHeight);
            await page.setViewportSize({ width, height: Math.max(height, full) });
            await page.waitForTimeout(50);
            await page.screenshot({ path: file });
          }
          total++;

          const all = [
            ...issues,
            ...errors.splice(0).map((e) => ({ type: "console error", detail: e })),
          ];
          const real = all.filter((i) => i.type !== "small inline link");
          problems += real.length;
          const label = `${state.name} ${width}px ${theme}`;
          if (all.length) {
            report.push(`## ${label}`, ...all.map((i) => `- **${i.type}**: ${i.detail}`), "");
          }
          process.stdout.write(real.length ? `✗ ${label}: ${real.length} issue(s)\n` : ".");
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }

  report.push("## Corner radii in use", "");
  for (const [state, radii] of radiiSeen) report.push(`- ${state}: ${[...radii].join(", ")}`);
  report.splice(2, 0, `${total} screenshots, ${problems} issue(s).`, "");
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "report.md"), `${report.join("\n")}\n`);
  console.log(
    `\n${total} screenshots in ./${OUT}, ${problems} issue(s). Details: ${OUT}/report.md`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
