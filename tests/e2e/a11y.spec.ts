import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { APP } from "./app";
import { openMap, seek, showRow } from "./helpers";

// Accessibility across the main states: no serious
// or critical axe violations, Label in Name for every control (WCAG 2.5.3, with axe's
// experimental label-content-name-mismatch rule switched on), keyboard focus always
// visible, and hover and pressed states on every control.

const CONTROLS = 'button, a[href], summary, input, [role="tab"], [role="button"], [role="checkbox"], [role="slider"]';
/** Controls that need hover and pressed looks of their own. Text and range inputs keep the
 *  browser's own (a caret, a thumb) and the focus ring. */
const PRESSABLE = 'button, a[href], summary, [role="tab"], [role="button"], [role="checkbox"]';

/** Serious and critical axe violations on the page as it is now, one line each. */
async function axeViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).options({ rules: { "label-content-name-mismatch": { enabled: true } } }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")}`));
}

/** Visible controls whose accessible name does not start with the text they show. Only
 *  names that replace the content (aria-label, aria-labelledby) can disagree with it. */
async function labelInNameMismatches(page: Page): Promise<string[]> {
  return page.evaluate((selector) => {
    const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0 || getComputedStyle(el).visibility === "hidden") continue;
      const labelledBy = el.getAttribute("aria-labelledby");
      const name = el.getAttribute("aria-label") ?? (labelledBy ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ") : null);
      if (name === null) continue;
      const shown = norm(el.innerText ?? "");
      if (shown && !norm(name).startsWith(shown)) out.push(`"${name}" shows "${shown}"`);
    }
    return out;
  }, CONTROLS);
}

async function expectAccessible(page: Page, state: string) {
  expect(await axeViolations(page), `axe, ${state}`).toEqual([]);
  expect(await labelInNameMismatches(page), `Label in Name, ${state}`).toEqual([]);
}

async function ready(page: Page) {
  await openMap(page);
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 }); // the interaction layer is in
  // With reduced motion the replay opens paused.
  const pause = page.getByRole("button", { name: "Pause" });
  if (await pause.isVisible()) await pause.click();
}

test("the main states have no serious or critical violations, and every name starts with its text", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => localStorage.setItem("cm-pin", "[41.8915,-87.6265]"));
  await ready(page);
  await expectAccessible(page, "Streets tab with a saved pin");

  await seek(page, 555);
  for (const tab of ["Race", "Records", "Facts"]) {
    await page.getByRole("tab", { name: tab }).click();
    await expectAccessible(page, `${tab} tab at 9:15 AM`);
  }

  await page.getByRole("tab", { name: "Streets" }).click();
  await page.getByRole("searchbox", { name: "Find a street" }).fill("zzz");
  await expect(page.getByRole("status").filter({ hasText: "No course street matches 'zzz'" })).toBeVisible();
  await expectAccessible(page, "a search with no match");
  await page.getByRole("searchbox", { name: "Find a street" }).fill("");

  const slug = "grand-ave-columbus-dr-to-dearborn-st";
  await showRow(page, slug);
  await page.locator(`[data-testid="street-row"][data-slug="${slug}"] button`).click();
  await expect(page.getByTestId("street-card")).toBeVisible();
  await expectAccessible(page, "the street card");
  await page.getByTestId("street-card").getByRole("button", { name: "Close street details" }).click();

  await page.getByRole("button", { name: "Key", exact: true }).click();
  await expect(page.getByTestId("map-key")).toBeVisible();
  await expectAccessible(page, "the map key");
  await page.keyboard.press("Escape");

  if (testInfo.project.name === "phone") {
    // The card lowered the sheet to peek; the handle steps peek, half, full.
    const snap = () => page.locator("main").getAttribute("data-snap");
    await page.locator("[data-sheet-handle]").focus();
    for (const next of ["half", "full"]) {
      if ((await snap()) === "full") break;
      await page.keyboard.press("Enter");
      await expect.poll(snap).toBe(next);
    }
    await expectAccessible(page, "the full sheet");
  }
});

