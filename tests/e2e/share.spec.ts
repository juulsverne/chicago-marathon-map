import { expect, test, type Page } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, openMap, seek, showRow } from "./helpers";

// Shared links: Share on the street card, and opening a link.

const SLUG = "grand-ave-columbus-dr-to-dearborn-st";

declare global {
  interface Window {
    __copied?: string;
    __shared?: ShareData;
  }
}

/** The browser without a share sheet, copying into `window.__copied`. */
async function copyOnly(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (text: string) => void (window.__copied = text) },
      configurable: true,
    });
  });
}

async function openCard(page: Page, slug: string) {
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 });
  await page.getByRole("button", { name: "Pause" }).click();
  await showRow(page, slug);
  await page.locator(`[data-testid="street-row"][data-slug="${slug}"] button`).click();
  await expect(page.getByTestId("street-card")).toHaveAttribute("data-slug", slug);
}

test("copies a link to this moment and this street, which opens there (round trip)", async ({ page }) => {
  await copyOnly(page);
  await openMap(page);
  await openCard(page, SLUG);
  await seek(page, 630);
  await page.getByTestId("street-card").getByRole("button", { name: "Share" }).click();
  await expect(page.getByTestId("share-status")).toHaveText("Link copied");
  const copied = await page.evaluate(() => window.__copied);
  expect(copied).toBe(`${new URL(page.url()).origin}${APP}?t=1030&s=${SLUG}`);

  await page.goto(copied as string);
  await expect(page.getByTestId("clock")).toHaveText("10:30 AM");
  await expect(page.getByTestId("street-card")).toHaveAttribute("data-slug", SLUG, { timeout: 15_000 });
  await expect(page.getByTestId("play-button")).toHaveAttribute("aria-label", /^Play/);
});

test("opens the system share sheet where there is one", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: async (data: ShareData) => void (window.__shared = data), configurable: true });
  });
  await openMap(page);
  await openCard(page, SLUG);
  await seek(page, 495);
  await page.getByTestId("street-card").getByRole("button", { name: "Share" }).click();
  await expect.poll(() => page.evaluate(() => window.__shared?.url)).toBe(`${new URL(page.url()).origin}${APP}?t=0815&s=${SLUG}`);
  expect(await page.evaluate(() => window.__shared?.title)).toBe("Grand Ave at 8:15 AM CT · Chicago Marathon closures");
  await expect(page.getByTestId("share-status")).toHaveText("");
});

test("opens a shared link paused at its moment, with its street selected", async ({ page }) => {
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(`${APP}?t=1415&s=${SLUG}`);
  await expect(page.getByTestId("clock")).toHaveText("2:15 PM");
  await expect(page.getByTestId("street-card")).toHaveAttribute("data-slug", SLUG, { timeout: 15_000 });
  await page.waitForTimeout(1_500);
  await expect(page.getByTestId("clock")).toHaveText("2:15 PM");
  // Back closes the card and stays on the page.
  await page.goBack();
  await expect(page.getByTestId("street-card")).toHaveCount(0);
  expect(page.url()).toContain("t=1415");
});

test("ignores invalid parameters", async ({ page }) => {
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(`${APP}?t=2500&s=not-a-street`);
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 });
  await expect(page.getByTestId("street-card")).toHaveCount(0);
  // The replay opens as usual: playing from 5:50 AM.
  await expect(page.getByTestId("play-button")).toHaveAttribute("aria-label", "Pause");

  await page.goto(`${APP}?t=1030&s=%3Cscript%3E`);
  await expect(page.getByTestId("clock")).toHaveText("10:30 AM");
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 });
  await expect(page.getByTestId("street-card")).toHaveCount(0);
});

test.describe("race day", () => {
  test.use({ timezoneId: "Asia/Tokyo" });

  test("a shared link wins over Live, which stays one tap away", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-11T14:00:00Z") }); // 9:00 AM CT
    await page.goto(`${APP}?t=0800`);
    await expect(page.getByTestId("clock")).toHaveText("8:00 AM");
    const live = page.getByRole("button", { name: "Live" });
    await expect(live).toHaveAttribute("aria-pressed", "false");
    await live.click();
    await expect(live).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("clock")).toHaveText("9:00 AM");
  });
});
