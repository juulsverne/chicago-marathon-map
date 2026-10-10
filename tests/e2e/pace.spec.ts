import { expect, test, type Page } from "@playwright/test";
import { leaderDrawn, openMap, seek } from "./helpers";

/** The Race tab, paused at 10:00 AM, once its calculator is live (Base UI's slider is in). */
async function openPace(page: Page) {
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 600);
  await page.getByRole("tab", { name: "Race" }).click();
  await expect(page.getByRole("slider", { name: "Your marathon time" })).toBeAttached({ timeout: 15_000 });
}

test("sets your marathon time with the slider and shows your pace on the map", async ({ page }) => {
  await openPace(page);
  const slider = page.getByRole("slider", { name: "Your marathon time" });
  await expect(slider).toHaveAttribute("aria-valuetext", "4:30 marathon");
  expect(await leaderDrawn(page, "you")).toBe(false);
  await slider.focus();
  await page.keyboard.press("ArrowLeft"); // 4:29, and "Show my pace" switches on, as in v1
  await expect(slider).toHaveAttribute("aria-valuetext", "4:29 marathon");
  await expect(page.getByLabel("Show my pace on the map (pink dot)")).toBeChecked();
  await expect.poll(() => leaderDrawn(page, "you")).toBe(true);
  await expect(page.getByTestId("race-board").locator('[data-leader="you"]')).toContainText("Wave 2, 4:29 goal");
  await page.keyboard.press("Home");
  await expect(slider).toHaveAttribute("aria-valuetext", "2:30 marathon");
  await expect(page.getByTestId("calculator-sentence")).toHaveText(
    "That is 5:43 per mile, likely in Wave 1. When Sawe crossed the line you would be at mile 20.9, with 31m still to run.",
  );
  await expect(page.locator('[data-lane="you"]')).toContainText("20.9 mi");
  await page.getByLabel("Show my pace on the map (pink dot)").uncheck();
  await expect.poll(() => leaderDrawn(page, "you")).toBe(false);
});

test("hides world-record pace when asked", async ({ page }) => {
  await openPace(page);
  await seek(page, 520);
  await expect.poll(() => leaderDrawn(page, "wr")).toBe(true);
  await page.getByLabel("Show world-record pace on the map (gold dot)").uncheck();
  await expect.poll(() => leaderDrawn(page, "wr")).toBe(false);
  await expect(page.getByTestId("race-board").locator('[data-leader="wr"]')).toHaveCount(0);
});
