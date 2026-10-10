import { expect, type Page } from "@playwright/test";
import { APP } from "./app";

/** A replay day (the Friday before the race), so the app never opens Live. */
export const REPLAY_DAY = new Date("2026-10-09T18:00:00Z");

/** Moves the timeline to `minutes` (minutes after midnight CT) the way a user would. */
export async function seek(page: Page, minutes: number) {
  await page.getByLabel("Time on race day").evaluate((el, v) => {
    const input = el as HTMLInputElement;
    input.value = String(v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, minutes);
}

/** Opens the app on a replay day and waits until MapLibre has drawn its first frame. */
export async function openMap(page: Page) {
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-map-ready", "true", { timeout: 20_000 });
}

/** The `closed` feature-state (0 open .. 1 closed) of one course segment on the map. */
export async function closedState(page: Page, segment: number): Promise<number | undefined> {
  return page.evaluate((id) => window.__cmm?.map.getFeatureState({ source: "course", id }).closed as number | undefined, segment);
}

/** Which layer takes a pointer in the middle of the open map (below the header row, above
 *  the dock, left of the side panel; on phones the dock rides above the sheet, so the
 *  stage's own middle is under it): the MapLibre canvas, the SVG course under it, or
 *  something else (the UI over the map). */
export async function layerAtOpenMap(page: Page): Promise<"map" | "svg" | "other"> {
  return page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
    const stage = rect('[data-testid="map-stage"]');
    if (!stage) return "other";
    const top = rect('[data-map-inset="top"]')?.bottom ?? stage.top;
    const bottom = rect('[data-testid="timeline-panel"]')?.top ?? stage.bottom;
    const panel = rect('[data-testid="panel-slot"]');
    const right = panel && panel.width > 0 ? panel.left : stage.right;
    const el = document.elementFromPoint((stage.left + right) / 2, (top + bottom) / 2);
    return el?.closest(".map-canvas") ? "map" : el?.closest(".map-svg") ? "svg" : "other";
  });
}

/** All feature-state keys of one course segment on the map (`closed`, and `selected` / `hover` once set). */
export async function segmentState(page: Page, segment: number): Promise<{ closed?: number; selected?: boolean; hover?: boolean } | undefined> {
  return page.evaluate((id) => window.__cmm?.map.getFeatureState({ source: "course", id }), segment);
}

/** Which of the 41 segments are drawn closed, by whichever renderer is showing:
 *  MapLibre once it has drawn, the SVG course before that (and as the fallback). */
export async function closedFlags(page: Page): Promise<boolean[]> {
  return page.evaluate(() => {
    const onMap = document.querySelector('[data-testid="map-stage"]')?.getAttribute("data-engine") === "map";
    const map = window.__cmm?.map;
    return Array.from({ length: 41 }, (_, i) =>
      onMap && map
        ? ((map.getFeatureState({ source: "course", id: i }).closed as number | undefined) ?? 0) >= 0.5
        : document.querySelectorAll(".course-seg")[i]?.getAttribute("data-state") === "closed",
    );
  });
}

export async function segmentClosed(page: Page, index: number): Promise<boolean> {
  return (await closedFlags(page))[index];
}

export async function closedSegments(page: Page): Promise<number> {
  return (await closedFlags(page)).filter(Boolean).length;
}

/** Whether a leader is drawn on the course, by whichever renderer is showing. */
export async function leaderDrawn(page: Page, id: string): Promise<boolean> {
  return page.evaluate((leader) => {
    const onMap = document.querySelector('[data-testid="map-stage"]')?.getAttribute("data-engine") === "map";
    const runners = window.__cmm?.runners;
    if (onMap && runners) return runners.leadersDrawn.includes(leader as never);
    return document.querySelector(`.leader[data-leader="${leader}"]`)?.getAttribute("visibility") === "visible";
  }, id);
}

/** On phones the sheet opens at peek (one line); raise it to half, as a person would by
 *  tapping the handle, before reaching into the panel. A no-op from 768 px, where the
 *  panel is a side panel with no handle. */
export async function raiseSheet(page: Page) {
  const handle = page.locator("[data-sheet-handle]");
  if (!(await handle.isVisible())) return;
  const snap = () => page.locator("main").getAttribute("data-snap");
  if ((await snap()) !== "peek") return;
  await expect(handle).toHaveAttribute("role", "button", { timeout: 15_000 });
  await handle.click();
  await expect.poll(snap).toBe("half");
}

/** Scrolls the panel so a street row sits just below its sticky group header, inside the
 *  part of the panel that is on screen (on phones the half-open sheet shows only its top). */
export async function showRow(page: Page, slug: string) {
  await raiseSheet(page);
  await page.locator(`[data-testid="street-row"][data-slug="${slug}"]`).evaluate((el) => {
    const scroller = el.closest("[data-panel-scroll]") as HTMLElement;
    scroller.scrollTop += el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 72;
  });
}

/** Zooms the map to `zoom` and moves the course's northernmost point to screen height `y`,
 *  so the whole course lies below `y` (it runs south from there). */
export async function placeCourseBelow(page: Page, y: number, zoom = 14) {
  await page.evaluate(
    async ({ y, zoom }) => {
      const map = window.__cmm?.map;
      if (!map) throw new Error("no map");
      const course = (await (await fetch("/chicago-marathon-map/data/course.json")).json()) as { features: { geometry: { coordinates: number[][] } }[] };
      const north = course.features.flatMap((f) => f.geometry.coordinates).reduce((a, b) => (b[1] > a[1] ? b : a));
      map.jumpTo({ center: [north[0], north[1]], zoom });
      const p = map.project([north[0], north[1]]);
      map.panBy([0, p.y - y], { duration: 0 });
    },
    { y, zoom },
  );
}
