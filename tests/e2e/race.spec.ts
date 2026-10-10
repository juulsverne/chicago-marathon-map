import { expect, test, type Page } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, seek } from "./helpers";

/** Opens the Race tab, paused, once its live sections are in (the agenda's items become buttons). */
async function openRace(page: Page) {
  await page.getByRole("tab", { name: "Race" }).click();
  await expect(page.getByTestId("agenda-item").getByRole("button")).toHaveCount(9, { timeout: 15_000 });
}

test.describe("Race tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: REPLAY_DAY });
    await page.goto(APP);
    await page.getByRole("button", { name: "Pause" }).click();
  });

  test("tells the race as the clock moves, with counts from the full model", async ({ page }) => {
    await openRace(page);
    await seek(page, 350);
    const headline = page.getByTestId("race-headline");
    await expect(headline).toContainText("At 5:50 AM CT");
    await expect(headline.getByRole("heading")).toHaveText("Quiet before the race");
    await expect(page.getByTestId("race-stats")).toContainText("55,000");
    await expect(page.getByTestId("race-stats")).toContainText("-1:40");
    await seek(page, 540);
    await expect(headline.getByRole("heading")).toHaveText(/^Men's leader near .+, mile 19\.3$/);
    await expect(page.getByTestId("race-board").locator('[data-leader="men"]')).toContainText("mile 19.3");
    await expect(page.getByTestId("race-board").locator('[data-leader="wcm"]')).toContainText("done 8:45a");
    await expect(page.getByTestId("race-field").locator("rect")).toHaveCount(27);
    await expect(page.getByRole("heading", { name: "Where the 55,000 are" })).toBeVisible();
  });

  test("jumps to a moment from the agenda, paused, and names it", async ({ page }) => {
    await openRace(page);
    await page.getByTestId("agenda-item").getByRole("button", { name: /First runner finishes/ }).click();
    await expect(page.getByTestId("clock")).toHaveText("9:32 AM");
    await expect(page.getByRole("button", { name: "Play race day" })).toBeVisible();
    await expect(page.getByTestId("jump-toast")).toHaveText(
      "~9:32 AM CT · First runner finishes. Modeled: the men's winner crosses the line about 2 hours after the 7:30 start (Jacob Kiplimo won in 2:02:23 in 2025).",
    );
    await expect(page.getByTestId("agenda-item").getByRole("button", { name: /First runner finishes/ })).toHaveAttribute("data-state", "past");
    await expect(page.getByTestId("agenda-item").getByRole("button", { name: /Women's winner finishes/ })).toHaveAttribute("data-state", "next");
  });

  test("names the moment after a timeline pill too", async ({ page }) => {
    await openRace(page); // the interaction layer is in
    await page.getByTestId("timeline-panel").getByRole("group").getByRole("button").first().click();
    await expect(page.getByTestId("jump-toast")).toContainText("6:00 AM CT · Streets close. Course streets close at about 6:00 AM.");
  });

  test("lowers the phone sheet after a jump so the map shows", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "phone layout");
    await expect(page.locator("[data-sheet-handle]")).toHaveAttribute("role", "button", { timeout: 15_000 });
    await openRace(page);
    await page.getByTestId("agenda-item").getByRole("button", { name: /The race starts/ }).click();
    await expect.poll(() => page.locator("main").getAttribute("data-snap")).toBe("peek");
  });
});

test("marks the headline live on race morning", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-11T14:00:00Z") });
  await page.goto(APP);
  await openRace(page);
  await expect(page.getByTestId("race-headline")).toContainText("At 9:00 AM CT · live");
});
