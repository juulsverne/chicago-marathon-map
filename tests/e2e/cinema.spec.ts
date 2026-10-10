import { expect, test, type Page } from "@playwright/test";
import { APP } from "./app";
import { REPLAY_DAY, openMap, seek } from "./helpers";

// Dawn-to-dusk cinema. The opening (the draw-in, the 6:00 ripple and the
// key-moment slowdown) runs only when a test opts in under automation (src/map/MapStage.tsx).
// The camera never moves on its own (owner, 2026-10-09).

const camera = (page: Page) =>
  page.evaluate(() => {
    const map = window.__cmm?.map;
    return map ? { zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(), moving: map.isMoving() } : null;
  });
const minute = (page: Page) => page.getByTestId("clock").textContent();
/** The clock as minutes after midnight ("7:25 AM" is 445). */
const clockMinutes = async (page: Page) => {
  const [, h, m, ap] = /(\d+):(\d+)\s*(AM|PM)/.exec((await minute(page)) ?? "") ?? [];
  return h ? ((Number(h) % 12) + (ap === "PM" ? 12 : 0)) * 60 + Number(m) : -1;
};
// Unset means the style default: fully drawn.
const courseOpacity = (page: Page) => page.evaluate(() => window.__cmm?.map.getPaintProperty("course-line", "line-opacity") ?? 1);
const mileOpacity = (page: Page) => page.evaluate(() => window.__cmm?.map.getPaintProperty("mile-labels", "text-opacity") ?? 1);

async function openCinema(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __cmmCinema: boolean }).__cmmCinema = true;
  });
  await page.clock.install({ time: REPLAY_DAY });
  await page.goto(APP);
  await expect(page.getByTestId("map-stage")).toHaveAttribute("data-map-ready", "true", { timeout: 30_000 });
}

