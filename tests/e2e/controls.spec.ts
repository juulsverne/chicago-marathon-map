import { expect, test, type Page } from "@playwright/test";
import { openMap, placeCourseBelow } from "./helpers";

const zoom = (page: Page) => page.evaluate(() => window.__cmm?.map.getZoom() ?? Number.NaN);

test("zooms in and out", async ({ page }) => {
  // On phones too (owner, 2026-10-09), in a 2 x 2 grid there.
  await openMap(page);
  const start = await zoom(page);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect.poll(() => zoom(page)).toBeCloseTo(start + 1, 1);
  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect.poll(() => zoom(page)).toBeCloseTo(start, 1);
});

test("zooms out until the course is small, past the edge of the map's data", async ({ page }) => {
  await openMap(page);
  // The data box alone held a 1440 px screen near zoom 11; the pan limit now lets it reach the floor.
  await page.evaluate(() => window.__cmm?.map.jumpTo({ zoom: 0 }));
  await expect.poll(() => zoom(page)).toBeCloseTo(8, 1);
  // The course is still on screen, small.
  await expect(page.getByRole("button", { name: "Recenter" })).toHaveCount(0);
});

test("fits the whole course again", async ({ page }) => {
  await openMap(page);
  // Paused, so the dock (and with it the fit padding) keeps its size.
  await page.getByRole("button", { name: "Pause" }).click();
  const fit = page.getByRole("button", { name: "Show the whole course" });
  await fit.click();
  await expect.poll(() => page.evaluate(() => window.__cmm?.map.isMoving())).toBe(false);
  const fitted = await zoom(page);
  await page.evaluate(() => window.__cmm?.map.jumpTo({ center: [-87.6208, 41.8809], zoom: 16 }));
  await fit.click();
  await expect.poll(() => zoom(page)).toBeCloseTo(fitted, 2);
});

test("offers Recenter only while the course is off screen", async ({ page }) => {
  await openMap(page);
  const recenter = page.getByRole("button", { name: "Recenter" });
  await expect(recenter).toHaveCount(0);
  await page.evaluate(() => window.__cmm?.map.jumpTo({ center: [-87.45, 41.98], zoom: 15 }));
  await expect(recenter).toBeVisible();
  await recenter.click();
  await expect(recenter).toHaveCount(0);
  expect(await zoom(page)).toBeLessThan(13);
});

test("offers Recenter when the course is only under the dock, not on the open map", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "wide layout");
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  const recenter = page.getByRole("button", { name: "Recenter" });
  await expect(recenter).toHaveCount(0);
  // Slide the course down below the top of the dock: still on the canvas, but covered.
  const dock = await page.getByTestId("timeline-panel").boundingBox();
  await placeCourseBelow(page, (dock?.y ?? 0) + 40);
  await expect(recenter).toBeVisible();
  await recenter.click();
  await expect(recenter).toHaveCount(0);
});
