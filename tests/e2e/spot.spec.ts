import { expect, test, type Page } from "@playwright/test";
import { openMap } from "./helpers";

// Check your spot. The spot card is the first thing in the Streets tab.

async function openSpot(page: Page) {
  await openMap(page);
  // The live card is in once the street rows are buttons (the same interaction layer).
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 });
  await page.getByRole("button", { name: "Pause" }).click();
}

/** A point on the open map (clear of header, dock, panel and controls), 30 px beside the course. */
async function openMapPoint(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(async () => {
    const map = window.__cmm?.map;
    if (!map) throw new Error("no map");
    const course = (await (await fetch("/chicago-marathon-map/data/course.json")).json()) as { features: { geometry: { coordinates: [number, number][] } }[] };
    const rect = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();
    const top = rect('[data-map-inset="top"]')?.bottom ?? 0;
    const bottom = rect('[data-testid="timeline-panel"]')?.top ?? innerHeight;
    const panel = rect('[data-testid="panel"]');
    const right = Math.min(panel && panel.left > 10 ? panel.left : innerWidth, innerWidth - 72);
    for (const f of course.features) {
      for (const c of f.geometry.coordinates) {
        const p = map.project(c);
        const x = p.x + 30;
        if (x > 24 && x < right - 24 && p.y > top + 24 && p.y < bottom - 24) return { x, y: p.y };
      }
    }
    throw new Error("no open map point near the course");
  });
}

const spotCard = (page: Page) => page.getByTestId("spot");

test("drops a pin by tapping the map, names the nearest closure and keeps the pin here", async ({ page }, testInfo) => {
  await openSpot(page);
  await spotCard(page).getByRole("button", { name: "Drop a pin" }).click();
  await expect(spotCard(page)).toContainText("Tap the map to drop your pin");
  await expect.poll(() => page.evaluate(() => window.__cmm?.map.getCanvas().style.cursor)).toBe("crosshair");
  if (testInfo.project.name === "phone") await expect.poll(() => page.locator("main").getAttribute("data-snap")).toBe("peek");
  const point = await openMapPoint(page);
  if (testInfo.project.name === "phone") await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);

  const result = page.getByTestId("spot-result");
  await expect(result).toContainText(/^Nearest course street: .+ \(.+\), \d[\d.,]* (ft|mi) away \(about \d+ min walk\)\./);
  await expect(result).toContainText("Wheelchair leaders");
  await expect(result).toContainText(/Closed to cars (6:00 AM → \d{1,2}:\d\d [AP]M CT|Thu 6:00 AM → Mon 3:00 PM CT)/);
  await expect(page.locator(".spot-pin")).toHaveCount(1);
  // The dashed line runs from the pin to the nearest closure.
  expect(await page.evaluate(() => (window.__cmm?.map.querySourceFeatures("spot") ?? []).length)).toBeGreaterThan(0);
  // Kept in this browser only: v1's storage key, and never in the address.
  const saved = await page.evaluate(() => localStorage.getItem("cm-pin"));
  expect(JSON.parse(saved ?? "null")).toHaveLength(2);
  expect(page.url()).not.toContain("41.");

  await page.reload();
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-map-ready", "true", { timeout: 20_000 });
  await expect(page.getByTestId("spot-result")).toContainText("Nearest course street:", { timeout: 15_000 });
  await expect(page.locator(".spot-pin")).toHaveCount(1);
  await spotCard(page).getByRole("button", { name: "Clear" }).click();
  await expect(page.locator(".spot-pin")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("cm-pin"))).toBeNull();
});

const mapPin = (page: Page) => page.getByRole("button", { name: "Drop a pin on your spot" });
const pinNote = (page: Page) => page.getByTestId("pin-note");

