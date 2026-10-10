import { clipLine } from "@/lib/geo/clip";
import { ROUTE_CUM, ROUTE_POINTS, SEGMENTS, pointAt } from "@/model/course";
import type { Insets } from "./insets";

// Kept importable from here; MapStage imports ./insets directly so that this module
// (with the course geometry it computes at load) stays in the map engine's chunk.
export { fitPadding, type Insets } from "./insets";

export type LngLatPair = [lng: number, lat: number];
export type Bounds = [sw: LngLatPair, ne: LngLatPair];

function boundsOf(points: readonly (readonly [number, number])[]): Bounds {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/** One course segment's bounds: its ends and every route point between them. */
export function segmentBounds(index: number): Bounds {
  const { d0, d1 } = SEGMENTS[index];
  const points = [pointAt(d0), pointAt(d1)];
  ROUTE_POINTS.forEach((p, i) => {
    if (ROUTE_CUM[i] > d0 && ROUTE_CUM[i] < d1) points.push(p);
  });
  return boundsOf(points);
}

/** The whole course: the first view and "fit course". */
export const COURSE_BOUNDS: Bounds = boundsOf(ROUTE_POINTS);
/** Where the map has data: v1's box (its VB box), widened 0.1 degrees east over the lake,
 *  where the lake layer still reaches (to -87.2). The streets, lake and rivers are cut to
 *  it; beyond it the style draws a dark surround that the map fades into (style.ts). */
export const DATA_BOUNDS: Bounds = [
  [-87.8, 41.645],
  [-87.3, 42.02],
];
/** The pan limit: wide enough that the map zooms out until the course is small on any
 *  screen (owner, 2026-10-09). The data box alone held a wide screen's zoom above the course
 *  fit, since MapLibre keeps the whole view inside maxBounds. */
export const MAX_BOUNDS: Bounds = [
  [-91.5, 39.5],
  [-83.5, 44.0],
];
/** How far out the map zooms: the course is about 60 px tall at zoom 8. */
export const MIN_ZOOM = 8;
/** v1's Leaflet maxZoom 18.5, as a MapLibre zoom (MapLibre zoom = Leaflet zoom - 1). */
export const MAX_ZOOM = 17.5;

/** Whether any stretch of the course is on the part of a `width` x `height` map that no UI
 *  covers (`uncovered` insets: the header row, the dock, the panel, the phone sheet). */
export function courseInUncovered(
  project: (lngLat: LngLatPair) => { x: number; y: number },
  width: number,
  height: number,
  uncovered: Insets,
): boolean {
  const w = width - uncovered.left - uncovered.right;
  const h = height - uncovered.top - uncovered.bottom;
  if (w <= 0 || h <= 0) return false;
  return courseInView(
    (lngLat) => {
      const p = project(lngLat);
      return { x: p.x - uncovered.left, y: p.y - uncovered.top };
    },
    w,
    h,
  );
}

/** Whether any stretch of the course crosses a `width` x `height` viewport (the
 *  Recenter control shows when none does). `project` maps [lng, lat] to viewport px. */
export function courseInView(project: (lngLat: LngLatPair) => { x: number; y: number }, width: number, height: number): boolean {
  const points = ROUTE_POINTS.map(([lat, lng]): [number, number] => {
    const p = project([lng, lat]);
    return [p.x, p.y];
  });
  return clipLine(points, { minX: 0, minY: 0, maxX: width, maxY: height }).length > 0;
}
