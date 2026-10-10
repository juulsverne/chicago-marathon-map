import { expect, test } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY } from "./helpers";

// Paused at 5:50 AM (reduced motion opens paused), so the readout holds still while it is measured.
test.use({ reducedMotion: "reduce" });

test("rolls the clock's digits once the interaction layer loads, without moving the clock", async ({ page }) => {
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  const card = page.getByTestId("clock-card");
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-ready", "true");
  const before = await card.boundingBox();
  // Two rolling numbers (hours and minutes) are drawn over the plain time.
  await expect(card.locator("number-flow-react")).toHaveCount(2, { timeout: 15_000 });
  await expect(page.getByTestId("clock")).toHaveText("5:50 AM");
  await expect(page.getByTestId("clock")).toHaveCSS("opacity", "0");
  expect(await card.boundingBox()).toEqual(before);
  // The digits follow the clock.
  await page.getByRole("button", { name: "Play race day" }).click();
  await expect(page.getByTestId("clock")).not.toHaveText("5:50 AM", { timeout: 5_000 });
  await expect(card.locator("number-flow-react")).toHaveCount(2);
});
