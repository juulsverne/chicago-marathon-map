import { expect, test, type Locator } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, seek } from "./helpers";

const RACE_DAY_9AM = new Date("2026-10-11T14:00:00Z");
/** The pill reads "~9:32a First finisher"; its name starts with that and then explains it (WCAG 2.5.3). */
const FIRST_FINISHER = "~9:32a First finisher: about 9:32 AM CT, first runner finishes";
/** The speed button reads "Per second" over "5 min"; its name starts with that and then explains it. */
const SPEED_BUTTON = /^Per second \d+ min: /;

/** WCAG contrast ratio between an element's text color and its own background color. */
async function textContrast(locator: Locator): Promise<number> {
  return locator.evaluate((el) => {
    const rgb = (color: string) => {
      const m = /^rgba?\(([\d.]+), ([\d.]+), ([\d.]+)/.exec(color);
      if (!m) throw new Error(`Not an rgb() color: ${color}`);
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    };
    const luminance = ([r, g, b]: number[]) => {
      const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const style = getComputedStyle(el);
    const [a, b] = [luminance(rgb(style.color)), luminance(rgb(style.backgroundColor))];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

test.describe("timeline dock", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: REPLAY_DAY });
    await page.goto(APP);
    await expect(page.getByTestId("map-stage")).toHaveAttribute("data-ready", "true");
  });

  test("jumps to a key moment, pauses there and marks it current", async ({ page }) => {
    await page.getByRole("button", { name: FIRST_FINISHER, exact: true }).click();
    await expect(page.getByTestId("clock")).toHaveText("9:32 AM");
    await expect(page.getByRole("button", { name: "Play race day" })).toBeVisible();
    await expect(page.getByRole("button", { name: FIRST_FINISHER, exact: true })).toHaveAttribute("data-state", "current");
    await expect(page.getByRole("button", { name: "6:00a Streets close: 6:00 AM CT, streets close", exact: true })).toHaveAttribute("data-state", "past");
    await expect(page.getByRole("button", { name: "6:00p All streets open: 6:00 PM CT, last street reopens", exact: true })).toHaveAttribute(
      "data-state",
      "future",
    );
    // In the dock: the panel's race-week and waves sections carry the same caption.
    await expect(page.getByTestId("timeline-panel").getByText("Times CT")).toBeVisible();
  });

  test("cycles playback speed through 1, 5 and 15 minutes per second", async ({ page }) => {
    const speed = page.getByRole("button", { name: SPEED_BUTTON });
    await expect(speed).toHaveAttribute("aria-label", "Per second 5 min: playback speed, one second equals 5 minutes of race day. Tap to change.");
    await expect(speed).toContainText("5 min");
    await speed.click();
    await expect(speed).toHaveAttribute("aria-label", "Per second 15 min: playback speed, one second equals 15 minutes of race day. Tap to change.");
    await speed.click();
    await expect(speed).toHaveAttribute("aria-label", "Per second 1 min: playback speed, one second equals 1 minute of race day. Tap to change.");
    await speed.click();
    await expect(speed).toHaveAttribute("aria-label", "Per second 5 min: playback speed, one second equals 5 minutes of race day. Tap to change.");
  });

  test("names every dock button after the text it shows, then explains it (WCAG 2.5.3)", async ({ page }) => {
    const buttons = await page.getByRole("region", { name: "Race day timeline" }).getByRole("button").all();
    expect(buttons.length).toBeGreaterThanOrEqual(7); // play, speed, five moments
    for (const button of buttons) {
      const { shown, name } = await button.evaluate((el) => ({
        // innerText keeps the line breaks between a button's parts; the match ignores case and spacing, as WCAG's does.
        shown: (el as HTMLElement).innerText.replace(/\s+/g, " ").trim().toLowerCase(),
        name: (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase(),
      }));
      if (shown) expect(name.startsWith(shown), `"${name}" must start with its visible text "${shown}"`).toBe(true);
    }
  });

  test("draws the runner histogram, five moment ticks and the hours with the scrubber", async ({ page }, testInfo) => {
    await expect(page.getByTestId("runner-histogram").locator("path")).toHaveAttribute("d", /^M0 20L/);
    await expect(page.getByTestId("moment-tick")).toHaveCount(5);
    // v1's axis: every two hours, or every four where the bar is narrow.
    const hours = await page.getByTestId("timeline-hours").evaluate((el) => (el as HTMLElement).innerText.trim().split(/\s+/).join(" "));
    expect(hours).toMatch(testInfo.project.name === "desktop" ? /^6a 8a 10a 12p 2p 4p 6p$/ : /^6a (8a )?10a (12p )?2p (4p )?6p$/);
    // The baseline and the histogram fill red up to the thumb.
    await page.getByRole("button", { name: "Pause" }).click();
    await seek(page, 720);
    const fill = () => page.getByLabel("Time on race day").evaluate((el) => getComputedStyle(el).getPropertyValue("--p"));
    await expect.poll(fill).toBe("0.5");
  });

  test("matches the clock card to the header beside it", async ({ page }, testInfo) => {
    const header = await page.getByTestId("header-card").boundingBox();
    const clock = await page.getByTestId("clock-card").boundingBox();
    expect(clock?.y).toBe(header?.y);
    expect(clock?.height).toBe(header?.height);
    // From 768 px the clock has the header's chip row: what is happening at the map time.
    if (testInfo.project.name !== "desktop") return;
    await page.getByRole("button", { name: "Pause" }).click();
    const phase = page.getByTestId("clock-phase");
    for (const [minute, text] of [
      [350, "Before closures"],
      [400, "Streets closed"],
      [600, "Runners finishing"],
      [1100, "Streets open"],
    ] as const) {
      await seek(page, minute);
      await expect(phase).toHaveText(text);
    }
    expect((await page.getByTestId("clock-card").boundingBox())?.width).toBe(clock?.width);
  });

  test("gives every dock control a 44 px target", async ({ page }) => {
    const controls = [page.getByTestId("play-button"), page.getByRole("button", { name: SPEED_BUTTON })];
    for (const pill of await page.getByRole("group", { name: "Key moments" }).getByRole("button").all()) controls.push(pill);
    expect(controls).toHaveLength(7);
    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});

test("shows a pressed Live button that is readable and 44 px tall on race day", async ({ page }) => {
  await page.clock.install({ time: RACE_DAY_9AM });
  await page.goto(APP);
  const live = page.getByRole("button", { name: "Live" });
  await expect(live).toHaveAttribute("aria-pressed", "true");
  expect(await textContrast(live)).toBeGreaterThanOrEqual(4.5);
  expect((await live.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test("leaves the panel slot clear on wide screens", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the panel slot exists from 768 px");
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  const width = page.viewportSize()?.width ?? 0;
  const dock = await page.getByRole("region", { name: "Race day timeline" }).boundingBox();
  expect(width).toBeGreaterThanOrEqual(1180);
  expect((dock?.x ?? 0) + (dock?.width ?? 0)).toBeLessThanOrEqual(width - 400);
});

test("does not shift the layout while the page settles", async ({ page }) => {
  // No fake clock: it would freeze the performance timeline that reports layout shifts.
  await page.addInitScript(() => {
    (window as unknown as { cls: number }).cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) (window as unknown as { cls: number }).cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(APP);
  // Through hydration, MapLibre's arrival and the 6:00 AM closures (the dock text changes).
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-map-ready", "true", { timeout: 20_000 });
  await expect(page.getByTestId("closed-count")).toContainText("41", { timeout: 15_000 });
  expect(await page.evaluate(() => (window as unknown as { cls: number }).cls)).toBeLessThan(0.02);
});

test("reserves the date chip's row, so hydration moves nothing", async ({ browser, page }) => {
  // The prerendered page (no JavaScript) has no chip yet; the hydrated page does.
  const prerendered = await browser.newContext({ javaScriptEnabled: false, viewport: page.viewportSize() });
  const before = await prerendered.newPage();
  await before.goto(APP);
  const header = await before.getByTestId("header-card").boundingBox();
  const clock = await before.getByTestId("clock").boundingBox();
  await prerendered.close();

  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  await expect(page.getByTestId("date-chip")).toBeVisible();
  expect((await page.getByTestId("header-card").boundingBox())?.height).toBe(header?.height);
  expect((await page.getByTestId("clock").boundingBox())?.y).toBe(clock?.y);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows a prominent, labelled and readable Play button", async ({ page }) => {
    await page.clock.install({ time: REPLAY_DAY });
    await page.goto(APP);
    await expect(page.getByTestId("map-stage")).toHaveAttribute("data-ready", "true");
    const play = page.getByTestId("play-button");
    await expect(play).toHaveAccessibleName("Play race day");
    await expect(play).toContainText("Play race day");
    expect((await play.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(120);
    expect(await textContrast(play)).toBeGreaterThanOrEqual(4.5);
  });
});
