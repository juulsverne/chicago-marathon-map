import { describe, expect, it } from "vitest";
import { COURSE_BOUNDS, DATA_BOUNDS, MAX_BOUNDS, courseInUncovered, courseInView, fitPadding } from "@/map/camera";
import { ROUTE_POINTS } from "@/model/course";

describe("camera bounds", () => {
  it("frames the course inside the data box, and the data box inside the pan limit", () => {
    const [[west, south], [east, north]] = COURSE_BOUNDS;
    expect([west, south, east, north]).toEqual([-87.67658, 41.83104, -87.62023, 41.95306]);
    const inside = ([[w, s], [e, n]]: typeof COURSE_BOUNDS, [[minLng, minLat], [maxLng, maxLat]]: typeof COURSE_BOUNDS) =>
      w > minLng && e < maxLng && s > minLat && n < maxLat;
    expect(inside(COURSE_BOUNDS, DATA_BOUNDS)).toBe(true);
    expect(inside(DATA_BOUNDS, MAX_BOUNDS)).toBe(true);
  });

  it("keeps the course clear of the fade at the data box's edge", () => {
    // The fade reaches 0.06 degrees of longitude and 0.045 of latitude in (style.ts).
    const [[west, south], [east, north]] = COURSE_BOUNDS;
    const [[minLng, minLat], [maxLng, maxLat]] = DATA_BOUNDS;
    expect(Math.min(west - minLng, maxLng - east)).toBeGreaterThan(0.06);
    expect(Math.min(south - minLat, maxLat - north)).toBeGreaterThan(0.045);
  });
});

describe("fitPadding", () => {
  it("clears the top bar, the dock and anything on the right, plus a 16 px gap", () => {
    expect(fitPadding({ width: 1440, height: 900 }, { top: 120, bottom: 700, right: 1040 })).toEqual({
      top: 136,
      bottom: 216,
      left: 16,
      right: 416,
    });
  });

  it("shrinks proportionally when the chrome would leave the course less than 40% of the map", () => {
    const p = fitPadding({ width: 400, height: 500 }, { top: 250, bottom: 260, right: 400 });
    expect(p.top + p.bottom).toBeLessThanOrEqual(300);
    expect(p.top).toBeGreaterThan(p.bottom);
  });
});

describe("courseInView", () => {
  // A plain equirectangular projection centered on the course, 10,000 px per degree.
  const [[west, south], [east, north]] = COURSE_BOUNDS;
  const at = (lng0: number, lat0: number) => ([lng, lat]: [number, number]) => ({ x: (lng - lng0) * 10_000 + 200, y: (lat0 - lat) * 10_000 + 200 });

  it("sees the course when part of it is on screen", () => {
    expect(courseInView(at((west + east) / 2, (south + north) / 2), 400, 400)).toBe(true);
  });

  it("does not when the view is far from the course", () => {
    expect(courseInView(at(-87.45, 42.0), 400, 400)).toBe(false);
  });

  it("sees a long straight stretch that crosses the view between route points", () => {
    // Centre on the middle of the longest route segment, zoomed in so far that
    // neither of its end points is on screen.
    let longest = 0;
    for (let i = 1; i < ROUTE_POINTS.length; i++) {
      const [a, b] = [ROUTE_POINTS[i - 1], ROUTE_POINTS[i]];
      const [c, d] = [ROUTE_POINTS[longest], ROUTE_POINTS[longest + 1] ?? ROUTE_POINTS[longest]];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > Math.hypot(d[0] - c[0], d[1] - c[1])) longest = i - 1;
    }
    const [a, b] = [ROUTE_POINTS[longest], ROUTE_POINTS[longest + 1]];
    const view = at((a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
    const zoomed = (ll: [number, number]) => {
      const p = view(ll);
      return { x: (p.x - 200) * 50 + 200, y: (p.y - 200) * 50 + 200 };
    };
    for (const end of [a, b]) {
      const { x, y } = zoomed([end[1], end[0]]);
      expect(x < 0 || x > 400 || y < 0 || y > 400).toBe(true);
    }
    expect(courseInView(zoomed, 400, 400)).toBe(true);
  });
});

describe("courseInUncovered", () => {
  // The course centred in a 400 x 400 map at 10,000 px per degree (about 560 x 1,220 px).
  const [[west, south], [east, north]] = COURSE_BOUNDS;
  const project = ([lng, lat]: [number, number]) => ({ x: (lng - (west + east) / 2) * 10_000 + 200, y: ((south + north) / 2 - lat) * 10_000 + 200 });
  const none = { top: 0, right: 0, bottom: 0, left: 0 };

  it("sees the course on an uncovered map", () => {
    expect(courseInUncovered(project, 400, 400, none)).toBe(true);
  });

  it("does not count course hidden under the UI", () => {
    // A panel over the right 300 px and a sheet over the bottom 380 px leave a 100 x 20 px corner.
    const scale = (ll: [number, number]) => {
      const p = project(ll);
      return { x: (p.x - 200) * 0.05 + 330, y: (p.y - 200) * 0.05 + 300 };
    };
    expect(courseInView(scale, 400, 400)).toBe(true); // on the canvas...
    expect(courseInUncovered(scale, 400, 400, { top: 0, right: 300, bottom: 80, left: 0 })).toBe(false); // ...but all under the UI
  });

  it("sees nothing when the UI covers the whole map", () => {
    expect(courseInUncovered(project, 400, 400, { top: 250, right: 0, bottom: 200, left: 0 })).toBe(false);
  });
});
