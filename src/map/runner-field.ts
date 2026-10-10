import type { Leader } from "@/content/race";
import type { LatLng } from "@/lib/geo/decode";
import { routeIndexAt } from "@/lib/geo/route";
import type { Runner } from "@/model/runners";

// CPU side of the runner layer: where every runner and leader is at time t, in the
// units the GPU draws in. Pure: no WebGL, no MapLibre.

/** Web Mercator in MapLibre's 0..1 world units (MercatorCoordinate.fromLngLat). */
export function mercator(lng: number, lat: number): [x: number, y: number] {
  const x = (180 + lng) / 360;
  const y = (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) / 360;
  return [x, y];
}

/** Runner order for the quality tiers: every 4th runner by finish rank, then the
 *  remaining even ranks, then the odd ones. Runners are sorted by finish time, so
 *  the first n/4 and n/2 of this order are evenly spread samples of the field. */
export function tierOrder(n: number): Uint32Array {
  const order = new Uint32Array(n);
  let k = 0;
  for (let i = 0; i < n; i += 4) order[k++] = i;
  for (let i = 2; i < n; i += 4) order[k++] = i;
  for (let i = 1; i < n; i += 2) order[k++] = i;
  return order;
}

/** The modeled field in tier order: drawing the first `count` runners is a fair sample. */
export type RunnerField = Readonly<{ size: number; start: Float64Array; T: Float64Array; jit: Float32Array }>;

export function buildRunnerField(runners: readonly Runner[]): RunnerField {
  const order = tierOrder(runners.length);
  const pick = (key: "start" | "T" | "jit") => Array.from(order, (i) => runners[i][key]);
  return { size: runners.length, start: Float64Array.from(pick("start")), T: Float64Array.from(pick("T")), jit: Float32Array.from(pick("jit")) };
}

/** The route in mercator units relative to its first point (the origin), so the GPU
 *  can draw in float32 without losing street-level precision; the origin goes into
 *  the matrix in float64. `nx, ny` is the unit normal (-dy, dx) of the segment that
 *  starts at each point, the direction v1 used for lane jitter. */
export type RouteGeometry = Readonly<{
  origin: readonly [number, number];
  x: Float64Array;
  y: Float64Array;
  nx: Float32Array;
  ny: Float32Array;
  cum: ArrayLike<number>;
  len: number;
}>;

export function buildRouteGeometry(points: readonly LatLng[], cum: ArrayLike<number>): RouteGeometry {
  const n = points.length;
  const origin = mercator(points[0][1], points[0][0]);
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const [mx, my] = mercator(points[i][1], points[i][0]);
    x[i] = mx - origin[0];
    y[i] = my - origin[1];
  }
  const nx = new Float32Array(n);
  const ny = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.min(i, n - 2);
    const dx = x[a + 1] - x[a];
    const dy = y[a + 1] - y[a];
    const length = Math.hypot(dx, dy) || 1;
    nx[i] = -dy / length;
    ny[i] = dx / length;
  }
  return { origin, x, y, nx, ny, cum, len: cum[n - 1] };
}

/** Writes 4 floats per vertex at `out[at..]`: the position (dx, dy) relative to the
 *  origin, and the route normal scaled by `side`. */
export function placeAt(geom: RouteGeometry, d: number, side: number, out: Float32Array, at: number): void {
  const i = routeIndexAt(geom.cum, d);
  const span = geom.cum[i + 1] - geom.cum[i] || 1;
  const u = (d - geom.cum[i]) / span;
  out[at] = geom.x[i] + (geom.x[i + 1] - geom.x[i]) * u;
  out[at + 1] = geom.y[i] + (geom.y[i + 1] - geom.y[i]) * u;
  out[at + 2] = geom.nx[i] * side;
  out[at + 3] = geom.ny[i] * side;
}

/** Fills `out` with the first `count` runners of the field that are on the course
 *  at time t (v1's model: constant pace from `start`, finishing after `T` minutes),
 *  4 floats each, the normal scaled by the runner's lane jitter (-0.5..0.5).
 *  Returns how many it wrote. */
export function writeRunners(field: RunnerField, count: number, geom: RouteGeometry, t: number, out: Float32Array): number {
  let n = 0;
  const limit = Math.min(count, field.size);
  for (let k = 0; k < limit; k++) {
    const f = (t - field.start[k]) / field.T[k];
    if (f <= 0 || f >= 1) continue;
    placeAt(geom, f * geom.len, field.jit[k], out, n * 4);
    n++;
  }
  return n;
}

/** Real leaders run on one side of the street and pace ghosts on the other, so a
 *  ghost never hides the leader it is pacing (v1). */
export const leaderSide = (leader: Leader): number => (leader.ghost ? -1 : 1);

/** Writes one leader's vertex (normal scaled by its side) at `out[at..]`; false when
 *  the leader is not on the course at time t. */
export function writeLeader(leader: Leader, geom: RouteGeometry, t: number, out: Float32Array, at: number): boolean {
  const f = (t - leader.start) / leader.T;
  if (f <= 0 || f >= 1) return false;
  placeAt(geom, f * geom.len, leaderSide(leader), out, at);
  return true;
}
