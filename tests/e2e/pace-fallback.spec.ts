import { expect, test } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, leaderDrawn, seek } from "./helpers";

// Without WebGL2 the SVG course draws the same leaders, your pace included.
test.use({ launchOptions: { args: ["--disable-webgl2"] } });

test("shows your pace on the SVG course", async ({ page }) => {
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-engine", "fallback", { timeout: 10_000 });
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 600);
  await page.getByRole("tab", { name: "Race" }).click();
  await expect(page.getByRole("slider", { name: "Your marathon time" })).toBeAttached({ timeout: 15_000 });
  expect(await leaderDrawn(page, "you")).toBe(false);
  await page.getByLabel("Show my pace on the map (pink dot)").check();
  await expect.poll(() => leaderDrawn(page, "you")).toBe(true);
});