test("drops a pin from the map's pin button, from any tab; Escape cancels a pick", async ({ page }, testInfo) => {
  await openSpot(page);
  await mapPin(page).click();
  await expect(mapPin(page)).toHaveAttribute("aria-pressed", "true");
  await expect(pinNote(page)).toContainText("Tap the map to drop your pin");
  await page.keyboard.press("Escape");
  await expect(mapPin(page)).toHaveAttribute("aria-pressed", "false");
  await expect(pinNote(page)).toHaveCount(0);

  // From another tab: on phones the sheet steps aside for the pick, and once the pin lands
  // the Streets tab shows the spot card (v1).
  await page.getByRole("tab", { name: "Race" }).click();
  await mapPin(page).click();
  if (testInfo.project.name === "phone") await expect(page.locator("main")).toHaveAttribute("data-snap", "peek");
  await expect.poll(() => page.evaluate(() => window.__cmm?.map.getCanvas().style.cursor)).toBe("crosshair");
  const point = await openMapPoint(page);
  if (testInfo.project.name === "phone") await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  await expect(page.getByRole("tab", { name: "Streets" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("spot-result")).toContainText("Nearest course street:");
  await expect(page.locator(".spot-pin")).toHaveCount(1);
  await expect(mapPin(page)).toHaveAttribute("aria-pressed", "false");
  await expect(pinNote(page)).toHaveCount(0);
});

test("explains a refused location on the map when it was asked for there", async ({ page }) => {
  await openSpot(page);
  await mapPin(page).click();
  await pinNote(page).getByRole("button", { name: "Use my location" }).click();
  await expect(pinNote(page)).toContainText("Location is off for this site, so it can't find you. Drop a pin by hand instead.");
  await pinNote(page).getByRole("button", { name: "Drop a pin" }).click();
  await expect(mapPin(page)).toHaveAttribute("aria-pressed", "true");
  await expect(pinNote(page)).toContainText("Tap the map to drop your pin");
});

test.describe("with location allowed", () => {
  test.use({ permissions: ["geolocation"], geolocation: { latitude: 41.8853, longitude: -87.6192 } });

  test("uses one position fix from the map's pin note, then shows the spot card", async ({ page }) => {
    await openSpot(page);
    await page.getByRole("tab", { name: "Race" }).click();
    await mapPin(page).click();
    await pinNote(page).getByRole("button", { name: "Use my location" }).click();
    await expect(page.getByTestId("spot-result")).toContainText("Nearest course street: Columbus Dr (Start to Grand Ave)");
    await expect(page.getByRole("tab", { name: "Streets" })).toHaveAttribute("aria-selected", "true");
    await expect(pinNote(page)).toHaveCount(0);
  });

  test("uses one position fix, on the device", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await openSpot(page);
    await spotCard(page).getByRole("button", { name: "Use my location" }).click();
    await expect(page.getByTestId("spot-result")).toContainText("Nearest course street: Columbus Dr (Start to Grand Ave)");
    await expect(page.locator(".spot-pin")).toHaveCount(1);
    // Nothing about the position leaves the page.
    expect(requests.filter((u) => u.includes("41.88") || u.includes("87.61"))).toEqual([]);
  });

  test("says when the spot is outside the race area", async ({ page, context }) => {
    await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 }); // New York
    await openSpot(page);
    await spotCard(page).getByRole("button", { name: "Use my location" }).click();
    await expect(page.getByTestId("spot-result")).toHaveText("That spot is outside the race area.");
  });

  test("says when nothing closes within a mile", async ({ page, context }) => {
    await context.setGeolocation({ latitude: 41.7, longitude: -87.75 });
    await openSpot(page);
    await spotCard(page).getByRole("button", { name: "Use my location" }).click();
    await expect(page.getByTestId("spot-result")).toHaveText("Nothing closes within a mile of here.");
  });
});

test("explains a refused location and keeps the manual pin", async ({ page }) => {
  // No geolocation permission: the browser refuses, as a visitor saying no would.
  await openSpot(page);
  await spotCard(page).getByRole("button", { name: "Use my location" }).click();
  await expect(spotCard(page).getByRole("alert")).toHaveText("Location is off for this site, so it can't find you. Drop a pin by hand instead.");
  await expect(spotCard(page).getByRole("button", { name: "Drop a pin" })).toBeVisible();
});
