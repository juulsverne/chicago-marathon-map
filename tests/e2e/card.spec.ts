import { expect, test, type Page } from "@playwright/test";
import { openMap, seek, showRow } from "./helpers";

/** A point on a course segment that is on the open map (clear of the header row, the
 *  dock, the panel and the controls), and which segment it is. */
async function openSegment(page: Page): Promise<{ index: number; x: number; y: number }> {
  const found = await page.evaluate(async () => {
    const map = window.__cmm?.map;
    if (!map) throw new Error("no map");
    const course = (await (await fetch("/chicago-marathon-map/data/course.json")).json()) as {
      features: { id: number; geometry: { coordinates: [number, number][] } }[];
    };
    const rect = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();
    const top = rect('[data-map-inset="top"]')?.bottom ?? 0;
    const bottom = rect('[data-testid="timeline-panel"]')?.top ?? innerHeight;
    const panel = rect('[data-testid="panel"]');
    // The side panel from 768 px; on phones the panel is the sheet below the dock.
    const right = Math.min(panel && panel.left > 10 ? panel.left : innerWidth, innerWidth - 72);
    // Midpoints of each segment's straight runs, so the point is on the line itself.
    for (const f of course.features) {
      const c = f.geometry.coordinates;
      for (let i = 1; i < c.length; i++) {
        const a = map.project(c[i - 1]);
        const b = map.project(c[i]);
        const p = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (p.x > 24 && p.x < right - 24 && p.y > top + 24 && p.y < bottom - 24) return { index: f.id, x: p.x, y: p.y };
      }
    }
    return null;
  });
  if (!found) throw new Error("no course segment on the open map");
  return found;
}

const flags = (page: Page, id: number) => page.evaluate((i) => window.__cmm?.map.getFeatureState({ source: "course", id: i }) ?? {}, id);

test("selects a street by tapping it on the map, glows it and eases the camera to it", async ({ page }, testInfo) => {
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByTestId("clock-card").locator("number-flow-react")).toHaveCount(2, { timeout: 15_000 }); // the interaction layer is in
  const seg = await openSegment(page);
  const zoom0 = await page.evaluate(() => window.__cmm?.map.getZoom() ?? 0);
  if (testInfo.project.name === "phone") await page.touchscreen.tap(seg.x, seg.y);
  else await page.mouse.click(seg.x, seg.y);
  const card = page.getByTestId("street-card");
  await expect(card).toBeVisible();
  await expect.poll(async () => (await flags(page, seg.index)).selected).toBe(true);
  // The camera eases in to the street.
  await expect.poll(() => page.evaluate(() => window.__cmm?.map.getZoom() ?? 0)).toBeGreaterThan(zoom0 + 0.5);
  // The close button clears the card and the glow.
  await card.getByRole("button", { name: "Close street details" }).click();
  await expect(card).toHaveCount(0);
  await expect.poll(async () => (await flags(page, seg.index)).selected).toBe(false);
});

test("grows the card out of a list row and explains the street", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the morph is measured where row and card are both on screen");
  await openMap(page);
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 });
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 575); // 9:35 AM
  const row = page.locator('[data-testid="street-row"][data-slug="columbus-dr-start-to-grand-ave"] button');
  const rowBox = await row.boundingBox();
  // Click, then read the card's plate on the very next frame: it starts where the row is.
  const first = await row.evaluate(async (el) => {
    (el as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(r));
    const plate = document.querySelector('[data-testid="street-card"] > div[aria-hidden="true"]');
    return plate?.getBoundingClientRect().toJSON() as DOMRect | undefined;
  });
  const card = page.getByTestId("street-card");
  await expect(card).toBeVisible();
  await page.waitForTimeout(900);
  const settled = await card.boundingBox();
  expect(first).toBeTruthy();
  const near = (a: number, b: number, tolerance: number) => Math.abs(a - b) < tolerance;
  // On its first frames the plate is still far closer to the row than to where the card ends up.
  expect(Math.abs((first?.x ?? 0) - (rowBox?.x ?? 0))).toBeLessThan(Math.abs((first?.x ?? 0) - (settled?.x ?? 0)));
  expect(near(settled?.x ?? 0, (await card.boundingBox())?.x ?? -1, 0.5)).toBe(true);

  await expect(card.getByRole("heading", { level: 2 })).toHaveText("Columbus Dr");
  await expect(card).toContainText("Start to Grand Ave");
  await expect(card).toContainText("Grant Park & the Loop · miles 0.0–0.7");
  await expect(page.getByTestId("card-status")).toHaveText("Closed until ~10:30 AM CT · reopens in 55m");
  await expect(page.getByTestId("card-sentence")).toHaveText(
    "The main field has passed. It reopens at 10:30 AM CT, in 55m, after the final runners at a 15-minute-mile pace.",
  );
  await expect(card.getByText("Wheelchair leaders")).toBeVisible();
  // Focus moved into the card for keyboard users; Escape closes it and focus returns to the row.
  await expect(card.getByRole("heading", { level: 2 })).toBeFocused();
  await expect(row).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
  await expect(row).toBeFocused();
});

