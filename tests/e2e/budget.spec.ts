import { gzipSync } from "node:zlib";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { APP } from "./app";

// At most 150 KB of gzipped JavaScript before the map engine loads,
// measured as 150,000 bytes at gzip level 9 per file, summed.
const BUDGET_BYTES = 150_000;
/** The one project the budget is measured in (the bytes are the same on every device). */
const BUDGET_PROJECT = "desktop";
/** MapLibre's own error class: it names the engine, so it must be in the engine's scripts and in no first-load script. */
const MAPLIBRE_SENTINEL = "GPUInitializationError";

async function gzippedSize(request: APIRequestContext, url: string): Promise<{ bytes: number; text: string }> {
  const body = await (await request.get(url)).body();
  return { bytes: gzipSync(body, { level: 9 }).length, text: body.toString("utf8") };
}

test.describe("JavaScript budget", () => {
  // The gates below skip every project but one; if that project were renamed, they would skip
  // everywhere and stay green. This runs in every project and fails then.
  test("the budget is measured in a project that exists", async ({}, testInfo) => {
    const projects = testInfo.config.projects.map((p) => p.name);
    expect(projects, `the budget tests run only in the "${BUDGET_PROJECT}" project`).toContain(BUDGET_PROJECT);
  });

  test("the prerendered page loads at most 150 KB of gzipped module scripts", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== BUDGET_PROJECT, "the bytes are the same on every device; measured once");
    const html = await (await request.get(APP)).text();
    // <script src> and <link rel="preload"> tags for .js files; legacy nomodule polyfills never run in modern browsers.
    const tags = [...html.matchAll(/<(script|link)\b[^>]*?(?:src|href)="([^"]+\.js)"[^>]*>/g)];
    const urls = [...new Set(tags.filter((m) => !/\bnomodule\b/i.test(m[0])).map((m) => m[2]))];
    expect(urls.length).toBeGreaterThan(0);
    let total = 0;
    for (const url of urls) {
      const { bytes, text } = await gzippedSize(request, url);
      expect(text, `${url} must not contain MapLibre`).not.toContain(MAPLIBRE_SENTINEL);
      expect(text, `${url} must not contain the interaction layer`).not.toContain("number-flow-react");
      // GSAP and its plugins load only when the story opens (src/ui/story).
      expect(text, `${url} must not contain GSAP`).not.toContain("ScrollTrigger");
      total += bytes;
    }
    console.log(`[js-budget] prerendered page: ${total} bytes gzipped in ${urls.length} scripts`);
    expect(total).toBeLessThanOrEqual(BUDGET_BYTES);
  });

  test("everything fetched before the map engine is requested stays under 150 KB gzipped", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== BUDGET_PROJECT, "the bytes are the same on every device; measured once");
    await page.goto(APP);
    await expect(page.getByTestId("map-stage")).toHaveAttribute("data-map-ready", "true", { timeout: 30_000 });
    // MapStage marks "cmm:map-import" right before it requests the engine chunk (and MapLibre with it).
    const { mark, scripts } = await page.evaluate(() => {
      const m = performance.getEntriesByName("cmm:map-import")[0];
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      return {
        mark: m?.startTime ?? -1,
        scripts: entries.filter((e) => /\.m?js(\?|$)/.test(e.name)).map((e) => ({ url: e.name, start: e.startTime })),
      };
    });
    expect(mark).toBeGreaterThan(0);
    const before = scripts.filter((s) => s.start < mark);
    let total = 0;
    for (const s of before) {
      const { bytes, text } = await gzippedSize(request, s.url);
      expect(text, `${s.url} must not contain MapLibre`).not.toContain(MAPLIBRE_SENTINEL);
      // The interaction layer (src/ui/interaction.tsx) loads after the engine is requested, never before.
      expect(text, `${s.url} must not contain the interaction layer`).not.toContain("number-flow-react");
      total += bytes;
    }
    console.log(`[js-budget] before the map engine: ${total} bytes gzipped in ${before.length} scripts`);
    expect(total).toBeLessThanOrEqual(BUDGET_BYTES);
    // The engine itself did load, after the mark, and the sentinel above really is in it. Without
    // this the "must not contain MapLibre" checks would pass by accident if MapLibre renamed it.
    const after = scripts.filter((s) => s.start >= mark);
    expect(after.length).toBeGreaterThan(0);
    const engineScripts: string[] = [];
    for (const s of after) {
      if ((await gzippedSize(request, s.url)).text.includes(MAPLIBRE_SENTINEL)) engineScripts.push(s.url);
    }
    expect(engineScripts.length, `${MAPLIBRE_SENTINEL} is in no script fetched after the map import`).toBeGreaterThan(0);
  });
});
