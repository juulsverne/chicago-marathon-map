// Renders the 1200x630 share image (public/og.png) from the production build: the live
// map at 9:32 AM, mid-race, beside the title. Run against `next start`:
//   npm run build && npx next start -p 3101
//   npx tsx scripts/og-image.ts [http://127.0.0.1:3101/chicago-marathon-map]
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { COURSE_BOUNDS } from "../src/map/camera";

const base = process.argv[2] ?? "http://127.0.0.1:3101/chicago-marathon-map";
const W = 1200;
const H = 630;
const MAP_W = 600;
const MINUTE = 572; // 9:32 AM: the first finisher, the field strung out over the course

const font = (pkg: string, file: string) =>
  `data:font/woff2;base64,${readFileSync(`node_modules/@fontsource/${pkg}/files/${file}`).toString("base64")}`;

async function main() {
  const browser = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist"] });

  // 1. The map alone, at twice the pixels it will be shown at.
  const ctx = await browser.newContext({ viewport: { width: MAP_W, height: H }, deviceScaleFactor: 2, colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date("2026-10-09T18:00:00Z") });
  await page.goto(base);
  await page.waitForSelector('[data-map-ready="true"]', { timeout: 60_000 });
  await page.getByRole("button", { name: "Pause", includeHidden: true }).evaluate((b) => (b as HTMLButtonElement).click());
  await page.getByLabel("Time on race day").evaluate((el, t) => {
    const input = el as HTMLInputElement;
    input.value = String(t);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, MINUTE);
  // The map alone: hide the interface over it, then frame the whole course.
  await page.addStyleTag({ content: "[data-map-inset], [data-testid='panel-slot'], [data-testid='panel'] { display: none !important; }" });
  await page.evaluate(
    ([bounds]) => window.__cmm?.map.fitBounds(bounds, { padding: { top: 36, bottom: 36, left: 150, right: 36 }, duration: 0 }),
    [COURSE_BOUNDS] as const,
  );
  await page.waitForTimeout(2500);
  const map = (await page.screenshot()).toString("base64");
  await ctx.close();

  // 2. The card.
  const card = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await card.setContent(`<!doctype html>
  <style>
    @font-face { font-family: Display; src: url(${font("big-shoulders", "big-shoulders-latin-800-normal.woff2")}); }
    @font-face { font-family: Sans; font-weight: 500; src: url(${font("instrument-sans", "instrument-sans-latin-500-normal.woff2")}); }
    @font-face { font-family: Sans; font-weight: 600; src: url(${font("instrument-sans", "instrument-sans-latin-600-normal.woff2")}); }
    @font-face { font-family: Mono; src: url(${font("ibm-plex-mono", "ibm-plex-mono-latin-600-normal.woff2")}); }
    * { margin: 0; box-sizing: border-box; }
    body { width: ${W}px; height: ${H}px; background: #0c0d0f; color: #f2f4f6; overflow: hidden; position: relative; }
    .map { position: absolute; top: 0; right: 0; width: ${MAP_W}px; height: ${H}px; background: url(data:image/png;base64,${map}) center / cover; }
    .fade { position: absolute; top: 0; right: ${MAP_W - 160}px; width: 160px; height: ${H}px; background: linear-gradient(90deg, #0c0d0f, rgba(12, 13, 15, 0)); }
    .text { position: absolute; left: 64px; top: 64px; bottom: 56px; width: 560px; display: flex; flex-direction: column; }
    .eyebrow { font: 600 18px/1 Mono; letter-spacing: 0.08em; color: #a0a8b2; text-transform: uppercase; }
    h1 { margin-top: 28px; font: 800 104px/0.92 Display; text-transform: uppercase; letter-spacing: 0.005em; }
    h1 span { color: #ff3b57; }
    p { margin-top: 28px; font: 500 26px/1.35 Sans; color: #d5dade; }
    .foot { margin-top: auto; display: flex; gap: 14px; align-items: center; font: 600 17px/1 Mono; color: #79818b; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #ff3b57; }
  </style>
  <div class="map"></div><div class="fade"></div>
  <div class="text">
    <div class="eyebrow">Chicago Marathon · Sunday, Oct 11, 2026</div>
    <h1>Race-day<br><span>street</span><br>closures</h1>
    <p>All 41 street closures on one live map, with 55,000 modeled runners.</p>
    <div class="foot"><i class="dot"></i>lab.elijahos.com/chicago-marathon-map · Unofficial</div>
  </div>`);
  await card.evaluate(() => document.fonts.ready);
  writeFileSync("public/og.png", await card.screenshot({ type: "png" }));
  await browser.close();
  console.log("wrote public/og.png");
}

void main();
