import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, placeCourseBelow, raiseSheet } from "./helpers";

// The phone sheet: real touch input through the Chrome DevTools
// Protocol, so native scrolling and the sheet's drag compete exactly as on a phone.

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "the sheet is the phone layout");
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  // The handle becomes a button when the sheet controller attaches.
  await expect(page.locator("[data-sheet-handle]")).toHaveAttribute("role", "button", { timeout: 15_000 });
  await page.getByRole("button", { name: "Pause" }).click();
  // Phones open at peek, the one-line summary, so the map shows first; the tests
  // below start from half, as after one tap on the handle.
  await expect(page.locator("main")).toHaveAttribute("data-snap", "peek");
  await raiseSheet(page);
});

/** One finger from (x, y0) to (x, y1) in `steps` moves 16 ms apart, then held still
 *  for `hold` ms before lifting (so the release carries no fling). */
async function swipe(cdp: CDPSession, x: number, y0: number, y1: number, { steps = 12, hold = 150 } = {}) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / steps }] });
    await new Promise((r) => setTimeout(r, 16));
  }
  await new Promise((r) => setTimeout(r, hold));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

const snap = (page: Page) => page.locator("main").getAttribute("data-snap");
const sheetTop = async (page: Page) => (await page.getByTestId("panel").boundingBox())?.y ?? 0;
const scrollTop = (page: Page) => page.locator("[data-panel-scroll]").evaluate((el) => el.scrollTop);

test("drags from the handle through the snap points, pushing history only at full", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const { width, height } = page.viewportSize() ?? { width: 0, height: 0 };
  const history0 = await page.evaluate(() => history.length);
  expect(await snap(page)).toBe("half");

  const top = await sheetTop(page);
  await swipe(cdp, width / 2, top + 10, 80);
  await expect.poll(() => snap(page)).toBe("full");
  expect(await page.evaluate(() => history.length)).toBe(history0 + 1);
  // The dock steps aside while the sheet is full.
  await expect(page.getByTestId("timeline-panel")).toBeHidden();

  await swipe(cdp, width / 2, (await sheetTop(page)) + 10, height * 0.62);
  await expect.poll(() => snap(page)).toBe("half");
  await expect(page.getByTestId("timeline-panel")).toBeVisible();

  await swipe(cdp, width / 2, (await sheetTop(page)) + 10, height - 20);
  await expect.poll(() => snap(page)).toBe("peek");
  // Peek shows the one-line summary right above the bottom edge.
  expect(height - (await sheetTop(page))).toBeLessThan(80);
  await expect(page.getByTestId("closed-count")).toBeInViewport();
  // Leaving full went back one entry; peek pushed none.
  await expect.poll(() => page.evaluate(() => history.length)).toBe(history0 + 1);
});

test("scrolls the content at full, and drags the sheet only when the content is at the top", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const { width } = page.viewportSize() ?? { width: 0 };
  await page.locator("[data-sheet-handle]").tap();
  await expect.poll(() => snap(page)).toBe("full");
  const listY = (await sheetTop(page)) + 320;

  // Up on the content: it scrolls; the sheet stays.
  await swipe(cdp, width / 2, listY + 200, listY - 100);
  await expect.poll(() => scrollTop(page)).toBeGreaterThan(150);
  expect(await snap(page)).toBe("full");

  // Down on scrolled content: it scrolls back, all the way, and the sheet still stays.
  await swipe(cdp, width / 2, listY - 100, listY + 300);
  await expect.poll(() => scrollTop(page)).toBe(0);
  expect(await snap(page)).toBe("full");

  // Down again with the content at the top: now the sheet comes down.
  await swipe(cdp, width / 2, listY - 100, listY + 250);
  await expect.poll(() => snap(page)).toBe("half");
});

test("steps through the snaps from the handle by tap or keyboard, and Back lowers a full sheet", async ({ page }) => {
  const handle = page.locator("[data-sheet-handle]");
  await expect(handle).toHaveAccessibleName("Expand the panel");
  await handle.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => snap(page)).toBe("full");
  await expect(handle).toHaveAccessibleName("Shrink the panel and show more of the map");

  // Back closes the top-most overlay, the full sheet, instead of leaving the page.
  const url = page.url();
  await page.goBack();
  await expect.poll(() => snap(page)).toBe("half");
  expect(page.url()).toBe(url);
  await expect(page.getByTestId("panel")).toBeVisible();

  await handle.tap();
  await expect.poll(() => snap(page)).toBe("full");
  await handle.tap();
  await expect.poll(() => snap(page)).toBe("half");
});

test("opens a peeking sheet when a tab is pressed", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const { width, height } = page.viewportSize() ?? { width: 0, height: 0 };
  await swipe(cdp, width / 2, (await sheetTop(page)) + 10, height - 20);
  await expect.poll(() => snap(page)).toBe("peek");
  await page.locator("[data-sheet-summary]").tap();
  await expect.poll(() => snap(page)).toBe("half");
  await swipe(cdp, width / 2, (await sheetTop(page)) + 10, height - 20);
  await expect.poll(() => snap(page)).toBe("peek");
  // The tab bar sits just below the peek line; reveal it with a tab press via the keyboard.
  await page.getByRole("tab", { name: "Race" }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => snap(page)).toBe("half");
});

test("offers Recenter when the course is only under the sheet, and rechecks when the sheet moves", async ({ page }) => {
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-map-ready", "true", { timeout: 20_000 });
  const cdp = await page.context().newCDPSession(page);
  const { width, height } = page.viewportSize() ?? { width: 0, height: 0 };
  const recenter = page.getByRole("button", { name: "Recenter" });
  await expect(recenter).toHaveCount(0);
  // Slide the course down under the dock riding on the half-open sheet: on the canvas, but covered.
  const dock = await page.getByTestId("timeline-panel").boundingBox();
  const peekDockTop = height - 56 - 12 - (dock?.height ?? 0); // where the dock's top will be at peek
  await placeCourseBelow(page, Math.min(peekDockTop - 30, (dock?.y ?? 0) + 120));
  await expect(recenter).toBeVisible();
  // Lower the sheet to its peek: the course comes out from under it, and Recenter goes.
  await swipe(cdp, width / 2, (await sheetTop(page)) + 10, height - 20);
  await expect.poll(() => snap(page)).toBe("peek");
  await expect(recenter).toHaveCount(0);
});
