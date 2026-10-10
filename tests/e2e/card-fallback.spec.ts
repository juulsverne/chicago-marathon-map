import { expect, test } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, showRow } from "./helpers";

// Without WebGL2 the SVG course stays: the street card and the selection still work.
test.use({ launchOptions: { args: ["--disable-webgl2"] } });

test("shows the selection on the SVG course and selects from it", async ({ page }) => {
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-engine", "fallback", { timeout: 10_000 });
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 });

  await showRow(page, "dearborn-st-grand-ave-to-jackson-blvd");
  await page.locator('[data-testid="street-row"][data-slug="dearborn-st-grand-ave-to-jackson-blvd"] button').click();
  await expect(page.getByTestId("street-card")).toHaveAttribute("data-slug", "dearborn-st-grand-ave-to-jackson-blvd");
  await expect(page.locator('.course-seg[data-slug="dearborn-st-grand-ave-to-jackson-blvd"]')).toHaveAttribute("data-selected", "");

  // A tap on another street's line selects it.
  await page.locator('.course-seg[data-slug="wells-st-north-ave-to-walton-st"]').dispatchEvent("click");
  await expect(page.getByTestId("street-card")).toHaveCount(1); // the previous card has left
  await expect(page.getByTestId("street-card")).toHaveAttribute("data-slug", "wells-st-north-ave-to-walton-st");
  await expect(page.locator(".course-seg[data-selected]")).toHaveCount(1);
});
