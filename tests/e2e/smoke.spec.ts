import { expect, test } from "@playwright/test";
import { APP } from "./app";

test("serves the map under its base path", async ({ page }) => {
  const response = await page.goto(APP);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Chicago Marathon Closure Map");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Race-Day Street Closures");
});

test("redirects the origin root to the base path", async ({ request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect([307, 308]).toContain(response.status());
  expect(response.headers()["location"]).toBe(APP);
});
