import { expect, test, type Page } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, closedState, layerAtOpenMap, openMap, seek, segmentState } from "./helpers";

const NOTE = "Simple map: this device can't draw the live runner stream.";

/** Loses the map's WebGL context; restores it after `restoreAfterMs` unless null. */
async function loseContext(page: Page, restoreAfterMs: number | null) {
  await page.evaluate((ms) => {
    const gl = window.__cmm?.map.getCanvas().getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_lose_context");
    if (!ext) throw new Error("WEBGL_lose_context is unavailable");
    ext.loseContext();
    if (ms !== null) setTimeout(() => ext.restoreContext(), ms);
  }, restoreAfterMs);
}

type LoseHandle = { restoreContext: () => void };

/** Loses the context and resolves once MapLibre has seen it, so the test runs inside
 *  the lost window. Pair with restoreNow(). */
async function loseNow(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const map = window.__cmm?.map;
        const ext = map?.getCanvas().getContext("webgl2")?.getExtension("WEBGL_lose_context");
        if (!map || !ext) throw new Error("WEBGL_lose_context is unavailable");
        (window as unknown as { loseHandle: LoseHandle }).loseHandle = ext;
        map.once("webglcontextlost", () => resolve());
        ext.loseContext();
      }),
  );
}

/** Restores the context loseNow() took away; resolves once MapLibre has seen it come back. */
async function restoreNow(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const map = window.__cmm?.map;
        const handle = (window as unknown as { loseHandle?: LoseHandle }).loseHandle;
        if (!map || !handle) throw new Error("The context was not lost with loseNow()");
        map.once("webglcontextrestored", () => resolve());
        handle.restoreContext();
      }),
  );
}

/** Uncaught errors and reportError() calls in the page, from before it loads. */
async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.addEventListener("error", (e) => console.error(`page error: ${e.message}`));
    window.addEventListener("unhandledrejection", (e) => console.error(`unhandled rejection: ${String(e.reason)}`));
  });
  page.on("console", (m) => {
    if (m.type() === "error" && /^(page error|unhandled rejection):/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

/** Waits until the restored style has loaded and the runner layer is back on it. */
async function waitForRestoredStyle(page: Page) {
  await expect.poll(() => page.evaluate(() => window.__cmm?.map.getLayer("runners")?.type), { timeout: 5000 }).toBe("custom");
}

test("recovers the runner layer and closures when the context comes back", async ({ page }) => {
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 540);
  const tier = (await page.getByTestId("map-stage").getAttribute("data-tier")) as "high" | "medium" | "low";
  await page.evaluate(() => {
    const events: string[] = [];
    (window as unknown as { contextEvents: string[] }).contextEvents = events;
    window.__cmm?.map.once("webglcontextlost", () => events.push("lost"));
    window.__cmm?.map.once("webglcontextrestored", () => events.push("restored"));
  });
  await loseContext(page, 300);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { contextEvents: string[] }).contextEvents))
    .toEqual(["lost", "restored"]);
  await expect.poll(() => page.evaluate(() => window.__cmm?.map.getLayer("runners")?.type), { timeout: 5000 }).toBe("custom");
  await expect.poll(() => page.evaluate(() => window.__cmm?.runners.drawn)).toBe({ high: 5300, medium: 2650, low: 1325 }[tier]);
  await expect.poll(() => page.evaluate(() => window.__cmm?.map.getFeatureState({ source: "course", id: 2 }).closed)).toBe(1);
  await page.clock.runFor(2500); // past the 2 s fallback deadline, on the page's fake clock
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-engine", "map");
  await expect(page.getByText(NOTE)).toHaveCount(0);
});

test("falls back to the SVG map when the context stays lost for 2 seconds", async ({ page }) => {
  await openMap(page);
  await loseContext(page, null);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-engine", "map");
  await page.clock.runFor(2100);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-engine", "fallback");
  await expect(page.getByText(NOTE)).toBeVisible();
  await expect(page.locator(".course-seg")).toHaveCount(41);
  await expect(page.locator(".map-svg")).toBeVisible();
  expect(await layerAtOpenMap(page)).toBe("svg"); // the dead map does not sit over the SVG
});

test("closures keep following the clock while the context is lost, and the restored map matches", async ({ page }) => {
  const errors = await collectErrors(page);
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 600); // 10:00 AM: Columbus Dr and Grand Ave (0 and 1) are still closed
  await expect.poll(() => closedState(page, 0)).toBe(1);

  await loseNow(page);
  await seek(page, 630); // 10:30 AM: segments 0 and 1 reopen
  await seek(page, 700); // 11:40 AM: segments 2, 3 (11:00) and 4 (11:30) reopen too; 5 stays closed until noon
  await restoreNow(page);
  await waitForRestoredStyle(page);

  for (const [segment, closed] of [[0, 0], [1, 0], [2, 0], [4, 0], [5, 1], [40, 1]] as const) {
    await expect.poll(() => closedState(page, segment), { message: `segment ${segment}` }).toBe(closed);
  }
  expect(errors).toEqual([]);
  await page.clock.runFor(2500);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-engine", "map");
});

test("keeps the selection and hover flags on the restored map, including one set while lost", async ({ page }) => {
  const errors = await collectErrors(page);
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 540);
  await page.evaluate(() => window.__cmm?.engine.setSegmentFlag(5, "selected", true));
  expect((await segmentState(page, 5))?.selected).toBe(true);

  await loseNow(page);
  await page.evaluate(() => window.__cmm?.engine.setSegmentFlag(7, "hover", true));
  await restoreNow(page);
  await waitForRestoredStyle(page);

  await expect.poll(() => segmentState(page, 5)).toMatchObject({ closed: 1, selected: true, hover: false });
  await expect.poll(() => segmentState(page, 7)).toMatchObject({ closed: 1, selected: false, hover: true });
  await expect.poll(() => segmentState(page, 6)).toMatchObject({ selected: false, hover: false });

  // The flags still follow the engine after the restore.
  await page.evaluate(() => window.__cmm?.engine.setSegmentFlag(5, "selected", false));
  await expect.poll(() => segmentState(page, 5)).toMatchObject({ selected: false });
  expect(errors).toEqual([]);
});

test("falls back to the SVG map with the quiet note when the map engine fails to load", async ({ page }) => {
  // Abort the one script that carries MapLibre (found by MapLibre's own error class); every other script loads.
  let aborted = 0;
  await page.route("**/*.js", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (body.includes("GPUInitializationError")) {
      aborted++;
      await route.abort("failed");
    } else {
      await route.fulfill({ response, body });
    }
  });
  const errors = await collectErrors(page);
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-engine", "fallback", { timeout: 10_000 });
  expect(aborted).toBeGreaterThan(0);
  await expect(page.getByText(NOTE)).toBeVisible();
  await expect(page.locator(".course-seg")).toHaveCount(41);
  await expect(page.locator(".map-svg")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toHaveCount(0); // the controls only exist for MapLibre
  expect(await layerAtOpenMap(page)).toBe("svg");
  // The failure is reported, not swallowed.
  expect(errors.join(" | ")).toContain("Failed to load chunk");

  // The SVG still follows the clock.
  await page.getByRole("button", { name: "Pause" }).click();
  await seek(page, 630);
  await expect(page.locator('.course-seg[data-slug="columbus-dr-start-to-grand-ave"]')).toHaveAttribute("data-state", "open");
  await seek(page, 540);
  await expect(page.locator('.course-seg[data-slug="columbus-dr-start-to-grand-ave"]')).toHaveAttribute("data-state", "closed");
});
