import { expect, test } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, openMap, raiseSheet, seek } from "./helpers";

// Every closure's reopening time as the list shows it (the finish area reopens on Monday).
const REOPENS = ["10:30 AM", "10:30 AM", "11:00 AM", "11:00 AM", "11:30 AM", ...Array(5).fill("12:00 PM"), "12:30 PM", "12:30 PM", "12:45 PM", "12:45 PM", "1:00 PM", "1:00 PM", "1:15 PM", "1:30 PM", "1:30 PM", "1:30 PM", "1:45 PM", "2:00 PM", "2:00 PM", "2:30 PM", "2:30 PM", "2:45 PM", "3:00 PM", "3:15 PM", "3:15 PM", "3:15 PM", "3:30 PM", "3:30 PM", "3:45 PM", "3:45 PM", "4:00 PM", "4:00 PM", "4:15 PM", "4:15 PM", "4:30 PM", "6:00 PM", "Mon 3:00 PM"];

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("shows all 41 closures with their reopening times", async ({ page }) => {
    await page.goto(APP);
    const rows = page.getByTestId("street-row");
    await expect(rows).toHaveCount(41);
    for (let i = 0; i < 41; i++) {
      await expect(rows.nth(i)).toBeVisible();
      await expect(rows.nth(i)).toContainText(`Reopens${REOPENS[i]}`);
    }
    await expect(rows.first()).toContainText("Columbus Dr");
    await expect(rows.first()).toContainText("Start to Grand Ave");
    await expect(page.getByTestId("closed-count")).toHaveText("1 of 41 closed");
  });
});

test("puts the panel on the right from 768 px, clear of the dock, clock and controls", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "wide layouts");
  await page.clock.install({ time: REPLAY_DAY });
  for (const [width, panelWidth] of [
    [1440, 380],
    [1024, 340],
  ] as const) {
    await page.setViewportSize({ width, height: 800 });
    await openMap(page);
    const panel = await page.getByTestId("panel").boundingBox();
    expect(panel?.width).toBe(panelWidth);
    expect((panel?.x ?? 0) + (panel?.width ?? 0)).toBeLessThanOrEqual(width - 12);
    const left = panel?.x ?? 0;
    for (const id of ["clock-card", "timeline-panel"]) {
      const box = await page.getByTestId(id).boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0), id).toBeLessThanOrEqual(left);
    }
    const zoom = await page.getByRole("button", { name: "Zoom in" }).boundingBox();
    expect((zoom?.x ?? 0) + (zoom?.width ?? 0)).toBeLessThanOrEqual(left);
  }
});

test("makes the panel a bottom sheet on phones, with the dock riding above it", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "phone layout");
  await openMap(page);
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  // Phones open at peek: only the one-line summary shows above the bottom edge,
  // so the map and the opening show first.
  await expect(page.locator("main")).toHaveAttribute("data-snap", "peek");
  const peek = await page.getByTestId("panel").boundingBox();
  expect(viewport.height - (peek?.y ?? 0)).toBeLessThan(80);
  await expect(page.getByTestId("closed-count")).toBeInViewport();
  await raiseSheet(page);
  const sheet = await page.getByTestId("panel").boundingBox();
  expect(sheet?.x).toBe(0);
  expect(sheet?.width).toBe(viewport.width);
  // The half snap: about a third of the screen shows (the rest of the sheet is below it).
  const visible = viewport.height - (sheet?.y ?? 0);
  expect(visible).toBeGreaterThan(viewport.height * 0.3);
  expect(visible).toBeLessThan(viewport.height * 0.42);
  await expect(page.locator("main")).toHaveAttribute("data-snap", "half");
  const dock = await page.getByTestId("timeline-panel").boundingBox();
  expect((dock?.y ?? 0) + (dock?.height ?? 0)).toBeLessThanOrEqual(sheet?.y ?? 0);
  // The peek line is one line: the count and the next reopening. The replay auto-plays,
  // so hold it at 5:50 AM first (only the finish area is closed then).
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 350);
  await expect(page.getByTestId("closed-count")).toHaveText("1 of 41 closed");
  expect((await page.getByTestId("next-reopen").boundingBox())?.height).toBeLessThanOrEqual(22);
  // The map controls sit under the clock, clear of the dock, zoom buttons included (a 2 x 2 grid on phones).
  const fit = await page.getByRole("button", { name: "Show the whole course" }).boundingBox();
  const pin = await page.getByRole("button", { name: "Drop a pin on your spot" }).boundingBox();
  expect((pin?.y ?? 0) + (pin?.height ?? 0)).toBeLessThanOrEqual(dock?.y ?? 0);
  const clock = await page.getByTestId("clock-card").boundingBox();
  expect(fit?.y ?? 0).toBeGreaterThanOrEqual((clock?.y ?? 0) + (clock?.height ?? 0));
  const zoomOut = await page.getByRole("button", { name: "Zoom out" }).boundingBox();
  expect((zoomOut?.y ?? 0) + (zoomOut?.height ?? 0)).toBeLessThanOrEqual(dock?.y ?? 0);
});

test("keeps everything clear on a 375 x 667 phone", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "phone layout");
  await page.setViewportSize({ width: 375, height: 667 });
  await openMap(page);
  const dock = await page.getByTestId("timeline-panel").boundingBox();
  const pin = await page.getByRole("button", { name: "Drop a pin on your spot" }).boundingBox();
  expect((pin?.y ?? 0) + (pin?.height ?? 0)).toBeLessThanOrEqual(dock?.y ?? 0);
  const header = await page.getByTestId("header-card").boundingBox();
  const clock = await page.getByTestId("clock-card").boundingBox();
  expect((header?.x ?? 0) + (header?.width ?? 0)).toBeLessThanOrEqual(clock?.x ?? 0);
});