test("the replay after race day has no serious or critical violations", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-12T15:00:00Z") });
  await page.goto(APP);
  await expect(page.getByTestId("street-row").getByRole("button")).toHaveCount(41, { timeout: 15_000 });
  await expect(page.locator("main")).toHaveAttribute("data-tense", "past");
  await expectAccessible(page, "after race day");
});

test("keyboard focus is always visible", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "keyboard navigation is measured on the desktop layout");
  await ready(page);
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  const unringed = new Set<string>();
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const ringed = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2) || s.boxShadow !== "none";
      return { ringed, name: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}"` };
    });
    if (focus && !focus.ringed) unringed.add(focus.name);
  }
  expect([...unringed]).toEqual([]);
});

/** Visible controls whose own look (or a descendant's) does not change when `pseudo` is
 *  forced on them through the DevTools protocol, with transitions switched off. */
async function controlsWithoutState(page: Page, pseudo: "hover" | "active"): Promise<string[]> {
  await page.mouse.move(0, 0); // the last click left the pointer hovering a control
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: PRESSABLE });
  const look = async (objectId: string) =>
    (
      await cdp.send("Runtime.callFunctionOn", {
        objectId,
        returnByValue: true,
        functionDeclaration: `function () {
          const box = this.getBoundingClientRect();
          if (box.width === 0 || box.height === 0 || getComputedStyle(this).visibility === "hidden") return null;
          return [this, ...this.querySelectorAll("*")].map((el) => {
            const s = getComputedStyle(el);
            return [s.backgroundColor, s.color, s.borderColor, s.boxShadow, s.transform, s.scale, s.translate, s.opacity, s.filter, s.textDecorationLine, s.fill, s.stroke].join(",");
          }).join("|");
        }`,
      })
    ).result.value as string | null;
  const label = async (objectId: string) =>
    (
      await cdp.send("Runtime.callFunctionOn", {
        objectId,
        returnByValue: true,
        functionDeclaration: `function () { return this.tagName.toLowerCase() + ' "' + (this.getAttribute("aria-label") || this.textContent || "").trim().slice(0, 40) + '"'; }`,
      })
    ).result.value as string;
  const missing: string[] = [];
  for (const nodeId of nodeIds) {
    const { object } = await cdp.send("DOM.resolveNode", { nodeId });
    if (!object.objectId) continue;
    const before = await look(object.objectId);
    if (before === null) continue;
    await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [pseudo] });
    const after = await look(object.objectId);
    await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });
    if (after === before) missing.push(await label(object.objectId));
  }
  return [...new Set(missing)];
}

test("every control has a hover and a pressed state", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => localStorage.setItem("cm-pin", "[41.8915,-87.6265]"));
  await ready(page);
  const slug = "grand-ave-columbus-dr-to-dearborn-st";
  await showRow(page, slug);
  await page.locator(`[data-testid="street-row"][data-slug="${slug}"] button`).click();
  await expect(page.getByTestId("street-card")).toBeVisible();
  // Touch screens have no hover (Tailwind's hover: needs a hovering pointer); presses everywhere.
  if (testInfo.project.name === "desktop") expect(await controlsWithoutState(page, "hover"), "hover").toEqual([]);
  expect(await controlsWithoutState(page, "active"), "pressed").toEqual([]);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("presses still show, without movement", async ({ page }) => {
    await ready(page);
    expect(await controlsWithoutState(page, "active"), "pressed").toEqual([]);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: '[data-testid="play-button"]' });
    await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["active"] });
    const play = await page.getByTestId("play-button").evaluate((el) => ({ transform: getComputedStyle(el).transform, scale: getComputedStyle(el).scale }));
    expect(play).toEqual({ transform: "none", scale: "none" });
  });
});

test.describe("at 320 CSS px (WCAG 1.4.10, reflow)", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("nothing scrolls sideways, and the opening and a street card stay accessible", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "phone project only");
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    await expectAccessible(page, "opening at 320 px");
    await showRow(page, "stockton-dr-lasalle-dr-to-fullerton-dr");
    await page.locator('[data-testid="street-row"][data-slug="stockton-dr-lasalle-dr-to-fullerton-dr"]').getByRole("button").click();
    await expect(page.getByTestId("street-card")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    await expectAccessible(page, "street card at 320 px");
  });
});
