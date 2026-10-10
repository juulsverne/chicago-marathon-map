import { expect, test, type Page } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, seek, showRow } from "./helpers";

/** Opens the app paused and waits for the live street list (rows become buttons). */
async function openStreets(page: Page) {
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 });
  await page.getByRole("button", { name: "Pause" }).click();
}

const row = (page: Page, slug: string) => page.locator(`[data-testid="street-row"][data-slug="${slug}"]`);

test("keeps each street's state current as the clock moves", async ({ page }) => {
  await openStreets(page);
  await seek(page, 630);
  await expect(row(page, "columbus-dr-start-to-grand-ave")).toContainText("Open to cars");
  await expect(row(page, "dearborn-st-grand-ave-to-jackson-blvd")).toContainText("Closed to cars");
  const cells = page.getByTestId("street-cells").locator("span");
  await expect(cells).toHaveCount(41);
  await expect(cells.nth(0)).toHaveClass(/bg-open/);
  await expect(cells.nth(2)).toHaveClass(/bg-closed/);
  await seek(page, 1080);
  await expect(row(page, "roosevelt-rd-michigan-ave-to-columbus-dr")).toContainText("Open to cars");
  await expect(row(page, "columbus-dr-roosevelt-rd-to-the-finish")).toContainText("Closed to cars");
});

test("filters as you type and says when nothing matches", async ({ page }) => {
  await openStreets(page);
  const search = page.getByRole("searchbox", { name: "Find a street" });
  await search.fill("halsted");
  await expect(page.getByTestId("street-row")).toHaveCount(6);
  // Groups with no match disappear: only the West Loop and Pilsen groups remain.
  await expect(page.getByTestId("street-groups").locator("section")).toHaveCount(2);
  await search.fill("zzz");
  await expect(page.getByTestId("street-row")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "No course street matches 'zzz'" })).toBeVisible();
  await search.fill("");
  await expect(page.getByTestId("street-row")).toHaveCount(41);
});

test("selects a street from its row or its block", async ({ page }) => {
  await openStreets(page);
  const dearborn = row(page, "dearborn-st-grand-ave-to-jackson-blvd").getByRole("button");
  await showRow(page, "dearborn-st-grand-ave-to-jackson-blvd");
  await dearborn.click();
  await expect(dearborn).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("street-cells").locator("span").nth(2)).toHaveAttribute("data-selected", "true");
  // A block selects its street too.
  await page.getByTestId("street-cells").locator("span").nth(4).click();
  await expect(row(page, "lasalle-st-jackson-blvd-to-stockton-dr").getByRole("button")).toHaveAttribute("aria-pressed", "true");
  await expect(dearborn).toHaveAttribute("aria-pressed", "false");
});
