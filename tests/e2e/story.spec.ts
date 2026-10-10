import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, raiseSheet } from "./helpers";

// "How it was built": the flyer-to-map story.

/** Every script the page fetches, recorded from the first request (the browser's resource
 *  timing buffer can overflow on this page, so it is not used). */
const scriptUrls = new WeakMap<Page, string[]>();

async function openFacts(page: Page) {
  const urls: string[] = [];
  scriptUrls.set(page, urls);
  page.on("response", (r) => {
    if (/\.m?js(\?|$)/.test(r.url())) urls.push(r.url());
  });
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  // The button works once the interaction layer has loaded (it upgrades the prerendered one).
  await expect(page.getByTestId("story-open").first()).toBeAttached();
  await raiseSheet(page);
  await page.getByRole("tab", { name: "Facts" }).click();
}

/** Scripts the page has fetched so far whose text contains GSAP's ScrollTrigger. */
async function gsapScripts(page: Page): Promise<string[]> {
  const urls = [...new Set(scriptUrls.get(page) ?? [])];
  const found: string[] = [];
  for (const url of urls) {
    const text = await (await page.request.get(url)).text();
    if (text.includes("ScrollTrigger")) found.push(url);
  }
  return found;
}

test("opens from How it was built with the notice, the course map, the principles and the close", async ({ page }) => {
  await openFacts(page);
  const button = page.getByRole("tabpanel").getByRole("button", { name: "How it was built" });
  await expect(button).toBeVisible();
  await expect.poll(() => gsapScripts(page)).toEqual([]);

  await button.click();
  const story = page.getByRole("dialog", { name: "From an elevator flyer to a live map" });
  await expect(story).toBeVisible();
  await expect(story.getByTestId("story-row")).toHaveCount(41);
  await expect(story.getByTestId("story-row").first()).toContainText("Columbus Dr");
  await expect(story.getByTestId("story-row").first()).toContainText("10:30 AM");
  await expect(story.locator(".story-seg")).toHaveCount(41);
  await expect(story.getByTestId("story-principle")).toHaveText([
    /Start from the real question/,
    /Use the city's data/,
    /Model what isn't published/,
    /Phone first/,
  ]);
  await expect(story.getByTestId("story-close-line")).toHaveText("Every city posts notices like this one. Most of them could be a map.");
  await expect(story).toContainText("Prototyped in an evening as a single web page, then rebuilt as a proper app.");
  await expect(story).toContainText("Claude");
  // GSAP arrived with the story, not before.
  await expect(story).toHaveAttribute("data-story-animated", "true");
  await expect.poll(async () => (await gsapScripts(page)).length).toBeGreaterThan(0);
});

test("draws streets onto the course as the reader scrolls", async ({ page }) => {
  await openFacts(page);
  await page.getByRole("tabpanel").getByRole("button", { name: "How it was built" }).click();
  const story = page.getByTestId("story");
  await expect(story).toHaveAttribute("data-story-animated", "true");
  // Before scrolling, the first street is not drawn yet; at the end of the stage, the last one is.
  const drawn = (i: number) =>
    story.locator(`.story-seg[data-index="${i}"]`).evaluate((p) => {
      const dash = getComputedStyle(p).strokeDasharray;
      const total = (p as SVGPathElement).getTotalLength();
      const visible = dash === "none" ? total : Number.parseFloat(dash.split(/[ ,]+/)[0]);
      return visible / total;
    });
  expect(await drawn(0)).toBeLessThan(0.05);
  await page.locator("[data-story-scroll]").evaluate((el) => {
    const stage = el.querySelector<HTMLElement>("[data-story-stage]")!;
    el.scrollTop = stage.offsetTop + stage.offsetHeight - el.clientHeight;
  });
  await expect.poll(() => drawn(40), { timeout: 5_000 }).toBeGreaterThan(0.95);
});

test("Back and Escape close the story without leaving the page, and focus returns to the button", async ({ page }) => {
  await openFacts(page);
  const button = page.getByRole("tabpanel").getByRole("button", { name: "How it was built" });
  const url = page.url();
  await button.click();
  await expect(page.getByTestId("story")).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId("story")).toHaveCount(0);
  expect(page.url()).toBe(url);
  await expect(button).toBeFocused();

  await button.click();
  await expect(page.getByTestId("story")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("story")).toHaveCount(0);
  await expect(button).toBeFocused();
});

test("has no serious or critical accessibility violations", async ({ page }) => {
  await openFacts(page);
  await page.getByRole("tabpanel").getByRole("button", { name: "How it was built" }).click();
  await expect(page.getByTestId("story")).toHaveAttribute("data-story-animated", "true");
  const results = await new AxeBuilder({ page })
    .include('[data-testid="story"]')
    .options({ rules: { "label-content-name-mismatch": { enabled: true } } })
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")}`))).toEqual([]);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows a static, readable story and never loads GSAP", async ({ page }) => {
    await openFacts(page);
    await page.getByRole("tabpanel").getByRole("button", { name: "How it was built" }).click();
    const story = page.getByTestId("story");
    await expect(story).toHaveAttribute("data-motion", "static");
    await expect(story.getByTestId("story-row")).toHaveCount(41);
    await expect(story.getByTestId("story-close-line")).toBeAttached();
    // Every street is drawn already, and nothing animates.
    const dash = await story.locator('.story-seg[data-index="40"]').evaluate((p) => getComputedStyle(p).strokeDasharray);
    expect(dash).toBe("none");
    await page.waitForTimeout(500);
    expect(await gsapScripts(page)).toEqual([]);
  });
});
