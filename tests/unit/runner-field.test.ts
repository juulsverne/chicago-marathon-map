import { MercatorCoordinate } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { leader } from "@/content/race";
import { MILE, ROUTE_CUM, ROUTE_LEN, ROUTE_POINTS, SEGMENT_ENDS, pointAt } from "@/model/course";
import { generateRunners, runnerStats } from "@/model/runners";
import { buildRouteGeometry, buildRunnerField, mercator, tierOrder, writeLeader, writeRunners } from "@/map/runner-field";

const runners = generateRunners();
const field = buildRunnerField(runners);
const geom = buildRouteGeometry(ROUTE_POINTS, ROUTE_CUM);

describe("mercator", () => {
  it("matches MapLibre's MercatorCoordinate", () => {
    for (const [lng, lat] of [
      [-87.62079, 41.88087],
      [-87.67658, 41.95306],
      [-87.4, 41.645],
    ]) {
      const m = MercatorCoordinate.fromLngLat([lng, lat]);
      const [x, y] = mercator(lng, lat);
      expect(x).toBeCloseTo(m.x, 14);
      expect(y).toBeCloseTo(m.y, 14);
    }
  });
});

describe("tierOrder", () => {
  it("is a permutation whose quarter and half prefixes are evenly spaced ranks", () => {
    const order = tierOrder(5300);
    expect(new Set(order).size).toBe(5300);
    expect(Array.from(order.slice(0, 1325)).every((r) => r % 4 === 0)).toBe(true);
    expect(Array.from(order.slice(0, 2650)).every((r) => r % 2 === 0)).toBe(true);
  });
});

describe("runner field", () => {
  const share = (n: number, wave: number) => {
    const order = tierOrder(runners.length);
    let k = 0;
    for (let i = 0; i < n; i++) if (runners[order[i]].wave === wave) k++;
    return k / n;
  };

  it.each([1325, 2650])("keeps the wave mix in the first %d runners", (n) => {
    for (const wave of [0, 1, 2]) expect(share(n, wave)).toBeCloseTo(share(5300, wave), 2);
  });

  it("puts the same runners on the course as the model", () => {
    const out = new Float32Array(5300 * 4);
    for (const t of [465, 540, 720, 900]) {
      expect(writeRunners(field, 5300, geom, t, out)).toBe(runnerStats(runners, t, ROUTE_LEN, SEGMENT_ENDS).on);
    }
    expect(writeRunners(field, 5300, geom, 350, out)).toBe(0);
    expect(writeRunners(field, 1325, geom, 540, out)).toBe(1325);
  });
});

describe("positions", () => {
  it("places a runner on the route, offset only along the normal", () => {
    const one = { size: 1, start: Float64Array.of(450), T: Float64Array.of(240), jit: Float32Array.of(0.25) };
    const out = new Float32Array(4);
    expect(writeRunners(one, 1, geom, 450 + 120, out)).toBe(1);
    const [lat, lng] = pointAt(ROUTE_LEN / 2);
    const [mx, my] = mercator(lng, lat);
    expect(out[0] + geom.origin[0]).toBeCloseTo(mx, 9);
    expect(out[1] + geom.origin[1]).toBeCloseTo(my, 9);
    expect(Math.hypot(out[2], out[3])).toBeCloseTo(0.25, 6);
  });

  it("keeps every runner in its lane: the side offset is the runner's fixed jitter, at most half the lane", () => {
    const out = new Float32Array(5300 * 4);
    const n = writeRunners(field, 5300, geom, 540, out);
    for (let k = 0; k < n; k++) {
      const side = Math.hypot(out[k * 4 + 2], out[k * 4 + 3]);
      expect(side).toBeLessThanOrEqual(0.5);
      expect(side).toBeCloseTo(Math.abs(field.jit[k]), 6);
    }
  });

  it("puts leaders and pace ghosts on opposite sides of the street", () => {
    const out = new Float32Array(8);
    const men = leader("men");
    expect(writeLeader(men, geom, 540, out, 0)).toBe(true);
    expect(writeLeader({ ...men, ghost: true }, geom, 540, out, 4)).toBe(true);
    expect(out[0]).toBe(out[4]);
    expect(out[1]).toBe(out[5]);
    expect(out[2]).toBe(-out[6]);
    expect(out[3]).toBe(-out[7]);
    expect(writeLeader(men, geom, 440, out, 0)).toBe(false);
  });

  it("keeps float32 positions within a centimetre of float64 at street level", () => {
    const [lat, lng] = pointAt(13 * MILE);
    const [mx, my] = mercator(lng, lat);
    const dx = Math.fround(mx - geom.origin[0]) - (mx - geom.origin[0]);
    const metersPerUnit = 40_075_016.686 * Math.cos((41.88 * Math.PI) / 180);
    expect(Math.abs(dx) * metersPerUnit).toBeLessThan(0.01);
    expect(Math.abs(Math.fround(my - geom.origin[1]) - (my - geom.origin[1])) * metersPerUnit).toBeLessThan(0.01);
  });
});
