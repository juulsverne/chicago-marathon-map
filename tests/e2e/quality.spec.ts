import { expect, test, type Page } from "@playwright/test";
import { openMap, seek } from "./helpers";

/** Makes the browser report these device hints before any page script runs. */
async function fakeHints(page: Page, hints: { cores?: number; memoryGb?: number }) {
  await page.addInitScript((h) => {
    Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { get: () => h.cores ?? 0 });
    Object.defineProperty(Navigator.prototype, "deviceMemory", { get: () => h.memoryGb });
  }, hints);
}

const pixelRatio = (page: Page) => page.evaluate(() => window.__cmm?.map.getPixelRatio());

test("starts Low on a two-core device: pixel ratio 1 and a quarter of the runners", async ({ page }) => {
  await fakeHints(page, { cores: 2, memoryGb: 8 });
  await openMap(page);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-tier", "low");
  expect(await pixelRatio(page)).toBe(1);
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 540);
  await expect.poll(() => page.evaluate(() => window.__cmm?.runners.drawn)).toBe(1325);
});

test("starts Medium when the browser exposes no hints", async ({ page }) => {
  await fakeHints(page, {});
  await openMap(page);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-tier", "medium");
  const expected = await page.evaluate(() => Math.min(window.devicePixelRatio, 1.5));
  expect(await pixelRatio(page)).toBe(expected);
});

test("caps the pixel ratio for the tier, desktops included", async ({ page }) => {
  await fakeHints(page, { cores: 8, memoryGb: 8 });
  await openMap(page);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-tier", "high");
  const expected = await page.evaluate(() => Math.min(window.devicePixelRatio, 2));
  expect(await pixelRatio(page)).toBe(expected);
});
