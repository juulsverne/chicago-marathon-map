import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import mapdata from "../../data/source/mapdata.json";
import svg from "@/data/course-svg.json";
import histogram from "@/data/histogram.json";
import hoods from "@/data/hoods.json";
import route from "@/data/route.json";
import { MAP_DATA_FILES, buildData } from "@/lib/build-data";
import { decode, flatDistance, type MapData } from "@/lib/geo/decode";
import { buildRoute } from "@/lib/geo/route";
import { fitProjection } from "@/lib/geo/svg";
import { MILE, ROUTE_CUM, ROUTE_LEN, ROUTE_POINTS, SEGMENTS, SEGMENT_ENDS, SVG_PROJECTION, pointAt, routeIndex, svgPoint } from "@/model/course";
import { segmentIndexAt } from "@/model/runners";

const source = mapdata as unknown as MapData;
// Read with fs, not import: streets.json is 860 KB and would slow the module transform.
const publicJson = (name: string) => JSON.parse(readFileSync(`public/data/${name}.json`, "utf8"));

describe("generated data", () => {
  // What npm run build:data would write today, after the JSON round trip the files take.
  const built = JSON.parse(JSON.stringify(buildData(source)));

  it("is up to date with the source data, the content and the runner model", () => {
    expect(built.route).toEqual(route);
    expect(built.svg).toEqual(svg);
    expect(built.histogram).toEqual(histogram);
    expect(built.hoods).toEqual(hoods);
    for (const name of MAP_DATA_FILES) expect(built.geojson[name], `public/data/${name}.json`).toEqual(publicJson(name));
  });

  it("has one SVG path per course segment", () => {
    expect(svg.course).toHaveLength(41);
    expect(svg.course.every((d) => d.startsWith("M"))).toBe(true);
    expect(svg.width).toBe(1000);
  });
});

describe("course", () => {
  it("joins content with route spans", () => {
    expect(SEGMENTS).toHaveLength(41);
    expect(SEGMENTS[0].slug).toBe("columbus-dr-start-to-grand-ave");
    expect(SEGMENTS.filter((s) => s.finishArea).map((s) => s.index)).toEqual([40]);
    expect(SEGMENTS[40].mi1).toBeCloseTo(26.219, 6);
  });

  it("recomputes buildRoute's cumulative distances exactly", () => {
    const built = buildRoute(source.course.map(decode));
    expect(Array.from(ROUTE_CUM)).toEqual(built.cum);
    expect(ROUTE_POINTS).toEqual(built.points);
  });

  it("carries the SVG projection, so the client needs none of the SVG paths", () => {
    expect(SVG_PROJECTION).toEqual(fitProjection(ROUTE_POINTS));
    expect(Object.keys(route)).not.toContain("cum");
  });

  it("locates points along the route", () => {
    const [lat, lng] = pointAt(0);
    expect(lat).toBeCloseTo(41.88087, 5);
    expect(lng).toBeCloseTo(-87.62079, 5);
    expect(pointAt(ROUTE_LEN)[0]).toBeCloseTo(41.87321, 3);
    expect(routeIndex(0)).toBe(0);
    expect(MILE).toBeCloseTo(ROUTE_LEN / 26.219, 9);
  });

  it("interpolates between route points", () => {
    const checked: number[] = [];
    for (let i = 0; i + 1 < ROUTE_POINTS.length; i++) {
      const span = ROUTE_CUM[i + 1] - ROUTE_CUM[i];
      if (span < 20) continue;
      for (const fraction of [0.25, 0.5, 0.9]) {
        const d = ROUTE_CUM[i] + span * fraction;
        const point = pointAt(d);
        expect(routeIndex(d)).toBe(i);
        expect(Math.abs(flatDistance(ROUTE_POINTS[i], point) - (d - ROUTE_CUM[i]))).toBeLessThan(0.01);
        expect(Math.abs(flatDistance(point, ROUTE_POINTS[i + 1]) - (ROUTE_CUM[i + 1] - d))).toBeLessThan(0.01);
      }
      checked.push(i);
    }
    expect(checked.length).toBeGreaterThan(100);
  });

  it("agrees with segmentIndexAt on segment ends", () => {
    expect(segmentIndexAt(SEGMENT_ENDS, SEGMENTS[12].d0 + 1)).toBe(12);
  });

  it("projects the start inside the SVG", () => {
    const [x, y] = svgPoint(pointAt(0));
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(svg.width);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(svg.height);
  });
});

describe("course guard", () => {
  afterEach(() => {
    vi.doUnmock("@/data/route.json");
    vi.resetModules();
  });

  it("refuses to load when the route and the closure list disagree", async () => {
    vi.resetModules();
    vi.doMock("@/data/route.json", () => ({ default: { ...route, segments: route.segments.slice(0, 40) } }));
    await expect(import("@/model/course")).rejects.toThrow(/40 segments.*41 closures/);
  });
});
