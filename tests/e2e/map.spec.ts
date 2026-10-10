import { expect, test } from "@playwright/test";
import { APP } from "./app";
import { closedState, layerAtOpenMap, openMap, seek } from "./helpers";

test("paints the SVG course first, then loads MapLibre after first paint", async ({ page }) => {
  // No fake clock here: it would also fake the performance timeline this test reads.
  await page.goto(APP);
  await expect(page.locator(".course-seg")).toHaveCount(41);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-ready", "true");
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-engine", "map", { timeout: 20_000 });
  const timing = await page.evaluate(() => ({
    importAt: performance.getEntriesByName("cmm:map-import")[0]?.startTime ?? -1,
    paintAt: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? -1,
  }));
  expect(timing.paintAt).toBeGreaterThan(0);
  expect(timing.importAt).toBeGreaterThan(timing.paintAt);
});

test("cross-fades from the SVG course to the map, then stops updating the SVG", async ({ page }) => {
  await openMap(page);
  await expect(page.getByTestId("map").locator("canvas")).toBeVisible();
  await expect(page.locator(".map-svg")).toBeHidden();
  expect(await layerAtOpenMap(page)).toBe("map"); // the map takes the pointer once it is showing
  // The SVG's live layer (leaders and closure states) unmounts once the fade is over.
  await expect(page.locator(".map-svg .leader")).toHaveCount(0);
});

test("colors closures on the map through feature-state", async ({ page }) => {
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 630); // 10:30 AM: Columbus Dr and Grand Ave reopen
  await expect.poll(() => closedState(page, 0)).toBe(0);
  await expect.poll(() => closedState(page, 2)).toBe(1);
  await seek(page, 359); // before the 6:00 AM closures only the finish area is closed
  await expect.poll(() => closedState(page, 2)).toBe(0);
  await expect.poll(() => closedState(page, 40)).toBe(1);
});

test("eases a closure over 400 ms instead of flipping it", async ({ page }) => {
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 629);
  await expect.poll(() => closedState(page, 0)).toBe(1);
  // Freeze the page's clock, so frames (and the tween) advance only when the test says so.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await seek(page, 630); // 10:30 AM: Columbus Dr reopens
  await page.clock.runFor(200); // halfway through the ease
  const halfway = await closedState(page, 0);
  expect(halfway).toBeGreaterThan(0);
  expect(halfway).toBeLessThan(1);
  await page.clock.runFor(400);
  expect(await closedState(page, 0)).toBe(0);
});

test("runs under the Content-Security-Policy with no errors and no third-party requests", async ({ page, baseURL }) => {
  const problems: string[] = [];
  const foreign: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`));
  });
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("console", (m) => {
    // Warnings are left out: headless Chromium's GL driver logs performance notes as warnings.
    if (m.type() === "error") problems.push(m.text());
  });
  page.on("request", (r) => {
    if (!r.url().startsWith(`${baseURL}${APP}`)) foreign.push(r.url());
  });
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 540);
  // loaded(): the style, every source and every label font that is needed have arrived.
  await expect.poll(() => page.evaluate(() => window.__cmm?.map.loaded())).toBe(true);
  expect(problems).toEqual([]);
  expect(foreign).toEqual([]);
});

test("streams the tier's share of the field mid-race in one custom layer, and nobody before the gun", async ({ page }) => {
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 540); // 9:00 AM: every modeled runner is on the course
  const tier = (await page.getByTestId("map-stage").getAttribute("data-tier")) as "high" | "medium" | "low";
  await expect.poll(() => page.evaluate(() => window.__cmm?.runners.drawn)).toBe({ high: 5300, medium: 2650, low: 1325 }[tier]);
  expect(await page.evaluate(() => window.__cmm?.map.getLayer("runners")?.type)).toBe("custom");
  await seek(page, 400); // 6:40 AM: the race has not started
  await expect.poll(() => page.evaluate(() => window.__cmm?.runners.drawn)).toBe(0);
});

test("draws the leaders with name labels that do not overlap", async ({ page }) => {
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 455); // 7:35 AM: the men's leader and world-record pace run side by side
  await page.evaluate(() => window.__cmm?.map.jumpTo({ center: [-87.6259, 41.8916], zoom: 13 }));
  const pills = page.locator(".leader-label");
  await expect(pills.filter({ visible: true })).toHaveCount(5); // all five shown leaders are on the course
  const boxes = await pills.filter({ visible: true }).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      expect(overlap).toBe(false);
    }
  }
  await expect(page.locator('.leader-label[data-leader="men"]')).toHaveText("Men's leader");
  expect(await page.evaluate(() => window.__cmm?.runners.leadersDrawn)).toEqual(["wcm", "wcw", "men", "wom", "wr"]);
});
