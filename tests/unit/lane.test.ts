import { describe, expect, it } from "vitest";
import { courseWidth, laneHalfWidth, leaderRadius, metersPerPixel, pxToMercator, runnerRadius, widthExpression, widthPx } from "@/map/lane";

// v1's sizes (v1 inventory, Appendix C) at Leaflet zoom z, which is MapLibre zoom z - 1.
const V1 = [
  { leaflet: 13, mpp: 14.23, lineW: 4.0, r: 1.44, lane: 0.06 },
  { leaflet: 15, mpp: 3.56, lineW: 5.02, r: 2.2, lane: 0 },
  { leaflet: 16, mpp: 1.78, lineW: 10.04, r: 2.2, lane: 2.32 },
  { leaflet: 17, mpp: 0.89, lineW: 20.08, r: 3.6, lane: 5.94 },
  { leaflet: 18.5, mpp: 0.31, lineW: 56.79, r: 3.6, lane: 24.29 },
];

describe("v1 sizing on MapLibre zooms", () => {
  it.each(V1)("matches v1 at Leaflet zoom $leaflet", ({ leaflet, mpp, lineW, r, lane }) => {
    const z = leaflet - 1;
    expect(metersPerPixel(z)).toBeCloseTo(mpp, 2);
    expect(courseWidth(z)).toBeCloseTo(lineW, 2);
    expect(runnerRadius(z)).toBeCloseTo(r, 2);
    expect(laneHalfWidth(z)).toBeCloseTo(lane, 2);
  });

  it("sizes leader markers 3.5 px over runners, at least 5.5 px", () => {
    expect(leaderRadius(10)).toBe(5.5);
    expect(leaderRadius(16)).toBeCloseTo(7.1, 6);
  });

  it("converts CSS px to mercator units", () => {
    expect(pxToMercator(512, 0)).toBe(1);
    expect(pxToMercator(1, 1)).toBe(1 / 1024);
  });
});

describe("widthExpression", () => {
  // Evaluate the expression the way MapLibre does (base-2 exponential interpolation, clamped).
  const evaluate = (expr: unknown[], z: number) => {
    const [, , , z0, w0, z1, w1] = expr as [string, unknown, unknown, number, number, number, number];
    if (z <= z0) return w0;
    if (z >= z1) return w1;
    const f = (2 ** (z - z0) - 1) / (2 ** (z1 - z0) - 1);
    return w0 + (w1 - w0) * f;
  };

  it.each([8, 11.5, 13, 15.25, 17.5])("equals widthPx plus the offset at zoom %d", (z) => {
    expect(evaluate(widthExpression(17.85, 4, 3.5), z)).toBeCloseTo(widthPx(17.85, 4, z) + 3.5, 6);
    expect(evaluate(widthExpression(9, 0.45), z)).toBeCloseTo(widthPx(9, 0.45, z), 6);
  });
});
