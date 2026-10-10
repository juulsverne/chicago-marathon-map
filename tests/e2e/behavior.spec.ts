import { expect, test, type Page } from "@playwright/test";
import { APP } from "./app";
import { closedSegments, leaderDrawn, segmentClosed } from "./helpers";

async function seek(page: Page, minutes: number) {
  await page.getByLabel("Time on race day").evaluate((el, v) => {
    const input = el as HTMLInputElement;
    input.value = String(v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, minutes);
}

// The UI lives inside <main class="overflow-hidden">, so documentElement.scrollWidth never
// grows when content spills sideways. Measure the panels and everything visible in them.
// Content inside a sideways-scrolling row of a panel (the key-moment pills) counts only
// where that row shows it: the row clips it, and the row itself must fit.
async function expectPanelsInsideViewport(page: Page) {
  const panels = ["header-card", "clock-card", "timeline-panel", "panel"];
  for (const id of panels) await expect(page.getByTestId(id)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const spills = await page.evaluate((ids) => {
    const tolerance = 0.5;
    const width = window.innerWidth;
    const out: string[] = [];
    for (const id of ids) {
      const root = document.querySelector(`[data-testid="${id}"]`);
      if (!root) {
        out.push(`${id}: missing`);
        continue;
      }
      for (const el of [root, ...Array.from(root.querySelectorAll("*"))]) {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const box = el.getBoundingClientRect();
        if (box.width === 0 && box.height === 0) continue;
        let left = box.left;
        let right = box.right;
        for (let a = el.parentElement; a && root.contains(a); a = a.parentElement) {
          if (getComputedStyle(a).overflowX === "visible") continue;
          const clip = a.getBoundingClientRect();
          left = Math.max(left, clip.left);
          right = Math.min(right, clip.right);
        }
        if (right <= left) continue; // scrolled out of view inside its row
        if (left < -tolerance || right > width + tolerance) {
          const label = el.getAttribute("data-testid") ?? el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 30);
          out.push(`${id} > <${el.tagName.toLowerCase()}> "${label}": left ${left.toFixed(1)}, right ${right.toFixed(1)} (viewport ${width})`);
        }
      }
    }
    return out;
  }, panels);
  expect(spills).toEqual([]);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("replay", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-09T18:00:00Z") });
  });

  test("plays from 5:50 AM through the 6:00 closures", async ({ page }) => {
    await page.goto(APP);
    await expect(page.getByTestId("closed-count")).toHaveText("41 of 41 closed", { timeout: 15_000 });
    await expect.poll(() => closedSegments(page), { timeout: 15_000 }).toBe(41);
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(page.getByTestId("date-chip")).toHaveText("Race day in 2 days");
  });

  test("scrubs to any moment", async ({ page }) => {
    await page.goto(APP);
    await page.getByRole("button", { name: "Pause" }).click();
    await seek(page, 630);
    await expect(page.getByTestId("clock")).toHaveText("10:30 AM");
    // The panel's one-line summary.
    await expect(page.getByTestId("closed-count")).toHaveText("39 of 41 closed");
    await expect(page.getByTestId("next-reopen")).toHaveText("Next to reopen: Dearborn St at 11:00 AM CT");
    await expect.poll(() => segmentClosed(page, 0)).toBe(false); // segment 0: columbus-dr-start-to-grand-ave
    await expect(page.getByLabel("Time on race day")).toHaveAttribute("aria-valuetext", "10:30 AM CT");
  });

  test("shows leaders on the course mid-race", async ({ page }) => {
    await page.goto(APP);
    await page.getByRole("button", { name: "Pause" }).click();
    await seek(page, 540);
    await expect.poll(() => leaderDrawn(page, "men")).toBe(true);
    expect(await leaderDrawn(page, "you")).toBe(false);
  });
});

test.describe("reduced motion", () => {
  // The browser's zone is nowhere near Chicago, so a local-time shortcut in the app cannot pass by luck.
  test.use({ reducedMotion: "reduce", timezoneId: "Asia/Tokyo" });

  test("opens paused at 5:50 AM until Play is pressed", async ({ page }) => {
    // Pin the date: during race hours the app would correctly open Live instead.
    await page.clock.install({ time: new Date("2026-10-09T18:00:00Z") });
    await page.goto(APP);
    const play = page.getByRole("button", { name: "Play race day" });
    await expect(play).toBeVisible();
    // The Play button is server-rendered. The date chip exists only after hydration, so once it shows,
    // the 1.5 s hold below watches the hydrated clock rather than the static HTML.
    await expect(page.getByTestId("date-chip")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.getByTestId("clock")).toHaveText("5:50 AM");
    await play.click();
    await expect(page.getByTestId("clock")).not.toHaveText("5:50 AM", { timeout: 5_000 });
  });
});

test.describe("race day", () => {
  // These dates and times are Chicago's by design; a browser in Tokyo would expose any local-time math.
  test.use({ timezoneId: "Asia/Tokyo" });

  test("opens Live on the real clock during race hours", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-11T14:00:00Z") });
    await page.goto(APP);
    await expect(page.getByTestId("clock")).toHaveText("9:00 AM");
    await expect(page.getByRole("button", { name: "Live" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("date-chip")).toHaveText("Race day today");
  });

  test("offers Live but replays before 5:00 AM", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-11T09:30:00Z") });
    await page.goto(APP);
    await expect(page.getByRole("button", { name: "Live" })).toHaveAttribute("aria-pressed", "false");
  });

  test("becomes a replay after race day", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-12T15:00:00Z") });
    await page.goto(APP);
    await expect(page.getByTestId("date-chip")).toHaveText("Race day replay · Oct 11, 2026");
    await expect(page.getByRole("button", { name: "Live" })).toHaveCount(0);
  });
});

test.describe("layout", () => {
  for (const width of [320, 375, 1440]) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.clock.install({ time: new Date("2026-10-09T18:00:00Z") });
      await page.setViewportSize({ width, height: 800 });
      await page.goto(APP);
      await expect(page.getByTestId("date-chip")).toBeVisible();
      await expect(page.getByTestId("clock")).toBeVisible();
      await expectPanelsInsideViewport(page);
    });
  }

  test("has no horizontal overflow at 320px on race day, with the Live pill", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-11T14:00:00Z") });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(APP);
    await expect(page.getByTestId("date-chip")).toBeVisible();
    await expect(page.getByTestId("clock")).toBeVisible();
    await expect(page.getByRole("button", { name: "Live" })).toBeVisible();
    await expectPanelsInsideViewport(page);
  });

  test("loads without console errors", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-09T18:00:00Z") });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(APP);
    // Through hydration and MapLibre's load: the style, every source and the label fonts.
    // Not map.loaded(): playback runs through dawn here, and the light's paint transitions
    // keep the map from ever being idle, which loaded() also requires.
    await expect(page.getByTestId("map-stage")).toHaveAttribute("data-map-ready", "true", { timeout: 20_000 });
    await expect
      .poll(() => page.evaluate(() => Boolean(window.__cmm?.map.isStyleLoaded() && window.__cmm?.map.areTilesLoaded())))
      .toBe(true);
    expect(errors).toEqual([]);
  });
});
