import { expect, test } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY } from "./helpers";

// A browser without WebGL2 keeps the simple SVG map, which draws no runner dots.
test.use({ launchOptions: { args: ["--disable-webgl2"] } });

test("the map key says the simple map draws no runner dots", async ({ page }) => {
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-engine", "fallback", { timeout: 10_000 });
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 }); // the interaction layer is in
  await page.getByRole("button", { name: "Key", exact: true }).click();
  await expect(page.getByTestId("map-key")).toContainText("This device shows the simple map, without them.");
});