test.describe("the opening sequence", () => {
  test("keeps the camera still from load past the start: the course draws in at 5:50, then plays", async ({ page }) => {
    // Sampled in the page every frame from the moment the map exists, so a slow test
    // runner cannot miss the 2 s draw-in or a camera move between checks.
    await page.addInitScript(() => {
      const seen = { drawingHeld: false, milesHidden: false, moved: "" };
      let first: number[] | null = null;
      (window as unknown as { seen: typeof seen }).seen = seen;
      const tick = () => {
        const map = window.__cmm?.map;
        // Until the style has its layers, reading a paint property throws.
        if (map?.getLayer("course-line") && map.getLayer("mile-labels")) {
          const c = map.getCenter();
          const cam = [c.lng, c.lat, map.getZoom(), map.getPitch(), map.getBearing()];
          first ??= cam;
          if (!seen.moved && cam.some((v, i) => Math.abs(v - first![i]) > 1e-6)) seen.moved = `${first.join()} -> ${cam.join()}`;
          const drawing = (map.getPaintProperty("course-line", "line-opacity") ?? 1) !== 1;
          const clock = document.querySelector('[data-testid="clock"]')?.textContent;
          if (drawing && clock === "5:50 AM") seen.drawingHeld = true; // held while it draws in
          if ((map.getPaintProperty("mile-labels", "text-opacity") ?? 1) !== 1) seen.milesHidden = true;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await openCinema(page);
    expect((await camera(page))?.pitch).toBe(0);
    await expect.poll(() => courseOpacity(page), { timeout: 6_000 }).toBe(1);
    expect(await mileOpacity(page)).toBe(1); // every mile marker shows once the course is drawn
    // Through the wheelchair start (7:20) and the gun (7:30): nothing moves the camera.
    await expect.poll(() => clockMinutes(page), { timeout: 20_000 }).toBeGreaterThanOrEqual(455);
    expect(await page.evaluate(() => (window as unknown as { seen: unknown }).seen)).toEqual({ drawingHeld: true, milesHidden: true, moved: "" });
  });

  test("ripples the 6:00 closures red in race order", async ({ page }) => {
    await openCinema(page);
    // Watch the first and the 40th segment's closed state every frame until both are closed.
    const gap = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const map = window.__cmm!.map;
          let first = -1;
          let last = -1;
          const tick = () => {
            const closed = (id: number) => map.getFeatureState({ source: "course", id })?.closed ?? 0;
            const now = performance.now();
            if (first < 0 && closed(0) >= 1) first = now;
            if (last < 0 && closed(39) >= 1) last = now;
            if (first >= 0 && last >= 0) resolve(last - first);
            else requestAnimationFrame(tick);
          };
          tick();
        }),
    );
    expect(gap).toBeGreaterThan(700); // 1.2 s over 41 segments: number 39 lands about 1.1 s later
  });

  test("a drag cancels the opening for the session, and playback carries on", async ({ page }) => {
    await openCinema(page);
    const box = await page.getByTestId("map").boundingBox();
    if (!box) throw new Error("no map");
    // MapLibre must see a real drag, so the checks below judge the app, not the input.
    await page.evaluate(() => {
      const w = window as unknown as { dragged: boolean };
      w.dragged = false;
      window.__cmm?.map.once("dragstart", () => (w.dragged = true));
    });
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 12 });
    await page.mouse.up();
    expect(await page.evaluate(() => (window as unknown as { dragged: boolean }).dragged)).toBe(true);
    // Cancelled: the course shows in full and the clock runs.
    await expect.poll(() => courseOpacity(page)).toBe(1);
    await expect.poll(() => minute(page), { timeout: 6_000 }).not.toBe("5:50 AM");
    // Let the gesture settle: MapLibre's inertia, and its snap to north when a gesture ends
    // within 7 degrees of it (bearingSnap), are the user's move, not the opening's.
    await expect.poll(async () => (await camera(page))?.moving, { timeout: 5_000 }).toBe(false);
    const after = await camera(page);
    // Past the race start, the camera stays where the user left it.
    await expect.poll(() => clockMinutes(page), { timeout: 20_000 }).toBeGreaterThanOrEqual(445);
    const later = await camera(page);
    expect(later?.zoom).toBeCloseTo(after?.zoom ?? 0, 3);
    expect(later?.pitch).toBeCloseTo(after?.pitch ?? 0, 3);
    expect(later?.bearing).toBeCloseTo(after?.bearing ?? 0, 3);
  });

  test("Live skips it and opens at the real time", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cmmCinema: boolean }).__cmmCinema = true;
    });
    await page.clock.install({ time: new Date("2026-10-11T14:00:00Z") });
    await page.goto(APP);
    await expect(page.getByTestId("map-stage")).toHaveAttribute("data-map-ready", "true", { timeout: 30_000 });
    expect((await camera(page))?.pitch).toBeLessThan(1);
    expect(await courseOpacity(page)).toBe(1);
    await expect(page.getByTestId("clock")).toHaveText("9:00 AM");
  });

  test("a shared link skips it and opens paused at its moment", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cmmCinema: boolean }).__cmmCinema = true;
    });
    await page.clock.install({ time: REPLAY_DAY });
    await page.goto(`${APP}?t=1030&s=columbus-dr-start-to-grand-ave`);
    await expect(page.getByTestId("map-stage")).toHaveAttribute("data-map-ready", "true", { timeout: 30_000 });
    await expect(page.getByTestId("clock")).toHaveText("10:30 AM");
    await expect.poll(() => courseOpacity(page)).toBe(1);
    await page.waitForTimeout(1000);
    expect((await camera(page))?.pitch).toBeLessThan(1);
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("there is no choreography: paused at 5:50 with the course framed flat", async ({ page }) => {
    await openCinema(page);
    await expect(page.getByRole("button", { name: /^Play race day/ })).toBeVisible();
    expect((await camera(page))?.pitch).toBeLessThan(1);
    expect(await courseOpacity(page)).toBe(1);
    await page.waitForTimeout(1000);
    expect(await minute(page)).toBe("5:50 AM");
  });
});

test("the light follows the race clock: night before dawn, v1's day palette mid-race, golden late", async ({ page }) => {
  await openMap(page);
  await page.getByRole("button", { name: "Pause" }).click();
  const land = () => page.evaluate(() => String(window.__cmm?.map.getPaintProperty("background", "background-color")));
  await seek(page, 330);
  await expect.poll(land).not.toBe("#191b1e");
  const night = await land();
  await seek(page, 600);
  await expect.poll(land).toBe("#191b1e");
  await seek(page, 1060);
  await expect.poll(land).not.toBe("#191b1e");
  expect(await land()).not.toBe(night);
});
