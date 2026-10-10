import { MLAT, MLNG, type LatLng } from "@/lib/geo/decode";
import { ROUTE_CUM, ROUTE_POINTS, SEGMENTS, SEGMENT_ENDS } from "./course";
import { segmentIndexAt } from "./runners";

// Check your spot: the course closure nearest to a pin, in planar metres
// around the pin (v1's method; at a few miles the error is far below a city block).

/** The race area: where the map has data (DATA_BOUNDS), so a pin anywhere on the drawn map
 *  counts; a pin out in the surround is outside the race area. */
export const RACE_AREA = { west: -87.8, south: 41.645, east: -87.3, north: 42.02 } as const;
/** More than a mile from every closure is "Nothing closes within a mile of here." */
export const MILE_METRES = 1609.344;
/** v1 listed up to three other closures within 900 m, on other streets. */
const NEARBY_METRES = 900;

export type Nearby = Readonly<{ index: number; distance: number }>;
export type NearestClosure =
  | Readonly<{ kind: "outside" }>
  | Readonly<{ kind: "far"; distance: number }>
  | Readonly<{ kind: "near"; index: number; distance: number; along: number; point: LatLng; others: readonly Nearby[] }>;

export function inRaceArea([lat, lng]: LatLng): boolean {
  return lat >= RACE_AREA.south && lat <= RACE_AREA.north && lng >= RACE_AREA.west && lng <= RACE_AREA.east;
}

/** The closure nearest `pin`: which segment, how far (m), where on the route (m from the
 *  start, for arrival times) and the nearest point itself, plus up to three other
 *  closures on other streets within 900 m. */
export function nearestClosure(pin: LatLng): NearestClosure {
  if (!inRaceArea(pin)) return { kind: "outside" };
  const [plat, plng] = pin;
  const xy = ([lat, lng]: LatLng): [number, number] => [(lng - plng) * MLNG, (lat - plat) * MLAT];
  const best = SEGMENTS.map(() => ({ distance: Infinity, along: 0, point: pin as LatLng }));
  for (let i = 0; i + 1 < ROUTE_POINTS.length; i++) {
    const [ax, ay] = xy(ROUTE_POINTS[i]);
    const [bx, by] = xy(ROUTE_POINTS[i + 1]);
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2));
    const distance = Math.hypot(ax + u * dx, ay + u * dy);
    const along = ROUTE_CUM[i] + u * (ROUTE_CUM[i + 1] - ROUTE_CUM[i]);
    const seg = segmentIndexAt(SEGMENT_ENDS, along);
    if (distance < best[seg].distance) {
      const [alat, alng] = ROUTE_POINTS[i];
      const [blat, blng] = ROUTE_POINTS[i + 1];
      best[seg] = { distance, along, point: [alat + u * (blat - alat), alng + u * (blng - alng)] };
    }
  }
  const ranked = best.map((b, index) => ({ index, ...b })).sort((a, b) => a.distance - b.distance);
  const top = ranked[0];
  if (top.distance > MILE_METRES) return { kind: "far", distance: top.distance };
  const others = ranked
    .slice(1)
    .filter((r) => r.distance < NEARBY_METRES && SEGMENTS[r.index].street !== SEGMENTS[top.index].street)
    .slice(0, 3)
    .map((r) => ({ index: r.index, distance: r.distance }));
  return { kind: "near", index: top.index, distance: top.distance, along: top.along, point: top.point, others };
}

/** v1's distance text: feet to the nearest 10 under 1,000 ft, miles to two decimals after. */
export function distanceText(metres: number): string {
  const feet = metres * 3.281;
  return feet < 1000 ? `${Math.round(feet / 10) * 10} ft` : `${(metres / 1609).toFixed(2)} mi`;
}

/** v1's walking time: 80 m a minute, at least a minute. */
export function walkMinutes(metres: number): number {
  return Math.max(1, Math.round(metres / 80));
}