test("closes the card with Back instead of leaving the page", async ({ page }) => {
  await openMap(page);
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 });
  const url = page.url();
  const history0 = await page.evaluate(() => history.length);
  await showRow(page, "grand-ave-columbus-dr-to-dearborn-st");
  await page.locator('[data-testid="street-row"][data-slug="grand-ave-columbus-dr-to-dearborn-st"] button').click();
  const card = page.getByTestId("street-card");
  await expect(card).toBeVisible();
  expect(await page.evaluate(() => history.length)).toBe(history0 + 1);
  await page.goBack();
  await expect(card).toHaveCount(0);
  expect(page.url()).toBe(url);
  await expect(page.getByTestId("panel")).toBeVisible();
  // Closing from the card goes back by itself, so one Back is never wasted.
  await page.getByTestId("street-cells").locator("span").nth(3).click();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Close street details" }).click();
  await expect(card).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => history.state?.cmmOverlay ?? null)).toBeNull();
});

test("lowers the phone sheet and shows the card above the dock", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "phone layout");
  await openMap(page);
  await expect(page.locator("[data-sheet-handle]")).toHaveAttribute("role", "button", { timeout: 15_000 });
  await showRow(page, "dearborn-st-grand-ave-to-jackson-blvd");
  await page.locator('[data-testid="street-row"][data-slug="dearborn-st-grand-ave-to-jackson-blvd"] button').tap();
  await expect.poll(() => page.locator("main").getAttribute("data-snap")).toBe("peek");
  const card = await page.getByTestId("street-card").boundingBox();
  const dock = await page.getByTestId("timeline-panel").boundingBox();
  expect((card?.y ?? 0) + (card?.height ?? 0)).toBeLessThanOrEqual((dock?.y ?? 0) + 1);
  expect(card?.y ?? 0).toBeGreaterThan(0);
});

test("highlights the course under the mouse with a pointer cursor", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "hover needs a mouse");
  await openMap(page);
  const seg = await openSegment(page);
  await page.mouse.move(seg.x, seg.y);
  await expect.poll(async () => (await flags(page, seg.index)).hover).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__cmm?.map.getCanvas().style.cursor)).toBe("pointer");
  await page.mouse.move(5, 300);
  await expect.poll(async () => (await flags(page, seg.index)).hover).toBe(false);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("jumps the camera to a picked street instead of easing", async ({ page }) => {
    await openMap(page);
    await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 });
    await showRow(page, "lasalle-st-jackson-blvd-to-stockton-dr");
    await page.locator('[data-testid="street-row"][data-slug="lasalle-st-jackson-blvd-to-stockton-dr"] button').click();
    await expect(page.getByTestId("street-card")).toBeVisible();
    // One frame for the card's layout, then the camera is already there: no easing.
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.__cmm?.map.isMoving())).toBe(false);
    const center = await page.evaluate(() => window.__cmm?.map.getCenter().toArray());
    // LaSalle St runs north from Jackson Blvd to Stockton Dr, between about 41.878 and 41.913 N.
    expect(center?.[1]).toBeGreaterThan(41.87);
    expect(center?.[1]).toBeLessThan(41.92);
  });
});
