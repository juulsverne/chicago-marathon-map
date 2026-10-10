export type LatLng = [lat: number, lng: number];

/** v1's packed map data (`window.MAPDATA`). Every line is a run of integer
 *  (dx, dy) deltas of (lng * 1e5, lat * 1e5). */
export type MapData = {
  names: string[];
  streets: [nameIndex: number, roadClass: number, deltas: number[]][];
  lake: number[][][]; // polygons -> rings -> deltas
  parks: number[][][];
  rivers: number[][];
  course: number[][]; // 41 segments in race order
  hoods: [name: string, lng: number, lat: number][];
};

export function decode(deltas: readonly number[]): LatLng[] {
  const out: LatLng[] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < deltas.length; i += 2) {
    x += deltas[i];
    y += deltas[i + 1];
    out.push([y / 1e5, x / 1e5]);
  }
  return out;
}

// v1's flat-earth metres, tuned to Chicago's latitude. Kept verbatim: the
// route length and every runner position depend on it.
export const MLAT = 111132;
export const MLNG = 111320 * Math.cos((41.88 * Math.PI) / 180);

export function flatDistance(a: LatLng, b: LatLng): number {
  return Math.hypot((a[0] - b[0]) * MLAT, (a[1] - b[1]) * MLNG);
}

const EARTH_RADIUS_M = 6371008.8;

export function haversine(a: LatLng, b: LatLng): number {
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r;
  const dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
