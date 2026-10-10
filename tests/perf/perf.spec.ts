import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Release gates, measured on the production build. Headless Chromium may
// draw WebGL in software; every test logs the renderer so results can be read in
// context. The thresholds are never relaxed for a slow renderer.

const APP = "/chicago-marathon-map";

type PerfLog = { cls: number; longTasks: { start: number; duration: number }[] };

/** requestAnimationFrame intervals over `ms` of real time. */
async function frameIntervals(page: Page, ms: number): Promise<number[]> {
  return page.evaluate(
    (duration) =>
      new Promise<number[]>((resolve) => {
        const times: number[] = [];
        const tick = (now: number) => {
          times.push(now);
          if (now - times[0] < duration) requestAnimationFrame(tick);
          else resolve(times.slice(1).map((t, i) => t - times[i]));
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

function quantile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

async function logRenderer(page: Page, testInfo: TestInfo) {
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "no WebGL2";
  });
  testInfo.annotations.push({ type: "webgl-renderer", description: renderer });
  console.log(`[${testInfo.project.name}] WebGL renderer: ${renderer}`);
}

/** Records layout shifts and long tasks from the very start of the page. */
async function observe(page: Page) {
  await page.addInitScript(() => {
    const log: PerfLog = { cls: 0, longTasks: [] };
    (window as unknown as { perfLog: PerfLog }).perfLog = log;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!e.hadRecentInput) log.cls += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) log.longTasks.push({ start: e.startTime, duration: e.duration });
    }).observe({ type: "longtask", buffered: true });
  });
}

const perfLog = (page: Page) => page.evaluate(() => (window as unknown as { perfLog: PerfLog }).perfLog);

/** Milliseconds a fixed piece of busy JavaScript takes in the page. */
const cpuProbe = (page: Page) =>
  page.evaluate(() => {
    const start = performance.now();
    let x = 0;
    for (let i = 0; i < 10_000_000; i++) x += Math.sqrt(i);
    return x > 0 ? performance.now() - start : 0;
  });

/** Opens the app, waits for MapLibre, and parks the clock at `minute` (by default 9:00 AM,
 *  mid-race, when every modeled runner is on the course). */
async function openMidRace(page: Page, minute = 540) {
  await page.goto(APP);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-map-ready", "true", { timeout: 60_000 });
  const pause = page.getByRole("button", { name: "Pause" });
  if (await pause.isVisible()) await pause.click();
  await page.getByLabel("Time on race day").evaluate((el, value) => {
    const input = el as HTMLInputElement;
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, minute);
}

/** Plays at the default 5 race minutes per second, lets the governor settle (its
 *  3 s warm-up and one 2 s window, plus margin), then samples 5 s of frames. The
 *  quality tier must not move from Play to the end of the sample: a run the governor
 *  stepped down (or up) would be measured at a different tier from the one it started
 *  at, and a step down would pass the gate by drawing fewer runners. */
async function measurePlayback(page: Page) {
  const stage = page.getByTestId("map-stage");
  const tierBefore = await stage.getAttribute("data-tier");
  expect(tierBefore, "the quality tier is set once the map is ready").not.toBeNull();
  // Every change of data-tier from here on, so a step down and back up cannot hide.
  await page.evaluate(() => {
    const changes: (string | null)[] = [];
    (window as unknown as { tierChanges: typeof changes }).tierChanges = changes;
    const stageEl = document.querySelector('[data-testid="map-stage"]');
    if (!stageEl) throw new Error("no map stage");
    new MutationObserver(() => changes.push(stageEl.getAttribute("data-tier"))).observe(stageEl, {
      attributes: true,
      attributeFilter: ["data-tier"],
    });
  });
  await page.getByRole("button", { name: "Play race day" }).click();
  await page.waitForTimeout(6000);
  const start = await page.evaluate(() => performance.now());
  const intervals = await frameIntervals(page, 5000);
  const tier = await stage.getAttribute("data-tier");
  const tierChanges = await page.evaluate(() => (window as unknown as { tierChanges: (string | null)[] }).tierChanges);
  expect(tierChanges, `the quality tier changed during playback (it started at ${tierBefore})`).toEqual([]);
  expect(tier, "the quality tier at the end of the sample").toBe(tierBefore);
  return { start, intervals, tier, median: quantile(intervals, 0.5), p95: quantile(intervals, 0.95) };
}

test("phone, 4x CPU throttle: mid-race playback holds 50 fps with p95 under 33 ms", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "perf-phone", "phone profile only");
  await observe(page);
  await logRenderer(page, testInfo);
  await openMidRace(page);
  // Throttle the page's own renderer process (navigation can swap processes, so after
  // load) and prove the throttle took: the same busy loop must run several times slower.
  const fast = await cpuProbe(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const slow = await cpuProbe(page);
  console.log(`[perf-phone] CPU probe ${fast.toFixed(1)} ms, throttled ${slow.toFixed(1)} ms`);
  expect(slow / fast).toBeGreaterThan(2.5);

  const run = await measurePlayback(page);
  console.log(`[perf-phone] tier ${run.tier}, ${run.intervals.length} frames, median ${run.median.toFixed(1)} ms, p95 ${run.p95.toFixed(1)} ms`);
  expect(run.median).toBeLessThanOrEqual(20); // at least 50 fps
  expect(run.p95).toBeLessThanOrEqual(33);

  const { longTasks, cls } = await perfLog(page);
  expect(longTasks.filter((t) => t.start >= run.start && t.duration > 100)).toEqual([]);
  expect(cls).toBeLessThan(0.02);
});

