import { expect, test, type Page } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY } from "./helpers";

/** Waits for Base UI's tab bar: its indicator only exists once the interaction layer is in. */
async function waitForTabBar(page: Page) {
  await expect(page.getByRole("tab", { name: "Streets" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[role=tablist] > span")).toHaveCount(1, { timeout: 15_000 });
}

test.describe("panel tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: REPLAY_DAY });
    await page.goto(APP);
  });

  test("switches between Streets, Race, Records and Facts", async ({ page }) => {
    const tablist = page.getByRole("tablist", { name: "Panel sections" });
    await expect(tablist.getByRole("tab")).toHaveText(["Streets", "Race", "Records", "Facts"]);
    await expect(page.getByRole("tabpanel", { name: "Streets" })).toBeVisible();
    await page.getByRole("tab", { name: "Race" }).click();
    await expect(page.getByRole("tabpanel", { name: "Race" })).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Streets" })).toBeHidden();
    await expect(page.getByTestId("agenda-item")).toHaveCount(9);
    await expect(page.getByRole("heading", { name: "Three start waves" })).toBeVisible();
    await expect(page.getByText("right after the pros")).toBeVisible();
    await page.getByRole("tab", { name: "Records" }).click();
    await expect(page.getByTestId("record-book").getByRole("listitem")).toHaveCount(6);
    await expect(page.getByTestId("world-records").getByRole("listitem")).toHaveCount(7);
    await expect(page.getByText("Women's world record (mixed race)")).toBeVisible();
    await page.getByRole("tab", { name: "Facts" }).click();
    await expect(page.getByTestId("fact-tiles").getByRole("listitem")).toHaveCount(10);
    await expect(page.getByTestId("sources").getByRole("listitem")).toHaveCount(31);
    await expect(page.getByTestId("sources").getByRole("link").first()).toHaveAttribute("href", /^https:\/\/cdn\.chicagomarathon\.com\//);
  });

  test("moves between tabs with the arrow keys once Base UI is in", async ({ page }) => {
    await waitForTabBar(page);
    await page.getByRole("tab", { name: "Streets" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Race" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Race" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Race" })).toBeVisible();
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Facts" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight"); // wraps to the first tab
    await expect(page.getByRole("tab", { name: "Streets" })).toHaveAttribute("aria-selected", "true");
    // Each tab points at its own panel.
    await expect(page.getByRole("tab", { name: "Records" })).toHaveAttribute("aria-controls", "panel-records");
  });

  test("starts a newly opened tab at its top", async ({ page }) => {
    const scroller = page.locator("[data-panel-scroll]");
    await scroller.evaluate((el) => el.scrollTo({ top: 600 }));
    await page.getByRole("tab", { name: "Facts" }).click();
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBe(0);
  });
});

test.describe("date modes", () => {
  test("uses the future tense before race day", async ({ page }) => {
    await page.clock.install({ time: REPLAY_DAY });
    await page.goto(APP);
    await page.getByRole("tab", { name: "Facts" }).click();
    await expect(page.getByText("Columbus Dr reopens at 3:00 PM.")).toBeVisible();
    await expect(page.getByText("Columbus Dr was scheduled to reopen at 3:00 PM.")).toBeHidden();
  });

  test("switches to the past tense after race day", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-12T15:00:00Z") });
    await page.goto(APP);
    await expect(page.getByTestId("date-chip")).toHaveText("Race day replay · Oct 11, 2026");
    await page.getByRole("tab", { name: "Facts" }).click();
    await expect(page.getByText("Columbus Dr was scheduled to reopen at 3:00 PM.")).toBeVisible();
    await expect(page.getByText("Columbus Dr reopens at 3:00 PM.")).toBeHidden();
    await page.getByRole("tab", { name: "Race" }).click();
    await expect(page.getByText("Runners started in waves so 55,000 people could fit through one start line.")).toBeVisible();
    // The results slot stays empty until results are published and sourced.
    await expect(page.getByTestId("results")).toHaveCount(0);
  });
});
