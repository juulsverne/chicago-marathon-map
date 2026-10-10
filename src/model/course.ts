import route from "@/data/route.json";
import { CLOSURES, areaOf, closureSlug } from "@/content/closures";
import type { LatLng } from "@/lib/geo/decode";
import { cumulativeDistances, pointAlong, routeIndexAt } from "@/lib/geo/route";
import { project, type Projection } from "@/lib/geo/svg";

export type Segment = Readonly<{
  index: number;
  street: string;
  range: string;
  slug: string;
  reopensAt: number | null;
  finishArea: boolean;
  area: number;
  d0: number; // metres along the route
  d1: number;
  mi0: number; // miles, normalized to 26.219 at the finish
  mi1: number;
  first: number; // minutes: wheelchair racers arrive
  lead: number; // elite field arrives
  peak: number; // median runner passes the middle
  last: number; // last runners leave the segment
}>;

export const ROUTE_LEN: number = route.len;
export const MILE: number = route.mile;
export const ROUTE_POINTS: readonly LatLng[] = route.points as LatLng[];
/** Cumulative metres at each route point, recomputed bit for bit (route.json does not store it). */
export const ROUTE_CUM: Float64Array = cumulativeDistances(ROUTE_POINTS);

if (route.segments.length !== CLOSURES.length) {
  throw new Error(
    `src/data/route.json has ${route.segments.length} segments but src/content/closures.ts lists ${CLOSURES.length} closures. ` +
      "Run npm run build:data, or fix the closure list.",
  );
}

export const SEGMENTS: readonly Segment[] = CLOSURES.map((c, i) => {
  const s = route.segments[i];
  return {
    index: i,
    street: c.street,
    range: c.range,
    slug: closureSlug(c),
    reopensAt: c.reopensAt,
    finishArea: c.reopensAt === null,
    area: areaOf(i),
    d0: s.d0,
    d1: s.d1,
    mi0: s.d0 / MILE,
    mi1: s.d1 / MILE,
    first: s.first,
    lead: s.lead,
    peak: s.peak,
    last: s.last,
  };
});

export const SEGMENT_ENDS: Float64Array = Float64Array.from(SEGMENTS, (s) => s.d1);

export function routeIndex(d: number): number {
  return routeIndexAt(ROUTE_CUM, d);
}

export function pointAt(distance: number): LatLng {
  return pointAlong(ROUTE_POINTS, ROUTE_CUM, distance);
}

export const SVG_PROJECTION: Projection = route.projection;

export function svgPoint(ll: LatLng): [number, number] {
  return project(SVG_PROJECTION, ll);
}
