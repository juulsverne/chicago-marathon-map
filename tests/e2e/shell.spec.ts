import { expect, test } from "@playwright/test";
import { APP } from "./app";

const LAB_URL = "https://lab.elijahos.com/chicago-marathon-map";

test("prerenders the 5:50 AM opening state", async ({ request }) => {
  const html = await (await request.get(APP)).text();
  expect(html).toContain("5:50 AM");
  expect(html).toContain("of 41 closed");
  expect(html).toContain("Streets close at 6:00 AM CT");
  expect(html.match(/class="course-seg"/g)).toHaveLength(41);
});

test("ships complete share metadata", async ({ page }) => {
  await page.goto(APP);
  const meta = (selector: string) => page.locator(selector).getAttribute("content");
  expect(await meta('meta[property="og:url"]')).toBe(LAB_URL);
  expect(await meta('meta[property="og:image"]')).toBe(`${LAB_URL}/og.png`);
  expect(await meta('meta[name="twitter:card"]')).toBe("summary_large_image");
  expect(await meta('meta[name="robots"]')).toBe("noindex, follow");
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe(LAB_URL);
});

test("serves the share image under the base path", async ({ request }) => {
  const response = await request.get(`${APP}/og.png`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
  expect(response.headers()["cache-control"]).toBe("public, max-age=86400");
});

test("shows the unofficial disclaimer", async ({ page }) => {
  await page.goto(APP);
  // In the dock, which is always on screen (the phone sheet repeats it at the end of the panel).
  const dock = page.getByTestId("timeline-panel");
  await expect(dock.getByText("Unofficial. Not affiliated with the Bank of America Chicago Marathon")).toBeVisible();
  await expect(dock.getByRole("link", { name: "NotifyChicago" })).toHaveAttribute("href", "https://www.notifychicago.org/");
});
