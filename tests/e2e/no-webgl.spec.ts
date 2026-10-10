import { expect, test } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, layerAtOpenMap, seek } from "./helpers";

// A browser without WebGL2: MapLibre is never downloaded and the SVG map stays.
test.use({ launchOptions: { args: ["--disable-webgl2"] } });

test("keeps the SVG map with a quiet note, and closures and leaders still update", async ({ page }) => {
  const engineRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/vendor/maplibre/")) engineRequests.push(r.url());
  });
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-engine", "fallback", { timeout: 10_000 });
  await expect(page.getByText("Simple map: this device can't draw the live runner stream.")).toBeVisible();
  expect(await page.evaluate(() => performance.getEntriesByName("cmm:map-import").length)).toBe(0);
  expect(engineRequests).toEqual([]);
  await expect(page.getByRole("button", { name: "Zoom in" })).toHaveCount(0); // the controls only exist for MapLibre

  // The invisible map layer is still in the DOM; it must not sit over the SVG and take its pointer events.
  expect(await layerAtOpenMap(page)).toBe("svg");

  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 630);
  await expect(page.locator('.course-seg[data-slug="columbus-dr-start-to-grand-ave"]')).toHaveAttribute("data-state", "open");
  await seek(page, 540);
  await expect(page.locator('.leader[data-leader="men"]')).toHaveAttribute("visibility", "visible");
});
