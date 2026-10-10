import { flatDistance, type LatLng } from "./decode";

export type SegmentSpan = { d0: number; d1: number };
export type Route = { points: LatLng[]; cum: number[]; len: number; segments: SegmentSpan[] };

export function buildRoute(segments: readonly LatLng[][]): Route {
  const points: LatLng[] = [];
  const cum: number[] = [];
  for (const line of segments) {
    line.forEach((p, k) => {
      // Skip a segment's first point when it repeats the previous segment's end.
      if (points.length && k === 0 && flatDistance(p, points[points.length - 1]) < 1) return;
      if (points.length) cum.push(cum[cum.length - 1] + flatDistance(points[points.length - 1], p));
      else cum.push(0);
      points.push(p);
    });
  }
  const len = cum[cum.length - 1];

  let acc = 0;
  const spans: SegmentSpan[] = segments.map((line) => {
    let length = 0;
    for (let k = 1; k < line.length; k++) length += flatDistance(line[k - 1], line[k]);
    const span = { d0: acc, d1: 0 };
    acc += length;
    span.d1 = acc;
    return span;
  });
  // Segment lengths include duplicated joints; scale them onto the route.
  const f = len / acc;
  for (const span of spans) {
    span.d0 *= f;
    span.d1 *= f;
  }
  return { points, cum, len, segments: spans };
}

/** Cumulative flat distance at each route point. Same operations, in the same
 *  order, as buildRoute, so the values are bit-identical to `Route.cum`. */
export function cumulativeDistances(points: readonly LatLng[]): Float64Array {
  const cum = new Float64Array(points.length);
  for (let i = 1; i < points.length; i++) cum[i] = cum[i - 1] + flatDistance(points[i - 1], points[i]);
  return cum;
}

/** Index of the route point at or before distance `d` (binary search on `cum`). */
export function routeIndexAt(cum: ArrayLike<number>, d: number): number {
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The point `distance` metres along the route, clamped to the route. */
export function pointAlong(points: readonly LatLng[], cum: ArrayLike<number>, distance: number): LatLng {
  const d = Math.max(0, Math.min(cum[cum.length - 1] - 0.01, distance));
  const i = routeIndexAt(cum, d);
  const f = (d - cum[i]) / (cum[i + 1] - cum[i] || 1);
  const a = points[i];
  const b = points[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