test("phone, 4x CPU throttle: dawn playback, with the light changing every update, holds 50 fps", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "perf-phone", "phone profile only");
  await observe(page);
  // 6:20 AM: the sample runs from about 6:50 to 7:15, through sunrise (6:59), so every
  // light update changes the palette and the sky.
  await openMidRace(page, 380);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const run = await measurePlayback(page);
  console.log(`[perf-phone] dawn: tier ${run.tier}, ${run.intervals.length} frames, median ${run.median.toFixed(1)} ms, p95 ${run.p95.toFixed(1)} ms`);
  expect(run.median).toBeLessThanOrEqual(20);
  expect(run.p95).toBeLessThanOrEqual(33);
  const { longTasks } = await perfLog(page);
  expect(longTasks.filter((t) => t.start >= run.start && t.duration > 100)).toEqual([]);
});

test("phone on Fast 4G with a mid-tier CPU: Largest Contentful Paint under 2.5 s", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "perf-phone", "phone profile only");
  // Chrome DevTools' Fast 4G preset (9 Mbps down, 1.5 Mbps up, each at 90%; 60 ms RTT
  // scaled by 2.75) and Lighthouse's 4x CPU slowdown for a mid-tier phone. A fresh
  // context, so nothing is cached.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 60 * 2.75,
    downloadThroughput: ((9 * 1000 * 1000) / 8) * 0.9,
    uploadThroughput: ((1.5 * 1000 * 1000) / 8) * 0.9,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    const w = window as unknown as { lcp: { time: number; tag: string } };
    w.lcp = { time: 0, tag: "" };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { element?: Element | null })[]) {
        w.lcp = { time: e.startTime, tag: e.element ? `${e.element.tagName.toLowerCase()}${e.element.getAttribute("data-testid") ? `[${e.element.getAttribute("data-testid")}]` : ""}` : "?" };
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(APP, { waitUntil: "load" });
  // LCP is final once the page stops painting larger content; the map engine loads after
  // first paint and its canvas is not a contentful candidate.
  await page.waitForTimeout(3000);
  const lcp = await page.evaluate(() => (window as unknown as { lcp: { time: number; tag: string } }).lcp);
  console.log(`[perf-phone] LCP ${lcp.time.toFixed(0)} ms on ${lcp.tag}`);
  expect(lcp.time).toBeGreaterThan(0);
  expect(lcp.time).toBeLessThan(2500);
});

test("desktop: mid-race playback holds 60 fps", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "perf-desktop", "desktop profile only");
  await observe(page);
  await logRenderer(page, testInfo);
  await openMidRace(page);
  const run = await measurePlayback(page);
  console.log(`[perf-desktop] tier ${run.tier}, ${run.intervals.length} frames, median ${run.median.toFixed(1)} ms, p95 ${run.p95.toFixed(1)} ms`);
  // 60 fps: rAF intervals are vsync-quantized (16.7 ms at 60 Hz; one dropped frame
  // doubles an interval to 33 ms). A median within 5% of 16.7 ms is steady 60 fps, and
  // a p95 at or under 20 ms means fewer than 5% of frames were dropped.
  expect(run.median).toBeLessThanOrEqual(17.5);
  expect(run.p95).toBeLessThanOrEqual(20);

  const { longTasks, cls } = await perfLog(page);
  expect(longTasks.filter((t) => t.start >= run.start && t.duration > 100)).toEqual([]);
  expect(cls).toBeLessThan(0.02);
});
