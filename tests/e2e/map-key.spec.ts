import { expect, test } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, openMap, showRow } from "./helpers";

// The map key.

const keyButton = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Key", exact: true });

test("stays collapsed until the Key button opens it, then Escape closes it", async ({ page }) => {
  // At 1440 x 900 v1 opened its key by itself; v2 never does.
  await openMap(page);
  const key = page.getByTestId("map-key");
  await expect(key).toBeHidden();
  await keyButton(page).click();
  await expect(key).toBeVisible();
  await expect(key.getByRole("heading", { name: "Map key" })).toBeVisible();
  await expect(key.getByRole("listitem")).toHaveCount(10);
  for (const label of ["Closed to cars", "Open to cars", "Runners", "Mile marker", "Start and finish", "Race leaders", "World-record pace", "Your pace", "Timeline shading", "Your spot"]) {
    await expect(key).toContainText(label);
  }
  // On screen, below the header.
  const box = await key.boundingBox();
  const header = await page.getByTestId("header-card").boundingBox();
  const viewport = page.viewportSize();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0);
  expect(box?.y ?? 0).toBeGreaterThanOrEqual((header?.y ?? 0) + (header?.height ?? 0));
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport?.height ?? 0);

  await page.keyboard.press("Escape");
  await expect(key).toBeHidden();
});

test("gives the small Key button a 44 px target", async ({ page }) => {
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  const box = await keyButton(page).boundingBox();
  if (!box) throw new Error("no Key button");
  // The pill is drawn 24 px tall; its target reaches 10 px above and below it.
  for (const y of [box.y - 9, box.y + box.height + 9]) {
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.textContent ?? null, { x: box.x + box.width / 2, y });
    expect(hit).toBe("Key");
  }
  expect(box.width + 8).toBeGreaterThanOrEqual(44);
});

test("says how many people a dot stands for at this device's quality tier", async ({ page }) => {
  await openMap(page);
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 }); // the interaction layer is in
  const tier = (await page.getByTestId("map-stage").getAttribute("data-tier")) as "high" | "medium" | "low";
  const people = { high: 10, medium: 21, low: 42 }[tier];
  await keyButton(page).click();
  await expect(page.getByTestId("map-key")).toContainText(`Each is about ${people} people`);
});

test("closes when a tap lands outside it, and when a street is picked", async ({ page }) => {
  await openMap(page);
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 });
  const key = page.getByTestId("map-key");
  await keyButton(page).click();
  await expect(key).toBeVisible();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(key).toBeHidden();

  // Picked from the list by keyboard, so no tap closes it first.
  const slug = "grand-ave-columbus-dr-to-dearborn-st";
  await showRow(page, slug);
  await keyButton(page).click();
  await expect(key).toBeVisible();
  await page.locator(`[data-testid="street-row"][data-slug="${slug}"] button`).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("street-card")).toBeVisible();
  await expect(key).toBeHidden();
});

test("opens without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(APP);
  await keyButton(page).click();
  await expect(page.getByTestId("map-key")).toBeVisible();
  await expect(page.getByTestId("map-key")).toContainText("Each is about 10 people");
  await context.close();
});
